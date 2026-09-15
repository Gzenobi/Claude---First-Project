import { useEffect, useMemo, useRef, useState } from "react";

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className="input w-full text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "" : "text-gray-dark"}>{selected ? selected.label : placeholder}</span>
        <span className="text-gray-dark text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute mt-1 w-full card z-40 max-h-72 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-(--border-subtle)">
            <input
              autoFocus
              className="input w-full"
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.length === 0 && <div className="p-3 text-sm text-gray-dark">Sin resultados.</div>}
          {filtered.map((o) => (
            <button
              key={o.value}
              className="w-full text-left px-3 py-2 text-sm hover:bg-(--bg-app) flex justify-between"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                setQuery("");
              }}
            >
              <span>{o.label}</span>
              {o.sublabel && <span className="text-gray-dark text-xs">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
