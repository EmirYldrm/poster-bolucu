import { PDFDocument } from 'pdf-lib';

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function mergePdfBytes(inputs, onProgress) {
  const pdf = await PDFDocument.create();
  const totalPages = inputs.reduce((total, input) => total + input.pageCount, 0);
  let completedPages = 0;

  for (const input of inputs) {
    const source = await PDFDocument.load(input.bytes);
    for (const pageIndex of source.getPageIndices()) {
      await yieldToBrowser();
      const [page] = await pdf.copyPages(source, [pageIndex]);
      if (input.rotation) {
        const current = page.getRotation().angle;
        page.setRotation({ type: 'degrees', angle: current + input.rotation });
      }
      pdf.addPage(page);
      completedPages += 1;
      onProgress?.(completedPages, totalPages);
    }
  }

  await yieldToBrowser();
  return pdf.save();
}
