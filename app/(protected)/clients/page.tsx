import type { Metadata } from "next";

import { ClientsTable } from "@/features/clients/components/clients-table";
import { getClients } from "@/features/clients/actions";

export const metadata: Metadata = { title: "Clientes | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientsTable clients={clients} />;
}
