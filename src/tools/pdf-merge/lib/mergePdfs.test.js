import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from './mergePdfs';

async function pdfFile(pageSizes) {
  const document = await PDFDocument.create();
  pageSizes.forEach(([width, height]) => document.addPage([width, height]));
  return new File([await document.save()], 'fixture.pdf', { type: 'application/pdf' });
}

const readySlot = async (id, dimensions) => {
  const file = await pdfFile(dimensions);
  return { id, file, pageCount: dimensions.length, status: 'ready' };
};

describe('mergePdfs', () => {
  it('merges three PDFs and reports progress per page', async () => {
    const slots = [
      await readySlot('a', [[100, 200]]),
      await readySlot('b', [[110, 210], [120, 220]]),
      await readySlot('c', [[130, 230]]),
    ];
    const progress = [];
    const result = await mergePdfs(slots, (done, total) => progress.push([done, total]));
    const merged = await PDFDocument.load(result);

    expect(merged.getPageCount()).toBe(4);
    expect(progress).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
  });

  it('preserves the current slot order in the merged page sequence', async () => {
    const first = await readySlot('first', [[100, 200]]);
    const second = await readySlot('second', [[300, 400]]);
    const merged = await PDFDocument.load(await mergePdfs([second, first]));

    expect(merged.getPages().map((page) => page.getWidth())).toEqual([300, 100]);
  });

  it('rejects a corrupt PDF slot instead of returning a partial document', async () => {
    const valid = await readySlot('valid', [[100, 200]]);
    const corrupt = {
      id: 'corrupt',
      file: new File(['not a PDF'], 'broken.pdf', { type: 'application/pdf' }),
      pageCount: 1,
      status: 'ready',
    };

    await expect(mergePdfs([valid, corrupt])).rejects.toThrow();
  });

  it('requires at least two valid PDF slots', async () => {
    const only = await readySlot('only', [[100, 200]]);
    await expect(mergePdfs([only, { status: 'error' }])).rejects.toThrow(/two valid PDFs/);
  });
});
