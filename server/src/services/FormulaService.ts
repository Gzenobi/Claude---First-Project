import Decimal from "decimal.js";
import { prisma } from "../db.js";
import { computeFullCost, calculateLineCost } from "./CostingService.js";
import { convertQuantity } from "../lib/units.js";
import { priceFromCost, buildContributionScenarios } from "./PricingService.js";
import type { ComponentCostInput, FormulaLineInput, ComponentRole, Unit, ProductKind, CurrencyCode } from "../lib/types.js";

// Umbral entre los dos formatos comerciales reales conocidos (3,6 L y 20 L),
// confirmado por el usuario: Base y Parte B siempre vienen en dos envases —
// el mayor para el conjunto de 20 L, el menor para el de 3,6 L.
const LARGE_FORMAT_THRESHOLD_L = new Decimal(10);

/**
 * Resuelve el costo vigente de un componente. Cuando el componente tiene más
 * de un costo vigente simultáneo (una presentación por tamaño de envase), se
 * elige la que corresponde al volumen comercial de la fórmula que se está
 * costeando en vez de tomar "el más reciente" a ciegas.
 */
async function currentCostInput(
  componentId: string,
  commercialVolumeL: Decimal | null,
  checkSizeMatch: boolean = true
): Promise<{ input?: ComponentCostInput; componentCostId?: string; costVersionId?: string; sizeAmbiguityWarning?: string }> {
  const costs = await prisma.componentCost.findMany({
    where: { componentId, isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  if (costs.length === 0) return {};

  let chosen = costs[0];
  let sizeAmbiguityWarning: string | undefined;
  if (costs.length > 1) {
    const withSize = costs.filter((c) => c.packageSize !== null);
    if (withSize.length === costs.length && commercialVolumeL) {
      const wantLarge = commercialVolumeL.gte(LARGE_FORMAT_THRESHOLD_L);
      const sorted = [...withSize].sort((a, b) => a.packageSize!.cmp(b.packageSize!));
      chosen = wantLarge ? sorted[sorted.length - 1] : sorted[0];
    } else {
      sizeAmbiguityWarning = `Este componente tiene ${costs.length} costos vigentes simultáneos y no se pudo determinar cuál envase corresponde a este volumen comercial; se usó el más reciente.`;
      chosen = costs[0];
    }
  } else if (checkSizeMatch && chosen.packageSize && commercialVolumeL) {
    // Único costo vigente: puede ser que el maestro de costos solo declare
    // el envase de un formato (el otro suele venir "SIN COSTO" y por eso no
    // llega a crear un ComponentCost — ver ImportService.commitCostImport).
    // Avisamos en vez de aplicar en silencio el costo de un envase de
    // formato claramente distinto al de esta fórmula.
    const wantLarge = commercialVolumeL.gte(LARGE_FORMAT_THRESHOLD_L);
    const availableIsLarge = chosen.packageSize.gte(LARGE_FORMAT_THRESHOLD_L);
    if (wantLarge !== availableIsLarge) {
      sizeAmbiguityWarning = `El único costo vigente de este componente corresponde a un envase de ${chosen.packageSize.toString()} ${chosen.packageUnit ?? ""} (formato ${availableIsLarge ? "grande" : "chico"}), distinto al formato de esta fórmula (${commercialVolumeL.toString()} L). Es posible que el maestro de costos no tenga cargado el costo del envase de este formato (revisar filas "SIN COSTO" en el origen). Se usó el único costo disponible como aproximación.`;
    }
  }

  return {
    input: {
      componentId,
      amount: chosen.amount.toString(),
      currency: chosen.currency as CurrencyCode,
      costBasis: chosen.costBasis as ComponentCostInput["costBasis"],
      packageSize: chosen.packageSize?.toString(),
      packageUnit: chosen.packageUnit as Unit | undefined,
    },
    componentCostId: chosen.id,
    costVersionId: chosen.costVersionId,
    sizeAmbiguityWarning,
  };
}

export interface FormulaBreakdown {
  formulaId: string;
  productId: string;
  productKind: ProductKind;
  colorId: string;
  currency: CurrencyCode;
  lines: (FormulaLineInput & { componentCostId?: string; costVersionId?: string })[];
  baseCost: Decimal;
  concentrateCost: Decimal;
  partBCost: Decimal;
  totalCostPerSet: Decimal;
  costPerLiter: Decimal | null;
  setSizeLiters: Decimal | null;
  isIncomplete: boolean;
  incompleteReason: string | null;
  lineResults: ReturnType<typeof computeFullCost>["lines"];
  baseQuantityBasis: string;
  formulaWarnings: string[];
}

/** Arma el desglose completo de costos de una fórmula usando los costos vigentes. */
export async function getFormulaBreakdown(formulaId: string): Promise<FormulaBreakdown> {
  const formula = await prisma.formula.findUniqueOrThrow({
    where: { id: formulaId },
    include: {
      color: { include: { product: { include: { partB: { include: { component: true } } } } } },
      components: {
        include: { component: { include: { linkedPartBComponent: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const product = formula.color.product;
  const productKind = product.kind as ProductKind;

  const commercialVolumeLConv = convertQuantity(
    new Decimal(formula.commercialVolume.toString()),
    formula.commercialVolumeUnit as Unit,
    "L"
  );
  const commercialVolumeL = commercialVolumeLConv.ok ? commercialVolumeLConv.value : null;
  const sizeWarnings: string[] = [];

  const lines: (FormulaLineInput & { componentCostId?: string; costVersionId?: string })[] = [];
  for (const fc of formula.components) {
    const { input, componentCostId, costVersionId, sizeAmbiguityWarning } = await currentCostInput(
      fc.componentId,
      commercialVolumeL,
      fc.role === "BASE"
    );
    if (sizeAmbiguityWarning) sizeWarnings.push(`${fc.component.code}: ${sizeAmbiguityWarning}`);
    lines.push({
      componentId: fc.componentId,
      code: fc.component.code,
      description: fc.component.description,
      role: fc.role as ComponentRole,
      quantity: fc.quantity.toString(),
      unit: fc.unit as Unit,
      density: fc.component.density?.toString(),
      cost: input,
      componentCostId,
      costVersionId,
    });
  }

  let partBLine: (FormulaLineInput & { componentCostId?: string; costVersionId?: string }) | null = null;
  // true cuando la cantidad de Parte B se pudo determinar independientemente
  // de la cantidad de base (envase de kit vinculado, o cantidad fija por
  // conjunto) — solo en ese caso es seguro restar su volumen al calcular la
  // base por "completar a volumen" más abajo, evitando una dependencia circular.
  let partBIndependentOfBase = false;
  const baseFormulaComponent = formula.components.find((fc) => fc.role === "BASE");
  const kitLinkedPartB = baseFormulaComponent?.component.linkedPartBComponent ?? null;

  if (productKind === "TWO_K" && product.partB.length > 0) {
    const link = product.partB[0];
    const { input, componentCostId, costVersionId, sizeAmbiguityWarning } = await currentCostInput(link.componentId, commercialVolumeL);
    if (sizeAmbiguityWarning) sizeWarnings.push(`${link.component.code}: ${sizeAmbiguityWarning}`);

    let quantity: string;
    let unit: Unit;
    if (link.quantityPerSet && link.quantityUnit) {
      quantity = link.quantityPerSet.toString();
      unit = link.quantityUnit as Unit;
      partBIndependentOfBase = true;
    } else if (link.mixRatioA && link.mixRatioB) {
      // Ratio de mezcla sobre el volumen de Parte A (base + concentrados) de esta fórmula
      const partAVolume = formula.components
        .filter((c) => c.unit === "L" || c.unit === "ML")
        .reduce((acc, c) => acc.add(new Decimal(c.quantity).mul(c.unit === "ML" ? 0.001 : 1)), new Decimal(0));
      const ratio = new Decimal(link.mixRatioB.toString()).div(new Decimal(link.mixRatioA.toString()));
      quantity = partAVolume.mul(ratio).toString();
      unit = "L";
      // Depende de la base -> no se puede usar para "completar a volumen" (sería circular)
    } else {
      quantity = "0";
      unit = "L";
    }

    partBLine = {
      componentId: link.componentId,
      code: link.component.code,
      description: link.component.description,
      role: "PART_B",
      quantity,
      unit,
      density: link.component.density?.toString(),
      cost: input,
      componentCostId,
      costVersionId,
    };
  } else if (productKind === "TWO_K" && kitLinkedPartB) {
    // Sin Parte B configurada manualmente en el producto: se usa el envase de
    // Parte B vinculado a esta Base específica en el maestro de costos (ej.
    // columna "Codigo Parte B" de una planilla SAP), en su volumen de envase
    // completo — más preciso que asumir un ratio de mezcla inventado.
    const { input, componentCostId, costVersionId, sizeAmbiguityWarning } = await currentCostInput(kitLinkedPartB.id, commercialVolumeL);
    if (sizeAmbiguityWarning) sizeWarnings.push(`${kitLinkedPartB.code}: ${sizeAmbiguityWarning}`);
    // El tamaño de envase (packageSize/packageUnit) se guarda como metadato
    // aunque el costBasis vigente sea PER_LITER/PER_KG (ej. maestro SAP
    // "CKM3 USD/Litro"), justamente para poder usarlo acá como cantidad por
    // conjunto sin depender de que el costBasis sea PER_PACKAGE.
    if (input?.packageSize && input.packageUnit) {
      partBLine = {
        componentId: kitLinkedPartB.id,
        code: kitLinkedPartB.code,
        description: kitLinkedPartB.description,
        role: "PART_B",
        quantity: input.packageSize,
        unit: input.packageUnit,
        density: kitLinkedPartB.density?.toString(),
        cost: input,
        componentCostId,
        costVersionId,
      };
      partBIndependentOfBase = true;
    } else {
      // No hay forma de saber cuánta Parte B usar sin un tamaño de envase
      // declarado (ej. si el costo se cargó como PER_LITER sin "Contenido").
      partBLine = {
        componentId: kitLinkedPartB.id,
        code: kitLinkedPartB.code,
        description: kitLinkedPartB.description,
        role: "PART_B",
        quantity: "0",
        unit: "L",
        cost: undefined,
      };
    }
  }

  const baseLine = lines.find((l) => l.role === "BASE");
  const tintLines = lines.filter((l) => l.role === "CONCENTRATE");
  if (!baseLine) {
    throw new Error("La fórmula no tiene una línea de base definida.");
  }
  const allLines = partBLine ? [...lines, partBLine] : lines;
  const currency: CurrencyCode = (baseLine.cost?.currency as CurrencyCode) ?? "USD";

  // "Completar a volumen": Base = volumen comercial − concentrados − Parte B
  // (confirmado por el usuario: en 2K, Base + Concentrados + Parte B = volumen
  // final; en 1K, Base + Concentrados = volumen final). Se recalcula acá, en
  // vez de al importar, porque recién acá se conoce si el producto es 2K y
  // cuánto ocupa su Parte B.
  if (formula.baseQuantityBasis === "FILL_TO_VOLUME") {
    const targetUnit = baseLine.unit;
    let remaining: Decimal | null = null;
    let volumeError: string | null = null;

    const commercialConv = convertQuantity(new Decimal(formula.commercialVolume.toString()), formula.commercialVolumeUnit as Unit, targetUnit);
    if (!commercialConv.ok) {
      volumeError = commercialConv.error;
    } else {
      remaining = commercialConv.value;
      for (const t of tintLines) {
        const tConv = convertQuantity(new Decimal(t.quantity), t.unit, targetUnit, t.density ? new Decimal(t.density) : undefined);
        if (!tConv.ok) {
          volumeError = tConv.error;
          break;
        }
        remaining = remaining.sub(tConv.value);
      }
    }

    if (!volumeError && remaining && productKind === "TWO_K" && partBLine && partBIndependentOfBase) {
      const pConv = convertQuantity(new Decimal(partBLine.quantity), partBLine.unit, targetUnit, partBLine.density ? new Decimal(partBLine.density) : undefined);
      if (!pConv.ok) volumeError = pConv.error;
      else remaining = remaining.sub(pConv.value);
    }

    if (!volumeError && remaining) {
      if (remaining.isNegative()) {
        volumeError = `El volumen de concentrados${productKind === "TWO_K" && partBIndependentOfBase ? " + Parte B" : ""} (${remaining.neg().toString()} ${targetUnit} de más) supera el volumen comercial declarado (${formula.commercialVolume.toString()} ${formula.commercialVolumeUnit}); revise la fórmula.`;
      } else {
        baseLine.quantity = remaining.toString();
      }
    }

    if (volumeError) {
      const lineResults = [
        { ...calculateLineCost(baseLine), ok: false, error: volumeError, unitCost: null, appliedCost: "0" },
        ...tintLines.map(calculateLineCost),
        ...(partBLine ? [calculateLineCost(partBLine)] : []),
      ];
      return {
        formulaId,
        productId: product.id,
        productKind,
        colorId: formula.colorId,
        currency,
        lines: allLines,
        baseCost: new Decimal(0),
        concentrateCost: new Decimal(0),
        partBCost: new Decimal(0),
        totalCostPerSet: new Decimal(0),
        costPerLiter: null,
        setSizeLiters: null,
        isIncomplete: true,
        incompleteReason: volumeError,
        lineResults,
        baseQuantityBasis: formula.baseQuantityBasis,
        formulaWarnings: sizeWarnings,
      };
    }
  }

  const breakdown = computeFullCost({
    productKind,
    baseLine,
    tintLines,
    partBLine,
    commercialVolume: formula.commercialVolume.toString(),
    commercialVolumeUnit: formula.commercialVolumeUnit as Unit,
  });

  return {
    formulaId,
    productId: product.id,
    productKind,
    colorId: formula.colorId,
    currency,
    lines: allLines,
    baseCost: breakdown.baseCost,
    concentrateCost: breakdown.concentrateCost,
    partBCost: breakdown.partBCost,
    totalCostPerSet: breakdown.totalCostPerSet,
    costPerLiter: breakdown.costPerLiter,
    setSizeLiters: breakdown.setSizeLiters,
    isIncomplete: breakdown.isIncomplete,
    incompleteReason: breakdown.incompleteReason,
    lineResults: breakdown.lines,
    baseQuantityBasis: formula.baseQuantityBasis,
    formulaWarnings: [
      ...(formula.baseQuantityBasis === "FILL_TO_VOLUME"
        ? [
            `La cantidad de base de esta fórmula fue calculada como 'volumen comercial − concentrados${
              productKind === "TWO_K" && partBIndependentOfBase ? " − Parte B" : ""
            }' porque el archivo de origen no la declaraba explícitamente.`,
          ]
        : []),
      ...sizeWarnings,
    ],
  };
}

export async function getPricingForFormula(formulaId: string, contributionPct: string) {
  const breakdown = await getFormulaBreakdown(formulaId);
  if (breakdown.isIncomplete || !breakdown.costPerLiter) {
    return { breakdown, pricing: null, scenarios: [] };
  }
  const pct = new Decimal(contributionPct);
  const pricing = priceFromCost({
    costPerLiter: breakdown.costPerLiter,
    costPerSet: breakdown.totalCostPerSet,
    contributionPct: pct,
  });
  const scenarios = buildContributionScenarios(breakdown.totalCostPerSet);
  return { breakdown, pricing, scenarios };
}
