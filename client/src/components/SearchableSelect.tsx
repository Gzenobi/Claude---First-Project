import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

// Combobox accesible (patrón WAI-ARIA "select-only + filtro"):
// - El botón abre la lista (Enter/Espacio/↓/↑).
// - En el buscador: ↑/↓ mueven la opción activa, Inicio/Fin saltan a los extremos,
//   Enter elige, Esc cierra y devuelve el foco al botón, Tab cierra.
// Para el nombre accesible, pasar `labelledBy` (id del <label>, que además debe
// tener htmlFor={id}) o `ariaLabel` cuando no hay label visible.
export function SearchableSelect({
  id,
  labelledBy,
  ariaLabel,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  labelledBy?: string;
  ariaLabel?: string;
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const valueId = `${baseId}-value`;
  const listId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  // Mantener la opción activa visible al navegar con el teclado.
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  function openList() {
    const idx = filtered.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(o: Option) {
    onChange(o.value);
    close(true);
  }

  function onTriggerKeyDown(e: KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openList();
    }
  }

  function onSearchKeyDown(e: KeyboardEvent) {
    const last = filtered.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => (a >= last ? 0 : a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => (a <= 0 ? last : a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(Math.max(last, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[active]) choose(filtered[active]);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  const nameProps = labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": ariaLabel };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        {...(labelledBy ? { "aria-labelledby": `${labelledBy} ${valueId}` } : { "aria-label": ariaLabel })}
        className="input w-full text-left flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span id={valueId} className={selected ? "" : "text-gray-dark"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-gray-dark text-xs" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute mt-1 w-full card z-40 max-h-72 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-(--border-subtle)">
            <input
              autoFocus
              className="input w-full"
              placeholder="Buscar..."
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? optionId(active) : undefined}
              {...nameProps}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <div id={listId} role="listbox" {...nameProps}>
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-dark" role="status">
                Sin resultados.
              </div>
            )}
            {filtered.map((o, i) => (
              <div
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                className={`w-full text-left px-3 py-2 text-sm flex justify-between cursor-pointer ${
                  i === active ? "bg-(--bg-app)" : ""
                } ${o.value === value ? "font-semibold" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                <span>{o.label}</span>
                {o.sublabel && <span className="text-gray-dark text-xs">{o.sublabel}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
