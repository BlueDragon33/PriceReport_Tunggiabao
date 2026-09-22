# AUDIT V2.8 — Review Correctness & Professional Report Density

Date: 2026-09-22  
Branch: `audit/v2.8-review-report-density`  
PR: #23

## Scope

This is an independent follow-up audit after V2.7, focused on cases not fully covered by the earlier QA pass:
- edit/delete behavior inside Smart Import review;
- corrected OCR reparsing;
- mixed Excel + OCR source precedence;
- professional column density for the supplied 72-row Tùng Gia Bảo workbook;
- auto-arrange behavior for empty optional report columns.

The core architecture, storage keys, backup schema v4, quotation math, currency isolation and A4 baseline remain unchanged.

## Findings fixed

### 1. Review field deletion was not final

The review collector previously ignored empty values. If OCR recognized a phone/name and the user deleted it in the review, the old draft value survived and could still be applied.

Fixed:
- review inputs now track explicit manual edits;
- manual empty values are preserved as deliberate overrides;
- Apply respects an explicit user deletion;
- automatic field supplementation does not recreate a manually cleared recipient/signer field.

### 2. Corrected OCR could retain stale recognition

The “Phân tích lại văn bản OCR” action merged new recognition into the existing draft, but normal merge rules kept some already-populated handwriting fields.

Fixed:
- transient import draft now tracks per-field source provenance;
- corrected OCR reparsing removes only prior handwriting-origin values before applying the corrected OCR result;
- manual review overrides are reapplied after source merge.

### 3. OCR could override Excel metadata

A corrected OCR pass must not replace stronger metadata already extracted from Excel.

Fixed:
- field provenance distinguishes `excel`, `handwriting`, and manual review edits;
- source replacement only replaces fields originating from the same source;
- Excel company/address values remain authoritative unless missing;
- phone can still be filled by OCR when Excel does not provide it;
- direct manual review edits remain highest priority.

### 4. Empty Note column reduced report quality

The supplied workbook contains a “Ghi chú” header but all 72 product rows have empty notes. V2.7 used header presence alone, so the report could reserve unnecessary width for a blank column.

Fixed:
- Excel import enables Note only when the column exists **and at least one imported row actually contains a note**;
- the Tùng Gia Bảo baseline now defaults to Note hidden;
- Auto-arrange hides optional Pack/Note columns when every named product is empty for that field.

This increases usable width for product names and prices without deleting any data.

## Professional report review

For the current price-list use case, the preferred default hierarchy is:
1. business identity / contact;
2. centered report title + period subtitle;
3. recipient and short intro;
4. grouped table;
5. date/signature/footer.

For the 72-row Tùng Gia Bảo workbook:
- STT, product name, unit and price are the essential columns;
- Pack should remain hidden when empty;
- Quantity and Amount remain hidden for a pure price list;
- Note remains hidden while all notes are empty;
- group rows remain visible to preserve scanability across multiple pages;
- numeric columns stay right-aligned;
- repeating table header and print break protection from V2.7 remain active.

All eight templates continue to share the same A4 geometry. V2.8 does not add theme-specific geometry divergence.

## Regression coverage

CI #230 on the pre-documentation head:
- runtime dependency audit: **0 vulnerabilities**;
- core logic: **PASS**;
- importer logic: **PASS**;
- DOM integration: **24/24 PASS**;
- static smoke: **PASS** — 254 IDs, 82 bindings, 25 preview targets;
- Vite production build: **PASS**.

New regression cases:
- intentionally clear OCR phone in review, Apply keeps it empty;
- corrected OCR replaces stale handwriting recognition;
- mixed Excel + OCR reparse preserves Excel company/address;
- all-blank Note column imports hidden;
- a genuine non-empty Note enables the column;
- auto-arrange hides empty optional Pack/Note while retaining required business columns.

## Dependency state

Runtime security gate remains:

```
npm audit --omit=dev --audit-level=high
```

Result on CI #230: `found 0 vulnerabilities`.

The full development install still reports the same 2 moderate dev-tree warnings documented in V2.7. No force-upgrade is applied because it could introduce breaking major changes.

## Release criteria

Merge only after the final documentation head passes:
- runtime dependency audit;
- core/importer tests;
- DOM integration;
- smoke contracts;
- production build.

After merge, verify GitHub Pages for the exact merge commit.
