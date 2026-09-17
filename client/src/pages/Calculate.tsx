import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { api, type Product, type ColorSummary, type FormulaSummary, type PricingResponse } from "../api";
import { SearchableSelect } from "../components/SearchableSelect";
import { money, qty, pct, roleLabel } from "../lib/format";

// Secuencia de marca para gráficos categóricos: Navy -> Sky -> Purple.
const DONUT_COLORS = ["#005192", "#008BC5", "#542C97"];

export function Calculate() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<ColorSummary[]>([]);
  const [formulas, setFormulas] = useState<FormulaSummary[]>([]);
  const [productId, setProductId] = useState<string | null>(params.get("productId"));
  const [colorId, setColorId] = useState<string | null>(params.get("colorId"));
  const [formulaId, setFormulaId] = useState<string | null>(null);
  const [contribution, setContribution] = useState("0.50");
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.products.list().then(setProducts);
    api.settings.get().then((s) => setContribution(s.defaultContributionPct));
  }, []);

  useEffect(() => {
    if (!productId) {
      setColors([]);
      return;
    }
    api.products.colors(productId).then(setColors);
  }, [productId]);

  useEffect(() => {
    if (!colorId) {
      setFormulas([]);
      setFormulaId(null);
      return;
    }
    api.colors.formulas(colorId).then((fs) => {
      setFormulas(fs);
      setFormulaId(fs[0]?.id ?? null);
    });
  }, [colorId]);

  useEffect(() => {
    if (!formulaId) {
      setPricing(null);
      return;
    }
    api.formulas.pricing(formulaId, contribution).then(setPricing);
  }, [formulaId, contribution]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (productId) next.set("productId", productId);
    if (colorId) next.set("colorId", colorId);
    setParams(next, { replace: true });
  }, [productId, colorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const breakdown = pricing?.breakdown;

  const donutData = breakdown
    ? [
        { name: "Base", value: Number(breakdown.baseCost) },
        { name: "Concentrados", value: Number(breakdown.concentrateCost) },
        ...(breakdown.productKind === "TWO_K" ? [{ name: "Parte B", value: Number(breakdown.partBCost) }] : []),
      ].filter((d) => d.value > 0)
    : [];

  async function addToList() {
    if (!formulaId) return;
    setAdding(true);
    setMessage(null);
    try {
      await api.calculations.create({ formulaId, contributionPct: contribution });
      setMessage("Agregado a la Lista de Costos.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al agregar.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Calcular Color</h1>
        <p className="text-sm text-gray-dark mt-1">Seleccione material y color para ver el costo y precio sugerido.</p>
      </div>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-dark uppercase">Material</label>
          <div className="mt-1">
            <SearchableSelect
              placeholder="Seleccione un producto..."
              value={productId}
              onChange={(v) => {
                setProductId(v);
                setColorId(null);
              }}
              options={products.map((p) => ({ value: p.id, label: p.name, sublabel: p.code }))}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-dark uppercase">Color</label>
          <div className="mt-1">
            <SearchableSelect
              placeholder={productId ? "Seleccione un color..." : "Elija un material primero"}
              disabled={!productId}
              value={colorId}
              onChange={setColorId}
              options={colors.map((c) => ({ value: c.id, label: `${c.code}${c.name ? " — " + c.name : ""}`, sublabel: c.standard ?? undefined }))}
            />
          </div>
        </div>
        {formulas.length > 1 && (
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-dark uppercase">Fórmula</label>
            <p className="text-xs text-gray-dark mb-1">
              Este color tiene {formulas.length} fórmulas disponibles (distintos formatos, revisiones o plantas). Elija cuál usar.
            </p>
            <div className="flex flex-col gap-1.5 mt-1">
              {formulas.map((f, i) => {
                const secondary = f.version ? `Versión: ${f.version}` : f.sourceFileName ? f.sourceFileName : `Fórmula ${i + 1}`;
                return (
                  <button
                    key={f.id}
                    className={`text-left px-3 py-2 rounded border ${
                      formulaId === f.id ? "border-sky bg-sky/10" : "border-(--border-subtle) hover:bg-(--bg-app)"
                    }`}
                    onClick={() => setFormulaId(f.id)}
                  >
                    <div className="font-medium text-sm">
                      {f.commercialVolume} {f.commercialVolumeUnit}
                    </div>
                    <div className="text-xs text-gray-dark">{secondary}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {breakdown && (
        <>
          {breakdown.isIncomplete && (
            <div className="card p-4 border-l-4 border-l-fuchsia bg-fuchsia/5">
              <div className="badge badge-error mb-1">CÁLCULO INCOMPLETO</div>
              <div className="text-sm text-gray-dark">{breakdown.incompleteReason}</div>
            </div>
          )}
          {!breakdown.isIncomplete && breakdown.formulaWarnings.length > 0 && (
            <div className="card p-4 border-l-4 border-l-violet bg-violet/5">
              <div className="badge badge-warning mb-1">ADVERTENCIA</div>
              {breakdown.formulaWarnings.map((w, i) => (
                <div key={i} className="text-sm text-gray-dark">
                  {w}
                </div>
              ))}
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-semibold text-navy mb-3">Base</h2>
            <LinesTable lines={breakdown.lines.filter((l) => l.role === "BASE")} />
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-navy mb-3">Concentrados</h2>
            <LinesTable lines={breakdown.lines.filter((l) => l.role === "CONCENTRATE")} />
          </div>
          {breakdown.productKind === "TWO_K" && (
            <div className="card p-5">
              <h2 className="font-semibold text-navy mb-3">Parte B</h2>
              <LinesTable lines={breakdown.lines.filter((l) => l.role === "PART_B")} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-semibold text-navy mb-3">Composición del costo</h2>
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${money(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-gray-dark">Sin datos suficientes.</div>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {donutData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-5 space-y-2 text-sm">
              <h2 className="font-semibold text-navy mb-1">Resumen</h2>
              <Row label="Costo Parte A (Base + Concentrados)" value={`${money(Number(breakdown.baseCost) + Number(breakdown.concentrateCost))}`} />
              {breakdown.productKind === "TWO_K" && <Row label="Costo Parte B" value={`${money(breakdown.partBCost)}`} />}
              <Row label="Costo Total / conjunto" value={`${money(breakdown.totalCostPerSet)}`} bold />
              <Row label="Costo / L" value={breakdown.costPerLiter ? `${money(breakdown.costPerLiter)}` : "—"} />
              {pricing?.pricing && (
                <>
                  <hr className="my-2 border-(--border-subtle)" />
                  <Row label="Precio sugerido / L" value={`${money(pricing.pricing.sellingPricePerLiter)}`} />
                  <Row label="Precio sugerido / conjunto" value={`${money(pricing.pricing.sellingPricePerSet)}`} bold />
                  <Row label="Contribución" value={pct(pricing.pricing.contributionPct)} />
                </>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-navy mb-3">Simulador de contribución</h2>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0.1}
                max={0.85}
                step={0.01}
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="flex-1 accent-navy"
              />
              <input
                className="input w-24 text-center"
                value={pct(contribution)}
                onChange={(e) => {
                  const n = parseFloat(e.target.value.replace("%", "").replace(",", "."));
                  if (!Number.isNaN(n)) setContribution((n / 100).toFixed(4));
                }}
              />
            </div>
            {pricing && pricing.scenarios.length > 0 && (
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-left text-xs text-gray-dark uppercase">
                    <th className="py-1">Contribución</th>
                    <th className="py-1">Precio de venta / conjunto</th>
                    <th className="py-1">Ganancia / conjunto</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.scenarios.map((s) => {
                    const isDefault = s.contributionPct === "0.50";
                    return (
                      <tr key={s.contributionPct} className={isDefault ? "bg-sky/10 font-semibold" : ""}>
                        <td className="py-1.5">{pct(s.contributionPct)} {isDefault && <span className="text-sky">(default)</span>}</td>
                        <td className="py-1.5">{money(s.sellingPrice)}</td>
                        <td className="py-1.5">{money(s.profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={adding || breakdown.isIncomplete} onClick={addToList}>
              {adding ? "Agregando..." : "+ Agregar a Lista"}
            </button>
            {message && <span className="text-sm text-gray-dark">{message}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-dark">{label}</span>
      <span className={bold ? "font-bold text-navy" : ""}>{value}</span>
    </div>
  );
}

function LinesTable({ lines }: { lines: PricingResponse["breakdown"]["lines"] }) {
  if (lines.length === 0) return <div className="text-sm text-gray-dark">Sin líneas.</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
          <th className="py-1.5 pr-4">Código</th>
          <th className="py-1.5 pr-4">Descripción</th>
          <th className="py-1.5 pr-4 text-right">Cantidad</th>
          <th className="py-1.5 pr-4 text-right">Costo Unitario</th>
          <th className="py-1.5 text-right">Costo Aplicado</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.componentId} className="border-b border-(--border-subtle) last:border-0">
            <td className="py-1.5 pr-4 font-mono text-xs">{l.code}</td>
            <td className="py-1.5 pr-4">{l.description}</td>
            <td className="py-1.5 pr-4 text-right whitespace-nowrap">
              {qty(l.quantity)} {l.unit}
            </td>
            <td className="py-1.5 pr-4 text-right whitespace-nowrap">{l.ok ? `${money(l.unitCost)}` : <span className="badge badge-error">{roleLabel(l.role)} sin costo</span>}</td>
            <td className="py-1.5 text-right whitespace-nowrap">{l.ok ? `${money(l.appliedCost)}` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
