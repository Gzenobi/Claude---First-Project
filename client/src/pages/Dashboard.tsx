import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api, type DashboardData, type DashboardTimelinePoint } from "../api";

function Kpi({ label, value, tone, hint }: { label: string; value: string | number; tone?: "warning" | "ok"; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-gray-dark uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${tone === "warning" ? "text-fuchsia" : "text-navy"}`}>{value}</div>
      {hint && <div className="text-xs text-gray-dark mt-1">{hint}</div>}
    </div>
  );
}

function formatDay(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeline, setTimeline] = useState<DashboardTimelinePoint[] | null>(null);

  useEffect(() => {
    api.dashboard().then(setData);
    api.dashboardTimeline().then(setTimeline).catch(() => setTimeline([]));
  }, []);

  if (!data) return <div className="text-gray-dark">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-sm text-gray-dark mt-1">Vista general de productos, colores, fórmulas y costos cargados en el sistema.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Productos cargados" value={data.productCount} />
        <Kpi label="Colores disponibles" value={data.colorCount} />
        <Kpi label="Fórmulas disponibles" value={data.formulaCount} />
        <Kpi label="Productos 2K" value={data.twoKCount} />
        <Kpi label="Bases" value={data.baseCount} />
        <Kpi label="Concentrados" value={data.concentrateCount} />
        <Kpi
          label="Última actualización de costos"
          value={data.lastCostUpdate ? new Date(data.lastCostUpdate).toLocaleDateString("es-AR") : "Sin datos"}
        />
        <Kpi
          label="Fórmulas con errores"
          value={data.formulasWithErrors}
          tone={data.formulasWithErrors > 0 ? "warning" : "ok"}
          hint={data.formulasWithErrors > 0 ? "Falta costo de al menos un componente" : "Todo OK"}
        />
      </div>

      {timeline && (
        <div className="card p-5">
          <div className="section-bar -mx-5 -mt-5 mb-4">Crecimiento del catálogo</div>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-dark">Todavía no hay colores ni fórmulas cargadas.</p>
          ) : (
            <>
              <p className="text-xs text-gray-dark mb-3">Colores y fórmulas cargados en el sistema, acumulados por día.</p>
              {timeline.length === 1 && (
                <p className="text-xs text-violet mb-2">
                  Todo se cargó en un solo día — con importaciones en más fechas vas a ver la tendencia completa.
                </p>
              )}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeline} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 11, fill: "#5b6b7a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5b6b7a" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip labelFormatter={(d) => formatDay(String(d))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "colors" ? "Colores" : "Fórmulas")} />
                  <Line type="monotone" dataKey="colors" name="colors" stroke="#003A70" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="formulas" name="formulas" stroke="#008BC5" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {data.topMissingCostComponents.length > 0 && (
        <div className="card p-5">
          <div className="section-bar -mx-5 -mt-5 mb-4">Componentes sin costo que más fórmulas bloquean</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
                <th className="py-1.5 pr-4">Código</th>
                <th className="py-1.5 pr-4">Descripción</th>
                <th className="py-1.5 text-right">Fórmulas afectadas</th>
              </tr>
            </thead>
            <tbody>
              {data.topMissingCostComponents.map((c) => (
                <tr key={c.code} className="border-b border-(--border-subtle) last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-xs">{c.code}</td>
                  <td className="py-1.5 pr-4">{c.description}</td>
                  <td className="py-1.5 text-right font-semibold text-fuchsia">{c.formulasBlocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-dark mt-2">
            Cargar el costo de estos componentes en{" "}
            <Link to="/componentes" className="text-sky font-medium">
              Costos de Componentes
            </Link>{" "}
            destraba la mayor cantidad de fórmulas con el menor esfuerzo.
          </p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-navy mb-3">Flujo recomendado</h2>
        <ol className="text-sm text-gray-dark space-y-2 list-decimal list-inside">
          <li>
            Importe la planilla maestra de costos en{" "}
            <Link to="/importar-costos" className="text-sky font-medium">
              Importar Costos
            </Link>
            .
          </li>
          <li>
            Importe una o cientos de fórmulas de color en{" "}
            <Link to="/importar-formulas" className="text-sky font-medium">
              Importar Fórmulas
            </Link>{" "}
            (arrastre y suelte varios archivos a la vez).
          </li>
          <li>
            Vaya a{" "}
            <Link to="/calcular" className="text-sky font-medium">
              Calcular Color
            </Link>
            , elija material y color, ajuste la contribución y agregue el resultado a la lista.
          </li>
          <li>
            Exporte la{" "}
            <Link to="/lista" className="text-sky font-medium">
              Lista de Costos
            </Link>{" "}
            a Excel o CSV.
          </li>
        </ol>
      </div>
    </div>
  );
}
