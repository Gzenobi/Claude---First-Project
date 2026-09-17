import { cellText, cellNumber, type ParsedSheet } from "../lib/excel.js";
import type { CostMasterParseOutcome, ParsedComponentCostRow, RowIssue } from "./types.js";
import type { CurrencyCode } from "../lib/types.js";

/**
 * Parser para el formato real de planilla maestra de costos de AkzoNobel/
 * International Paint analizado en la planilla "Costeo_Colores_-_DATOS_IP"
 * (hoja "Materiales IP"). Estructura observada:
 *
 *  - Header en la fila: Código SAP | [CODIGO IP] | Descripción | Marca |
 *    Negocio global | A/B/M | Codigo Parte B | Contenido (L) |
 *    Costo por unidad | Moneda | Estado | Costo CKM3 AR$ Pieza |
 *    Costo CKM3 USD Pieza | Costo CKM3 USD Ltr
 *  - Clasificación A/B/M: A = Parte A (base) de un producto 2K, B = Parte B
 *    de un producto 2K, M = mono-componente (1K) — dentro de "M" están
 *    también los colorantes (Marca = "COLORANTE"/"CONCENTRADO").
 *  - "Estado" puede ser "OK", "SIN COSTO" o venir en blanco. En blanco se
 *    trata como válido (aparece así en la mayoría de los colorantes reales)
 *    — solo "SIN COSTO" bloquea la creación de costo.
 *
 * CODIGO IP (agregado por el usuario en una segunda versión del archivo):
 * es el código que las fórmulas de color realmente referencian (tanto para
 * bases como para concentrados) — confirmado contra una fórmula real
 * (PHG590: Base "PHA100" = "INTERTHANE 990 BASE FORTE"). Se usa como
 * `Component.code` cuando la columna existe; si no existe, se cae de
 * vuelta al Código SAP (comportamiento anterior), para no romper archivos
 * que todavía no la incluyan.
 *
 * DOS ENVASES POR MATERIAL, NO UNA AMBIGÜEDAD (confirmado por el usuario):
 * Base y Parte B vienen siempre en dos presentaciones — la mayor para el
 * conjunto de 20 L, la menor para el de 3,6 L (ej. PHA100 en 15,08 L y
 * 2,72 L; su Parte B vinculada PHA046 en 2,83 L y 0,51 L). No se colapsan
 * a un único "costo vigente": se conserva un `ComponentCost` por tamaño, y
 * `FormulaService` elige el que corresponde según el volumen comercial de
 * la fórmula que se está costeando (ver §1.5/§1.6 del README).
 *
 * Lo que SÍ es una ambigüedad real y se resuelve con un desempate explícito
 * (nunca promediando): dos filas SAP con el MISMO tamaño de envase y costos
 * distintos para el mismo CODIGO IP — visto en los datos reales para
 * GVA147 (dos entradas de 4 L con costos diferentes).
 */

export type SapCostSource = "CKM3_USD_LTR" | "COSTO_UNIDAD";

const REQUIRED_HEADERS = ["Código SAP", "A/B/M", "Codigo Parte B"];
const CODIGO_IP_HEADER = "CODIGO IP";

export function detectSapCostMaster(sheet: ParsedSheet): { headerRow: number } | null {
  for (let r = 0; r < Math.min(sheet.rows.length, 10); r++) {
    const row = sheet.rows[r].map((c) => cellText(c));
    if (REQUIRED_HEADERS.every((h) => row.includes(h))) {
      return { headerRow: r };
    }
  }
  return null;
}

