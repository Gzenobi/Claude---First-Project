# ¡Calculadora de Costos de Colores!

International Paint | Costing & Pricing Tool

Aplicación web para calcular el costo real de fabricación y el precio de venta sugerido de pinturas y revestimientos tintados mediante **Base + Concentrados de color (+ Parte B en productos 2K)**, con importación masiva de fórmulas y costos desde Excel, motor de costeo centralizado, lista de trabajo exportable y trazabilidad histórica.

> Todos los datos de ejemplo marcados como **DEMO DATA** son ficticios. No contienen costos ni fórmulas reales de AkzoNobel / International Paint.

---

## 1. Fase de descubrimiento (Excel reales analizados)

El repositorio no incluía archivos Excel al iniciar el proyecto. Durante el desarrollo se recibieron **5 planillas reales de fórmulas de color** (`AAC018.xls`, `AAD704.xls`, `AAE019.xls`, `AAJ019_REF.xls`, `CLB108.xls`) y, más tarde, **una planilla maestra de costos real** (`Costeo_Colores_-_DATOS_IP_-_Ago_26.xlsx`), todas conservadas sin modificar y de solo lectura en [`source-data/`](./source-data/).

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

### 1.4 Planilla maestra de costos real (SAP "Materiales IP")

La planilla real (hoja `Materiales IP`, 74 filas de datos) tiene una estructura fija y reconocible automáticamente:

`Código SAP | Descripción | Marca | Negocio global | A/B/M | Codigo Parte B | Contenido (L) | Costo por unidad | Moneda | Estado | Costo CKM3 AR$ Pieza | Costo CKM3 USD Pieza | Costo CKM3 USD Ltr`

- **A/B/M confirmado con el usuario**: `A` = Parte A (base) de un producto 2K, `B` = Parte B de un producto 2K, `M` = mono-componente (1K) **o** colorante (cuando `Marca = "COLORANTE"`).
- **Vínculo de kit Base→Parte B**: la columna `Codigo Parte B` indica, para cada envase de Base, el código SAP del envase de Parte B específico que lo acompaña (ej. una base de 16,8 L usa el componente B de 2,83 L; la *misma* base line en presentación de 2,72 L usa un componente B de 0,51 L distinto). Se modeló como `Component.linkedPartBComponentId`, y la cantidad de Parte B a aplicar por conjunto es el **envase completo** del componente B vinculado — más preciso que inventar un ratio de mezcla fijo por producto. Verificado con `INTERTHANE 990 BASE PASTEL` (16,8 L, $4,00/L) + su Parte B vinculado (2,83 L, $6,03/L) = $84,27 el conjunto.
- **`Estado = "SIN COSTO"`**: 5 de las 74 filas declaran explícitamente que no tienen costo cargado. Esas filas **se registran igual como componente** (quedan visibles en el maestro) pero **no se crea ningún `ComponentCost`** — nunca se inventa un valor. El dashboard y el semáforo de validación las señalan correctamente como "sin costo".
- **Ambigüedad real, resuelta con un valor por defecto explícito**: cada fila trae *dos* costos que no siempre coinciden — `Costo por unidad` (en la `Moneda` declarada, costo de insumo) y `Costo CKM3 USD Pieza/Ltr` (costeo estándar SAP, ya normalizado a USD y a litro). Por defecto el importador usa **`Costo CKM3 USD Ltr`** (evita matemática de envase y conversión de moneda), configurable a `Costo por unidad` desde la pantalla de importación. Verificado con `server/src/__tests__/sapCostMasterParser.real.test.ts`.
- **Superposición con las fórmulas de color, resuelta en la v2 (ver §1.5)**: la primera versión de esta planilla usaba solo el código SAP (numérico) como identificador, que no coincide con los códigos tintométricos (`AAA011`, `GVA127`, etc.) de las fórmulas Chromascan — dos sistemas de codificación distintos. El usuario agregó una columna `CODIGO IP` que sí es el identificador que las fórmulas referencian; con eso, gran parte de la superposición real quedó resuelta automáticamente (ver §1.5).

### 1.5 Columna `CODIGO IP`: el vínculo real entre fórmulas y costos

