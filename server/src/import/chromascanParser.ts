import Decimal from "decimal.js";
import { cellText, cellNumber, type ParsedSheet } from "../lib/excel.js";
import type { FormulaParseOutcome, ParsedFormulaRow, RowIssue } from "./types.js";

/**
 * Parser para el formato "Chromascan Conversao de Formula" (tintometría,
 * planillas reales analizadas: AAC018, AAD704, AAE019, AAJ019_REF, CLB108).
 *
 * Estructura observada (idéntica en las 5 planillas de ejemplo):
 *  - Fila 0: título "Chromascan Conversao de Formula"
 *  - Metadatos por etiqueta en columna A: "Nome cor :", "Codigo:", "Padrao :",
 *    "Linhas:" (nombre de producto), "Base :" (código de base, SIN cantidad)
 *  - Una o más secciones de fórmula, cada una marcada por una celda
 *    "FORMULA <TIPO> <TAMAÑO>,<DECIMAL> L" (ej. "FORMULA GALAO 3,6 L",
 *    "FORMULA BALDE 20 L"), seguida de un header ID|FLOZ|1/48|1/96||ML y
 *    filas de concentrado (código + cantidad en mL).
 *
 * SUPUESTO DOCUMENTADO (no verificable solo con estos archivos): estas
 * tablas de fórmula NO declaran cantidad de base. Se asume que la base
 * completa el envase hasta su volumen nominal (modelo "fill-to-volume"):
 *   cantidad de base = volumen comercial declarado - Σ concentrados (en L)
 * Esto se marca como advertencia en cada fórmula importada para que el
 * usuario lo confirme o corrija manualmente.
 */

const TITLE_MARKER = "chromascan conversao de formula";
const FORMULA_MARKER = /^FORMULA\s+([A-ZÀ-ÿ]+)\s+([\d,.]+)\s*L\s*$/i;

export function detectChromascan(sheet: ParsedSheet): boolean {
  return sheet.rows.some((r) => cellText(r[0]).toLowerCase().includes(TITLE_MARKER));
}

/**
 * Los metadatos vienen como pares etiqueta/valor distribuidos en distintas
 * columnas de una misma fila (ej. col0="Nome cor :" col1="Branco", y en la
 * misma fila col4="Codigo:" col5="AAC018"). Se busca la etiqueta en
 * cualquier columna y se toma la celda inmediatamente siguiente.
 */
function findLabelValue(rows: (string | number | null)[][], label: string): string | null {
  const needle = label.toLowerCase();
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (cellText(row[c]).toLowerCase().startsWith(needle)) {
        const value = cellText(row[c + 1]);
        if (value) return value;
      }
    }
  }
  return null;
}

