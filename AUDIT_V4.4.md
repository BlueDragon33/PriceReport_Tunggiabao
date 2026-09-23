# AUDIT V4.4 — Master data workspace

## Problem
Customer and product reusable data still used generic stacked cards while Dashboard and Quotation Management had already moved to application-style workspaces. This made larger customer/product collections slower to scan.

## V4.4 changes
- Add a dedicated master-data workspace header with total Customer and Product counts.
- Customer management table:
  - Customer
  - Company
  - Contact
  - Address
  - Actions
- Product management table:
  - Product
  - Group
  - Pack / Unit
  - Price
  - Note
  - Actions
- Add filtered result counts for both datasets.
- Expand search fields to cover address/contact and currency where relevant.
- Preserve Use / Add / Delete workflows.
- Delete refreshes Dashboard KPI immediately.
- Responsive table-to-card fallback keeps mobile usable.

## Regression coverage
- Total and filtered counts are verified against normalized malformed local collections.
- Customer and Product table-row rendering is verified.
- Existing malformed-data normalization checks remain active.
- Smoke gates require the V4.4 workspace totals, table headers, row renderers and responsive styles.

## Version
- App: 4.4.0
- Service worker cache: pricereport-shell-v32-master-data
