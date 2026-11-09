import { useId } from 'react';
import { t } from '../../../i18n';
import Icon from './Icon';

export default function FileDropzone({ hasFiles, onFiles }) {
  const inputId = useId();
  return (
    <div className={`rounded-2xl border border-dashed border-cyan/50 bg-card transition-colors ${hasFiles ? 'p-3 sm:p-4' : 'p-7 sm:p-12'}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(event.dataTransfer.files);
      }}>
      <div className={`flex ${hasFiles ? 'flex-row items-center justify-between gap-3' : 'flex-col items-center text-center'}`}>
        <div className={`flex min-w-0 items-center ${hasFiles ? 'gap-3' : 'flex-col'}`}>
          <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-cyan/10 text-cyan ${hasFiles ? 'h-11 w-11' : 'mb-4 h-16 w-16 animate-bounce'}`}>
            <Icon name="upload" className={hasFiles ? 'h-5 w-5' : 'h-8 w-8'} />
          </span>
          <div className={hasFiles ? 'min-w-0' : ''}>
            <h2 className={`font-display font-semibold ${hasFiles ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`}>
              {t(hasFiles ? 'pdfMerge.drop.add' : 'pdfMerge.drop.title')}
            </h2>
            {!hasFiles && <p className="mt-2 text-sm text-muted">{t('pdfMerge.drop.hint')}</p>}
          </div>
        </div>
        <input id={inputId} type="file" accept="application/pdf,.pdf" multiple className="sr-only"
          onChange={(event) => {
            onFiles(event.target.files);
            event.target.value = '';
          }} />
        <label htmlFor={inputId}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-sm font-semibold text-onacc shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan">
          <Icon name="plus" className="h-4 w-4" />{t('pdfMerge.drop.button')}
        </label>
      </div>
    </div>
  );
}
