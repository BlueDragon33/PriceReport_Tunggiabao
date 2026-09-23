# V5.0 UI Consolidation — Audit & execution plan

## Baseline captured from production V4.9
- styles.css: ~132,967 characters
- CSS selectors: ~1,608
- Unique selectors: ~1,167
- !important declarations: 544
- @media blocks: 46
- Historical style markers present from V1.8 through V4.9
- index.html unique class names: ~319

## Root cause
The visual inconsistency is architectural, not cosmetic. Successive V1–V4 releases added component and responsive overrides into the same stylesheet. Dashboard, quotation management, master data, publishing, device/system and settings each introduced their own card/header/table vocabulary. Studio and A4/report CSS live in the same legacy file, which increases the risk of cross-surface overrides.

## V5 principles
1. No feature expansion while consolidation is active.
2. Application UI and A4/report UI are treated as separate visual domains.
3. One token set for color, spacing, radius, shadow, typography and control height.
4. One application shell and one navigation language.
5. Shared workspace primitives for headers, KPI/status cards, panels, toolbars and tables.
6. New V5 UI CSS must contain zero !important declarations.
7. V5 application CSS must not target .paper or print styles.
8. Each migration pass must keep DOM/regression, smoke and production build green.
9. Legacy CSS is deleted only after its migrated surface is covered by the V5 layer and tests.

## Expanded roadmap — 18 passes / ~125–145 atomic steps
1. Inventory CSS/DOM/JS UI contracts and capture baseline metrics.
2. Establish V5 design tokens and UI isolation guard.
3. Consolidate app shell and desktop navigation.
4. Consolidate tablet/mobile navigation and responsive breakpoints.
5. Normalize shared workspace headers, cards, buttons, inputs and feedback states.
6. Rebuild Dashboard on shared primitives.
7. Rebuild Quotation Management on shared table/filter primitives.
8. Rebuild Customer/Product master data on the same primitives.
9. Consolidate Quotation Studio context/header/forms.
10. Consolidate Product editor and long-form data entry.
11. Consolidate Design tools while isolating A4/report rendering.
12. Consolidate Publishing & Data center.
13. Consolidate Device/System and Settings.
14. Responsive de-duplication across desktop/tablet/phone.
15. CSS de-layering: remove migrated V1–V4 application blocks and dead selectors.
16. Print/A4 isolation audit and visual regression safeguards.
17. Accessibility/keyboard/focus/empty/error/loading UX pass.
18. Full tester pass, regression, smoke, build, visual QA, then release candidate.

## Pass gates
Every pass must satisfy:
- Design gate: uses V5 tokens/primitives.
- Implementation gate: no business logic rewrite unless required by a confirmed UX defect.
- Regression gate: npm test and build pass.
- Cleanup gate: migrated legacy declarations are marked for deletion; no new ad-hoc override stack.

## Current execution
Passes 1–17 completed and covered by regression/smoke gates:
- Inventory and baseline metrics captured.
- V5 tokens and strict body-scoped application layer established.
- Shell, desktop/mobile navigation and shared primitives consolidated.
- Dashboard, quotation management, master data, Studio context/product tools, Publishing, System and Settings migrated.
- Legacy application CSS removed from the report stylesheet; report/print debt is guarded.
- Responsive layer reduced to four V5 media-query blocks.
- Keyboard navigation, focus restoration, busy/empty/error feedback semantics added.

Pass 18 in progress: final tester/visual-consistency cleanup.
Current Pass 18 finding: seven Studio editor panes still used the generic legacy card language. They are now scoped under one `studio-pane` surface system so General, Customer, Products, Payment, Terms, Design and Presets share spacing, border, radius, heading and help-note treatment.

### Current V5 metrics
- Application stylesheet: `src/ui-v5.css`, zero `!important`, four responsive blocks.
- Report/print stylesheet: `src/styles.css`, isolated from application selector families.
- Report stylesheet debt ceiling: <=45,000 chars, <=428 `!important`, <=6 media blocks.
- V5 release remains pre-production until Pass 18 QA and CI are green.

### Pass 18 cleanup addendum
- Removed all seven static inline style attributes from `index.html`.
- Application color swatches are now owned by scoped V5 classes.
- The initially hidden A4 customer metadata block is now owned by the report stylesheet through `.report-customer-meta`.
- DOM regression prevents static application inline presentation from returning.

### Pass 19 — semantic token normalization
Pass 18 found no remaining application/report selector leakage, but repeated semantic colors were still hard-coded across Dashboard, management tables, Studio, Publishing and System surfaces. Pass 19 adds shared tokens for divider, heading/data text, purple accent and danger surface, preserving the exact existing colors while removing cross-workspace palette drift.

## Pass 20 — Release Candidate gate
V5 consolidation has completed the original 18-pass roadmap plus two corrective passes discovered during final QA.

### Final RC metrics
- Application UI stylesheet: 103,307 chars
- Application `!important`: 0
- Application responsive blocks: 4
- Static inline styles in `index.html`: 0
- Studio panes under one V5 surface language: 7/7
- Full-width application workspaces using shared primitives: 6
- Report/print stylesheet: 44,417 chars
- Report/print `!important`: 428, held at the locked debt ceiling
- Report/print media blocks: 6
- Application/report selector leakage: none outside deliberate print-hide safeguards

### RC decision
No additional design pass is opened at this checkpoint. Further changes should be driven by a reproducible visual or UX defect, not by adding another override layer. V5 is promoted to `5.0.0-rc.1` and receives a new Service Worker cache namespace so a later production release cannot reuse stale V4.9 UI assets.
