import Papa from "papaparse";
import * as XLSX from "xlsx";

export function downloadAsXlsx(rows: Record<string, unknown>[], fileName: string): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function downloadAsCsv(rows: Record<string, unknown>[], fileName: string): void {
  const csv = Papa.unparse(rows);
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${fileName}.csv`);
}

export function downloadAsJson(rows: Record<string, unknown>[], fileName: string): void {
  const json = JSON.stringify(rows, null, 2);
  triggerDownload(new Blob([json], { type: "application/json" }), `${fileName}.json`);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
