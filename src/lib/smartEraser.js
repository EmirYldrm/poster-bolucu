export function inpaintRect(imageData, rect) {
  const { data, width, height } = imageData;
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(height, Math.ceil(rect.y + rect.height));
  if (x0 >= x1 || y0 >= y1) return;

  const source = new Uint8ClampedArray(data);
  const left = x0 - 1;
  const right = x1;
  const top = y0 - 1;
  const bottom = y1;
  const hasLeft = left >= 0;
  const hasRight = right < width;
  const hasTop = top >= 0;
  const hasBottom = bottom < height;

  const sample = (x, y, channel) => source[(y * width + x) * 4 + channel];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const horizontal = hasLeft && hasRight
          ? sample(x0 - 1, y, channel) * (1 - (x - x0 + 1) / (x1 - x0 + 1))
            + sample(x1, y, channel) * ((x - x0 + 1) / (x1 - x0 + 1))
          : hasLeft ? sample(x0 - 1, y, channel)
            : hasRight ? sample(x1, y, channel) : sample(x, y, channel);
        const vertical = hasTop && hasBottom
          ? sample(x, y0 - 1, channel) * (1 - (y - y0 + 1) / (y1 - y0 + 1))
            + sample(x, y1, channel) * ((y - y0 + 1) / (y1 - y0 + 1))
          : hasTop ? sample(x, y0 - 1, channel)
            : hasBottom ? sample(x, y1, channel) : sample(x, y, channel);
        data[target + channel] = (horizontal + vertical) / 2;
      }
    }
  }
}
