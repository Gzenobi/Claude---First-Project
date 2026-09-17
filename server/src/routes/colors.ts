import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const colorsRouter = Router();

colorsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId, code, name, standard } = req.body as { productId: string; code: string; name?: string; standard?: string };
    if (!productId || !code) {
      res.status(400).json({ error: "productId y code son requeridos." });
      return;
    }
    const color = await prisma.color.create({
      data: { productId, code, name: name || undefined, standard: standard || undefined },
    });
    res.status(201).json(color);
  })
);

colorsRouter.get(
  "/:id/formulas",
  asyncHandler(async (req, res) => {
    const formulas = await prisma.formula.findMany({
      where: { colorId: req.params.id },
      orderBy: { commercialVolume: "asc" },
    });
    res.json(
      formulas.map((f) => ({
        id: f.id,
        version: f.version,
        batchVolume: f.batchVolume.toString(),
        batchVolumeUnit: f.batchVolumeUnit,
        commercialVolume: f.commercialVolume.toString(),
        commercialVolumeUnit: f.commercialVolumeUnit,
        baseQuantityBasis: f.baseQuantityBasis,
        sourceFileName: f.sourceFileName,
      }))
    );
  })
);
