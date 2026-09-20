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

    // Para cada fórmula incompleta, qué componente puntual le falta costear —
    // agrupado, para señalar dónde conviene cargar costos primero en vez de
    // solo decir "8 fórmulas con errores" sin más contexto.
    const missingByComponent = new Map<string, { code: string; description: string; formulasBlocked: number }>();
    let formulasWithErrors = 0;
    for (const f of formulas) {
      const missing = f.components.filter((fc) => fc.component.costs.length === 0);
      if (missing.length === 0) continue;
      formulasWithErrors++;
      for (const fc of missing) {
        const entry = missingByComponent.get(fc.componentId) ?? {
          code: fc.component.code,
          description: fc.component.description,
          formulasBlocked: 0,
        };
        entry.formulasBlocked++;
        missingByComponent.set(fc.componentId, entry);
      }
    }
    const topMissingCostComponents = [...missingByComponent.values()].sort((a, b) => b.formulasBlocked - a.formulasBlocked).slice(0, 5);

    res.json({
      productCount,
      colorCount,
      formulaCount,
      baseCount,
      concentrateCount,
      twoKCount,
      lastCostUpdate: lastCostVersion?.createdAt ?? null,
      formulasWithErrors,
      topMissingCostComponents,
    });
  })
);

// Curva de crecimiento acumulado de colores y fórmulas cargados, agrupada por
// día — para ver de un vistazo el ritmo de carga del catálogo a lo largo del
// tiempo, no solo el total actual.
dashboardRouter.get(
  "/timeline",
  asyncHandler(async (_req, res) => {
    const [colors, formulas] = await Promise.all([
      prisma.color.findMany({ select: { createdAt: true } }),
      prisma.formula.findMany({ select: { createdAt: true } }),
    ]);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const allDays = new Set<string>();
    const colorsByDay = new Map<string, number>();
    for (const c of colors) {
      const k = dayKey(c.createdAt);
      allDays.add(k);
      colorsByDay.set(k, (colorsByDay.get(k) ?? 0) + 1);
    }
    const formulasByDay = new Map<string, number>();
    for (const f of formulas) {
      const k = dayKey(f.createdAt);
      allDays.add(k);
      formulasByDay.set(k, (formulasByDay.get(k) ?? 0) + 1);
    }

    const sortedDays = [...allDays].sort();
    let colorsCumulative = 0;
    let formulasCumulative = 0;
    const points = sortedDays.map((day) => {
      colorsCumulative += colorsByDay.get(day) ?? 0;
      formulasCumulative += formulasByDay.get(day) ?? 0;
      return { day, colors: colorsCumulative, formulas: formulasCumulative };
    });

    res.json(points);
  })
);
