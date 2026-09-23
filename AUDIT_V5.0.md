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

Pass 18 completed: final tester/visual-consistency cleanup.
Pass 18 finding: seven Studio editor panes still used the generic legacy card language. They are now scoped under one `studio-pane` surface system so General, Customer, Products, Payment, Terms, Design and Presets share spacing, border, radius, heading and help-note treatment.

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

## Pass 21 — Production cache correctness (2026-09-23)

Release validation discovered that `production-config.mjs` replaced every release cache marker with hard-coded `v27`. The source-only RC1 cache check therefore did not prove the deployed cache was isolated. The materializer now preserves the release generation, replaces only its deployment suffix, and is idempotent. Tests failed before the fix and now cover release separation, repeated materialization, changed control origin and missing cache marker.

Activation also deleted every origin cache, including sibling GitHub Pages apps. It now deletes only obsolete `pricereport-shell-*` caches. Navigation fallback and asset lookup read only the active application cache. Executable worker tests prove unrelated caches and the current generation survive, and that offline navigation/assets cannot read another application's cached response. RC2 uses `pricereport-shell-v50-ui-rc2` before the deployment suffix is added.

## Pass 22 — Report print and import visibility corrections

- The report viewer puts a scale on `#paper` and a scaled fixed height on its wrapper. Print CSS previously reset only the wrapper transform. The print layer now resets both transforms and the wrapper height, while leaving manually positioned report blocks and fixed report typography intact. The locked report CSS debt remains 428 `!important` and six media blocks.
- The handwriting image preview declared `display:flex` even with `hidden`. The layout selector now applies only to visible previews. Computed-style checks reproduce `flex` before the fix, then `none` while hidden and `flex` after selection.

### RC2 validation scope

- Full Node checks, DOM regression suite (51 tests), smoke and production build are required before merge.
- Existing CI for RC1 passed at `cfcb029`; RC2 requires a fresh CI run.
- This session's cloud browser can reach production, but cannot open localhost (`ERR_BLOCKED_BY_CLIENT`). Local responsive screenshots and a rendered print/PDF check have not been completed; source/DOM validation is not reported as visual QA. Production interaction checks follow successful deployment.
- No new business feature, data migration, authentication change, or management rollout is introduced by these corrections.


## Pass 23 — Service Worker lifetime correctness

Release-candidate audit found that cached non-navigation requests started a network refresh but returned the cached response without attaching that refresh to the fetch event lifetime. A browser could therefore terminate the worker before the refreshed response was committed. Successful navigation responses had the same risk while updating the cached `index.html`.

Corrections:
- Cached stale-while-revalidate requests now attach the background network/cache write to `event.waitUntil(...)`.
- Cache writes are awaited before the revalidation promise completes.
- Successful navigation cache writes are attached to the fetch-event lifetime.
- Install and activation now await `skipWaiting()` and `clients.claim()` together with their lifecycle work.
- The executable worker regression test now guards cache ownership and these lifetime invariants.

CI runs #409 and #410 exposed weaknesses in the first regression harness; those test-only failures were corrected. Webapp CI #411 then passed all audit, logic, DOM, smoke and build gates.

## Pass 24 — GitHub Actions runtime maintenance

CI logs showed that `actions/checkout@v4` and `actions/setup-node@v4` target the retired Node 20 action runtime and were being forced onto Node 24 by the runner. All PriceReport workflows now use `actions/checkout@v6` and `actions/setup-node@v7`, while retaining the project's explicit Node 22 application runtime.

Validation:
- PriceReport Control Service CI #9: PASS.
- Webapp CI #414: PASS, including npm audit, full test suite and production build.
- No application behavior, report layout, data schema, authentication or production rollout policy changed in this maintenance pass.

### Current gate

PR #37 is green after Passes 23–24. No additional pass is opened without a reproducible defect, release requirement or concrete usability gap.
