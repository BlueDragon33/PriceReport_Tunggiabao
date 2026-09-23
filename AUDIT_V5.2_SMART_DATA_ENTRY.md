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
