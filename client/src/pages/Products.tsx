import { useEffect, useState } from "react";
import { api, type Product, type ColorSummary } from "../api";
import { SearchableSelect } from "../components/SearchableSelect";

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  const [merging, setMerging] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeName, setMergeName] = useState("");
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [bulkMerging, setBulkMerging] = useState(false);
  const [bulkSourceIds, setBulkSourceIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  function load() {
    api.products.list().then(setProducts);
  }
  useEffect(load, []);
  useEffect(() => {
    if (selected) api.products.colors(selected.id).then(setColors);
    setMerging(false);
    setMergeTargetId(null);
    setMergeName("");
    setMergeConfirm(false);
    setBulkMerging(false);
    setBulkSourceIds([]);
    setBulkSearch("");
    setBulkName("");
    setBulkConfirm(false);
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

  async function runMerge() {
    if (!selected || !mergeTargetId) return;
    setMergeBusy(true);
    try {
      const merged = await api.products.merge({
        sourceProductIds: [selected.id],
        targetProductId: mergeTargetId,
        targetName: mergeName || undefined,
      });
      setMerging(false);
      setMergeTargetId(null);
      setMergeName("");
      setMergeConfirm(false);
      setSelected(null);
      load();
      // pequeña espera para que la lista recién cargada incluya al producto fusionado
      setTimeout(() => api.products.list().then((ps) => setSelected(ps.find((p) => p.id === merged.id) ?? null)), 200);
    } finally {
      setMergeBusy(false);
    }
  }

  async function runBulkMerge() {
    if (!selected || bulkSourceIds.length === 0) return;
    setBulkBusy(true);
    try {
      const merged = await api.products.merge({
        sourceProductIds: bulkSourceIds,
        targetProductId: selected.id,
        targetName: bulkName || undefined,
      });
      setBulkMerging(false);
      setBulkSourceIds([]);
      setBulkSearch("");
      setBulkName("");
      setBulkConfirm(false);
      setSelected(null);
      load();
      setTimeout(() => api.products.list().then((ps) => setSelected(ps.find((p) => p.id === merged.id) ?? null)), 200);
    } finally {
      setBulkBusy(false);
    }
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-navy text-lg">{selected.name}</h2>
                    <div className="text-sm text-gray-dark">{selected.code}</div>
                  </div>
                  {!merging && !bulkMerging && (
                    <div className="flex gap-2 shrink-0">
                      <button className="btn-secondary text-xs" onClick={() => setBulkMerging(true)}>
                        Fusión múltiple...
                      </button>
                      <button className="btn-secondary text-xs" onClick={() => setMerging(true)}>
                        Fusionar con otro producto...
                      </button>
                    </div>
                  )}
                </div>

                {merging && (
                  <div className="mt-4 pt-4 border-t border-(--border-subtle) space-y-3">
                    <p className="text-xs text-gray-dark">
                      Los colores y fórmulas de <strong>{selected.name}</strong> se pasan al producto elegido, y este producto se elimina.
                      Usalo cuando dos nombres distintos son en realidad la misma marca (ej. un typo).
                    </p>
                    <div>
                      <label className="text-xs text-gray-dark">Fusionar con</label>
                      <SearchableSelect
                        placeholder="Seleccione el producto que se conserva..."
                        value={mergeTargetId}
                        onChange={(v) => {
                          setMergeTargetId(v);
                          setMergeConfirm(false);
                        }}
                        options={products.filter((p) => p.id !== selected.id).map((p) => ({ value: p.id, label: p.name, sublabel: p.code }))}
                      />
                    </div>
                    {mergeTargetId && (
                      <div>
                        <label className="text-xs text-gray-dark">Nombre final (opcional, si ninguno de los dos es el correcto)</label>
                        <input
                          className="input w-full"
                          placeholder={products.find((p) => p.id === mergeTargetId)?.name}
                          value={mergeName}
                          onChange={(e) => setMergeName(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {mergeTargetId && !mergeConfirm && (
                        <button className="btn-primary" onClick={() => setMergeConfirm(true)}>
                          Fusionar
                        </button>
                      )}
                      {mergeConfirm && (
                        <button className="btn-primary" disabled={mergeBusy} onClick={runMerge}>
                          {mergeBusy ? "Fusionando..." : "Confirmar fusión — no se puede deshacer"}
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setMerging(false);
                          setMergeTargetId(null);
                          setMergeName("");
                          setMergeConfirm(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {bulkMerging && (
                  <div className="mt-4 pt-4 border-t border-(--border-subtle) space-y-3">
                    <p className="text-xs text-gray-dark">
                      Elija varios productos duplicados para traer todos sus colores y fórmulas a <strong>{selected.name}</strong> de una
                      sola vez. Los productos elegidos se eliminan al terminar.
                    </p>
                    <div>
                      <label className="text-xs text-gray-dark">Buscar productos para fusionar dentro de {selected.name}</label>
                      <input
                        className="input w-full"
                        placeholder="Escriba para filtrar..."
                        value={bulkSearch}
                        onChange={(e) => {
                          setBulkSearch(e.target.value);
                          setBulkConfirm(false);
                        }}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-(--border-subtle) rounded-lg divide-y divide-(--border-subtle)">
                      {products
                        .filter((p) => p.id !== selected.id)
                        .filter((p) => {
                          const q = bulkSearch.trim().toLowerCase();
                          if (!q) return true;
                          return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
                        })
                        .map((p) => {
                          const checked = bulkSourceIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-(--bg-app)">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setBulkConfirm(false);
                                  setBulkSourceIds((ids) =>
                                    e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id)
                                  );
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-gray-dark flex gap-2">
                                  <span>{p.code}</span>
                                  <span>{p.colorCount} color(es)</span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                    {bulkSourceIds.length > 0 && (
                      <p className="text-xs text-sky font-medium">{bulkSourceIds.length} producto(s) seleccionado(s) para fusionar.</p>
                    )}
                    <div>
                      <label className="text-xs text-gray-dark">Nombre final (opcional)</label>
                      <input
                        className="input w-full"
                        placeholder={selected.name}
                        value={bulkName}
                        onChange={(e) => setBulkName(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {bulkSourceIds.length > 0 && !bulkConfirm && (
                        <button className="btn-primary" onClick={() => setBulkConfirm(true)}>
                          Fusionar {bulkSourceIds.length} producto(s)
                        </button>
                      )}
                      {bulkConfirm && (
                        <button className="btn-primary" disabled={bulkBusy} onClick={runBulkMerge}>
                          {bulkBusy ? "Fusionando..." : "Confirmar fusión — no se puede deshacer"}
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setBulkMerging(false);
                          setBulkSourceIds([]);
                          setBulkSearch("");
                          setBulkName("");
                          setBulkConfirm(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
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
