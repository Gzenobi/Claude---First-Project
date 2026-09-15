-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "density" DECIMAL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "linkedPartBComponentId" TEXT,
    CONSTRAINT "Component_linkedPartBComponentId_fkey" FOREIGN KEY ("linkedPartBComponentId") REFERENCES "Component" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Component" ("baseUnit", "code", "createdAt", "density", "description", "id", "isDemo", "type", "updatedAt") SELECT "baseUnit", "code", "createdAt", "density", "description", "id", "isDemo", "type", "updatedAt" FROM "Component";
DROP TABLE "Component";
ALTER TABLE "new_Component" RENAME TO "Component";
CREATE UNIQUE INDEX "Component_code_key" ON "Component"("code");
CREATE INDEX "Component_type_idx" ON "Component"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
