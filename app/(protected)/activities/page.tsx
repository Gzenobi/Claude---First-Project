import type { Metadata } from "next";

import { ActivitiesView } from "@/features/activities/components/activities-view";
import { getActivities } from "@/features/activities/actions";
import { getClientOptions } from "@/features/clients/actions";
import { getProjectOptions } from "@/features/projects/actions";

export const metadata: Metadata = { title: "Actividades | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const [activities, clientOptions, projectOptions] = await Promise.all([
    getActivities(),
    getClientOptions(),
    getProjectOptions(),
  ]);

  return (
    <ActivitiesView
      activities={activities}
      clientOptions={clientOptions}
      projectOptions={projectOptions}
    />
  );
}
