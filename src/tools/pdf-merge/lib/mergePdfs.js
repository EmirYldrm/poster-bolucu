export async function mergePdfs(slots, onProgress) {
  const validSlots = slots.filter((slot) => slot.status === 'ready');
  if (validSlots.length < 2) throw new RangeError('At least two valid PDFs are required');

  const inputs = await Promise.all(validSlots.map(async (slot) => ({
    bytes: new Uint8Array(await slot.file.arrayBuffer()),
    pageCount: slot.pageCount,
    rotation: slot.rotation || 0,
  })));

  if (typeof Worker === 'undefined') {
    const { mergePdfBytes } = await import('./mergePdfBytes');
    return mergePdfBytes(inputs, onProgress);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mergePdfs.worker.js', import.meta.url), { type: 'module' });
    const finish = (callback, result) => {
      worker.terminate();
      callback(result);
    };
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress?.(data.done, data.total);
      } else if (data.type === 'result') {
        finish(resolve, new Uint8Array(data.bytes));
      } else if (data.type === 'error') {
        finish(reject, new Error(data.message));
      }
    };
    worker.onerror = (event) => finish(reject, new Error(event.message || 'PDF merge worker failed'));
    worker.onmessageerror = () => finish(reject, new Error('PDF merge worker returned an unreadable response'));
    worker.postMessage({ inputs }, inputs.map((input) => input.bytes.buffer));
  });
}
