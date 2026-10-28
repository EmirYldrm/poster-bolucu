import { describe, it, expect } from 'vitest';
import { splitPoster, bestSplit, colLetter } from './splitter';

const base = { margin: 5, overlap: 10 };

describe('splitPoster', () => {
  it('50x70 cm, 5 mm kenar, 10 mm bindirme: dikey A4 → 3x3 = 9 sayfa', () => {
    const s = splitPoster({ width: 500, height: 700, ...base, orientation: 'portrait' });
    expect([s.cols, s.rows, s.count]).toEqual([3, 3, 9]);
  });

  it('aynı poster yatay A4 → 2 sütun x 4 satır = 8 sayfa ve en verimli olan seçilir', () => {
    const s = splitPoster({ width: 500, height: 700, ...base, orientation: 'landscape' });
    expect([s.cols, s.rows, s.count]).toEqual([2, 4, 8]);
    expect(bestSplit({ width: 500, height: 700, ...base }).best.orientation).toBe('landscape');
  });

  it('A4 boyutunda poster, kenar boşluksuz → 1x1', () => {
    const s = splitPoster({ width: 210, height: 297, margin: 0, overlap: 0 });
    expect(s.count).toBe(1);
  });

  it('sınır: 390 mm = 2 sütun, 391 mm = 3 sütun (dikey, 200 mm yazdırılabilir, 10 mm bindirme)', () => {
    expect(splitPoster({ width: 390, height: 100, ...base }).cols).toBe(2);
    expect(splitPoster({ width: 391, height: 100, ...base }).cols).toBe(3);
  });

  it('parçalar tüm posteri kaplar ve komşular tam bindirme kadar örtüşür', () => {
    const s = splitPoster({ width: 500, height: 700, ...base });
    const last = s.pieces[s.pieces.length - 1];
    expect(last.x + last.w).toBeCloseTo(500);
    expect(last.y + last.h).toBeCloseTo(700);
    const [a, b] = s.pieces;
    expect(a.x + a.w - b.x).toBeCloseTo(10);
  });

  it('sayfa kodları: sütun harfi + satır numarası', () => {
    const s = splitPoster({ width: 500, height: 700, ...base });
    const p = s.pieces.find((q) => q.row === 1 && q.col === 2);
    expect(p.code).toBe('C2');
    expect(colLetter(26)).toBe('AA');
  });

  it('akıllı sığdırma kapalıyken A3 (297x420) → 4 sayfa (eski davranış)', () => {
    expect(bestSplit({ width: 297, height: 420, ...base, tolerance: 0 }).best.count).toBe(4);
  });

  it('A3 = 2 adet yatay A4: %10 toleransla 1 sütun × 2 satır, yatay, ~%7 küçülme', () => {
    const { best } = bestSplit({ width: 297, height: 420, ...base, tolerance: 0.1 });
    expect([best.orientation, best.cols, best.rows, best.count]).toEqual(['landscape', 1, 2, 2]);
    expect(best.scale).toBeCloseTo(390 / 420, 3);
  });

  it('A2 = 4 A4 (2×2, dikey); A1 = 8 A4 (2×4, yatay)', () => {
    const a2 = bestSplit({ width: 420, height: 594, ...base, tolerance: 0.1 }).best;
    expect([a2.cols, a2.rows, a2.count]).toEqual([2, 2, 4]);
    const a1 = bestSplit({ width: 594, height: 841, ...base, tolerance: 0.1 }).best;
    expect([a1.orientation, a1.cols, a1.rows, a1.count]).toEqual(['landscape', 2, 4, 8]);
  });

  it('tolerans sınırı aşılmaz (A1, %5 → 8 sayfa olmaz, ölçek ≥ 0.95)', () => {
    const r = bestSplit({ width: 594, height: 841, ...base, tolerance: 0.05 }).best;
    expect(r.count).toBeGreaterThan(8);
    expect(r.scale).toBeGreaterThanOrEqual(0.95);
  });

  it('geçersiz bindirme hata verir', () => {
    expect(() => splitPoster({ width: 500, height: 700, margin: 5, overlap: 250 })).toThrow();
  });
});
