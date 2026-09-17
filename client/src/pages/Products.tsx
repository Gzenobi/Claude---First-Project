import { useEffect, useState } from "react";
import { api, type Product, type ColorSummary } from "../api";

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  function load() {
    api.products.list().then(setProducts);
  }
  useEffect(load, []);
  useEffect(() => {
    if (selected) api.products.colors(selected.id).then(setColors);
  }, [selected]);

  async function createProduct() {
    if (!form.code || !form.name) return;
    // La clasificación 1K/2K se infiere sola al cargar la primera fórmula
    // (vía el vínculo Base->Parte B del maestro de costos), no se pide acá.
    // Se arranca en 1K porque la inferencia solo sube a 2K, nunca baja.
    await api.products.create({ ...form, kind: "ONE_K" });
    setForm({ code: "", name: "" });
    setShowNew(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Productos</h1>
          <p className="text-sm text-gray-dark mt-1">Materiales (ej. Interthane 990, Interseal 670HS) y sus colores.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          + Nuevo Producto
        </button>
      </div>

      {showNew && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-dark">Código</label>
            <input className="input w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark">Nombre</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
                <h2 className="font-semibold text-navy text-lg">{selected.name}</h2>
                <div className="text-sm text-gray-dark">{selected.code}</div>
              </div>

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
