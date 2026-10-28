import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { t } from '../i18n';
import { mmPerPx, renderRegion } from './posterLayout';
import { colLetter } from './splitter';

const pt = (v) => (v * 72) / 25.4;
// Standart PDF fontları Türkçe karakter içermez; PDF içi kısa etiketlerde aksanlar sadeleştirilir.
const ascii = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
const tick = () => new Promise((r) => setTimeout(r, 0));
const toJpeg = (canvas, q) =>
  new Promise((res, rej) =>
    canvas.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error('canvas'))), 'image/jpeg', q));

const line = (p, x1, y1, x2, y2, w, color) => p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w, color });
// Beyaz halolu çizgi: koyu ve açık görsellerde okunur
const halo = (p, x1, y1, x2, y2) => { line(p, x1, y1, x2, y2, 2.2, rgb(1, 1, 1)); line(p, x1, y1, x2, y2, 0.5, rgb(0, 0, 0)); };

function drawMarks(page, left, top, cw, ch) {
  const arm = pt(3);
  for (const [x, y] of [[left, top], [left + cw, top], [left, top - ch], [left + cw, top - ch]]) {
    halo(page, x - arm, y, x + arm, y);
    halo(page, x, y - arm, x, y + arm);
  }
}

function chip(page, font, text, x, y, size) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawRectangle({ x: x - 1.5, y: y - 1.5, width: w + 3, height: size + 3, color: rgb(1, 1, 1), opacity: 0.9 });
  page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  return w;
}

function drawLabels(page, font, piece, split, left, top, cw, ch) {
  const { cols, rows } = split;
  const { col: c, row: r } = piece;
  chip(page, font, piece.code, left + pt(5), top - pt(5) - 12, 12);
  chip(page, font, ascii(t('pdf.row', { r: r + 1, R: rows, c: c + 1, C: cols })), left + pt(5), top - pt(5) - 22, 6.5);
  const mid = { x: left + cw / 2, y: top - ch / 2 };
  const nb = [];
  if (c < cols - 1) nb.push({ d: [1, 0], code: `${colLetter(c + 1)}${r + 1}`, tip: { x: left + cw - pt(2), y: mid.y } });
  if (c > 0) nb.push({ d: [-1, 0], code: `${colLetter(c - 1)}${r + 1}`, tip: { x: left + pt(2), y: mid.y } });
  if (r < rows - 1) nb.push({ d: [0, -1], code: `${colLetter(c)}${r + 2}`, tip: { x: mid.x, y: top - ch + pt(2) } });
  if (r > 0) nb.push({ d: [0, 1], code: `${colLetter(c)}${r}`, tip: { x: mid.x, y: top - pt(2) } });
  for (const n of nb) {
    const [dx, dy] = n.d;
    const L = pt(7);
    const tail = { x: n.tip.x - dx * L, y: n.tip.y - dy * L };
    halo(page, tail.x, tail.y, n.tip.x, n.tip.y);
    const base = { x: n.tip.x - dx * pt(3), y: n.tip.y - dy * pt(3) };
    const hw = pt(2.2);
    halo(page, n.tip.x, n.tip.y, base.x - dy * hw, base.y + dx * hw);
    halo(page, n.tip.x, n.tip.y, base.x + dy * hw, base.y - dx * hw);
    const w = font.widthOfTextAtSize(n.code, 8);
    const tx = dx ? (dx > 0 ? tail.x - w - pt(1.5) : tail.x + pt(1.5)) : n.tip.x - w / 2;
    const ty = dx ? n.tip.y - 3 : dy < 0 ? tail.y + pt(1.5) : tail.y - 8 - pt(1.5);
    chip(page, font, n.code, tx, ty, 8);
  }
}

