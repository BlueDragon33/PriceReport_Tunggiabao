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


## Pass 12A — Data Management filters, duplicate review and bulk selection

### Finding

The Data Management Center had basic search and per-row use/delete actions, but the prompt requires a practical management surface for repeated data work. Missing controls included structured filters, duplicate visibility and bulk selection.

### Corrections

Customer Library:
- filter all / has phone / missing phone / has email / missing email;
- per-row selection;
- bulk clear selection;
- bulk delete with confirmation.

Product Library:
- dynamic group filter;
- currency filter;
- duplicate-only filter;
- duplicate group count and non-destructive warning;
- per-row selection;
- bulk add selected products to the quotation using one save/render cycle;
- bulk delete with confirmation;
- bulk clear selection.

Duplicate review uses the existing canonical product identity (group + name + pack + unit) and never deletes or merges automatically.

### UX / architecture

- Existing customer/product localStorage collections remain the only persistence engines.
- Filters reuse canonical search and normalization logic.
- Toolbars use flex wrapping; no additional responsive media-query block was introduced.
- Selected records are pruned automatically when underlying data is removed.
- Bulk add batches state mutation and performs one save/render instead of repeatedly invoking the single-row path.

### Regression coverage

DOM tests verify:
- duplicate count and duplicate-only filtering;
- group and currency filtering;
- customer missing-phone filtering;
- product row selection and bulk-bar state;
- selection clearing.

### Next pass

Pass 12B: add Data Library Excel/CSV import/export by reusing the existing XLSX/import parsing and normalization layers. Imports must preview/validate before persistence and must not introduce a second import engine.


## Pass 12B1 — Shared Data Library import core

### Goal

Prepare Excel import for both Product Library and Customer Library without introducing a second parser architecture.

### Corrections

- Generalized header inference around one shared scoring engine.
- Product and customer schemas now provide their own alias dictionaries to the same inference core.
- Added customer spreadsheet inference for:
  - customer name;
  - company / organization;
  - phone;
  - email;
  - address;
  - contact person.
- Added customer row parsing with:
  - Vietnamese phone normalization;
  - invalid-row reporting for rows without a reusable identity;
  - duplicate detection by normalized phone first, otherwise name + company.
- Product import now recognizes an optional currency column.
- Full spreadsheet product parsing now preserves detected currency.
- Corrected the duplicate-signature empty-value guard to match literal pipe separators.

### Regression coverage

- Vietnamese customer headers.
- English customer headers.
- +84/local phone duplicate detection.
- invalid customer rows.
- product currency import.

### Gate before UI

Run the full CI suite before adding Data Library import/export controls and preview.
