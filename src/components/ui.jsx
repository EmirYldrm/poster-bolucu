export const Section = ({ title, children }) => (
  <section className="rounded-xl border border-line bg-card p-4">
    <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

export const Seg = ({ value, onChange, options, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-paper p-1">
    {options.map((o) => (
      <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
        className={`rounded-md px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${value === o.value ? 'bg-cyan text-onacc' : 'text-muted hover:text-ink'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Check = ({ checked, onChange, children }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--cyan))]" />
    {children}
  </label>
);

export const Btn = ({ variant = 'primary', className = '', ...p }) => (
  <button {...p}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-40 ${variant === 'primary' ? 'bg-cyan text-onacc hover:opacity-90' : 'border border-line hover:bg-paper'} ${className}`} />
);

export const Field = ({ label, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-muted">{label}</span>
    {children}
  </label>
);
