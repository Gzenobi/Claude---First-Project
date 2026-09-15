import { useEffect, useState } from "react";
import { api, type Product, type ColorSummary, type ComponentRow } from "../api";

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", kind: "ONE_K" });
  const [partBComponents, setPartBComponents] = useState<ComponentRow[]>([]);
  const [partBForm, setPartBForm] = useState({ componentId: "", mixRatioA: "4", mixRatioB: "1" });

  function load() {
    api.products.list().then(setProducts);
  }
  useEffect(load, []);
  useEffect(() => {
    if (selected) api.products.colors(selected.id).then(setColors);
    if (selected?.kind === "TWO_K") api.components.list("PART_B").then(setPartBComponents);
  }, [selected]);

  async function createProduct() {
    if (!form.code || !form.name) return;
    await api.products.create(form);
    setForm({ code: "", name: "", kind: "ONE_K" });
    setShowNew(false);
    load();
  }

  async function changeKind(kind: string) {
    if (!selected) return;
    await api.products.update(selected.id, { kind });
    setSelected({ ...selected, kind: kind as Product["kind"] });
    load();
  }

  async function addPartB() {
    if (!selected || !partBForm.componentId) return;
    await fetch(`/api/products/${selected.id}/part-b`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partBForm),
    });
    setPartBForm({ componentId: "", mixRatioA: "4", mixRatioB: "1" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Productos</h1>
          <p className="text-sm text-gray-dark mt-1">Materiales (ej. Interthane 990, Interseal 670HS), su clasificación 1K/2K y Parte B.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          + Nuevo Producto
        </button>
      </div>

      {showNew && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-dark">Código</label>
            <input className="input w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark">Nombre</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark">Tipo</label>
            <select className="input w-full" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="ONE_K">1K</option>
              <option value="TWO_K">2K</option>
            </select>
          </div>
          <button className="btn-primary" onClick={createProduct}>
            Guardar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-0 overflow-hidden md:col-span-1">
          <div className="max-h-[520px] overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left px-4 py-3 border-b border-(--border-subtle) hover:bg-(--bg-app) ${selected?.id === p.id ? "bg-sky/10" : ""}`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-dark flex gap-2">
                  <span>{p.code}</span>
                  <span className="badge badge-ok">{p.kind}</span>
                  <span>{p.colorCount} color(es)</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-semibold text-navy text-lg">{selected.name}</h2>
                    <div className="text-sm text-gray-dark">{selected.code}</div>
                  </div>
                  <select className="input" value={selected.kind} onChange={(e) => changeKind(e.target.value)}>
                    <option value="ONE_K">1K</option>
                    <option value="TWO_K">2K</option>
                  </select>
                </div>
              </div>

              {selected.kind === "TWO_K" && (
                <div className="card p-5">
                  <h3 className="font-semibold text-navy mb-2">Parte B</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <select className="input" value={partBForm.componentId} onChange={(e) => setPartBForm({ ...partBForm, componentId: e.target.value })}>
                      <option value="">Seleccione componente Parte B...</option>
                      {partBComponents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.description}
                        </option>
                      ))}
                    </select>
                    <input className="input" placeholder="Ratio A" value={partBForm.mixRatioA} onChange={(e) => setPartBForm({ ...partBForm, mixRatioA: e.target.value })} />
                    <input className="input" placeholder="Ratio B" value={partBForm.mixRatioB} onChange={(e) => setPartBForm({ ...partBForm, mixRatioB: e.target.value })} />
                  </div>
                  <button className="btn-secondary mt-2" onClick={addPartB}>
                    Asociar Parte B
                  </button>
                  <p className="text-xs text-gray-dark mt-2">
                    El ratio de mezcla es configurable por producto (ej. 4:1 Parte A : Parte B); no se asume un valor fijo.
                  </p>
                </div>
              )}

              <div className="card p-5">
                <h3 className="font-semibold text-navy mb-2">Colores ({colors.length})</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
                      <th className="py-1.5">Código</th>
                      <th className="py-1.5">Nombre</th>
                      <th className="py-1.5">Estándar</th>
                      <th className="py-1.5 text-right">Fórmulas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((c) => (
                      <tr key={c.id} className="border-b border-(--border-subtle) last:border-0">
                        <td className="py-1.5 font-mono text-xs">{c.code}</td>
                        <td className="py-1.5">{c.name}</td>
                        <td className="py-1.5">{c.standard}</td>
                        <td className="py-1.5 text-right">{c.formulaCount}</td>
                      </tr>
                    ))}
                    {colors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-dark">
                          Sin colores aún. Impórtelos desde "Importar Fórmulas".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card p-8 text-center text-gray-dark">Seleccione un producto de la lista.</div>
          )}
        </div>
      </div>
    </div>
  );
}
