import Decimal from "decimal.js";
import { cellText, cellNumber, type ParsedSheet } from "../lib/excel.js";
import { isKnownUnit } from "../services/ValidationService.js";
import type { FormulaColumnTemplate, FormulaParseOutcome, ParsedFormulaRow, RowIssue } from "./types.js";
import type { Unit } from "../lib/types.js";

/**
 * Parser genérico por columnas para archivos de fórmula "planos" (una fila
 * por concentrado, con el código/cantidad de base repetidos en cada fila
 * del mismo color) — el formato de ejemplo descripto en la especificación:
 * Material Code | Color Code | Base | Quantity | Tint Code | Tint Quantity.
 * El mapeo columna -> campo lo define el usuario en el asistente de
 * importación (o una ImportTemplate guardada).
 */
export function parseGenericFormulaSheet(
  fileName: string,
  sheet: ParsedSheet,
  template: FormulaColumnTemplate
): FormulaParseOutcome {
  const issues: RowIssue[] = [];
  const rows = sheet.rows;
  const header = rows[template.headerRow]?.map((c) => cellText(c)) ?? [];
  const colIndex = (name: string): number => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const cols = template.columns;
  const idx = {
    productCode: colIndex(cols.productCode),
    productName: cols.productName ? colIndex(cols.productName) : -1,
    colorCode: colIndex(cols.colorCode),
    colorName: cols.colorName ? colIndex(cols.colorName) : -1,
    baseCode: colIndex(cols.baseCode),
    baseQuantity: colIndex(cols.baseQuantity),
    baseUnit: colIndex(cols.baseUnit),
    tintCode: colIndex(cols.tintCode),
    tintQuantity: colIndex(cols.tintQuantity),
    tintUnit: cols.tintUnit ? colIndex(cols.tintUnit) : -1,
    commercialVolume: cols.commercialVolume ? colIndex(cols.commercialVolume) : -1,
    commercialVolumeUnit: cols.commercialVolumeUnit ? colIndex(cols.commercialVolumeUnit) : -1,
  };

  const requiredMissing = Object.entries({
    productCode: idx.productCode,
    colorCode: idx.colorCode,
    baseCode: idx.baseCode,
    baseQuantity: idx.baseQuantity,
    baseUnit: idx.baseUnit,
    tintCode: idx.tintCode,
    tintQuantity: idx.tintQuantity,
  }).filter(([, v]) => v === -1);

  if (requiredMissing.length > 0) {
    issues.push({
      fileName,
      severity: "ERROR",
      message: `Columnas requeridas no encontradas en el header: ${requiredMissing.map(([k]) => k).join(", ")}.`,
    });
    return { formulas: [], issues };
  }

  type Group = {
    productCode: string;
    productName: string;
    colorCode: string;
    colorName?: string;
    baseCode: string;
    baseQuantity: string;
    baseUnit: Unit;
    commercialVolume?: string;
    commercialVolumeUnit?: Unit;
    concentrates: { code: string; quantity: string; unit: Unit }[];
  };
  const groups = new Map<string, Group>();

  for (let r = template.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === "")) continue;

    const productCode = cellText(row[idx.productCode]);
    const colorCode = cellText(row[idx.colorCode]);
    if (!productCode || !colorCode) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: "Falta código de producto o de color en la fila." });
      continue;
    }

    const baseUnitRaw = cellText(row[idx.baseUnit]).toUpperCase();
    const tintUnitRaw = idx.tintUnit >= 0 ? cellText(row[idx.tintUnit]).toUpperCase() : baseUnitRaw;
    if (!isKnownUnit(baseUnitRaw)) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: `Unidad de base desconocida: "${baseUnitRaw}".` });
      continue;
    }
    if (!isKnownUnit(tintUnitRaw)) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: `Unidad de concentrado desconocida: "${tintUnitRaw}".` });
      continue;
    }

    const baseQty = cellNumber(row[idx.baseQuantity]);
    const tintQty = cellNumber(row[idx.tintQuantity]);
    const tintCode = cellText(row[idx.tintCode]);
    if (baseQty === null) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: "Cantidad de base no numérica." });
      continue;
    }
    if (!tintCode || tintQty === null) {
      issues.push({ fileName, rowRef: `fila ${r + 1}`, severity: "ERROR", message: "Código o cantidad de concentrado inválidos." });
      continue;
    }

    const key = `${productCode}::${colorCode}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        productCode,
        productName: idx.productName >= 0 ? cellText(row[idx.productName]) || productCode : productCode,
        colorCode,
        colorName: idx.colorName >= 0 ? cellText(row[idx.colorName]) || undefined : undefined,
        baseCode: cellText(row[idx.baseCode]),
        baseQuantity: String(baseQty),
        baseUnit: baseUnitRaw as Unit,
        commercialVolume: idx.commercialVolume >= 0 ? cellText(row[idx.commercialVolume]) || undefined : undefined,
        commercialVolumeUnit: idx.commercialVolumeUnit >= 0 ? (cellText(row[idx.commercialVolumeUnit]).toUpperCase() as Unit) || undefined : undefined,
        concentrates: [],
      };
      groups.set(key, group);
    } else {
      const rowBaseCode = cellText(row[idx.baseCode]);
      if (rowBaseCode && rowBaseCode !== group.baseCode) {
        issues.push({
          fileName,
          rowRef: `${key} / fila ${r + 1}`,
          severity: "WARNING",
          message: `La base difiere entre filas del mismo color (${group.baseCode} vs ${rowBaseCode}); se conserva la primera.`,
        });
      }
    }

    group.concentrates.push({ code: tintCode, quantity: String(tintQty), unit: tintUnitRaw as Unit });
  }

  const formulas: ParsedFormulaRow[] = [];
  for (const g of groups.values()) {
    if (g.concentrates.length === 0) {
      issues.push({ fileName, rowRef: g.colorCode, severity: "ERROR", message: "El color no tiene concentrados válidos." });
      continue;
    }
    const tintTotalInBaseUnit = g.concentrates
      .filter((c) => c.unit === g.baseUnit)
      .reduce((acc, c) => acc.add(new Decimal(c.quantity)), new Decimal(0));
    const impliedVolume = new Decimal(g.baseQuantity).add(tintTotalInBaseUnit);
    const commercialVolume = g.commercialVolume ?? impliedVolume.toString();
    const commercialVolumeUnit = g.commercialVolumeUnit ?? g.baseUnit;

    formulas.push({
      sourceFileName: fileName,
      sheetName: sheet.sheetName,
      productCode: g.productCode,
      productName: g.productName,
      colorCode: g.colorCode,
      colorName: g.colorName,
      baseCode: g.baseCode,
      baseQuantity: g.baseQuantity,
      baseUnit: g.baseUnit,
      baseQuantityBasis: "EXPLICIT",
      concentrates: g.concentrates,
      batchVolume: impliedVolume.toString(),
      batchVolumeUnit: g.baseUnit,
      commercialVolume,
      commercialVolumeUnit,
      warnings: [],
    });
  }

  return { formulas, issues };
}

/** Heurística simple para autodetectar el header de columnas más probable. */
export function suggestFormulaColumnMapping(sheet: ParsedSheet): { headerRow: number; headers: string[] } | null {
  for (let r = 0; r < Math.min(sheet.rows.length, 20); r++) {
    const row = sheet.rows[r].map((c) => cellText(c));
    const nonEmpty = row.filter((c) => c !== "");
    if (nonEmpty.length >= 4) {
      return { headerRow: r, headers: row };
    }
  }
  return null;
}
