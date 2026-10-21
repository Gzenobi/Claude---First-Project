# Graph Report - Claude---First-Project  (2026-10-21)

## Corpus Check
- Large corpus: 1287 files · ~2,117,161 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 627 nodes · 1323 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.85)
- Token cost: 92,975 input · 0 output

## Community Hubs (Navigation)
- Forecast App Engine
- Formula & Cost Import
- Costing Engine Core
- Server Dependencies
- Client Dependencies
- API Routes & Database
- Icons & Navigation
- Client API Types
- App Shell & Dashboard
- Client TS Config (App)
- Client TS Config (Node)
- Server TS Config
- Calculate & History
- App Architecture Docs
- Formulas Page
- Saved Cost List
- Forecast Business Rules
- Workflow & Deploy Decisions
- Forecast UI Views
- Product Consolidation Rules
- Cost Import Wizard
- Searchable Select
- Costing Assumptions
- Lint Config
- Products Page
- Brand + Color Search
- Visual Identity
- Components Page
- Client TS Root Config
- MCP Config

## God Nodes (most connected - your core abstractions)
1. `bindEvents()` - 34 edges
2. `compilerOptions` - 18 edges
3. `toast()` - 18 edges
4. `renderView()` - 18 edges
5. `react` - 16 edges
6. `cellText()` - 16 edges
7. `compilerOptions` - 15 edges
8. `decimal.js` - 15 edges
9. `App()` - 14 edges
10. `compilerOptions` - 14 edges

## Surprising Connections (you probably didn't know these)
- `section-bar chart headers` --semantically_similar_to--> `section-bar section header pattern`  [INFERRED] [semantically similar]
  forecast-app/index.html → CLAUDE.md
- `Manual-only product merge rule` --semantically_similar_to--> `No automatic code correction (GCA127/GVA127 typo)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `AkzoNobel identity navy #003A70 (styles.css)` --semantically_similar_to--> `Institutional navy #003A70`  [INFERRED] [semantically similar]
  forecast-app/README.md → CLAUDE.md
- `Paste-back blocks to original Excel (BLOQUE_DMR / BLOQUE_VULOPPS)` --semantically_similar_to--> `Immutable calculation snapshot (traceability)`  [INFERRED] [semantically similar]
  forecast-app/README.md → README.md
- `Product name/code from Linhas: brand field` --references--> `Chromascan formula spreadsheet format`  [INFERRED]
  CLAUDE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Costing engine service layer** — readme_costing_service, readme_pricing_service, readme_currency_service, readme_validation_service, readme_formula_service [EXTRACTED 1.00]
- **Product consolidation by brand rules** — claude_manual_product_merge, claude_interthane_3230, claude_interthane_990_hs, claude_interthane_990, claude_sentence_case_product_names [EXTRACTED 1.00]
- **Formula to cost resolution flow (Chromascan -> CODIGO IP -> Parte B -> fill-to-volume)** — readme_chromascan_format, readme_codigo_ip, readme_linked_part_b, readme_two_presentations, readme_fill_to_volume, readme_formula_service [INFERRED 0.85]

## Communities (30 total, 2 thin omitted)

### Community 0 - "Forecast App Engine"
Cohesion: 0.06
Nodes (112): accuracy(), afterDataReady(), alertBadge(), allAlerts(), analyze(), analyzeAll(), analyzeSheet(), applyModal() (+104 more)

### Community 1 - "Formula & Cost Import"
Cohesion: 0.06
Nodes (68): ref_crypto, ref_fs, ref_path, vitest, ref_xlsx, detectChromascan(), extractBatchNote(), findLabelValue() (+60 more)

### Community 2 - "Costing Engine Core"
Cohesion: 0.10
Nodes (38): CalcError, ComponentCostInput, ComponentRole, CostBasis, CurrencyCode, FormulaLineInput, LineCostResult, ProductKind (+30 more)

### Community 3 - "Server Dependencies"
Cohesion: 0.05
Nodes (41): cors, multer, prisma, tsx, @types/cors, @types/express, @types/multer, zod (+33 more)

### Community 4 - "Client Dependencies"
Cohesion: 0.05
Nodes (38): dependencies, clsx, react, react-dom, react-router-dom, recharts, xlsx, devDependencies (+30 more)

### Community 5 - "API Routes & Database"
Cohesion: 0.13
Nodes (23): decimal.js, express, ref_node_path, ref_node_url, @prisma/client, prisma, prisma, app (+15 more)

### Community 6 - "Icons & Navigation"
Cohesion: 0.09
Nodes (28): base, IconCalculate(), IconClose(), IconCloudUpload(), IconDashboard(), IconFormula(), IconHistory(), IconList() (+20 more)

### Community 7 - "Client API Types"
Cohesion: 0.16
Nodes (15): api, Breakdown, ColorSummary, ComponentRow, FormulaSummary, LineResult, Pricing, PricingResponse (+7 more)

### Community 8 - "App Shell & Dashboard"
Cohesion: 0.16
Nodes (14): DashboardData, DashboardTimelinePoint, SearchResults, App(), Header(), IconMenu(), IconSearch(), client_src_index (+6 more)

### Community 9 - "Client TS Config (App)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "Client TS Config (Node)"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "Server TS Config"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 12 - "Calculate & History"
Cohesion: 0.31
Nodes (9): money(), pct(), qty(), roleLabel(), Calculate(), DONUT_COLORS, LinesTable(), Row() (+1 more)

