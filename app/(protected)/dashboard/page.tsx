import type { Metadata } from "next";

import { getActivities } from "@/features/activities/actions";
import { getClients } from "@/features/clients/actions";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getProjects } from "@/features/projects/actions";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [clients, projects, activities] = await Promise.all([
    getClients(),
    getProjects(),
    getActivities(),
  ]);

  return (
    <DashboardView
      clients={clients}
      projects={projects}
      activities={activities}
      userName={profile.fullName}
    />
  );
}
