import { Fragment, useEffect, useState } from "react";
import { api, type ComponentRow } from "../api";
import { money } from "../lib/format";

export function Components() {
  const [items, setItems] = useState<ComponentRow[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", type: "BASE", baseUnit: "L", density: "" });
  const [costEditId, setCostEditId] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ amount: "", currency: "USD", costBasis: "PER_LITER", packageSize: "", packageUnit: "L" });

  function load() {
    api.components.list(typeFilter || undefined).then(setItems);
  }
  useEffect(load, [typeFilter]);

  async function createComponent() {
    if (!form.code || !form.description) return;
    await api.components.create({ ...form, density: form.density || undefined });
    setForm({ code: "", description: "", type: "BASE", baseUnit: "L", density: "" });
    setShowNew(false);
    load();
  }

  async function saveCost(id: string) {
    await api.components.setCost(id, costForm);
    setCostEditId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Costos de Componentes</h1>
          <p className="text-sm text-gray-dark mt-1">Maestro de bases, concentrados y partes B, con su costo vigente.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          + Nuevo Componente
        </button>
      </div>

      <div className="flex gap-2">
        {["", "BASE", "CONCENTRATE", "PART_B"].map((t) => (
          <button key={t} className={typeFilter === t ? "btn-primary" : "btn-secondary"} onClick={() => setTypeFilter(t)}>
            {t || "Todos"}
          </button>
        ))}
      </div>

      {showNew && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-dark">Código</label>
            <input className="input w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark">Descripción</label>
            <input className="input w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark">Tipo</label>
            <select className="input w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="BASE">Base</option>
              <option value="CONCENTRATE">Concentrado</option>
              <option value="PART_B">Parte B</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-dark">Densidad (kg/L, opcional)</label>
            <input className="input w-full" placeholder="ej. 1.25" value={form.density} onChange={(e) => setForm({ ...form, density: e.target.value })} />
          </div>
          <button className="btn-primary" onClick={createComponent}>
            Guardar
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
              <th className="py-2 px-3">Código</th>
              <th className="py-2 px-3">Descripción</th>
              <th className="py-2 px-3">Tipo</th>
              <th className="py-2 px-3">Densidad</th>
              <th className="py-2 px-3 text-right">Costo Vigente</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-(--border-subtle) last:border-0">
                  <td className="py-2 px-3 font-mono text-xs">
                    {c.code} {c.isDemo && <span className="badge badge-ok ml-1">DEMO</span>}
                  </td>
                  <td className="py-2 px-3">{c.description}</td>
                  <td className="py-2 px-3">{c.type}</td>
                  <td className="py-2 px-3">{c.density ?? "—"}</td>
                  <td className="py-2 px-3 text-right">
                    {c.currentCost ? (
                      <>
                        {money(c.currentCost.amount)}
                        {c.currentCost.costBasis === "PER_PACKAGE" && (
                          <span className="text-xs text-gray-dark"> /{c.currentCost.packageSize}{c.currentCost.packageUnit}</span>
                        )}
                        {c.currentCost.costBasis === "PER_LITER" && <span className="text-xs text-gray-dark">/L</span>}
                        {c.currentCost.costBasis === "PER_KG" && <span className="text-xs text-gray-dark">/KG</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-3">{c.currentCost ? <span className="badge badge-ok">OK</span> : <span className="badge badge-error">Sin costo</span>}</td>
                  <td className="py-2 px-3">
                    <button
                      className="text-sky text-xs"
                      onClick={() => {
                        setCostEditId(costEditId === c.id ? null : c.id);
                        setCostForm({ amount: c.currentCost?.amount ?? "", currency: c.currentCost?.currency ?? "USD", costBasis: c.currentCost?.costBasis ?? "PER_LITER", packageSize: c.currentCost?.packageSize ?? "", packageUnit: c.currentCost?.packageUnit ?? "L" });
                      }}
                    >
                      {c.currentCost ? "Actualizar costo" : "Cargar costo"}
                    </button>
                  </td>
                </tr>
                {costEditId === c.id && (
                  <tr className="bg-(--bg-app)">
                    <td colSpan={7} className="p-3">
                      <div className="flex flex-wrap gap-2 items-end">
                        <div>
                          <label className="text-xs text-gray-dark">Monto</label>
                          <input className="input w-28" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-dark">Base de costo</label>
                          <select className="input" value={costForm.costBasis} onChange={(e) => setCostForm({ ...costForm, costBasis: e.target.value })}>
                            <option value="PER_LITER">Por litro</option>
                            <option value="PER_KG">Por kg</option>
                            <option value="PER_PACKAGE">Por envase</option>
                          </select>
                        </div>
                        {costForm.costBasis === "PER_PACKAGE" && (
                          <>
                            <div>
                              <label className="text-xs text-gray-dark">Tamaño envase</label>
                              <input className="input w-24" value={costForm.packageSize} onChange={(e) => setCostForm({ ...costForm, packageSize: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-dark">Unidad</label>
                              <select className="input" value={costForm.packageUnit} onChange={(e) => setCostForm({ ...costForm, packageUnit: e.target.value })}>
                                <option>L</option>
                                <option>ML</option>
                                <option>KG</option>
                                <option>G</option>
                              </select>
                            </div>
                          </>
                        )}
                        <button className="btn-primary" onClick={() => saveCost(c.id)}>
                          Guardar (nueva versión)
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
