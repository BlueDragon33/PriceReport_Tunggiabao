# IMPORT EXPORT

Import parsing stays in `src/importers.js`. Excel/CSV/paste/OCR input is untrusted and must pass mapping, normalization, review and validation before commit.

CSV/Excel export uses structured data. PDF/print uses the A4 report tree. V6.19 makes preview and Excel totals consume the same `calculateQuoteBreakdown()` engine.

## Backup service

`buildBackupPayload()`, `validateBackupPayload()` and `normalizeBackupPayload()` own backup envelope semantics. V6.19 exports appVersion/dataVersion while remaining compatible with older schema-v4 backups that omit those optional fields.

## Report model

`buildReportViewModel()` is the canonical document projection. Preview totals and Excel totals consume its shared totals object. Remaining field-level preview rendering is still a UI adapter over the same quotation source.