En una segunda entrega, el usuario agregó la columna **`CODIGO IP`** a la planilla maestra, confirmando que es el código que **todas** las fórmulas de color referencian (tanto para bases como para concentrados) — verificado contra una fórmula real adicional (`PHG590.xls`, Interthane 990, color "Verde"/RAL 6002): su base declarada `Base: PHA100` aparece en el maestro como `CODIGO IP = PHA100` → `INTERTHANE 990 BASE FORTE`.

El importador (`sapCostMasterParser.ts`) usa `CODIGO IP` como `Component.code` cuando la columna está presente (con fallback al código SAP si no lo está, para no romper archivos previos). Esto reveló ambigüedades reales que había que resolver sin inventar valores:

- **Un mismo `CODIGO IP` puede tener varios códigos SAP** (distintos envases/tamaños del mismo material). El vínculo Base→Parte B (§1.4) también se resuelve a nivel de `CODIGO IP`, no de código SAP. **Corrección importante: ver §1.6** — esto no siempre es una ambigüedad a resolver con un único "costo vigente"; en Base y Parte B son dos presentaciones legítimas simultáneas.
- **Filas con el mismo tamaño de envase y costos distintos SÍ son un conflicto real** (ej. `GVA147` con dos entradas de 4 L a USD 16,53/L y USD 10,78/L) — ahí sí se elige una de forma determinística y se informa la otra como descartada.
- **Columna "Estado" en blanco** en muchas filas de colorante (ni "OK" ni "SIN COSTO"): se trata como válida (no genera advertencia por fila; sería demasiado ruido en un archivo con ~15 filas así).
- **Typo real detectado y NO corregido automáticamente**: la fila SAP `5188993` tiene `CODIGO IP = GCA127` pero su descripción dice "GVA127" — probablemente un error de tipeo (`C` en vez de `V`) en el archivo de origen. El sistema **no adivina ni corrige códigos**: si no se arregla en el origen, las fórmulas que usan `GVA127` (varias de las planillas Chromascan) no van a encontrar este costo aunque exista uno muy parecido.

**Resultado verificado** (`server/src/__tests__/sapCostMasterParserV2.real.test.ts` + prueba manual end-to-end): de las 5 fórmulas Chromascan originales, la de `CLB108` (Interlac 665, base `CLA106`) quedó **100% costeada con datos reales** — costo real USD 4,42/L, precio sugerido USD 8,85/L a 50% de contribución — porque tanto su base como sus 4 concentrados (`GVA122/145/146/147`) existen en el `CODIGO IP` del maestro. Las otras 4 fórmulas (`AAC018`, `AAD704`, `AAE019`, `AAJ019_REF`, todas de "Intergard 345", base `AAA011`) siguen marcando `CÁLCULO INCOMPLETO`: `AAA011` genuinamente no aparece en esta planilla de costos (no es un bug ni una fórmula/producto distintos — ese material específico simplemente no está en este extracto).

### 1.6 Dos presentaciones por material (no una ambigüedad) + corrección del cálculo de base en 2K

El usuario confirmó dos reglas de negocio que cambiaron el modelo:

1. **Base y Parte B siempre vienen en dos envases**, uno para cada formato comercial conocido: el mayor para el conjunto de **20 L**, el menor para el de **3,6 L** (ej. `PHA100`: 15,08 L y 2,72 L; su Parte B vinculada `PHA046`: 2,83 L y 0,51 L). Esto **no es un conflicto a resolver eligiendo "el mejor"** — son dos costos vigentes simultáneos y válidos. Se corrigió el importador para que ya no colapse estos casos a una sola fila: ahora conserva un `ComponentCost` por tamaño, y `FormulaService` elige el que corresponde según el volumen comercial de la fórmula que se está costeando (≥10 L → envase grande, si no → chico). Solo se sigue resolviendo con un desempate explícito el caso de conflicto real (mismo tamaño, costos distintos — `GVA147`).
2. **La fórmula "completar a volumen" (§1.2) depende de si el producto es 1K o 2K**: en 1K, Base + Concentrados = volumen final; en 2K, Base + Concentrados + Parte B = volumen final. El cálculo original (previo a esta corrección) no restaba el volumen de Parte B, así que sobreestimaba la cantidad de base en todos los productos 2K. Esto se movió de tiempo de importación a tiempo de cálculo (`FormulaService.getFormulaBreakdown`), porque recién ahí se conoce si el producto es 2K y cuánto ocupa su Parte B ya resuelta.

