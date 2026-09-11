import { AlertTriangle, DollarSign, TrendingUp, Trophy } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "../metrics";

export function KpiSection({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Pipeline activo"
        value={formatCurrency(metrics.pipelineTotal)}
        icon={TrendingUp}
        trend={`${metrics.activeProjects} proyectos abiertos`}
        accent
      />
      <KpiCard
        label="Forecast ponderado"
        value={formatCurrency(metrics.forecastTotal)}
        icon={DollarSign}
        trend="Valor × probabilidad de cierre"
      />
      <KpiCard
        label="Ganado (histórico)"
        value={formatCurrency(metrics.wonValue)}
        icon={Trophy}
        trend={`${metrics.conversionRate}% tasa de conversión`}
        trendTone="positive"
      />
      <KpiCard
        label="Actividades vencidas"
        value={String(metrics.overdueActivitiesCount)}
        icon={AlertTriangle}
        trend={metrics.overdueActivitiesCount > 0 ? "Requieren seguimiento" : "Todo al día"}
        trendTone={metrics.overdueActivitiesCount > 0 ? "negative" : "positive"}
      />
    </div>
  );
}
