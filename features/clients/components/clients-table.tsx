"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { INDUSTRY_SEGMENTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Client } from "@/types";

import { deleteClientAction } from "../actions";
import { ClientFormDialog } from "./client-form-dialog";
import { ExportButton } from "@/features/export/export-button";

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [segmentFilter, setSegmentFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      segmentFilter === "all"
        ? clients
        : clients.filter((c) => c.industrySegment === segmentFilter),
    [clients, segmentFilter],
  );

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el cliente "${name}"? Esta acción no se puede deshacer.`)) return;
    const result = await deleteClientAction(id);
    if (!result.success) toast.error(result.error);
    else toast.success("Cliente eliminado");
  }

  const columns = useMemo<ColumnDef<Client>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-800">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
        ),
      },
      { accessorKey: "industrySegment", header: "Segmento" },
      {
        accessorKey: "contactName",
        header: "Contacto",
        cell: ({ row }) => (
          <div>
            <p className="text-slate-700">{row.original.contactName || "—"}</p>
            <p className="text-xs text-muted-foreground">{row.original.contactEmail || ""}</p>
          </div>
        ),
      },
      { accessorKey: "currentCompetitor", header: "Competidor" },
      {
        accessorKey: "annualPotentialUsd",
        header: "Potencial anual",
        cell: ({ row }) => (
          <span className="font-medium text-akzo-blue-dark">
            {formatCurrency(row.original.annualPotentialUsd)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <ClientFormDialog client={row.original} />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDelete(row.original.id, row.original.name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gestión de cuentas y contactos de la cartera comercial."
        actions={
          <>
            <ExportButton entity="clients" data={clients} />
            <ClientFormDialog />
          </>
        }
      />

      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los segmentos</SelectItem>
            {INDUSTRY_SEGMENTS.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Buscar cliente, contacto..."
        emptyTitle="Todavía no hay clientes"
        emptyDescription="Creá tu primer cliente para comenzar a registrar oportunidades."
      />
    </div>
  );
}
