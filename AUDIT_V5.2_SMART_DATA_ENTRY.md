# V5.2 Smart Data Entry — Pass 1 audit

Date: 2026-09-23

## Scope
First implementation pass from the full PriceReport redesign specification, focused on spreadsheet ingestion and low-friction data entry.

## Confirmed gap
V5.1 improved Quotation Studio workflow, but spreadsheet product parsing still depended heavily on the historical STT / Mặt hàng / ĐVT / Đơn giá layout. That does not satisfy the target flow where users can paste or import ordinary Excel tables and let the application infer columns first.

## Corrections implemented
- Added reusable spreadsheet column inference.
- Added aliases for Vietnamese and common English headers:
  - Tên sản phẩm / Tên SP / Sản phẩm / Hàng hóa / Mặt hàng / Product.
  - Nhóm hàng / Group / Category.
  - Quy cách / Packaging / Specification.
  - ĐVT / Đơn vị / Đơn vị tính / Unit / UOM.
  - SL / Số lượng / Quantity / Qty.
  - Giá / Đơn giá / Price / Unit Price.
  - Ghi chú / Note / Notes / Remarks.
- Added confidence values for inferred mappings.
- Generic spreadsheet rows can now become products without requiring an STT column.
- Imported product values are normalized through one helper.
- Numeric parsing now accepts spaced thousands such as `28 000` in addition to `28.000`, `28,000` and `28000`.
- Whitespace in text cells is normalized before insertion.
- Existing historical-format importer remains as fallback to avoid regression.

## Regression coverage added
- Vietnamese alias mapping.
- English alias mapping.
- Generic table import without STT.
- Dirty whitespace normalization.
- Spaced thousands separator.
- Quantity and unit preservation.

## Gate
Required before merge:
- importer tests green;
- full npm test green;
- DOM regression green;
- smoke green;
- production build green;
- GitHub Actions CI green.

## Next implementation pass
Wire inferred mapping metadata into the user-facing Excel import review screen so users can see and correct the guessed mapping before committing rows. This will be followed by Smart Paste and Undo Import history integration.


## Pass 2 — Multi-sheet workbook selection

### Finding
The importer scored every sheet and silently selected the best candidate. That is useful as a default, but it did not satisfy the intended workflow for workbooks with multiple relevant sheets because the user could not inspect or switch the selected sheet.

### Corrections
- Added a dedicated sheet chooser that appears only when a workbook contains more than one sheet.
- The highest-scoring sheet remains selected by default.
- Each option shows the sheet name and number of recognized rows.
- Switching sheets rebuilds the parsed product set, mapping preview, invalid-row count and duplicate detection before import.
- Manual review fields already edited by the user are preserved when switching sheets.
- Single-sheet files keep the chooser hidden to preserve Simple Mode.
- Responsive behavior uses the existing V5 layout system without adding another media-query layer.

### Regression guard
DOM regression now verifies that the multi-sheet chooser exists, is accessible and remains hidden by default.

### Next pass
Improve row-level review for invalid and duplicate data so the user can inspect problematic rows instead of only seeing aggregate warning counts.


## Pass 3 — Row-level invalid and duplicate review

### Finding
The import flow already calculated invalid rows and duplicate groups, but the UI exposed only aggregate counts. Users could see that something was wrong without seeing which source rows caused the warning.

### Corrections
- Added a dedicated “Dòng cần kiểm tra” review surface.
- Invalid rows show original row number, captured name/quantity/price values and a Vietnamese reason.
- Invalid rows remain excluded from the import result.
- Duplicate candidates show the names involved and explicitly state that the application keeps all rows.
- The issue panel stays hidden when no issue exists, preserving Simple Mode.
- Styling uses existing V5 semantic tokens and adds no new responsive layer.

### Regression guard
DOM regression verifies the issue-review structure exists and remains hidden by default.

### Next pass
Add a controlled correction path for invalid rows so users can repair a row before applying the import, while preserving the current safe “only valid rows” default.


