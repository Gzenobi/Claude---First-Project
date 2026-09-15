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
      mainCurrency: settings.mainCurrency,
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
        mainCurrency: body.mainCurrency as string | undefined,
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

settingsRouter.get(
  "/exchange-rates",
  asyncHandler(async (_req, res) => {
    const rates = await prisma.exchangeRate.findMany({ orderBy: { asOfDate: "desc" } });
    res.json(rates.map((r) => ({ id: r.id, fromCurrency: r.fromCurrency, toCurrency: r.toCurrency, rate: r.rate.toString(), asOfDate: r.asOfDate })));
  })
);

settingsRouter.post(
  "/exchange-rates",
  asyncHandler(async (req, res) => {
    const { fromCurrency, toCurrency, rate, asOfDate } = req.body as { fromCurrency: string; toCurrency: string; rate: string; asOfDate?: string };
    const created = await prisma.exchangeRate.create({
      data: { fromCurrency, toCurrency, rate: new Decimal(rate), asOfDate: asOfDate ? new Date(asOfDate) : new Date() },
    });
    res.status(201).json(created);
  })
);
