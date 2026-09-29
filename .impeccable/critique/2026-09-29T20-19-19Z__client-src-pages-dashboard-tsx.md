---
target: client/src/pages/Dashboard.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/user/Claude---First-Project/client/src/pages/Dashboard.tsx"
target_fingerprint: "sha256:d3901af04331ef6218181a84565face3a7a275c93c2a8faf6102d1f4ab7327f8"
target_path: /home/user/Claude---First-Project/client/src/pages/Dashboard.tsx
timestamp: 2026-09-29T20-19-19Z
slug: client-src-pages-dashboard-tsx
closed: true
---
Method: dual-agent (A: aba46655eb59e3e76 · B: a738f9a12677c74c0)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Bare "Cargando…" text with no skeleton; timeline chart pops in after initial render, causing layout shift |
| 2 | Match System / Real World | 3 | Solid trade vocabulary (Bases, Concentrados, 2K); "Última actualización" shows only an absolute date, no staleness framing |
| 3 | User Control and Freedom | 2 | No way to see the full list behind "componentes sin costo" (only top rows shown, no total count); nothing collapsible/dismissible |
| 4 | Consistency and Standards | 3 | "Flujo recomendado" uses a plain `<h2>` instead of this project's own `.section-bar` convention — breaks the pattern on the last card |
| 5 | Error Prevention | 3 | Read-only surface, low risk by nature |
| 6 | Recognition Rather Than Recall | 3 | Labels sit under each stat value, but 7 stats in one unlabeled row give no sub-grouping cue |
| 7 | Flexibility and Efficiency of Use | 1 | No stat tile or link is a real shortcut — CTA and both component codes all route to a generic `/componentes` with no deep link |
| 8 | Aesthetic and Minimalist Design | 3 | Clean spacing, but 3 competing uppercase treatments on one screen, and measured contrast failures on secondary text (see below) |
| 9 | Help Recognize/Diagnose/Recover from Errors | 1 | Primary `api.dashboard()` fetch has no `.catch` — a failed request leaves the user on "Cargando…" forever, no message, no retry |
| 10 | Help and Documentation | 1 | No tooltip/glossary for "2K", "Bases", "Concentrados", or how "fórmulas bloqueadas" is computed |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: The composition itself — hero stat, secondary stat strip, line chart, table, numbered onboarding list — is standard admin-dashboard grammar, interchangeable with any SaaS analytics template if you strip the copy. What earns specificity is the language and data semantics layered on top: "fórmulas bloqueadas," "componentes sin costo," "Bases"/"Concentrados"/"Productos 2K" as real catalog entities, and the impact-first framing "destraba la mayor cantidad de fórmulas con el menor esfuerzo." Generic skeleton, domain-specific muscle.

**Deterministic scan**: `impeccable detect --json` on `Dashboard.tsx` alone returned 2 findings, both the same rule — `side-tab` ("thick colored border on one side of a card, the most recognizable AI-slop tell") — on lines 39 and 54, the two alert/status banner divs (`border-l-4 border-fuchsia` / `border-l-4 border-sky`). This is a real pattern match, but likely a **false positive** here: a colored left border on a status/alert banner (error vs. success) is a legitimate, common convention, distinct from the decorative-accent-on-a-generic-card pattern the rule is meant to catch.

**Visual overlays**: Browser-injected detection on the full live page (not scoped to Dashboard.tsx alone — this covers Sidebar/Header/global CSS too) found 15 anti-patterns: 1 clipped-overflow-container, 1 tiny-text (11px), 8 low-contrast instances (mostly `#868688` on white/`#f4f6f9`, measuring 3.4–3.6:1 against a 4.5:1 requirement — this is the `text-gray-dark` token used throughout Dashboard for stat labels and hint text), 1 all-caps-body (47 chars of uppercase body text — the table column headers), and 1 overused-font note (Arial at 95%, not a real issue on its own). The **clipped-overflow-container** finding lands on the exact same app-shell classes (`flex h-screen w-full overflow-hidden` + fixed `w-64` sidebar) that Assessment A independently flagged as the cause of the P0 mobile failure below — deterministic evidence and design judgment agree here.

## Overall Impression

The Dashboard reads as a well-labeled but unfinished admin template: the domain vocabulary is genuinely specific to this paint-costing tool, and the hero-banner-plus-CTA pattern is a real improvement over the old 8-identical-cards layout. But three structural gaps undercut it — the page is unusable on a narrow viewport, a failed data fetch leaves the user stuck with no feedback, and none of the numbers or links actually shortcut the user to where they need to go next. The single biggest opportunity: make the page's own "fórmulas bloqueadas" remediation loop actually close (deep-linked, inline-resolvable) instead of just naming the problem and sending the user to search for it again.

## What's Working

- The alternate "Todas las fórmulas tienen costo completo — nada bloqueado" hero state is a genuinely designed empty-good-state (not a placeholder), correctly using the positive/sky semantic color.
- The blocking-components table is framed by impact, not alphabetically — "Componentes sin costo que más fórmulas bloquean" plus the "mínimo esfuerzo, máximo destrabe" framing reflects real understanding of this tool's dependency graph.
- The single-day timeline edge case has a written, specific fallback instead of rendering a flat, confusing line.

## Priority Issues

