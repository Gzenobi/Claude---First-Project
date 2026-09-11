"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertOctagon, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButton } from "@/features/export/export-button";
import { INDUSTRY_SEGMENTS, PROJECT_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActivityWithRelations, Client, Profile, ProjectWithClient } from "@/types";

import { computeDashboardMetrics } from "../metrics";
import { ActivitiesTypeChart } from "./activities-type-chart";
import { ChartCard } from "./chart-card";
import { ForecastChart } from "./forecast-chart";
import { KpiSection } from "./kpi-section";
import { PipelineStatusChart } from "./pipeline-status-chart";
import { SegmentChart } from "./segment-chart";
import { TopClientsCard, TopOpportunitiesCard } from "./side-widgets";

interface ExecutiveDashboardProps {
  clients: Client[];
  projects: ProjectWithClient[];
  activities: ActivityWithRelations[];
  salesProfiles: Profile[];
}

export function ExecutiveDashboard({
  clients,
  projects,
  activities,
  salesProfiles,
}: ExecutiveDashboardProps) {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const ownerNameById = useMemo(
    () => new Map(salesProfiles.map((p) => [p.id, p.fullName])),
    [salesProfiles],
  );

  const filteredClients = useMemo(
    () => clients.filter((c) => ownerFilter === "all" || c.ownerId === ownerFilter),
    [clients, ownerFilter],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          (ownerFilter === "all" || p.ownerId === ownerFilter) &&
          (segmentFilter === "all" || p.industrySegment === segmentFilter) &&
          (statusFilter === "all" || p.status === statusFilter),
      ),
    [projects, ownerFilter, segmentFilter, statusFilter],
  );

  const filteredActivities = useMemo(
    () => activities.filter((a) => ownerFilter === "all" || a.ownerId === ownerFilter),
    [activities, ownerFilter],
  );

  const metrics = useMemo(
    () => computeDashboardMetrics(filteredClients, filteredProjects, filteredActivities),
    [filteredClients, filteredProjects, filteredActivities],
  );

  const activitiesByOwner = useMemo(() => {
    const map = new Map<string, number>();
    filteredActivities.forEach((a) => {
      map.set(a.ownerName, (map.get(a.ownerName) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([owner, count]) => ({ owner, count }));
  }, [filteredActivities]);

  const criticalProjects = useMemo(() => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return filteredProjects
      .filter(
        (p) =>
          p.status !== "ganado" &&
          p.status !== "perdido" &&
          p.estimatedCloseDate &&
          new Date(p.estimatedCloseDate) <= in30Days &&
          p.estimatedValue >= 100000,
      )
      .sort((a, b) => b.estimatedValue - a.estimatedValue);
  }, [filteredProjects]);

  const mostActiveClients = useMemo(() => {
    const map = new Map<string, number>();
    filteredActivities.forEach((a) => {
      if (!a.clientName) return;
      map.set(a.clientName, (map.get(a.clientName) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [filteredActivities]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Ejecutivo"
        description="Vista consolidada del pipeline comercial de todo el equipo."
        actions={<ExportButton entity="pipeline-consolidado" data={filteredProjects} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            {salesProfiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los segmentos</SelectItem>
            {INDUSTRY_SEGMENTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <KpiSection metrics={metrics} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineStatusChart data={metrics.pipelineByStatus} />
        <ForecastChart data={metrics.forecastByMonth} />
        <SegmentChart data={metrics.projectsBySegment} />
        <ChartCard title="Actividades por vendedor">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activitiesByOwner} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D9E2EC" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
              <YAxis dataKey="owner" type="category" tick={{ fontSize: 11 }} width={120} stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#D9E2EC" }} />
              <Bar dataKey="count" name="Actividades" fill="#003B75" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ActivitiesTypeChart data={metrics.activitiesByType} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TopOpportunitiesCard opportunities={metrics.topOpportunities} />
        <TopClientsCard topClients={metrics.topClients} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-akzo-blue" />
              Clientes más activos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mostActiveClients.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
            )}
            {mostActiveClients.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{name}</span>
                <span className="font-medium text-akzo-blue-dark">{count} actividades</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-600" />
            Proyectos críticos (cierre &lt; 30 días, valor ≥ USD 100k)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay proyectos críticos en este momento.</p>
          ) : (
            <div className="space-y-3">
              {criticalProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-2 rounded-lg border border-rose-100 bg-rose-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.clientName} · Responsable: {ownerNameById.get(project.ownerId) ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={project.status} />
                    <span className="text-sm font-semibold text-akzo-blue-dark">
                      {formatCurrency(project.estimatedValue, project.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(project.estimatedCloseDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
