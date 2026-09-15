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

export function ImportFormulas() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.imports.previewFormulas>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [mappingFile, setMappingFile] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingState>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.imports.commitFormulas>> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    setFiles((prev) => [...prev, ...valid]);
    setPreview(null);
    setResult(null);
  }

  async function analyze() {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const templates: Record<string, unknown> = {};
      for (const [fileName, m] of Object.entries(mappings)) {
        templates[fileName] = {
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
      const p = await api.imports.previewFormulas(files, templates);
      setPreview(p);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    try {
      const summary = await api.imports.commitFormulas(preview.batchId);
      setResult(summary);
      setPreview(null);
      setFiles([]);
    } finally {
      setBusy(false);
    }
  }

  const needsMapping = preview?.files.filter((f) => f.classification === "NEEDS_MAPPING") ?? [];

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-navy">Importar Fórmulas</h1>
        <p className="text-sm text-gray-dark mt-1">
          Arrastre decenas o cientos de archivos .xlsx/.xls. El formato "Chromascan" se detecta automáticamente; otros formatos requieren
          mapear columnas una sola vez.
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
        <p className="text-sm text-gray-dark">Arrastre archivos aquí, o</p>
        <button className="btn-secondary mt-2" onClick={() => inputRef.current?.click()}>
          Seleccionar archivos
        </button>
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && <p className="text-sm mt-3">{files.length} archivo(s) seleccionado(s)</p>}
      </div>

      {files.length > 0 && (
        <div className="card p-4">
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <li key={i} className="flex justify-between">
                <span>{f.name}</span>
                <button className="text-fuchsia text-xs" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button className="btn-primary mt-3" disabled={busy} onClick={analyze}>
            {busy ? "Analizando..." : "Analizar archivos"}
          </button>
        </div>
      )}

      {needsMapping.length > 0 && (
        <div className="card p-4 border-l-4 border-l-[#c9950b]">
          <h3 className="font-semibold mb-2">Archivos que requieren mapeo de columnas</h3>
          {needsMapping.map((f) => (
            <div key={f.fileName} className="flex justify-between items-center py-1 text-sm">
              <span>{f.fileName}</span>
              <button className="btn-secondary" onClick={() => setMappingFile(f.fileName)}>
                Mapear columnas
              </button>
            </div>
          ))}
        </div>
      )}

      {mappingFile && (
        <MappingWizard
          fileName={mappingFile}
          headers={preview?.files.find((f) => f.fileName === mappingFile)?.suggestedHeaders?.headers ?? []}
          value={mappings[mappingFile] ?? emptyMapping}
          onCancel={() => setMappingFile(null)}
          onSave={(m) => {
            setMappings((prev) => ({ ...prev, [mappingFile]: m }));
            setMappingFile(null);
          }}
        />
      )}

      {preview && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy mb-3">
            Vista previa: {preview.totals.formulas} fórmula(s) en {preview.totals.files} archivo(s) — {preview.totals.errors} error(es),{" "}
            {preview.totals.warnings} advertencia(s)
          </h3>
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
              {preview.files.map((f) => (
                <tr key={f.fileName} className="border-b border-(--border-subtle) last:border-0 align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{f.fileName}</td>
                  <td className="py-1.5 pr-4">
                    {f.classification === "OK" && <span className="badge badge-ok">Listo</span>}
                    {f.classification === "NEEDS_MAPPING" && <span className="badge badge-warning">Requiere mapeo</span>}
                    {f.classification === "FAILED" && <span className="badge badge-error">Falló</span>}
                  </td>
                  <td className="py-1.5 pr-4">{f.colorCodes.join(", ") || "—"}</td>
                  <td className="py-1.5 pr-4 text-fuchsia text-xs">{f.errors.map((e) => e.message).join(" ")}</td>
                  <td className="py-1.5 text-xs text-[#92650a]">{f.warnings.map((w) => w.message).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn-primary mt-4" disabled={busy || preview.totals.formulas === 0} onClick={commit}>
            {busy ? "Importando..." : "Confirmar importación"}
          </button>
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
  fileName,
  headers,
  value,
  onCancel,
  onSave,
}: {
  fileName: string;
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
        <h3 className="font-semibold text-navy mb-1">Mapear columnas — {fileName}</h3>
        <p className="text-xs text-gray-dark mb-4">Asocie cada campo del sistema con la columna correspondiente del Excel.</p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-gray-dark">
                {f.label} {f.required && <span className="text-fuchsia">*</span>}
              </label>
              <select className="input w-full" value={m[f.key]} onChange={(e) => setM({ ...m, [f.key]: e.target.value })}>
                <option value="">— No mapear —</option>
                {headers.map((h, i) => (
                  <option key={i} value={h}>
                    {h || `(columna ${i + 1})`}
                  </option>
                ))}
              </select>
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
