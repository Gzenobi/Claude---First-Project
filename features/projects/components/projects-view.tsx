"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/features/export/export-button";
import { INDUSTRY_SEGMENTS, PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectWithClient } from "@/types";

import { PipelineKanban } from "./pipeline-kanban";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectsTable } from "./projects-table";

interface ProjectsViewProps {
  projects: ProjectWithClient[];
  clientOptions: { id: string; name: string }[];
}

export function ProjectsView({ projects, clientOptions }: ProjectsViewProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (statusFilter === "all" || p.status === statusFilter) &&
          (segmentFilter === "all" || p.industrySegment === segmentFilter),
      ),
    [projects, statusFilter, segmentFilter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        description="Pipeline de oportunidades técnico-comerciales."
        actions={
          <>
            <ExportButton entity="projects" data={filtered} />
            <ProjectFormDialog clientOptions={clientOptions} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Pipeline (Kanban)</TabsTrigger>
          <TabsTrigger value="table">Vista tabla</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban">
          <PipelineKanban projects={filtered} clientOptions={clientOptions} />
        </TabsContent>
        <TabsContent value="table">
          <ProjectsTable projects={filtered} clientOptions={clientOptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
