import { randomUUID } from "crypto";
import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { parseWorkbook } from "../lib/excel.js";
import { detectChromascan, parseChromascanSheet } from "../import/chromascanParser.js";
import { parseGenericFormulaSheet, suggestFormulaColumnMapping } from "../import/genericFormulaParser.js";
import { parseCostMasterSheet, suggestCostMasterColumnMapping } from "../import/costMasterParser.js";
import { detectSapCostMaster, parseSapCostMasterSheet, type SapCostSource } from "../import/sapCostMasterParser.js";
import type {
  FormulaColumnTemplate,
  CostMasterColumnTemplate,
  ParsedFormulaRow,
  ParsedComponentCostRow,
  RowIssue,
} from "../import/types.js";

type CostRowClassification = "NEW" | "UPDATED" | "UNCHANGED" | "REJECTED" | "NO_COST";

// ---------------------------------------------------------------------------
// Almacenamiento en memoria de lotes en estado "preview" (no confirmados).
// No se escribe en la base de datos hasta que el usuario llama a commit().
// Limitación conocida (MVP): se pierde si el proceso del servidor reinicia.
// ---------------------------------------------------------------------------

interface PendingFormulaBatch {
  type: "FORMULAS";
  createdAt: number;
  files: { name: string; classification: FileClassification; formulas: ParsedFormulaRow[] }[];
  issues: RowIssue[];
}
interface PendingCostBatch {
  type: "COST_MASTER";
  createdAt: number;
  rows: (ParsedComponentCostRow & { classification: CostRowClassification; reason?: string })[];
  issues: RowIssue[];
}
type PendingBatch = PendingFormulaBatch | PendingCostBatch;

const pendingBatches = new Map<string, PendingBatch>();

export type FileClassification = "OK" | "NEEDS_MAPPING" | "FAILED";

