import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { bestSplit } from '../../lib/splitter';
import { loadImage, fitBox, effectiveDpi } from '../../lib/posterLayout';
import { exportPdf } from '../../lib/pdf';
import { PRESETS, UNITS, fromMm, toMm, round } from '../../lib/units';
import ImageUploader from '../../components/ImageUploader';
import Stepper from '../../components/Stepper';
import PosterCanvas from '../../components/PosterCanvas';
import PieceModal from '../../components/PieceModal';
import NumberField from '../../components/NumberField';
import { Section, Seg, Check, Btn, Field } from '../../components/ui';

const tick = () => new Promise((r) => setTimeout(r, 0));
const oriLabel = (o) => (o === 'landscape' ? t('size.landscape') : t('size.portrait'));

export default function PosterSplitter() {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [size, setSize] = useState({ w: 500, h: 700 }); // mm
  const [preset, setPreset] = useState('50x70 cm');
  const [unit, setUnit] = useState('cm');
  const [lock, setLock] = useState(true);
  const [fit, setFit] = useState('contain');
  const [mode, setMode] = useState('collage');
  const [pageOri, setPageOri] = useState('auto');
  const [margin, setMargin] = useState(5);
  const [overlap, setOverlap] = useState(10);
  const [smart, setSmart] = useState(true);
  const [tol, setTol] = useState(10);
  const [opts, setOpts] = useState({ marks: true, labels: true, guide: true });
  const [sel, setSel] = useState(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [piece, setPiece] = useState(null);
  const [progress, setProgress] = useState(null);

  const effFit = lock ? fit : 'stretch';
  const separate = mode === 'separate';
  const orientation = size.w <= size.h ? 'portrait' : 'landscape';

  // Tek görsel veya "ayrı poster" modunda görseller hedef boyuta otomatik yerleşir.
  useEffect(() => {
    setItems((list) => (separate || list.length === 1 ? list.map((it) => ({ ...it, ...fitBox(it, size.w, size.h, effFit) })) : list));
  }, [size.w, size.h, effFit, separate]);

  const posters = useMemo(
    () => (separate ? items.map((it) => ({ key: it.id, items: [it] })) : [{ key: 'all', items }]),
    [items, separate],
  );
  const poster = posters[Math.min(active, Math.max(posters.length - 1, 0))];

  const calc = useMemo(() => {
    try {
      const r = bestSplit({ width: size.w, height: size.h, margin, overlap, tolerance: smart ? tol / 100 : 0 });
      const split = pageOri === 'auto' ? r.best : r[pageOri];
      return { r, split };
    } catch (e) {
      return { err: t(e.message) };
    }
  }, [size.w, size.h, margin, overlap, pageOri, smart, tol]);
  const split = calc.split;
  const scale = split?.scale || 1;
  // Kâğıt uzayındaki parçaları poster uzayına çevirir (tuval poster uzayında çizer)
  const viewSplit = useMemo(() => (split && scale !== 1 ? {
    ...split,
    pieces: split.pieces.map((p) => ({ ...p, x: p.x / scale, y: p.y / scale, w: p.w / scale, h: p.h / scale, overlapRight: p.overlapRight / scale, overlapBottom: p.overlapBottom / scale })),
  } : split), [split, scale]);
  const pickPiece = (p) => setPiece(p ? split.pieces.find((q) => q.code === p.code) : null);

  const allItems = items;
  const minDpi = allItems.length ? Math.min(...allItems.map(effectiveDpi)) / scale : null;
  const selected = items.find((i) => i.id === sel);

  async function addFiles(files) {
    setLoading(true);
    setError('');
    const loaded = [];
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setError(t('err.format', { name: f.name })); continue; }
      try { loaded.push(await loadImage(f)); } catch { setError(t('err.decode', { name: f.name })); }
      await tick();
    }
    setItems((prev) => {
      const next = [...prev];
      for (const l of loaded) {
        if (next.length === 0 || separate) next.push({ ...l, ...fitBox(l, size.w, size.h, effFit) });
        else {
          const b = fitBox(l, size.w * 0.5, size.h * 0.5, 'contain');
          const o = (next.length * 30) % (Math.min(size.w, size.h) / 2);
          next.push({ ...l, ...b, x: b.x + o, y: b.y + o });
        }
      }
      return next;
    });
    setLoading(false);
  }

  const patch = (id, p) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id) => {
    const it = items.find((i) => i.id === id);
    if (it) URL.revokeObjectURL(it.url);
    setItems((l) => l.filter((i) => i.id !== id));
    if (sel === id) setSel(null);
  };
  const rotate = (id) => {
    setItems((l) => {
      const next = l.map((i) => {
        if (i.id !== id) return i;
        const r = { ...i, rot: (i.rot + 1) % 4 };
        if (separate || l.length === 1) return { ...r, ...fitBox(r, size.w, size.h, effFit) };
        const cx = i.x + i.w / 2;
        const cy = i.y + i.h / 2;
        return { ...r, w: i.h, h: i.w, x: cx - i.h / 2, y: cy - i.w / 2 };
      });
      return next;
    });
  };
  const reorder = (id, dir) => setItems((l) => {
    const i = l.findIndex((x) => x.id === id);
    const j = dir === 'front' ? l.length - 1 : 0;
    const c = [...l];
    const [m] = c.splice(i, 1);
    c.splice(j, 0, m);
    return c;
  });
  const setW = (id, wMm) => setItems((l) => l.map((i) => {
    if (i.id !== id) return i;
    return lock ? { ...i, w: wMm, h: wMm * (i.h / i.w) } : { ...i, w: wMm, fit: i.fit === 'contain' ? 'stretch' : i.fit };
  }));
  const setH = (id, hMm) => setItems((l) => l.map((i) => {
    if (i.id !== id) return i;
    return lock ? { ...i, h: hMm, w: hMm * (i.w / i.h) } : { ...i, h: hMm, fit: i.fit === 'contain' ? 'stretch' : i.fit };
  }));

  const setDim = (axis, v) => { setPreset('custom'); setSize((s) => ({ ...s, [axis]: toMm(v, unit) })); };
  const pickPreset = (p) => {
    setPreset(p.id);
    setSize(orientation === 'portrait' ? { w: p.w, h: p.h } : { w: p.h, h: p.w });
  };
  const flip = (o) => { if (o !== orientation) setSize((s) => ({ w: s.h, h: s.w })); };

  const go = (n) => { setStep(n); setMaxStep((m) => Math.max(m, n)); setPiece(null); window.scrollTo({ top: 0 }); };

  async function generate() {
    setError('');
    const total = posters.length * split.count;
    setProgress({ done: 0, total });
    try {
      const bytes = await exportPdf({
        posters: posters.map((p) => ({ items: p.items, width: size.w * scale, height: size.h * scale })),
        split, options: opts,
        onProgress: (done, tot) => setProgress({ done, total: tot }),
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      a.download = `poster-bolunmus-${+(size.w / 10).toFixed(1)}x${+(size.h / 10).toFixed(1)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (e) {
      setError(t('err.pdf', { msg: e.message }));
    } finally {
      setProgress(null);
    }
  }

  const stepPiece = (d) => {
    const i = split.pieces.findIndex((p) => p.code === piece.code);
    setPiece(split.pieces[(i + d + split.pieces.length) % split.pieces.length]);
  };

  const posterTabs = separate && posters.length > 1 && (
    <div className="flex flex-wrap gap-1">
      {posters.map((p, i) => (
        <button key={p.key} onClick={() => setActive(i)} aria-pressed={active === i}
          className={`rounded-md border px-3 py-1 text-sm ${active === i ? 'border-cyan bg-card' : 'border-line text-muted'}`}>
          {t('preview.poster', { n: i + 1 })}
        </button>
      ))}
    </div>
  );

  const zoomCtl = (
    <label className="flex items-center gap-2 text-sm text-muted">
      {t('preview.zoom')}
      <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(+e.target.value)} className="accent-[rgb(var(--cyan))]" />
      <span className="w-10 tabular-nums">{Math.round(zoom * 100)}%</span>
    </label>
  );

  const resultBox = split && (
    <div className="rounded-xl border border-cyan bg-card p-4">
      <p className="font-display text-xl font-semibold">{t('split.result', { cols: split.cols, rows: split.rows, count: split.count })}</p>
      <p className="mt-1 text-sm text-muted">
        {t('split.compare', { p: calc.r.portrait.count, l: calc.r.landscape.count })} · {oriLabel(split.orientation)} A4
      </p>
      {scale < 0.9999 && (
        <p className="mt-1 text-sm font-medium text-magenta">
          {t('split.scaled', { pct: round((1 - scale) * 100, 1), w: round((size.w * scale) / 10, 1), h: round((size.h * scale) / 10, 1) })}
        </p>
      )}
      <p className="text-sm text-muted">{t('split.waste', { pct: round(split.wastePct, 1) })}</p>
      {posters.length > 1 && <p className="mt-1 text-sm font-medium">{t('split.total', { count: split.count * posters.length, posters: posters.length })}</p>}
    </div>
  );

  const dpiWarn = minDpi !== null && minDpi < 100 && (
    <p role="alert" className="rounded-lg border border-magenta bg-magenta/10 px-3 py-2 text-sm">{t('dpi.warn', { dpi: Math.round(minDpi) })}</p>
  );

  return (
    <div className="space-y-5">
      <Stepper steps={[t('steps.upload'), t('steps.size'), t('steps.preview')]} current={step} maxStep={maxStep} onGo={go} />
      {error && <p role="alert" className="rounded-lg border border-magenta bg-magenta/10 px-3 py-2 text-sm">{error}</p>}

      {step === 0 && (
        <div className="mx-auto max-w-2xl space-y-4">
          <ImageUploader onFiles={addFiles} busy={loading} />
          {items.length === 0 && !loading && <p className="text-center text-sm text-muted">{t('upload.empty')}</p>}
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
                <img src={it.thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted">{t('upload.info', { w: it.nw, h: it.nh, mp: round((it.nw * it.nh) / 1e6, 1), dpi: Math.round(effectiveDpi(it)) })}</p>
                </div>
                <Btn variant="ghost" onClick={() => remove(it.id)}>{t('btn.remove')}</Btn>
              </li>
            ))}
          </ul>
          <div className="flex justify-end"><Btn disabled={!items.length || loading} onClick={() => go(1)}>{t('btn.next')}</Btn></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-4">
            <Section title={t('size.title')}>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('size.preset')}>
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => pickPreset(p)} aria-pressed={preset === p.id}
                    className={`rounded-md border px-2.5 py-1 text-sm ${preset === p.id ? 'border-cyan bg-cyan text-onacc' : 'border-line hover:bg-paper'}`}>{p.id}</button>
                ))}
                <button onClick={() => setPreset('custom')} aria-pressed={preset === 'custom'}
                  className={`rounded-md border px-2.5 py-1 text-sm ${preset === 'custom' ? 'border-cyan bg-cyan text-onacc' : 'border-line hover:bg-paper'}`}>{t('size.custom')}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`${t('size.width')} (${unit})`}><NumberField min={0.1} value={round(fromMm(size.w, unit))} onChange={(v) => setDim('w', v)} /></Field>
                <Field label={`${t('size.height')} (${unit})`}><NumberField min={0.1} value={round(fromMm(size.h, unit))} onChange={(v) => setDim('h', v)} /></Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <Seg label={t('size.unit')} value={unit} onChange={setUnit} options={Object.keys(UNITS).map((u) => ({ value: u, label: u === 'in' ? 'inç' : u }))} />
                <Seg label={t('size.orient')} value={orientation} onChange={flip} options={[{ value: 'portrait', label: t('size.portrait') }, { value: 'landscape', label: t('size.landscape') }]} />
              </div>
            </Section>

            <Section title={t('fit.title')}>
              <Check checked={lock} onChange={setLock}>{t('fit.lock')}</Check>
              {lock ? (
                <Seg label={t('fit.title')} value={fit} onChange={setFit} options={[{ value: 'contain', label: t('fit.contain') }, { value: 'cover', label: t('fit.cover') }]} />
              ) : (
                <p className="text-sm text-muted">{t('fit.stretch')}</p>
              )}
              <p className="text-xs text-muted">{t('fit.note')}</p>
              {items.length > 1 && (
                <Seg label={t('mode.title')} value={mode} onChange={(m) => { setMode(m); setActive(0); }} options={[{ value: 'collage', label: t('mode.collage') }, { value: 'separate', label: t('mode.separate') }]} />
              )}
            </Section>

            <Section title={t('split.title')}>
              <Seg label={t('split.pageOri')} value={pageOri} onChange={setPageOri} options={[{ value: 'auto', label: t('split.auto') }, { value: 'portrait', label: t('size.portrait') }, { value: 'landscape', label: t('size.landscape') }]} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('split.margin')}><NumberField value={margin} onChange={setMargin} /></Field>
                <Field label={t('split.overlap')}><NumberField value={overlap} onChange={setOverlap} /></Field>
              </div>
              <Check checked={smart} onChange={setSmart}>{t('split.smart')}</Check>
              <p className="text-xs text-muted">{t('split.smartHint')}</p>
              {smart && <Field label={t('split.tol')}><NumberField value={tol} onChange={(v) => setTol(Math.min(v, 30))} /></Field>}
            </Section>

            {!separate && (
              <Section title={t('item.title')}>
                {selected ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label={t('item.w')}><NumberField min={0.5} value={round(selected.w / 10)} onChange={(v) => setW(selected.id, v * 10)} /></Field>
                      <Field label={t('item.h')}><NumberField min={0.5} value={round(selected.h / 10)} onChange={(v) => setH(selected.id, v * 10)} /></Field>
                    </div>
                    <p className="text-xs text-muted">{t('item.dpi', { dpi: Math.round(effectiveDpi(selected)) })}</p>
                    <div className="flex flex-wrap gap-2">
                      <Btn variant="ghost" onClick={() => rotate(selected.id)}>{t('item.rotate')}</Btn>
                      <Btn variant="ghost" onClick={() => reorder(selected.id, 'front')}>{t('item.front')}</Btn>
                      <Btn variant="ghost" onClick={() => reorder(selected.id, 'back')}>{t('item.back')}</Btn>
                      <Btn variant="ghost" onClick={() => remove(selected.id)}>{t('btn.remove')}</Btn>
                    </div>
                  </>
                ) : <p className="text-sm text-muted">{t('item.none')}</p>}
              </Section>
            )}
            {separate && selected === undefined && items[active] && (
              <Btn variant="ghost" onClick={() => rotate(items[active].id)}>{t('item.rotate')}</Btn>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            {calc.err ? <p role="alert" className="rounded-lg border border-magenta bg-magenta/10 px-3 py-2 text-sm">{t('split.error', { msg: calc.err })}</p> : resultBox}
            {dpiWarn}
            {posterTabs}
            {poster && (
              <PosterCanvas width={size.w} height={size.h} items={poster.items} split={viewSplit} mode={separate ? 'inspect' : 'edit'}
                selectedId={sel} onSelect={setSel} onItemsChange={setItems} zoom={zoom} />
            )}
            {zoomCtl}
            <div className="flex justify-between">
              <Btn variant="ghost" onClick={() => go(0)}>{t('btn.back')}</Btn>
              <Btn disabled={!split || !items.length} onClick={() => go(2)}>{t('btn.next')}</Btn>
            </div>
          </div>
        </div>
      )}

      {step === 2 && split && (
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-4">
            {resultBox}
            {dpiWarn}
            <Section title={t('pdf.title')}>
              <Check checked={opts.marks} onChange={(v) => setOpts({ ...opts, marks: v })}>{t('pdf.marks')}</Check>
              <Check checked={opts.labels} onChange={(v) => setOpts({ ...opts, labels: v })}>{t('pdf.labels')}</Check>
              <Check checked={opts.guide} onChange={(v) => setOpts({ ...opts, guide: v })}>{t('pdf.guide')}</Check>
            </Section>
            <Btn className="w-full" disabled={!!progress} onClick={generate}>{t('pdf.confirm')}</Btn>
            {progress && (
              <div role="status" className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-magenta" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
                <p className="text-sm text-muted">{t('pdf.working', progress)}</p>
              </div>
            )}
            <Btn variant="ghost" className="w-full" onClick={() => go(1)}>{t('btn.back')}</Btn>
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-muted">{t('preview.hint')}</p>
            {posterTabs}
            <PosterCanvas width={size.w} height={size.h} items={poster.items} split={viewSplit} mode="inspect" showLabels
              zoom={zoom} activePiece={piece} onPieceClick={pickPiece} />
            {zoomCtl}
          </div>
        </div>
      )}

      {piece && step === 2 && <PieceModal piece={piece} split={split} items={poster.items} onClose={() => setPiece(null)} onStep={stepPiece} />}
    </div>
  );
}
