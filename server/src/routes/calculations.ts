import { Router } from "express";
import Decimal from "decimal.js";
import * as XLSX from "xlsx";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getFormulaBreakdown } from "../services/FormulaService.js";
import { priceFromCost } from "../services/PricingService.js";

export const calculationsRouter = Router();

calculationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const calcs = await prisma.calculation.findMany({
      include: { product: true, color: true, formula: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(calcs.map(serializeCalculation));
  })
);

function serializeCalculation(c: Awaited<ReturnType<typeof prisma.calculation.findMany>>[number] & { product: any; color: any; formula: any }) {
  return {
    id: c.id,
    product: { id: c.product.id, code: c.product.code, name: c.product.name, kind: c.product.kind },
    color: { id: c.color.id, code: c.color.code, name: c.color.name },
    setSize: c.formula.commercialVolume.toString() + " " + c.formula.commercialVolumeUnit,
    baseCost: c.baseCost.toString(),
    concentrateCost: c.concentrateCost.toString(),
    partBCost: c.partBCost.toString(),
    totalCostPerSet: c.totalCostPerSet.toString(),
    costPerLiter: c.costPerLiter?.toString() ?? null,
    contributionPct: c.contributionPct.toString(),
    sellingPricePerLiter: c.sellingPricePerLiter?.toString() ?? null,
    sellingPricePerSet: c.sellingPricePerSet.toString(),
    currency: c.currency,
    isIncomplete: c.isIncomplete,
    incompleteReason: c.incompleteReason,
    createdAt: c.createdAt,
  };
}

async function buildCalculationFromFormula(formulaId: string, contributionPct: string) {
  const breakdown = await getFormulaBreakdown(formulaId);
  const pct = new Decimal(contributionPct);
  const pricing =
    !breakdown.isIncomplete && breakdown.costPerLiter
      ? priceFromCost({ costPerLiter: breakdown.costPerLiter, costPerSet: breakdown.totalCostPerSet, contributionPct: pct })
      : null;
  return { breakdown, pricing, pct };
}

calculationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { formulaId, contributionPct } = req.body as { formulaId: string; contributionPct?: string };
    const settings = await prisma.setting.findUnique({ where: { id: 1 } });
    const pctStr = contributionPct ?? settings?.defaultContributionPct.toString() ?? "0.5";

    const { breakdown, pricing } = await buildCalculationFromFormula(formulaId, pctStr);

    const calculation = await prisma.calculation.create({
      data: {
        productId: breakdown.productId,
        colorId: breakdown.colorId,
        formulaId,
        contributionPct: new Decimal(pctStr),
        currency: breakdown.currency,
        baseCost: breakdown.baseCost,
        concentrateCost: breakdown.concentrateCost,
        partBCost: breakdown.partBCost,
        totalCostPerSet: breakdown.totalCostPerSet,
        setSizeLiters: breakdown.setSizeLiters,
        costPerLiter: breakdown.costPerLiter,
        sellingPricePerLiter: pricing?.sellingPricePerLiter,
        sellingPricePerSet: pricing?.sellingPricePerSet ?? breakdown.totalCostPerSet,
        isIncomplete: breakdown.isIncomplete,
        incompleteReason: breakdown.incompleteReason,
        items: {
          create: breakdown.lines.map((l) => ({
            componentId: l.componentId,
            role: l.role,
            description: l.description,
            quantity: new Decimal(l.quantity),
            unit: l.unit,
            unitCost: l.cost ? undefined : undefined,
            appliedCost: new Decimal(0),
            currency: breakdown.currency,
            componentCostId: l.componentCostId,
            costVersionId: l.costVersionId,
          })),
        },
      },
      include: { product: true, color: true, formula: true },
    });

    // Segunda pasada: completar unitCost/appliedCost reales por línea (join simple, evita duplicar el motor de cálculo en la ruta)
    for (const line of breakdown.lineResults) {
      const dbLine = breakdown.lines.find((l) => l.componentId === line.componentId);
      if (!dbLine) continue;
      await prisma.calculationItem.updateMany({
        where: { calculationId: calculation.id, componentId: line.componentId },
        data: { unitCost: line.unitCost ? new Decimal(line.unitCost) : null, appliedCost: new Decimal(line.appliedCost) },
      });
    }

    res.status(201).json(serializeCalculation(calculation));
  })
);

calculationsRouter.put(
  "/:id/contribution",
  asyncHandler(async (req, res) => {
    const { contributionPct } = req.body as { contributionPct: string };
    const existing = await prisma.calculation.findUniqueOrThrow({ where: { id: req.params.id } });
    const pct = new Decimal(contributionPct);
    const pricing = existing.costPerLiter
      ? priceFromCost({ costPerLiter: existing.costPerLiter, costPerSet: existing.totalCostPerSet, contributionPct: pct })
      : null;
    const updated = await prisma.calculation.update({
      where: { id: req.params.id },
      data: {
        contributionPct: pct,
        sellingPricePerLiter: pricing?.sellingPricePerLiter,
        sellingPricePerSet: pricing?.sellingPricePerSet ?? existing.totalCostPerSet,
      },
      include: { product: true, color: true, formula: true },
    });
    res.json(serializeCalculation(updated));
  })
);

calculationsRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const { useCurrentCosts } = req.body as { useCurrentCosts?: boolean };
    const original = await prisma.calculation.findUniqueOrThrow({ where: { id: req.params.id } });
    if (useCurrentCosts) {
      const { breakdown, pricing } = await buildCalculationFromFormula(original.formulaId, original.contributionPct.toString());
      const created = await prisma.calculation.create({
        data: {
          productId: breakdown.productId,
          colorId: breakdown.colorId,
          formulaId: original.formulaId,
          contributionPct: original.contributionPct,
          currency: breakdown.currency,
          baseCost: breakdown.baseCost,
          concentrateCost: breakdown.concentrateCost,
          partBCost: breakdown.partBCost,
          totalCostPerSet: breakdown.totalCostPerSet,
          setSizeLiters: breakdown.setSizeLiters,
          costPerLiter: breakdown.costPerLiter,
          sellingPricePerLiter: pricing?.sellingPricePerLiter,
          sellingPricePerSet: pricing?.sellingPricePerSet ?? breakdown.totalCostPerSet,
          isIncomplete: breakdown.isIncomplete,
          incompleteReason: breakdown.incompleteReason,
        },
        include: { product: true, color: true, formula: true },
      });
      res.status(201).json(serializeCalculation(created));
      return;
    }
    const created = await prisma.calculation.create({
      data: {
        productId: original.productId,
        colorId: original.colorId,
        formulaId: original.formulaId,
        contributionPct: original.contributionPct,
        currency: original.currency,
        baseCost: original.baseCost,
        concentrateCost: original.concentrateCost,
        partBCost: original.partBCost,
        totalCostPerSet: original.totalCostPerSet,
        setSizeLiters: original.setSizeLiters,
        costPerLiter: original.costPerLiter,
        sellingPricePerLiter: original.sellingPricePerLiter,
        sellingPricePerSet: original.sellingPricePerSet,
        isIncomplete: original.isIncomplete,
        incompleteReason: original.incompleteReason,
      },
      include: { product: true, color: true, formula: true },
    });
    res.status(201).json(serializeCalculation(created));
  })
);

calculationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.calculation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

calculationsRouter.get(
  "/:id/compare-current",
  asyncHandler(async (req, res) => {
    const original = await prisma.calculation.findUniqueOrThrow({ where: { id: req.params.id } });
    const current = await getFormulaBreakdown(original.formulaId);
    const variance =
      current.totalCostPerSet && !original.totalCostPerSet.isZero()
        ? current.totalCostPerSet.sub(original.totalCostPerSet).div(original.totalCostPerSet).mul(100)
        : new Decimal(0);
    res.json({
      original: { totalCostPerSet: original.totalCostPerSet.toString(), costPerLiter: original.costPerLiter?.toString() ?? null },
      current: {
        totalCostPerSet: current.totalCostPerSet.toString(),
        costPerLiter: current.costPerLiter?.toString() ?? null,
        isIncomplete: current.isIncomplete,
        incompleteReason: current.incompleteReason,
      },
      variancePct: variance.toString(),
    });
  })
);

calculationsRouter.get(
  "/export/xlsx",
  asyncHandler(async (_req, res) => {
    const calcs = await prisma.calculation.findMany({ include: { product: true, color: true, formula: true }, orderBy: { createdAt: "desc" } });
    const rows = calcs.map((c) => ({
      Producto: c.product.name,
      "Código Producto": c.product.code,
      Color: c.color.name ?? "",
      "Código Color": c.color.code,
      Tipo: c.product.kind,
      "Tamaño Conjunto": `${c.formula.commercialVolume.toString()} ${c.formula.commercialVolumeUnit}`,
      "Costo Base": c.baseCost.toString(),
      "Costo Concentrados": c.concentrateCost.toString(),
      "Costo Parte B": c.partBCost.toString(),
      "Costo Total": c.totalCostPerSet.toString(),
      "Costo/L": c.costPerLiter?.toString() ?? "",
      "Contribución": c.contributionPct.toString(),
      "Precio Sugerido/L": c.sellingPricePerLiter?.toString() ?? "",
      "Precio Sugerido/Conjunto": c.sellingPricePerSet.toString(),
      Moneda: c.currency,
      "Fecha de Cálculo": c.createdAt.toISOString(),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Costos");
    const meta = XLSX.utils.aoa_to_sheet([
      ["Calculadora de Costos de Colores"],
      ["International Paint | Costing & Pricing Tool"],
      ["Generado el", new Date().toLocaleString("es-AR")],
    ]);
    XLSX.utils.book_append_sheet(wb, meta, "Info");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="lista-de-costos-${Date.now()}.xlsx"`);
    res.send(buffer);
  })
);

calculationsRouter.get(
  "/export/csv",
  asyncHandler(async (_req, res) => {
    const calcs = await prisma.calculation.findMany({ include: { product: true, color: true, formula: true }, orderBy: { createdAt: "desc" } });
    const header = [
      "Producto",
      "Código Producto",
      "Color",
      "Código Color",
      "Tipo",
      "Tamaño Conjunto",
      "Costo Base",
      "Costo Concentrados",
      "Costo Parte B",
      "Costo Total",
      "Costo/L",
      "Contribución",
      "Precio Sugerido/L",
      "Precio Sugerido/Conjunto",
      "Moneda",
      "Fecha de Cálculo",
    ];
    const lines = [header.join(",")];
    for (const c of calcs) {
      lines.push(
        [
          c.product.name,
          c.product.code,
          c.color.name ?? "",
          c.color.code,
          c.product.kind,
          `${c.formula.commercialVolume.toString()} ${c.formula.commercialVolumeUnit}`,
          c.baseCost.toString(),
          c.concentrateCost.toString(),
          c.partBCost.toString(),
          c.totalCostPerSet.toString(),
          c.costPerLiter?.toString() ?? "",
          c.contributionPct.toString(),
          c.sellingPricePerLiter?.toString() ?? "",
          c.sellingPricePerSet.toString(),
          c.currency,
          c.createdAt.toISOString(),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="lista-de-costos-${Date.now()}.csv"`);
    res.send(lines.join("\n"));
  })
);
