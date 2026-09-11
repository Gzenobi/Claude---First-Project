"use client";

import {
  Building2,
  Calendar,
  Kanban,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ACTIVITY_TYPE_LABEL } from "@/lib/constants";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import type { ActivityWithRelations } from "@/types";

import { deleteActivityAction } from "../actions";
import { ActivityFormDialog } from "./activity-form-dialog";

interface ActivitiesTimelineProps {
  activities: ActivityWithRelations[];
  clientOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
}

export function ActivitiesTimeline({
  activities,
  clientOptions,
  projectOptions,
}: ActivitiesTimelineProps) {
  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar esta actividad?")) return;
    const result = await deleteActivityAction(id);
    if (!result.success) toast.error(result.error);
    else toast.success("Actividad eliminada");
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sin actividades"
        description="No hay actividades registradas para este filtro."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const overdue = isOverdue(activity.nextActionDate);
        return (
          <Card key={activity.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{ACTIVITY_TYPE_LABEL[activity.activityType]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(activity.activityDate)}</span>
                  <span className="text-xs text-muted-foreground">· {activity.ownerName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  {activity.clientName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {activity.clientName}
                    </span>
                  )}
                  {activity.projectName && (
                    <span className="flex items-center gap-1">
                      <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
                      {activity.projectName}
                    </span>
                  )}
                </div>
                {activity.result && <p className="text-sm text-slate-600">{activity.result}</p>}
                {activity.comments && (
                  <p className="text-xs text-muted-foreground">{activity.comments}</p>
                )}
                {activity.nextAction && (
                  <div
                    className={cn(
                      "mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium w-fit",
                      overdue
                        ? "bg-rose-50 text-rose-700"
                        : "bg-akzo-blue/10 text-akzo-blue-dark",
                    )}
                  >
                    {overdue && <TriangleAlert className="h-3.5 w-3.5" />}
                    Próxima acción: {activity.nextAction} ({formatDate(activity.nextActionDate)})
                    {overdue && " · VENCIDA"}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <ActivityFormDialog
                  activity={activity}
                  clientOptions={clientOptions}
                  projectOptions={projectOptions}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(activity.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
