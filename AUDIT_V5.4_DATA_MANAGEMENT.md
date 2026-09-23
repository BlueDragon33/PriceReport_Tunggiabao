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

## Pass 2 — Filters, duplicate review and bulk selection

### Corrections
- Customer filters: all / has phone / missing phone / has email / missing email.
- Product filters: dynamic group, currency and duplicate-only.
- Customer and product rows support explicit selection with persistent bulk bars.
- Bulk customer/product deletion uses confirmation and the existing storage collections.
- Selected products can be added to the quotation in one state/save/render cycle.
- Duplicate review is non-destructive; it only highlights and filters possible duplicates.

### Defect found during port
The old stacked implementation grouped duplicates by product identity **without currency**, even though the catalog intentionally allows the same reusable product in VND/USD/RUB. That produced false duplicate warnings for legitimate currency variants.

### Fix
Duplicate review now uses the existing canonical catalog identity: group + name + pack + unit + currency. A VND row and a USD row are distinct; two VND rows with the same canonical identity are still flagged.

### Regression coverage
- Same identity + same currency is detected as a duplicate group.
- Same identity + different currency is not included in that duplicate group.
- Duplicate-only, group and currency filters are exercised together.
- Customer missing-phone filter is verified.
- Product selection and bulk-bar clear behavior are verified.
- Smoke requires every new Data Management control ID.

## Next pass

After the full gate is green, implement Data Library Excel/CSV import/export as one complete flow. Do not expose import/export buttons before their handlers, review state, validation and persistence transaction are ready.

## Pass 3A — Shared Data Library import core

### Architecture
- Header inference is generalized around one scoring engine.
- Product and customer imports provide different alias dictionaries to that shared engine.
- No second spreadsheet parser is introduced.
- Customer parsing normalizes Vietnamese phone numbers and identifies reusable rows by name/company/phone/email.
- Product parsing now recognizes an optional currency column and preserves it for catalog import.

### Customer schema
Recognized fields:
- customer name;
- company / organization;
- phone;
- email;
- address;
- contact person.

Rows with no reusable identity are returned as invalid rows for review instead of being persisted silently.

### Duplicate inspection
Customer duplicates are reported by normalized phone first, otherwise canonical name + company. The parser reports row numbers and does not merge/delete records itself.

### Regression coverage
- Vietnamese and English-style customer header inference.
- +84/local phone normalization and duplicate detection.
- invalid customer row reporting.
- product currency import.

### Gate before UI
Run the full suite. Only after this parser core is green may the Data Library import/export controls and review modal be added.

## Pass 3B — Transactional Data Library import/export

### Import flow
- Visible import controls are added only after handlers are wired.
- Excel/XLS/CSV files are read through the existing `xlsx` dependency.
- Multi-sheet workbooks are scored and the best sheet is selected first; operators can switch sheets in the review modal.
- Customer rows use the shared customer parser.
- Product rows reuse the existing spreadsheet parser/mapping pipeline.
- The review modal shows:
  - rows eligible to apply;
  - existing records that will be updated;
  - invalid rows;
  - duplicate groups inside the source file.
- Invalid rows are skipped explicitly.
- Every row belonging to a duplicate group inside the same file is excluded from Apply. The system does not silently pick a winner or merge those duplicates.
- Existing canonical records are updated while preserving their IDs; new records receive new IDs.
- Each library is persisted once after the complete next state is built.

### Export flow
- Customer and product libraries can be exported as both Excel and CSV.
- Product exports preserve currency.
- Export column order is aligned with the import aliases so exported files can be re-imported without manual remodeling.

### Additional identity defect fixed before UI
The shared customer parser allowed email-only records, while the existing storage key previously used only phone or name+company. Email-only customers could therefore collapse onto an empty identity.

Customer identity now resolves in this order:
1. normalized phone;
2. canonical name + company;
3. canonical email.

The same fallback is used by importer duplicate detection and storage/update logic.

### Safety
Import/export UI is no longer a placeholder. Every visible control has a bound handler, and smoke guards the complete control contract.

