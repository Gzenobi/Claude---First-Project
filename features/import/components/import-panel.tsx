"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { importClientsAction, importProjectsAction, type ImportSummary } from "../actions";
import { parseImportFile } from "../parse";

type Entity = "clients" | "projects";

export function ImportPanel() {
  const [entity, setEntity] = useState<Entity>("clients");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSummary(null);
    setFileName(file.name);

    try {
      const rows = await parseImportFile(file);
      const action = entity === "clients" ? importClientsAction : importProjectsAction;
      const result = await action(file.name, rows);

      if (!result.success) {
        toast.error(result.error);
      } else {
        setSummary(result.data);
        toast.success(
          `Importación completa: ${result.data.insertedRows} nuevos, ${result.data.updatedRows} actualizados`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar y consolidar datos</CardTitle>
        <CardDescription>
          Subí un archivo exportado por un usuario comercial (.xlsx, .csv o .json). El sistema
          detecta duplicados por ID o por nombre y actualiza los registros existentes, e inserta
          los nuevos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Entidad a importar</label>
            <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="projects">Proyectos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Seleccionar archivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            className="hidden"
            onChange={handleFileChange}
          />
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-akzo-gray-light p-4 sm:grid-cols-4">
            <SummaryStat label="Filas procesadas" value={summary.totalRows} />
            <SummaryStat label="Nuevos" value={summary.insertedRows} tone="positive" />
            <SummaryStat label="Actualizados" value={summary.updatedRows} tone="neutral" />
            <SummaryStat label="Omitidos" value={summary.skippedRows} tone={summary.skippedRows ? "negative" : "neutral"} />

            {summary.errors.length > 0 && (
              <div className="col-span-2 sm:col-span-4">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-rose-700">
                  <XCircle className="h-3.5 w-3.5" /> Detalle de filas omitidas
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {summary.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.errors.length === 0 && (
              <div className="col-span-2 flex items-center gap-1 text-xs font-medium text-emerald-700 sm:col-span-4">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sin errores en la importación.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "positive"
            ? "text-lg font-bold text-emerald-600"
            : tone === "negative"
              ? "text-lg font-bold text-rose-600"
              : "text-lg font-bold text-akzo-blue-dark"
        }
      >
        {value}
      </p>
    </div>
  );
}
