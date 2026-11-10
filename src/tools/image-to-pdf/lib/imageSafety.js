export const SAFE_LIMITS = {
  maxFiles: 100,
  maxTotalBytes: 500 * 1024 * 1024,
  maxFileBytes: 25 * 1024 * 1024,
  maxPixels: 100 * 1024 * 1024,
};

export const sanitizeFilename = (value) => {
  const raw = (value || 'gorseller.pdf').trim();
  const safe = raw
    .replace(/[\\/|:*?"<>]/g, '')
    .replace(/\u202E|\u202D|\u200E|\u200F/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  const name = safe || 'gorseller';
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
};

export const getHeader = async (file) => {
  const buffer = await file.slice(0, 32).arrayBuffer();
  return new Uint8Array(buffer);
};

export const isValidJpegSignature = (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
export const isValidPngSignature = (bytes) => bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
export const hasJpegEoi = (bytes) => bytes.length >= 2 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
export const hasPngIend = (bytes) => {
  if (bytes.length < 12) return false;
  const last = bytes.slice(-12);
  return last[0] === 0x00 && last[1] === 0x00 && last[2] === 0x00 && last[3] === 0x00 &&
    last[4] === 0x49 && last[5] === 0x45 && last[6] === 0x4e && last[7] === 0x44 &&
    last[8] === 0xae && last[9] === 0x42 && last[10] === 0x60 && last[11] === 0x82;
};

export async function validateImageFile(file) {
  if (!file) return { ok: false, message: 'Dosya okunamadı.' };

  const extMatches = /\.(jpe?g|png)$/i.test(file.name || '');
  const mimeMatches = /^image\/(jpeg|png)$/i.test(file.type || '');
  if (!extMatches && !mimeMatches) {
    return { ok: false, message: `${file.name || 'Dosya'} yalnızca JPG/JPEG veya PNG olabilir.` };
  }

  if (file.size > SAFE_LIMITS.maxFileBytes) {
    return { ok: false, message: `${file.name || 'Dosya'} 25 MB sınırını aşıyor.` };
  }

  const header = await getHeader(file);
  const isJpg = isValidJpegSignature(header);
  const isPng = isValidPngSignature(header);
  if (!isJpg && !isPng) {
    return { ok: false, message: 'Dosya içeriği görsel değil; güvenlik denetimi reddetti.' };
  }

  const mimeExpected = isPng ? 'image/png' : 'image/jpeg';
  const expectedMimeOk = !file.type || file.type === mimeExpected || file.type === 'image/jpg';
  const expectedExtOk = !file.name || (file.name.toLowerCase().endsWith('.png') ? isPng : (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) ? isJpg : false);

  if (!expectedMimeOk || !expectedExtOk) {
    return { ok: false, message: 'Görselin uzantısı ve içeriği tutarsız. Dosya reddedildi.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isJpg && !hasJpegEoi(bytes)) {
    return { ok: false, message: 'JPEG dosyası bozuk veya tamamlanmamış görsel içeriyor.' };
  }
  if (isPng && !hasPngIend(bytes)) {
    return { ok: false, message: 'PNG dosyası bozuk veya tamamlanmamış görsel içeriyor.' };
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = bitmap;
    const totalPixels = width * height;
    bitmap.close?.();
    if (totalPixels > SAFE_LIMITS.maxPixels) {
      return { ok: false, message: 'Görsel çok büyük; maksimum piksel sınırı aşılıyor.' };
    }
    return { ok: true, mimeType: mimeExpected, width, height };
  } catch {
    return { ok: false, message: 'Görseli işlemek mümkün olmadı; dosya bozuk olabilir.' };
  }
}

export async function convertImageToPdfBytes(file, { mimeType, maxSide, jpegQuality = 0.92, rotation = 0 } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const rotatesSideways = rotation % 180 !== 0;
    let width = rotatesSideways ? bitmap.height : bitmap.width;
    let height = rotatesSideways ? bitmap.width : bitmap.height;

    if (maxSide && Math.max(width, height) > maxSide) {
      const ratio = maxSide / Math.max(width, height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(bitmap, -width / 2, -height / 2, bitmap.width * (canvas.width / width), bitmap.height * (canvas.height / height));
    ctx.restore();

    const type = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Görsel yeniden kodlanamadı.'));
          return;
        }
        resolve(result);
      }, type, type === 'image/jpeg' ? jpegQuality : undefined);
    });

    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close?.();
  }
}

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};
