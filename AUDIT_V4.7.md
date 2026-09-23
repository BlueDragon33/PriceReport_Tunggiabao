# AUDIT V4.7 — Publishing & Data Center

## Problem
Export / Import / Print, PC storage and application backup were functionally complete but presented as generic stacked tool cards inside the narrow quotation editor. This made finalization and data-safety workflows harder to scan.

## V4.7 changes
- Promote Export / Import / Print into a full-width application workspace.
- Add publishing status summary:
  - Current quotation
  - Lifecycle status
  - Preflight readiness
  - Named product count
  - Total reusable/stored application records
- Split operations into clear areas:
  - Publish quotation
  - Import data
  - PC workspace
  - Full backup & restore
- Preserve all existing handler IDs and existing PDF/print, Excel, OCR, JSON and File System Access logic.
- Add full-backup scope counts for quotation history, customers and product catalog.
- Keep current-quotation reset isolated in a clear danger zone.
- Add direct A4 preview actions from the publishing center.

## Print safeguard
The export workspace uses application mode, which hides the normal preview on screen. A print-specific override forces the A4 preview visible during printing so the full-width workspace cannot suppress printed output.

## Data safety
- Existing import transaction / rollback behavior remains unchanged.
- Full restore keeps schema validation, confirmation and storage rollback.
- No business data is sent to an external service by the new UI.

## Regression coverage
- Export workspace enters application mode.
- Readiness and current-quotation context render.
- Excel, OCR, JSON, PC folder and full-backup controls remain present.
- Smoke gates require the full-width workspace, backup scope counters, renderer and print safeguard.

## Version
- App: 4.7.0
- Service worker cache: pricereport-shell-v35-publishing-center
