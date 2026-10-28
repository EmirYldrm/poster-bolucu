// Poster tuvali yardımcıları. Birim: mm. Öğe (item): {id,name,img,prev,thumb,nw,nh,rot,fit,x,y,w,h}
export const effDims = (it) => (it.rot % 2 ? { w: it.nh, h: it.nw } : { w: it.nw, h: it.nh });

/** fit: 'contain' | 'cover' | 'stretch' → öğenin poster içindeki kutusu */
export function fitBox(it, pw, ph, fit) {
  if (fit === 'cover' || fit === 'stretch') return { x: 0, y: 0, w: pw, h: ph, fit };
  const d = effDims(it);
  const s = Math.min(pw / d.w, ph / d.h);
  const w = d.w * s;
  const h = d.h * s;
  return { x: (pw - w) / 2, y: (ph - h) / 2, w, h, fit: 'contain' };
}

/** Kaynak pikselin poster üzerinde kapladığı mm (en düşük çözünürlük eksenine göre) */
export function mmPerPx(it) {
  const dw = it.rot % 2 ? it.h : it.w;
  const dh = it.rot % 2 ? it.w : it.h;
  return Math.max(dw / it.nw, dh / it.nh);
}
export const effectiveDpi = (it) => 25.4 / mmPerPx(it);

/** k = piksel/mm. (ox, oy) poster koordinatında tuvalin sol-üst köşesi. */
export function drawItem(ctx, it, k, ox, oy, usePreview) {
  const src = usePreview ? it.prev : it.img;
  const sw = usePreview ? it.prev.width : it.nw;
  const sh = usePreview ? it.prev.height : it.nh;
  const odd = it.rot % 2 === 1;
  const dw = odd ? it.h : it.w;
  const dh = odd ? it.w : it.h;
  ctx.save();
  ctx.translate((it.x + it.w / 2 - ox) * k, (it.y + it.h / 2 - oy) * k);
  ctx.rotate((it.rot * Math.PI) / 2);
  ctx.imageSmoothingQuality = 'high';
  if (it.fit === 'cover') {
    const s = Math.max(dw / sw, dh / sh);
    const vw = dw / s;
    const vh = dh / s;
    ctx.drawImage(src, (sw - vw) / 2, (sh - vh) / 2, vw, vh, (-dw * k) / 2, (-dh * k) / 2, dw * k, dh * k);
  } else {
    ctx.drawImage(src, (-dw * k) / 2, (-dh * k) / 2, dw * k, dh * k);
  }
  ctx.restore();
}

/** Poster bölgesini (x0,y0,w,h mm) beyaz zeminli bir canvas'a çizer. */
export function renderRegion(items, x0, y0, w, h, ppm, usePreview = false) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ppm));
  c.height = Math.max(1, Math.ceil(h * ppm));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  for (const it of items) drawItem(ctx, it, ppm, x0, y0, usePreview);
  return c;
}

/** Dosyadan öğe üretir. Önizleme için küçültülmüş kopya tutulur; tam çözünürlük PDF için saklanır. */
export async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const shrink = (max) => {
    const k = Math.min(1, max / Math.max(nw, nh));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(nw * k));
    c.height = Math.max(1, Math.round(nh * k));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  const prev = shrink(1600);
  const thumb = shrink(120).toDataURL('image/jpeg', 0.7);
  return { id: crypto.randomUUID(), name: file.name, url, img, prev, thumb, nw, nh, rot: 0, fit: 'contain', x: 0, y: 0, w: 100, h: 100 };
}
