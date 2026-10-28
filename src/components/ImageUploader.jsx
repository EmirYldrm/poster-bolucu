import { useRef, useState } from 'react';
import { t } from '../i18n';

export default function ImageUploader({ onFiles, busy }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div role="button" tabIndex={0} aria-busy={busy}
      onClick={() => input.current.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${over ? 'border-magenta bg-magenta/10' : 'border-line bg-card'}`}>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
      <p className="font-display text-lg font-semibold">{busy ? t('upload.loading') : t('upload.drop')}</p>
      <p className="text-sm text-muted">{t('upload.hint')}</p>
      <p className="text-sm text-muted">{t('upload.privacy')}</p>
    </div>
  );
}
