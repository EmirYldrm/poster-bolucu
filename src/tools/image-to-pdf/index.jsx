import { useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from 'pdf-lib';
import { t } from '../../i18n';
import { SAFE_LIMITS, sanitizeFilename, validateImageFile, convertImageToPdfBytes, formatBytes } from './lib/imageSafety';
import { computePageSize, computeImageLayout } from './lib/imageLayout';

const fileId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const getThumbnailUrl = async (file) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.82);
  bitmap.close?.();
  return url;
};

export default function ImageToPdf() {
  const inputRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [filename, setFilename] = useState('gorseller.pdf');
  const [pageSize, setPageSize] = useState('auto');
  const [orientation, setOrientation] = useState('auto');
  const [fitMode, setFitMode] = useState('contain');
  const [margin, setMargin] = useState('none');
  const [qualityMode, setQualityMode] = useState('original');
  const [toast, setToast] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => () => {
    slots.forEach((slot) => {
      if (slot.thumbnailUrl) URL.revokeObjectURL(slot.thumbnailUrl);
    });
  }, [slots]);

  const readySlots = useMemo(() => slots.filter((slot) => slot.status === 'ready'), [slots]);
  const canGenerate = readySlots.length > 0 && !generating;

  const handleFiles = async (incoming) => {
    const files = Array.from(incoming || []);
    if (!files.length) return;

    if (slots.length + files.length > SAFE_LIMITS.maxFiles) {
      setToast('En fazla 100 görsel eklenebilir.');
      return;
    }

    const mergedTotal = slots.reduce((sum, slot) => sum + slot.size, 0);
    const nextSlots = [];
    const rejected = [];

    for (const file of files) {
      const candidateTotal = mergedTotal + nextSlots.reduce((sum, slot) => sum + slot.size, 0) + file.size;
      if (candidateTotal > SAFE_LIMITS.maxTotalBytes) {
        rejected.push(`${file.name} toplam boyut sınırını aşıyor.`);
        continue;
      }

      try {
        const result = await validateImageFile(file);
        if (!result.ok) {
          rejected.push(result.message);
          continue;
        }

        const slot = {
          id: fileId(),
          file,
          name: file.name,
          size: file.size,
          width: result.width,
          height: result.height,
          mimeType: result.mimeType,
          thumbnailUrl: '',
          rotation: 0,
          status: 'loading',
        };

        const previewUrl = await getThumbnailUrl(file).catch(() => '');
        nextSlots.push({ ...slot, thumbnailUrl: previewUrl, status: 'ready' });
      } catch (error) {
        rejected.push(`${file.name} yüklenemedi.`);
      }
    }

    if (nextSlots.length) {
      setSlots((current) => [...current, ...nextSlots]);
    }
    if (rejected.length) {
      setToast(rejected[0]);
    }
  };

  const removeSlot = (id) => {
    setSlots((current) => current.filter((slot) => slot.id !== id));
  };

  const rotateSlot = (id) => {
    setSlots((current) => current.map((slot) => {
      if (slot.id !== id) return slot;
      const nextRotation = (slot.rotation + 90) % 360;
      return { ...slot, rotation: nextRotation, width: slot.height, height: slot.width };
    }));
  };

  const moveSlot = (id, direction) => {
    setSlots((current) => {
      const index = current.findIndex((slot) => slot.id === id);
      if (index < 0) return current;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetAll = () => {
    setSlots([]);
    setFilename('gorseller.pdf');
  };

  const generatePdf = async () => {
    if (!canGenerate) {
      setToast('En az bir görsel eklenmiş olmalı.');
      return;
    }

    setGenerating(true);
    setProgress({ done: 0, total: readySlots.length });

    try {
      const pdf = await PDFDocument.create();

      for (let index = 0; index < readySlots.length; index += 1) {
        const slot = readySlots[index];
        if (!Number.isFinite(slot.width) || !Number.isFinite(slot.height) || slot.width <= 0 || slot.height <= 0) {
          throw new Error('Bir görselin boyut bilgisi eksik. Görseli kaldırıp yeniden ekleyin.');
        }

        setProgress({ done: index + 1, total: readySlots.length });

        const pageSpec = computePageSize(slot, pageSize, orientation);
        const page = pdf.addPage([pageSpec.width, pageSpec.height]);
        const marginMm = { none: 0, small: 5, medium: 10, large: 20 }[margin] || 0;

        const imageBytes = await convertImageToPdfBytes(slot.file, {
          mimeType: slot.mimeType,
          maxSide: qualityMode === 'reduce' ? 2400 : undefined,
          jpegQuality: 0.8,
          rotation: slot.rotation,
        });

        const image = slot.mimeType === 'image/png' && qualityMode === 'original'
          ? await pdf.embedPng(imageBytes)
          : await pdf.embedJpg(imageBytes);

        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const drawBox = computeImageLayout(pageWidth, pageHeight, slot.width, slot.height, fitMode, marginMm);

        if (drawBox.clip) {
          page.pushOperators(
            pushGraphicsState(),
            rectangle(drawBox.margin, drawBox.margin, pageWidth - drawBox.margin * 2, pageHeight - drawBox.margin * 2),
            clip(),
            endPath(),
          );
        }
        page.drawImage(image, {
          x: drawBox.x,
          y: drawBox.y,
          width: drawBox.width,
          height: drawBox.height,
        });
        if (drawBox.clip) page.pushOperators(popGraphicsState());
      }

      const bytes = await pdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sanitizeFilename(filename);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setToast('PDF başarıyla indirildi.');
    } catch (error) {
      setToast(error.message || 'PDF oluşturulamadı.');
    } finally {
      setGenerating(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-4">
        <div
          className={`rounded-xl border border-dashed p-6 text-center transition ${dragActive ? 'border-cyan bg-paper' : 'border-line bg-card'}`}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <p className="text-lg font-semibold">{t('imageToPdf.drop.title')}</p>
          <p className="mt-2 text-sm text-muted">{t('imageToPdf.drop.hint')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" className="rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white" onClick={() => inputRef.current?.click()}>
              {t('imageToPdf.button')}
            </button>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">{t('imageToPdf.privacy')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {readySlots.length === 0 ? (
            <div className="rounded-xl border border-line bg-card p-6 text-sm text-muted">{t('imageToPdf.empty')}</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {readySlots.map((slot, index) => (
                <div key={slot.id} className="overflow-hidden rounded-xl border border-line bg-card">
                  <div className="relative">
                    <img src={slot.thumbnailUrl || URL.createObjectURL(slot.file)} alt={slot.name} className="h-36 w-full object-cover" />
                    <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-cyan px-2 text-xs font-semibold text-white">{index + 1}</span>
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={slot.name}>{slot.name}</p>
                        <p className="text-xs text-muted">{slot.width}×{slot.height}px · {formatBytes(slot.size)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button type="button" className="rounded border border-line px-2 py-1" onClick={() => rotateSlot(slot.id)}>{t('imageToPdf.rotate')}</button>
                      <button type="button" className="rounded border border-line px-2 py-1" onClick={() => moveSlot(slot.id, 'up')}>{t('imageToPdf.moveUp')}</button>
                      <button type="button" className="rounded border border-line px-2 py-1" onClick={() => moveSlot(slot.id, 'down')}>{t('imageToPdf.moveDown')}</button>
                      <button type="button" className="rounded border border-line px-2 py-1 text-red-500" onClick={() => removeSlot(slot.id)}>{t('imageToPdf.remove')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-xl border border-line bg-card p-4">
          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.pageSize')}</label>
            <select value={pageSize} onChange={(event) => setPageSize(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <option value="auto">{t('imageToPdf.pageSizeAuto')}</option>
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="a5">A5</option>
              <option value="letter">Letter</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.orientation')}</label>
            <select value={orientation} onChange={(event) => setOrientation(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <option value="auto">{t('imageToPdf.auto')}</option>
              <option value="portrait">{t('imageToPdf.portrait')}</option>
              <option value="landscape">{t('imageToPdf.landscape')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.layout')}</label>
            <select value={fitMode} onChange={(event) => setFitMode(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <option value="contain">{t('imageToPdf.contain')}</option>
              <option value="cover">{t('imageToPdf.cover')}</option>
              <option value="stretch">{t('imageToPdf.stretch')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.margin')}</label>
            <select value={margin} onChange={(event) => setMargin(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <option value="none">{t('imageToPdf.marginNone')}</option>
              <option value="small">{t('imageToPdf.marginSmall')}</option>
              <option value="medium">{t('imageToPdf.marginMedium')}</option>
              <option value="large">{t('imageToPdf.marginLarge')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.quality')}</label>
            <select value={qualityMode} onChange={(event) => setQualityMode(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm">
              <option value="original">{t('imageToPdf.qualityOriginal')}</option>
              <option value="reduce">{t('imageToPdf.qualityReduce')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('imageToPdf.filename')}</label>
            <input value={filename} onChange={(event) => setFilename(event.target.value)} className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" placeholder="gorseller.pdf" />
          </div>

          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-md border border-line px-3 py-2 text-sm" onClick={resetAll}>{t('imageToPdf.clear')}</button>
            <button type="button" disabled={!canGenerate} className="flex-1 rounded-md bg-cyan px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={generatePdf}>
              {generating ? `${t('imageToPdf.generating')} ${progress.done}/${progress.total}` : t('imageToPdf.create')}
            </button>
          </div>
          <p className="text-xs text-muted">{t('imageToPdf.note')}</p>
        </aside>
      </div>

      {toast ? <div role="status" className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink shadow-xl">{toast}</div> : null}
    </div>
  );
}
