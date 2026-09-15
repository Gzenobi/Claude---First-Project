import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardData } from "../api";

function Kpi({ label, value, tone, hint }: { label: string; value: string | number; tone?: "warning" | "ok"; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-gray-dark uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${tone === "warning" ? "text-fuchsia" : "text-navy"}`}>{value}</div>
      {hint && <div className="text-xs text-gray-dark mt-1">{hint}</div>}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.dashboard().then(setData);
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
