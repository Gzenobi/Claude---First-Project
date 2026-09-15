import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SearchResults } from "../api";

export function Header() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api.search(q).then((r) => {
        setResults(r);
        setOpen(true);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = results && (results.products.length || results.colors.length || results.components.length);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-(--border-subtle) flex items-center px-6 gap-4">
      <div className="relative w-full max-w-md" ref={boxRef}>
        <input
          className="input w-full pl-9"
          placeholder="Buscar producto, color (ej. RAL 5015), base o concentrado..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-dark text-sm">🔎</span>
        {open && q && (
          <div className="absolute mt-1 w-full card z-50 max-h-96 overflow-y-auto text-sm">
            {!hasResults && <div className="p-3 text-gray-dark">Sin resultados para "{q}".</div>}
            {results && results.products.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-semibold text-gray-dark uppercase">Productos</div>
                {results.products.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-(--bg-app) flex justify-between"
                    onClick={() => {
                      navigate(`/calcular?productId=${p.id}`);
                      setOpen(false);
                    }}
                  >
                    <span>{p.name}</span>
                    <span className="text-gray-dark">{p.code}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.colors.length > 0 && (
              <div className="p-2 border-t border-(--border-subtle)">
                <div className="px-2 py-1 text-xs font-semibold text-gray-dark uppercase">Colores</div>
                {results.colors.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-(--bg-app) flex justify-between"
                    onClick={() => {
                      navigate(`/calcular?productId=${c.product.id}&colorId=${c.id}`);
                      setOpen(false);
                    }}
                  >
                    <span>
                      {c.code} {c.name ? `— ${c.name}` : ""} {c.standard ? `(${c.standard})` : ""}
                    </span>
                    <span className="text-gray-dark">{c.product.name}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.components.length > 0 && (
              <div className="p-2 border-t border-(--border-subtle)">
                <div className="px-2 py-1 text-xs font-semibold text-gray-dark uppercase">Componentes</div>
                {results.components.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-(--bg-app) flex justify-between"
                    onClick={() => {
                      navigate(`/componentes`);
                      setOpen(false);
                    }}
                  >
                    <span>{c.code}</span>
                    <span className="text-gray-dark">{c.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3 text-sm text-gray-dark">
        <span className="badge badge-ok">DEMO DATA incluida</span>
      </div>
    </header>
  );
}
