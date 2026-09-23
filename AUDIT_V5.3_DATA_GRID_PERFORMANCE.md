# V5.3 Data Grid & Large Dataset — Audit

Date: 2026-09-23

## Baseline

This pass starts from the green V5.2 RC1 head `a72d9fbaac986eb796d560e37326c995ebdfab1c`.
V5.2 remains isolated as the stable release-candidate checkpoint.

## Prompt target

Continue the data-entry redesign for users who mainly enter and reuse business data:
- keep Studio and Data Library on the same data/storage model;
- improve search and large-list handling;
- verify practical behavior at 100 / 300 / 500 products;
- preserve keyboard-first product entry and existing business logic;
- do not create a second product/customer engine.

## Pass 11 — Batched rendering and large-dataset regression

### Finding

Both Studio product rendering and Data Library rendering appended each row directly into the live DOM. At 300–500 products this creates hundreds of incremental DOM mutations and increases layout/render work.

Data Library search also compared raw lowercase text, so Vietnamese searches without accents could miss records such as `Trứng` when the user typed `trung`.

### Corrections

- Studio product rows are built in a `DocumentFragment` and committed to the live DOM once per render.
- Customer Library rows are built in a `DocumentFragment` and committed once.
- Product Library rows are built in a `DocumentFragment` and committed once.
- Search normalization now:
  - normalizes Unicode;
  - collapses whitespace;
  - lowercases Vietnamese text;
  - removes combining accents for search only;
  - maps `đ` to `d`.
- Display/storage values remain unchanged.

### Regression coverage

- Spreadsheet parser is exercised with 100, 300 and 500 product rows.
- Data Library is rendered with 100, 300 and 500 product records.
- Search verifies `trung so 500` finds `Sản phẩm Trứng số 500`.
- Tests assert full row counts instead of silently truncating large datasets.

### Gate

Required before continuing:
1. V5 UI/debt guards green.
2. Importer large-dataset regression green.
3. DOM 100/300/500 regression green.
4. Smoke green.
5. Production build green.

### Next pass

After the gate is green, audit Data Management Center controls against the prompt: filter, bulk selection, duplicate review and Excel import/export using the existing shared storage/data model.
