import { Router } from "express";
import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getPricingForFormula } from "../services/FormulaService.js";

export const formulasRouter = Router();

formulasRouter.get(
  "/:id/pricing",
  asyncHandler(async (req, res) => {
    const contribution = (req.query.contribution as string) ?? undefined;
    let pct = contribution;
    if (!pct) {
      const settings = await prisma.setting.findUnique({ where: { id: 1 } });
      pct = settings ? settings.defaultContributionPct.toString() : "0.5";
    }
    const result = await getPricingForFormula(req.params.id, pct);
    res.json({
      breakdown: serializeBreakdown(result.breakdown),
      pricing: result.pricing
        ? {
            costPerLiter: result.pricing.costPerLiter.toString(),
            costPerSet: result.pricing.costPerSet.toString(),
            contributionPct: result.pricing.contributionPct.toString(),
            sellingPricePerLiter: result.pricing.sellingPricePerLiter.toString(),
            sellingPricePerSet: result.pricing.sellingPricePerSet.toString(),
            profitPerLiter: result.pricing.profitPerLiter.toString(),
            profitPerSet: result.pricing.profitPerSet.toString(),
          }
        : null,
      scenarios: result.scenarios,
    });
  })
);

function serializeBreakdown(b: Awaited<ReturnType<typeof getPricingForFormula>>["breakdown"]) {
  return {
    formulaId: b.formulaId,
    productId: b.productId,
    productKind: b.productKind,
    colorId: b.colorId,
    currency: b.currency,
    baseCost: b.baseCost.toString(),
    concentrateCost: b.concentrateCost.toString(),
    partBCost: b.partBCost.toString(),
    totalCostPerSet: b.totalCostPerSet.toString(),
    costPerLiter: b.costPerLiter?.toString() ?? null,
    setSizeLiters: b.setSizeLiters?.toString() ?? null,
    isIncomplete: b.isIncomplete,
    incompleteReason: b.incompleteReason,
    baseQuantityBasis: b.baseQuantityBasis,
    formulaWarnings: b.formulaWarnings,
    lines: b.lineResults.map((l) => ({
      componentId: l.componentId,
      code: l.code,
      description: l.description,
      role: l.role,
      quantity: l.quantity,
      unit: l.unit,
      unitCost: l.unitCost,
      appliedCost: l.appliedCost,
      currency: l.currency,
      ok: l.ok,
      error: l.error,
    })),
  };
}

formulasRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      colorId: string;
      baseComponentId: string;
      baseQuantity: string;
      baseUnit: string;
      commercialVolume: string;
      commercialVolumeUnit: string;
      concentrates: { componentId: string; quantity: string; unit: string }[];
      version?: string;
      baseQuantityBasis?: "EXPLICIT" | "FILL_TO_VOLUME";
    };
    const baseQuantityBasis = body.baseQuantityBasis === "FILL_TO_VOLUME" ? "FILL_TO_VOLUME" : "EXPLICIT";

    // Igual que en la importación de fórmulas desde Excel: si el maestro de
    // costos ya vinculó esta base a una Parte B (columna A/B/M = "A" con
    // "Codigo Parte B"), el producto es 2K — se infiere solo, sin que la
    // fórmula manual tenga que declararlo.
    const baseComponent = await prisma.component.findUnique({ where: { id: body.baseComponentId } });
    if (baseComponent?.linkedPartBComponentId) {
      const color = await prisma.color.findUniqueOrThrow({ where: { id: body.colorId }, include: { product: true } });
      if (color.product.kind !== "TWO_K" && !color.product.kindLocked) {
        await prisma.product.update({ where: { id: color.product.id }, data: { kind: "TWO_K" } });
      }
    }

    const formula = await prisma.formula.create({
      data: {
        colorId: body.colorId,
        version: body.version,
        batchVolume: new Decimal(body.commercialVolume),
        batchVolumeUnit: body.commercialVolumeUnit,
        commercialVolume: new Decimal(body.commercialVolume),
        commercialVolumeUnit: body.commercialVolumeUnit,
        baseQuantityBasis,
        components: {
          create: [
            { componentId: body.baseComponentId, role: "BASE", quantity: new Decimal(body.baseQuantity), unit: body.baseUnit, sortOrder: 0 },
            ...body.concentrates.map((c, i) => ({
              componentId: c.componentId,
              role: "CONCENTRATE",
              quantity: new Decimal(c.quantity),
              unit: c.unit,
              sortOrder: i + 1,
            })),
          ],
        },
      },
    });
    res.status(201).json(formula);
  })
);

formulasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.formula.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
