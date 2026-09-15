import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [productCount, colorCount, formulaCount, baseCount, concentrateCount, twoKCount, lastCostVersion, formulas] = await Promise.all([
      prisma.product.count(),
      prisma.color.count(),
      prisma.formula.count(),
      prisma.component.count({ where: { type: "BASE" } }),
      prisma.component.count({ where: { type: "CONCENTRATE" } }),
      prisma.product.count({ where: { kind: "TWO_K" } }),
      prisma.costVersion.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.formula.findMany({
        include: { components: { include: { component: { include: { costs: { where: { isCurrent: true } } } } } } },
      }),
    ]);

    const formulasWithErrors = formulas.filter((f) => f.components.some((fc) => fc.component.costs.length === 0)).length;

    res.json({
      productCount,
      colorCount,
      formulaCount,
      baseCount,
      concentrateCount,
      twoKCount,
      lastCostUpdate: lastCostVersion?.createdAt ?? null,
      formulasWithErrors,
    });
  })
);
