import { Building2, Clock, ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVITY_TYPE_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardMetrics } from "../metrics";

export function TopClientsCard({ topClients }: { topClients: DashboardMetrics["topClients"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-akzo-blue" />
          Top clientes por potencial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topClients.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
        )}
        {topClients.map((client, index) => (
          <div key={client.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-akzo-blue/10 text-[11px] font-semibold text-akzo-blue">
                {index + 1}
              </span>
              {client.name}
            </span>
            <span className="font-medium text-akzo-blue-dark">
              {formatCurrency(client.potential)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TopOpportunitiesCard({
  opportunities,
}: {
  opportunities: DashboardMetrics["topOpportunities"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-akzo-blue" />
          Oportunidades más grandes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin oportunidades activas.</p>
        )}
        {opportunities.map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-slate-700">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.clientName}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-medium text-akzo-blue-dark">
                {formatCurrency(project.estimatedValue, project.currency)}
              </span>
              <StatusBadge status={project.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentActivityCard({
  activities,
}: {
  activities: DashboardMetrics["recentActivities"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-akzo-blue" />
          Actividad reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
        )}
        {activities.map((activity) => (
          <div key={activity.id} className="text-sm">
            <p className="font-medium text-slate-700">
              {ACTIVITY_TYPE_LABEL[activity.activityType]} · {activity.clientName ?? "Sin cliente"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(activity.activityDate)} · {activity.ownerName}
              {activity.result ? ` — ${activity.result}` : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function UpcomingActionsCard({
  activities,
}: {
  activities: DashboardMetrics["upcomingActions"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-akzo-blue" />
          Próximas acciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay próximas acciones programadas.</p>
        )}
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-slate-700">{activity.nextAction}</p>
              <p className="text-xs text-muted-foreground">{activity.clientName ?? "—"}</p>
            </div>
            <span className="text-xs font-medium text-akzo-blue-dark">
              {formatDate(activity.nextActionDate)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
