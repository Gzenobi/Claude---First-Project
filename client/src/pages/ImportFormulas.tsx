import { useRef, useState } from "react";
import { api } from "../api";

interface MappingState {
  productCode: string;
  productName: string;
  colorCode: string;
  colorName: string;
  baseCode: string;
  baseQuantity: string;
  baseUnit: string;
  tintCode: string;
  tintQuantity: string;
  tintUnit: string;
}

const emptyMapping: MappingState = {
  productCode: "",
  productName: "",
  colorCode: "",
  colorName: "",
  baseCode: "",
  baseQuantity: "",
  baseUnit: "",
  tintCode: "",
  tintQuantity: "",
  tintUnit: "",
};

// Tamaño de lote para importaciones masivas: cada archivo se envía al backend
// en tandas de este tamaño, para poder mostrar una barra de progreso real y
// no depender de una única request gigante (importante con cientos/miles de
// archivos, como el caso de ~1000 fórmulas mencionado por el usuario).
const CHUNK_SIZE = 20;

type FilePreviewRow = Awaited<ReturnType<typeof api.imports.previewFormulas>>["files"][number];

interface AggregatedPreview {
  batchIds: string[];
  files: FilePreviewRow[];
  totals: { files: number; formulas: number; errors: number; warnings: number };
}

interface AggregatedResult {
  imported: number;
  skippedDuplicates: number;
  rejected: number;
  errorCount: number;
  warningCount: number;
}

