import Decimal from "decimal.js";

/** Redondeo SOLO para presentación (exportes, UI); el cálculo interno conserva precisión completa. */
export function fmtTotal(value: Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Decimal(value).toFixed(2);
}

export function fmtUnitCost(value: Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Decimal(value).toFixed(4);
}

export function fmtPct(value: Decimal | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return `${new Decimal(value).mul(100).toFixed(2)}%`;
}
