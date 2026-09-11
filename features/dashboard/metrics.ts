import { OPEN_PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { isOverdue } from "@/lib/utils";
import type { ActivityWithRelations, Client, ProjectStatus, ProjectWithClient } from "@/types";

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  pipelineTotal: number;
  forecastTotal: number;
  wonValue: number;
  overdueActivitiesCount: number;
  conversionRate: number;
  pipelineByStatus: { status: ProjectStatus; label: string; count: number; value: number }[];
  forecastByMonth: { month: string; value: number }[];
  projectsBySegment: { segment: string; count: number }[];
  activitiesByType: { type: string; count: number }[];
  topClients: { name: string; potential: number }[];
  topOpportunities: ProjectWithClient[];
  recentActivities: ActivityWithRelations[];
  upcomingActions: ActivityWithRelations[];
}

export function computeDashboardMetrics(
  clients: Client[],
  projects: ProjectWithClient[],
  activities: ActivityWithRelations[],
): DashboardMetrics {
  const activeProjects = projects.filter((p) =>
    OPEN_PROJECT_STATUSES.includes(p.status),
  );
  const wonProjects = projects.filter((p) => p.status === "ganado");
  const lostProjects = projects.filter((p) => p.status === "perdido");
  const closedCount = wonProjects.length + lostProjects.length;

  const pipelineByStatus = (Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((status) => {
    const inStatus = projects.filter((p) => p.status === status);
    return {
      status,
      label: PROJECT_STATUS_LABEL[status],
      count: inStatus.length,
      value: inStatus.reduce((sum, p) => sum + p.estimatedValue, 0),
    };
  });

  const monthMap = new Map<string, number>();
  activeProjects.forEach((p) => {
    if (!p.estimatedCloseDate) return;
    const month = new Date(p.estimatedCloseDate).toLocaleDateString("es-AR", {
      month: "short",
      year: "2-digit",
    });
    monthMap.set(month, (monthMap.get(month) ?? 0) + p.estimatedValue * (p.winProbability / 100));
  });
  const forecastByMonth = Array.from(monthMap.entries()).map(([month, value]) => ({
    month,
    value: Math.round(value),
  }));

  const segmentMap = new Map<string, number>();
  projects.forEach((p) => {
    segmentMap.set(p.industrySegment, (segmentMap.get(p.industrySegment) ?? 0) + 1);
  });
  const projectsBySegment = Array.from(segmentMap.entries()).map(([segment, count]) => ({
    segment,
    count,
  }));

  const typeMap = new Map<string, number>();
  activities.forEach((a) => {
    typeMap.set(a.activityType, (typeMap.get(a.activityType) ?? 0) + 1);
  });
  const activitiesByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  const topClients = [...clients]
    .sort((a, b) => b.annualPotentialUsd - a.annualPotentialUsd)
    .slice(0, 5)
    .map((c) => ({ name: c.name, potential: c.annualPotentialUsd }));

  const topOpportunities = [...activeProjects]
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 5);

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
    .slice(0, 6);

  const upcomingActions = activities
    .filter((a) => a.nextActionDate && !isOverdue(a.nextActionDate))
    .sort(
      (a, b) =>
        new Date(a.nextActionDate ?? 0).getTime() - new Date(b.nextActionDate ?? 0).getTime(),
    )
    .slice(0, 6);

  return {
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    pipelineTotal: activeProjects.reduce((sum, p) => sum + p.estimatedValue, 0),
    forecastTotal: activeProjects.reduce(
      (sum, p) => sum + p.estimatedValue * (p.winProbability / 100),
      0,
    ),
    wonValue: wonProjects.reduce((sum, p) => sum + p.estimatedValue, 0),
    overdueActivitiesCount: activities.filter((a) => isOverdue(a.nextActionDate)).length,
    conversionRate: closedCount > 0 ? Math.round((wonProjects.length / closedCount) * 100) : 0,
    pipelineByStatus,
    forecastByMonth,
    projectsBySegment,
    activitiesByType,
    topClients,
    topOpportunities,
    recentActivities,
    upcomingActions,
  };
}
