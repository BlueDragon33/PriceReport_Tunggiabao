# Responsive Architecture — PriceReport_Tunggiabao

**Status:** Active  
**Authority:** UI/UX Constitution 1.0  
**Scope:** Application UI only; never Report/Print layout.

## Capability model

PriceReport responsive behavior is driven primarily by `data-device-class` and device capability. Width media queries refine capability; they do not replace it.

### Phone
Primary class: `data-device-class="phone"`.
- Boundary: `max-width:599px`.
- Validate 390×844 and 360×800.
- Single-column/task-focused UI.
- Complex editing uses full-screen workspace.
- Active mobile-workspace inputs remain at least 16px.
- No horizontal body overflow.
- Closed overlays must not intercept pointer input.

### Compact phone
Exception: `max-width:370px`, narrowly limited to topbar compression when 390px composition no longer fits 360px-class widths.
It is not a new device class and must not become a general styling breakpoint.

### Tablet
Primary class: `data-device-class="tablet"`; tablet baseline may start at `min-width:600px`.

#### Tablet portrait / compact landscape
Portrait, or landscape below 1024px, is editing-first. A4 may be hidden rather than squeezed.

#### Tablet landscape split view
`min-width:1024px` landscape may use editor + live A4 only while preview remains readable.
Validate 1024×768 and 1112×834.

### Desktop
Default non-touch shell. Validate 1280×800, 1366×768 and 1664×912.

### Wide desktop
Capacity state only, not a separate design system.

## Allowed responsive media-query families

Unless this architecture/Constitution is intentionally updated:
- `@media screen`
- `@media screen and (min-width:600px)`
- `@media screen and (max-width:599px)`
- `@media screen and (orientation:portrait), screen and (max-width:1023px) and (orientation:landscape)`
- `@media screen and (min-width:1024px) and (orientation:landscape)`
- `@media screen and (max-width:370px)`

A new numeric breakpoint requires:
1. demonstrated layout/capability need;
2. real-browser viewport evidence;
3. explanation in this document;
4. regression coverage;
5. no equivalent existing capability rule.

## Ownership
- `responsive-v69.css`: structural touch baseline during migration.
- `responsive-v610.css`: later readability/capability refinements and current cleanup layer.
- U4 goal: reduce duplicate ownership until safe consolidation.
- The later layer must not repeat identical selector/property/value ownership from the earlier layer.

## Prohibited responsive patterns
- arbitrary breakpoint for one screenshot;
- desktop squeezed into phone;
- sub-10px responsive text;
- active mobile-workspace inputs below 16px;
- closed overlays intercepting pointer events;
- horizontal body overflow;
- one new responsive file per version;
- Report/A4 dimensions controlled by viewport rules.

## Migration rule
Audit → prove ownership → remove duplicate/obsolete declaration → run required viewports → merge only when browser regression passes.
