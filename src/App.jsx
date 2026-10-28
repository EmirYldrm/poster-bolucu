import { useEffect, useState } from 'react';
import { t } from './i18n';
import { tools } from './tools';
import Home from './pages/Home';
import ThemeToggle from './components/ThemeToggle';

const usePath = () => {
  const [h, setH] = useState(location.hash || '#/');
  useEffect(() => {
    const f = () => setH(location.hash || '#/');
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h.replace(/^#/, '') || '/';
};

export default function App() {
  const path = usePath();
  const tool = tools.find((x) => x.ready && x.path === path);
  const Tool = tool?.component;
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <a href="#/" className="font-display text-lg font-bold">{t('app.name')}</a>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm" aria-label={t('nav.tools')}>
            {tools.filter((x) => x.ready).map((x) => (
              <a key={x.id} href={`#${x.path}`} aria-current={x.path === path ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 ${x.path === path ? 'bg-paper font-medium' : 'text-muted hover:text-ink'}`}>{t(x.titleKey)}</a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {Tool ? (
          <>
            <h1 className="mb-4 font-display text-2xl font-bold">{t(tool.titleKey)}</h1>
            <Tool />
          </>
        ) : <Home />}
      </main>
    </div>
  );
}
