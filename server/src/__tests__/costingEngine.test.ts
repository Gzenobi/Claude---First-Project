import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateBaseCost,
  calculateTintCost,
  calculatePartBCost,
  calculateTotalCost,
  calculateCostPerLiter,
  computeFullCost,
  resolveUnitCost,
} from "../services/CostingService.js";
import {
  calculateSellingPrice,
  calculateContributionMargin,
  buildContributionScenarios,
} from "../services/PricingService.js";
import type { ComponentCostInput, FormulaLineInput } from "../lib/types.js";

const perLiterCost = (amount: string): ComponentCostInput => ({
  componentId: "c1",
  amount,
  currency: "USD",
  costBasis: "PER_LITER",
});

const perPackageCost = (amount: string, size: string, unit: "L" | "KG" = "L"): ComponentCostInput => ({
  componentId: "c2",
  amount,
  currency: "USD",
  costBasis: "PER_PACKAGE",
  packageSize: size,
  packageUnit: unit,
});

describe("CostingService — producto 1K", () => {
  it("calcula base + un concentrado", () => {
    const base: FormulaLineInput = {
      componentId: "base1",
      code: "BASE-DEMO",
      description: "Base Demo",
      role: "BASE",
      quantity: "4",
      unit: "L",
      cost: perLiterCost("10"), // 10 USD/L
    };
    const tint: FormulaLineInput = {
      componentId: "tint1",
      code: "TINT-BLUE",
      description: "Tint Blue Demo",
      role: "CONCENTRATE",
      quantity: "0.2",
      unit: "L",
      cost: perLiterCost("50"),
    };

    const baseResult = calculateBaseCost(base);
    expect(baseResult.ok).toBe(true);
    expect(baseResult.appliedCost).toBe("40"); // 4L * 10

    const tintResult = calculateTintCost([tint]);
    expect(tintResult.ok).toBe(true);
    expect(tintResult.total.toString()).toBe("10"); // 0.2 * 50

    const total = calculateTotalCost({
      productKind: "ONE_K",
      baseCost: new Decimal(baseResult.appliedCost),
      concentrateCost: tintResult.total,
      partBCost: new Decimal(0),
    });
    expect(total.toString()).toBe("50");
  });

  it("soporta múltiples concentrados (no columnas fijas)", () => {
    const tints: FormulaLineInput[] = [1, 2, 3, 4, 5].map((n) => ({
      componentId: `tint${n}`,
      code: `TINT-${n}`,
      description: `Tint ${n}`,
      role: "CONCENTRATE",
      quantity: "0.1",
      unit: "L",
      cost: perLiterCost("20"),
    }));
    const result = calculateTintCost(tints);
    expect(result.ok).toBe(true);
    expect(result.total.toString()).toBe("10"); // 5 * 0.1 * 20
    expect(result.lines).toHaveLength(5);
  });

  it("marca error cuando un concentrado no tiene costo", () => {
    const tints: FormulaLineInput[] = [
      {
        componentId: "tint1",
        code: "TINT-1",
        description: "Tint sin costo",
        role: "CONCENTRATE",
        quantity: "0.1",
        unit: "L",
        cost: undefined,
      },
    ];
    const result = calculateTintCost(tints);
    expect(result.ok).toBe(false);
    expect(result.lines[0].error).toMatch(/Sin costo disponible/);
  });
});

describe("CostingService — producto 2K", () => {
  it("incluye Parte B en el costo total", () => {
    const partB: FormulaLineInput = {
      componentId: "hardener1",
      code: "HARD-DEMO",
      description: "Hardener Demo",
      role: "PART_B",
      quantity: "1",
      unit: "L",
      cost: perLiterCost("30"),
    };
    const { result, total } = calculatePartBCost(partB);
    expect(result?.ok).toBe(true);
    expect(total.toString()).toBe("30");

    const totalCost = calculateTotalCost({
      productKind: "TWO_K",
      baseCost: new Decimal(40),
      concentrateCost: new Decimal(10),
      partBCost: total,
    });
    expect(totalCost.toString()).toBe("80");
  });

  it("computeFullCost arma el desglose completo para 2K", () => {
    const breakdown = computeFullCost({
      productKind: "TWO_K",
      baseLine: {
        componentId: "base1",
        code: "BASE-DEMO",
        description: "Base Demo",
        role: "BASE",
        quantity: "4",
        unit: "L",
        cost: perLiterCost("10"),
      },
      tintLines: [
        {
          componentId: "tint1",
          code: "TINT-BLUE",
          description: "Tint Blue",
          role: "CONCENTRATE",
          quantity: "0.2",
          unit: "L",
          cost: perLiterCost("50"),
        },
      ],
      partBLine: {
        componentId: "hardener1",
        code: "HARD-DEMO",
        description: "Hardener Demo",
        role: "PART_B",
        quantity: "1",
        unit: "L",
        cost: perLiterCost("30"),
      },
      commercialVolume: "5",
      commercialVolumeUnit: "L",
    });

    expect(breakdown.isIncomplete).toBe(false);
    expect(breakdown.totalCostPerSet.toString()).toBe("80"); // 40 + 10 + 30
    expect(breakdown.costPerLiter?.toString()).toBe("16"); // 80 / 5L
  });
});

