import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { t } from '../../i18n';
import FileDropzone from './components/FileDropzone';
import Icon from './components/Icon';
import PdfSlot from './components/PdfSlot';
import PreviewModal from './components/PreviewModal';
import SummaryBar from './components/SummaryBar';
import { mergePdfs } from './lib/mergePdfs';
import { isPdfResourceError } from './lib/pdfErrors';
import { inspectPdf, queuePdfThumbnail } from './lib/pdfPreview';

const fileId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
const pdfErrorKey = (error) => (
  error?.name === 'PasswordException' || /password|encrypt/i.test(error?.message || '')
    ? 'pdfMerge.slot.encrypted'
    : isPdfResourceError(error)
      ? 'pdfMerge.slot.large'
      : 'pdfMerge.slot.error'
);

export default function PdfMerge() {
  const [slots, setSlots] = useState([]);
  const [filename, setFilename] = useState('birlestirilmis.pdf');
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const aliveIds = useRef(new Set());
  const slotsRef = useRef(slots);
  const toastTimer = useRef(null);
  const toastExpiry = useRef(null);
  const pendingRemoval = useRef(null);
  const dragDepth = useRef(0);

  const validSlots = useMemo(() => slots.filter((slot) => slot.status === 'ready' && !slot.isRemoving), [slots]);
  const pageCount = validSlots.reduce((total, slot) => total + slot.pageCount, 0);
  const totalSize = validSlots.reduce((total, slot) => total + slot.size, 0);
  const hasPending = slots.some((slot) => slot.status === 'loading');
  const canMerge = validSlots.length >= 2 && !hasPending;
  const busy = mergeBusy || previewBusy;
  const activeSlot = slots.find((slot) => slot.id === activeId);
  const slotStateKey = slots.map((slot) => `${slot.id}:${slot.status}`).join('|');
  const slotForId = (id) => slots.find((slot) => slot.id === id);
  const positionForId = (id) => slots.findIndex((slot) => slot.id === id) + 1;
  slotsRef.current = slots;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const finalizeRemoval = useCallback((slot) => {
    if (slot?.thumbnailUrl) URL.revokeObjectURL(slot.thumbnailUrl);
  }, []);

  const showToast = useCallback((message, action, onExpire, duration) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastExpiry.current?.();
    toastExpiry.current = onExpire || null;
    setToast({ message, action });
    toastTimer.current = window.setTimeout(() => {
      toastExpiry.current?.();
      toastExpiry.current = null;
      setToast(null);
    }, duration ?? (action ? 6000 : 3600));
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (pendingRemoval.current?.timer) window.clearTimeout(pendingRemoval.current.timer);
    if (pendingRemoval.current) finalizeRemoval(pendingRemoval.current.slot);
    aliveIds.current.clear();
    slotsRef.current.forEach((slot) => {
      if (slot.thumbnailUrl) URL.revokeObjectURL(slot.thumbnailUrl);
    });
  }, [finalizeRemoval]);

  useEffect(() => {
    setProgress({ done: 0, total: 0 });
  }, [slotStateKey]);

  const inspectSlot = useCallback(async (slot) => {
    setSlots((current) => current.map((item) => item.id === slot.id
      ? { ...item, status: 'loading', errorKey: undefined }
      : item));
    try {
      const count = await inspectPdf(slot.file);
      if (!aliveIds.current.has(slot.id)) return;
      setSlots((current) => current.map((item) => item.id === slot.id
        ? { ...item, status: 'ready', pageCount: count, errorKey: undefined }
        : item));
    } catch (error) {
      if (!aliveIds.current.has(slot.id)) return;
      setSlots((current) => current.map((item) => item.id === slot.id
        ? { ...item, status: 'error', pageCount: 0, errorKey: pdfErrorKey(error) }
        : item));
    }
  }, []);

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const accepted = files.filter(isPdf);
    const hasInvalid = accepted.length !== files.length;
    if (hasInvalid && !accepted.length) showToast(t('pdfMerge.invalid'));
    if (!accepted.length) return;
    const newSlots = accepted.map((file) => ({
      id: fileId(),
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      thumbnailUrl: null,
      status: 'loading',
      errorKey: undefined,
      pageRange: null,
      rotation: 0,
    }));
    newSlots.forEach((slot) => aliveIds.current.add(slot.id));
    setSlots((current) => [...current, ...newSlots]);
    showToast(hasInvalid ? t('pdfMerge.invalid') : t('pdfMerge.toast.added', { count: newSlots.length }));
    for (const slot of newSlots) await inspectSlot(slot);
  }, [inspectSlot, showToast]);

  useEffect(() => {
    const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
    const onDragEnter = (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setIsDraggingFiles(true);
    };
    const onDragOver = (event) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setIsDraggingFiles(false);
    };
    const onDrop = (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setIsDraggingFiles(false);
      addFiles(event.dataTransfer.files);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [addFiles]);

  useEffect(() => {
    if (!toast) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setToast(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  const loadThumbnail = useCallback(async (id) => {
    const slot = slotsRef.current.find((item) => item.id === id);
    if (!slot || slot.status !== 'ready' || slot.thumbnailUrl) return;
    try {
      const url = await queuePdfThumbnail(slot.file);
      if (!aliveIds.current.has(id)) {
        URL.revokeObjectURL(url);
        return;
      }
      setSlots((current) => current.map((item) => item.id === id ? { ...item, thumbnailUrl: url } : item));
    } catch (error) {
      showToast(t(isPdfResourceError(error) ? 'pdfMerge.thumbnail.large' : 'pdfMerge.thumbnail.error'));
    }
  }, [showToast]);

  const removeSlot = useCallback((id) => {
    if (pendingRemoval.current) {
      const previous = pendingRemoval.current;
      window.clearTimeout(previous.timer);
      const latest = slotsRef.current.find((slot) => slot.id === previous.slot.id) || previous.slot;
      if (!previous.removed) {
        aliveIds.current.delete(previous.slot.id);
        setSlots((current) => current.filter((slot) => slot.id !== previous.slot.id));
      }
      finalizeRemoval(latest);
      pendingRemoval.current = null;
    }
    const index = slots.findIndex((slot) => slot.id === id);
    if (index < 0) return;
    const [removed] = slots.slice(index, index + 1);
    setSlots((current) => current.map((slot) => slot.id === id ? { ...slot, isRemoving: true } : slot));
    const removal = { slot: removed, index, timer: null, removed: false };
    removal.timer = window.setTimeout(() => {
      removal.slot = slotsRef.current.find((slot) => slot.id === id) || removal.slot;
      aliveIds.current.delete(id);
      setSlots((current) => current.filter((slot) => slot.id !== id));
      removal.removed = true;
    }, 200);
    pendingRemoval.current = removal;
    showToast(t('pdfMerge.toast.removed'), {
      label: t('pdfMerge.undo'),
      onClick: () => {
        window.clearTimeout(removal.timer);
        if (removal.removed) {
          aliveIds.current.add(id);
          setSlots((current) => {
            const next = [...current];
            next.splice(Math.min(index, next.length), 0, removed);
            return next;
          });
        } else {
          setSlots((current) => current.map((slot) => slot.id === id ? { ...slot, isRemoving: false } : slot));
        }
        pendingRemoval.current = null;
        toastExpiry.current = null;
      },
    }, () => {
      if (pendingRemoval.current?.slot.id !== id) return;
      window.clearTimeout(removal.timer);
      if (!removal.removed) {
        removal.slot = slotsRef.current.find((slot) => slot.id === id) || removal.slot;
        aliveIds.current.delete(id);
        setSlots((current) => current.filter((slot) => slot.id !== id));
      }
      finalizeRemoval(removal.slot);
      pendingRemoval.current = null;
    });
  }, [finalizeRemoval, showToast, slots]);

  const moveSlot = useCallback((from, to) => {
    if (from < 0 || to < 0 || from >= slots.length || to >= slots.length || from === to) return;
    setSlots((current) => arrayMove(current, from, to));
  }, [slots.length]);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const from = slots.findIndex((slot) => slot.id === active.id);
    const to = slots.findIndex((slot) => slot.id === over.id);
    if (from >= 0 && to >= 0) moveSlot(from, to);
  };

  const clearAll = () => {
    if (!slots.length || !window.confirm(t('pdfMerge.clear.confirm'))) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastExpiry.current?.();
    toastExpiry.current = null;
    if (pendingRemoval.current?.timer) window.clearTimeout(pendingRemoval.current.timer);
    pendingRemoval.current = null;
    slots.forEach((slot) => {
      aliveIds.current.delete(slot.id);
      if (slot.thumbnailUrl) URL.revokeObjectURL(slot.thumbnailUrl);
    });
    setSlots([]);
    setToast(null);
  };

  const merge = async (asPreview = false) => {
    if (!canMerge) return;
    if (asPreview) setPreviewBusy(true);
    else {
      setMergeBusy(true);
      setProgress({ done: 0, total: pageCount });
    }
    try {
      const bytes = await mergePdfs(validSlots, (done, total) => {
        if (!asPreview) setProgress({ done, total });
      });
      if (asPreview) {
        setPreview({ source: bytes, title: t('pdfMerge.preview.combined') });
      } else {
        const cleanedName = filename.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'birlestirilmis';
        const outputName = /\.pdf$/i.test(cleanedName) ? cleanedName : `${cleanedName}.pdf`;
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const link = window.document.createElement('a');
        link.href = url;
        link.download = outputName;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setProgress({ done: pageCount, total: pageCount });
        showToast(t('pdfMerge.merge.success'));
      }
    } catch (error) {
      showToast(t(isPdfResourceError(error) ? 'pdfMerge.merge.resourceError' : 'pdfMerge.merge.error'), undefined, undefined, 8000);
    } finally {
      if (asPreview) setPreviewBusy(false);
      else setMergeBusy(false);
    }
  };

  const sortByName = () => setSlots((current) => [...current].sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })));
  const reverseSlots = () => setSlots((current) => [...current].reverse());

  return (
    <div className="space-y-5 pb-44 md:pb-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-cyan/20 bg-gradient-to-r from-cyan/10 via-card to-magenta/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="flex items-start gap-3 text-sm text-ink">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan"><Icon name="file" /></span>
          <span><strong className="block font-semibold">{t('pdfMerge.privacy')}</strong></span>
        </p>
        {slots.length > 1 && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button type="button" disabled={busy} onClick={sortByName}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-card px-3 text-xs font-medium text-ink hover:bg-paper disabled:opacity-40">
              <Icon name="sort" className="h-4 w-4" />{t('pdfMerge.sort.name')}
            </button>
            <button type="button" disabled={busy} onClick={reverseSlots}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-line bg-card px-3 text-xs font-medium text-ink hover:bg-paper disabled:opacity-40">
              <Icon name="reverse" className="h-4 w-4" />{t('pdfMerge.sort.reverse')}
            </button>
          </div>
        )}
      </section>

      <FileDropzone hasFiles={slots.length > 0} onFiles={addFiles} />

      {!slots.length ? (
        <div className="rounded-2xl border border-line bg-card px-5 py-10 text-center sm:py-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paper text-cyan"><Icon name="file" className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-xl font-semibold">{t('pdfMerge.empty.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('pdfMerge.empty.body')}</p>
        </div>
      ) : (
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            accessibility={{
              screenReaderInstructions: { draggable: t('pdfMerge.dnd.instructions') },
              announcements: {
                onDragStart: ({ active }) => t('pdfMerge.dnd.start', { name: slotForId(active.id)?.name || '' }),
                onDragOver: ({ active, over }) => over
                  ? t('pdfMerge.dnd.over', { name: slotForId(active.id)?.name || '', position: positionForId(over.id) })
                  : t('pdfMerge.dnd.start', { name: slotForId(active.id)?.name || '' }),
                onDragEnd: ({ active, over }) => t('pdfMerge.dnd.end', {
                  name: slotForId(active.id)?.name || '',
                  position: over ? positionForId(over.id) : positionForId(active.id),
                }),
                onDragCancel: ({ active }) => t('pdfMerge.dnd.cancel', { name: slotForId(active.id)?.name || '' }),
              },
            }}
            onDragStart={({ active }) => setActiveId(active.id)}
            onDragCancel={() => setActiveId(null)} onDragEnd={handleDragEnd}>
            <SortableContext items={slots.map((slot) => slot.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {slots.map((slot, index) => (
                  <PdfSlot key={slot.id} slot={slot} index={index} total={slots.length}
                    busy={busy} onPreview={(item) => setPreview({ source: item.file, title: item.name })}
                    onRemove={removeSlot} onMove={moveSlot} onLoadThumbnail={loadThumbnail} onRetry={(id) => {
                      const item = slots.find((candidate) => candidate.id === id);
                      if (item) {
                        showToast(t('pdfMerge.toast.retry'));
                        inspectSlot(item);
                      }
                    }} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeSlot && (
                <div className="flex h-24 items-center gap-3 rounded-2xl border border-cyan bg-card px-4 shadow-2xl">
                  <Icon name="grip" className="text-cyan" />
                  <span className="max-w-[16rem] truncate text-sm font-semibold">{activeSlot.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-36 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink shadow-xl md:bottom-8">
          <span>{toast.message}</span>
          {toast.action && (
            <button type="button" className="shrink-0 font-semibold text-cyan underline underline-offset-2"
              onClick={() => {
                toast.action.onClick();
                if (toastTimer.current) window.clearTimeout(toastTimer.current);
                setToast(null);
              }}>{toast.action.label}</button>
          )}
        </div>
      )}

      <SummaryBar files={validSlots.length} pages={pageCount} size={totalSize} filename={filename}
        onFilenameChange={setFilename} onMerge={() => merge(false)} onPreview={() => merge(true)}
        onClear={clearAll} canMerge={canMerge} busy={busy} previewBusy={previewBusy} progress={progress} />

      {isDraggingFiles && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-6 text-center text-white backdrop-blur-md">
          <div className="rounded-3xl border-2 border-dashed border-white/65 px-10 py-12">
            <Icon name="upload" className="mx-auto h-12 w-12 animate-bounce" />
            <p className="mt-4 font-display text-2xl font-bold">{t('pdfMerge.drop.overlay')}</p>
          </div>
        </div>
      )}

      {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