**[P0] Mobile is broken, not just cramped**
Why it matters: `App.tsx` has zero responsive logic and `Sidebar.tsx` is a fixed `w-64` (256px) with no breakpoint or toggle. At a 390px viewport the sidebar eats ~66% of the screen, squeezing the entire Dashboard — headline, hero number, CTA, all 7 stats, the chart — into a ~134px column where text wraps one or two words per line. Confirmed both by direct screenshot inspection and by the detector's independent `clipped-overflow-container` hit on the same shell classes.
Fix: hide the sidebar off-canvas below a breakpoint (`hidden md:flex` + a hamburger toggle in Header) instead of shrinking content around a fixed-width sidebar.
Suggested command: `/impeccable adapt`

**[P1] No error path for the primary data load**
Why it matters: `api.dashboard().then(setData)` has no `.catch`. On a failed request the user is stuck indefinitely on a bare "Cargando…" string with no message or retry — on the one page where trust matters most (first thing after login). The sibling call on the same line, `dashboardTimeline()`, already has a `.catch(() => setTimeline([]))` — the pattern exists, it's just not applied consistently.
Fix: mirror that pattern; add an error state with a retry action.
Suggested command: `/impeccable harden`

**[P1] Secondary text fails WCAG AA contrast**
Why it matters: the detector measured `text-gray-dark` (`#868688` on white/`#f4f6f9`) at 3.4–3.6:1 against a 4.5:1 requirement, across 8 instances on the live page — this token drives every stat label and hint line on the Dashboard. Neither reviewer caught this by eye; the mechanical scan did.
Fix: darken `--color-gray-dark` (or introduce a slightly darker variant for body-weight text) until it clears 4.5:1, and re-run the detector to confirm.
Suggested command: `/impeccable audit`

**[P1] The page breaks its own section-header rule on its last card**
Why it matters: `.section-bar` is used correctly for "Crecimiento del catálogo" and "Componentes sin costo…", but "Flujo recomendado" falls back to a plain `<h2 className="font-semibold text-navy mb-3">` — a real, fixable inconsistency that visually demotes what may be the most important card for a first-time user.
Fix: apply `.section-bar -mx-6 -mt-6 mb-4` to that heading (the card uses `p-6`).
Suggested command: `/impeccable layout`

**[P2] Dead-end remediation links**
Why it matters: the hero CTA ("Cargar costos faltantes") and both listed component codes (AAA011, GVA127) all link to a bare `/componentes` with no query param — the user has to manually re-find the exact two components the Dashboard just named. For a returning power user this is wasted, repeated work on the app's core remediation task.
Fix: link to `/componentes?code=<code>` and have Componentes pre-filter/scroll to that row.
Suggested command: `/impeccable layout`

## Persona Red Flags

**Alex (impatient power user)**: Wants to act on "14 bloqueadas" immediately, but the CTA and table links dump him at a generic Componentes search instead of the two specific codes — he redoes work the Dashboard already did for him. None of the 7 stat tiles are clickable (e.g. "16 Colores disponibles" doesn't jump to Colores), so they're informational dead ends rather than the shortcuts an efficiency-minded tool should offer. On a laptop with a narrower window, the sidebar-eats-everything bug makes the page unusable outright.

**Sam (screen reader + keyboard-only)**: The Recharts line chart is pure SVG with no accessible data-table fallback — Sam gets only the one static caption sentence, none of the actual trend values, axis labels, or legend Alex sees visually. Focus states are effectively invisible (no distinct `:focus-visible` styling beyond hover tint), so tabbing through the sidebar/CTA/table links gives no reliable confirmation of where focus currently sits. One genuine win: "Flujo recomendado" is a real `<ol>`/`list-decimal`, so a screen reader correctly announces it as an ordered 4-item list.

## Minor Observations

- Three different uppercase treatments compete on one screen: `.section-bar`, the table `<th>` labels (also flagged by the detector as `all-caps-body`), and the Header's "DEMO DATA incluida" badge.
- That "DEMO DATA incluida" badge uses `badge-ok` (the sky "positive status" color) for a dataset-provenance note, not an actual status — a small semantic misuse, and it's present on every page, not just Dashboard.
- "Última actualización de costos" shows only an absolute date ("18/9/2026") with no relative/staleness framing, despite that being exactly the judgment call the stat exists to support.
- "Flujo recomendado" renders unconditionally regardless of catalog size — a team with 36 fórmulas and 16 colores already loaded still gets the from-zero onboarding walkthrough on every visit.
- The blocking-components table's description column repeats the code verbatim ("AAA011 (creado automáticamente desde importación de fórmulas)") — reads like an unresolved placeholder, though the real fix likely lives in the import/backend naming, not this file.

## Questions to Consider

- What if the page didn't open with a pink alarm number before the user has any context, but instead led with "here's the one thing to do today," collapsing the hero banner, the blocking-components table, and the recommended flow into a single prioritized action module?
- Since every card here just links out to another page to actually act, what would it look like to resolve some of that inline — e.g. an input right in the "componentes sin costo" row to key in the missing cost without leaving the Dashboard?
- Is "Dashboard" — and its generic stat-strip/chart/table grammar — the right frame at all for a small technical team's daily ritual, or would organizing the page around that ritual itself ("Hoy: importar → calcular → exportar") read as more purpose-built than a template with navy paint and paint-industry nouns?