export function parseChromascanSheet(fileName: string, sheet: ParsedSheet): FormulaParseOutcome {
  const issues: RowIssue[] = [];
  const rows = sheet.rows;

  const colorName = findLabelValue(rows, "nome cor");
  const colorCode = findLabelValue(rows, "codigo");
  const standard = findLabelValue(rows, "padrao");
  const productName = findLabelValue(rows, "linhas");
  const baseCode = findLabelValue(rows, "base");

  if (!colorCode) {
    issues.push({ fileName, severity: "ERROR", message: "No se encontró el campo 'Codigo:' (código de color)." });
    return { formulas: [], issues };
  }
  if (!baseCode) {
    issues.push({ fileName, rowRef: colorCode, severity: "ERROR", message: "No se encontró el campo 'Base:' (código de base)." });
    return { formulas: [], issues };
  }
  if (!productName) {
    issues.push({ fileName, rowRef: colorCode, severity: "WARNING", message: "No se encontró 'Linhas:' (producto); se usará 'SIN PRODUCTO'." });
  }

  const formulas: ParsedFormulaRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const marker = cellText(rows[i][0]).match(FORMULA_MARKER);
    if (!marker) continue;

    const sizeStr = marker[2].replace(",", ".");
    const commercialVolume = cellNumber(sizeStr);
    if (commercialVolume === null) {
      issues.push({
        fileName,
        rowRef: `${colorCode} / fila ${i + 1}`,
        severity: "ERROR",
        message: `No se pudo interpretar el tamaño de envase en "${cellText(rows[i][0])}".`,
      });
      continue;
    }

    // Header esperado en la fila siguiente (puede haber una fila en blanco de por medio)
    let headerIdx = -1;
    for (let h = i + 1; h < Math.min(i + 4, rows.length); h++) {
      if (cellText(rows[h][0]).toUpperCase() === "ID" && cellText(rows[h][5]).toUpperCase() === "ML") {
        headerIdx = h;
        break;
      }
    }
    if (headerIdx === -1) {
      issues.push({
        fileName,
        rowRef: `${colorCode} / ${cellText(rows[i][0])}`,
        severity: "ERROR",
        message: `No se encontró el header ID/ML de la sección "${cellText(rows[i][0])}".`,
      });
      continue;
    }

    const concentrates: { code: string; quantity: string; unit: "ML" }[] = [];
    let r = headerIdx + 1;
    for (; r < rows.length; r++) {
      const code = cellText(rows[r][0]);
      if (!code) break; // fila en blanco = fin de la sección
      if (cellText(rows[r][0]).match(FORMULA_MARKER)) break;
      const qty = cellNumber(rows[r][5]);
      if (qty === null) {
        // Fila basura frecuente al final de la sección en archivos reales:
        // "0" no es un código de componente Chromascan real (todos son
        // alfanuméricos, ej. GVA126) — combinado con cantidad vacía, es un
        // artefacto del exportador, no un dato a corregir por el usuario.
        if (code === "0") continue;
        issues.push({
          fileName,
          rowRef: `${colorCode} / ${code}`,
          severity: "ERROR",
          message: `Cantidad no numérica para el concentrado ${code} en la sección "${cellText(rows[i][0])}".`,
        });
        continue;
      }
      concentrates.push({ code, quantity: String(qty), unit: "ML" });
    }

    if (concentrates.length === 0) {
      issues.push({
        fileName,
        rowRef: `${colorCode} / ${cellText(rows[i][0])}`,
        severity: "ERROR",
        message: "La sección de fórmula no tiene concentrados con cantidad válida.",
      });
      continue;
    }

    const tintTotalMl = concentrates.reduce((acc, c) => acc.add(new Decimal(c.quantity)), new Decimal(0));
    const tintTotalL = tintTotalMl.div(1000);
    const commercialVolumeDec = new Decimal(commercialVolume);
    const baseQuantity = commercialVolumeDec.sub(tintTotalL);

    const warnings = [
      "Cantidad de base no declarada en el archivo de origen: se calculó como " +
        "volumen comercial − Σ concentrados (modelo 'completar a volumen'). Verifique este supuesto.",
    ];
    if (baseQuantity.isNegative()) {
      issues.push({
        fileName,
        rowRef: `${colorCode} / ${cellText(rows[i][0])}`,
        severity: "ERROR",
        message: "El volumen de concentrados supera el volumen comercial declarado; la fórmula es inconsistente.",
      });
      continue;
    }

    formulas.push({
      sourceFileName: fileName,
      sheetName: sheet.sheetName,
      productCode: slugifyProductCode(productName ?? "SIN PRODUCTO"),
      productName: productName ?? "SIN PRODUCTO",
      colorCode,
      colorName: colorName ?? undefined,
      colorStandard: standard ?? undefined,
      baseCode,
      baseQuantity: baseQuantity.toString(),
      baseUnit: "L",
      baseQuantityBasis: "FILL_TO_VOLUME",
      concentrates,
      batchVolume: String(commercialVolume),
      batchVolumeUnit: "L",
      commercialVolume: String(commercialVolume),
      commercialVolumeUnit: "L",
      version: extractBatchNote(rows, i),
      warnings,
    });
  }

  if (formulas.length === 0 && issues.every((iss) => iss.severity !== "ERROR")) {
    issues.push({ fileName, severity: "ERROR", message: "No se encontró ninguna sección 'FORMULA ... L' en el archivo." });
  }

  return { formulas, issues };
}

function slugifyProductCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Busca una nota tipo "OB:495288" cerca del marcador de fórmula, útil como referencia de lote. */
function extractBatchNote(rows: (string | number | null)[][], formulaMarkerIdx: number): string | undefined {
  for (let k = Math.max(0, formulaMarkerIdx - 4); k < formulaMarkerIdx; k++) {
    const text = rows[k]?.map((c) => cellText(c)).join(" ") ?? "";
    const match = text.match(/OB:\s*\d+/i);
    if (match) return match[0];
  }
  return undefined;
}
