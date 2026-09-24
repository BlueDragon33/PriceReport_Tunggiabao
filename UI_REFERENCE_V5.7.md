# V5.7 Reference Fidelity UI/UX Source of Truth

Date: 2026-09-24

This specification translates the user-supplied quotation application screenshot into implementation constraints for PriceReport Tùng Gia Bảo. The existing product logic and A4 report engine remain authoritative; the screenshot is used for application-shell hierarchy, spacing, proportions, typography and surface treatment. No new mockup or generated background image is required.

## 1. Desktop Studio composition

The desktop quotation Studio must read from left to right as:

1. Application rail: 118px.
2. Editing / content column: 320px.
3. A4 preview workspace: flexible and visually dominant, with a comfortable minimum working width of 620px.
4. Design inspector: 368px.

The A4 preview belongs in the center of the composition. The Design inspector belongs at the far right. The DOM may remain in its existing order if CSS grid placement preserves this visible order without duplicating engines or business logic.

Wide Preview mode collapses the two tool columns and restores a two-column shell: 118px application rail + flexible preview.

## 2. Application chrome

Studio chrome uses one restrained dark-navy family:

- Main Studio chrome: #0b2442.
- Elevated dark cards / controls: #102f53.
- Deep inputs / select surfaces: #0a213d.
- Preview canvas: #263a54.
- Primary action: the existing clean blue token.
- Text on dark chrome: near-white for headings, cool blue-gray for secondary text.

This is application UI only. It must not recolor the printable A4 document.

Do not create bitmap backgrounds or decorative AI-generated assets. Atmosphere is produced with CSS surfaces, borders and restrained shadows.

## 3. Application rail

- Keep the existing 118px rail.
- The rail represents application-level destinations, not every quotation field.
- Normal desktop Studio destinations should remain concise: Home, quotation entry, quotation management, customer/product data and settings as appropriate.
- Workflow-specific destinations such as Products, Payment, Terms, Design and Export belong in the Editor workflow rather than being duplicated in the rail.
- Target hit area: roughly 60–66px high.
- Icon and label remain vertically grouped and readable.

## 4. Editor / content column

The left editing column is the equivalent of the screenshot's “Thêm nội dung” panel.

- Width: 320px desktop.
- Dark surface, with clear light text.
- Current quotation context stays visible at the top but must not dominate the entire column.
- The existing six-step workflow is rendered as a vertical content-block navigator rather than a compressed horizontal strip.
- Target workflow row: about 52px high, 8px gap, 28px icon/step chip.
- Existing fields, validation, autosave, history state and command actions remain single-source; do not create a second editor engine.
- Form controls target 40–42px height and 13–14px text.
- Cards use approximately 10–12px radius and subtle dark-surface separation.

## 5. Preview workspace

The preview is the visual center and largest flexible region.

- Canvas: blue-gray neutral distinct from both the dark chrome and white A4.
- A4 remains centered, white, elevated with restrained shadow.
- Top preview toolbar uses the same navy family as the editor/inspector.
- Toolbar target height: approximately 64–70px.
- Zoom, validation, import, layout, PDF and print remain existing actions; this redesign must not duplicate or replace their logic.
- PDF remains the strongest toolbar action.
- The report stylesheet remains isolated from application chrome.

## 6. Design inspector

The far-right column is the equivalent of the screenshot's inspector.

- Width: 368px desktop.
- Dark surface matching the Editor.
- Existing Template / Design content remains the source of truth.
- Theme cards stay in a two-column grid.
- Selected theme uses a clear blue outline / active state.
- Labels generally use 12–14px; operational text must not return to 8–10px micro-type.
- Inputs and selects use the same dark control language as the Editor.
- The panel's collapse handle belongs on its inner edge, adjacent to the preview.

A later inspector-tab enhancement may expose Design / Content / Check views, but it must reuse the existing workflow and preflight engines rather than creating duplicate state.

## 7. Typography

Application baseline remains 15px where space allows.

- Rail labels: 12px class.
- Editor / inspector labels: 12.5px class.
- Controls: 14px class.
- Buttons: 12.5–13.5px class.
- Panel headings: 14–18px depending on hierarchy.
- Workspace headings outside Studio: 28–30px.
- Tiny type is reserved for compact metadata/status only.

The A4 document follows the separate report typography contract. Only table font size remains user-adjustable; outside-table report typography stays fixed.

## 8. Management workspaces and other tabs

Dashboard, Quotation Management, Customer/Product Data, Publishing/Data Center, Settings and System keep the V5.6 light-workspace language while inheriting the same hierarchy discipline:

- 118px app rail.
- Clear page heading and description.
- White operational cards on a light neutral canvas.
- 10–14px structural gaps, approximately 12px card radius.
- Readable controls and table rows.
- No large inactive-looking gray panels.
- Reuse the same blue primary-action language.

The goal is one product family, not identical coloring on every screen: Studio is dark because it frames a bright document; data-heavy management screens remain light for scanning.

## 9. Responsive containment

Tablet and phone behavior must continue to use the established device-class system.

- Do not add a parallel responsive engine.
- Do not add media-query layers unless a failing layout cannot be solved inside the current device-class rules.
- On narrower screens, preserving function and readable controls takes priority over desktop four-column fidelity.

## 10. Non-regression boundaries

The redesign must not alter:

- quotation calculations;
- import/export semantics;
- local-first storage and recovery;
- customer/product libraries;
- A4 print/PDF typography ownership;
- Device Gate / Application Management contract;
- validation/preflight logic.

No new `!important` declarations may be introduced in `src/ui-v5.css`. Report/A4 selectors stay out of that stylesheet.

## 11. Acceptance gates

V5.7 is not complete unless all of the following hold:

- desktop Studio visible order is rail → editor → preview → inspector;
- reference geometry is 118 / 320 / flexible preview / 368;
- preview is grid column 3 and inspector is grid column 4 on ordinary desktop;
- Studio chrome is visibly dark navy and preview canvas is visibly separated;
- workflow steps are presented inside the Editor rather than duplicated through the application rail;
- management workspaces remain coherent and readable;
- Wide Preview still expands correctly;
- existing functionality and DOM integration tests remain green;
- static UI debt / scoping / report-isolation guards remain green;
- production build succeeds;
- exact-head CI is green before merge;
- production deployment is verified after merge.

No image generation is part of this release.