async function addGuide(pdf, font, poster, split, thumbBytes, firstPieceNo) {
  const page = pdf.addPage([pt(210), pt(297)]);
  const ink = rgb(0.06, 0.1, 0.16);
  page.drawText(ascii(t('pdf.guideTitle')), { x: pt(15), y: pt(297 - 22), size: 20, font, color: ink });
  const info = t('pdf.guideInfo', {
    w: +(poster.width / 10).toFixed(1), h: +(poster.height / 10).toFixed(1),
    cols: split.cols, rows: split.rows, count: split.count, ov: split.overlap,
  });
  page.drawText(ascii(info), { x: pt(15), y: pt(297 - 30), size: 8.5, font, color: ink });
  page.drawText(ascii(t('pdf.guideHow')), { x: pt(15), y: pt(297 - 36), size: 7.5, font, color: rgb(0.35, 0.4, 0.48), maxWidth: pt(180) });
  const scale = Math.min(180 / poster.width, 205 / poster.height);
  const ox = 15;
  const topY = 297 - 46;
  const img = await pdf.embedJpg(thumbBytes);
  page.drawImage(img, { x: pt(ox), y: pt(topY - poster.height * scale), width: pt(poster.width * scale), height: pt(poster.height * scale), opacity: 0.55 });
  split.pieces.forEach((p, i) => {
    const x = pt(ox + p.x * scale);
    const w = pt(p.w * scale);
    const h = pt(p.h * scale);
    const y = pt(topY - (p.y + p.h) * scale);
    if (p.overlapRight) page.drawRectangle({ x: x + w - pt(p.overlapRight * scale), y, width: pt(p.overlapRight * scale), height: h, color: rgb(0.84, 0, 0.5), opacity: 0.3 });
    if (p.overlapBottom) page.drawRectangle({ x, y, width: w, height: pt(p.overlapBottom * scale), color: rgb(0.84, 0, 0.5), opacity: 0.3 });
    page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0, 0.47, 0.67), borderWidth: 0.8 });
    const fs = Math.max(6, Math.min(14, Math.min(w, h) * 0.3));
    const label = `${p.code}`;
    page.drawText(label, { x: x + w / 2 - font.widthOfTextAtSize(label, fs) / 2, y: y + h / 2 - fs / 3, size: fs, font, color: ink });
    const no = `s.${firstPieceNo + i}`;
    page.drawText(no, { x: x + w / 2 - font.widthOfTextAtSize(no, fs * 0.5) / 2, y: y + h / 2 - fs * 1.1, size: fs * 0.5, font, color: rgb(0.35, 0.4, 0.48) });
  });
}

/**
 * posters: [{items,width,height}] (mm) · split: splitPoster çıktısı · options: {marks,labels,guide}
 * Her parça tam çözünürlükte (en fazla 300 DPI) render edilip JPEG (kalite 0.95) olarak gömülür.
 */
export async function exportPdf({ posters, split, options, onProgress }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = split.scale || 1; // poster uzayı → kâğıt uzayı ölçeği
  const total = posters.length * split.count;
  let done = 0;
  for (const poster of posters) {
    if (options.guide) {
      const thumb = renderRegion(poster.items, 0, 0, poster.width / s, poster.height / s, (900 / Math.max(poster.width, poster.height)) * s, true);
      const bytes = await toJpeg(thumb, 0.8);
      await addGuide(pdf, font, poster, split, bytes, pdf.getPageCount() + 2);
    }
    const nativePpm = Math.max(...poster.items.map((it) => 1 / (mmPerPx(it) * s)));
    const ppm = Math.min(300 / 25.4, Math.max(nativePpm, 100 / 25.4));
    for (const p of split.pieces) {
      const page = pdf.addPage([pt(split.pageW), pt(split.pageH)]);
      const canvas = renderRegion(poster.items, p.x / s, p.y / s, p.w / s, p.h / s, ppm * s, false);
      const jpg = await pdf.embedJpg(await toJpeg(canvas, 0.95));
      canvas.width = 0;
      const left = pt(split.margin);
      const top = pt(split.pageH - split.margin);
      const cw = pt(p.w);
      const ch = pt(p.h);
      page.drawImage(jpg, { x: left, y: top - ch, width: cw, height: ch });
      if (options.marks) drawMarks(page, left, top, cw, ch);
      if (options.labels) drawLabels(page, font, p, split, left, top, cw, ch);
      done += 1;
      onProgress?.(done, total);
      await tick();
    }
  }
  return pdf.save();
}