function toMapping(m: MappingState) {
  return {
    headerRow: 0,
    columns: {
      productCode: m.productCode,
      productName: m.productName || undefined,
      colorCode: m.colorCode,
      colorName: m.colorName || undefined,
      baseCode: m.baseCode,
      baseQuantity: m.baseQuantity,
      baseUnit: m.baseUnit,
      tintCode: m.tintCode,
      tintQuantity: m.tintQuantity,
      tintUnit: m.tintUnit || undefined,
    },
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportFormulas() {
  const [files, setFiles] = useState<File[]>([]);
  const [duplicateFilesSkipped, setDuplicateFilesSkipped] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<AggregatedPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ phase: "analyze" | "commit"; processed: number; total: number } | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [globalMapping, setGlobalMapping] = useState<MappingState | null>(null);
  const [result, setResult] = useState<AggregatedResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}::${f.size}`));
      const toAdd: File[] = [];
      let dup = 0;
      for (const f of incoming) {
        const key = `${f.name}::${f.size}`;
        if (existingKeys.has(key)) {
          dup++;
          continue;
        }
        existingKeys.add(key);
        toAdd.push(f);
      }
      if (dup > 0) setDuplicateFilesSkipped((d) => d + dup);
      return [...prev, ...toAdd];
    });
    setPreview(null);
    setResult(null);
  }

  async function analyze() {
    if (files.length === 0) return;
    setBusy(true);
    setProgress({ phase: "analyze", processed: 0, total: files.length });
    try {
      const chunks = chunk(files, CHUNK_SIZE);
      const aggregated: AggregatedPreview = { batchIds: [], files: [], totals: { files: 0, formulas: 0, errors: 0, warnings: 0 } };
      let processed = 0;
      for (const c of chunks) {
        const p = await api.imports.previewFormulas(c, {}, globalMapping ? toMapping(globalMapping) : undefined);
        aggregated.batchIds.push(p.batchId);
        aggregated.files.push(...p.files);
        aggregated.totals.files += p.totals.files;
        aggregated.totals.formulas += p.totals.formulas;
        aggregated.totals.errors += p.totals.errors;
        aggregated.totals.warnings += p.totals.warnings;
        processed += c.length;
        setProgress({ phase: "analyze", processed, total: files.length });
      }
      setPreview(aggregated);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    setProgress({ phase: "commit", processed: 0, total: preview.batchIds.length });
    try {
      const aggregated: AggregatedResult = { imported: 0, skippedDuplicates: 0, rejected: 0, errorCount: 0, warningCount: 0 };
      let processed = 0;
      for (const batchId of preview.batchIds) {
        const r = await api.imports.commitFormulas(batchId);
        aggregated.imported += r.imported;
        aggregated.skippedDuplicates += r.skippedDuplicates;
        aggregated.rejected += r.rejected;
        aggregated.errorCount += r.errorCount;
        aggregated.warningCount += r.warningCount;
        processed++;
        setProgress({ phase: "commit", processed, total: preview.batchIds.length });
      }
      setResult(aggregated);
      setPreview(null);
      setFiles([]);
      setDuplicateFilesSkipped(0);
    } finally {
      setBusy(false);
    }
  }

  function downloadErrorReport() {
    if (!preview) return;
    const rows: string[][] = [["Archivo", "Severidad", "Referencia", "Mensaje"]];
    for (const f of preview.files) {
      for (const e of f.errors) rows.push([f.fileName, "ERROR", e.rowRef ?? "", e.message]);
      for (const w of f.warnings) rows.push([f.fileName, "WARNING", w.rowRef ?? "", w.message]);
    }
    downloadCsv(`reporte-importacion-formulas-${Date.now()}.csv`, rows);
  }

  const needsMapping = preview?.files.filter((f) => f.classification === "NEEDS_MAPPING") ?? [];
  const visibleFiles = preview?.files.slice(0, 200) ?? [];

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Importar Fórmulas</h1>
        <p className="text-sm text-gray-dark mt-1">
          Arrastre decenas, cientos o miles de archivos .xlsx/.xls a la vez. El formato "Chromascan" se detecta automáticamente; otros
          formatos requieren mapear columnas <strong>una sola vez</strong> — el mismo mapeo se reaplica a todo el lote.
        </p>
      </div>

      <div
        className={`card p-10 text-center border-2 border-dashed transition-colors ${dragOver ? "border-sky bg-sky/5" : "border-(--border-subtle)"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-3xl mb-2">📥</div>
        <p className="text-sm text-gray-dark">Arrastre archivos aquí (soporta selección masiva de carpetas), o</p>
        <button className="btn-secondary mt-2" onClick={() => inputRef.current?.click()}>
          Seleccionar archivos
        </button>
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && (
          <p className="text-sm mt-3">
            {files.length} archivo(s) seleccionado(s)
            {duplicateFilesSkipped > 0 && <span className="text-gray-dark"> · {duplicateFilesSkipped} duplicado(s) omitido(s)</span>}
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="card p-4">
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {files.slice(0, 100).map((f, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate">{f.name}</span>
                <button className="text-fuchsia text-xs shrink-0 ml-2" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </li>
            ))}
            {files.length > 100 && <li className="text-gray-dark">... y {files.length - 100} archivo(s) más</li>}
          </ul>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-dark">Mapeo de columnas para archivos no reconocidos automáticamente:</span>
            {globalMapping ? (
              <span className="badge badge-ok">Configurado</span>
            ) : (
              <span className="badge" style={{ background: "var(--bg-app)", color: "var(--text-secondary)" }}>
                Sin configurar (se pedirá si hace falta)
              </span>
            )}
            <button className="text-sky text-xs" onClick={() => setMappingOpen(true)}>
              {globalMapping ? "Editar mapeo" : "Configurar mapeo"}
            </button>
          </div>

          <button className="btn-primary mt-3" disabled={busy} onClick={analyze}>
            {busy && progress?.phase === "analyze" ? `Analizando... (${progress.processed}/${progress.total})` : "Analizar archivos"}
          </button>

          {busy && progress?.phase === "analyze" && (
            <div className="mt-3 h-2 rounded-full bg-(--bg-app) overflow-hidden">
              <div className="h-full bg-sky transition-all" style={{ width: `${(progress.processed / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {needsMapping.length > 0 && (
        <div className="card p-4 border-l-4 border-l-violet">
          <h3 className="font-semibold mb-2">
            {needsMapping.length} archivo(s) no reconocidos automáticamente — configure el mapeo de columnas y vuelva a analizar
          </h3>
          <button className="btn-secondary" onClick={() => setMappingOpen(true)}>
            Configurar mapeo de columnas
          </button>
        </div>
      )}

      {mappingOpen && (
        <MappingWizard
          headers={needsMapping[0]?.suggestedHeaders?.headers ?? []}
          value={globalMapping ?? emptyMapping}
          onCancel={() => setMappingOpen(false)}
          onSave={(m) => {
            setGlobalMapping(m);
            setMappingOpen(false);
          }}
        />
      )}

      {preview && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy">
              Vista previa: {preview.totals.formulas} fórmula(s) en {preview.totals.files} archivo(s) — {preview.totals.errors} error(es),{" "}
              {preview.totals.warnings} advertencia(s)
            </h3>
            <button className="btn-secondary text-xs" onClick={downloadErrorReport}>
              Descargar reporte de errores (CSV)
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
                <th className="py-1.5 pr-4">Archivo</th>
                <th className="py-1.5 pr-4">Estado</th>
                <th className="py-1.5 pr-4">Colores</th>
                <th className="py-1.5 pr-4">Errores</th>
                <th className="py-1.5">Advertencias</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((f, i) => (
                <tr key={`${f.fileName}-${i}`} className="border-b border-(--border-subtle) last:border-0 align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{f.fileName}</td>
                  <td className="py-1.5 pr-4">
                    {f.classification === "OK" && <span className="badge badge-ok">Listo</span>}
                    {f.classification === "NEEDS_MAPPING" && <span className="badge badge-warning">Requiere mapeo</span>}
                    {f.classification === "FAILED" && <span className="badge badge-error">Falló</span>}
                  </td>
                  <td className="py-1.5 pr-4">{f.colorCodes.join(", ") || "—"}</td>
                  <td className="py-1.5 pr-4 text-fuchsia text-xs">{f.errors.map((e) => e.message).join(" ")}</td>
                  <td className="py-1.5 text-xs text-violet">{f.warnings.map((w) => w.message).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.files.length > visibleFiles.length && (
            <p className="text-xs text-gray-dark mt-2">
              Mostrando los primeros {visibleFiles.length} de {preview.files.length} archivos. Descargue el reporte CSV para ver el detalle
              completo.
            </p>
          )}
          <button className="btn-primary mt-4" disabled={busy || preview.totals.formulas === 0} onClick={commit}>
            {busy && progress?.phase === "commit" ? `Importando... (${progress.processed}/${progress.total})` : "Confirmar importación"}
          </button>
          {busy && progress?.phase === "commit" && (
            <div className="mt-3 h-2 rounded-full bg-(--bg-app) overflow-hidden">
              <div className="h-full bg-navy transition-all" style={{ width: `${(progress.processed / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="card p-5 border-l-4 border-l-navy">
          <h3 className="font-semibold text-navy mb-2">Resumen de importación</h3>
          <ul className="text-sm space-y-1">
            <li>Importadas: {result.imported}</li>
            <li>Omitidas (duplicadas): {result.skippedDuplicates}</li>
            <li>Rechazadas: {result.rejected}</li>
            <li>Advertencias: {result.warningCount}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MappingWizard({
  headers,
  value,
  onCancel,
  onSave,
}: {
  headers: string[];
  value: MappingState;
  onCancel: () => void;
  onSave: (m: MappingState) => void;
}) {
  const [m, setM] = useState<MappingState>(value);
  const fields: { key: keyof MappingState; label: string; required?: boolean }[] = [
    { key: "productCode", label: "Código de producto", required: true },
    { key: "productName", label: "Nombre de producto" },
    { key: "colorCode", label: "Código de color", required: true },
    { key: "colorName", label: "Nombre de color" },
    { key: "baseCode", label: "Código de base", required: true },
    { key: "baseQuantity", label: "Cantidad de base", required: true },
    { key: "baseUnit", label: "Unidad de base", required: true },
    { key: "tintCode", label: "Código de concentrado", required: true },
    { key: "tintQuantity", label: "Cantidad de concentrado", required: true },
    { key: "tintUnit", label: "Unidad de concentrado" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card bg-white p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <h3 className="font-semibold text-navy mb-1">Mapear columnas (se aplica a todo el lote)</h3>
        <p className="text-xs text-gray-dark mb-4">
          Asocie cada campo del sistema con la columna correspondiente del Excel. Este mapeo se reutiliza para todos los archivos del lote
          que no se detecten automáticamente como "Chromascan" — no hace falta repetirlo por archivo.
        </p>
        {headers.length === 0 && (
          <p className="text-xs text-violet mb-3">
            Todavía no hay columnas detectadas: analice primero los archivos para que el sistema sugiera el header, o escriba los nombres
            de columna manualmente abajo.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-gray-dark">
                {f.label} {f.required && <span className="text-fuchsia">*</span>}
              </label>
              {headers.length > 0 ? (
                <select className="input w-full" value={m[f.key]} onChange={(e) => setM({ ...m, [f.key]: e.target.value })}>
                  <option value="">— No mapear —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={h}>
                      {h || `(columna ${i + 1})`}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input w-full" value={m[f.key]} onChange={(e) => setM({ ...m, [f.key]: e.target.value })} placeholder="Nombre de columna" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => onSave(m)}>
            Guardar mapeo
          </button>
        </div>
      </div>
    </div>
  );
}
