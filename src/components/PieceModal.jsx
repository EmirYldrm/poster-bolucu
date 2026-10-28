import { useEffect, useRef } from 'react';
import { renderRegion } from '../lib/posterLayout';
import { t } from '../i18n';
import { Btn } from './ui';

export default function PieceModal({ piece, split, items, onClose, onStep }) {
  const ref = useRef(null);
  useEffect(() => {
    const ppm = 4;
    const c = ref.current;
    c.width = Math.round(split.pageW * ppm);
    c.height = Math.round(split.pageH * ppm);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    const s = split.scale || 1;
    const reg = renderRegion(items, piece.x / s, piece.y / s, piece.w / s, piece.h / s, ppm * s, true);
    ctx.drawImage(reg, split.margin * ppm, split.margin * ppm);
    ctx.strokeStyle = '#0091C8';
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(split.margin * ppm, split.margin * ppm, piece.w * ppm, piece.h * ppm);
    ctx.fillStyle = 'rgba(214,0,127,.28)';
    const m = split.margin * ppm;
    if (piece.overlapRight) ctx.fillRect(m + (piece.w - piece.overlapRight) * ppm, m, piece.overlapRight * ppm, piece.h * ppm);
    if (piece.overlapBottom) ctx.fillRect(m, m + (piece.h - piece.overlapBottom) * ppm, piece.w * ppm, piece.overlapBottom * ppm);
  }, [piece, split, items]);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{t('piece.title', { code: piece.code, r: piece.row + 1, c: piece.col + 1 })}</h3>
        <div className="min-h-0 overflow-auto">
          <canvas ref={ref} className="mx-auto max-h-[60vh] w-auto max-w-full border border-line shadow" />
        </div>
        <p className="text-sm text-muted">{t('piece.overlap', { mm: split.overlap })}</p>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => onStep(-1)}>{t('piece.prev')}</Btn>
          <Btn variant="ghost" onClick={() => onStep(1)}>{t('piece.next')}</Btn>
          <Btn className="ml-auto" onClick={onClose}>{t('btn.close')}</Btn>
        </div>
      </div>
    </div>
  );
}
