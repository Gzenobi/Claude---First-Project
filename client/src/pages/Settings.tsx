import { useEffect, useState } from "react";
import { api, type Settings } from "../api";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  function load() {
    api.settings.get().then(setSettings);
  }
  useEffect(load, []);

  async function save() {
    if (!settings) return;
    await api.settings.update(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <div className="text-gray-dark">Cargando…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Configuración</h1>
        <p className="text-sm text-gray-dark mt-1">Parámetros generales del sistema de costeo y precios. Todos los montos se manejan en USD.</p>
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
            <label className="text-xs text-gray-dark uppercase">Moneda</label>
            <div className="input w-full bg-(--bg-app) text-gray-dark">USD</div>
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
    </div>
  );
}