## Pass 4 — Repair invalid rows before import

### Finding
Row-level issue review identified the exact source row, but the user still had to leave the import flow, edit the original workbook and start again. That breaks the target “just enter data” workflow.

### Corrections
- Invalid spreadsheet rows now expose inline repair controls for mapped product name, quantity and price.
- Repair writes back into the imported row buffer, then reruns the same mapping/parser pipeline.
- A repaired row is inserted into the preview only after it passes validation.
- If the row is still invalid, it remains excluded and the UI explains that it still needs correction.
- Original workbook row numbers are preserved in the issue review.
- No invalid row is silently coerced or imported.

### Regression coverage
Importer tests now verify an invalid mapped row is excluded, can be corrected in the same row buffer, and becomes a valid product only after reparse.

### Next pass
Add explicit duplicate-resolution controls with safe defaults: keep all, skip selected duplicate, or merge only when the user asks.


## Pass 5 — Controlled duplicate resolution

### Finding
Duplicate candidates were visible but the only behavior was “keep everything”. The target workflow requires safe resolution controls without allowing the importer to silently delete or merge business data.

### Corrections
- Duplicate detection now preserves original workbook row numbers.
- Default remains “keep all”.
- Users can explicitly skip an individual later duplicate row for the current import only.
- Skip actions support immediate Undo.
- “Merge quantity” appears only when:
  - the duplicate rows share the same detected product signature;
  - all duplicate rows have the same unit price;
  - a quantity column is mapped.
- Merge updates the first source row quantity, excludes the later duplicate rows, reparses the import, and supports Undo.
- Rows with different prices are never auto-merged.
- Excluded source rows are persisted in the import draft so remapping/re-rendering does not resurrect them.

### Regression coverage
Importer tests verify duplicate source row numbers, quantities, prices and explicit source-row exclusion.

### Next pass
Add data-normalization and validation improvements for phones, money and text values, then audit autosave/import history interactions before moving deeper into Data Library.


## Pass 6 — Import normalization for real-world copied data

### Finding
Common business input formats still produced avoidable failures:
- currency values such as `28.000 đ` or `32,000 VND`;
- Vietnamese phone numbers entered as `+84...` or `0084...`;
- hidden zero-width characters introduced by copy/paste from web or spreadsheet sources.

### Corrections
- Money parsing now strips common VND/USD/RUB currency markers before numeric normalization.
- Vietnamese `+84` and `0084` phone formats are normalized to a leading-zero local number during import.
- Spreadsheet and OCR phone extraction share the same import normalization helper.
- Zero-width characters are removed before text whitespace normalization.
- Existing number-separator behavior remains unchanged.

### Regression coverage
Importer tests now cover:
- `+84` / `0084` / dotted Vietnamese phone formats;
- `28.000 đ` and `32,000 VND` money values;
- hidden zero-width characters in copied product names.

### Next pass
Audit autosave, import undo and recovery interactions so a large import cannot leave the current quote or recovery snapshot in an inconsistent state.


## Pass 7 — Transactional import apply, undo and recovery

### Finding
The base autosave/recovery system was already present, but smart import still had two data-integrity gaps:
- an imported quantity of `0` was converted to `1` during apply because of a truthy fallback;
- if primary localStorage persistence failed, the import modal still closed even though the new quote state had not been durably saved.

### Corrections
- Explicit quantity `0` is preserved during import apply.
- Smart import apply is now transactional:
  - build candidate state;
  - attempt primary autosave;
  - on failure, roll back in-memory state to the pre-import snapshot;
  - clear the temporary recovery snapshot created by the failed candidate write;
  - keep the import review open so the user can retry without re-importing the source.
- Successful apply still creates one-step Undo.
- Undo now retains its snapshot when persistence fails and exposes “Thử lưu lại” instead of discarding the only retry path.

