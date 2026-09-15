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
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
    return { sheetName, rows };
  });
  return { fileName, sheets };
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
