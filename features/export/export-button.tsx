"use client";

import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { recordExportAction } from "./actions";
import { downloadAsCsv, downloadAsJson, downloadAsXlsx } from "./service";

interface ExportButtonProps {
  entity: string;
  data: Record<string, unknown>[];
}

export function ExportButton({ entity, data }: ExportButtonProps) {
  async function handleExport(format: "xlsx" | "csv" | "json") {
    if (data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const fileName = `${entity}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "xlsx") downloadAsXlsx(data, fileName);
    if (format === "csv") downloadAsCsv(data, fileName);
    if (format === "json") downloadAsJson(data, fileName);

    await recordExportAction(entity, format, data.length);
    toast.success(`Exportado ${data.length} registros a ${format.toUpperCase()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
