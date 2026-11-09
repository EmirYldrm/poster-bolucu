import { forwardRef, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { t } from '../../../i18n';
import Icon from './Icon';

const ActionButton = forwardRef(function ActionButton(
  { label, onClick, children, disabled = false, className = '', ...props }, ref,
) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} {...props}
      className={`flex h-11 min-w-11 items-center justify-center rounded-xl border border-white/25 bg-black/35 px-3 text-white backdrop-blur-md transition hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
});

export default function PdfSlot({
  slot, index, total, onPreview, onRemove, onMove, onLoadThumbnail, onRetry, busy,
}) {
  const cardRef = useRef(null);
  const requestedThumbnail = useRef(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
    disabled: busy || slot.isRemoving,
    transition: { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  });

  useEffect(() => {
    if (slot.status !== 'ready' || slot.thumbnailUrl || requestedThumbnail.current || !cardRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        requestedThumbnail.current = true;
        observer.disconnect();
        onLoadThumbnail(slot.id);
      }
    }, { rootMargin: '120px' });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [slot.id, slot.status, slot.thumbnailUrl, onLoadThumbnail]);

  useEffect(() => {
    if (slot.status === 'ready') requestedThumbnail.current = false;
  }, [slot.status]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    scale: slot.isRemoving ? '0.9' : isDragging ? '1.03' : undefined,
  };
  const readableSize = slot.size >= 1024 * 1024
    ? `${(slot.size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(slot.size / 1024))} KB`;

  return (
    <article ref={(node) => { setNodeRef(node); cardRef.current = node; }} style={style}
      className={`group relative h-52 scroll-mb-56 overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-[box-shadow,transform,opacity,scale] duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isDragging ? 'cursor-grabbing border-dashed opacity-20 shadow-2xl ring-2 ring-cyan' : ''} ${slot.isRemoving ? 'pointer-events-none opacity-0' : ''} animate-[pdfMergeIn_260ms_ease-out]`}
      aria-label={t('pdfMerge.slot.drag', { name: slot.name })}>
      {slot.thumbnailUrl && (
        <div aria-hidden="true" className="absolute inset-0 scale-110 bg-cover bg-center blur-md transition-opacity duration-500"
          style={{ backgroundImage: `url("${slot.thumbnailUrl}")` }} />
      )}
      {slot.status === 'ready' && !slot.thumbnailUrl && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-white/5" />}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-950/60 to-slate-950/90" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <ActionButton label={t('pdfMerge.slot.drag', { name: slot.name })} disabled={busy}
          className="cursor-grab touch-none border-white/20" {...attributes} {...listeners} ref={setActivatorNodeRef}>
          <Icon name="grip" />
        </ActionButton>
        <span key={index} className="flex h-10 min-w-10 animate-[pdfMergeBadge_240ms_ease-out] items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 shadow-lg transition-transform duration-200 group-hover:scale-105"
          aria-label={`${index + 1}`}>
          {index + 1}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" title={slot.name}>{slot.name}</p>
          <p className="mt-0.5 text-xs text-white/70">{readableSize}</p>
          {slot.status === 'loading' && (
            <p className="mt-2 flex items-center gap-2 text-xs text-white/80">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              {t('pdfMerge.slot.loading')}
            </p>
          )}
          {slot.status === 'error' && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-rose-100">
              <span>{t(slot.errorKey || 'pdfMerge.slot.error')}</span>
              <button type="button" onClick={() => onRetry(slot.id)} className="underline underline-offset-2">
                {t('pdfMerge.slot.retry')}
              </button>
            </div>
          )}
          {slot.status === 'ready' && (
            <p className="mt-1 text-xs text-white/75">{t('pdfMerge.slot.pages', { count: slot.pageCount })}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <ActionButton label={t('pdfMerge.slot.moveUp')} disabled={busy || index === 0} onClick={() => onMove(index, index - 1)}>
              <Icon name="chevronUp" className="h-4 w-4" />
            </ActionButton>
            <ActionButton label={t('pdfMerge.slot.moveDown')} disabled={busy || index === total - 1} onClick={() => onMove(index, index + 1)}>
              <Icon name="chevronDown" className="h-4 w-4" />
            </ActionButton>
            <ActionButton label={t('pdfMerge.slot.preview')} disabled={slot.status !== 'ready' || busy} onClick={() => onPreview(slot)}>
              <Icon name="eye" />
            </ActionButton>
            <ActionButton label={t('pdfMerge.slot.remove')} disabled={busy} onClick={() => onRemove(slot.id)}>
              <Icon name="trash" />
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="absolute left-3 top-16 flex gap-1 sm:hidden">
        <ActionButton label={t('pdfMerge.slot.moveFirst')} disabled={busy || index === 0} onClick={() => onMove(index, 0)}>
          <Icon name="first" className="h-4 w-4" />
        </ActionButton>
        <ActionButton label={t('pdfMerge.slot.moveLast')} disabled={busy || index === total - 1} onClick={() => onMove(index, total - 1)}>
          <Icon name="last" className="h-4 w-4" />
        </ActionButton>
      </div>
    </article>
  );
}
