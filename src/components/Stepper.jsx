export default function Stepper({ steps, current, maxStep, onGo }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto" aria-label="Adımlar">
      {steps.map((label, i) => {
        const reachable = i <= maxStep;
        const on = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <button disabled={!reachable} onClick={() => onGo(i)} aria-current={on ? 'step' : undefined}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${on ? 'border-cyan bg-card font-medium' : 'border-line text-muted'} ${reachable ? '' : 'opacity-50'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${on ? 'bg-cyan text-onacc' : 'bg-line'}`}>{i + 1}</span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
