import { useEffect, useMemo, useState } from "react";
import { api, type Calculation } from "../api";
import { money, pct } from "../lib/format";

type SortKey = "product" | "color" | "totalCostPerSet" | "createdAt";

export function CostList() {
  const [items, setItems] = useState<Calculation[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function load() {
    api.calculations.list().then(setItems);
  }
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items;
    if (q) {
      rows = rows.filter(
        (c) =>
          c.product.name.toLowerCase().includes(q) ||
          c.product.code.toLowerCase().includes(q) ||
          c.color.code.toLowerCase().includes(q) ||
          (c.color.name ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "product":
          av = a.product.name;
          bv = b.product.name;
          break;
        case "color":
          av = a.color.code;
          bv = b.color.code;
          break;
        case "totalCostPerSet":
          av = Number(a.totalCostPerSet);
          bv = Number(b.totalCostPerSet);
          break;
        case "createdAt":
          av = a.createdAt;
          bv = b.createdAt;
          break;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function saveContribution(id: string) {
    const value = (parseFloat(editValue.replace(",", ".")) / 100).toString();
    await api.calculations.setContribution(id, value);
    setEditingId(null);
    load();
  }

  async function duplicate(id: string, useCurrentCosts: boolean) {
    await api.calculations.duplicate(id, useCurrentCosts);
    load();
  }

  async function remove(id: string) {
    await api.calculations.remove(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Lista de Costos</h1>
          <p className="text-sm text-gray-dark mt-1">{items.length} cálculo(s) en la lista de trabajo.</p>
        </div>
        <div className="flex gap-2">
          <a className="btn-secondary" href={api.calculations.exportUrl("csv")}>
            Exportar CSV
          </a>
          <a className="btn-primary" href={api.calculations.exportUrl("xlsx")}>
            Exportar Excel
          </a>
        </div>
      </div>

      <input className="input w-80" placeholder="Buscar producto o color..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
              <Th label="Producto" onClick={() => toggleSort("product")} />
              <Th label="Color" onClick={() => toggleSort("color")} />
              <th className="py-2 px-3">Tipo</th>
              <th className="py-2 px-3">Tamaño</th>
              <th className="py-2 px-3 text-right">Costo Total</th>
              <th className="py-2 px-3 text-right">Costo/L</th>
              <th className="py-2 px-3 text-right">Contribución</th>
              <th className="py-2 px-3 text-right">Precio/L</th>
              <th className="py-2 px-3 text-right">Precio/Conjunto</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--bg-app)">
                <td className="py-2 px-3">
                  <div className="font-medium">{c.product.name}</div>
                  <div className="text-xs text-gray-dark">{c.product.code}</div>
                </td>
                <td className="py-2 px-3">
                  <div>{c.color.code}</div>
                  <div className="text-xs text-gray-dark">{c.color.name}</div>
                </td>
                <td className="py-2 px-3">{c.product.kind}</td>
                <td className="py-2 px-3">{c.setSize}</td>
                <td className="py-2 px-3 text-right">{money(c.totalCostPerSet)}</td>
                <td className="py-2 px-3 text-right">{c.costPerLiter ? `${money(c.costPerLiter)}` : "—"}</td>
                <td className="py-2 px-3 text-right">
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      className="input w-20 text-right"
                      defaultValue={(Number(c.contributionPct) * 100).toString()}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveContribution(c.id)}
                      onBlur={() => saveContribution(c.id)}
                    />
                  ) : (
                    <button className="underline decoration-dotted" onClick={() => { setEditingId(c.id); setEditValue((Number(c.contributionPct) * 100).toString()); }}>
                      {pct(c.contributionPct)}
                    </button>
                  )}
                </td>
                <td className="py-2 px-3 text-right">{c.sellingPricePerLiter ? `${money(c.sellingPricePerLiter)}` : "—"}</td>
                <td className="py-2 px-3 text-right font-semibold">{money(c.sellingPricePerSet)}</td>
                <td className="py-2 px-3">
                  {c.isIncomplete ? <span className="badge badge-error">Incompleto</span> : <span className="badge badge-ok">OK</span>}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2 text-xs">
                    <button className="text-sky" onClick={() => duplicate(c.id, false)}>
                      Duplicar
                    </button>
                    <button className="text-sky" onClick={() => duplicate(c.id, true)} title="Duplicar recalculando con costos actuales">
                      Recalcular
                    </button>
                    <button className="text-fuchsia" onClick={() => remove(c.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-dark">
                  Sin cálculos todavía. Vaya a "Calcular Color" y presione "+ Agregar a Lista".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="py-2 px-3 cursor-pointer select-none" onClick={onClick}>
      {label} ⇅
    </th>
  );
}
