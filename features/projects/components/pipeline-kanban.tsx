"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PROJECT_STATUSES } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ProjectStatus, ProjectWithClient } from "@/types";

import { updateProjectStatusAction } from "../actions";
import { ProjectFormDialog } from "./project-form-dialog";

interface PipelineKanbanProps {
  projects: ProjectWithClient[];
  clientOptions: { id: string; name: string }[];
}

export function PipelineKanban({ projects, clientOptions }: PipelineKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columns = useMemo(() => {
    return PROJECT_STATUSES.map((status) => ({
      ...status,
      projects: projects.filter((p) => p.status === status.value),
    }));
  }, [projects]);

  async function handleDrop(status: ProjectStatus) {
    if (!draggingId) return;
    const project = projects.find((p) => p.id === draggingId);
    setDraggingId(null);
    if (!project || project.status === status) return;

    const result = await updateProjectStatusAction(draggingId, status);
    if (!result.success) toast.error(result.error);
    else toast.success(`Proyecto movido a "${status}"`);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const total = column.projects.reduce((sum, p) => sum + p.estimatedValue, 0);
        return (
          <div
            key={column.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(column.value)}
            className="status-column flex w-72 shrink-0 flex-col rounded-xl bg-akzo-gray-medium/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-akzo-blue-dark">{column.label}</p>
                <p className="text-xs text-muted-foreground">
                  {column.projects.length} · {formatCurrency(total)}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {column.projects.map((project) => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={() => setDraggingId(project.id)}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <ProjectFormDialog
                    project={project}
                    clientOptions={clientOptions}
                    trigger={
                      <Card
                        className={cn(
                          "cursor-grab space-y-2 p-3 transition-shadow hover:shadow-md active:cursor-grabbing",
                          draggingId === project.id && "opacity-50",
                        )}
                      >
                        <p className="text-sm font-medium text-slate-800">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.clientName}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-akzo-blue">
                            {formatCurrency(project.estimatedValue, project.currency)}
                          </span>
                          <Badge variant="outline">{project.winProbability}%</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Cierre: {formatDate(project.estimatedCloseDate)}
                        </p>
                      </Card>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