**Verificado con `PHG590.xls` (Interthane 990, "Verde"/RAL 6002) en ambos formatos** — los números corrigen a los mostrados en una respuesta anterior, que subestimaban el peso de la Parte B:

| Formato | Base (envase correcto) | Parte B (envase correcto) | Costo total/conjunto | Costo/L |
|---|---|---|---|---|
| 3,6 L | PHA100 chico, 2,72 L, USD 4,2377/L | PHA046 chico, 0,51 L, USD 8,2932/L | USD 22,36 | USD 6,21 |
| 20 L | PHA100 grande, 15,08 L, USD 3,5747/L | PHA046 grande, 2,83 L, USD 6,0329/L | USD 107,79 | USD 5,39 |

Como señal de que el modelo quedó bien: la cantidad de base que da "completar a volumen" (2,715 L y 15,087 L) coincide casi exactamente con el tamaño de envase real declarado para cada formato (2,72 L y 15,08 L) — no es una coincidencia forzada, es consecuencia de que ambas cuentas (elegir el envase correcto + restar la Parte B correcta) ahora están bien planteadas.

Se repitió todo el proceso con una segunda fórmula real (`PHW846.xls`, mismo producto y base, color "Cinza"/RAL 7016) para confirmar que no fue un caso particular: costo real USD 5,52/L (3,6 L) y USD 4,69/L (20 L), sin errores.

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

La clasificación 1K/2K **no se infiere de las fórmulas importadas** (esa info no está en los Excel de fórmulas) — se define manualmente en **Productos**.

La cantidad de Parte B a usar por conjunto se resuelve de dos formas posibles, en este orden:

1. **Vínculo de kit desde el maestro de costos** (automático, preferido cuando existe): si la planilla de costos declara qué envase de Parte B acompaña a cada envase de Base (ej. columna `Codigo Parte B` del formato SAP, ver §1.4), se usa el envase completo de ese componente B vinculado — sin inventar ningún ratio.
2. **Ratio de mezcla manual** (`ProductPartB.mixRatioA`/`mixRatioB`, ej. 4:1): configurable por producto desde **Productos**, para cuando el maestro de costos no trae esa información.

---

## 5. Importación masiva

### Fórmulas (`Importar Fórmulas`)
1. Arrastrar/seleccionar N archivos `.xlsx`/`.xls` — **sin límite práctico**: se probó con 250 archivos reales (500 fórmulas) de punta a punta (análisis + confirmación) en ~8 segundos totales, ver más abajo.
2. Detección automática del formato "Chromascan" (celda/etiqueta); cualquier otro formato ofrece un **asistente de mapeo de columnas** (Excel → campo del sistema) que se configura **una sola vez** y se reaplica a todos los archivos del lote que compartan esa estructura — no hace falta mapear archivo por archivo.
3. Vista previa por archivo: colores detectados, errores (bloquean solo esa fórmula, no el lote) y advertencias (ej. el supuesto de §1.2, duplicados). Se puede descargar el detalle completo como reporte CSV.
4. Confirmación explícita antes de escribir en la base — nada se persiste durante el análisis.
5. Resumen final: importadas / duplicadas omitidas / rechazadas / advertencias.

Bases y concentrados referenciados que no existen en el maestro de componentes se **crean automáticamente sin costo** (con advertencia) en vez de rechazar la fórmula completa — así el color queda visible y el `CÁLCULO INCOMPLETO` señala exactamente qué costo falta.

#### Importación masiva de cientos/miles de archivos (ej. ~1000 fórmulas)

El navegador nunca sube todos los archivos en una sola petición: el cliente los divide en lotes de 20 y los envía secuencialmente, actualizando una barra de progreso real ("archivos analizados: X/N", luego "lotes confirmados: X/N") en vez de una sola espera opaca. Cada lote se valida contra la base de datos (duplicados, componentes faltantes) antes de que el usuario confirme. Probado con 250 archivos reales (250 × 2 fórmulas = 500): análisis en ~2,7 s, confirmación en ~5,2 s, sin errores — para ~1000 archivos el orden de magnitud esperado es de decenas de segundos, no minutos.

