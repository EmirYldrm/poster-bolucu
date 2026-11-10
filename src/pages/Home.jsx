import { t } from '../i18n';
import { tools } from '../tools';
import ToolIcon from '../components/ToolIcon';

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
              <a href={`#${x.path}`} className="group flex h-full flex-col rounded-xl border border-cyan/50 bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan hover:bg-paper hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan motion-reduce:transform-none motion-reduce:transition-none">
                <div className="flex items-start gap-4">
                  <ToolIcon name={x.icon} className="transition-colors group-hover:bg-cyan group-hover:text-onacc" />
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">{t(x.titleKey)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{t(x.descKey)}</p>
                  </div>
                </div>
                <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-medium text-cyan">
                  {t('home.open')}
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none">
                    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </a>
            ) : (
              <div className="flex h-full flex-col rounded-xl border border-line bg-card/60 p-5 opacity-75">
                <div className="flex items-start gap-4">
                  <ToolIcon name={x.icon} className="bg-paper text-muted" />
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">{t(x.titleKey)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{t(x.descKey)}</p>
                  </div>
                </div>
                <span className="mt-auto inline-block pt-5 text-sm text-muted">{t('home.soon')}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
