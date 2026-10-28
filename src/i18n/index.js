import tr from './tr';

const dictionaries = { tr };
let current = 'tr';

export const setLang = (l) => { if (dictionaries[l]) current = l; };

export function t(key, vars = {}) {
  const s = dictionaries[current][key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}
