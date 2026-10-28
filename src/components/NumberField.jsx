import { useEffect, useRef, useState } from 'react';

export default function NumberField({ value, onChange, min = 0, className = '', ...rest }) {
  const [txt, setTxt] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(String(value)); }, [value]);
  return (
    <input {...rest} type="text" inputMode="decimal" value={txt}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setTxt(String(value)); }}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = parseFloat(e.target.value.replace(',', '.'));
        if (Number.isFinite(n) && n >= min) onChange(n);
      }}
      className={`w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${className}`} />
  );
}
