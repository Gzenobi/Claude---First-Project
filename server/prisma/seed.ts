// DEMO DATA — datos ficticios exclusivamente para demostrar el funcionamiento
// de la aplicación. NO son costos reales de AkzoNobel / International Paint.
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, defaultContributionPct: new Decimal(0.5), mainCurrency: "USD" },
  });

  await prisma.exchangeRate.createMany({
    data: [
      { fromCurrency: "USD", toCurrency: "ARS", rate: new Decimal(1000), asOfDate: new Date() },
      { fromCurrency: "EUR", toCurrency: "USD", rate: new Decimal(1.08), asOfDate: new Date() },
    ],
  });

  // --- Componentes DEMO -----------------------------------------------------
  const base = await prisma.component.upsert({
    where: { code: "BASE-DEMO" },
    update: {},
    create: { code: "BASE-DEMO", description: "Base Demo (DEMO DATA)", type: "BASE", baseUnit: "L", isDemo: true },
  });
  const tintBlue = await prisma.component.upsert({
    where: { code: "TINT-BLUE-DEMO" },
    update: {},
    create: { code: "TINT-BLUE-DEMO", description: "Tint Blue Demo (DEMO DATA)", type: "CONCENTRATE", baseUnit: "L", isDemo: true },
  });
  const tintWhite = await prisma.component.upsert({
    where: { code: "TINT-WHITE-DEMO" },
    update: {},
    create: { code: "TINT-WHITE-DEMO", description: "Tint White Demo (DEMO DATA)", type: "CONCENTRATE", baseUnit: "L", isDemo: true },
  });
  const hardener = await prisma.component.upsert({
    where: { code: "HARDENER-DEMO" },
    update: {},
    create: { code: "HARDENER-DEMO", description: "Hardener Demo (DEMO DATA)", type: "PART_B", baseUnit: "L", isDemo: true },
  });
  // Componente CONCENTRATE de ejemplo con costo declarado en KG (masa) para
  // demostrar la validación de densidad faltante en la UI.
  const tintHeavy = await prisma.component.upsert({
    where: { code: "TINT-HEAVY-DEMO" },
    update: {},
    create: { code: "TINT-HEAVY-DEMO", description: "Tint Heavy Demo, sin densidad (DEMO DATA)", type: "CONCENTRATE", baseUnit: "KG", isDemo: true },
  });

  const costVersion = await prisma.costVersion.create({ data: { label: "DEMO DATA — versión inicial" } });

  await prisma.componentCost.createMany({
    data: [
      { componentId: base.id, costVersionId: costVersion.id, amount: new Decimal(8), currency: "USD", costBasis: "PER_LITER", isCurrent: true },
      { componentId: tintBlue.id, costVersionId: costVersion.id, amount: new Decimal(45), currency: "USD", costBasis: "PER_LITER", isCurrent: true },
      { componentId: tintWhite.id, costVersionId: costVersion.id, amount: new Decimal(30), currency: "USD", costBasis: "PER_LITER", isCurrent: true },
      { componentId: hardener.id, costVersionId: costVersion.id, amount: new Decimal(60), currency: "USD", costBasis: "PER_PACKAGE", packageSize: new Decimal(5), packageUnit: "L", isCurrent: true },
      // Costo declarado en USD/L pero usado en la fórmula en gramos (masa): sin
      // densidad declarada, el motor de costeo debe marcar el cálculo como
      // INCOMPLETO en vez de asumir una equivalencia mL≈g.
      { componentId: tintHeavy.id, costVersionId: costVersion.id, amount: new Decimal(12), currency: "USD", costBasis: "PER_LITER", isCurrent: true },
    ],
  });

  // --- Producto 2K DEMO -------------------------------------------------
  const product2k = await prisma.product.upsert({
    where: { code: "PRODUCTO-DEMO-2K" },
    update: {},
    create: { code: "PRODUCTO-DEMO-2K", name: "Producto Demo 2K (DEMO DATA)", kind: "TWO_K", isDemo: true },
  });

  await prisma.productPartB.upsert({
    where: { id: `${product2k.id}-partb-demo` },
    update: {},
    create: { id: `${product2k.id}-partb-demo`, productId: product2k.id, componentId: hardener.id, mixRatioA: new Decimal(4), mixRatioB: new Decimal(1) },
  });

  const colorDemo = await prisma.color.upsert({
    where: { productId_code: { productId: product2k.id, code: "COLOR-DEMO-AZUL" } },
    update: {},
    create: { productId: product2k.id, code: "COLOR-DEMO-AZUL", name: "Color Demo Azul (DEMO DATA)", standard: "RAL 5015 (demo)" },
  });

  const existingFormula = await prisma.formula.findFirst({ where: { colorId: colorDemo.id } });
  if (!existingFormula) {
    await prisma.formula.create({
      data: {
        colorId: colorDemo.id,
        version: "DEMO v1",
        batchVolume: new Decimal(5),
        batchVolumeUnit: "L",
        commercialVolume: new Decimal(5),
        commercialVolumeUnit: "L",
        baseQuantityBasis: "EXPLICIT",
        isDemo: true,
        components: {
          create: [
            { componentId: base.id, role: "BASE", quantity: new Decimal(4.8), unit: "L", sortOrder: 0 },
            { componentId: tintBlue.id, role: "CONCENTRATE", quantity: new Decimal(0.15), unit: "L", sortOrder: 1 },
            { componentId: tintWhite.id, role: "CONCENTRATE", quantity: new Decimal(0.05), unit: "L", sortOrder: 2 },
          ],
        },
      },
    });
  }

  // --- Producto 1K DEMO (con concentrado con densidad faltante) ---------
  const product1k = await prisma.product.upsert({
    where: { code: "PRODUCTO-DEMO-1K" },
    update: {},
    create: { code: "PRODUCTO-DEMO-1K", name: "Producto Demo 1K (DEMO DATA)", kind: "ONE_K", isDemo: true },
  });

  const colorDemo2 = await prisma.color.upsert({
    where: { productId_code: { productId: product1k.id, code: "COLOR-DEMO-GRIS" } },
    update: {},
    create: { productId: product1k.id, code: "COLOR-DEMO-GRIS", name: "Color Demo Gris (DEMO DATA)", standard: "RAL 7035 (demo)" },
  });

  const existingFormula2 = await prisma.formula.findFirst({ where: { colorId: colorDemo2.id } });
  if (!existingFormula2) {
    await prisma.formula.create({
      data: {
        colorId: colorDemo2.id,
        version: "DEMO v1",
        batchVolume: new Decimal(20),
        batchVolumeUnit: "L",
        commercialVolume: new Decimal(20),
        commercialVolumeUnit: "L",
        baseQuantityBasis: "EXPLICIT",
        isDemo: true,
        components: {
          create: [
            { componentId: base.id, role: "BASE", quantity: new Decimal(19.5), unit: "L", sortOrder: 0 },
            { componentId: tintWhite.id, role: "CONCENTRATE", quantity: new Decimal(0.3), unit: "L", sortOrder: 1 },
            // 50 g de un concentrado cuyo costo está en USD/kg sin densidad declarada:
            // el motor de costeo debe marcar el cálculo como INCOMPLETO (falta densidad).
            { componentId: tintHeavy.id, role: "CONCENTRATE", quantity: new Decimal(50), unit: "G", sortOrder: 2 },
          ],
        },
      },
    });
  }

  console.log("Seed DEMO DATA completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
