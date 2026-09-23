# V5.4 Data Management — Audit

Date: 2026-09-23

## Baseline

This track starts from V5.3 RC1 on `main` after PR #43. The old stacked PR #42 is treated as reference only because its base predates the squash-merged V5.2/V5.3 line.

## Pass 1 — Large dataset rendering and search

### Finding

Studio product rows and Data Library rows were appended directly into the live DOM one at a time. At several hundred records this creates unnecessary DOM mutation/layout work.

Data Library search also used raw lowercase text, so an operator typing Vietnamese without accents could fail to find accented data.

### Corrections

- Studio product rows are built in a `DocumentFragment` and committed once.
- Customer Library rows are built in a `DocumentFragment` and committed once.
- Product Library rows are built in a `DocumentFragment` and committed once.
- Data Library search now normalizes whitespace/case and removes Vietnamese combining accents for search only, including `đ → d`.
- Display values and persisted values are not rewritten.
- Existing customer/product localStorage collections remain the only storage engines.

### Regression coverage

- Spreadsheet parser: 100 / 300 / 500 product rows.
- Data Library DOM: 100 / 300 / 500 product records.
- Accent-insensitive query: `trung so 500` finds `Sản phẩm Trứng số 500`.
- Full row counts are asserted so large datasets cannot be silently truncated.

## Safety decision on old PR #42

The old branch contains visible Data Library Import/Export controls and a review modal without JavaScript handlers. Those controls are intentionally **not** ported in Pass 1. A control that cannot execute its advertised action is a functional defect, not a placeholder to ship.

## Gate

Before continuing:
1. syntax + V5 UI/debt guards;
2. importer 500-row regression;
3. DOM 500-row regression;
4. full business/storage/service-worker suite;
5. smoke;
6. production build;
7. GitHub Actions green on the exact head.

## Next pass

After the gate is green, add Data Management filters, duplicate review and bulk selection using the existing storage model. Import/export UI will be added only in the pass that wires its complete parse → review → apply/export behavior.
