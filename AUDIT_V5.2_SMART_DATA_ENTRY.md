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
