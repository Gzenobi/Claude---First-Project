import type { Metadata } from "next";

import { getClientOptions } from "@/features/clients/actions";
import { ProjectsView } from "@/features/projects/components/projects-view";
import { getProjects } from "@/features/projects/actions";

export const metadata: Metadata = { title: "Proyectos | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, clientOptions] = await Promise.all([getProjects(), getClientOptions()]);

  return <ProjectsView projects={projects} clientOptions={clientOptions} />;
}