### Costos (`Importar Costos`)
Mapeo de columnas configurable (no hay plantilla real de referencia, ver §1). Upsert por código: clasifica cada fila como **Nuevo / Actualizado / Sin cambios / Rechazado**, crea una `CostVersion` con los componentes que cambiaron y mantiene el historial completo (nunca sobrescribe costos anteriores).

### Trazabilidad
Cada `Calculation` guarda un **snapshot inmutable** (`CalculationItem` → `ComponentCost` puntual) de los costos usados. Si el costo maestro cambia después, los cálculos históricos no se alteran solos — el usuario puede comparar "costo original vs. costo actualizado" en **Historial** bajo demanda.

---

## 6. Stack técnico

- **Backend:** Node.js + TypeScript + Express + Prisma (PostgreSQL) + `xlsx` (SheetJS) + `decimal.js` + `multer`. Tests con Vitest.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + Recharts (donut de composición de costo).
- **Identidad visual:** paleta oficial AkzoNobel (Navy `#005192` como color ancla, Sky, Purple, Ultramarine, Fuchsia, Violet), sin rojo como color dominante.

---

## 7. Cómo correr el proyecto localmente

Requisitos: Node.js 20+ y una base PostgreSQL (local o en un contenedor).

```bash
# Backend
cd server
npm install
echo 'DATABASE_URL="postgresql://usuario:password@localhost:5432/calculadora"' > .env
echo 'PORT=4000' >> .env
npx prisma migrate deploy   # crea el esquema en la base
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
- Sin autenticación ni roles — decisión explícita: cualquiera con la URL puede ver y editar todo. Ver §9 sobre las implicancias de esto al desplegar.
- Sin backups automáticos de la base de datos — decisión explícita del negocio.
- El parser "Chromascan" cubre el formato de los 5 archivos reales analizados; cualquier otro formato pasa por el asistente de mapeo de columnas genérico en vez de fallar.

---

## 9. Despliegue en producción (un solo servicio, sin instalar nada en cada PC)

La app se empaqueta en **una sola imagen Docker** (`Dockerfile` en la raíz) que compila el frontend, lo sirve desde el mismo proceso Express que expone la API, y aplica las migraciones de base de datos al arrancar. El resultado: un único servicio con una única URL pública — el usuario final solo necesita un navegador.

### Pasos (Railway, recomendado por simplicidad)

1. Crear una cuenta en [railway.app](https://railway.app) (tiene plan gratuito/hobby).
2. "New Project" → "Deploy from GitHub repo" → elegir este repositorio. Railway detecta el `Dockerfile` automáticamente.
3. "New" → "Database" → "Add PostgreSQL" dentro del mismo proyecto. Railway crea la base y expone su `DATABASE_URL`.
4. En el servicio de la app, ir a "Variables" y agregar `DATABASE_URL` referenciando la del servicio de Postgres (Railway permite enlazarla con `${{Postgres.DATABASE_URL}}`).
5. Deploy. Al arrancar, el contenedor corre `prisma migrate deploy` (crea las tablas) y después levanta el servidor.
6. Railway asigna una URL pública HTTPS (ej. `https://calculadora-costos.up.railway.app`) — esa es la que se comparte con el equipo. No hace falta instalar nada en ninguna PC, solo abrir esa URL en el navegador.
7. Actualizaciones futuras: cada `git push` a la rama desplegada reconstruye y redespliega automáticamente.

Cualquier otro proveedor que construya a partir de un `Dockerfile` y ofrezca una base Postgres administrada (Render, Fly.io, un VPS propio, etc.) sirve igual — los pasos son equivalentes.

### Importante dado que no hay login

La URL pública queda accesible a quien la tenga, sin autenticación. Mientras la URL no se difunda ampliamente (no se publica en ningún lado indexable) el riesgo práctico es bajo, pero cualquiera con el link puede ver y modificar todos los datos, incluidos los costos. Si en el futuro esto deja de ser aceptable, se puede agregar una contraseña compartida simple sin necesitar un sistema de usuarios completo.

### Variables de entorno que necesita el contenedor

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | La de la base Postgres administrada por el proveedor de hosting. |
| `PORT` | `4000` (o el que asigne la plataforma) | Railway/Render lo inyectan automáticamente; no hace falta setearlo a mano. |
