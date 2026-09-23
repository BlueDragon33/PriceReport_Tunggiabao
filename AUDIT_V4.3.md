# AUDIT V4.3 — Quotation management workspace

## Problem
The V4 application shell had a modern Dashboard, but Quotation Management still rendered as generic stacked cards. This made scanning code, customer, date, value and lifecycle state slower than necessary on desktop.

## V4.3 changes
- Add a dedicated management workspace header and primary actions.
- Expand KPI summary with Pending count.
- Add result count for the active search/status filter.
- Replace stacked history cards with a six-column management table:
  - Quotation code
  - Customer
  - Date
  - Value
  - Status
  - Actions
- Preserve Open / Duplicate / Delete behavior.
- Delete refreshes both history management and Dashboard summary.
- Responsive fallback converts rows back into compact cards on small screens.

## Regression coverage
- History count, Pending count and filtered result count are verified.
- Saved history renders one application table row.
- Each row exposes the six expected management cells.
- Smoke gates require workspace counters, table header, row renderer and responsive styles.

## Version
- App: 4.3.0
- Service worker cache: pricereport-shell-v31-history-app
