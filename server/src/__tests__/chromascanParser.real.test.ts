import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseWorkbook } from "../lib/excel.js";
import { detectChromascan, parseChromascanSheet } from "../import/chromascanParser.js";

const dir = path.resolve(__dirname, "../../../source-data/formulas");

const files = ["AAC018.xls", "AAD704.xls", "AAE019.xls", "AAJ019_REF.xls", "CLB108.xls", "CLE000.xls"];

describe("chromascanParser sobre archivos reales", () => {
  for (const file of files) {
    it(`parsea ${file} sin errores y detecta 2 formulas (GALAO + BALDE)`, () => {
      const buffer = readFileSync(path.join(dir, file));
      const wb = parseWorkbook(file, buffer);
      const sheet = wb.sheets[0];
      expect(detectChromascan(sheet)).toBe(true);

      const outcome = parseChromascanSheet(file, sheet);
      const errors = outcome.issues.filter((i) => i.severity === "ERROR");
      expect(errors, JSON.stringify(errors)).toHaveLength(0);
      expect(outcome.formulas).toHaveLength(2);

      const [galao, balde] = outcome.formulas;
      expect(galao.commercialVolume).toBe("3.6");
      expect(balde.commercialVolume).toBe("20");
      expect(galao.baseQuantityBasis).toBe("FILL_TO_VOLUME");
      expect(Number(galao.baseQuantity)).toBeGreaterThan(3);
      expect(Number(galao.baseQuantity)).toBeLessThan(3.6);
      expect(galao.concentrates.length).toBeGreaterThanOrEqual(3);
    });
  }

  it("ignora la fila basura '0 | 0 | 0 | 0' al final de la sección BALDE de CLE000 en vez de marcarla como error", () => {
    const buffer = readFileSync(path.join(dir, "CLE000.xls"));
    const wb = parseWorkbook("CLE000.xls", buffer);
    const outcome = parseChromascanSheet("CLE000.xls", wb.sheets[0]);
    const [, balde] = outcome.formulas;
    expect(balde.concentrates.some((c) => c.code === "0")).toBe(false);
    expect(balde.concentrates).toHaveLength(4);
  });

  it("extrae metadatos correctos de AAC018 (Branco / RAL 9001 / Intergard 345 / base AAA011)", () => {
    const buffer = readFileSync(path.join(dir, "AAC018.xls"));
    const wb = parseWorkbook("AAC018.xls", buffer);
    const outcome = parseChromascanSheet("AAC018.xls", wb.sheets[0]);
    const f = outcome.formulas[0];
    expect(f.colorCode).toBe("AAC018");
    expect(f.colorName).toBe("Branco");
    expect(f.colorStandard).toBe("RAL 9001");
    expect(f.productName).toBe("Intergard 345");
    expect(f.baseCode).toBe("AAA011");
  });

  it("extrae metadatos correctos de CLB108 (Creme / B108 / Interlac 665 / base CLA106)", () => {
    const buffer = readFileSync(path.join(dir, "CLB108.xls"));
    const wb = parseWorkbook("CLB108.xls", buffer);
    const outcome = parseChromascanSheet("CLB108.xls", wb.sheets[0]);
    const f = outcome.formulas[0];
    expect(f.colorCode).toBe("CLB108");
    expect(f.colorName).toBe("Creme");
    expect(f.colorStandard).toBe("B108");
    expect(f.productName).toBe("Interlac 665");
    expect(f.baseCode).toBe("CLA106");
  });
});
