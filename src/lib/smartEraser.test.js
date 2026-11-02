import { describe, expect, it } from 'vitest';
import { inpaintRect } from './smartEraser';

function pixels(width, height, color) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...color, 255], i);
  return { data, width, height };
}

describe('inpaintRect', () => {
  it('fills a selected area from the surrounding color without changing outside pixels', () => {
    const image = pixels(7, 7, [180, 120, 60]);
    for (let y = 2; y < 5; y += 1) {
      for (let x = 2; x < 5; x += 1) image.data.set([0, 0, 0, 255], (y * 7 + x) * 4);
    }

    inpaintRect(image, { x: 2, y: 2, width: 3, height: 3 });

    expect([...image.data.slice((3 * 7 + 3) * 4, (3 * 7 + 3) * 4 + 4)]).toEqual([180, 120, 60, 255]);
    expect([...image.data.slice(0, 4)]).toEqual([180, 120, 60, 255]);
  });

  it('clips selected areas that extend beyond the image', () => {
    const image = pixels(4, 4, [90, 90, 90]);
    image.data.set([0, 0, 0, 255], (3 * 4 + 3) * 4);

    expect(() => inpaintRect(image, { x: 3, y: 3, width: 5, height: 5 })).not.toThrow();
    expect([...image.data.slice((3 * 4 + 3) * 4, (3 * 4 + 3) * 4 + 3)]).toEqual([90, 90, 90]);
  });
});
