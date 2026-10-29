# Graph Report - Claude---First-Project  (2026-10-29)

## Corpus Check
- 67 files · ~60,140 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 653 nodes · 1376 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.85)
- Token cost: 88,323 input · 0 output

## Community Hubs (Navigation)
- Forecast App Engine
- Formula & Cost Import
- Costing Engine Core
- Project Decisions & Architecture
- Forecast UI & Rules
- API Routes & Database
- Server Dependencies
- Client Dependencies
- Icons & Navigation
- Client API Types
- Client TS Config (App)
- App Shell & Header
- Client TS Config (Node)
- Server TS Config
- Calculate & History
- Formulas Page
- Saved Cost List
- Dashboard Page
- Cost Import Wizard
- Searchable Select
- Lint Config
- Products Page
- Client TS Root Config
- MCP Config

## God Nodes (most connected - your core abstractions)
1. `bindEvents()` - 35 edges
2. `compilerOptions` - 18 edges
3. `toast()` - 18 edges
4. `renderView()` - 18 edges
5. `react` - 17 edges
6. `decimal.js` - 16 edges
7. `cellText()` - 16 edges
8. `compilerOptions` - 15 edges
9. `App()` - 14 edges
10. `compilerOptions` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Manual-only product merge rule` --semantically_similar_to--> `No automatic code correction (GCA127/GVA127 typo)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Calculadora de Costos de Colores SPA entry (index.html)` --implements--> `Calculadora de Costos de Colores (International Paint Costing & Pricing Tool)`  [INFERRED]
  client/index.html → README.md
- `RawRow` --references--> `CurrencyCode`  [EXTRACTED]
  server/src/import/sapCostMasterParser.ts → server/src/lib/types.ts
- `index.html app shell (sidebar, topbar, filters)` --implements--> `100% local HTML+JS, no backend`  [INFERRED]
  forecast-app/index.html → forecast-app/README.md
- `#fcModal (curve forecast pop-up)` --implements--> `Previsión por curva histórica (pop-up)`  [INFERRED]
  forecast-app/index.html → forecast-app/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Costing engine service layer** — readme_costing_service, readme_pricing_service, readme_currency_service, readme_validation_service, readme_formula_service [EXTRACTED 1.00]
- **Curve pop-up projection methods** — forecast_app_readme_method_prior_year_curve, forecast_app_readme_method_seasonal_index, forecast_app_readme_method_linear_trend, forecast_app_readme_method_moving_average, forecast_app_readme_curve_projection_popup [EXTRACTED 1.00]
- **Final forecast = base ± manual + VULOPPS** — forecast_app_readme_three_layer_forecast, forecast_app_readme_history_cleaning, forecast_app_readme_cell_locking, forecast_app_readme_vulopps_projects [EXTRACTED 1.00]
- **Product consolidation by brand rules** — claude_manual_product_merge, claude_interthane_3230, claude_interthane_990_hs, claude_interthane_990, claude_sentence_case_product_names [EXTRACTED 1.00]
- **Round-trip back to original Excel without touching formulas** — forecast_app_readme_paste_blocks_export, forecast_app_readme_bloque_dmr, forecast_app_readme_bloque_vulopps, forecast_app_readme_dmr_default_forecast, forecast_app_index_origmodal [INFERRED 0.85]
- **Formula to cost resolution flow (Chromascan -> CODIGO IP -> Parte B -> fill-to-volume)** — readme_chromascan_format, readme_codigo_ip, readme_linked_part_b, readme_two_presentations, readme_fill_to_volume, readme_formula_service [INFERRED 0.85]

## Communities (24 total, 2 thin omitted)

### Community 0 - "Forecast App Engine"
Cohesion: 0.05
Nodes (114): accuracy(), afterDataReady(), alertBadge(), allAlerts(), analyze(), analyzeAll(), analyzeSheet(), applyModal() (+106 more)

### Community 1 - "Formula & Cost Import"
Cohesion: 0.06
Nodes (65): vitest, vitest@^2.1.1, detectChromascan(), extractBatchNote(), findLabelValue(), parseChromascanSheet(), slugifyProductCode(), CURRENCY_SET (+57 more)

### Community 2 - "Costing Engine Core"
Cohesion: 0.10
Nodes (38): CalcError, ComponentCostInput, ComponentRole, CostBasis, CurrencyCode, FormulaLineInput, LineCostResult, ProductKind (+30 more)