### Community 13 - "App Architecture Docs"
Cohesion: 0.18
Nodes (11): Calculadora de Costos de Colores SPA entry (index.html), /src/main.tsx entry script, Oxlint configuration, React + TypeScript + Vite template README, Calculadora de Costos de Colores (International Paint Costing & Pricing Tool), Contribution margin pricing (Price = Cost / (1 - %)), CurrencyService, Prisma relational data model (+3 more)

### Community 14 - "Formulas Page"
Cohesion: 0.20
Nodes (5): Formulas(), reloadFormulas(), remove(), NewColorForm(), NewFormulaForm()

### Community 15 - "Saved Cost List"
Cohesion: 0.29
Nodes (8): Calculation, CostList(), duplicate(), load(), remove(), saveContribution(), SortKey, Th()

### Community 16 - "Forecast Business Rules"
Cohesion: 0.20
Nodes (10): Volcar al Excel original button, Forecast business rules (trend, intermittent, seasonality, peaks, alerts, accuracy), Forecast MP&Y monthly consumption forecast tool, Historical curve projection pop-up (projectCurve + distribute), localStorage session persistence, Locked manual cells, Paste-back blocks to original Excel (BLOQUE_DMR / BLOQUE_VULOPPS), Three-layer forecast (stat base +/- manual + VULOPPS >=70%) (+2 more)

### Community 17 - "Workflow & Deploy Decisions"
Cohesion: 0.22
Nodes (9): Calculo de Costo Chromascan - decisiones fijas, graphify usage rules, Unresolved hyphen naming question, AkzoNobel and International logos (client/public/logos), Never git push without explicit confirmation, Render deployment (proyecto-costo-colores.onrender.com), Sandbox dev server restart order (Postgres -> backend -> Vite), Single Docker image deployment (+1 more)

### Community 18 - "Forecast UI Views"
Cohesion: 0.25
Nodes (9): Dashboard view (KPIs, Chart.js canvases), Forecast grid view (tblGrid, bulk actions, undo, client wizard), Forecast MP&Y index.html (sidebar, 7 views, drawer, pop-up), section-bar chart headers, Two-level incremental engine (analyze/evaluate), app.js (single IIFE, 10 sections), SheetJS metadata.bin xlsb workaround, Undo stack (20 actions) (+1 more)

### Community 19 - "Product Consolidation Rules"
Cohesion: 0.25
Nodes (8): Interthane 3230 consolidation, Interthane 990, Interthane 990 HS (High Solids), Manual-only product merge rule, Sentence case product names, CODIGO IP column (formula-cost link), No automatic code correction (GCA127/GVA127 typo), SAP 'Materiales IP' cost master

### Community 20 - "Cost Import Wizard"
Cohesion: 0.29
Nodes (4): CostMappingWizard(), emptyMapping, ImportCosts(), MappingState

### Community 21 - "Searchable Select"
Cohesion: 0.48
Nodes (6): SearchableSelect(), choose(), close(), onSearchKeyDown(), onTriggerKeyDown(), openList()

### Community 22 - "Costing Assumptions"
Cohesion: 0.29
Nodes (7): Chromascan formula spreadsheet format, CostingService, decimal.js internal precision, Explicit density required for mass<->volume, FILL_TO_VOLUME base quantity assumption, FormulaService.getFormulaBreakdown, Two package presentations per material (20 L / 3.6 L)

### Community 23 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 24 - "Products Page"
Cohesion: 0.60
Nodes (6): Products(), createProduct(), load(), runBulkMerge(), runMerge(), saveName()

### Community 25 - "Brand + Color Search"
Cohesion: 0.40
Nodes (5): Search by product brand + color, never by base, ImportService.importOneFormula, Product name/code from Linhas: brand field, 1K/2K product classification and Parte B, Base -> Parte B kit link (linkedPartBComponentId)

### Community 26 - "Visual Identity"
Cohesion: 0.50
Nodes (4): Institutional navy #003A70, section-bar section header pattern, AkzoNobel identity navy #003A70 (styles.css), AkzoNobel palette (Navy #005192 anchor)

### Community 27 - "Components Page"
Cohesion: 0.83
Nodes (4): Components(), createComponent(), load(), saveCost()

## Knowledge Gaps
- **194 isolated node(s):** `npx`, `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 233 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CODIGO IP column (formula-cost link)` connect `Product Consolidation Rules` to `Formula & Cost Import`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `Calculadora de Costos de Colores (International Paint Costing & Pricing Tool)` connect `App Architecture Docs` to `Forecast Business Rules`, `Workflow & Deploy Decisions`, `Product Consolidation Rules`, `Costing Assumptions`, `Brand + Color Search`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `SAP 'Materiales IP' cost master` connect `Product Consolidation Rules` to `Brand + Color Search`, `App Architecture Docs`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `bindEvents()` (e.g. with `closeDrawer()` and `exportConfig()`) actually correct?**
  _`bindEvents()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `$schema`, `plugins` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Forecast App Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.055783817951959545 - nodes in this community are weakly interconnected._
- **Should `Formula & Cost Import` be split into smaller, more focused modules?**
  _Cohesion score 0.06111111111111111 - nodes in this community are weakly interconnected._