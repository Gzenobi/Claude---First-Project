import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseWorkbook } from "../lib/excel.js";
import { detectSapCostMaster, parseSapCostMasterSheet } from "../import/sapCostMasterParser.js";

const filePath = path.resolve(__dirname, "../../../source-data/cost-master/Costeo_Colores_DATOS_IP_Ago_26.xlsx");

describe("sapCostMasterParser sobre el maestro de costos real", () => {
  it("detecta el formato y encuentra el header", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("Costeo_Colores_DATOS_IP_Ago_26.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    expect(detectSapCostMaster(sheet)).not.toBeNull();
  });

  it("parsea filas OK con costBasis PER_LITER usando CKM3 USD/L por defecto", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("Costeo_Colores_DATOS_IP_Ago_26.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("Costeo_Colores_DATOS_IP_Ago_26.xlsx", sheet, "CKM3_USD_LTR");

    expect(outcome.rows.length).toBeGreaterThan(60);

    const interthaneBase = outcome.rows.find((r) => r.code === "5189323");
    expect(interthaneBase).toBeDefined();
    expect(interthaneBase?.type).toBe("BASE");
    expect(interthaneBase?.hasCost).toBe(true);
    expect(interthaneBase?.costBasis).toBe("PER_LITER");
    expect(interthaneBase?.currency).toBe("USD");
    expect(interthaneBase?.linkedPartBCode).toBe("5182214");

    const partB = outcome.rows.find((r) => r.code === "5182214");
    expect(partB?.type).toBe("PART_B");

    const colorant = outcome.rows.find((r) => r.code === "5182971");
    expect(colorant?.type).toBe("CONCENTRATE");
  });

  it("registra filas SIN COSTO como hasCost:false en vez de inventar un valor", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("Costeo_Colores_DATOS_IP_Ago_26.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("Costeo_Colores_DATOS_IP_Ago_26.xlsx", sheet, "CKM3_USD_LTR");

    const noCostRows = outcome.rows.filter((r) => !r.hasCost);
    expect(noCostRows.length).toBeGreaterThan(0);
    expect(outcome.issues.some((i) => i.severity === "WARNING" && i.message.includes("sin costo"))).toBe(true);
  });

  it("con costSource COSTO_UNIDAD usa costBasis PER_PACKAGE y la moneda declarada", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("Costeo_Colores_DATOS_IP_Ago_26.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("Costeo_Colores_DATOS_IP_Ago_26.xlsx", sheet, "COSTO_UNIDAD");

    const interthaneBase = outcome.rows.find((r) => r.code === "5189323");
    expect(interthaneBase?.costBasis).toBe("PER_PACKAGE");
    expect(interthaneBase?.packageUnit).toBe("L");
    expect(interthaneBase?.currency).toBe("USD");
  });
});
