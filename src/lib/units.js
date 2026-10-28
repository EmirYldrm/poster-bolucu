export const UNITS = { cm: 10, mm: 1, in: 25.4 };
export const toMm = (v, unit) => v * UNITS[unit];
export const fromMm = (v, unit) => v / UNITS[unit];
export const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// Hazır boyutlar (mm, dikey)
export const PRESETS = [
  { id: 'A3', w: 297, h: 420 },
  { id: 'A2', w: 420, h: 594 },
  { id: 'A1', w: 594, h: 841 },
  { id: 'A0', w: 841, h: 1189 },
  { id: '50x70 cm', w: 500, h: 700 },
  { id: '70x100 cm', w: 700, h: 1000 },
];
