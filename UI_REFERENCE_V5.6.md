# V5.6 Reference UI/UX Source of Truth

Date: 2026-09-24

This document converts the previously approved reference-image direction into implementation constraints. It is the visual source of truth for the V5.6 refactor. No new mock image is required.

## 1. Desktop geometry

For the quotation Studio on desktop:

- Navigation: 118px.
- Editor: 350px.
- Template / Design: 315px.
- Preview: all remaining width, with A4 centered in a calm preview canvas.
- The preview may grow; Editor and Design must not be squeezed below their intended working widths at ordinary desktop breakpoints.
- App workspaces (Dashboard, History, Data, Export, Settings, System) use the same 118px navigation language rather than switching to a visually unrelated wide sidebar.

## 2. Typography baseline

The current micro-type is rejected. The target is the comfortable readability of a modern chat/productivity application.

- Application base text: 15px minimum desktop baseline.
- Navigation labels: 12–13px.
- Standard buttons: 13–14px.
- Form labels: 12–13px.
- Form controls: 14px.
- Card / panel headings: 14–16px.
- Workspace headings: 28–30px.
- Workspace descriptions: 13–14px.
- Tiny metadata is exceptional only; normal operational text must not be rendered at 8–10px.
- Line-height must remain comfortable and text must not be compressed merely to fit an old layout.

The A4 document keeps its own report typography system. This UI spec does not enlarge table text through the application chrome.

## 3. Color system

Application chrome:

- Sidebar: dark navy, visually stable and separate from content.
- Main workspace: light neutral canvas.
- Surfaces / cards: white.
- Primary action: clean blue.
- Secondary accent: restrained cyan/teal.
- Success / warning / danger are semantic only.
- Borders: subtle cool gray.
- No large muddy gray blocks that resemble disabled controls.
- No excessive or decorative gradients. CSS tonal backgrounds may be used only as subtle atmosphere.

A4:

- A4 remains a bright document surface.
- Preview canvas must visually separate the document from application chrome.
- Template accents may change, but the document must remain professional and readable.

## 4. Sidebar

- One consistent sidebar language across Studio and management workspaces.
- Large hit areas, clear icon + label hierarchy.
- Active state is obvious without glowing or noisy effects.
- Labels may wrap naturally to two lines, but must remain readable.
- Avoid section labels or brand copy that consume precious width in the 118px rail.

## 5. Editor

- Forms use real working-space density, not miniature controls.
- Inputs/selects are approximately 40–42px high.
- Cards use 10–12px corner radius, subtle border, light shadow.
- Related controls are grouped; unrelated blocks have visible vertical separation.
- Workflow controls, status badges and guidance must remain readable at a glance.

## 6. Template / Design panel

- Two-column template grid.
- Template cards must be large enough to inspect.
- Selected template gets a simple blue outline/check treatment.
- Design controls use the same form typography as the Editor.
- Avoid strip-like dense cards and micro labels.

## 7. Preview

- Preview canvas uses a soft cool neutral background.
- Toolbar is compact but uses normal readable button text.
- A4 is centered, visually elevated with a restrained shadow.
- Preview remains the largest flexible area on desktop.

## 8. Management workspaces

Dashboard, History, Data Management, Publishing/Data Center, Settings and System share:

- 118px sidebar.
- Light workspace canvas.
- 28–30px main heading.
- 13–14px explanatory text.
- 14–16px card headings.
- Operational text around 12–14px.
- Consistent 10–14px gaps and 12px-ish radius.

## 9. Publishing & Data Center

The current state where large cards contain tiny text and muddy gray fills is rejected.

- Status cards: readable label/value/detail hierarchy.
- Export / Import actions: obvious clickable cards, white or subtle tinted surfaces.
- Primary action receives a restrained blue emphasis.
- Export and Import remain two major balanced panels on desktop.
- PC storage and Backup use the same card system.
- Disabled state must look disabled only when it is actually disabled.

## 10. Acceptance gates

The refactor fails if:

- the visible UI still resembles V5.5 at first glance;
- normal operational text remains at 8–10px;
- app workspaces keep the unrelated 224px sidebar;
- Export/Data Center still looks like large gray disabled blocks;
- Studio loses the 118/350/315/flexible-preview structure;
- a functional regression is introduced;
- UI changes are merged only because CI is green without visible design improvement.

Merge and publish only after exact-head CI is green and the visual source-of-truth constraints above are represented in source code.
