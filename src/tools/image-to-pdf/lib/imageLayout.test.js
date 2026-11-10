import { describe, expect, it } from 'vitest';
import { computeImageLayout, computePageSize } from './imageLayout';

describe('image PDF layout', () => {
  it('uses the selected landscape orientation for automatic and fixed page sizes', () => {
    const landscapeImage = { width: 1600, height: 900 };
    const autoPage = computePageSize(landscapeImage, 'auto', 'auto');
    const a4Landscape = computePageSize(landscapeImage, 'a4', 'landscape');

    expect(autoPage.width).toBe(1600);
    expect(autoPage.height).toBe(900);
    expect(autoPage.width).toBeGreaterThan(autoPage.height);
    expect(a4Landscape.width).toBeGreaterThan(a4Landscape.height);
  });

  it('fits a landscape image edge-to-edge on a page with the same dimensions', () => {
    const page = computePageSize({ width: 1600, height: 900 }, 'auto', 'auto');
    const layout = computeImageLayout(page.width, page.height, 1600, 900, 'contain', 0);

    expect(layout.x).toBe(0);
    expect(layout.y).toBe(0);
    expect(layout.width).toBe(1600);
    expect(layout.height).toBe(900);
    expect(layout.margin).toBe(0);
  });

  it('covers a fixed page and clips only the overflow', () => {
    const page = computePageSize({ width: 1600, height: 900 }, 'a4', 'portrait');
    const layout = computeImageLayout(page.width, page.height, 1600, 900, 'cover', 5);
    const marginPt = (5 * 72) / 25.4;
    const contentWidth = page.width - marginPt * 2;
    const contentHeight = page.height - marginPt * 2;

    expect(layout.clip).toBe(true);
    expect(layout.width).toBeGreaterThanOrEqual(contentWidth);
    expect(layout.height).toBeGreaterThanOrEqual(contentHeight);
    expect(layout.margin).toBeCloseTo(marginPt);
  });
});
