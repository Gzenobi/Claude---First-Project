import Decimal from "decimal.js";
import { convertQuantity, unitFamily } from "../lib/units.js";
import type {
  ComponentCostInput,
  FormulaLineInput,
  LineCostResult,
  ProductKind,
} from "../lib/types.js";

/**
 * Motor de costeo centralizado. Funciones puras y testeables — nada de
 * lógica financiera vive en componentes React ni en las rutas Express.
 */

/** Costo del componente por unidad de la línea de fórmula (misma moneda que el costo). */
export function resolveUnitCost(
  cost: ComponentCostInput,
  targetUnit: FormulaLineInput["unit"],
  densityKgPerL?: string
): { ok: true; value: Decimal } | { ok: false; error: string } {
  const density = densityKgPerL ? new Decimal(densityKgPerL) : undefined;
  const amount = new Decimal(cost.amount);

  let costFamilyUnit: FormulaLineInput["unit"];
  let valuePerBaseUnit: Decimal;

  if (cost.costBasis === "PER_LITER") {
    costFamilyUnit = "L";
    valuePerBaseUnit = amount;
  } else if (cost.costBasis === "PER_KG") {
    costFamilyUnit = "KG";
    valuePerBaseUnit = amount;
  } else {
    if (!cost.packageSize || !cost.packageUnit) {
      return {
        ok: false,
        error:
          "Costo declarado por envase pero falta tamaño o unidad del envase.",
      };
    }
    const packageSize = new Decimal(cost.packageSize);
    if (packageSize.isZero()) {
      return { ok: false, error: "El tamaño de envase no puede ser cero." };
    }
    costFamilyUnit = cost.packageUnit;
    // costo por unidad "base" de su propia familia (L o KG)
    const packageFamily = unitFamily(cost.packageUnit);
    const baseUnit = packageFamily === "VOLUME" ? "L" : "KG";
    const sizeInBase = convertQuantity(packageSize, cost.packageUnit, baseUnit);
    if (!sizeInBase.ok) return sizeInBase;
    valuePerBaseUnit = amount.div(sizeInBase.value);
    costFamilyUnit = baseUnit;
  }

  const converted = convertQuantity(new Decimal(1), costFamilyUnit, targetUnit, density);
  if (!converted.ok) return converted;
  // converted.value = cuántas `targetUnit` equivalen a 1 `costFamilyUnit`
  // costo por targetUnit = valuePerBaseUnit / converted.value
  if (converted.value.isZero()) {
    return { ok: false, error: "Factor de conversión inválido (cero)." };
  }
  return { ok: true, value: valuePerBaseUnit.div(converted.value) };
}

/** Aplica costo a una sola línea de fórmula (base, un concentrado, o parte B). */
export function calculateLineCost(line: FormulaLineInput): LineCostResult {
  const base: Omit<LineCostResult, "unitCost" | "appliedCost" | "currency" | "ok" | "error"> = {
    componentId: line.componentId,
    code: line.code,
    description: line.description,
    role: line.role,
    quantity: line.quantity,
    unit: line.unit,
  };

  if (!line.cost) {
    return {
      ...base,
      unitCost: null,
      appliedCost: "0",
      currency: null,
      ok: false,
      error: `Sin costo disponible para el componente ${line.code}.`,
    };
  }

  const resolved = resolveUnitCost(line.cost, line.unit, line.density);
  if (!resolved.ok) {
    return {
      ...base,
      unitCost: null,
      appliedCost: "0",
      currency: line.cost.currency,
      ok: false,
      error: resolved.error,
    };
  }

  const qty = new Decimal(line.quantity);
  const applied = qty.mul(resolved.value);
  return {
    ...base,
    unitCost: resolved.value.toString(),
    appliedCost: applied.toString(),
    currency: line.cost.currency,
    ok: true,
  };
}

/** Costo de la base (una sola línea con role === "BASE"). */
export function calculateBaseCost(baseLine: FormulaLineInput): LineCostResult {
  return calculateLineCost(baseLine);
}

/** Costo total de concentrados (1..N líneas con role === "CONCENTRATE"). */
export function calculateTintCost(tintLines: FormulaLineInput[]): {
  total: Decimal;
  lines: LineCostResult[];
  ok: boolean;
} {
  const lines = tintLines.map(calculateLineCost);
  const total = lines.reduce((acc, l) => acc.add(new Decimal(l.appliedCost)), new Decimal(0));
  return { total, lines, ok: lines.every((l) => l.ok) };
}

