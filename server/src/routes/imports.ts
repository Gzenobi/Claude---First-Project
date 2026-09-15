import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  previewFormulaImport,
  commitFormulaImport,
  previewCostImport,
  commitCostImport,
} from "../services/ImportService.js";

export const importsRouter = Router();

const MAX_FILE_MB = 15;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_MB * 1024 * 1024 } });

importsRouter.post(
  "/formulas/preview",
  upload.array("files"),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "No se recibieron archivos." });
      return;
    }
    const templates = req.body.templates ? JSON.parse(req.body.templates) : {};
    const preview = await previewFormulaImport(
      files.map((f) => ({ name: f.originalname, buffer: f.buffer })),
      templates
    );
    res.json(preview);
  })
);

importsRouter.post(
  "/formulas/commit",
  asyncHandler(async (req, res) => {
    const { batchId } = req.body as { batchId: string };
    const summary = await commitFormulaImport(batchId);
    res.json(summary);
  })
);

importsRouter.post(
  "/costs/preview",
  upload.array("files"),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ error: "No se recibieron archivos." });
      return;
    }
    const templates = req.body.templates ? JSON.parse(req.body.templates) : {};
    const sapCostSources = req.body.sapCostSources ? JSON.parse(req.body.sapCostSources) : {};
    const preview = await previewCostImport(
      files.map((f) => ({ name: f.originalname, buffer: f.buffer })),
      templates,
      sapCostSources
    );
    res.json(preview);
  })
);

importsRouter.post(
  "/costs/commit",
  asyncHandler(async (req, res) => {
    const { batchId, versionLabel } = req.body as { batchId: string; versionLabel?: string };
    const summary = await commitCostImport(batchId, versionLabel || `Importación ${new Date().toLocaleString("es-AR")}`);
    res.json(summary);
  })
);

importsRouter.get(
  "/templates",
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    const templates = await prisma.importTemplate.findMany({ where: type ? { type } : undefined, orderBy: { name: "asc" } });
    res.json(templates.map((t) => ({ id: t.id, name: t.name, type: t.type, mapping: JSON.parse(t.mappingJson) })));
  })
);

importsRouter.post(
  "/templates",
  asyncHandler(async (req, res) => {
    const { name, type, mapping } = req.body as { name: string; type: string; mapping: unknown };
    const template = await prisma.importTemplate.upsert({
      where: { name },
      update: { type, mappingJson: JSON.stringify(mapping) },
      create: { name, type, mappingJson: JSON.stringify(mapping) },
    });
    res.status(201).json({ id: template.id, name: template.name, type: template.type, mapping: JSON.parse(template.mappingJson) });
  })
);

importsRouter.get(
  "/batches",
  asyncHandler(async (_req, res) => {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { errors: true } } },
      take: 50,
    });
    res.json(
      batches.map((b) => ({
        id: b.id,
        type: b.type,
        status: b.status,
        fileNames: JSON.parse(b.fileNames || "[]"),
        summary: b.summaryJson ? JSON.parse(b.summaryJson) : null,
        errorCount: b._count.errors,
        createdAt: b.createdAt,
      }))
    );
  })
);

importsRouter.get(
  "/batches/:id/errors",
  asyncHandler(async (req, res) => {
    const errors = await prisma.importError.findMany({ where: { importBatchId: req.params.id }, orderBy: { createdAt: "asc" } });
    res.json(errors);
  })
);
