/**
 * Poster bölme algoritması. UI'dan bağımsız, saf fonksiyonlar. Tüm ölçüler mm.
 */
export const A4 = { w: 210, h: 297 };
const EPS = 1e-6;

/** 0 → A, 25 → Z, 26 → AA */
export function colLetter(i) {
  let s = '';
  let n = i;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

/** Bir eksende gereken parça sayısı: (n-1)*adım + yazdırılabilir >= toplam */
function countAxis(total, printable, overlap) {
  if (total <= printable + EPS) return 1;
  return Math.ceil((total - overlap) / (printable - overlap) - EPS);
}

export function splitPoster({ width, height, page = A4, orientation = 'portrait', margin = 5, overlap = 10 }) {
  const pageW = orientation === 'landscape' ? page.h : page.w;
  const pageH = orientation === 'landscape' ? page.w : page.h;
  const printW = pageW - 2 * margin;
  const printH = pageH - 2 * margin;
  if (!(width > 0 && height > 0)) throw new RangeError('err.size');
  if (printW <= 0 || printH <= 0 || margin < 0) throw new RangeError('err.splitMargin');
  if (overlap < 0 || overlap >= Math.min(printW, printH)) throw new RangeError('err.splitOverlap');

  const stepX = printW - overlap;
  const stepY = printH - overlap;
  const cols = countAxis(width, printW, overlap);
  const rows = countAxis(height, printH, overlap);

  const pieces = [];
  let used = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * stepX;
      const y = r * stepY;
      const w = Math.min(printW, width - x);
      const h = Math.min(printH, height - y);
      used += w * h;
      pieces.push({
        row: r, col: c, x, y, w, h,
        code: `${colLetter(c)}${r + 1}`,
        overlapRight: c < cols - 1 ? overlap : 0,
        overlapBottom: r < rows - 1 ? overlap : 0,
      });
    }
  }
  const count = cols * rows;
  const capacity = count * printW * printH;
  return {
    orientation, pageW, pageH, margin, overlap, printW, printH, stepX, stepY,
    cols, rows, count, pieces,
    wastePct: ((capacity - used) / capacity) * 100,
  };
}

/**
 * Bir yön için akıllı sığdırma: kenar boşluğu ve bindirme yüzünden posterin birkaç mm taşması
 * yüzünden fazladan bir sıra/sütun eklenmesini önler. Daha küçük ızgaraları (c×r) dener;
 * poster, tolerans (ör. 0.10 = %10) içinde küçülerek sığıyorsa o ızgarayı seçer.
 * Çıktıdaki parça koordinatları KÂĞIT uzayındadır (poster × scale).
 */
export function fitOrientation(opts, orientation) {
  const tol = opts.tolerance || 0;
  const exact = splitPoster({ ...opts, orientation });
  let best = { c: exact.cols, r: exact.rows, s: 1 };
  if (tol > 0) {
    for (let c = 1; c <= exact.cols; c++) {
      for (let r = 1; r <= exact.rows; r++) {
        const count = c * r;
        if (count > best.c * best.r) continue;
        const covW = c * exact.printW - (c - 1) * opts.overlap;
        const covH = r * exact.printH - (r - 1) * opts.overlap;
        const s = Math.min(1, covW / opts.width, covH / opts.height);
        if (s < 1 - tol - EPS) continue;
        if (count < best.c * best.r || s > best.s + EPS) best = { c, r, s };
      }
    }
  }
  const scaled = best.s === 1 ? exact : splitPoster({ ...opts, width: opts.width * best.s, height: opts.height * best.s, orientation });
  return { ...scaled, scale: best.s };
}

/** Dikey ve yatay A4'ü hesaplar; önce az sayfa, sonra büyük ölçek, sonra az boşa giden alan; eşitlikte dikey. */
export function bestSplit(opts) {
  const portrait = fitOrientation(opts, 'portrait');
  const landscape = fitOrientation(opts, 'landscape');
  let best = portrait;
  if (landscape.count < portrait.count) best = landscape;
  else if (landscape.count === portrait.count) {
    if (landscape.scale > portrait.scale + EPS) best = landscape;
    else if (Math.abs(landscape.scale - portrait.scale) <= EPS && landscape.wastePct < portrait.wastePct - EPS) best = landscape;
  }
  return { best, portrait, landscape };
}
