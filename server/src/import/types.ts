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
  /** false cuando el origen declara explícitamente "sin costo" (ej. Estado=SIN COSTO): el
   * componente se registra en el maestro igual, pero sin crear un ComponentCost. */
  hasCost: boolean;
  amount?: string;
  currency?: "USD" | "EUR" | "ARS";
  costBasis?: "PER_PACKAGE" | "PER_LITER" | "PER_KG";
  packageSize?: string;
  packageUnit?: Unit;
  effectiveDate?: string;
  density?: string;
  baseUnit: Unit;
  /** Código (en el propio sistema de origen) del envase de Parte B que acompaña a este
   * envase de Base, cuando el origen lo declara (ej. columna "Codigo Parte B" SAP). */
  linkedPartBCode?: string;
  /** Código del sistema de origen (ej. SAP) del envase específico que produjo este costo,
   * cuando el código del componente (`code`) es un identificador distinto (ej. "CODIGO IP"). */
  sapCode?: string;
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
