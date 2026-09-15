/**
 * Semáforo de validación reutilizado por el motor de costeo y por la
 * importación masiva: Verde = válido, Amarillo = advertencia, Rojo = error.
 */
export type Severity = "OK" | "WARNING" | "ERROR";

export interface ValidationIssue {
  severity: Severity;
  field?: string;
  message: string;
}

export function worstSeverity(issues: ValidationIssue[]): Severity {
  if (issues.some((i) => i.severity === "ERROR")) return "ERROR";
  if (issues.some((i) => i.severity === "WARNING")) return "WARNING";
  return "OK";
}

export function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return !Number.isNaN(Number(value));
}

const KNOWN_UNITS = new Set(["L", "ML", "KG", "G"]);
export function isKnownUnit(unit: string | undefined | null): boolean {
  return !!unit && KNOWN_UNITS.has(unit.toUpperCase());
}