### Regression coverage
DOM tests now verify:
- imported quantity zero remains zero after apply;
- primary-storage failure rolls the state back;
- the import review stays open after a failed apply;
- no stale recovery snapshot is left after transactional rollback.

### Next pass
Audit Data Library reuse flows and import-to-library handoff so repeated customer/product entry is reduced without creating a second storage engine.


## Pass 8 — Data Library reuse without a second storage engine

### Finding
Customer and product reuse already shared one local-first Data Library, but two friction points remained:
- saving the current product set required leaving the product-entry surface;
- reusable-data keys treated formatting differences such as `+84...` vs `0...`, repeated spaces and casing differences as different records.

### Corrections
- Added a direct “Lưu danh mục” action to the product-entry command bar.
- The action reuses the existing product-catalog persistence path; no parallel catalog/store was introduced.
- Customer identity now canonicalizes Vietnamese phone formats for deduplication.
- Customer fallback identity and product identity now collapse internal whitespace, normalize Unicode and compare case-insensitively.
- Display values remain untouched; canonicalization is used only for identity/deduplication.

### Regression coverage
DOM tests verify:
- the product-entry surface exposes the direct library-save action;
- saving the same customer once with `+84` and once with local `0` phone format updates one library record instead of creating two.

### Next pass
Audit the Studio’s product/customer search and keyboard paths for “data-entry-only” users, then clean remaining friction before promoting V5.2 to a release candidate.


## Pass 9 — Canonical autocomplete for data-entry users

### Finding
The Studio already supported keyboard-oriented product entry and datalist suggestions, but suggestion matching still used raw trimmed/lowercase strings. Data Library deduplication had become canonical while autocomplete had not, so the same reusable record could fail to load when the user typed a different phone format or extra spaces.

### Corrections
- Customer autocomplete now uses the same canonical phone/text identity as Data Library deduplication.
- A customer stored as `0912...` can be selected by entering the equivalent `+84...` format.
- Product autocomplete now collapses whitespace and compares canonical text before loading catalog data.
- Existing product-row keyboard behavior is preserved: arrows move vertically, Enter moves down/creates a row, Tab from the last note field creates the next row.

### Regression coverage
DOM tests verify:
- canonical phone autocomplete loads the existing customer record;
- a product name with different casing/extra spaces still loads the stored group, pack, unit and price;
- the test restores product state after verification so later regression tests remain isolated.

### Next pass
Run a full V5.2 gate and inspect any remaining failures. If green, perform release-candidate cleanup: audit file debt, service-worker cache generation and final UX smoke before merge.


## Pass 10 — V5.2 Release Candidate packaging

### Release identity
- Package version: `5.2.0-rc.1`.
- Service Worker generation: `pricereport-shell-v52-smart-entry-rc1`.
- The production materializer continues to append only its managed/local deployment suffix, preserving the V5.2 release generation.

### RC scope completed
- Smart spreadsheet header/column inference.
- Smart Paste and mapping review.
- Multi-sheet workbook selection.
- Row-level invalid-data review and repair.
- Controlled duplicate skip/merge with Undo.
- Real-world currency/phone/copied-text normalization.
- Transactional import apply/Undo/recovery behavior.
- Data Library canonical identity and direct product-library save.
- Canonical customer/product autocomplete in Studio.

### Locked safeguards retained
- V5 application CSS: zero `!important`.
- V5 responsive layer: maximum four media-query blocks.
- Report CSS remains isolated under its existing debt ceiling.
- No second customer/product persistence engine.
- No silent duplicate deletion or merge.
- No merge to `main` until the final RC CI head is green.

### Final RC gate
Required:
1. syntax and UI/debt guards;
2. importer/core/exporter/service-worker logic tests;
3. DOM regression tests;
4. smoke tests;
5. production build;
6. GitHub Actions green on the final RC commit.

Visual/browser interaction validation remains distinct from source/DOM CI and must not be falsely reported as completed when no browser render was performed.
