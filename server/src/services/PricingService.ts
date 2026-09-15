import Decimal from "decimal.js";

/**
 * "Contribución" = margen de contribución sobre el precio de venta:
 *   Contribución % = (Precio de Venta - Costo) / Precio de Venta
 *   Precio de Venta = Costo / (1 - Contribución %)
 * Deliberadamente NO se usa Costo * (1 + markup): un markup del 50% y una
 * contribución del 50% dan resultados distintos.
 */

export function calculateSellingPrice(cost: Decimal, contributionPct: Decimal): Decimal {
  if (contributionPct.gte(1)) {
    throw new Error("La contribución no puede ser 100% o mayor (precio infinito/negativo).");
  }
  return cost.div(new Decimal(1).sub(contributionPct));
}

export function calculateContributionMargin(cost: Decimal, price: Decimal): Decimal {
  if (price.isZero()) {
    throw new Error("El precio de venta no puede ser cero al calcular la contribución.");
  }
  return price.sub(cost).div(price);
}

export interface ContributionScenario {
  contributionPct: string;
  sellingPrice: string;
  profit: string;
}

const DEFAULT_SCENARIOS = ["0.40", "0.45", "0.50", "0.55", "0.60"];

/** Tabla comparativa del simulador de contribución (40/45/50/55/60% por defecto). */
export function buildContributionScenarios(
  cost: Decimal,
  scenarios: string[] = DEFAULT_SCENARIOS
): ContributionScenario[] {
  return scenarios.map((pctStr) => {
    const pct = new Decimal(pctStr);
    const price = calculateSellingPrice(cost, pct);
    return {
      contributionPct: pctStr,
      sellingPrice: price.toString(),
      profit: price.sub(cost).toString(),
    };
  });
}

export interface PricingResult {
  costPerLiter: Decimal;
  costPerSet: Decimal;
  contributionPct: Decimal;
  sellingPricePerLiter: Decimal;
  sellingPricePerSet: Decimal;
  profitPerLiter: Decimal;
  profitPerSet: Decimal;
}

export function priceFromCost(params: {
  costPerLiter: Decimal;
  costPerSet: Decimal;
  contributionPct: Decimal;
}): PricingResult {
  const sellingPricePerLiter = calculateSellingPrice(params.costPerLiter, params.contributionPct);
  const sellingPricePerSet = calculateSellingPrice(params.costPerSet, params.contributionPct);
  return {
    costPerLiter: params.costPerLiter,
    costPerSet: params.costPerSet,
    contributionPct: params.contributionPct,
    sellingPricePerLiter,
    sellingPricePerSet,
    profitPerLiter: sellingPricePerLiter.sub(params.costPerLiter),
    profitPerSet: sellingPricePerSet.sub(params.costPerSet),
  };
}
