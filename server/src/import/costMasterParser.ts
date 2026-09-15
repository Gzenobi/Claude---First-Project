import { cellText, cellNumber, type ParsedSheet } from "../lib/excel.js";
import { isKnownUnit } from "../services/ValidationService.js";
import type { CostMasterColumnTemplate, CostMasterParseOutcome, ParsedComponentCostRow, RowIssue } from "./types.js";
import type { CurrencyCode, Unit } from "../lib/types.js";

const TYPE_ALIASES: Record<string, "BASE" | "CONCENTRATE" | "PART_B"> = {
  base: "BASE",
  bases: "BASE",
  concentrado: "CONCENTRATE",
  concentrate: "CONCENTRATE",
  tint: "CONCENTRATE",
  tinte: "CONCENTRATE",
  colorante: "CONCENTRATE",
  "parte b": "PART_B",
  partb: "PART_B",
  "part b": "PART_B",
  catalizador: "PART_B",
  endurecedor: "PART_B",
  hardener: "PART_B",
};

function normalizeType(raw: string): "BASE" | "CONCENTRATE" | "PART_B" | null {
  const key = raw.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? null;
}

const CURRENCY_SET = new Set(["USD", "EUR", "ARS"]);

/**
 * Interpreta un texto de "unidad de costo" como PER_LITER / PER_KG / PER_PACKAGE.
 * Ej.: "USD/L" -> PER_LITER; "USD/KG" -> PER_KG; "L" o "KG" (tamaño de envase) -> PER_PACKAGE.
 */
function inferCostBasis(raw: string | undefined): "PER_LITER" | "PER_KG" | "PER_PACKAGE" | null {
  if (!raw) return "PER_PACKAGE";
  const t = raw.toUpperCase();
  if (t.includes("/L") || t === "L" || t === "PER_LITER") return "PER_LITER";
  if (t.includes("/KG") || t === "KG" || t === "PER_KG") return "PER_KG";
  return "PER_PACKAGE";
}

export function parseCostMasterSheet(
  fileName: string,
  sheet: ParsedSheet,
  template: CostMasterColumnTemplate
): CostMasterParseOutcome {
  const issues: RowIssue[] = [];
  const rows = sheet.rows;
  const header = rows[template.headerRow]?.map((c) => cellText(c)) ?? [];
  const colIndex = (name?: string): number => (name ? header.findIndex((h) => h.toLowerCase() === name.toLowerCase()) : -1);

  const cols = template.columns;
  const idx = {
    code: colIndex(cols.code),
    description: colIndex(cols.description),
    type: colIndex(cols.type),
    cost: colIndex(cols.cost),
    currency: colIndex(cols.currency),
    costBasis: colIndex(cols.costBasis),
    packageSize: colIndex(cols.packageSize),
    packageUnit: colIndex(cols.packageUnit),
    costPerLiter: colIndex(cols.costPerLiter),
    effectiveDate: colIndex(cols.effectiveDate),
    density: colIndex(cols.density),
  };

  const requiredMissing = (["code", "description", "type", "cost"] as const).filter((k) => idx[k] === -1);
  if (requiredMissing.length > 0) {
    issues.push({
      fileName,
      severity: "ERROR",
      message: `Columnas requeridas no encontradas en el header: ${requiredMissing.join(", ")}.`,
    });
    return { rows: [], issues };
  }

  const parsed: ParsedComponentCostRow[] = [];

  for (let r = template.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === "")) continue;

    const code = cellText(row[idx.code]);
    const description = cellText(row[idx.description]);
    const typeRaw = cellText(row[idx.type]);
    if (!code || !description) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: "Falta código o descripción." });
      continue;
    }
    const type = normalizeType(typeRaw);
    if (!type) {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Tipo de componente desconocido: "${typeRaw}".` });
      continue;
    }

    const costPerLiter = idx.costPerLiter >= 0 ? cellNumber(row[idx.costPerLiter]) : null;
    let amount: number | null;
    let costBasis: "PER_LITER" | "PER_KG" | "PER_PACKAGE";
    let packageSize: number | null = null;
    let packageUnit: string | undefined;

    if (costPerLiter !== null) {
      amount = costPerLiter;
      costBasis = "PER_LITER";
    } else {
      amount = cellNumber(row[idx.cost]);
      const basisRaw = idx.costBasis >= 0 ? cellText(row[idx.costBasis]) : undefined;
      costBasis = inferCostBasis(basisRaw) ?? "PER_PACKAGE";
      if (costBasis === "PER_PACKAGE") {
        packageSize = idx.packageSize >= 0 ? cellNumber(row[idx.packageSize]) : null;
        packageUnit = idx.packageUnit >= 0 ? cellText(row[idx.packageUnit]).toUpperCase() : undefined;
      }
    }

    if (amount === null || Number.isNaN(amount)) {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: "Costo no numérico o ausente." });
      continue;
    }
    if (costBasis === "PER_PACKAGE" && (packageSize === null || !packageUnit || !isKnownUnit(packageUnit))) {
      issues.push({
        fileName,
        rowRef: code,
        severity: "ERROR",
        message: "Costo declarado por envase pero falta tamaño/unidad de envase válidos.",
      });
      continue;
    }

    const currencyRaw = idx.currency >= 0 ? cellText(row[idx.currency]).toUpperCase() : template.defaultCurrency ?? "";
    if (!CURRENCY_SET.has(currencyRaw)) {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Moneda desconocida o no especificada: "${currencyRaw}".` });
      continue;
    }

    const density = idx.density >= 0 ? cellText(row[idx.density]) : undefined;
    const effectiveDate = idx.effectiveDate >= 0 ? cellText(row[idx.effectiveDate]) : undefined;

    const baseUnit: Unit = costBasis === "PER_KG" ? "KG" : costBasis === "PER_PACKAGE" && packageUnit === "KG" ? "KG" : costBasis === "PER_PACKAGE" && packageUnit === "G" ? "KG" : "L";

    parsed.push({
      code,
      description,
      type,
      amount: String(amount),
      currency: currencyRaw as CurrencyCode,
      costBasis,
      packageSize: packageSize !== null ? String(packageSize) : undefined,
      packageUnit: packageUnit as Unit | undefined,
      effectiveDate: effectiveDate || undefined,
      density: density || undefined,
      baseUnit,
    });
  }

  return { rows: parsed, issues };
}

export function suggestCostMasterColumnMapping(sheet: ParsedSheet): { headerRow: number; headers: string[] } | null {
  for (let r = 0; r < Math.min(sheet.rows.length, 20); r++) {
    const row = sheet.rows[r].map((c) => cellText(c));
    const nonEmpty = row.filter((c) => c !== "");
    if (nonEmpty.length >= 3) {
      return { headerRow: r, headers: row };
    }
  }
  return null;
}
