import { useEffect, useState } from "react";
import { api, type Product, type ColorSummary, type FormulaSummary } from "../api";

export function Formulas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [colorId, setColorId] = useState("");
  const [formulas, setFormulas] = useState<FormulaSummary[]>([]);

  useEffect(() => {
    api.products.list().then(setProducts);
  }, []);
  useEffect(() => {
    if (productId) api.products.colors(productId).then(setColors);
    else setColors([]);
    setColorId("");
  }, [productId]);
  useEffect(() => {
    if (colorId) api.colors.formulas(colorId).then(setFormulas);
    else setFormulas([]);
  }, [colorId]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta fórmula?")) return;
    await api.formulas.remove(id);
    if (colorId) api.colors.formulas(colorId).then(setFormulas);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy">Fórmulas de Color</h1>
        <p className="text-sm text-gray-dark mt-1">Explore las fórmulas importadas o creadas manualmente por producto y color.</p>
      </div>

      <div className="flex gap-3">
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Seleccione producto...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        <select className="input" value={colorId} onChange={(e) => setColorId(e.target.value)} disabled={!productId}>
          <option value="">Seleccione color...</option>
          {colors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} {c.name ? `— ${c.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
              <th className="py-2 px-3">Volumen comercial</th>
              <th className="py-2 px-3">Volumen de mezcla</th>
              <th className="py-2 px-3">Base declarada</th>
              <th className="py-2 px-3">Versión</th>
              <th className="py-2 px-3">Archivo origen</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {formulas.map((f) => (
              <tr key={f.id} className="border-b border-(--border-subtle) last:border-0">
                <td className="py-2 px-3">
                  {f.commercialVolume} {f.commercialVolumeUnit}
                </td>
                <td className="py-2 px-3">
                  {f.batchVolume} {f.batchVolumeUnit}
                </td>
                <td className="py-2 px-3">
                  {f.baseQuantityBasis === "FILL_TO_VOLUME" ? (
                    <span className="badge badge-warning">Calculada (completar a volumen)</span>
                  ) : (
                    <span className="badge badge-ok">Explícita</span>
                  )}
                </td>
                <td className="py-2 px-3">{f.version ?? "—"}</td>
                <td className="py-2 px-3 text-xs text-gray-dark">{f.sourceFileName ?? "Manual"}</td>
                <td className="py-2 px-3">
                  <button className="text-fuchsia text-xs" onClick={() => remove(f.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {formulas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-dark">
                  Seleccione un producto y color para ver sus fórmulas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
