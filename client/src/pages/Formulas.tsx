import { useEffect, useRef, useState } from "react";
import { api, type Product, type ColorSummary, type FormulaSummary, type ComponentRow } from "../api";
import { SearchableSelect } from "../components/SearchableSelect";

export function Formulas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [colorId, setColorId] = useState("");
  const [formulas, setFormulas] = useState<FormulaSummary[]>([]);
  const [showNewColor, setShowNewColor] = useState(false);
  const [showNewFormula, setShowNewFormula] = useState(false);

  function reloadColors() {
    if (productId) api.products.colors(productId).then(setColors);
    else setColors([]);
  }
  function reloadFormulas() {
    if (colorId) api.colors.formulas(colorId).then(setFormulas);
    else setFormulas([]);
  }

  useEffect(() => {
    api.products.list().then(setProducts);
  }, []);
  useEffect(() => {
    reloadColors();
    setColorId("");
    setShowNewColor(false);
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    reloadFormulas();
    setShowNewFormula(false);
  }, [colorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta fórmula?")) return;
    await api.formulas.remove(id);
    reloadFormulas();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy">Fórmulas de Color</h1>
        <p className="text-sm text-gray-dark mt-1">Explore las fórmulas importadas o creadas manualmente por producto y color.</p>
      </div>

      <div className="flex gap-3 items-center">
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
        {productId && (
          <button className="btn-secondary" onClick={() => setShowNewColor((s) => !s)}>
            + Nuevo color
          </button>
        )}
        {colorId && (
          <button className="btn-secondary" onClick={() => setShowNewFormula((s) => !s)}>
            + Fórmula manual/personalizada
          </button>
        )}
      </div>

      {showNewColor && (
        <NewColorForm
          productId={productId}
          onCreated={(id) => {
            setShowNewColor(false);
            reloadColors();
            setColorId(id);
          }}
          onCancel={() => setShowNewColor(false)}
        />
      )}

      {showNewFormula && colorId && (
        <NewFormulaForm
          colorId={colorId}
          onCreated={() => {
            setShowNewFormula(false);
            reloadFormulas();
          }}
          onCancel={() => setShowNewFormula(false)}
        />
      )}

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

const UNITS = ["ML", "L", "G", "KG"];

function NewColorForm({ productId, onCreated, onCancel }: { productId: string; onCreated: (id: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [standard, setStandard] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!code.trim()) {
      setError("El código de color es requerido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const color = await api.colors.create({ productId, code: code.trim(), name: name.trim() || undefined, standard: standard.trim() || undefined });
      onCreated(color.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el color.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-navy">Nuevo color</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-dark">Código *</label>
          <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-dark">Nombre</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-dark">Estándar (ej. RAL 9001)</label>
          <input className="input w-full" value={standard} onChange={(e) => setStandard(e.target.value)} />
        </div>
      </div>
      {error && <div className="text-sm text-fuchsia">{error}</div>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Guardando..." : "Guardar color"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface ConcentrateRow {
  key: number;
  componentId: string;
  quantity: string;
  unit: string;
}

function NewFormulaForm({ colorId, onCreated, onCancel }: { colorId: string; onCreated: () => void; onCancel: () => void }) {
  const [bases, setBases] = useState<ComponentRow[]>([]);
  const [concentrateOptions, setConcentrateOptions] = useState<ComponentRow[]>([]);
  const [version, setVersion] = useState("");
  const [commercialVolume, setCommercialVolume] = useState("");
  const [commercialVolumeUnit, setCommercialVolumeUnit] = useState("ML");
  const [baseComponentId, setBaseComponentId] = useState<string | null>(null);
  const [fillToVolume, setFillToVolume] = useState(false);
  const [baseQuantity, setBaseQuantity] = useState("");
  const [baseUnit, setBaseUnit] = useState("ML");
  const [concentrates, setConcentrates] = useState<ConcentrateRow[]>([{ key: 0, componentId: "", quantity: "", unit: "ML" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(1);

  useEffect(() => {
    api.components.list("BASE").then(setBases);
    api.components.list("CONCENTRATE").then(setConcentrateOptions);
  }, []);

  function addConcentrateRow() {
    setConcentrates((rows) => [...rows, { key: nextKey.current++, componentId: "", quantity: "", unit: "ML" }]);
  }
  function removeConcentrateRow(key: number) {
    setConcentrates((rows) => rows.filter((r) => r.key !== key));
  }
  function updateConcentrateRow(key: number, patch: Partial<ConcentrateRow>) {
    setConcentrates((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (!baseComponentId || (!fillToVolume && !baseQuantity) || !commercialVolume) {
      setError("Base, cantidad de base (o 'completar a volumen') y volumen comercial son requeridos.");
      return;
    }
    const validConcentrates = concentrates.filter((r) => r.componentId && r.quantity);
    setSaving(true);
    setError(null);
    try {
      await api.formulas.create({
        colorId,
        baseComponentId,
        baseQuantity: fillToVolume ? "0" : baseQuantity,
        baseUnit,
        commercialVolume,
        commercialVolumeUnit,
        concentrates: validConcentrates.map((r) => ({ componentId: r.componentId, quantity: r.quantity, unit: r.unit })),
        version: version.trim() || undefined,
        baseQuantityBasis: fillToVolume ? "FILL_TO_VOLUME" : "EXPLICIT",
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la fórmula.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-navy">Fórmula manual / personalizada</h3>
        <p className="text-xs text-gray-dark mt-1">
          Para colores "customizados" sin archivo Excel de origen. La Parte B (si el material es 2K) se toma de la asociación
          configurada en la pantalla de Productos, no se define aquí.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-dark">Versión / nota (opcional)</label>
          <input className="input w-full" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-dark">Volumen comercial *</label>
          <div className="flex gap-2">
            <input className="input w-full" value={commercialVolume} onChange={(e) => setCommercialVolume(e.target.value)} />
            <select className="input" value={commercialVolumeUnit} onChange={(e) => setCommercialVolumeUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-dark">Base *</label>
        <div className="flex gap-2 mt-1">
          <div className="flex-1">
            <SearchableSelect
              placeholder="Seleccione componente base..."
              value={baseComponentId}
              onChange={setBaseComponentId}
              options={bases.map((c) => ({ value: c.id, label: `${c.code} — ${c.description}` }))}
            />
          </div>
          <input
            className="input w-32"
            placeholder="Cantidad"
            value={baseQuantity}
            disabled={fillToVolume}
            onChange={(e) => setBaseQuantity(e.target.value)}
          />
          <select className="input" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-dark mt-1.5">
          <input type="checkbox" checked={fillToVolume} onChange={(e) => setFillToVolume(e.target.checked)} />
          Completar a volumen automáticamente (Base = Volumen comercial − Concentrados{" "}
          <span className="italic">− Parte B si es 2K</span>)
        </label>
      </div>

      <div>
        <label className="text-xs text-gray-dark">Concentrados</label>
        <div className="space-y-2 mt-1">
          {concentrates.map((row) => (
            <div key={row.key} className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchableSelect
                  placeholder="Seleccione concentrado..."
                  value={row.componentId || null}
                  onChange={(v) => updateConcentrateRow(row.key, { componentId: v })}
                  options={concentrateOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.description}` }))}
                />
              </div>
              <input
                className="input w-32"
                placeholder="Cantidad"
                value={row.quantity}
                onChange={(e) => updateConcentrateRow(row.key, { quantity: e.target.value })}
              />
              <select className="input" value={row.unit} onChange={(e) => updateConcentrateRow(row.key, { unit: e.target.value })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button className="text-fuchsia text-xs" onClick={() => removeConcentrateRow(row.key)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button className="btn-secondary mt-2" onClick={addConcentrateRow}>
          + Agregar concentrado
        </button>
      </div>

      {error && <div className="text-sm text-fuchsia">{error}</div>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Guardando..." : "Guardar fórmula"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
