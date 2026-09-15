import type { Unit } from "../lib/types.js";

export interface ParsedConcentrateLine {
  code: string;
  quantity: string;
  unit: Unit;
}

export interface ParsedFormulaRow {
  sourceFileName: string;
  sheetName: string;
  productCode: string;
  productName: string;
  colorCode: string;
  colorName?: string;
  colorStandard?: string;
  baseCode: string;
  baseQuantity: string;
  baseUnit: Unit;
  baseQuantityBasis: "EXPLICIT" | "FILL_TO_VOLUME";
  concentrates: ParsedConcentrateLine[];
  batchVolume: string;
  batchVolumeUnit: Unit;
  commercialVolume: string;
  commercialVolumeUnit: Unit;
  version?: string;
  warnings: string[];
}

export interface RowIssue {
  fileName: string;
  rowRef?: string;
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface FormulaParseOutcome {
  formulas: ParsedFormulaRow[];
  issues: RowIssue[];
}

export interface ParsedComponentCostRow {
  code: string;
  description: string;
  type: "BASE" | "CONCENTRATE" | "PART_B";
  amount: string;
  currency: "USD" | "EUR" | "ARS";
  costBasis: "PER_PACKAGE" | "PER_LITER" | "PER_KG";
  packageSize?: string;
  packageUnit?: Unit;
  effectiveDate?: string;
  density?: string;
  baseUnit: Unit;
}

export interface CostMasterParseOutcome {
  rows: ParsedComponentCostRow[];
  issues: RowIssue[];
}

export type ColumnMapping = Record<string, string>; // campo del sistema -> nombre de columna en el Excel

export interface FormulaColumnTemplate {
  headerRow: number;
  columns: {
    productCode: string;
    productName?: string;
    colorCode: string;
    colorName?: string;
    baseCode: string;
    baseQuantity: string;
    baseUnit: string;
    tintCode: string;
    tintQuantity: string;
    tintUnit?: string;
    commercialVolume?: string;
    commercialVolumeUnit?: string;
  };
  defaultUnit?: Unit;
}

export interface CostMasterColumnTemplate {
  headerRow: number;
  columns: {
    code: string;
    description: string;
    type: string;
    cost: string;
    currency?: string;
    costBasis?: string; // ej. columna con "USD/L", "USD/KG", o vacío => PER_PACKAGE
    packageSize?: string;
    packageUnit?: string;
    costPerLiter?: string;
    effectiveDate?: string;
    density?: string;
  };
  defaultCurrency?: "USD" | "EUR" | "ARS";
}
