import { cellText, cellNumber, type ParsedSheet } from "../lib/excel.js";
import type { CostMasterParseOutcome, ParsedComponentCostRow, RowIssue } from "./types.js";
import type { CurrencyCode } from "../lib/types.js";

/**
 * Parser para el formato real de planilla maestra de costos de AkzoNobel/
 * International Paint analizado en la planilla "Costeo_Colores_-_DATOS_IP"
 * (hoja "Materiales IP"). Estructura observada:
 *
 *  - Header en la fila: Código SAP | Descripción | Marca | Negocio global |
 *    A/B/M | Codigo Parte B | Contenido (L) | Costo por unidad | Moneda |
 *    Estado | Costo CKM3 AR$ Pieza | Costo CKM3 USD Pieza | Costo CKM3 USD Ltr
 *  - Clasificación A/B/M: A = Parte A (base) de un producto 2K, B = Parte B
 *    de un producto 2K, M = mono-componente (1K) — dentro de "M" están
 *    también los colorantes (Marca = "COLORANTE").
 *  - Columna "Codigo Parte B": en filas A, el código SAP del envase de
 *    Parte B que se usa junto con ese envase de Base ("kit" de tamaños
 *    apareados) — se guarda como vínculo Base->Parte B en vez de asumir
 *    un ratio de mezcla inventado.
 *  - Estado puede ser "OK" o "SIN COSTO": en este último caso el
 *    componente se registra igual en el maestro, pero SIN crear un
 *    costo (no se inventa un valor).
 *
 * SUPUESTO A CONFIRMAR CON EL USUARIO: existen dos costos paralelos por
 * envase — "Costo por unidad" (en la moneda declarada) y "Costo CKM3 USD
 * Pieza/Ltr" (costeo estándar SAP, ya normalizado a USD y a litro). Por
 * defecto se usa "Costo CKM3 USD Ltr" (PER_LITER, evita matemática de
 * envase y conversión de moneda) — configurable con `costSource`.
 */

export type SapCostSource = "CKM3_USD_LTR" | "COSTO_UNIDAD";

const REQUIRED_HEADERS = ["Código SAP", "A/B/M", "Codigo Parte B"];

export function detectSapCostMaster(sheet: ParsedSheet): { headerRow: number } | null {
  for (let r = 0; r < Math.min(sheet.rows.length, 10); r++) {
    const row = sheet.rows[r].map((c) => cellText(c));
    if (REQUIRED_HEADERS.every((h) => row.includes(h))) {
      return { headerRow: r };
    }
  }
  return null;
}

export function parseSapCostMasterSheet(
  fileName: string,
  sheet: ParsedSheet,
  costSource: SapCostSource = "CKM3_USD_LTR"
): CostMasterParseOutcome {
  const issues: RowIssue[] = [];
  const detected = detectSapCostMaster(sheet);
  if (!detected) {
    issues.push({ fileName, severity: "ERROR", message: "No se reconoció el formato de planilla maestra SAP (Materiales IP)." });
    return { rows: [], issues };
  }

  const rows = sheet.rows;
  const header = rows[detected.headerRow].map((c) => cellText(c));
  const col = (name: string) => header.indexOf(name);
  const idx = {
    sap: col("Código SAP"),
    desc: col("Descripción"),
    marca: col("Marca"),
    abm: col("A/B/M"),
    partB: col("Codigo Parte B"),
    contenido: col("Contenido (L)"),
    costoUnidad: col("Costo por unidad"),
    moneda: col("Moneda"),
    estado: col("Estado"),
    ckm3UsdPieza: col("Costo CKM3 USD Pieza"),
    ckm3UsdLtr: col("Costo CKM3 USD Ltr"),
    fecha: col("Fecha de actualización") >= 0 ? col("Fecha de actualización") : -1,
  };

  const parsed: ParsedComponentCostRow[] = [];

  for (let r = detected.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const code = cellText(row[idx.sap]);
    if (!code) continue; // fin de datos / fila en blanco

    const description = cellText(row[idx.desc]) || code;
    const marca = cellText(row[idx.marca]);
    const abm = cellText(row[idx.abm]).toUpperCase();
    const partBRaw = cellText(row[idx.partB]);
    const linkedPartBCode = partBRaw && partBRaw !== "---" ? partBRaw : undefined;
    const contenido = cellNumber(row[idx.contenido]);
    const estado = cellText(row[idx.estado]).toUpperCase();

    let type: ParsedComponentCostRow["type"];
    if (abm === "A") type = "BASE";
    else if (abm === "B") type = "PART_B";
    else if (abm === "M") type = marca.toUpperCase() === "COLORANTE" ? "CONCENTRATE" : "BASE";
    else {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Valor de columna A/B/M desconocido: "${abm}".` });
      continue;
    }

    if (estado === "SIN COSTO") {
      parsed.push({
        code,
        description,
        type,
        hasCost: false,
        baseUnit: "L",
        packageSize: contenido !== null ? String(contenido) : undefined,
        packageUnit: "L",
        linkedPartBCode,
      });
      issues.push({
        fileName,
        rowRef: code,
        severity: "WARNING",
        message: `"${description}" figura como SIN COSTO en el origen: se registra el componente sin costo (no se inventa un valor).`,
      });
      continue;
    }

    if (estado !== "OK") {
      issues.push({ fileName, rowRef: code, severity: "WARNING", message: `Estado desconocido "${estado}" para ${description}; se procesa igual.` });
    }

    let amount: number | null;
    let currency: CurrencyCode;
    let costBasis: ParsedComponentCostRow["costBasis"];
    let packageSize: number | null = contenido;

    if (costSource === "CKM3_USD_LTR") {
      amount = cellNumber(row[idx.ckm3UsdLtr]);
      currency = "USD";
      costBasis = "PER_LITER";
    } else {
      amount = cellNumber(row[idx.costoUnidad]);
      const monedaRaw = cellText(row[idx.moneda]).toUpperCase();
      currency = (monedaRaw || "USD") as CurrencyCode;
      costBasis = "PER_PACKAGE";
    }

    if (amount === null) {
      issues.push({
        fileName,
        rowRef: code,
        severity: "ERROR",
        message: `No se pudo leer el costo (${costSource}) para ${description}; fila rechazada.`,
      });
      continue;
    }
    if (costBasis === "PER_PACKAGE" && (packageSize === null || packageSize <= 0)) {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Falta "Contenido (L)" válido para calcular el costo por envase de ${description}.` });
      continue;
    }

    parsed.push({
      code,
      description,
      type,
      hasCost: true,
      amount: String(amount),
      currency,
      costBasis,
      packageSize: packageSize !== null ? String(packageSize) : undefined,
      packageUnit: "L",
      baseUnit: "L",
      linkedPartBCode,
    });
  }

  return { rows: parsed, issues };
}
