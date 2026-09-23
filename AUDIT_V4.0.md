# AUDIT V4.0 — Website application shell

## Goal
Upgrade PriceReport Tùng Gia Bảo from a report-editor-first page into a real website-application while preserving the existing quotation engine, A4 designer, import/export, device control and local-first data model.

## Application architecture
- Dashboard / management workspace uses the full content width.
- Quotation history and master data also use full-width application mode.
- Quotation creation, customer/product editing, design and export remain in the existing quotation studio.
- Report view remains a dedicated full-screen A4 reader.
- Navigation is responsive: expanded application sidebar on desktop, compact horizontal navigation on tablet/phone.

## Dashboard
- Live totals from local history, customer library and product catalog.
- Current-month quotation activity.
- Recent quotations and lifecycle statuses.
- Quick access to create quotation, master data, report view and export/backup.
- Runtime/device management status.
- Search transfers the query into quotation history.

## Safety
- No quotation calculation logic was replaced.
- No production Device Gate rollout flags were changed.
- Existing management contract remains fail-closed.
- V4 adds smoke gates for app workspace, dashboard routing, renderer and responsive CSS.

## Version
- App: 4.0.0
- Service worker source cache: pricereport-shell-v28-app
