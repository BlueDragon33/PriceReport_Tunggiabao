# AUDIT V4.9 — Application settings workspace

## Goal
Complete the website-application architecture with a dedicated Settings workspace for preferences that affect daily use, without mixing those preferences into quotation/business data.

## Settings added
- Default startup page:
  - Dashboard
  - Quotation Management
  - Quotation Studio
- Show/hide the large Dashboard hero.
- Compact management-table density.
- Enable/disable automatic extra save to an authorized PC folder.
- Quick links to Device & System and Publishing & Data.
- UI-only reset that preserves quotations, history, customer library and product catalog.

## Runtime behavior
- Preferences are stored inside the existing UI_STATE record, separate from business data.
- Preferences are normalized with safe defaults.
- Startup page is read during app boot.
- Dashboard hero and compact management classes are applied immediately.
- PC autosave is only attempted when the preference is enabled.
- Settings/System remain inside the mobile More sheet to preserve the five-primary-action mobile navigation.

## Data safety
- Settings reset drops UI/card/panel state only.
- No quotation/history/customer/product storage keys are removed by Settings reset.
- Device Gate and Application Management boundaries remain unchanged.
- Default behavior preserves previous app behavior:
  - Dashboard startup
  - Dashboard hero visible
  - Normal management density
  - PC autosave enabled when a PC folder is already authorized

## Regression gates
- Settings preference persistence is tested.
- History storage is verified unchanged while settings mutate.
- UI_STATE is restored after the DOM test.
- Smoke verifies startup-page enforcement and PC-autosave preference enforcement.

## Version
- App: 4.9.0
- Service worker cache: pricereport-shell-v37-settings