export interface FormulaFilePreview {
  fileName: string;
  classification: FileClassification;
  suggestedHeaders?: { headerRow: number; headers: string[] };
  formulaCount: number;
  colorCodes: string[];
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface FormulaImportPreview {
  batchId: string;
  files: FormulaFilePreview[];
  totals: { files: number; formulas: number; errors: number; warnings: number };
}

/**
 * Analiza N archivos de fórmula: detecta automáticamente el formato
 * "Chromascan"; para cualquier otro formato usa la plantilla provista en
 * `templates[fileName]` (asistente de mapeo) o, si no hay ninguna, marca el
 * archivo como NEEDS_MAPPING junto con una sugerencia de header.
 */
export async function previewFormulaImport(
  files: { name: string; buffer: Buffer }[],
  templates: Record<string, FormulaColumnTemplate>,
  defaultTemplate?: FormulaColumnTemplate
): Promise<FormulaImportPreview> {
  const batchId = randomUUID();
  const batchFiles: PendingFormulaBatch["files"] = [];
  const allIssues: RowIssue[] = [];
  const filePreviews: FormulaFilePreview[] = [];

  for (const file of files) {
    try {
      const wb = parseWorkbook(file.name, file.buffer);
      const sheet = wb.sheets[0];
      let formulas: ParsedFormulaRow[] = [];
      let issues: RowIssue[] = [];
      let classification: FileClassification = "OK";
      let suggestedHeaders: { headerRow: number; headers: string[] } | undefined;

      const template = templates[file.name] ?? defaultTemplate;
      if (detectChromascan(sheet)) {
        const outcome = parseChromascanSheet(file.name, sheet);
        formulas = outcome.formulas;
        issues = outcome.issues;
      } else if (template) {
        // La misma plantilla mapeada una vez se reaplica a todos los archivos
        // del lote que compartan estructura (importación masiva de cientos
        // de fórmulas con el mismo formato de origen, distinto nombre de archivo).
        const outcome = parseGenericFormulaSheet(file.name, sheet, template);
        formulas = outcome.formulas;
        issues = outcome.issues;
      } else {
        classification = "NEEDS_MAPPING";
        suggestedHeaders = suggestFormulaColumnMapping(sheet) ?? undefined;
        issues = [{ fileName: file.name, severity: "WARNING", message: "Formato no reconocido automáticamente: requiere mapeo de columnas." }];
      }

      // Advertencias propias de cada fórmula (ej. supuestos de cantidad de base)
      for (const f of formulas) {
        for (const w of f.warnings) {
          issues.push({ fileName: file.name, rowRef: f.colorCode, severity: "WARNING", message: w });
        }
      }

      // Validaciones contra la base de datos: duplicados exactos (mismo color + volumen comercial)
      for (const f of formulas) {
        const existingColor = await prisma.color.findFirst({
          where: { code: f.colorCode, product: { code: f.productCode } },
          include: { formulas: true },
        });
        if (existingColor) {
          const dup = existingColor.formulas.find(
            (ef) => ef.commercialVolume.toString() === f.commercialVolume && ef.commercialVolumeUnit === f.commercialVolumeUnit
          );
          if (dup) {
            issues.push({
              fileName: file.name,
              rowRef: f.colorCode,
              severity: "WARNING",
              message: `Ya existe una fórmula para el color ${f.colorCode} con el mismo volumen comercial (${f.commercialVolume} ${f.commercialVolumeUnit}); se omitirá al confirmar.`,
            });
          }
        }
      }

      batchFiles.push({ name: file.name, classification, formulas });
      allIssues.push(...issues);
      filePreviews.push({
        fileName: file.name,
        classification,
        suggestedHeaders,
        formulaCount: formulas.length,
        colorCodes: formulas.map((f) => f.colorCode),
        errors: issues.filter((i) => i.severity === "ERROR"),
        warnings: issues.filter((i) => i.severity === "WARNING"),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido al leer el archivo.";
      allIssues.push({ fileName: file.name, severity: "ERROR", message });
      batchFiles.push({ name: file.name, classification: "FAILED", formulas: [] });
      filePreviews.push({
        fileName: file.name,
        classification: "FAILED",
        formulaCount: 0,
        colorCodes: [],
        errors: [{ fileName: file.name, severity: "ERROR", message }],
        warnings: [],
      });
    }
  }

  pendingBatches.set(batchId, { type: "FORMULAS", createdAt: Date.now(), files: batchFiles, issues: allIssues });

  return {
    batchId,
    files: filePreviews,
    totals: {
      files: files.length,
      formulas: filePreviews.reduce((a, f) => a + f.formulaCount, 0),
      errors: allIssues.filter((i) => i.severity === "ERROR").length,
      warnings: allIssues.filter((i) => i.severity === "WARNING").length,
    },
  };
}

export interface CommitSummary {
  importBatchId: string;
  imported: number;
  skippedDuplicates: number;
  rejected: number;
  errorCount: number;
  warningCount: number;
}

export async function commitFormulaImport(batchId: string): Promise<CommitSummary> {
  const batch = pendingBatches.get(batchId);
  if (!batch || batch.type !== "FORMULAS") {
    throw new Error("Lote de importación no encontrado o expirado. Vuelva a analizar los archivos.");
  }

  const importBatch = await prisma.importBatch.create({
    data: {
      type: "FORMULAS",
      status: "COMMITTED",
      fileNames: JSON.stringify(batch.files.map((f) => f.name)),
      committedAt: new Date(),
    },
  });

  let imported = 0;
  let skippedDuplicates = 0;
  let rejected = 0;

  for (const file of batch.files) {
    for (const f of file.formulas) {
      try {
        const result = await importOneFormula(f, importBatch.id);
        if (result === "IMPORTED") imported++;
        else skippedDuplicates++;
      } catch (e) {
        rejected++;
        await prisma.importError.create({
          data: {
            importBatchId: importBatch.id,
            fileName: file.name,
            rowRef: f.colorCode,
            severity: "ERROR",
            message: e instanceof Error ? e.message : "Error desconocido al importar la fórmula.",
            rawDataJson: JSON.stringify(f),
          },
        });
      }
    }
  }

  const warningCount = batch.issues.filter((i) => i.severity === "WARNING").length;
  for (const issue of batch.issues) {
    await prisma.importError.create({
      data: {
        importBatchId: importBatch.id,
        fileName: issue.fileName,
        rowRef: issue.rowRef,
        severity: issue.severity,
        message: issue.message,
      },
    });
  }

  await prisma.importBatch.update({
    where: { id: importBatch.id },
    data: {
      summaryJson: JSON.stringify({ imported, skippedDuplicates, rejected, warningCount }),
    },
  });

  pendingBatches.delete(batchId);

  return {
    importBatchId: importBatch.id,
    imported,
    skippedDuplicates,
    rejected,
    errorCount: batch.issues.filter((i) => i.severity === "ERROR").length + rejected,
    warningCount,
  };
}

async function importOneFormula(f: ParsedFormulaRow, importBatchId: string): Promise<"IMPORTED" | "DUPLICATE"> {
  const product = await prisma.product.upsert({
    where: { code: f.productCode },
    update: { name: f.productName },
    create: { code: f.productCode, name: f.productName, kind: "ONE_K" },
  });

  const color = await prisma.color.upsert({
    where: { productId_code: { productId: product.id, code: f.colorCode } },
    update: { name: f.colorName, standard: f.colorStandard },
    create: { productId: product.id, code: f.colorCode, name: f.colorName, standard: f.colorStandard },
  });

  const existingFormula = await prisma.formula.findFirst({
    where: { colorId: color.id, commercialVolume: new Decimal(f.commercialVolume), commercialVolumeUnit: f.commercialVolumeUnit },
  });
  if (existingFormula) return "DUPLICATE";

  const baseComponent = await ensureComponent(f.baseCode, "BASE");

  const formula = await prisma.formula.create({
    data: {
      colorId: color.id,
      version: f.version,
      batchVolume: new Decimal(f.batchVolume),
      batchVolumeUnit: f.batchVolumeUnit,
      commercialVolume: new Decimal(f.commercialVolume),
      commercialVolumeUnit: f.commercialVolumeUnit,
      baseQuantityBasis: f.baseQuantityBasis,
      sourceImportBatchId: importBatchId,
      sourceFileName: f.sourceFileName,
    },
  });

  await prisma.formulaComponent.create({
    data: {
      formulaId: formula.id,
      componentId: baseComponent.id,
      role: "BASE",
      quantity: new Decimal(f.baseQuantity),
      unit: f.baseUnit,
      sortOrder: 0,
    },
  });

  let sortOrder = 1;
  for (const tint of f.concentrates) {
    const tintComponent = await ensureComponent(tint.code, "CONCENTRATE");
    await prisma.formulaComponent.create({
      data: {
        formulaId: formula.id,
        componentId: tintComponent.id,
        role: "CONCENTRATE",
        quantity: new Decimal(tint.quantity),
        unit: tint.unit,
        sortOrder: sortOrder++,
      },
    });
  }

  return "IMPORTED";
}

async function ensureComponent(code: string, type: "BASE" | "CONCENTRATE" | "PART_B") {
  const existing = await prisma.component.findUnique({ where: { code } });
  if (existing) return existing;
  return prisma.component.create({
    data: { code, description: `${code} (creado automáticamente desde importación de fórmulas)`, type, baseUnit: "L" },
  });
}

// ---------------------------------------------------------------------------
// Costos maestros
// ---------------------------------------------------------------------------

export interface CostFilePreview {
  fileName: string;
  classification: FileClassification;
  suggestedHeaders?: { headerRow: number; headers: string[] };
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface CostImportPreview {
  batchId: string;
  files: CostFilePreview[];
  rows: {
    code: string;
    description: string;
    type: string;
    classification: CostRowClassification;
    reason?: string;
    amount?: string;
    currency?: string;
  }[];
  totals: { new: number; updated: number; unchanged: number; rejected: number; noCost: number };
}

export async function previewCostImport(
  files: { name: string; buffer: Buffer }[],
  templates: Record<string, CostMasterColumnTemplate>,
  sapCostSources: Record<string, SapCostSource> = {}
): Promise<CostImportPreview> {
  const batchId = randomUUID();
  const filePreviews: CostFilePreview[] = [];
  const allRows: PendingCostBatch["rows"] = [];
  const allIssues: RowIssue[] = [];

  for (const file of files) {
    try {
      const wb = parseWorkbook(file.name, file.buffer);
      const sheet = wb.sheets[0];
      const sapDetected = detectSapCostMaster(sheet);

      let outcome: { rows: ParsedComponentCostRow[]; issues: RowIssue[] };
      if (sapDetected) {
        outcome = parseSapCostMasterSheet(file.name, sheet, sapCostSources[file.name] ?? "CKM3_USD_LTR");
      } else if (templates[file.name]) {
        outcome = parseCostMasterSheet(file.name, sheet, templates[file.name]);
      } else {
        const suggestedHeaders = suggestCostMasterColumnMapping(sheet) ?? undefined;
        filePreviews.push({
          fileName: file.name,
          classification: "NEEDS_MAPPING",
          suggestedHeaders,
          errors: [],
          warnings: [{ fileName: file.name, severity: "WARNING", message: "Requiere mapeo de columnas." }],
        });
        continue;
      }

      allIssues.push(...outcome.issues);

      for (const row of outcome.rows) {
        const classified = await classifyCostRow(row);
        allRows.push(classified);
      }

      filePreviews.push({
        fileName: file.name,
        classification: "OK",
        errors: outcome.issues.filter((i) => i.severity === "ERROR"),
        warnings: outcome.issues.filter((i) => i.severity === "WARNING"),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido al leer el archivo.";
      filePreviews.push({ fileName: file.name, classification: "FAILED", errors: [{ fileName: file.name, severity: "ERROR", message }], warnings: [] });
    }
  }

  pendingBatches.set(batchId, { type: "COST_MASTER", createdAt: Date.now(), rows: allRows, issues: allIssues });

  const totals = {
    new: allRows.filter((r) => r.classification === "NEW").length,
    updated: allRows.filter((r) => r.classification === "UPDATED").length,
    unchanged: allRows.filter((r) => r.classification === "UNCHANGED").length,
    rejected: allRows.filter((r) => r.classification === "REJECTED").length,
    noCost: allRows.filter((r) => r.classification === "NO_COST").length,
  };

  return {
    batchId,
    files: filePreviews,
    rows: allRows.map((r) => ({
      code: r.code,
      description: r.description,
      type: r.type,
      classification: r.classification,
      reason: r.reason,
      amount: r.amount,
      currency: r.currency,
    })),
    totals,
  };
}

async function classifyCostRow(
  row: ParsedComponentCostRow
): Promise<ParsedComponentCostRow & { classification: CostRowClassification; reason?: string }> {
  if (!row.hasCost) {
    return { ...row, classification: "NO_COST", reason: "El origen no declara costo para este componente (ej. Estado = SIN COSTO)." };
  }

  const existing = await prisma.component.findUnique({
    where: { code: row.code },
    include: { costs: { where: { isCurrent: true } } },
  });

  if (!existing) return { ...row, classification: "NEW" };

  if (existing.type !== row.type) {
    return { ...row, classification: "UPDATED", reason: `Tipo existente (${existing.type}) difiere del importado (${row.type}); se conserva el tipo existente.` };
  }

  // Un componente puede tener más de un costo vigente simultáneo — uno por
  // tamaño de envase (ver sapCostMasterParser.ts) — así que la comparación
  // debe ser contra el costo existente del MISMO tamaño, no "el primero".
  const rowPackageKey = row.packageSize ? new Decimal(row.packageSize).toString() : null;
  const current = existing.costs.find((c) => (c.packageSize?.toString() ?? null) === rowPackageKey);
  if (!current) return { ...row, classification: "NEW" };

  const sameAmount = current.amount.toString() === new Decimal(row.amount!).toString();
  const sameCurrency = current.currency === row.currency;
  const sameBasis = current.costBasis === row.costBasis;
  const samePackage =
    (current.packageSize?.toString() ?? null) === (row.packageSize ? new Decimal(row.packageSize).toString() : null) &&
    (current.packageUnit ?? null) === (row.packageUnit ?? null);

  if (sameAmount && sameCurrency && sameBasis && samePackage) {
    return { ...row, classification: "UNCHANGED" };
  }
  return { ...row, classification: "UPDATED" };
}

export async function commitCostImport(
  batchId: string,
  versionLabel: string
): Promise<CommitSummary & { new: number; updated: number; unchanged: number; noCost: number }> {
  const batch = pendingBatches.get(batchId);
  if (!batch || batch.type !== "COST_MASTER") {
    throw new Error("Lote de importación no encontrado o expirado. Vuelva a analizar los archivos.");
  }

  const importBatch = await prisma.importBatch.create({
    data: { type: "COST_MASTER", status: "COMMITTED", fileNames: "[]", committedAt: new Date() },
  });

  const costVersion = await prisma.costVersion.create({
    data: { label: versionLabel, importBatchId: importBatch.id },
  });

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let rejected = 0;
  let noCost = 0;
  // code (del sistema de origen, ej. SAP) -> id del Component ya upserteado en este lote
  const codeToComponentId = new Map<string, string>();
  // Component.id (Base) -> código de origen de su Parte B, a resolver una vez cargados todos
  const pendingPartBLinks = new Map<string, string>();

  for (const row of batch.rows) {
    if (row.classification === "REJECTED") {
      rejected++;
      continue;
    }
    if (row.classification === "UNCHANGED") {
      unchanged++;
      const existing = await prisma.component.findUnique({ where: { code: row.code } });
      if (existing) codeToComponentId.set(row.code, existing.id);
      if (row.linkedPartBCode && existing) pendingPartBLinks.set(existing.id, row.linkedPartBCode);
      continue;
    }

    const component = await prisma.component.upsert({
      where: { code: row.code },
      update: { description: row.description, density: row.density ? new Decimal(row.density) : undefined },
      create: { code: row.code, description: row.description, type: row.type, baseUnit: row.baseUnit, density: row.density ? new Decimal(row.density) : undefined },
    });
    codeToComponentId.set(row.code, component.id);
    if (row.linkedPartBCode) pendingPartBLinks.set(component.id, row.linkedPartBCode);

    if (row.classification === "NO_COST") {
      noCost++;
      continue; // se registra el componente en el maestro, pero no se crea/toca ningún costo
    }

    // Solo se invalida el costo vigente del MISMO tamaño de envase — un
    // componente puede tener varios costos vigentes a la vez, uno por
    // presentación (ver sapCostMasterParser.ts), y no deben pisarse entre sí.
    await prisma.componentCost.updateMany({
      where: {
        componentId: component.id,
        isCurrent: true,
        packageSize: row.packageSize ? new Decimal(row.packageSize) : null,
      },
      data: { isCurrent: false },
    });
    await prisma.componentCost.create({
      data: {
        componentId: component.id,
        costVersionId: costVersion.id,
        amount: new Decimal(row.amount!),
        currency: row.currency!,
        costBasis: row.costBasis!,
        packageSize: row.packageSize ? new Decimal(row.packageSize) : undefined,
        packageUnit: row.packageUnit,
        effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : undefined,
        isCurrent: true,
        sapCode: row.sapCode,
      },
    });

    if (row.classification === "NEW") created++;
    else updated++;
  }

  // Resolver vínculos Base -> Parte B (ej. columna "Codigo Parte B" del maestro SAP).
  // Si el código de Parte B referenciado no existe como componente (porque no vino
  // en este lote ni en uno anterior), se deja constancia como advertencia en vez
  // de fallar la importación completa.
  const unresolvedPartBLinks: string[] = [];
  for (const [baseComponentId, partBCode] of pendingPartBLinks) {
    let partBComponentId = codeToComponentId.get(partBCode);
    if (!partBComponentId) {
      const found = await prisma.component.findUnique({ where: { code: partBCode } });
      partBComponentId = found?.id;
    }
    if (partBComponentId) {
      await prisma.component.update({ where: { id: baseComponentId }, data: { linkedPartBComponentId: partBComponentId } });
    } else {
      unresolvedPartBLinks.push(partBCode);
    }
  }
  if (unresolvedPartBLinks.length > 0) {
    await prisma.importError.create({
      data: {
        importBatchId: importBatch.id,
        fileName: "(vínculos Parte B)",
        severity: "WARNING",
        message: `No se encontraron como componentes los siguientes códigos de Parte B referenciados: ${unresolvedPartBLinks.join(", ")}.`,
      },
    });
  }

  await prisma.importBatch.update({
    where: { id: importBatch.id },
    data: { summaryJson: JSON.stringify({ created, updated, unchanged, rejected, noCost }) },
  });

  pendingBatches.delete(batchId);

  return {
    importBatchId: importBatch.id,
    imported: created + updated,
    skippedDuplicates: unchanged,
    rejected,
    errorCount: rejected,
    warningCount: batch.issues.filter((i) => i.severity === "WARNING").length + (unresolvedPartBLinks.length > 0 ? 1 : 0),
    new: created,
    updated,
    unchanged,
    noCost,
  };
}
