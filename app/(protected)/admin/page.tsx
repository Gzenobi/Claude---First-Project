import type { Metadata } from "next";

import { getActivities } from "@/features/activities/actions";
import { getSalesProfiles } from "@/features/admin/actions";
import { getClients } from "@/features/clients/actions";
import { ExecutiveDashboard } from "@/features/dashboard/components/executive-dashboard";
import { getProjects } from "@/features/projects/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard Ejecutivo | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const [clients, projects, activities, salesProfiles] = await Promise.all([
    getClients(),
    getProjects(),
    getActivities(),
    getSalesProfiles(),
  ]);

  return (
    <ExecutiveDashboard
      clients={clients}
      projects={projects}
      activities={activities}
      salesProfiles={salesProfiles}
    />
  );
}
