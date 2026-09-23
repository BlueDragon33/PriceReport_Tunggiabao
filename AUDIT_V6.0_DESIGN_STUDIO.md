# V6.0 Quotation Design Studio — execution audit

Date: 2026-09-23
Baseline: main @ 6cf1a1b4aee9e56121ebf7f5defe449f00be03e8

## Product target
Transform the quotation authoring flow from a step/form workflow into a professional quotation web application with:
- compact application navigation;
- unified quotation workspace;
- spreadsheet-like data entry;
- smart paste and Excel-first import;
- simple-by-default controls with advanced design tools behind progressive disclosure;
- preserved local-first persistence, report logic and migration compatibility.

## Gate rule
No merge or publish until tests, build and CI are green. Existing report logic and user data must remain compatible.

## PASS 1 — Baseline audit
Status: COMPLETE

Confirmed:
- V5.1 already hardens history identity, quote-number uniqueness, validation and A4 report behavior.
- Product entry still uses one card per product.
- Application sidebar still exposes internal quotation blocks as top-level modules.
- Excel import already uses the shared SheetJS parser path and should be extended, not duplicated.

## PASS 2 — Application navigation
Status: IMPLEMENTED / CI PENDING

Changes:
- Sidebar reduced to Trang chủ, Soạn báo giá, Quản lý báo giá, Khách hàng & sản phẩm, Cài đặt.
- Internal quotation blocks remain reachable through Studio controls and the compact mobile utility menu.
- V6 hook classes avoid adding another conflicting CSS override family.

## PASS 3 — Data-entry foundation
Status: IMPLEMENTED / CI PENDING

Changes:
- Product workspace exposes four primary actions: Thêm dòng, Dán dữ liệu, Nhập từ Excel, Chọn từ danh mục.
- Added spreadsheet-like product grid presentation while preserving existing product state and report rendering.
- Added direct multi-cell paste handling for TSV/Excel clipboard data.
- Excel action reuses the existing smart-import workflow.
- Enter on the last price/note field creates the next row.

## PASS 4 — Shared Smart Paste parser
Status: IMPLEMENTED / CI PENDING

Changes:
- Added parseProductClipboardText() to src/importers.js.
- Supports header aliases in Vietnamese/English and positional fallback.
- Normalizes common numeric forms through the existing shared number parser.
- Added regression coverage for header-based and positional clipboard data.

## Remaining passes
- Studio three-region shell and canvas/editor unification.
- Inspector separation: Thiết kế / Nội dung / Kiểm tra.
- Full grid keyboard navigation, autocomplete and bulk edit.
- Excel multi-sheet chooser and user-visible mapping review.
- Dirty-data review, duplicate detection and inline validation.
- Undo/redo transaction history including paste/import.
- Customer/catalog autocomplete and shared Data Grid engine.
- Export round-trip refinement.
- A4/report multi-page QA.
- Responsive/mobile quick-edit mode.
- Accessibility and large-data performance pass.
- Final regression, build, CI, production deployment and production verification.

## Definition-of-done policy
This document must not be marked complete until all user-facing gates in the V6 specification are reproducibly satisfied.
