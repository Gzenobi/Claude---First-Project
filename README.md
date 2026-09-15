# ¡Calculadora de Costos de Colores!

International Paint | Costing & Pricing Tool

Aplicación web para calcular el costo real de fabricación y el precio de venta sugerido de pinturas y revestimientos tintados mediante **Base + Concentrados de color (+ Parte B en productos 2K)**, con importación masiva de fórmulas y costos desde Excel, motor de costeo centralizado, lista de trabajo exportable y trazabilidad histórica.

> Todos los datos de ejemplo marcados como **DEMO DATA** son ficticios. No contienen costos ni fórmulas reales de AkzoNobel / International Paint.

---

## 1. Fase de descubrimiento (Excel reales analizados)

El repositorio no incluía archivos Excel al iniciar el proyecto. Durante el desarrollo se recibieron **5 planillas reales de fórmulas de color** (`AAC018.xls`, `AAD704.xls`, `AAE019.xls`, `AAJ019_REF.xls`, `CLB108.xls`), conservadas sin modificar y de solo lectura en [`source-data/formulas/`](./source-data/formulas/). No se recibió una planilla maestra de costos real, por lo que ese importador se diseñó de forma genérica y configurable (ver §5).

### 1.1 Estructura encontrada

Las 5 planillas comparten **exactamente la misma estructura** (exportación de un equipo de tintometría "Chromascan", en portugués):

- Una tabla de conversión interna del dispensador (parte superior de la hoja) — **no se usa** para costeo, son valores intermedios de la máquina en unidades de fracción de onza (1/48, 1/96).
- Metadatos por etiqueta, distribuidos en distintas columnas de una misma fila:
  `Nome cor :` (nombre de color) · `Codigo:` (código de color) · `Padrao :` (estándar/RAL) · `Linhas:` (nombre de producto) · `Base :` (código de base).
- Una o más secciones marcadas con el texto `FORMULA <TIPO> <TAMAÑO>,<DECIMAL> L` (ej. `FORMULA GALAO 3,6 L`, `FORMULA BALDE 20 L`), cada una con su propio header `ID | FLOZ | 1/48 | 1/96 | | ML` y filas de concentrado (código + cantidad). **La columna `ML` se usa como cantidad de concentrado en mililitros** (es la unidad más precisa y está explícitamente rotulada).

Se comprobó que los valores de la columna `ML` de la sección `BALDE 20 L` son proporcionales a los de `GALAO 3,6 L` en la razón 20/3,6, confirmando que cada sección es una fórmula completa e independiente para ese tamaño de envase.

### 1.2 Supuesto documentado: cantidad de base

**Ninguna de las 5 planillas declara la cantidad de base** en las tablas de fórmula — solo listan los concentrados. Esto es una ambigüedad real, no inventada: no hay forma de saber con certeza si la base llena el envase hasta su volumen nominal o si se agrega a un envase ya lleno.

Se optó por el modelo más habitual en la industria de tintometría ("completar a volumen"):

```
cantidad de base = volumen comercial declarado − Σ concentrados (en litros)
```

Esto se marca explícitamente con `baseQuantityBasis = "FILL_TO_VOLUME"` en el modelo de datos y se muestra como **advertencia visible** (semáforo amarillo) en la fórmula, la vista previa de importación y la pantalla de cálculo — nunca se oculta ni se asume como un hecho. El usuario puede corregir la fórmula manualmente si el supuesto no aplica a un caso particular.

### 1.3 Otras observaciones

- No hay campo de código de producto explícito — solo el nombre (`Linhas:`). El importador genera un código a partir del nombre (slug) y lo trata como clave de upsert; si dos archivos usan el mismo nombre de producto, se consolidan en el mismo `Product`.
- No hay fecha/versión de fórmula explícita; se aprovecha la referencia de lote (`OB:495288`) cuando aparece cerca de la sección de fórmula, como dato de trazabilidad best-effort.
- No hay unidades de masa en estos archivos (todo en mL/L), por lo que no aparece el caso de densidad faltante en los datos reales — ese caso sí está cubierto por el motor de costeo y por los datos DEMO (ver §3), para cuando lleguen archivos que sí mezclen masa y volumen.
- Verificado con pruebas automatizadas contra los 5 archivos reales: [`server/src/__tests__/chromascanParser.real.test.ts`](./server/src/__tests__/chromascanParser.real.test.ts).

Como los archivos reales podían no ser representativos de todo el universo de planillas de International Paint, el importador **no está hardcodeado a esta única estructura**: además del parser automático "Chromascan", existe un asistente de mapeo de columnas genérico (§5) para cualquier otro formato.

---

## 2. Modelo de datos

Prisma (`server/prisma/schema.prisma`), normalizado y relacional — una fórmula tiene 1..N `FormulaComponent` (nunca columnas `Concentrado1/2/3`):

```
Product 1—N Color 1—N Formula 1—N FormulaComponent N—1 Component
Product 1—N ProductPartB N—1 Component        (Parte B, ratio configurable por producto)
Component 1—N ComponentCost N—1 CostVersion    (histórico versionado de costos)
Calculation 1—N CalculationItem                (snapshot inmutable de costos usados)
ImportBatch 1—N ImportError · ImportTemplate · CostVersion · Formula
```

Entidades equivalentes a las pedidas: `PRODUCTS`, `COMPONENTS`, `COLORS`, `FORMULAS`, `FORMULA_COMPONENTS`, `COST_VERSIONS`, `COMPONENT_COSTS`, `CALCULATIONS`, `CALCULATION_ITEMS`, `IMPORT_BATCHES`, `IMPORT_ERRORS`, `IMPORT_TEMPLATES`.

