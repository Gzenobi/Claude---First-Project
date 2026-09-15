import { useRef, useState } from "react";
import { api } from "../api";

interface MappingState {
  code: string;
  description: string;
  type: string;
  cost: string;
  currency: string;
  costBasis: string;
  packageSize: string;
  packageUnit: string;
  effectiveDate: string;
}
const emptyMapping: MappingState = {
  code: "",
  description: "",
  type: "",
  cost: "",
  currency: "",
  costBasis: "",
  packageSize: "",
  packageUnit: "",
  effectiveDate: "",
};

export function ImportCosts() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.imports.previewCosts>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [mappingFile, setMappingFile] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, MappingState>>({});
  const [versionLabel, setVersionLabel] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.imports.commitCosts>> | null>(null);
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
            code: m.code,
            description: m.description,
            type: m.type,
            cost: m.cost,
            currency: m.currency || undefined,
            costBasis: m.costBasis || undefined,
            packageSize: m.packageSize || undefined,
            packageUnit: m.packageUnit || undefined,
            effectiveDate: m.effectiveDate || undefined,
          },
        };
      }
      setPreview(await api.imports.previewCosts(files, templates));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setBusy(true);
    try {
      setResult(await api.imports.commitCosts(preview.batchId, versionLabel || `Importación ${new Date().toLocaleString("es-AR")}`));
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
        <h1 className="text-2xl font-bold text-navy">Importar Costos</h1>
        <p className="text-sm text-gray-dark mt-1">Cargue la planilla maestra de costos de bases, concentrados y partes B. Se detectan nuevos, actualizados y sin cambios.</p>
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
        <p className="text-sm text-gray-dark">Arrastre la planilla de costos aquí, o</p>
        <button className="btn-secondary mt-2" onClick={() => inputRef.current?.click()}>
          Seleccionar archivo
        </button>
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && <p className="text-sm mt-3">{files.length} archivo(s) seleccionado(s)</p>}
      </div>

      {files.length > 0 && (
        <div className="card p-4">
          <ul className="text-sm space-y-1">
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
        <CostMappingWizard
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
            Vista previa: {preview.totals.new} nuevo(s), {preview.totals.updated} actualizado(s), {preview.totals.unchanged} sin cambios,{" "}
            {preview.totals.rejected} rechazado(s)
          </h3>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs text-gray-dark uppercase border-b border-(--border-subtle)">
                <th className="py-1.5">Código</th>
                <th className="py-1.5">Descripción</th>
                <th className="py-1.5">Tipo</th>
                <th className="py-1.5 text-right">Costo</th>
                <th className="py-1.5">Clasificación</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i} className="border-b border-(--border-subtle) last:border-0">
                  <td className="py-1.5 font-mono text-xs">{r.code}</td>
                  <td className="py-1.5">{r.description}</td>
                  <td className="py-1.5">{r.type}</td>
                  <td className="py-1.5 text-right">
                    {r.amount} {r.currency}
                  </td>
                  <td className="py-1.5">
                    {r.classification === "NEW" && <span className="badge badge-ok">Nuevo</span>}
                    {r.classification === "UPDATED" && <span className="badge badge-warning">Actualizado</span>}
                    {r.classification === "UNCHANGED" && <span className="badge" style={{ background: "#eef1f5", color: "#5b6b7a" }}>Sin cambios</span>}
                    {r.classification === "REJECTED" && <span className="badge badge-error">Rechazado</span>}
                    {r.reason && <div className="text-xs text-gray-dark mt-0.5">{r.reason}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3">
            <input className="input" placeholder="Etiqueta de esta versión de costos (opcional)" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
            <button className="btn-primary" disabled={busy} onClick={commit}>
              {busy ? "Importando..." : "Confirmar importación"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card p-5 border-l-4 border-l-navy">
          <h3 className="font-semibold text-navy mb-2">Resumen de importación</h3>
          <ul className="text-sm space-y-1">
            <li>Nuevos: {result.new}</li>
            <li>Actualizados: {result.updated}</li>
            <li>Sin cambios: {result.unchanged}</li>
            <li>Rechazados: {result.rejected}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function CostMappingWizard({
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
    { key: "code", label: "Código", required: true },
    { key: "description", label: "Descripción", required: true },
    { key: "type", label: "Tipo (Base/Concentrado/Parte B)", required: true },
    { key: "cost", label: "Costo", required: true },
    { key: "currency", label: "Moneda" },
    { key: "costBasis", label: "Unidad de costo (ej. USD/L)" },
    { key: "packageSize", label: "Cantidad/volumen de envase" },
    { key: "packageUnit", label: "Unidad de envase" },
    { key: "effectiveDate", label: "Fecha de actualización" },
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
