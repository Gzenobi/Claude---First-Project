import Decimal from "decimal.js";
import type { Unit, UnitFamily } from "./types.js";

const VOLUME_TO_LITERS: Record<Extract<Unit, "L" | "ML">, Decimal> = {
  L: new Decimal(1),
  ML: new Decimal(0.001),
};

const MASS_TO_KG: Record<Extract<Unit, "KG" | "G">, Decimal> = {
  KG: new Decimal(1),
  G: new Decimal(0.001),
};

export function unitFamily(unit: Unit): UnitFamily {
  return unit === "L" || unit === "ML" ? "VOLUME" : "MASS";
}

/** Factor para llevar `unit` a la unidad base de su familia (L para volumen, KG para masa). */
export function toBaseFactor(unit: Unit): Decimal {
  return unitFamily(unit) === "VOLUME"
    ? VOLUME_TO_LITERS[unit as "L" | "ML"]
    : MASS_TO_KG[unit as "KG" | "G"];
}

export interface ConversionResult {
  ok: true;
  value: Decimal;
}
export interface ConversionError {
  ok: false;
  error: string;
}

/**
 * Convierte una cantidad entre unidades. Dentro de la misma familia (L<->ML,
 * KG<->G) es una conversión exacta. Entre familias (volumen<->masa) requiere
 * densidad (kg/L) explícita — NUNCA se asume ni se inventa una densidad.
 */
export function convertQuantity(
  quantity: Decimal,
  fromUnit: Unit,
  toUnit: Unit,
  densityKgPerL?: Decimal | null
): ConversionResult | ConversionError {
  const fromFamily = unitFamily(fromUnit);
  const toFamily = unitFamily(toUnit);

  if (fromFamily === toFamily) {
    const inBase = quantity.mul(toBaseFactor(fromUnit));
    const value = inBase.div(toBaseFactor(toUnit));
    return { ok: true, value };
  }

  if (!densityKgPerL || densityKgPerL.isZero()) {
    return {
      ok: false,
      error: `No se puede convertir ${fromUnit} → ${toUnit} sin densidad conocida (masa ↔ volumen).`,
    };
  }

  if (fromFamily === "VOLUME" && toFamily === "MASS") {
    const liters = quantity.mul(toBaseFactor(fromUnit));
    const kg = liters.mul(densityKgPerL);
    return { ok: true, value: kg.div(toBaseFactor(toUnit)) };
  }

  // fromFamily === "MASS" && toFamily === "VOLUME"
  const kg = quantity.mul(toBaseFactor(fromUnit));
  const liters = kg.div(densityKgPerL);
  return { ok: true, value: liters.div(toBaseFactor(toUnit)) };
}
