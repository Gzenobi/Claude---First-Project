-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "standard" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Color_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "density" DECIMAL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CostVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostVersion_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComponentCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "costVersionId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "costBasis" TEXT NOT NULL,
    "packageSize" DECIMAL,
    "packageUnit" TEXT,
    "effectiveDate" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComponentCost_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComponentCost_costVersionId_fkey" FOREIGN KEY ("costVersionId") REFERENCES "CostVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "version" TEXT,
    "batchVolume" DECIMAL NOT NULL,
    "batchVolumeUnit" TEXT NOT NULL,
    "commercialVolume" DECIMAL NOT NULL,
    "commercialVolumeUnit" TEXT NOT NULL,
    "baseQuantityBasis" TEXT NOT NULL DEFAULT 'EXPLICIT',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "sourceImportBatchId" TEXT,
    "sourceFileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Formula_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Formula_sourceImportBatchId_fkey" FOREIGN KEY ("sourceImportBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormulaComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formulaId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FormulaComponent_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormulaComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductPartB" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "mixRatioA" DECIMAL,
    "mixRatioB" DECIMAL,
    "quantityPerSet" DECIMAL,
    "quantityUnit" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPartB_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductPartB_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "contributionPct" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "baseCost" DECIMAL NOT NULL,
    "concentrateCost" DECIMAL NOT NULL,
    "partBCost" DECIMAL NOT NULL,
    "totalCostPerSet" DECIMAL NOT NULL,
    "setSizeLiters" DECIMAL,
    "costPerLiter" DECIMAL,
    "sellingPricePerLiter" DECIMAL,
    "sellingPricePerSet" DECIMAL NOT NULL,
    "isIncomplete" BOOLEAN NOT NULL DEFAULT false,
    "incompleteReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Calculation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Calculation_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Calculation_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalculationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculationId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL,
    "appliedCost" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "costVersionId" TEXT,
    "componentCostId" TEXT,
    CONSTRAINT "CalculationItem_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "Calculation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalculationItem_costVersionId_fkey" FOREIGN KEY ("costVersionId") REFERENCES "CostVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalculationItem_componentCostId_fkey" FOREIGN KEY ("componentCostId") REFERENCES "ComponentCost" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileNames" TEXT NOT NULL,
    "summaryJson" TEXT,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" DATETIME,
    CONSTRAINT "ImportBatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ImportTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importBatchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowRef" TEXT,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rawDataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportError_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mappingJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultContributionPct" DECIMAL NOT NULL DEFAULT 0.50,
    "mainCurrency" TEXT NOT NULL DEFAULT 'USD',
    "qtyDecimals" INTEGER NOT NULL DEFAULT 4,
    "unitCostDecimals" INTEGER NOT NULL DEFAULT 4,
    "totalDecimals" INTEGER NOT NULL DEFAULT 2,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_kind_idx" ON "Product"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Color_productId_code_key" ON "Color"("productId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Component_code_key" ON "Component"("code");

-- CreateIndex
CREATE INDEX "Component_type_idx" ON "Component"("type");

-- CreateIndex
CREATE INDEX "ComponentCost_componentId_isCurrent_idx" ON "ComponentCost"("componentId", "isCurrent");

-- CreateIndex
CREATE INDEX "FormulaComponent_formulaId_idx" ON "FormulaComponent"("formulaId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportTemplate_name_key" ON "ImportTemplate"("name");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_idx" ON "ExchangeRate"("fromCurrency", "toCurrency");
