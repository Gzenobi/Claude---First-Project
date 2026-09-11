import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedRow = Record<string, unknown>;

export async function parseImportFile(file: File): Promise<ParsedRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "json") {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("El archivo JSON debe contener un array de registros");
    }
    return parsed as ParsedRow[];
  }

  if (extension === "csv") {
    const text = await file.text();
    const result = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      throw new Error(`Error al parsear CSV: ${result.errors[0]?.message}`);
    }
    return result.data;
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];
    const sheet = workbook.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json<ParsedRow>(sheet ?? {});
  }

  throw new Error("Formato de archivo no soportado. Usá .xlsx, .csv o .json");
}
