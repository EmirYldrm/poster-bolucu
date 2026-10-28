import { t } from '../i18n';
import { tools } from '../tools';

// Dekoratif motif: üst üste binen A4 parçalar
const Motif = () => (
  <div aria-hidden className="grid w-40 shrink-0 grid-cols-3 gap-0 self-start" style={{ aspectRatio: '3 / 4' }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="relative border border-dashed border-cyan/60 bg-card">
        <span className="absolute bottom-0 right-0 h-1/6 w-full bg-magenta/25" />
        <span className="absolute right-0 top-0 h-full w-1/6 bg-magenta/25" />
      </div>
    ))}
  </div>
);

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{t('home.title')}</h1>
          <p className="mt-4 text-muted">{t('home.sub')}</p>
        </div>
        <Motif />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((x) => (
          <li key={x.id}>
            {x.ready ? (
              <a href={`#${x.path}`} className="block h-full rounded-xl border border-cyan bg-card p-4 hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan">
                <h2 className="font-display text-lg font-semibold">{t(x.titleKey)}</h2>
                <p className="mt-1 text-sm text-muted">{t(x.descKey)}</p>
                <span className="mt-3 inline-block text-sm font-medium text-cyan">{t('home.open')}</span>
              </a>
            ) : (
              <div className="h-full rounded-xl border border-line p-4 opacity-70">
                <h2 className="font-display text-lg font-semibold">{t(x.titleKey)}</h2>
                <p className="mt-1 text-sm text-muted">{t(x.descKey)}</p>
                <span className="mt-3 inline-block text-sm text-muted">{t('home.soon')}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