/** Costo de Parte B (productos 2K). */
export function calculatePartBCost(partBLine: FormulaLineInput | null): {
  result: LineCostResult | null;
  total: Decimal;
} {
  if (!partBLine) return { result: null, total: new Decimal(0) };
  const result = calculateLineCost(partBLine);
  return { result, total: new Decimal(result.appliedCost) };
}

/** Costo total del conjunto/envase, según 1K o 2K. */
export function calculateTotalCost(params: {
  productKind: ProductKind;
  baseCost: Decimal;
  concentrateCost: Decimal;
  partBCost: Decimal;
}): Decimal {
  const { productKind, baseCost, concentrateCost, partBCost } = params;
  const partA = baseCost.add(concentrateCost);
  return productKind === "TWO_K" ? partA.add(partBCost) : partA;
}

/**
 * Costo por litro del producto terminado.
 * Requiere el volumen comercial expresado en litros — si el volumen
 * comercial está en otra unidad de masa sin densidad, debe fallar
 * explícitamente en vez de asumir una equivalencia.
 */
export function calculateCostPerLiter(params: {
  totalCost: Decimal;
  commercialVolume: string;
  commercialVolumeUnit: FormulaLineInput["unit"];
  densityKgPerL?: string;
}): { ok: true; value: Decimal; liters: Decimal } | { ok: false; error: string } {
  const { totalCost, commercialVolume, commercialVolumeUnit, densityKgPerL } = params;
  const density = densityKgPerL ? new Decimal(densityKgPerL) : undefined;
  const qty = new Decimal(commercialVolume);
  const converted = convertQuantity(qty, commercialVolumeUnit, "L", density);
  if (!converted.ok) return converted;
  if (converted.value.isZero()) {
    return { ok: false, error: "El volumen comercial del conjunto no puede ser cero." };
  }
  return { ok: true, value: totalCost.div(converted.value), liters: converted.value };
}

export interface CostBreakdown {
  baseCost: Decimal;
  concentrateCost: Decimal;
  partBCost: Decimal;
  totalCostPerSet: Decimal;
  costPerLiter: Decimal | null;
  setSizeLiters: Decimal | null;
  lines: LineCostResult[];
  isIncomplete: boolean;
  incompleteReason: string | null;
}

/** Orquesta el cálculo completo de un color: base + concentrados (+ parte B). */
export function computeFullCost(params: {
  productKind: ProductKind;
  baseLine: FormulaLineInput;
  tintLines: FormulaLineInput[];
  partBLine: FormulaLineInput | null;
  commercialVolume: string;
  commercialVolumeUnit: FormulaLineInput["unit"];
  commercialVolumeDensity?: string;
}): CostBreakdown {
  const baseResult = calculateBaseCost(params.baseLine);
  const tintResult = calculateTintCost(params.tintLines);
  const partBResult = calculatePartBCost(params.partBLine);

  const baseCost = new Decimal(baseResult.appliedCost);
  const totalCostPerSet = calculateTotalCost({
    productKind: params.productKind,
    baseCost,
    concentrateCost: tintResult.total,
    partBCost: partBResult.total,
  });

  const lines = [baseResult, ...tintResult.lines, ...(partBResult.result ? [partBResult.result] : [])];
  const missingCostLines = lines.filter((l) => !l.ok);

  let costPerLiter: Decimal | null = null;
  let setSizeLiters: Decimal | null = null;
  let incompleteReason: string | null = null;

  if (missingCostLines.length > 0) {
    incompleteReason = missingCostLines.map((l) => l.error).join(" ");
  } else {
    const perLiter = calculateCostPerLiter({
      totalCost: totalCostPerSet,
      commercialVolume: params.commercialVolume,
      commercialVolumeUnit: params.commercialVolumeUnit,
      densityKgPerL: params.commercialVolumeDensity,
    });
    if (perLiter.ok) {
      costPerLiter = perLiter.value;
      setSizeLiters = perLiter.liters;
    } else {
      incompleteReason = perLiter.error;
    }
  }

  return {
    baseCost,
    concentrateCost: tintResult.total,
    partBCost: partBResult.total,
    totalCostPerSet,
    costPerLiter,
    setSizeLiters,
    lines,
    isIncomplete: missingCostLines.length > 0 || costPerLiter === null,
    incompleteReason,
  };
}
