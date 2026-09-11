import { PageHeader } from "@/components/page-header";
import type { ActivityWithRelations, Client, ProjectWithClient } from "@/types";

import { computeDashboardMetrics } from "../metrics";
import { ActivitiesTypeChart } from "./activities-type-chart";
import { ForecastChart } from "./forecast-chart";
import { KpiSection } from "./kpi-section";
import { PipelineStatusChart } from "./pipeline-status-chart";
import { SegmentChart } from "./segment-chart";
import { RecentActivityCard, TopClientsCard, UpcomingActionsCard } from "./side-widgets";

interface DashboardViewProps {
  clients: Client[];
  projects: ProjectWithClient[];
  activities: ActivityWithRelations[];
  userName: string;
}

export function DashboardView({ clients, projects, activities, userName }: DashboardViewProps) {
  const metrics = computeDashboardMetrics(clients, projects, activities);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${userName.split(" ")[0]}`}
        description="Resumen de tu actividad comercial y pipeline de oportunidades."
      />

      <KpiSection metrics={metrics} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineStatusChart data={metrics.pipelineByStatus} />
        <ForecastChart data={metrics.forecastByMonth} />
        <SegmentChart data={metrics.projectsBySegment} />
        <ActivitiesTypeChart data={metrics.activitiesByType} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TopClientsCard topClients={metrics.topClients} />
        <UpcomingActionsCard activities={metrics.upcomingActions} />
        <RecentActivityCard activities={metrics.recentActivities} />
      </div>
    </div>
  );
}
