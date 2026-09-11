"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProjectWithClient } from "@/types";

import { deleteProjectAction } from "../actions";
import { ProjectFormDialog } from "./project-form-dialog";

interface ProjectsTableProps {
  projects: ProjectWithClient[];
  clientOptions: { id: string; name: string }[];
}

export function ProjectsTable({ projects, clientOptions }: ProjectsTableProps) {
  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el proyecto "${name}"?`)) return;
    const result = await deleteProjectAction(id);
    if (!result.success) toast.error(result.error);
    else toast.success("Proyecto eliminado");
  }

  const columns = useMemo<ColumnDef<ProjectWithClient>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Proyecto",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-800">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.clientName}</p>
          </div>
        ),
      },
      { accessorKey: "coatingType", header: "Recubrimiento" },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "estimatedValue",
        header: "Valor estimado",
        cell: ({ row }) => formatCurrency(row.original.estimatedValue, row.original.currency),
      },
      {
        accessorKey: "winProbability",
        header: "Prob.",
        cell: ({ row }) => `${row.original.winProbability}%`,
      },
      {
        accessorKey: "estimatedCloseDate",
        header: "Cierre estimado",
        cell: ({ row }) => formatDate(row.original.estimatedCloseDate),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <ProjectFormDialog
              project={row.original}
              clientOptions={clientOptions}
              trigger={
                <Button variant="ghost" size="sm">
                  Editar
                </Button>
              }
            />
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
    [clientOptions],
  );

  return (
    <DataTable
      columns={columns}
      data={projects}
      searchPlaceholder="Buscar proyecto, cliente..."
      emptyTitle="Todavía no hay proyectos"
      emptyDescription="Creá tu primer proyecto para comenzar a construir el pipeline."
    />
  );
}
