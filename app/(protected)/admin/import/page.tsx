import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { getImportHistory } from "@/features/import/actions";
import { ImportHistory } from "@/features/import/components/import-history";
import { ImportPanel } from "@/features/import/components/import-panel";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Importar datos | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();
  const imports = await getImportHistory();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar y consolidar"
        description="Consolidá los datos exportados por el equipo comercial en el tablero central."
      />
      <ImportPanel />
      <ImportHistory imports={imports} />
    </div>
  );
}
