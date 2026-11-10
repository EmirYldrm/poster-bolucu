import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { validateImageFile, SAFE_LIMITS } from './imageSafety';

function mockBitmap(w, h) {
  const bitmap = { width: w, height: h };
  bitmap.close = vi.fn(() => {
    bitmap.width = 0;
    bitmap.height = 0;
  });
  return bitmap;
}

describe('imageSafety', () => {
  beforeEach(() => {
    globalThis.createImageBitmap = vi.fn(async (file) => mockBitmap(1200, 900));
  });

  afterEach(() => {
    delete globalThis.createImageBitmap;
  });

  it('accepts valid JPEG files with matching magic signature', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
    const file = new File([bytes], 'photo.jpg', { type: 'image/jpeg' });

    const result = await validateImageFile(file);

    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it('rejects mismatched file signatures and extensions', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([bytes], 'fake.jpg', { type: 'image/jpeg' });

    const result = await validateImageFile(file);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/uzantısı/i);
  });

  it('rejects images beyond the configured pixel cap', async () => {
    globalThis.createImageBitmap = vi.fn(async () => mockBitmap(Math.sqrt(SAFE_LIMITS.maxPixels) + 1, Math.sqrt(SAFE_LIMITS.maxPixels) + 1));
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0xd9]);
    const file = new File([bytes], 'big.jpg', { type: 'image/jpeg' });

    const result = await validateImageFile(file);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/çok büyük|piksel/i);
  });
});
