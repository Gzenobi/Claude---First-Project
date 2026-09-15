import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { computeFullCost } from "./CostingService.js";
import { priceFromCost, buildContributionScenarios } from "./PricingService.js";
import type { ComponentCostInput, FormulaLineInput, ComponentRole, Unit, ProductKind, CurrencyCode } from "../lib/types.js";

async function currentCostInput(componentId: string): Promise<{ input?: ComponentCostInput; componentCostId?: string; costVersionId?: string }> {
  const cost = await prisma.componentCost.findFirst({
    where: { componentId, isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  if (!cost) return {};
  return {
    input: {
      componentId,
      amount: cost.amount.toString(),
      currency: cost.currency as CurrencyCode,
      costBasis: cost.costBasis as ComponentCostInput["costBasis"],
      packageSize: cost.packageSize?.toString(),
      packageUnit: cost.packageUnit as Unit | undefined,
    },
    componentCostId: cost.id,
    costVersionId: cost.costVersionId,
  };
}

export interface FormulaBreakdown {
  formulaId: string;
  productId: string;
  productKind: ProductKind;
  colorId: string;
  currency: CurrencyCode;
  lines: (FormulaLineInput & { componentCostId?: string; costVersionId?: string })[];
  baseCost: Decimal;
  concentrateCost: Decimal;
  partBCost: Decimal;
  totalCostPerSet: Decimal;
  costPerLiter: Decimal | null;
  setSizeLiters: Decimal | null;
  isIncomplete: boolean;
  incompleteReason: string | null;
  lineResults: ReturnType<typeof computeFullCost>["lines"];
  baseQuantityBasis: string;
  formulaWarnings: string[];
}

/** Arma el desglose completo de costos de una fórmula usando los costos vigentes. */
export async function getFormulaBreakdown(formulaId: string): Promise<FormulaBreakdown> {
  const formula = await prisma.formula.findUniqueOrThrow({
    where: { id: formulaId },
    include: {
      color: { include: { product: { include: { partB: { include: { component: true } } } } } },
      components: { include: { component: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const product = formula.color.product;
  const productKind = product.kind as ProductKind;

  const lines: (FormulaLineInput & { componentCostId?: string; costVersionId?: string })[] = [];
  for (const fc of formula.components) {
    const { input, componentCostId, costVersionId } = await currentCostInput(fc.componentId);
    lines.push({
      componentId: fc.componentId,
      code: fc.component.code,
      description: fc.component.description,
      role: fc.role as ComponentRole,
      quantity: fc.quantity.toString(),
      unit: fc.unit as Unit,
      density: fc.component.density?.toString(),
      cost: input,
      componentCostId,
      costVersionId,
    });
  }

  let partBLine: (FormulaLineInput & { componentCostId?: string; costVersionId?: string }) | null = null;
  if (productKind === "TWO_K" && product.partB.length > 0) {
    const link = product.partB[0];
    const { input, componentCostId, costVersionId } = await currentCostInput(link.componentId);

    let quantity: string;
    let unit: Unit;
    if (link.quantityPerSet && link.quantityUnit) {
      quantity = link.quantityPerSet.toString();
      unit = link.quantityUnit as Unit;
    } else if (link.mixRatioA && link.mixRatioB) {
      // Ratio de mezcla sobre el volumen de Parte A (base + concentrados) de esta fórmula
      const partAVolume = formula.components
        .filter((c) => c.unit === "L" || c.unit === "ML")
        .reduce((acc, c) => acc.add(new Decimal(c.quantity).mul(c.unit === "ML" ? 0.001 : 1)), new Decimal(0));
      const ratio = new Decimal(link.mixRatioB.toString()).div(new Decimal(link.mixRatioA.toString()));
      quantity = partAVolume.mul(ratio).toString();
      unit = "L";
    } else {
      quantity = "0";
      unit = "L";
    }

    partBLine = {
      componentId: link.componentId,
      code: link.component.code,
      description: link.component.description,
      role: "PART_B",
      quantity,
      unit,
      density: link.component.density?.toString(),
      cost: input,
      componentCostId,
      costVersionId,
    };
  }

  const baseLine = lines.find((l) => l.role === "BASE");
  const tintLines = lines.filter((l) => l.role === "CONCENTRATE");
  if (!baseLine) {
    throw new Error("La fórmula no tiene una línea de base definida.");
  }

  const breakdown = computeFullCost({
    productKind,
    baseLine,
    tintLines,
    partBLine,
    commercialVolume: formula.commercialVolume.toString(),
    commercialVolumeUnit: formula.commercialVolumeUnit as Unit,
  });

  const currency: CurrencyCode = (baseLine.cost?.currency as CurrencyCode) ?? "USD";
  const allLines = partBLine ? [...lines, partBLine] : lines;

  return {
    formulaId,
    productId: product.id,
    productKind,
    colorId: formula.colorId,
    currency,
    lines: allLines,
    baseCost: breakdown.baseCost,
    concentrateCost: breakdown.concentrateCost,
    partBCost: breakdown.partBCost,
    totalCostPerSet: breakdown.totalCostPerSet,
    costPerLiter: breakdown.costPerLiter,
    setSizeLiters: breakdown.setSizeLiters,
    isIncomplete: breakdown.isIncomplete,
    incompleteReason: breakdown.incompleteReason,
    lineResults: breakdown.lines,
    baseQuantityBasis: formula.baseQuantityBasis,
    formulaWarnings:
      formula.baseQuantityBasis === "FILL_TO_VOLUME"
        ? [
            "La cantidad de base de esta fórmula fue calculada como 'volumen comercial − concentrados' porque el archivo de origen no la declaraba explícitamente.",
          ]
        : [],
  };
}

export async function getPricingForFormula(formulaId: string, contributionPct: string) {
  const breakdown = await getFormulaBreakdown(formulaId);
  if (breakdown.isIncomplete || !breakdown.costPerLiter) {
    return { breakdown, pricing: null, scenarios: [] };
  }
  const pct = new Decimal(contributionPct);
  const pricing = priceFromCost({
    costPerLiter: breakdown.costPerLiter,
    costPerSet: breakdown.totalCostPerSet,
    contributionPct: pct,
  });
  const scenarios = buildContributionScenarios(breakdown.totalCostPerSet);
  return { breakdown, pricing, scenarios };
}
