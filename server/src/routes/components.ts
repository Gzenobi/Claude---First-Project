import { Router } from "express";
import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const componentsRouter = Router();

componentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    const components = await prisma.component.findMany({
      where: type ? { type } : undefined,
      include: { costs: { where: { isCurrent: true } } },
      orderBy: { code: "asc" },
    });
    res.json(
      components.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        type: c.type,
        baseUnit: c.baseUnit,
        density: c.density?.toString() ?? null,
        isDemo: c.isDemo,
        currentCost: c.costs[0]
          ? {
              amount: c.costs[0].amount.toString(),
              currency: c.costs[0].currency,
              costBasis: c.costs[0].costBasis,
              packageSize: c.costs[0].packageSize?.toString() ?? null,
              packageUnit: c.costs[0].packageUnit,
              effectiveDate: c.costs[0].effectiveDate,
            }
          : null,
      }))
    );
  })
);

componentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { code, description, type, baseUnit, density } = req.body as Record<string, string | undefined>;
    if (!code || !description || !type || !baseUnit) {
      res.status(400).json({ error: "code, description, type y baseUnit son requeridos." });
      return;
    }
    const component = await prisma.component.create({
      data: { code, description, type, baseUnit, density: density ? new Decimal(density) : undefined },
    });
    res.status(201).json(component);
  })
);

componentsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { description, density } = req.body as { description?: string; density?: string };
    const component = await prisma.component.update({
      where: { id: req.params.id },
      data: { description, density: density !== undefined ? new Decimal(density) : undefined },
    });
    res.json(component);
  })
);

componentsRouter.post(
  "/:id/cost",
  asyncHandler(async (req, res) => {
    const { amount, currency, costBasis, packageSize, packageUnit, effectiveDate, versionLabel } = req.body as Record<string, string | undefined>;
    if (!amount || !currency || !costBasis) {
      res.status(400).json({ error: "amount, currency y costBasis son requeridos." });
      return;
    }
    const costVersion = await prisma.costVersion.create({ data: { label: versionLabel || `Manual ${new Date().toISOString()}` } });
    await prisma.componentCost.updateMany({ where: { componentId: req.params.id, isCurrent: true }, data: { isCurrent: false } });
    const cost = await prisma.componentCost.create({
      data: {
        componentId: req.params.id,
        costVersionId: costVersion.id,
        amount: new Decimal(amount),
        currency,
        costBasis,
        packageSize: packageSize ? new Decimal(packageSize) : undefined,
        packageUnit,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        isCurrent: true,
      },
    });
    res.status(201).json(cost);
  })
);
