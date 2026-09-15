import { useEffect, useState } from "react";
import { api, type Settings, type ExchangeRate } from "../api";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [newRate, setNewRate] = useState({ fromCurrency: "USD", toCurrency: "ARS", rate: "" });
  const [saved, setSaved] = useState(false);

  function load() {
    api.settings.get().then(setSettings);
    api.settings.exchangeRates().then(setRates);
  }
  useEffect(load, []);

  async function save() {
    if (!settings) return;
    await api.settings.update(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addRate() {
    if (!newRate.rate) return;
    await api.settings.addExchangeRate(newRate);
    setNewRate({ ...newRate, rate: "" });
    load();
  }

  if (!settings) return <div className="text-gray-dark">Cargando…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Configuración</h1>
        <p className="text-sm text-gray-dark mt-1">Parámetros generales del sistema de costeo y precios.</p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-navy">General</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-dark uppercase">Contribución por defecto (%)</label>
            <input
              className="input w-full"
              value={(Number(settings.defaultContributionPct) * 100).toString()}
              onChange={(e) => setSettings({ ...settings, defaultContributionPct: (Number(e.target.value) / 100).toString() })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-dark uppercase">Moneda principal</label>
            <select className="input w-full" value={settings.mainCurrency} onChange={(e) => setSettings({ ...settings, mainCurrency: e.target.value })}>
              <option>USD</option>
              <option>EUR</option>
              <option>ARS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-dark uppercase">Decimales — cantidades</label>
            <input type="number" className="input w-full" value={settings.qtyDecimals} onChange={(e) => setSettings({ ...settings, qtyDecimals: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark uppercase">Decimales — costo unitario</label>
            <input type="number" className="input w-full" value={settings.unitCostDecimals} onChange={(e) => setSettings({ ...settings, unitCostDecimals: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark uppercase">Decimales — totales</label>
            <input type="number" className="input w-full" value={settings.totalDecimals} onChange={(e) => setSettings({ ...settings, totalDecimals: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-gray-dark uppercase">Tamaño máximo de archivo (MB)</label>
            <input type="number" className="input w-full" value={settings.maxFileSizeMb} onChange={(e) => setSettings({ ...settings, maxFileSizeMb: Number(e.target.value) })} />
          </div>
        </div>
        <button className="btn-primary" onClick={save}>
          Guardar
        </button>
        {saved && <span className="text-sky text-sm ml-2">Guardado.</span>}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-navy">Tipos de cambio</h2>
        <p className="text-xs text-gray-dark">Ingreso manual — el sistema no depende de APIs externas.</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
              <th className="py-1.5 pr-6">De</th>
              <th className="py-1.5 pr-6">A</th>
              <th className="py-1.5 pr-6 text-right">Tasa</th>
              <th className="py-1.5">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-b border-(--border-subtle) last:border-0">
                <td className="py-1.5 pr-6">{r.fromCurrency}</td>
                <td className="py-1.5 pr-6">{r.toCurrency}</td>
                <td className="py-1.5 pr-6 text-right">{r.rate}</td>
                <td className="py-1.5 text-xs text-gray-dark">{new Date(r.asOfDate).toLocaleDateString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 items-end pt-2">
          <select className="input" value={newRate.fromCurrency} onChange={(e) => setNewRate({ ...newRate, fromCurrency: e.target.value })}>
            <option>USD</option>
            <option>EUR</option>
            <option>ARS</option>
          </select>
          <select className="input" value={newRate.toCurrency} onChange={(e) => setNewRate({ ...newRate, toCurrency: e.target.value })}>
            <option>USD</option>
            <option>EUR</option>
            <option>ARS</option>
          </select>
          <input className="input w-32" placeholder="Tasa" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} />
          <button className="btn-secondary" onClick={addRate}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
