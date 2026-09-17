import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      include: { _count: { select: { colors: true } } },
      orderBy: { name: "asc" },
    });
    res.json(
      products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        kind: p.kind,
        kindLocked: p.kindLocked,
        isDemo: p.isDemo,
        colorCount: p._count.colors,
      }))
    );
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { code, name, kind } = req.body as { code: string; name: string; kind: "ONE_K" | "TWO_K" };
    if (!code || !name || !kind) {
      res.status(400).json({ error: "code, name y kind son requeridos." });
      return;
    }
    const product = await prisma.product.create({ data: { code, name, kind } });
    res.status(201).json(product);
  })
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, kind } = req.body as { name?: string; kind?: "ONE_K" | "TWO_K" };
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, kind, kindLocked: kind !== undefined ? true : undefined },
    });
    res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

productsRouter.get(
  "/:id/colors",
  asyncHandler(async (req, res) => {
    const colors = await prisma.color.findMany({
      where: { productId: req.params.id },
      include: { _count: { select: { formulas: true } } },
      orderBy: { code: "asc" },
    });
    res.json(
      colors.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        standard: c.standard,
        formulaCount: c._count.formulas,
      }))
    );
  })
);

productsRouter.post(
  "/:id/part-b",
  asyncHandler(async (req, res) => {
    const { componentId, mixRatioA, mixRatioB, quantityPerSet, quantityUnit, notes } = req.body as Record<string, string | undefined>;
    if (!componentId) {
      res.status(400).json({ error: "componentId es requerido." });
      return;
    }
    const link = await prisma.productPartB.create({
      data: {
        productId: req.params.id,
        componentId,
        mixRatioA: mixRatioA || undefined,
        mixRatioB: mixRatioB || undefined,
        quantityPerSet: quantityPerSet || undefined,
        quantityUnit,
        notes,
      },
    });
    res.status(201).json(link);
  })
);
