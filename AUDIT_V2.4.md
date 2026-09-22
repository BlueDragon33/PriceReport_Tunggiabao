# AUDIT V2.4 — Direct Preview Layout Editor

Date: 2026-09-22  
Branch: `feature/v2.4-preview-layout-editor`  
PR: #19

## Scope

V2.4 adds direct visual layout editing to the existing A4 quotation preview without changing quotation calculations, storage keys, full-backup schema v4, currency rules, or the shared A4 template geometry baseline.

## Implemented

- Added a toolbar **Sắp xếp** mode on the A4 preview.
- Added pointer/touch dragging for top-level preview blocks and granular business fields.
- Drag offsets are stored as millimetres in `state.layoutOffsets`.
- Layout keys are allowlisted and imported offsets are clamped to safe X/Y bounds.
- Arrow keys nudge the selected block by 0.5 mm; Shift + arrow uses 2 mm.
- Added one-click reset for all direct block positions.
- Preview click-to-edit is temporarily suspended while layout mode is active to prevent accidental tab switching during drag.
- Layout configuration is preserved when creating a new quotation and is naturally carried by reusable presets.
- Logo width range expanded to 18–90 mm with +/- controls.
- Added independent logo X/Y offsets.
- Logo image is absolutely positioned inside a fixed 31 mm header slot and visually scaled using a CSS variable, so resizing does not increase header height or push document content.
- Dragging and logo scaling are retained in print/PDF output while edit-mode outlines are removed by print CSS.
- Added responsive handling so the selection badge does not crowd the preview toolbar on narrower screens.
- PWA cache bumped to `pricereport-shell-v14`.

## Regression coverage

- DOM test: enable layout mode, drag an individual company field, persist normalized mm offsets.
- DOM test: grow/shrink logo, verify independent visual scale, drag a section and reset all positions.
- Smoke gates: required layout controls, draggable markers, layout normalization/editor functions, fixed-slot logo scaling, Service Worker v14.
- Existing business logic and data-safety regression suite remains unchanged.

## Invariants preserved

- Existing localStorage keys are unchanged.
- Full backup schema remains version 4 and old backups remain compatible because missing V2.4 fields fall back to defaults.
- A4 base geometry remains the template baseline; direct offsets are user-authored overrides layered on top.
- Product totals, discount, VAT, fees, currency isolation, history identity, customer/catalog normalization and preflight rules are not modified by this feature.
- No new backend, login system or remote data dependency was introduced.

## Release gate

Merge only after the final PR head passes:

```
npm test
npm run build
```

GitHub Pages deployment must be checked separately after merge because the available GitHub connector exposes PR-triggered CI runs but not the push-triggered Pages workflow directly.
