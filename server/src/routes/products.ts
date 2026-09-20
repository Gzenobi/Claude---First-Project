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

// Fusiona uno o varios productos que en realidad son la misma marca (ej. un
// typo del nombre creó un duplicado, o varios archivos de origen nombraron
// distinto la misma línea). Nunca borra colores/fórmulas: los reasigna al
// producto destino, resolviendo colisiones de código de color, y recién ahí
// borra los productos de origen (que quedan sin hijos).
productsRouter.post(
  "/merge",
  asyncHandler(async (req, res) => {
    const body = req.body as {
      sourceProductId?: string;
      sourceProductIds?: string[];
      targetProductId?: string;
      targetName?: string;
    };
    const sourceProductIds = body.sourceProductIds ?? (body.sourceProductId ? [body.sourceProductId] : []);
    const { targetProductId, targetName } = body;
    if (sourceProductIds.length === 0 || !targetProductId) {
      res.status(400).json({ error: "sourceProductId(s) y targetProductId son requeridos." });
      return;
    }
    if (sourceProductIds.includes(targetProductId)) {
      res.status(400).json({ error: "El producto de origen y destino no pueden ser el mismo." });
      return;
    }

    const merged = await prisma.$transaction(async (tx) => {
      let target = await tx.product.findUniqueOrThrow({ where: { id: targetProductId } });

      for (const sourceProductId of sourceProductIds) {
        const source = await tx.product.findUniqueOrThrow({ where: { id: sourceProductId } });

        const sourceColors = await tx.color.findMany({ where: { productId: source.id } });
        const targetColors = await tx.color.findMany({ where: { productId: target.id } });
        const targetColorByCode = new Map(targetColors.map((c) => [c.code, c]));

        for (const sourceColor of sourceColors) {
          const collision = targetColorByCode.get(sourceColor.code);
          if (collision) {
            // Mismo código de color en ambos productos: se fusionan también
            // los colores, moviendo sus fórmulas y cálculos al que se conserva.
            await tx.formula.updateMany({ where: { colorId: sourceColor.id }, data: { colorId: collision.id } });
            await tx.calculation.updateMany({
              where: { colorId: sourceColor.id },
              data: { colorId: collision.id, productId: target.id },
            });
            await tx.color.delete({ where: { id: sourceColor.id } });
          } else {
            await tx.color.update({ where: { id: sourceColor.id }, data: { productId: target.id } });
            await tx.calculation.updateMany({ where: { colorId: sourceColor.id }, data: { productId: target.id } });
          }
        }

        await tx.productPartB.updateMany({ where: { productId: source.id }, data: { productId: target.id } });

        const data: { kind?: "TWO_K" } = {};
        if (source.kind === "TWO_K" && target.kind !== "TWO_K" && !target.kindLocked) data.kind = "TWO_K";
        if (Object.keys(data).length > 0) target = await tx.product.update({ where: { id: target.id }, data });

        await tx.product.delete({ where: { id: source.id } });
      }

      if (targetName && targetName.trim()) {
        target = await tx.product.update({ where: { id: target.id }, data: { name: targetName.trim() } });
      }

      return target;
    });

    res.json(merged);
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
