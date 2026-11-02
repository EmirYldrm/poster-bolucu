import { useEffect, useRef, useState } from 'react';
import { inpaintRect } from '../lib/smartEraser';
import { t } from '../i18n';
import { Btn } from './ui';

function applyOperation(canvas, operation) {
  const x = Math.max(0, Math.floor(operation.x * canvas.width));
  const y = Math.max(0, Math.floor(operation.y * canvas.height));
  const x1 = Math.min(canvas.width, Math.ceil((operation.x + operation.width) * canvas.width));
  const y1 = Math.min(canvas.height, Math.ceil((operation.y + operation.height) * canvas.height));
  if (x >= x1 || y >= y1) return;

  const left = Math.max(0, x - 1);
  const top = Math.max(0, y - 1);
  const right = Math.min(canvas.width, x1 + 1);
  const bottom = Math.min(canvas.height, y1 + 1);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas');
  const patch = ctx.getImageData(left, top, right - left, bottom - top);
  inpaintRect(patch, { x: x - left, y: y - top, width: x1 - x, height: y1 - y });
  ctx.putImageData(patch, left, top);
}

function normalizedRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export default function SmartEraserModal({ item, onApply, onClose }) {
  const canvasRef = useRef(null);
  const startRef = useRef(null);
  const [operations, setOperations] = useState([]);
  const [selection, setSelection] = useState(null);
  const [workingPreview, setWorkingPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const preview = document.createElement('canvas');
    preview.width = item.prev.width;
    preview.height = item.prev.height;
    const previewCtx = preview.getContext('2d', { willReadFrequently: true });
    if (!previewCtx) {
      setError(t('smart.error', { msg: 'canvas' }));
      return;
    }
    previewCtx.drawImage(item.prev, 0, 0);

    try {
      operations.forEach((operation) => applyOperation(preview, operation));
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = preview.width;
        canvas.height = preview.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.drawImage(preview, 0, 0);
        if (selection) {
          ctx.strokeStyle = '#D6007F';
          ctx.lineWidth = Math.max(2, preview.width / 800);
          ctx.setLineDash([8, 5]);
          ctx.strokeRect(
            selection.x * preview.width,
            selection.y * preview.height,
            selection.width * preview.width,
            selection.height * preview.height,
          );
          ctx.setLineDash([]);
        }
      }
      setWorkingPreview(preview);
      setError('');
    } catch (e) {
      setError(t('smart.error', { msg: e.message }));
    }
  }, [item, operations, selection]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    addEventListener('keydown', handleKeyDown);
    return () => removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const startSelection = (event) => {
    const point = pointFromEvent(event);
    startRef.current = point;
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    canvasRef.current.setPointerCapture(event.pointerId);
  };

  const updateSelection = (event) => {
    if (!startRef.current) return;
    setSelection(normalizedRect(startRef.current, pointFromEvent(event)));
  };

  const finishSelection = (event) => {
    if (!startRef.current) return;
    const rect = normalizedRect(startRef.current, pointFromEvent(event));
    startRef.current = null;
    if (rect.width * item.prev.width >= 2 && rect.height * item.prev.height >= 2) setSelection(rect);
  };

  const eraseSelection = () => {
    if (!selection) return;
    setOperations((current) => [...current, selection]);
    setSelection(null);
  };

  const applyChanges = () => {
    if (!operations.length || !workingPreview) return;
    try {
      const image = document.createElement('canvas');
      image.width = item.nw;
      image.height = item.nh;
      const imageCtx = image.getContext('2d', { willReadFrequently: true });
      if (!imageCtx) throw new Error('canvas');
      imageCtx.drawImage(item.img, 0, 0, item.nw, item.nh);
      operations.forEach((operation) => applyOperation(image, operation));

      const thumb = document.createElement('canvas');
      const scale = Math.min(1, 120 / Math.max(workingPreview.width, workingPreview.height));
      thumb.width = Math.max(1, Math.round(workingPreview.width * scale));
      thumb.height = Math.max(1, Math.round(workingPreview.height * scale));
      const thumbCtx = thumb.getContext('2d');
      if (!thumbCtx) throw new Error('canvas');
      thumbCtx.drawImage(workingPreview, 0, 0, thumb.width, thumb.height);
      onApply(item.id, { img: image, prev: workingPreview, thumb: thumb.toDataURL('image/jpeg', 0.7) });
      onClose();
    } catch (e) {
      setError(t('smart.error', { msg: e.message }));
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="smart-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-3 rounded-xl bg-card p-4" onClick={(event) => event.stopPropagation()}>
        <h3 id="smart-title" className="font-display text-lg font-semibold">{t('smart.title')}</h3>
        <p className="text-sm text-muted">{t('smart.hint')}</p>
        <div className="min-h-0 overflow-auto rounded-lg bg-paper p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={startSelection}
            onPointerMove={updateSelection}
            onPointerUp={finishSelection}
            onPointerCancel={finishSelection}
            className="mx-auto block max-h-[60vh] max-w-full cursor-crosshair touch-none object-contain shadow"
          />
        </div>
        {error && <p role="alert" className="rounded-lg border border-magenta bg-magenta/10 px-3 py-2 text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" disabled={!selection?.width || !selection?.height} onClick={eraseSelection}>{t('smart.erase')}</Btn>
          <Btn variant="ghost" disabled={!operations.length} onClick={() => setOperations((current) => current.slice(0, -1))}>{t('smart.undo')}</Btn>
          <Btn variant="ghost" disabled={!selection} onClick={() => setSelection(null)}>{t('smart.clear')}</Btn>
          <Btn variant="ghost" className="ml-auto" onClick={onClose}>{t('btn.back')}</Btn>
          <Btn disabled={!operations.length || !!error} onClick={applyChanges}>{t('smart.apply')}</Btn>
        </div>
      </div>
    </div>
  );
}
