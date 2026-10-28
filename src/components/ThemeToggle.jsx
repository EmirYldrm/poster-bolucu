import { useState } from 'react';
import { t } from '../i18n';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const n = !dark;
    setDark(n);
    document.documentElement.classList.toggle('dark', n);
    try { localStorage.setItem('theme', n ? 'dark' : 'light'); } catch { /* yoksay */ }
  };
  return (
    <button onClick={toggle} aria-label={t('theme.toggle')} title={t('theme.toggle')}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
      </svg>
    </button>
  );
}