interface RawRow {
  sapCode: string;
  ipCode: string | null; // null si el archivo no trae la columna CODIGO IP
  description: string;
  marca: string;
  abm: string;
  partBSapCode: string | null;
  contenido: number | null;
  estado: string;
  amount: number | null;
  currency: CurrencyCode;
  costBasis: "PER_PACKAGE" | "PER_LITER";
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
    ip: col(CODIGO_IP_HEADER),
    desc: col("Descripción"),
    marca: col("Marca"),
    abm: col("A/B/M"),
    partB: col("Codigo Parte B"),
    contenido: col("Contenido (L)"),
    costoUnidad: col("Costo por unidad"),
    moneda: col("Moneda"),
    estado: col("Estado"),
    ckm3UsdLtr: col("Costo CKM3 USD Ltr"),
  };
  const hasIpColumn = idx.ip >= 0;

  // --- Pasada 1: leer todas las filas crudas + mapa sapCode -> ipCode -----
  const rawRows: RawRow[] = [];
  const sapToIp = new Map<string, string>();

  for (let r = detected.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const sapCode = cellText(row[idx.sap]);
    if (!sapCode) continue; // fin de datos / fila en blanco

    const ipCodeRaw = hasIpColumn ? cellText(row[idx.ip]) : "";
    const ipCode = ipCodeRaw || null;
    if (ipCode) sapToIp.set(sapCode, ipCode);

    const partBRaw = cellText(row[idx.partB]);
    const contenido = cellNumber(row[idx.contenido]);
    const estado = cellText(row[idx.estado]).toUpperCase();

    let amount: number | null;
    let currency: CurrencyCode;
    let costBasis: "PER_PACKAGE" | "PER_LITER";
    if (costSource === "CKM3_USD_LTR") {
      amount = cellNumber(row[idx.ckm3UsdLtr]);
      currency = "USD";
      costBasis = "PER_LITER";
    } else {
      amount = cellNumber(row[idx.costoUnidad]);
      currency = (cellText(row[idx.moneda]).toUpperCase() || "USD") as CurrencyCode;
      costBasis = "PER_PACKAGE";
    }

    rawRows.push({
      sapCode,
      ipCode,
      description: cellText(row[idx.desc]) || sapCode,
      marca: cellText(row[idx.marca]),
      abm: cellText(row[idx.abm]).toUpperCase(),
      partBSapCode: partBRaw && partBRaw !== "---" ? partBRaw : null,
      contenido,
      estado,
      amount,
      currency,
      costBasis,
    });
  }

  // --- Pasada 2: agrupar por identificador final (CODIGO IP si existe, si no Código SAP) ---
  const groupKey = (r: RawRow) => r.ipCode ?? r.sapCode;
  const groups = new Map<string, RawRow[]>();
  for (const r of rawRows) {
    const key = groupKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const parsed: ParsedComponentCostRow[] = [];

  for (const [code, group] of groups) {
    const first = group[0];

    let type: ParsedComponentCostRow["type"];
    if (first.abm === "A") type = "BASE";
    else if (first.abm === "B") type = "PART_B";
    else if (first.abm === "M" || first.abm === "") {
      type = first.marca.toUpperCase().startsWith("COLOR") || first.marca.toUpperCase().startsWith("CONCENTRAD") ? "CONCENTRATE" : "BASE";
    } else {
      issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Valor de columna A/B/M desconocido: "${first.abm}" para ${code}.` });
      continue;
    }

    const inconsistentType = group.some((r) => {
      const t = r.abm === "A" ? "BASE" : r.abm === "B" ? "PART_B" : "OTHER";
      return t !== "OTHER" && t !== type;
    });
    if (inconsistentType) {
      issues.push({
        fileName,
        rowRef: code,
        severity: "WARNING",
        message: `El código ${code} aparece con clasificaciones A/B/M inconsistentes entre sus filas; se usó "${type}".`,
      });
    }

    // Sub-agrupar por tamaño de envase: cada tamaño distinto es una
    // presentación legítima (ver nota de cabecera), no una alternativa a
    // descartar. Redondeado a 6 decimales para tolerar ruido de punto
    // flotante; null (sin Contenido) es su propio grupo.
    const sizeKey = (r: RawRow) => (r.contenido === null ? "∅" : r.contenido.toFixed(6));
    const bySize = new Map<string, RawRow[]>();
    for (const r of group) {
      const key = sizeKey(r);
      const list = bySize.get(key) ?? [];
      list.push(r);
      bySize.set(key, list);
    }

    for (const sizeGroup of bySize.values()) {
      // Dentro de un mismo tamaño, sí puede haber un conflicto real (mismo
      // envase, costos distintos, ej. GVA147): se elige uno de forma
      // determinística (con costo válido primero, luego el último del
      // archivo) y se informan las alternativas descartadas.
      const withCost = sizeGroup.filter((r) => r.estado !== "SIN COSTO" && r.amount !== null);
      const candidates = withCost.length > 0 ? withCost : sizeGroup;
      const canonical = candidates[candidates.length - 1];

      if (sizeGroup.length > 1) {
        const alternates = sizeGroup
          .filter((r) => r !== canonical)
          .map((r) => `SAP ${r.sapCode} (${r.amount === null ? "sin costo" : `$${r.amount}`})`)
          .join("; ");
        issues.push({
          fileName,
          rowRef: code,
          severity: "WARNING",
          message: `${code} tiene ${sizeGroup.length} filas SAP con el mismo envase (${canonical.contenido ?? "?"}L) y costos que no coinciden; se usó SAP ${canonical.sapCode}. Alternativas no usadas: ${alternates}. Verifique cuál es correcta en el origen.`,
        });
      }

      const linkedPartBCode = canonical.partBSapCode ? sapToIp.get(canonical.partBSapCode) ?? canonical.partBSapCode : undefined;
      if (canonical.partBSapCode && hasIpColumn && !sapToIp.has(canonical.partBSapCode)) {
        issues.push({
          fileName,
          rowRef: code,
          severity: "WARNING",
          message: `No se encontró el código IP correspondiente al SAP de Parte B "${canonical.partBSapCode}" referenciado por ${code}; se usará el código SAP tal cual.`,
        });
      }

      if (canonical.estado === "SIN COSTO" || canonical.amount === null) {
        parsed.push({
          code,
          description: canonical.description,
          type,
          hasCost: false,
          baseUnit: "L",
          packageSize: canonical.contenido !== null ? String(canonical.contenido) : undefined,
          packageUnit: "L",
          linkedPartBCode,
          sapCode: canonical.sapCode,
        });
        issues.push({
          fileName,
          rowRef: code,
          severity: "WARNING",
          message: `"${canonical.description}" (${code}, envase ${canonical.contenido ?? "?"}L) figura sin costo utilizable en el origen: se registra sin costo (no se inventa un valor).`,
        });
        continue;
      }

      if (canonical.costBasis === "PER_PACKAGE" && (canonical.contenido === null || canonical.contenido <= 0)) {
        issues.push({ fileName, rowRef: code, severity: "ERROR", message: `Falta "Contenido (L)" válido para calcular el costo por envase de ${canonical.description} (${code}).` });
        continue;
      }

      parsed.push({
        code,
        description: canonical.description,
        type,
        hasCost: true,
        amount: String(canonical.amount),
        currency: canonical.currency,
        costBasis: canonical.costBasis,
        packageSize: canonical.contenido !== null ? String(canonical.contenido) : undefined,
        packageUnit: "L",
        baseUnit: "L",
        linkedPartBCode,
        sapCode: canonical.sapCode,
      });
    }
  }

  return { rows: parsed, issues };
}
