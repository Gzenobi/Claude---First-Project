import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  IconDashboard,
  IconCalculate,
  IconList,
  IconProduct,
  IconFormula,
  IconTag,
  IconUploadFile,
  IconUploadSheet,
  IconHistory,
  IconSettings,
} from "./icons";

const items = [
  { to: "/", label: "Dashboard", icon: IconDashboard },
  { to: "/calcular", label: "Calcular Color", icon: IconCalculate },
  { to: "/lista", label: "Lista de Costos", icon: IconList },
  { to: "/productos", label: "Productos", icon: IconProduct },
  { to: "/formulas", label: "Fórmulas de Color", icon: IconFormula },
  { to: "/componentes", label: "Costos de Componentes", icon: IconTag },
  { to: "/importar-formulas", label: "Importar Fórmulas", icon: IconUploadFile },
  { to: "/importar-costos", label: "Importar Costos", icon: IconUploadSheet },
  { to: "/historial", label: "Historial", icon: IconHistory },
  { to: "/configuracion", label: "Configuración", icon: IconSettings },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-navy text-white flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="text-lg font-bold leading-tight">¡Calculadora de<br />Costos de Colores!</div>
        <div className="text-xs text-white/70 mt-1">International Paint | Costing &amp; Pricing Tool</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-white/15 text-white border-r-4 border-sky" : "text-white/80 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-[11px] text-white/50 border-t border-white/10">v0.1 — Datos de demostración incluidos</div>
    </aside>
  );
}
