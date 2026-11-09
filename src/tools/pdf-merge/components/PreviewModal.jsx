import { useEffect, useRef, useState } from 'react';
import { t } from '../../../i18n';
import { isPdfResourceError } from '../lib/pdfErrors';
import { openPdfDocument } from '../lib/pdfPreview';
import Icon from './Icon';

export default function PreviewModal({ preview, onClose }) {
  const [document, setDocument] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(false);
  const [resourceError, setResourceError] = useState(false);
  const canvasRef = useRef(null);
  const previewAreaRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!previewAreaRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(previewAreaRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let openedDocument;
    setDocument(null);
    setPageNumber(1);
    setZoom(1);
    setLoading(true);
    setError(false);
    setResourceError(false);
    openPdfDocument(preview.source).then((loaded) => {
      openedDocument = loaded;
      if (active) setDocument(loaded);
      else loaded.destroy();
    }).catch((loadError) => {
      if (active) {
        setResourceError(isPdfResourceError(loadError));
        setError(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      renderTaskRef.current?.cancel();
      openedDocument?.destroy();
    };
  }, [preview.source]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setPageNumber((current) => Math.max(1, current - 1));
      if (event.key === 'ArrowRight' && document) setPageNumber((current) => Math.min(document.document.numPages, current + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, onClose]);

  useEffect(() => {
    if (!document || !canvasRef.current) return undefined;
    let active = true;
    setRendering(true);
    renderTaskRef.current?.cancel();
    document.document.getPage(pageNumber).then((page) => {
      if (!active) return;
      const pixelRatio = window.devicePixelRatio || 1;
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth ? Math.min(1, containerWidth / baseViewport.width) : 1;
      const viewport = page.getViewport({ scale: zoom * fitScale * pixelRatio });
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Canvas 2D context is unavailable');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;
      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      return task.promise;
    }).then(() => {
      if (active) setRendering(false);
    }).catch((renderError) => {
      if (renderError?.name !== 'RenderingCancelledException' && active) {
        setResourceError(isPdfResourceError(renderError));
        setRendering(false);
        setError(true);
      }
    });
    return () => {
      active = false;
      renderTaskRef.current?.cancel();
    };
  }, [document, pageNumber, zoom, containerWidth]);

  const changePage = (delta) => {
    if (!document) return;
    setPageNumber((current) => Math.max(1, Math.min(document.document.numPages, current + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/65 backdrop-blur-sm sm:items-stretch sm:justify-end"
      role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={preview.title}
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none sm:rounded-l-3xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan">{t('pdfMerge.preview.title')}</p>
            <h2 className="truncate font-display font-semibold text-ink" title={preview.title}>{preview.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('pdfMerge.preview.close')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink">
            <Icon name="close" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-5">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => changePage(-1)} disabled={!document || pageNumber <= 1}
                aria-label={t('pdfMerge.preview.previous')} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-35">
                <Icon name="arrowLeft" />
              </button>
              <span className="min-w-16 text-center text-sm font-medium tabular-nums text-ink">
                {document ? t('pdfMerge.preview.page', { current: pageNumber, total: document.document.numPages }) : '—'}
              </span>
              <button type="button" onClick={() => changePage(1)} disabled={!document || pageNumber >= document.document.numPages}
                aria-label={t('pdfMerge.preview.next')} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-35">
                <Icon name="arrowLeft" className="h-5 w-5 rotate-180" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setZoom((current) => Math.max(0.6, +(current - 0.2).toFixed(1)))}
                aria-label={t('pdfMerge.preview.zoomOut')} disabled={zoom <= 0.6}
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-35">
                <Icon name="minus" />
              </button>
              <span className="min-w-12 text-center text-xs text-muted">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((current) => Math.min(2, +(current + 0.2).toFixed(1)))}
                aria-label={t('pdfMerge.preview.zoomIn')} disabled={zoom >= 2}
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper disabled:opacity-35">
                <Icon name="plus" />
              </button>
            </div>
          </div>

          <div ref={previewAreaRef} className="relative min-h-0 flex-1 overflow-auto bg-paper/70 p-3 sm:p-6"
            onWheel={(event) => {
              if (zoom <= 1 && Math.abs(event.deltaY) > 40) changePage(event.deltaY > 0 ? 1 : -1);
            }}>
            {(loading || rendering) && !error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/70 text-sm text-muted">
                <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
                {t('pdfMerge.preview.loading')}
              </div>
            )}
            {error ? (
              <p role="alert" className="grid h-full place-items-center px-6 text-center text-sm text-muted">
                {t(resourceError ? 'pdfMerge.preview.large' : 'pdfMerge.preview.error')}
              </p>
            ) : (
              <div className="flex min-h-full min-w-full items-start justify-center">
                <canvas ref={canvasRef} className="h-auto rounded-lg bg-white shadow-lg" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
