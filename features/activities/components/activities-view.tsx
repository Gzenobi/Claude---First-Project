"use client";

import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/features/export/export-button";
import { isOverdue } from "@/lib/utils";
import type { ActivityWithRelations } from "@/types";

import { ActivityFormDialog } from "./activity-form-dialog";
import { ActivitiesTimeline } from "./activities-timeline";

interface ActivitiesViewProps {
  activities: ActivityWithRelations[];
  clientOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
}

export function ActivitiesView({ activities, clientOptions, projectOptions }: ActivitiesViewProps) {
  const overdue = useMemo(
    () => activities.filter((a) => isOverdue(a.nextActionDate)),
    [activities],
  );
  const upcoming = useMemo(
    () => activities.filter((a) => a.nextActionDate && !isOverdue(a.nextActionDate)),
    [activities],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades comerciales"
        description="Timeline de visitas, llamadas, reuniones e inspecciones técnicas."
        actions={
          <>
            <ExportButton entity="activities" data={activities} />
            <ActivityFormDialog clientOptions={clientOptions} projectOptions={projectOptions} />
          </>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas ({activities.length})</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas ({overdue.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <ActivitiesTimeline
            activities={activities}
            clientOptions={clientOptions}
            projectOptions={projectOptions}
          />
        </TabsContent>
        <TabsContent value="overdue">
          <ActivitiesTimeline
            activities={overdue}
            clientOptions={clientOptions}
            projectOptions={projectOptions}
          />
        </TabsContent>
        <TabsContent value="upcoming">
          <ActivitiesTimeline
            activities={upcoming}
            clientOptions={clientOptions}
            projectOptions={projectOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
