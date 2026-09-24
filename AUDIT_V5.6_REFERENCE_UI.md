# V5.6 Reference UI/UX Refactor — Audit

Date: 2026-09-24

## Baseline

V5.6 starts from the published V5.5 Operator Safety release on `main` at `cabfb9970e1be6cb7660bb8b6b059eb502e1deaa`.

The feature priority is visual refactoring. Business logic changes are out of scope unless required to preserve an existing UI workflow.

## Source of truth

`UI_REFERENCE_V5.6.md` converts the previously approved reference-image direction into code-level constraints.

Desktop Studio geometry:
- navigation: 118px;
- editor: 350px;
- template/design: 315px;
- preview: flexible remaining width.

The refactor must be visibly different from V5.5, not merely test-clean.

## Pass 1 — Foundation and visible hierarchy

### Findings

The V5.5 UI still contained several micro-typography values designed around 8–10px labels. Large panels therefore looked visually empty while operational text was difficult to read. Management workspaces also switched to a 224px navigation layout, breaking the reference-image shell language.

Publishing/Data Center action cards used tiny title/subtitle sizes inside large boxes, producing a disabled/muddy appearance even for active actions.

### Corrections

- Added explicit V5.6 body scope so the refactor can be audited without touching the A4 report CSS ownership boundary.
- Restored reference geometry through 118 / 350 / 315 / flexible preview tokens.
- Unified the desktop workspace rail to the same 118px navigation language used by Studio.
- Increased application baseline typography to 15px.
- Increased form labels, controls, buttons, workflow text and help text to operationally readable sizes.
- Increased editor/design card padding and restored a clear card surface/border/radius hierarchy.
- Enlarged template labels and thumbnails while keeping the existing two-column grid.
- Increased preview toolbar controls and separated the A4 canvas with a cool neutral background and restrained document shadow.
- Increased workspace headings to 30px and descriptions to 14px.
- Rebuilt Publishing/Data Center status and action cards around readable 11–15px text rather than 8–10px micro-type.
- Removed the visual impression that normal export/import cards are disabled by using white/subtle-blue interactive surfaces and hover depth.
- Kept the A4 report stylesheet untouched in this pass.

### Guard coverage

- `index.html` must activate the V5.6 scope;
- reference geometry must remain 118 / 350 / 315;
- application typography baseline must remain readable;
- Publishing/Data Center action-card dimensions must remain visibly larger;
- template-card labels must not regress to micro-type;
- existing V5 UI ownership/debt guards remain active.

## Next pass

Run exact-head CI. If green, perform the second visual pass on:
- responsive exceptions and narrow-screen regressions;
- Dashboard / History / Data Management density;
- modal typography (Smart Import, Data Library import);
- remaining 8–10px operational text that is still visible in normal workflows.

Do not merge or publish after Pass 1.


## Pass 2 — Operational readability and responsive containment

### Trigger

Pass 1 static audit found more than 170 legacy declarations at 10.5px or below. Many are historical declarations that are now overridden, but normal user workflows still exposed micro-type in Dashboard, History, Data Management, Settings, System, Smart Import and Data Library import/review.

CI #665 also found a smoke guard that incorrectly required the exact literal body class `class="v5-ui"`. V5.6 correctly adds a second scoping class, so the guard was too brittle. The application DOM and all functional tests passed; only that literal smoke assertion failed.

### Corrections

- Raised Dashboard quick-action, KPI, recent quote, search-result and side-action text.
- Raised History KPI, toolbar, table cell, helper and action-button text.
- Raised Data Management summary, search, table and action text.
- Raised Settings/System detail, readiness, policy and helper text.
- Raised product-grid operational text without changing A4 table typography.
- Raised Smart Import mapping, review, warning and preview text.
- Raised Data Library activity and import-review text, including completion state and issue cards.
- Added explicit tablet/phone density overrides so desktop typography/layout rules do not defeat the existing responsive navigation model.
- Replaced the brittle exact body-class smoke assertion with a semantic check that the body class list contains `v5-ui`.

### Next pass

Run CI on the Pass 2 head. If green, inspect remaining visual structure rather than adding more logic:
- Dashboard card proportions;
- History/Data Management whitespace and toolbar hierarchy;
- Settings/System visual grouping;
- modal widths/padding;
- release cache/version alignment only after visual gates are complete.
