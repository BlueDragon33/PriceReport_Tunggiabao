# V6 Quotation Studio & Data Entry — Audit / Execution Log

Date: 2026-09-23

## Baseline
V6 starts from current `main` after V5.1 quotation UX hardening. It preserves the local-first business state, history, report renderer, templates, Device Gate and production controls. The redesign changes application interaction architecture without silently rewriting user data.

## Product target
“Đơn giản mặc định, mạnh khi cần.”

Primary navigation is reduced to application-level modules. Quotation authoring becomes one Studio workspace:
- top command bar;
- left content/data block library;
- central active A4 canvas;
- right Design / Content / Check inspector;
- dedicated spreadsheet-like product data-entry mode.

The product grid writes directly to the existing `state.products`. There is no second product state or separate import database.

## PASS status

### PASS 1 — Source / UX / report / data-entry audit
Status: COMPLETE
- Read V5.0 and V5.1 audits on latest main.
- Confirmed the existing six-pane Studio and product-card editor do not satisfy the new unified Studio/data-entry specification.
- Preserved existing A4/report, storage, history and validation behavior as migration anchors.

### PASS 2 — Application navigation + design shell
Status: IMPLEMENTED, CI pending
- Primary nav reduced to Home / Studio / Quote Management / Data / Export / Settings.
- Studio submodules removed from primary sidebar.
- V6 remains body-scoped in the existing design-token system.
- UI stylesheet remains at zero `!important` and four responsive media blocks.

### PASS 3 — Unified Quotation Studio shell
Status: IMPLEMENTED, CI pending
- Fixed top command bar with save/check/preview/PDF/undo/redo/command palette.
- Left content block library.
- Existing A4 becomes the central Studio canvas.
- Simple / Advanced mode switch added.

### PASS 4 — Canvas architecture
Status: PARTIAL
- Existing direct A4 click targets are reused as the content-selection contract.
- Canvas remains live and interactive.
- Further block-level selection affordance, page-boundary polish and final rendered visual QA remain open.

### PASS 5 — Content blocks
Status: IMPLEMENTED, CI pending
- General, Customer, Products, Payment, Terms/Signature and Design are reachable as Studio blocks.
- Primary Studio navigation state remains active while editing a sub-block.

### PASS 6 — Property Inspector
Status: IMPLEMENTED, CI pending
- Design / Content / Check tabs added.
- Clicking a supported A4 field opens Content inspector editing.
- Check tab exposes validation issues and can route the user to the related field/product area.
- Inspector drawer behavior for narrow tablet widths remains open.

### PASS 7 — Product Data Grid / direct entry
Status: IMPLEMENTED, CI pending
- Legacy product-card editor removed from the V6 DOM.
- One V6 product grid edits `state.products` directly.
- Add row, Enter-to-next-row, arrow-key navigation, inline validation, live amount, catalog datalists and catalog autofill.
- Expanded data-entry layout prioritizes the grid over the A4 canvas.

### PASS 8 — Smart Paste
Status: PARTIAL
- Clipboard TSV paste works directly in the grid.
- Common width-based and header-based mapping works.
- Dirty numeric formats are normalized.
- Duplicate candidates are reported without silent deletion.
- Confidence scoring + user-facing mapping review for uncertain paste remains open.

### PASS 9 — Excel import
Status: PARTIAL
- XLSX/XLS/CSV input uses the existing lazy-loaded SheetJS dependency.
- Multi-sheet files use an inline sheet picker, not `prompt()`.
- Common Vietnamese/English column aliases are mapped.
- Full mapping-review screen, per-row validity summary and “valid rows only” choice remain open.

### PASS 10 — Normalization / validation
Status: PARTIAL
- Numeric thousands separators and whitespace are normalized.
- Existing quotation validation remains authoritative.
- Grid shows inline missing-name validation.
- Expanded phone/date normalization and cell-level error descriptions remain open.

### PASS 11 — Catalog/customer reuse
Status: PARTIAL
- Product name/group/unit datalists use the existing catalog.
- Exact catalog product selection autofills group/pack/unit/price.
- Rich chooser and customer autocomplete inside Inspector remain open.

### PASS 12 — Undo / redo / autosave
Status: PARTIAL
- Product add/delete/import and completed grid edits create undo snapshots.
- Top bar exposes autosave state and never shows successful persistence when storage write fails.
- General/design/layout undo coverage and explicit recovery UX remain open.

### PASS 13 — A4 refinement
Status: NOT STARTED in V6
V5.1 report fixes are preserved. Final V6 report/print visual audit remains required.

### PASS 14 — Quote Management
Status: PRESERVED from V5, V6 review pending.

### PASS 15 — Customer/Product Management
Status: PRESERVED from V5, V6 shared-grid consolidation pending.

### PASS 16 — Settings redesign
Status: PRESERVED from V5, V6 information architecture review pending.

### PASS 17 — Responsive
Status: PARTIAL
Desktop Studio is implemented. Tablet/mobile quick-edit/drawer behavior requires final QA.

### PASS 18 — Accessibility
Status: PARTIAL
Core labels, focus states, command palette and validation navigation exist. Full keyboard/focus audit remains open.

### PASS 19 — Performance / large data
Status: OPEN
The existing 72+ row baseline is covered. Dedicated 100/300/500-row performance gates remain required.

### PASS 20 — Final professional UX audit
Status: OPEN

## Regression principles
- No second product data model.
- No silent duplicate deletion.
- No `prompt()` for normal Excel sheet selection.
- No application `!important`.
- No increase above four application responsive media blocks.
- Existing report CSS debt ceiling remains unchanged.
- No merge while CI is red.

## Current release state
Branch: `feature/v6-studio-data-entry`
Version: `6.0.0-rc.1`
Cache generation: `pricereport-shell-v60-studio-rc1`

This is a development release candidate. It is not Definition-of-Done and must not be merged/published until all required gates are green and the open PASS items are resolved or explicitly superseded by a tested implementation.
