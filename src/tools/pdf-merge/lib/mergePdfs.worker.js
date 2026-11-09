import { mergePdfBytes } from './mergePdfBytes';

self.onmessage = async ({ data }) => {
  try {
    const bytes = await mergePdfBytes(data.inputs, (done, total) => {
      self.postMessage({ type: 'progress', done, total });
    });
    const transferable = bytes.slice().buffer;
    self.postMessage({ type: 'result', bytes: transferable }, [transferable]);
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'PDF merge failed' });
  }
};
