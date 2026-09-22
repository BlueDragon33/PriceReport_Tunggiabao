# AUDIT V2.7 — Software QA, UX & Professional Report Review

Date: 2026-09-22  
Branch: `audit/v2.7-qa-report-hardening`  
PR: #22

## Audit scope

V2.7 re-audits the released V2.6 application as:
1. functional/software tester;
2. end-user UX tester;
3. data-safety tester for local-first behavior;
4. import/OCR tester;
5. professional quotation/report designer;
6. print/PDF stress tester for the 72-row, 3-group Tùng Gia Bảo price list.

The audit preserves the existing architecture, storage keys, backup schema v4, currency rules and A4 geometry baseline.

## Functional findings fixed

### 1. False-success persistence messages
Several manual actions called LocalStorage writers and then always showed a success toast.

Fixed:
- delete history quotation;
- save/delete customer library;
- save/delete product catalog;
- save/delete preset;
- load/duplicate/new quotation autosave feedback;
- use customer;
- add catalog product;
- use preset;
- auto-arrange/reset layout;
- Smart Import Apply.

A manual action no longer claims durable persistence when storage rejects the write.

### 2. Smart Import stale session
Closing/canceling and later importing another file could retain the old draft.

Fixed:
- Cancel discards the draft;
- X/temporary close can preserve review state;
- explicit **Bắt đầu lại** resets fields, file inputs, OCR text and preview;
- Apply discards the completed draft after copying data into the quotation.

### 3. Smart Import concurrency and oversized files
Added:
- busy state for Excel/OCR;
- close/cancel guard while OCR/import is processing;
- 12 MB Excel guard;
- 10 MB image guard;
- progress announced through an ARIA live status.

### 4. OCR failure fallback
Previously the app said the user could enter OCR text manually, but the parent review panel could remain hidden.

Fixed:
- OCR failure creates a review draft;
- raw OCR textarea remains accessible;
- user can type/correct text and reparse without rerunning OCR.

### 5. Multi-sheet workbooks
V2.6 used only the first worksheet.

V2.7 parses every sheet, scores semantic usefulness using product/group/field count, and chooses the best match. A warning states which sheet was selected when the workbook has multiple sheets.

### 6. Spreadsheet false product rows
A row with numeric STT and text name could be accepted even when the price cell was non-numeric because invalid prices normalized to zero.

Fixed:
- product-row detection now requires a valid numeric price parse;
- a genuine numeric price of 0 remains valid.

### 7. Import source duplication
Repeated OCR reparsing could produce labels such as `excel+handwriting+handwriting`.

Fixed by normalized unique source parts.

### 8. New quotation / preset stale period
Period-specific subtitle/date information could carry into a new quotation or reusable preset.

Fixed:
- new quote subtitle starts blank;
- date signature line derives from current local month/year;
- reusable preset clears quote period and receives a current date signature line.

### 9. Large product editor UX
Opening 72 full product cards was unnecessarily long and heavy.

Fixed:
- datasets with 24+ rows open collapsed;
- individual expand/collapse and “Mở tất cả” remain available;
- print and data are unchanged.

## Professional report-design findings fixed

### Title hierarchy
V2.6 inserted `quoteSubtitle` into a flex container originally designed for a single title, allowing title/subtitle to lay out horizontally.

Fixed:
- title wrapper is now column-oriented;
- title and subtitle form a clear vertical hierarchy;
- subtitle follows title alignment;
- empty subtitle disappears cleanly;
- modern/reference template uses restrained italic serif subtitle styling.

### Spacing profile
UI/CSS used `airy`, while imported-state normalization allowed `relaxed`; “Thoáng” could silently return to Standard after reload.

Fixed:
- legacy `relaxed` migrates to `airy`;
- `airy` is the canonical persisted value.

### Group headers in multi-page print
Added break rules to reduce the chance of a group heading being stranded at the bottom of a printed page without its first product row.

### Numeric/table hierarchy
- price/amount headers are right-aligned to match numeric cells;
- group rows remain visually distinct without using excessive decoration;
- existing repeating `thead`, row break avoidance and multi-page overflow rules remain active.

## Eight-template audit

All eight templates continue to use the same document geometry:
- Modern / Chuẩn công ty
- Corporate / Doanh nghiệp
- Minimal / Tối giản
- Classic / Trang trọng
- Emerald / Xanh thương hiệu
- Warm / Ấm nhẹ
- Premium / Cao cấp sáng
- Mono / Đen trắng

Theme switching changes styling, typography and accent treatment only. Automated regression verifies:
- all product rows remain present;
- all 3 product groups remain present;
- current company/business data does not change;
- current product data does not change.

## Stress / regression coverage

Final automated suite on the pre-documentation head:
- core logic: PASS;
- importer logic: PASS;
- DOM integration: 21/21 PASS;
- static smoke: PASS (254 IDs, 82 bindings, 25 preview targets);
- Vite build: PASS with Vite 7.3.6.

The suite covers the 72-row Tùng Gia Bảo baseline, grouped rendering, all eight templates, storage quota failure, Smart Import session reset, title/subtitle hierarchy, large-list collapse, airy spacing persistence, layout editor and backup rollback.

## Dependency / release hardening

Pinned tested direct versions:
- Vite 7.3.6
- Vitest 3.2.7
- jsdom 26.1.0
- tesseract.js 7.0.0
- SheetJS 0.20.3 exact tarball

CI and Pages now run:

```
npm audit --omit=dev --audit-level=high
npm test
npm run build
```

On CI run #227, runtime audit returned `found 0 vulnerabilities`. Full install still reports 2 moderate warnings in the development dependency tree. Those warnings are not runtime vulnerabilities and are not force-upgraded because `npm audit fix --force` can introduce breaking major changes.

## Release criteria

Merge only when the final PR head passes:
- runtime dependency audit;
- importer/core logic;
- DOM integration suite;
- smoke contracts;
- production build.

After merge, verify the exact merge commit through the push-triggered GitHub Pages workflow.
