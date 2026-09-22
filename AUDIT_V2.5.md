# AUDIT V2.5 — Persistent Arrange Mode & Auto Layout

Date: 2026-09-22  
Branch: `fix/v2.5-layout-mode-auto-arrange`  
PR: #20

## Bug fixed

V2.4 could lose the visual `layout-edit-mode` class whenever `render()` reassigned the A4 paper `className`. This made arrange mode appear to stop after a drag or after another edit/render, forcing the user to press Arrange again.

V2.5 makes arrange mode state explicit and persistent.

## Behavior

- Press **Sắp xếp** once to enter arrange mode.
- Drag as many blocks/fields as needed.
- Content edits and rerenders preserve arrange mode.
- Pointer capture stabilizes repeated mouse/touch drags.
- Escape only cancels/deselects the current manipulation; it does not exit arrange mode.
- Only **Xong sắp xếp** ends arrange mode.

## Automatic arrangement

A new **Tự động sắp xếp** action:
- clears manual `layoutOffsets`;
- resets logo X/Y offset while preserving the chosen logo size;
- centers the quotation title;
- selects header gap, content spacing, table density and line height based on product count/text volume;
- keeps arrange mode active afterward so the user can continue manual fine tuning.

## Preserved invariants

- Existing localStorage keys are unchanged.
- Backup schema remains v4.
- Currency, totals, history identity, customer/catalog normalization and print preflight logic are unchanged.
- A4 base geometry remains the safe fallback.
- Auto-arrange does not modify product values, prices, quantities or business data.
- No backend dependency added.

## Regression coverage

- Repeated drag #1 then drag #2 without re-entering arrange mode.
- Rerender caused by content edit while arrange mode remains active.
- Escape does not leave arrange mode.
- Explicit Done exits arrange mode.
- Auto arrange resets offsets and logo X/Y while keeping arrange mode active.
- Existing V2.4/V2.3 DOM/business/smoke tests remain in the suite.

## Release gate

Merge only after final PR head passes both:

```
npm test
npm run build
```

After merge, confirm the push-triggered GitHub Pages workflow for the exact merge commit.
