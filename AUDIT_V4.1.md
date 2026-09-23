# AUDIT V4.1 — Application usability

## Problems found after V4.0
1. The mobile application shell exposed too many horizontal navigation items, forcing users to hunt by swiping.
2. Dashboard recent-quotation rows only opened quotation history instead of the selected quotation.

## V4.1 improvements
- Keep the mobile application bar focused on Home, Create quotation, Quotation management, Master data and More.
- Add a compact More action sheet for customer, product, payment, terms, design, report view, export/import and presets.
- Close the mobile tool sheet automatically when navigating or pressing Escape.
- Make every recent quotation row open that exact saved quotation directly in the quotation studio.
- Keep desktop navigation and all existing quotation tools available.

## Regression gates
- Mobile More control exists and exposes secondary actions.
- More sheet open/close accessibility state is tested.
- Direct recent-quotation opening is covered by DOM regression.
- Smoke requires the V4.1 mobile controller, action-sheet styles and direct record load behavior.

## Version
- App: 4.1.0
- Service worker cache: pricereport-shell-v29-app-ux
