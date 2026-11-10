const PAGE_SIZES = {
  auto: { widthMm: 210, heightMm: 297 },
  a4: { widthMm: 210, heightMm: 297 },
  a3: { widthMm: 297, heightMm: 420 },
  a5: { widthMm: 148, heightMm: 210 },
  letter: { widthMm: 216, heightMm: 279 },
};

const mmToPt = (mm) => (mm * 72) / 25.4;

export function computePageSize(slot, pageSize, orientation) {
  if (pageSize === 'auto') {
    const shouldBeLandscape = orientation === 'landscape'
      || (orientation === 'auto' && slot.width > slot.height);
    const width = shouldBeLandscape ? Math.max(slot.width, slot.height) : Math.min(slot.width, slot.height);
    const height = shouldBeLandscape ? Math.min(slot.width, slot.height) : Math.max(slot.width, slot.height);
    return { width, height };
  }

  const base = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  const isLandscape = orientation === 'landscape'
    || (orientation === 'auto' && slot.width > slot.height);
  const widthMm = isLandscape ? Math.max(base.widthMm, base.heightMm) : Math.min(base.widthMm, base.heightMm);
  const heightMm = isLandscape ? Math.min(base.widthMm, base.heightMm) : Math.max(base.widthMm, base.heightMm);
  return { width: mmToPt(widthMm), height: mmToPt(heightMm) };
}

export function computeImageLayout(pageWidth, pageHeight, imageWidth, imageHeight, mode, marginMm) {
  const margin = mmToPt(marginMm);
  const contentWidth = Math.max(1, pageWidth - margin * 2);
  const contentHeight = Math.max(1, pageHeight - margin * 2);
  let width;
  let height;

  if (mode === 'stretch') {
    width = contentWidth;
    height = contentHeight;
  } else {
    const scaleX = contentWidth / imageWidth;
    const scaleY = contentHeight / imageHeight;
    const scale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    width = imageWidth * scale;
    height = imageHeight * scale;
  }

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
    clip: mode === 'cover',
    margin,
  };
}
