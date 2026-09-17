import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseWorkbook } from "../lib/excel.js";
import { parseSapCostMasterSheet } from "../import/sapCostMasterParser.js";

const filePath = path.resolve(__dirname, "../../../source-data/cost-master/Costeo_Colores_DATOS_IP_Ago_26_v2_CODIGO_IP.xlsx");

describe("sapCostMasterParser sobre la v2 con columna CODIGO IP", () => {
  it("usa CODIGO IP como código del componente en vez del código SAP", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("v2.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("v2.xlsx", sheet, "CKM3_USD_LTR");

    // PHA100 = INTERTHANE 990 BASE FORTE, confirmado contra la fórmula real PHG590
    // (tiene 2 presentaciones — grande y chica — ver siguiente test)
    const bases = outcome.rows.filter((r) => r.code === "PHA100");
    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) {
      expect(base.type).toBe("BASE");
      expect(base.hasCost).toBe(true);
      expect(base.sapCode).toBeDefined();
      // La Parte B vinculada debe resolverse a su CODIGO IP (PHA046), no al código SAP crudo
      expect(base.linkedPartBCode).toBe("PHA046");
    }

    const partBs = outcome.rows.filter((r) => r.code === "PHA046");
    expect(partBs.length).toBeGreaterThan(0);
    for (const partB of partBs) {
      expect(partB.type).toBe("PART_B");
      expect(partB.hasCost).toBe(true);
    }

    // Los 4 concentrados de la fórmula PHG590 deben existir con costo
    for (const code of ["GVA124", "GVA145", "GVA146", "GVA147"]) {
      const row = outcome.rows.find((r) => r.code === code);
      expect(row, `falta ${code}`).toBeDefined();
      expect(row?.type).toBe("CONCENTRATE");
      expect(row?.hasCost).toBe(true);
    }
  });

  it("conserva las 2 presentaciones (grande/chica) de PHA100 como costos separados", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("v2.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("v2.xlsx", sheet, "CKM3_USD_LTR");

    // PHA100 tiene 2 filas SAP (15.08L y 2.72L) -> deben quedar AMBAS (una por
    // formato: 20L usa la grande, 3.6L usa la chica — confirmado por el usuario)
    const phaRows = outcome.rows.filter((r) => r.code === "PHA100");
    expect(phaRows).toHaveLength(2);
    const sizes = phaRows.map((r) => r.packageSize).sort();
    expect(sizes).toEqual(["15.08", "2.72"]);
    // no debe generarse una advertencia de "conflicto" por esto: son presentaciones válidas
    expect(outcome.issues.some((i) => i.rowRef === "PHA100" && i.message.includes("envases distintos"))).toBe(false);

    // GVA147 tiene 2 filas SAP con el MISMO tamaño (4L) y costos distintos -> eso sí colapsa a una, con advertencia
    const gva147 = outcome.rows.filter((r) => r.code === "GVA147");
    expect(gva147).toHaveLength(1);
    expect(outcome.issues.some((i) => i.rowRef === "GVA147" && i.severity === "WARNING")).toBe(true);
  });

  it("no rompe con el código IP con probable typo (GCA127 en vez de GVA127)", () => {
    const buffer = readFileSync(filePath);
    const wb = parseWorkbook("v2.xlsx", buffer);
    const sheet = wb.sheets.find((s) => s.sheetName === "Materiales IP")!;
    const outcome = parseSapCostMasterSheet("v2.xlsx", sheet, "CKM3_USD_LTR");

    // No hay autocorrección de typos: se importa tal cual viene, y GVA127 (sin la fila
    // typo-eada) simplemente no aparece como código propio en este archivo.
    expect(outcome.rows.find((r) => r.code === "GCA127")).toBeDefined();
    expect(outcome.rows.find((r) => r.code === "GVA127")).toBeUndefined();
  });
});
