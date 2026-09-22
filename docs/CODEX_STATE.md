# PriceReport_Tunggiabao — Project State

## Current phase
Webapp V1 foundation on `feat/webapp-v1-foundation`.

## Product objective
A responsive, installable quotation webapp with an editable data panel and live A4 print preview. Printed business content must have a corresponding editor field or an explicit visibility control.

## V1 implemented scope
- Company, customer, quotation, products, payment, commercial terms and signature editors.
- Live A4 preview.
- Product rows with automatic subtotal, discount, VAT, fees and total.
- VND amount in Vietnamese words.
- Four visual templates and selectable accent colors.
- Logo upload, print visibility controls, A4 margin/font controls.
- Browser autosave and JSON import/export.
- Print / Save PDF through the browser.
- PWA manifest + offline service worker.
- Responsive desktop/mobile shell.

## Release gates
1. Syntax/static validation PASS.
2. DOM contract tests PASS.
3. Print/A4 contract PASS.
4. PWA/offline contract PASS.
5. Runtime browser smoke test PASS.
6. Visual/user-flow review PASS.

Do not merge the feature branch into `main` until all gates pass.
