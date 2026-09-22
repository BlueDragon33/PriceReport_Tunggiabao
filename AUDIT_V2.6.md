# AUDIT V2.6 — Excel & Handwriting Smart Import

Date: 2026-09-22  
Branch: `feature/v2.6-smart-import`  
PR: #21

## User-source baseline

The supplied workbook is treated as the authoritative source for the initial price-list structure:
- HKD - Tùng Gia Bảo
- address: Lô BT02-25 đường số 29 KĐT Nam Nha Trang
- 72 price rows
- 3 product groups: eggs, poultry, pork
- columns: STT / Mặt hàng / ĐVT / Đơn giá / Ghi chú
- closing date line and HKD TÙNG GIA BẢO signature

The supplied handwriting image contributes the phone number `0962944688` and confirms the intended “BẢNG BÁO GIÁ / Kính gửi Quý khách hàng” wording.

## Data-model changes

- Product objects now optionally include `group`.
- Added `quoteSubtitle`.
- Added `showPack` and `showQty`.
- Existing storage keys and full-backup schema remain unchanged; new fields are backward-compatible optional state fields.
- Catalog normalization preserves product group.

## Excel import

- Lazy-loads SheetJS only when a workbook is chosen.
- Reads the first worksheet as an ArrayBuffer.
- Detects metadata rows and product-table headers semantically.
- Preserves product groups.
- Maps relevant document fields and layout hints.
- Shows a review dialog before modifying live state.
- Can replace the current product list only when the user leaves that option enabled.

## Handwriting import

- Lazy-loads Tesseract.js only when an image is chosen.
- Uses Vietnamese + English OCR.
- Upscales / grayscale / contrast-preprocesses images where supported.
- Maps company, phone, title, recipient and address-like lines.
- Shows OCR raw text for manual correction and reparsing.
- Never writes OCR output directly into the quotation without review + Apply.

## Related-field supplementation

Before Apply, the importer can derive safe related fields when they are missing:
- generic recipient line;
- section title from detected groups;
- signer name from HKD company name;
- HKD signature title;
- footer phone;
- Nha Trang date line when month/year is detectable from subtitle.

No product price, product name or quantity is invented.

## Migration

The exact legacy Biển Uyên Bảo reference profile is migrated to the requested Tùng Gia Bảo baseline. Non-matching customized company profiles are not overwritten.

## Offline behavior

- PWA cache bumped to v16.
- Same-origin dynamic chunks are cached on first request.
- Successful/opaque OCR runtime resources are also runtime-cached.
- First-ever OCR use may still require network access for language/core resources.

## Regression coverage

- Pure importer tests: Excel metadata, groups, products, OCR text mapping, merge behavior.
- DOM tests: new Tùng Gia Bảo baseline, grouped table rows, smart-import review via corrected OCR text.
- Existing V2.3–V2.5 data safety, history, print, layout editor and auto-arrange tests remain active.
- Smoke gates cover smart-import controls, lazy imports, grouped rows, new columns and PWA v16.

## Release gate

Merge only after the final PR head passes:

```
npm test
npm run build
```

After merge, confirm the Pages workflow for the exact merge commit.
