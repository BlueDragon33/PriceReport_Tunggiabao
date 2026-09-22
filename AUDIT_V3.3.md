# AUDIT V3.3 — Fixed Outside-Table Typography & Adjustable Table Font

Date: 2026-09-22  
Branch: `feature/v3.3-fixed-report-text-table-font`  
PR: #29

## Requirement

The report preview must keep all text outside the product table at a stable readable size. Users may increase/decrease only the product-table text.

## Implementation

### Fixed outside-table typography

V3.3 removes global scaling from the report root and fixes the following roles:

- company details: 11.6 px
- company name: 15.2 px
- subtitle: 13.2 px
- meta: 11.6 px
- recipient: 15.5 px
- introduction: 12.5 px
- section heading: 13.5 px
- quote title: 27 px
- summary: 11.4 px
- grand total: 12.2 px
- words: 11.8 px
- small headings: 12.5 px
- payment: 11.4 px
- terms: 11.5 px
- signatures: 11.5 px
- footer: 10.4 px

This is approximately +2 px over the old V3.2 baseline for the requested readability increase.

### Adjustable product table

New state:
`tableFontSize`

Range:
`7.5–14 px`

Only `.qtable` consumes `--fs-table`. Changing the slider no longer modifies company/header/title/recipient/intro/footer typography.

### UI cleanup

Removed:
- `docFontSize` control from the Design pane;
- duplicate global font-size control from the design sidebar;
- preview title-size slider.

Added synchronized:
- `tableFontSize`
- `designTableFontSize`

UI copy explicitly states the control affects only the product table.

## Backward compatibility

The legacy `docFontSize` field is kept in state/backup compatibility.

When `tableFontSize` is absent, V3.3 converts the former visual table scale:

`tableFontSize = 9 × (legacy docFontSize / 12.2)`

and clamps it to 7.5–14 px.

Example:
- legacy `docFontSize = 15`
- equivalent V3.3 table size ≈ 11.1 px

Thus old reports preserve their previous table readability while adopting the new fixed outside-table standard.

## Regression coverage

CI #246:
- runtime audit: 0 vulnerabilities
- Core logic PASS
- Importer logic PASS
- PC Storage logic PASS
- Logo Processing logic PASS
- 39/39 DOM + migration tests PASS
- Smoke PASS: 267 IDs, 82 bindings, 23 preview targets
- production build PASS

Tests specifically verify:
- table slider changes `--fs-table`;
- company name, recipient and quote-title sizes do not change;
- global/title font-size controls no longer exist;
- both table-size controls remain synchronized;
- legacy `docFontSize: 15` migrates to approximately 11.1 px.

## Release criterion

Merge only after the final documentation head repeats the complete CI and production-build gate.

After merge, verify GitHub Pages for the exact merge commit.
