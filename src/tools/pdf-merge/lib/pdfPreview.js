import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let thumbnailQueue = Promise.resolve();
let pdfJsModule;

async function loadPdfJs() {
  if (!pdfJsModule) {
    pdfJsModule = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }
  return pdfJsModule;
}

export async function openPdfDocument(input) {
  const pdfjsLib = await loadPdfJs();
  const data = input instanceof Uint8Array
    ? input.slice()
    : new Uint8Array(await input.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  try {
    return { document: await loadingTask.promise, destroy: () => loadingTask.destroy() };
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }
}

export async function inspectPdf(file) {
  const { document, destroy } = await openPdfDocument(file);
  try {
    return document.numPages;
  } finally {
    await destroy();
  }
}

async function createThumbnail(file) {
  const { document, destroy } = await openPdfDocument(file);
  try {
    const page = await document.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1.25, 480 / baseViewport.width) });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('PDF thumbnail could not be created'));
      }, 'image/jpeg', 0.78);
    });
    canvas.width = 0;
    canvas.height = 0;
    return URL.createObjectURL(blob);
  } finally {
    await destroy();
  }
}

export function queuePdfThumbnail(file) {
  const task = thumbnailQueue.then(() => createThumbnail(file));
  thumbnailQueue = task.then(() => undefined, () => undefined);
  return task;
}
