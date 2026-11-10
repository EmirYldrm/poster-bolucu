const illustrations = {
  poster: (
    <>
      <path d="M7 3h10v18H7z" />
      <path d="M10 3v18m4-18v18M7 9h10m-10 6h10" strokeDasharray="1.5 1.5" />
      <path d="M4 6v12M20 6v12" />
    </>
  ),
  crop: (
    <>
      <path d="M8 3v13a2 2 0 0 0 2 2h11M3 8h13a2 2 0 0 1 2 2v11" />
      <path d="M8 8h8v8h-8z" />
    </>
  ),
  dpi: (
    <>
      <path d="M4 5h16v11H4zM8 20h8m-4-4v4" />
      <path d="M7 9h4m-4 3h7m3-3v3m2-3v3" />
      <circle cx="17" cy="12" r="1" />
    </>
  ),
  collage: (
    <>
      <rect x="3" y="4" width="8" height="7" rx="1" />
      <rect x="13" y="4" width="8" height="5" rx="1" />
      <rect x="3" y="13" width="5" height="7" rx="1" />
      <rect x="10" y="11" width="11" height="9" rx="1" />
      <path d="m11 17 2.5-2.5 2 2 1.5-1.5 2 2" />
    </>
  ),
  frame: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h10v10H7z" />
      <path d="m8 15 3-3 2 2 2-2 2 3" />
    </>
  ),
  pdfMerge: (
    <>
      <path d="M5 3h9l4 4v5M14 3v4h4M5 3v10" />
      <path d="M3 16h6m-3-3 3 3-3 3m12-3h-6m3-3-3 3 3 3" />
      <path d="M19 11h2v10h-8v-2" />
    </>
  ),
  imageToPdf: (
    <>
      <rect x="3" y="4" width="11" height="15" rx="1.5" />
      <circle cx="7" cy="9" r="1.2" />
      <path d="m4.5 16 3.5-4 2.5 2 1.5-1.5 2 2.5M17 7h4v14h-9v-2" />
      <path d="M17 11h2m-2 3h2" />
    </>
  ),
};

export default function ToolIcon({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan/10 text-cyan ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        {illustrations[name]}
      </svg>
    </span>
  );
}
