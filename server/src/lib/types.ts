// Tipos de dominio del motor de costeo — independientes de Prisma para
// que el engine sea puro y 100% testeable (ver server/src/__tests__).

export type Unit = "L" | "ML" | "KG" | "G";
export type UnitFamily = "VOLUME" | "MASS";
export type CurrencyCode = "USD" | "EUR" | "ARS";
export type CostBasis = "PER_PACKAGE" | "PER_LITER" | "PER_KG";
export type ComponentRole = "BASE" | "CONCENTRATE" | "PART_B";
export type ProductKind = "ONE_K" | "TWO_K";

export interface ComponentCostInput {
  componentId: string;
  amount: string; // Decimal as string (evita errores de precisión flotante en la frontera)
  currency: CurrencyCode;
  costBasis: CostBasis;
  packageSize?: string; // requerido si costBasis === PER_PACKAGE
  packageUnit?: Unit; // requerido si costBasis === PER_PACKAGE
}

export interface FormulaLineInput {
  componentId: string;
  code: string;
  description: string;
  role: ComponentRole;
  quantity: string;
  unit: Unit;
  density?: string; // kg/L — SOLO si fue provisto explícitamente en el maestro de componentes
  cost?: ComponentCostInput; // undefined => sin costo disponible (bloquea el cálculo)
}

/** Resultado de aplicar costo a una línea de fórmula (base, un concentrado, o parte B). */
export interface LineCostResult {
  componentId: string;
  code: string;
  description: string;
  role: ComponentRole;
  quantity: string;
  unit: Unit;
  unitCost: string | null; // costo por unidad, en la moneda del costo, en la unidad de la línea
  appliedCost: string; // quantity * unitCost, o "0" si hubo error
  currency: CurrencyCode | null;
  ok: boolean;
  error?: string;
}

export class CalcError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
