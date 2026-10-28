import { useEffect, useRef, useState } from 'react';
import { drawItem } from '../lib/posterLayout';
import { t } from '../i18n';

const HANDLE = 10;

/** mode: 'edit' (öğe sürükle/boyutlandır) | 'inspect' (parçaya tıkla) */
export default function PosterCanvas({ width, height, items, split, mode = 'edit', selectedId, onSelect, onItemsChange, onPieceClick, zoom = 1, showLabels = false, activePiece }) {
  const outer = useRef(null);
  const cv = useRef(null);
  const drag = useRef(null);
  const [cw, setCw] = useState(600);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = outer.current;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const base = Math.min(Math.max(240, cw) / width, (window.innerHeight * 0.72) / height);
  const ppm = base * zoom;
  const cssW = width * ppm;
  const cssH = height * ppm;
  const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 4096 / Math.max(cssW, cssH)));

  useEffect(() => {
    const c = cv.current;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    const ctx = c.getContext('2d');
    const k = ppm * dpr;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    items.forEach((it) => drawItem(ctx, it, k, 0, 0, true));
    if (split) {
      for (const p of split.pieces) {
        if (activePiece?.code === p.code || hover?.code === p.code) {
          ctx.fillStyle = 'rgba(0,145,200,.18)';
          ctx.fillRect(p.x * k, p.y * k, p.w * k, p.h * k);
        }
        ctx.fillStyle = 'rgba(214,0,127,.28)';
        if (p.overlapRight) ctx.fillRect((p.x + p.w - p.overlapRight) * k, p.y * k, p.overlapRight * k, p.h * k);
        if (p.overlapBottom) ctx.fillRect(p.x * k, (p.y + p.h - p.overlapBottom) * k, p.w * k, p.overlapBottom * k);
      }
      ctx.strokeStyle = '#0091C8';
      ctx.lineWidth = dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      for (const p of split.pieces) ctx.strokeRect(p.x * k, p.y * k, p.w * k, p.h * k);
      ctx.setLineDash([]);
      if (showLabels) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const p of split.pieces) {
          const fs = Math.max(10 * dpr, Math.min(28 * dpr, Math.min(p.w, p.h) * k * 0.18));
          const cx = (p.x + p.w / 2) * k;
          const cy = (p.y + p.h / 2) * k;
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4 * dpr;
          ctx.strokeStyle = 'rgba(255,255,255,.92)';
          ctx.fillStyle = '#0F1A2A';
          ctx.font = `700 ${fs}px sans-serif`;
          ctx.strokeText(p.code, cx, cy - (p.w * k > 110 * dpr ? fs * 0.45 : 0));
          ctx.fillText(p.code, cx, cy - (p.w * k > 110 * dpr ? fs * 0.45 : 0));
          if (p.w * k > 110 * dpr) {
            const s = t('piece.rc', { r: p.row + 1, c: p.col + 1 });
            ctx.font = `500 ${fs * 0.5}px sans-serif`;
            ctx.strokeText(s, cx, cy + fs * 0.6);
            ctx.fillText(s, cx, cy + fs * 0.6);
          }
        }
      }
    }
    const sel = mode === 'edit' && items.find((i) => i.id === selectedId);
    if (sel) {
      ctx.strokeStyle = '#D6007F';
      ctx.lineWidth = 2 * dpr;
      ctx.strokeRect(sel.x * k, sel.y * k, sel.w * k, sel.h * k);
      ctx.fillStyle = '#fff';
      for (const [x, y] of [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]]) {
        ctx.fillRect(x * k - 5 * dpr, y * k - 5 * dpr, 10 * dpr, 10 * dpr);
        ctx.strokeRect(x * k - 5 * dpr, y * k - 5 * dpr, 10 * dpr, 10 * dpr);
      }
    }
  }, [items, split, cssW, cssH, dpr, ppm, selectedId, hover, mode, showLabels, activePiece]);

  const toMm = (e) => {
    const r = cv.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / ppm, y: (e.clientY - r.top) / ppm };
  };
  const pieceAt = (p) => {
    if (!split) return null;
    let best = null;
    let bd = Infinity;
    for (const q of split.pieces) {
      if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) {
        const d = Math.hypot(p.x - (q.x + q.w / 2), p.y - (q.y + q.h / 2));
        if (d < bd) { bd = d; best = q; }
      }
    }
    return best;
  };

  const down = (e) => {
    const p = toMm(e);
    if (mode === 'inspect') { onPieceClick?.(pieceAt(p)); return; }
    const sel = items.find((i) => i.id === selectedId);
    if (sel) {
      const hs = HANDLE / ppm;
      const corners = [[sel.x, sel.y, 'nw'], [sel.x + sel.w, sel.y, 'ne'], [sel.x, sel.y + sel.h, 'sw'], [sel.x + sel.w, sel.y + sel.h, 'se']];
      const hit = corners.find(([cx, cy]) => Math.abs(p.x - cx) < hs && Math.abs(p.y - cy) < hs);
      if (hit) { drag.current = { type: 'resize', corner: hit[2], id: sel.id, start: { ...sel } }; cv.current.setPointerCapture(e.pointerId); return; }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) {
        onSelect(it.id);
        drag.current = { type: 'move', id: it.id, dx: p.x - it.x, dy: p.y - it.y };
        cv.current.setPointerCapture(e.pointerId);
        return;
      }
    }
    onSelect(null);
  };

  const move = (e) => {
    const p = toMm(e);
    const d = drag.current;
    if (!d) { if (mode === 'inspect') setHover(pieceAt(p)); return; }
    if (d.type === 'move') {
      onItemsChange((list) => list.map((it) => (it.id === d.id ? { ...it, x: p.x - d.dx, y: p.y - d.dy } : it)));
    } else {
      const s = d.start;
      const ratio = s.h / s.w;
      const ax = d.corner.includes('w') ? s.x + s.w : s.x;
      const ay = d.corner.includes('n') ? s.y + s.h : s.y;
      const w = Math.max(10, Math.abs(p.x - ax));
      const h = w * ratio;
      const x = d.corner.includes('w') ? ax - w : ax;
      const y = d.corner.includes('n') ? ay - h : ay;
      onItemsChange((list) => list.map((it) => (it.id === d.id ? { ...it, x, y, w, h } : it)));
    }
  };
  const up = () => { drag.current = null; };

  return (
    <div ref={outer} className="w-full">
      <div className="max-h-[78vh] overflow-auto rounded-xl border border-line bg-paper p-2">
        <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onPointerLeave={() => setHover(null)}
          style={{ width: cssW, height: cssH, touchAction: mode === 'edit' ? 'none' : 'auto', cursor: mode === 'inspect' ? 'pointer' : 'default' }}
          className="mx-auto block shadow-md" />
      </div>
    </div>
  );
}
