import * as XLSX from "xlsx";

export type Cell = string | number | null;
export type Row = Cell[];

export interface ParsedSheet {
  sheetName: string;
  rows: Row[];
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

/** Lee un .xlsx/.xls desde un Buffer. Lanza si el archivo está corrupto o no es un Excel válido. */
export function parseWorkbook(fileName: string, buffer: Buffer): ParsedWorkbook {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: true });
  } catch (e) {
    throw new Error(`Archivo corrupto o formato no soportado: ${fileName}`);
  }
  if (!wb.SheetNames.length) {
    throw new Error(`El archivo no contiene hojas: ${fileName}`);
  }
  const sheets: ParsedSheet[] = wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const trimmedRange = actualUsedRange(ws);
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null, range: trimmedRange });
    return { sheetName, rows };
  });
  return { fileName, sheets };
}

/**
 * Algunos exportadores de Excel declaran un `!ref` inflado (ej. hasta la fila
 * 1.048.575) aunque los datos reales ocupen solo unas pocas decenas de filas
 * — leer ese rango completo con `sheet_to_json` materializaría millones de
 * celdas vacías. Se recalcula el rango real a partir de las celdas con datos.
 */
function actualUsedRange(ws: XLSX.WorkSheet): { s: { r: number; c: number }; e: { r: number; c: number } } | undefined {
  let maxRow = -1;
  let minRow = Infinity;
  let minCol = Infinity;
  let maxCol = -1;
  for (const key of Object.keys(ws)) {
    if (key.startsWith("!")) continue;
    const cell = ws[key] as XLSX.CellObject;
    if (cell.v === undefined || cell.v === null || cell.v === "") continue;
    const addr = XLSX.utils.decode_cell(key);
    if (addr.r > maxRow) maxRow = addr.r;
    if (addr.r < minRow) minRow = addr.r;
    if (addr.c > maxCol) maxCol = addr.c;
    if (addr.c < minCol) minCol = addr.c;
  }
  if (maxRow === -1) return undefined; // hoja vacía: dejar que XLSX use el rango declarado
  return { s: { r: minRow, c: minCol }, e: { r: maxRow, c: maxCol } };
}

export function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

export function cellNumber(cell: Cell): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") return cell;
  const cleaned = String(cell).trim().replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Busca la primera fila cuya celda en `col` contenga `label` (case-insensitive, substring). */
export function findRowByLabel(rows: Row[], col: number, label: string): number {
  const needle = label.toLowerCase();
  return rows.findIndex((r) => cellText(r[col]).toLowerCase().includes(needle));
}
