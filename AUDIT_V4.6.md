# AUDIT V4.6 — Global application search

## Problem
The Dashboard search field suggested that it could find quotations or customers, but its real behavior only forwarded the query into quotation history. Customers stored only in the reusable library and products in the catalog were not actually searchable from the Dashboard.

## V4.6 changes
- Turn Dashboard search into a real cross-application search surface.
- Search across:
  - Quotation history
  - Customer library
  - Product catalog
- Show categorized interactive results directly below the search box.
- Quotation result opens the exact saved quotation.
- Customer result loads that customer into the quotation workflow.
- Product result adds that catalog item into the current quotation.
- Enter activates the first visible result; when no direct result is shown, Enter keeps the previous history-search fallback.
- Escape closes the search result surface.
- Search results close automatically when navigating away from Dashboard.

## Safety
- Results are created with DOM text nodes; no user/library content is injected through HTML.
- Existing quotation/customer/product workflows are reused instead of duplicated.
- Search is local-first and does not send business data to an external service.

## Regression coverage
- Customer stored in the library can be found from Dashboard global search.
- Selecting the result loads the customer and navigates to the customer editor.
- Regression test restores local customer data and editor state afterward.
- Smoke gates require quote/customer/product result types and the global-search result surface.

## Version
- App: 4.6.0
- Service worker cache: pricereport-shell-v34-global-search