SQLite en desarrollo (`server/prisma/schema.prisma` → `provider = "sqlite"`); para migrar a PostgreSQL alcanza con cambiar el `provider` y el `DATABASE_URL` — el esquema evita features específicas de SQLite.

---

## 3. Motor de costeo

Capa de servicios pura y testeada, sin lógica financiera en componentes React (`server/src/services/`):

- **`CostingService`** — `calculateBaseCost`, `calculateTintCost`, `calculatePartBCost`, `calculateTotalCost`, `calculateCostPerLiter`, `computeFullCost`, `resolveUnitCost`.
- **`PricingService`** — `calculateSellingPrice`, `calculateContributionMargin`, `buildContributionScenarios`.
- **`CurrencyService`** — conversión por tabla de tipos de cambio configurable (sin APIs externas).
- **`ValidationService`** — semáforo Verde/Amarillo/Rojo reutilizado en costeo e importación.

**1K:** `Costo Total = Costo Base + Σ Costo Concentrados`
**2K:** `Costo Total = Costo Base + Σ Costo Concentrados + Costo Parte B` (ratio de mezcla configurable por producto, nunca fijo).

**Contribución** (margen sobre precio, no markup):
`Precio de Venta = Costo / (1 − Contribución %)` — con Costo=100 y Contribución=50%, Precio=200 (nunca 150).

**Unidades y densidad:** L↔mL y KG↔G se convierten siempre (misma familia). Masa↔volumen **requiere densidad explícita** del componente; si falta, el cálculo se marca `CÁLCULO INCOMPLETO` con el motivo exacto — nunca se asume una equivalencia. Cubierto por datos DEMO (`TINT-HEAVY-DEMO`, costo en USD/L usado en una fórmula en gramos, sin densidad).

**Precisión:** cálculos internos con `decimal.js` (sin floats nativos); el redondeo es solo visual en la UI.

**Tests:** `server/src/__tests__/costingEngine.test.ts` — 1K, 2K, 1 concentrado, múltiples concentrados, concentrado sin costo, mL→L, fórmula en masa, densidad faltante, contribución 40/50/60%. `npm test` dentro de `server/` → 22/22 tests OK.

---

## 4. Productos 1K/2K y Parte B

La clasificación 1K/2K y la asociación de Parte B **no se infieren de las fórmulas importadas** (esa info no está en los Excel de fórmulas) — se definen manualmente en **Productos**, junto con el ratio de mezcla Parte A:Parte B (ej. 4:1), que es configurable por producto y nunca asumido fijo.

---

## 5. Importación masiva

### Fórmulas (`Importar Fórmulas`)
1. Arrastrar/seleccionar N archivos `.xlsx`/`.xls`.
2. Detección automática del formato "Chromascan" (celda/etiqueta); cualquier otro formato ofrece un **asistente de mapeo de columnas** (Excel → campo del sistema), reutilizable como plantilla.
3. Vista previa por archivo: colores detectados, errores (bloquean solo esa fórmula, no el lote) y advertencias (ej. el supuesto de §1.2, duplicados).
4. Confirmación explícita antes de escribir en la base — nada se persiste durante el análisis.
5. Resumen final: importadas / duplicadas omitidas / rechazadas / advertencias.

Bases y concentrados referenciados que no existen en el maestro de componentes se **crean automáticamente sin costo** (con advertencia) en vez de rechazar la fórmula completa — así el color queda visible y el `CÁLCULO INCOMPLETO` señala exactamente qué costo falta.

### Costos (`Importar Costos`)
Mapeo de columnas configurable (no hay plantilla real de referencia, ver §1). Upsert por código: clasifica cada fila como **Nuevo / Actualizado / Sin cambios / Rechazado**, crea una `CostVersion` con los componentes que cambiaron y mantiene el historial completo (nunca sobrescribe costos anteriores).

### Trazabilidad
Cada `Calculation` guarda un **snapshot inmutable** (`CalculationItem` → `ComponentCost` puntual) de los costos usados. Si el costo maestro cambia después, los cálculos históricos no se alteran solos — el usuario puede comparar "costo original vs. costo actualizado" en **Historial** bajo demanda.

---

## 6. Stack técnico

- **Backend:** Node.js + TypeScript + Express + Prisma (SQLite dev / Postgres-ready) + `xlsx` (SheetJS) + `decimal.js` + `multer`. Tests con Vitest.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + Recharts (donut de composición de costo).
- **Identidad visual:** paleta oficial AkzoNobel (Navy `#005192` como color ancla, Sky, Purple, Ultramarine, Fuchsia, Violet), sin rojo como color dominante.

---

## 7. Cómo correr el proyecto localmente

Requisitos: Node.js 20+.

```bash
# Backend
cd server
npm install
npx prisma migrate deploy   # crea server/prisma/dev.db
npm run seed                # carga datos DEMO DATA
npm run dev                 # API en http://localhost:4000

# Frontend (en otra terminal)
cd client
npm install
npm run dev                 # UI en http://localhost:5173 (proxy /api -> :4000)
```

Tests del motor de costeo y del parser sobre los Excel reales:

```bash
cd server
npm test
```

Flujo sugerido dentro de la app: **Importar Costos → Importar Fórmulas → Calcular Color → ajustar contribución → Agregar a Lista → Lista de Costos → Exportar**.

---

## 8. Limitaciones conocidas (MVP)

- Los lotes de importación en estado "vista previa" se guardan en memoria del proceso del servidor (no en base de datos): si el servidor se reinicia entre el análisis y la confirmación, hay que volver a analizar los archivos. Una vez confirmada, la importación sí es permanente.
- No hay autenticación de usuarios todavía (el modelo de datos ya contempla el campo para incorporarla).
- El parser "Chromascan" cubre el formato de los 5 archivos reales analizados; cualquier otro formato pasa por el asistente de mapeo de columnas genérico en vez de fallar.
