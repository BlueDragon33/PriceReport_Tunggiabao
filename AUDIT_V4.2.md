# AUDIT V4.2 — Dashboard workflow semantics

## Defects found after V4.1
1. Dashboard actions labeled “Tạo báo giá mới” only opened the current editor state instead of creating a new quotation.
2. Dashboard customer/product cards did not navigate to the matching master-data section, which made the application feel less direct.
3. The sidebar label “Tạo báo giá” was ambiguous because opening the editor does not always create a new quotation.

## V4.2 fixes
- Dashboard new-quotation actions now use explicit `data-create-quote` behavior wired to `createNewQuote()`.
- Sidebar editor entry is renamed to “Soạn báo giá”.
- Customer and Product dashboard cards use focused master-data navigation.
- Master-data cards have stable ids and a short visual highlight after navigation.
- Existing studio, history, report and export logic remain unchanged.

## Regression gates
- True create-new action must exist and be wired.
- Focused master-data navigation controller must exist.
- Customer and Product master targets must exist.
- Visual focus feedback must exist.
- Service-worker cache version is advanced.

## Version
- App: 4.2.0
- Service worker cache: pricereport-shell-v30-workflow
