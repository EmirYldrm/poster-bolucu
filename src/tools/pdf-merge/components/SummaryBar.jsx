import { t } from '../../../i18n';
import Icon from './Icon';

export default function SummaryBar({
  files, pages, size, filename, onFilenameChange, onMerge, onPreview, onClear, canMerge, busy, previewBusy, progress,
}) {
  const readableSize = size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
  const help = canMerge ? undefined : t('pdfMerge.minimum');

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,26,42,0.12)] backdrop-blur-xl md:sticky md:bottom-4 md:mt-6 md:rounded-2xl md:border md:p-4 md:shadow-xl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">
            {files ? t('pdfMerge.summary', { files, pages, size: readableSize }) : t('pdfMerge.summary.empty')}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPreview} disabled={!canMerge || busy} title={t('pdfMerge.merge.preview')}
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-cyan hover:bg-cyan/10 disabled:opacity-40">
              {previewBusy
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
                : <Icon name="eye" className="h-4 w-4" />}
              <span className="hidden sm:inline">{t(previewBusy ? 'pdfMerge.preview.creating' : 'pdfMerge.merge.preview')}</span>
            </button>
            <button type="button" onClick={onClear} disabled={!files || busy} title={t('pdfMerge.clear')}
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-paper hover:text-ink disabled:opacity-40">
              <Icon name="trash" className="h-4 w-4" /><span className="hidden sm:inline">{t('pdfMerge.clear')}</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs text-muted">
            <span className="mb-1 block">{t('pdfMerge.filename')}</span>
            <input value={filename} onChange={(event) => onFilenameChange(event.target.value)}
              placeholder={t('pdfMerge.filename.placeholder')} disabled={busy}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20 disabled:opacity-60" />
          </label>
          <button type="button" onClick={onMerge} disabled={!canMerge || busy} title={help}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan px-6 text-sm font-semibold text-onacc shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-56">
            {busy
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />{t('pdfMerge.merge.working')}</>
              : progress.done === progress.total && progress.total > 0
                ? <><Icon name="check" />{t('pdfMerge.merge.done')}</>
                : t('pdfMerge.merge')}
          </button>
        </div>
        {busy && (
          <div className="mt-3" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-cyan transition-[width] duration-300" style={{ width: `${progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-muted">{t('pdfMerge.merge.progress', { done: progress.done, total: progress.total })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
