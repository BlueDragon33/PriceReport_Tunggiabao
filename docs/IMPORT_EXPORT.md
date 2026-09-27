# IMPORT EXPORT

Import parsing stays in `src/importers.js`. Excel/CSV/paste/OCR input is untrusted and must pass mapping, normalization, review and validation before commit.

CSV/Excel export uses structured data. PDF/print uses the A4 report tree. V6.19 makes preview and Excel totals consume the same `calculateQuoteBreakdown()` engine.
