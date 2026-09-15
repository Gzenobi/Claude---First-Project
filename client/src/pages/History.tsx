import { useEffect, useState } from "react";
import { api, type Calculation } from "../api";
import { money, pct } from "../lib/format";

export function History() {
  const [items, setItems] = useState<Calculation[]>([]);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compare, setCompare] = useState<Awaited<ReturnType<typeof api.calculations.compareCurrent>> | null>(null);

  useEffect(() => {
    api.calculations.list().then(setItems);
  }, []);

  async function openCompare(id: string) {
    setCompareId(id);
    setCompare(await api.calculations.compareCurrent(id));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy">Historial y Trazabilidad</h1>
        <p className="text-sm text-gray-dark mt-1">
          Cada cálculo guarda un snapshot de los costos usados. Si los costos cambiaron después, compare aquí sin alterar el historial.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
              <th className="py-2 px-3">Fecha</th>
              <th className="py-2 px-3">Producto</th>
              <th className="py-2 px-3">Color</th>
              <th className="py-2 px-3 text-right">Costo Total (snapshot)</th>
              <th className="py-2 px-3">Contribución</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-(--border-subtle) last:border-0">
                <td className="py-2 px-3 text-xs">{new Date(c.createdAt).toLocaleString("es-AR")}</td>
                <td className="py-2 px-3">{c.product.name}</td>
                <td className="py-2 px-3">{c.color.code}</td>
                <td className="py-2 px-3 text-right">${money(c.totalCostPerSet)}</td>
                <td className="py-2 px-3">{pct(c.contributionPct)}</td>
                <td className="py-2 px-3">
                  <button className="text-sky text-xs" onClick={() => openCompare(c.id)}>
                    Comparar con costos actuales
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-dark">
                  Aún no hay cálculos guardados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {compareId && compare && (
        <div className="card p-5 border-l-4 border-l-navy">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-navy">Comparación de costos</h3>
            <button className="text-gray-dark text-xs" onClick={() => setCompareId(null)}>
              Cerrar ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-dark uppercase mb-1">Costo original (histórico)</div>
              <div className="text-xl font-bold text-navy">${money(compare.original.totalCostPerSet)}</div>
              <div className="text-xs text-gray-dark">Costo/L: {compare.original.costPerLiter ? `$${money(compare.original.costPerLiter, 4)}` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-dark uppercase mb-1">Costo actualizado (con costos vigentes)</div>
              {compare.current.isIncomplete ? (
                <div className="badge badge-error">Incompleto: {compare.current.incompleteReason}</div>
              ) : (
                <>
                  <div className="text-xl font-bold text-navy">${money(compare.current.totalCostPerSet)}</div>
                  <div className="text-xs text-gray-dark">Costo/L: {compare.current.costPerLiter ? `$${money(compare.current.costPerLiter, 4)}` : "—"}</div>
                </>
              )}
            </div>
          </div>
          {!compare.current.isIncomplete && (
            <div className="mt-3 text-sm">
              Variación: <span className={Number(compare.variancePct) > 0 ? "text-fuchsia font-semibold" : "text-navy font-semibold"}>{Number(compare.variancePct).toFixed(2)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
