import { Router } from "express";
import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    res.json({
      defaultContributionPct: settings.defaultContributionPct.toString(),
      qtyDecimals: settings.qtyDecimals,
      unitCostDecimals: settings.unitCostDecimals,
      totalDecimals: settings.totalDecimals,
      maxFileSizeMb: settings.maxFileSizeMb,
    });
  })
);

settingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, string | number | undefined>;
    const settings = await prisma.setting.upsert({
      where: { id: 1 },
      update: {
        defaultContributionPct: body.defaultContributionPct !== undefined ? new Decimal(body.defaultContributionPct) : undefined,
        qtyDecimals: body.qtyDecimals !== undefined ? Number(body.qtyDecimals) : undefined,
        unitCostDecimals: body.unitCostDecimals !== undefined ? Number(body.unitCostDecimals) : undefined,
        totalDecimals: body.totalDecimals !== undefined ? Number(body.totalDecimals) : undefined,
        maxFileSizeMb: body.maxFileSizeMb !== undefined ? Number(body.maxFileSizeMb) : undefined,
      },
      create: { id: 1 },
    });
    res.json(settings);
  })
);