describe("CostingService — unidades y densidad", () => {
  it("convierte mL a L correctamente dentro de la misma familia", () => {
    const line: FormulaLineInput = {
      componentId: "tint1",
      code: "TINT-1",
      description: "Tint en mL",
      role: "CONCENTRATE",
      quantity: "200", // 200 mL
      unit: "ML",
      cost: perLiterCost("50"), // 50 USD/L => 0.05 USD/mL
    };
    const result = calculateBaseCost(line);
    expect(result.ok).toBe(true);
    expect(new Decimal(result.unitCost!).toString()).toBe("0.05");
    expect(result.appliedCost).toBe("10"); // 200 * 0.05
  });

  it("resuelve costo por envase declarado en KG hacia una línea en G", () => {
    const cost = perPackageCost("100", "20", "KG"); // 100 USD el envase de 20kg => 5 USD/kg
    const resolved = resolveUnitCost(cost, "G");
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.toString()).toBe("0.005"); // 5 USD/kg = 0.005 USD/g
    }
  });

  it("falla explícitamente si la fórmula está en masa y el costo en volumen sin densidad", () => {
    const line: FormulaLineInput = {
      componentId: "tint1",
      code: "TINT-1",
      description: "Tint en gramos, costo en USD/L, sin densidad",
      role: "CONCENTRATE",
      quantity: "50",
      unit: "G",
      cost: perLiterCost("50"),
      // sin density
    };
    const result = calculateBaseCost(line);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/densidad/i);
  });

  it("con densidad declarada, convierte masa <-> volumen correctamente", () => {
    const line: FormulaLineInput = {
      componentId: "tint1",
      code: "TINT-1",
      description: "Tint en gramos, con densidad 1.2 kg/L",
      role: "CONCENTRATE",
      quantity: "1200", // 1200 g = 1.2 kg = 1 L (con densidad 1.2 kg/L)
      unit: "G",
      cost: perLiterCost("50"), // 50 USD/L
      density: "1.2",
    };
    const result = calculateBaseCost(line);
    expect(result.ok).toBe(true);
    expect(new Decimal(result.appliedCost).toFixed(4)).toBe("50.0000");
  });

  it("calculateCostPerLiter falla si el volumen comercial está en masa sin densidad", () => {
    const result = calculateCostPerLiter({
      totalCost: new Decimal(100),
      commercialVolume: "5",
      commercialVolumeUnit: "KG",
    });
    expect(result.ok).toBe(false);
  });
});

describe("PricingService — contribución (margen, no markup)", () => {
  it("costo 100 y contribución 50% => precio 200 (no 150)", () => {
    const price = calculateSellingPrice(new Decimal(100), new Decimal(0.5));
    expect(price.toString()).toBe("200");
  });

  it("contribución 40% sobre costo 100 => precio 166.666...", () => {
    const price = calculateSellingPrice(new Decimal(100), new Decimal(0.4));
    expect(price.toDP(2).toString()).toBe("166.67");
  });

  it("contribución 60% sobre costo 100 => precio 250", () => {
    const price = calculateSellingPrice(new Decimal(100), new Decimal(0.6));
    expect(price.toString()).toBe("250");
  });

  it("calculateContributionMargin es la inversa de calculateSellingPrice", () => {
    const cost = new Decimal(100);
    const pct = new Decimal(0.55);
    const price = calculateSellingPrice(cost, pct);
    const back = calculateContributionMargin(cost, price);
    expect(back.toDP(10).toString()).toBe(pct.toDP(10).toString());
  });

  it("buildContributionScenarios genera 40/45/50/55/60% con 50% incluido", () => {
    const scenarios = buildContributionScenarios(new Decimal(100));
    expect(scenarios.map((s) => s.contributionPct)).toEqual(["0.40", "0.45", "0.50", "0.55", "0.60"]);
    const fifty = scenarios.find((s) => s.contributionPct === "0.50");
    expect(fifty?.sellingPrice).toBe("200");
  });
});
