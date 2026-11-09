const paths = {
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
  grip: <><circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  first: <><path d="M5 4v16M19 12H9m0 0 4-4m-4 4 4 4" /></>,
  last: <><path d="M19 4v16M5 12h10m0 0-4-4m4 4-4 4" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  arrowLeft: <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
  sort: <><path d="M4 7h16M4 12h10M4 17h6" /><path d="m17 14 3 3-3 3" /></>,
  reverse: <><path d="M3 7h18M3 12h12M3 17h6" /><path d="m17 14 3 3-3 3" /></>,
};

export default function Icon({ name, className = 'h-5 w-5', ...props }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {paths[name]}
    </svg>
  );
}
