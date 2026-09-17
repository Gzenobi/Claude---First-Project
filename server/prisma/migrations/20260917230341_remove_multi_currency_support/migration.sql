-- Se retira el soporte multi-moneda: la app opera solo en USD. Ninguna
-- lógica de cálculo llegó a usar ExchangeRate/mainCurrency (verificado),
-- así que se eliminan sin reemplazo.
DROP TABLE "ExchangeRate";

-- SQLite no soporta DROP COLUMN directo antes de 3.35 vía Prisma; se
-- recrea la tabla Setting sin la columna mainCurrency.
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultContributionPct" DECIMAL NOT NULL DEFAULT 0.50,
    "qtyDecimals" INTEGER NOT NULL DEFAULT 4,
    "unitCostDecimals" INTEGER NOT NULL DEFAULT 4,
    "totalDecimals" INTEGER NOT NULL DEFAULT 2,
    "maxFileSizeMb" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("id", "defaultContributionPct", "qtyDecimals", "unitCostDecimals", "totalDecimals", "maxFileSizeMb", "updatedAt")
SELECT "id", "defaultContributionPct", "qtyDecimals", "unitCostDecimals", "totalDecimals", "maxFileSizeMb", "updatedAt" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
