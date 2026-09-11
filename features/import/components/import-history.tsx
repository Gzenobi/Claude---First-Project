import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";
import type { ImportRecord } from "@/types";

export function ImportHistory({ imports }: { imports: ImportRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de importaciones</CardTitle>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <EmptyState icon={History} title="Sin importaciones todavía" />
        ) : (
          <div className="space-y-2">
            {imports.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-800">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.entity} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{item.totalRows} filas</span>
                  <span className="text-emerald-600">{item.insertedRows} nuevos</span>
                  <span className="text-akzo-blue">{item.updatedRows} actualizados</span>
                  <span className="text-rose-600">{item.skippedRows} omitidos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