### Community 3 - "Project Decisions & Architecture"
Cohesion: 0.05
Nodes (33): Calculo de Costo Chromascan - decisiones fijas, graphify usage rules, Unresolved hyphen naming question, ImportService.importOneFormula, Interthane 3230 consolidation, Interthane 990, Interthane 990 HS (High Solids), AkzoNobel and International logos (client/public/logos) (+25 more)

### Community 4 - "Forecast UI & Rules"
Cohesion: 0.05
Nodes (31): index.html app shell (sidebar, topbar, filters), #fcModal (curve forecast pop-up), #origModal (export to original), #projModal (project editor), Vendored scripts (jQuery, DataTables, Chart.js, SheetJS), #view-alerts, #view-dashboard, #view-grid (Forecast grid) (+23 more)

### Community 5 - "API Routes & Database"
Cohesion: 0.12
Nodes (22): decimal.js, express, @prisma/client, @prisma/client@^5.20.0, prisma, prisma, app, clientDist (+14 more)

### Community 6 - "Server Dependencies"
Cohesion: 0.06
Nodes (39): cors, multer, prisma, tsx, @types/cors, @types/express, @types/multer, zod (+31 more)

### Community 7 - "Client Dependencies"
Cohesion: 0.07
Nodes (37): dependencies, clsx@^2.1.1, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^6.26.2, xlsx@^0.18.5, devDependencies, oxlint@^1.81.0 (+29 more)

### Community 8 - "Icons & Navigation"
Cohesion: 0.10
Nodes (27): base, IconCalculate(), IconClose(), IconCloudUpload(), IconDashboard(), IconFormula(), IconHistory(), IconList() (+19 more)

### Community 9 - "Client API Types"
Cohesion: 0.18
Nodes (14): api, Breakdown, ColorSummary, ComponentRow, FormulaSummary, LineResult, Pricing, Product (+6 more)

### Community 10 - "Client TS Config (App)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 11 - "App Shell & Header"
Cohesion: 0.18
Nodes (12): SearchResults, App(), Header(), IconMenu(), IconSearch(), Sidebar(), Components(), createComponent() (+4 more)

### Community 12 - "Client TS Config (Node)"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "Server TS Config"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 14 - "Calculate & History"
Cohesion: 0.28
Nodes (10): PricingResponse, money(), pct(), qty(), roleLabel(), Calculate(), DONUT_COLORS, LinesTable() (+2 more)

### Community 15 - "Formulas Page"
Cohesion: 0.20
Nodes (5): Formulas(), reloadFormulas(), remove(), NewColorForm(), NewFormulaForm()

### Community 16 - "Saved Cost List"
Cohesion: 0.29
Nodes (8): Calculation, CostList(), duplicate(), load(), remove(), saveContribution(), SortKey, Th()

### Community 17 - "Dashboard Page"
Cohesion: 0.32
Nodes (7): recharts@^2.12.7, DashboardData, DashboardTimelinePoint, Dashboard(), formatDay(), Stat(), recharts

### Community 18 - "Cost Import Wizard"
Cohesion: 0.29
Nodes (4): CostMappingWizard(), emptyMapping, ImportCosts(), MappingState

### Community 19 - "Searchable Select"
Cohesion: 0.48
Nodes (6): SearchableSelect(), choose(), close(), onSearchKeyDown(), onTriggerKeyDown(), openList()

### Community 20 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 21 - "Products Page"
Cohesion: 0.60
Nodes (6): Products(), createProduct(), load(), runBulkMerge(), runMerge(), saveName()

## Knowledge Gaps
- **30 isolated node(s):** `npx`, `Sandbox dev server restart order (Postgres -> backend -> Vite)`, `AkzoNobel and International logos (client/public/logos)`, `Interthane 3230 consolidation`, `Interthane 990` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 202 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CODIGO IP column (formula-cost link)` connect `Project Decisions & Architecture` to `Formula & Cost Import`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `bindEvents()` (e.g. with `closeDrawer()` and `exportConfig()`) actually correct?**
  _`bindEvents()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `Sandbox dev server restart order (Postgres -> backend -> Vite)`, `AkzoNobel and International logos (client/public/logos)` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Forecast App Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05461479786422578 - nodes in this community are weakly interconnected._
- **Why does `decimal.js` connect `API Routes & Database` to `Formula & Cost Import`, `Costing Engine Core`, `Server Dependencies`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Formula & Cost Import` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Should `Costing Engine Core` be split into smaller, more focused modules?**
  _Cohesion score 0.10175763182238667 - nodes in this community are weakly interconnected._