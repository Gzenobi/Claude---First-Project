import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const searchRouter = Router();

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) {
      res.json({ products: [], colors: [], components: [] });
      return;
    }

    const [products, colors, components] = await Promise.all([
      prisma.product.findMany({
        where: { OR: [{ code: { contains: q } }, { name: { contains: q } }] },
        take: 20,
      }),
      prisma.color.findMany({
        where: {
          OR: [{ code: { contains: q } }, { name: { contains: q } }, { standard: { contains: q } }],
        },
        include: { product: true },
        take: 20,
      }),
      prisma.component.findMany({
        where: { OR: [{ code: { contains: q } }, { description: { contains: q } }] },
        take: 20,
      }),
    ]);

    res.json({
      products: products.map((p) => ({ id: p.id, code: p.code, name: p.name, kind: p.kind })),
      colors: colors.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        standard: c.standard,
        product: { id: c.product.id, code: c.product.code, name: c.product.name },
      })),
      components: components.map((c) => ({ id: c.id, code: c.code, description: c.description, type: c.type })),
    });
  })
);
