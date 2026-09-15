import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const colorsRouter = Router();

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
