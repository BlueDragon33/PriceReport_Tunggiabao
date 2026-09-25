# V5.8 — Studio Pixel-Lock Specification

Status: implementation-ready  
Reference viewport: **1664 × 912 px**  
Reference source: user-supplied quotation editor screenshot dated 2026-09-24/25  
Scope: **Quotation Studio only in Phase 1**. Existing Dashboard / History / Data / Settings workspaces remain untouched until Studio fidelity is accepted.

---

## 0. Why V5.8 exists

V5.7 locked only coarse geometry and color intent. It did **not** lock the screenshot closely enough. A UI could satisfy the V5.7 tests while still looking substantially different because:

- the left panel remained a workflow editor rather than an “Add content” browser;
- two command/toolbar layers existed where the reference has a cleaner hierarchy;
- the right inspector contained roughly equivalent controls but not the same order/density;
- spacing, typography, card sizes and A4 display were expressed as ranges rather than exact targets;
- tests verified CSS tokens and DOM existence, not visible composition.

V5.8 changes the acceptance model. The screenshot is treated as a **technical layout reference**, not as inspiration.

The implementation is allowed to reorganize Studio DOM/CSS significantly, but it must preserve current quotation state, calculations, local storage, import/export, print/PDF, device-gate behavior and report rendering.

---

# 1. Non-negotiable implementation rules

## 1.1 Keep business logic; replace the Studio shell

Preserve these existing engines/functions:

- quotation state and `data-bind`;
- `save()`, autosave and history behavior;
- `openTab(tab)` semantics for existing panes;
- `render()`, `renderPreviewProducts()`, `renderTotals()`;
- `validateQuote()`, `updateDocumentHealth()`, `runPreflight()`;
- import/export actions;
- print/PDF actions using `.print-action`;
- theme state: `state.theme`, `state.accent`, `state.docFont`;
- visibility state: `showLogo`, `showCustomer`, `showTerms`, `showSignature`, `showQuoteMeta`, `showPaymentBlock`, etc.;
- A4 report styles and typography ownership.

Do **not** create a second quotation state object, a second calculator, a second theme store or a second preflight engine.

## 1.2 Remove visible legacy Studio clutter

The following V5.7 elements may remain in source temporarily for compatibility, but must not be visible in the normal V5.8 desktop Studio:

- `.studio-context-row`;
- `.studio-stepper`;
- `.studio-commandbar`;
- `.studio-flow-controls`;
- duplicate save / check / preview actions inside the left panel;
- duplicate Studio status blocks when the same information exists in the global header.

Their logic should be reused through new controls where needed.

## 1.3 One visible hierarchy only

Normal desktop Studio must visually read as:

1. far-left app rail;
2. “Thêm nội dung” panel;
3. central A4 workspace;
4. far-right inspector;
5. one global header spanning columns 2–4.

No second full-width header. No extra floating top-level toolbar except the compact A4 toolbar directly above the page.

## 1.4 No fake features

The reference contains “AI gợi ý bố cục”. Until a real AI layout service exists, this block may appear visually, but its action must be described and implemented as local layout suggestion / auto-arrange using the existing auto-arrange engine. It must not claim a remote AI model was invoked.

---

# 2. Canonical desktop geometry

The canonical comparison viewport is **1664 × 912 px**.

At that viewport, use these exact shell tokens:

```css
--pxl-header-h: 72px;
--pxl-rail-w: 118px;
--pxl-left-w: 320px;
--pxl-right-w: 384px;
--pxl-center-w: 842px; /* 1664 - 118 - 320 - 384 */
--pxl-preview-toolbar-h: 52px;
```

Desktop shell:

```css
grid-template-columns: 118px 320px minmax(0, 1fr) 384px;
grid-template-rows: 72px minmax(0, 1fr);
```

Placement:

- `.nav`: column 1, rows 1 / 3;
- `.studio-topbar`: columns 2 / 5, row 1;
- `.content-library`: column 2, row 2;
- `.preview`: column 3, row 2;
- `.design`: column 4, row 2.

At exactly 1664px viewport width, column 3 resolves to approximately 842px.

## 2.1 Desktop scaling policy

- **>= 1500px:** keep rail 118, left 320, right 384 fixed.
- **1360–1499px:** rail 108, left 300, right 350; center remains flexible.
- **1180–1359px:** rail 96, left 288, right 328.
- **<1180px:** exit pixel-lock desktop mode and use the existing tablet/device-class behavior. Do not squeeze four columns below usable widths.

Do not use percentage widths for the canonical 1664 layout.

---

# 3. Global header — exact target

Replace the visible V5.7 `.studio-global-bar` presentation with a new semantic class `.studio-topbar`. Existing IDs/actions can be reused.

## 3.1 Geometry

At 1664×912:

- top: 0;
- left: 118px;
- right: 0;
- height: 72px;
- horizontal padding: 18px;
- background: `#071d36`;
- bottom border: `1px solid rgba(255,255,255,.08)`;
- box shadow: `0 3px 14px rgba(0,0,0,.14)`.

Use internal 3-zone layout:

```css
grid-template-columns: 360px minmax(300px, 1fr) auto;
gap: 18px;
```

## 3.2 Left header zone

Required visible elements:

- document icon button / square: 38×38;
- quote title: 14px / 18px, 800;
- metadata line: 10.5–11px / 14px;
- metadata must contain quote number and autosave/history state.

Reuse:

- `#studioGlobalTitle`;
- `#studioGlobalQuoteNo`;
- `#studioGlobalHistoryState`.

The metadata line may show:
`Mã báo giá: BG-... · Đã lưu tự động ...`

Do not repeat “Bản nháp / Chưa lưu lịch sử / Đã nạp bản lưu” three times in separate badges.

## 3.3 Middle header zone

Reference contains undo/redo and search.

Implement:

- undo button 38×38;
- redo button 38×38;
- search box: 260–320px wide, 38px high;
- search placeholder: `Tìm kiếm (Ctrl + K)`.

### Search behavior

V5.8 search is a command/navigation search, not data-table search.

Minimum executable scope:

- search content blocks by label;
- search Studio commands: Lưu nháp, Xem trước, Xuất PDF, Kiểm tra;
- search management destinations: Quản lý báo giá, Khách hàng & sản phẩm, Cài đặt;
- selecting a result invokes the existing `openTab(...)` or existing action.

Create one function:

`openStudioCommandPalette(initialQuery = '')`

No remote search is required.

### Undo / redo

If no safe application-state undo stack exists yet:

- do **not** fake undo.
- keep buttons visually disabled with tooltip “Hoàn tác sẽ được bổ sung khi có lịch sử thao tác an toàn”.
- They may be hidden only if the visual comparison proves disabled controls are worse than omission.

## 3.4 Right header zone

Exact order:

1. save draft;
2. preview;
3. export PDF;
4. overflow menu.

Targets:

- normal action height: 40px;
- horizontal padding: 14px;
- border radius: 9px;
- gap: 8px;
- PDF button uses primary blue `#1677ff` / existing primary token;
- other actions use dark outlined surfaces.

Reuse:

- `saveCurrentQuote`;
- `openTab('view')`;
- existing `.print-action`.

No duplicate Save/Preview/PDF in the left editor home.

---

# 4. App rail — far left

The rail remains application navigation, not quotation-step navigation.

## 4.1 Geometry

- width: 118px canonical;
- background: `#08213d`;
- right border: 1px translucent;
- top brand zone: 78px;
- nav item target: 72px high;
- nav vertical gap: 6px;
- horizontal padding: 9px.

## 4.2 Visible Studio rail destinations

In normal Studio desktop, show only:

- Trang chủ;
- Soạn báo giá;
- Quản lý báo giá;
- Khách hàng & sản phẩm;
- Cài đặt.

Optional:
- Thiết bị & hệ thống may remain near bottom if required operationally.

Hide from the app rail in Studio:

- customer;
- products;
- payment;
- terms;
- design;
- view;
- export;
- presets.

Those are quotation workflow tools and belong in left/right panels.

## 4.3 Rail typography

- icon area: 24–26px;
- label: 11.5–12px / 15px;
- active item: blue surface `#126bdf`;
- radius: 10px;
- no section labels visible in canonical Studio.

---

# 5. Left panel — “Thêm nội dung”

This is the most important correction versus V5.7.

Rename visual role from “Editor workflow” to **Content Library / Thêm nội dung**.

Recommended DOM:

```html
<section class="content-library">
  <header class="content-library-head">...</header>
  <div class="content-library-home">...</div>
  <div class="content-library-detail" hidden>...</div>
</section>
```

The existing `.editor .panel-body .pane` content should become the detail surface. Do not duplicate its inputs.

## 5.1 Panel geometry

Canonical:

- width: 320px;
- height: calc(100vh - 72px);
- background: `#0b2748`;
- border-right: `1px solid rgba(255,255,255,.07)`;
- padding: 14px 14px 16px;
- overflow-y: auto;
- scrollbar width visually narrow.

## 5.2 Header

Height: 42px.

Content:

- title: “Thêm nội dung”;
- title font: 16px / 20px, weight 800;
- close/collapse icon: 32×32;
- no quotation status badges in this area.

## 5.3 Search field

- margin-top: 8px;
- width: 100%;
- height: 38px;
- radius: 8px;
- dark input: `#102f53`;
- icon 16px;
- placeholder 12px;
- text 12.5px.

Search only filters the left content block list and templates in V5.8 Phase 1.

## 5.4 “Khối cơ bản” label

- margin-top: 14px;
- margin-bottom: 7px;
- 11px / 14px;
- 750;
- text color `#b6c9df`.

## 5.5 Content block rows

Create exactly these seven visible rows, in this order:

1. Thông tin chung
2. Khách hàng
3. Sản phẩm / Dịch vụ
4. Thanh toán
5. Điều khoản
6. Chữ ký
7. Văn bản tùy chỉnh

Canonical row:

- height: 50px;
- gap between rows: 7px;
- padding: 7px 9px;
- radius: 9px;
- background: `#102f53`;
- border: `1px solid rgba(255,255,255,.075)`;
- icon tile: 32×32, radius 8px;
- title: 12.5px / 16px, weight 700;
- subtitle: 10.5px / 13px;
- drag/overflow glyph area: 18px.

Hover:

- background: `#14385f`;
- border: `#2d649f`.

Active / detail currently open:

- left inset blue indicator 3px or blue border;
- do not fill the entire row electric blue.

## 5.6 Exact action mapping to existing application

Use one controller function:

`openContentBlock(kind)`

Mapping:

| Left block | Existing target | Detail focus |
|---|---|---|
| Thông tin chung | `openTab('general')` | top of `#pane-general` |
| Khách hàng | `openTab('customer')` | `#customerName` |
| Sản phẩm / Dịch vụ | `openTab('products')` | `#productEditor` |
| Thanh toán | `openTab('payment')` | `#discountPct` |
| Điều khoản | `openTab('terms')` | `#termsTitle` |
| Chữ ký | `openTab('terms')` | `#dateLine` or the “Ngày & chữ ký” card |
| Văn bản tùy chỉnh | virtual shortcut view | choices for `#intro`, `#closingText`, `#footerText` |

For “Văn bản tùy chỉnh”, do **not** add new saved state in Phase 1. Present three shortcut buttons that route to the existing fields above.

## 5.7 Detail mode

When a content block is clicked:

- keep the same 320px panel;
- replace the list with the selected existing pane;
- show a compact back row at top:
  - back button 32×32;
  - current block title;
  - optional completion/status dot;
- hide `.studio-stepper`, `.studio-commandbar`, `.studio-context-row`.

The existing form cards may be restyled, but their IDs and `data-bind` attributes must not change unless tests are updated in the same commit.

Detail controls:

- inputs/selects: 40px high;
- textarea min-height: 84px;
- label: 11.5–12px;
- control text: 13px;
- card radius: 10px;
- card internal padding: 12px;
- card gap: 10px.

## 5.8 Template thumbnails inside left panel

Below content blocks:

Header row:
- “Mẫu thiết kế”
- right action: “Xem tất cả”

Grid:

- 3 columns;
- column gap: 8px;
- row gap: 8px;
- thumbnail width resolves to about 86px at 320px panel;
- visual card height: 96px;
- image/miniature ratio close to A4;
- radius: 7px;
- active thumbnail blue border 2px.

Do not maintain separate theme mutation logic.

Extract current template mutation code into:

`applyTheme(themeName)`

Both right inspector templates and left miniature templates call that function.

## 5.9 Layout suggestion card

Bottom card:

- min-height: 72px;
- margin-top: 14px;
- radius: 10px;
- background: `linear-gradient(...)` or solid dark-blue; no generated image;
- title: “Gợi ý bố cục”;
- subtitle: “Tối ưu bố cục báo giá hiện tại”;
- one round/arrow action.

Action delegates to the existing local auto-arrange behavior used by `#autoArrangeLayoutToolbar`.

---

# 6. Central preview workspace

## 6.1 Workspace surface

Canonical column width: ~842px at 1664 viewport.

- background: `#263a54`;
- overflow: auto;
- position: relative;
- no decorative gradients behind the A4;
- top toolbar occupies 52px;
- paper area begins immediately below toolbar.

## 6.2 Preview toolbar

Reference is compact. V5.7 toolbar currently exposes too many text buttons at once.

Canonical visible toolbar:

Left group:
- page-size selector label: “A4 (210 × 297 mm)”;
- zoom out;
- zoom value;
- zoom in;
- separator;
- hand/pan tool;
- optional compact layout tool icons.

Right/overflow:
- validation;
- import;
- arrange;
- customize;
- print;
- other low-frequency commands.

Rules:

- toolbar height: 52px;
- horizontal padding: 14px;
- icon button: 34×34;
- zoom value width: 58px;
- gaps: 6px;
- surface: `#213650` or slightly lighter than header;
- no duplicate “Xem trước” button because the user is already in preview Studio.

Low-frequency commands should move into `#toolbarMenu` rather than expand the toolbar horizontally.

## 6.3 A4 display

The report page itself remains the existing `#paper`.

At canonical viewport:

- target visible paper width: **706px ± 8px**;
- A4 ratio must remain 210/297;
- top gap from preview toolbar to paper: 0–4px;
- horizontal centering exact;
- shadow:
  `0 12px 32px rgba(0,0,0,.20)`;
- no extra card/border wrapper around the paper.

At target width 706px, full A4 height is approximately 998px. Vertical scrolling is expected at 912px viewport height.

### Zoom strategy

The default Studio zoom should be derived from available center width:

`targetPaperWidth = min(706, centerWidth - 70)`

Use existing zoom engine. Do not directly distort paper width/height independently.

The displayed zoom label must reflect actual scale.

## 6.4 Report isolation

Do not modify report typography solely to make the app screenshot match.

Keep current report rule:

- text outside product table fixed;
- only `tableFontSize` user-adjustable.

V5.8 app styles must not target:

- `.paper` typography selectors;
- report sections;
- print rules.

---

# 7. Right inspector — exact structure

Canonical width: **384px**.

Background: `#0b2748`.

## 7.1 Top inspector tabs

Height: 52px total.

- padding: 7px 12px;
- 3 equal tabs:
  - Thiết kế
  - Nội dung
  - Kiểm tra
- active tab uses primary blue;
- inactive tab transparent;
- tab height: 38px;
- font: 12px / 16px, 750.

## 7.2 Design tab order

The Design tab must contain these sections in this exact order:

### A. Giao diện tổng thể

Height target: 80–92px.

- section title row;
- current template card;
- small “Đổi mẫu” action.

Current theme label derives from `state.theme`.

### B. Màu chủ đạo

- title / label: 11.5px;
- swatch row;
- swatches: 32×32;
- gap: 8px;
- selected swatch ring: 2px blue/white;
- include current color hex input/value at right if space permits.

Reuse `state.accent`.

### C. Font chữ

- select height: 40px;
- width: 100%;
- bind directly to `docFont`;
- values remain current supported fonts unless font-loading architecture is expanded separately.

### D. Thiết lập hiển thị

Render as toggle rows, each 38–40px high.

Required rows and existing state mapping:

- Hiển thị logo công ty → `showLogo`
- Hiển thị thông tin liên hệ → `showWebEmail` (word label carefully; this controls web/email visibility)
- Hiển thị mã báo giá / ngày / hiệu lực → `showQuoteMeta`
- Hiển thị thông tin khách hàng → `showCustomer`
- Hiển thị điều khoản → `showTerms`
- Hiển thị chữ ký → `showSignature`
- Hiển thị thông tin thanh toán → `showPaymentBlock`
- Hiển thị slogan → `showSlogan`

Do not invent `showWatermark` unless watermark functionality is actually implemented.

Toggle dimensions:

- track: 34×18;
- thumb: 14px;
- row label: 11.5–12px.

### E. Cài đặt nâng cao

Accordion collapsed by default.

When expanded, map existing controls:

- VAT → `vatPct`
- Giảm giá → `discountPct`
- Tiền tệ → `currency`
- Khoảng cách nội dung → `previewSpacing`
- Mật độ bảng → `previewTableDensity`
- Lề ngang → `marginX`
- Lề trên → `marginTop`
- Lề dưới → `marginBottom`
- Cỡ chữ trong bảng → `tableFontSize`

Do not expose `docFontSize` as a general report font control.

### F. Brand Kit

Phase 1: compact visual summary only.

Show:
- current logo miniature;
- 3–4 current/available brand colors;
- current font.

Actions route to existing logo / color / font controls. No new brand-kit persistence schema is required for Phase 1.

## 7.3 Content tab

The right Content tab is navigation/status only; it must not duplicate form inputs.

Show seven rows matching the left content blocks.

Clicking a row calls `openContentBlock(kind)`.

This preserves the screenshot’s “Nội dung” tab while avoiding duplicate `data-bind` controls.

## 7.4 Check tab

Reuse:

- `validateQuote()`;
- `updateDocumentHealth()`;
- `#inspectorHealthStatus`;
- `#inspectorRunCheck`.

Display:

- status card;
- number of errors;
- number of warnings;
- first 3 actionable issues;
- button “Chạy kiểm tra”;
- button “Xem A4 toàn màn hình”.

Do not build a second validation rule set.

---

# 8. Color tokens

Use a single V5.8 Studio token block:

```css
body.v5-ui.reference-ui-v58 {
  --studio-bg: #263a54;
  --studio-rail: #08213d;
  --studio-header: #071d36;
  --studio-panel: #0b2748;
  --studio-panel-elevated: #102f53;
  --studio-panel-hover: #14385f;
  --studio-input: #0b213d;
  --studio-border: rgba(255,255,255,.08);
  --studio-border-strong: rgba(255,255,255,.13);
  --studio-text: #f3f7fd;
  --studio-muted: #9fb3cb;
  --studio-subtle: #7690ad;
  --studio-primary: #1677ff;
}
```

Do not scatter new hex values throughout dozens of selectors if a token exists.

---

# 9. Typography lock

Canonical Studio uses one UI font stack:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

If Inter is not bundled, do not introduce an external dependency just for V5.8. Use the stack above and system fallback.

Exact classes:

| Role | Size | Line height | Weight |
|---|---:|---:|---:|
| App title | 14px | 18px | 800 |
| Panel title | 16px | 20px | 800 |
| Section heading | 11px | 14px | 750 |
| Content row title | 12.5px | 16px | 700 |
| Content row subtitle | 10.5px | 13px | 500 |
| Input label | 11.5px | 15px | 650 |
| Input text | 13px | 18px | 500 |
| Normal button | 12px | 16px | 700 |
| Header metadata | 10.5px | 14px | 500 |
| Inspector tab | 12px | 16px | 750 |

No active operational control may use <10px text.

---

# 10. Radius / spacing lock

Use a 4px base spacing grid.

Allowed common gaps:

- 4;
- 8;
- 12;
- 16;
- 20;
- 24.

Avoid arbitrary 5/7/9/13px except where this spec explicitly sets a visual target.

Radius:

- input/button: 8px;
- content row: 9px;
- card: 10px;
- larger modal: 12px;
- brand/logo square: 11–12px.

Shadows:

- dark panels: almost none;
- A4: strongest shadow;
- selected/primary controls: subtle blue glow only;
- do not apply large white-card shadows inside dark side panels.

---

# 11. DOM refactor plan

V5.8 should be implemented in a new branch:

`feature/v5-8-studio-pixel-lock`

## Pass A — structural cleanup

1. Activate body scope `reference-ui-v58`.
2. Introduce `.studio-topbar`.
3. Introduce `.content-library`, `.content-library-home`, `.content-library-detail`.
4. Keep existing panes; mount/display them inside detail mode.
5. Hide/remove visual V5.7 stepper/commandbar clutter.
6. Set canonical grid geometry.
7. Leave right inspector behavior intact initially.

Gate: layout order and dimensions only.

## Pass B — left content browser

1. Add search.
2. Add seven content block rows.
3. Add `openContentBlock(kind)`.
4. Add detail back navigation.
5. Add template miniatures using shared `applyTheme(theme)`.
6. Add local layout suggestion card.

Gate: every row routes to existing functionality; no duplicated state.

## Pass C — topbar + preview toolbar

1. Rebuild topbar to reference hierarchy.
2. Add command search.
3. Move low-frequency preview actions into overflow.
4. Set A4 target width behavior.
5. Verify page scroll/zoom.

Gate: no duplicate Save/Preview/PDF controls; A4 centered.

## Pass D — right inspector

1. Reorder Design content exactly as Section 7.
2. Bind toggles directly to current state.
3. Add Advanced accordion.
4. Make Content tab use navigation only.
5. Improve Check tab from existing preflight data.

Gate: no duplicate inputs/state.

## Pass E — cleanup legacy CSS

1. Create a dedicated V5.8 Studio block or `src/studio-v58.css`.
2. Remove V5.7-only overrides that no longer participate in layout.
3. Keep management workspace CSS separate.
4. No `!important`.
5. No report selectors.

Gate: computed Studio styles must have one clear owner.

---

# 12. Recommended file ownership

Preferred minimal-risk structure:

- `index.html`: Studio structural DOM only.
- `src/main.js`: routing/controller functions only.
- `src/ui-v5.css`: management workspaces and shared app primitives.
- **new** `src/studio-v58.css`: V5.8 Studio shell and reference-specific styling.
- `src/styles.css`: report/A4 and existing legacy report ownership only.

Load order:

1. report/shared base;
2. `ui-v5.css`;
3. `studio-v58.css`.

Do not append another 1000-line V5.8 override block to the end of `ui-v5.css`.

---

# 13. Required controller refactors

Implement these shared functions before wiring duplicate-looking UI controls:

## 13.1 `applyTheme(themeName)`

Move current logic from `$$('.tpl').forEach(... click ...)` into one function.

Responsibilities:

- validate theme;
- update `state.theme`;
- update theme accent/font/profile;
- preserve logo backdrop rules;
- `save()`;
- `syncInputs()`;
- `render()`.

All template cards call this function.

## 13.2 `openContentBlock(kind)`

Responsibilities:

- set left panel to detail mode;
- map kind to existing tab;
- call `openTab`;
- focus/scroll target;
- update active content row;
- keep inspector Content tab synchronized if open.

## 13.3 `showContentLibraryHome()`

Responsibilities:

- return left panel from detail to library home;
- not mutate quotation state.

## 13.4 `runLayoutSuggestion()`

Responsibilities:

- delegate to existing auto-arrange function/action;
- show toast describing local layout optimization;
- no AI claim unless backed by actual AI service.

## 13.5 `openStudioCommandPalette(query)`

Responsibilities:

- search known commands;
- keyboard `Ctrl/Cmd + K`;
- execute existing handlers only.

---

# 14. Existing ID preservation list

Unless a specific refactor requires otherwise, preserve these IDs to minimize regression risk:

- `paper`;
- `zoomOut`, `zoomIn`, `zoomText`, `actual`;
- `wideView`;
- `preflightCheck`;
- `openSmartImport`;
- `layoutEditToggle`;
- `autoArrangeLayoutToolbar`;
- `customizePreview`;
- `toolbarMenu`;
- `designPanel`;
- `inspectorHealthStatus`;
- `inspectorRunCheck`;
- `inspectorPreviewQuote`;
- all existing `data-bind` input IDs;
- `productEditor`;
- `quoteNo`;
- `quoteDate`;
- `customerName`;
- `termsTitle`;
- `dateLine`;
- `intro`;
- `closingText`;
- `footerText`.

Changing these IDs creates unnecessary regression surface.

---

# 15. Visual acceptance test — mandatory

CI PASS alone is no longer sufficient.

## 15.1 Reference screenshot test viewport

Automated or manual comparison must use:

- viewport: 1664×912;
- device pixel ratio: 1 where controllable;
- browser zoom: 100%;
- no DevTools docked;
- Studio open on the standard quotation screen;
- left content library home visible;
- right inspector Design tab visible;
- preview at fitted canonical scale.

## 15.2 Geometry tolerances

Compared with target:

- rail width: ±2px;
- left panel width: ±3px;
- right inspector width: ±3px;
- header height: ±2px;
- preview toolbar height: ±2px;
- A4 visible width: ±8px;
- major panel boundary X coordinates: ±5px.

## 15.3 Content/order tolerances

Zero tolerance for order:

- seven left blocks must appear in exact order;
- right Design sections exact order;
- topbar actions exact order;
- inspector tab order exact.

## 15.4 Visual regression mechanism

Preferred: add Playwright only if acceptable to dependency policy.

If Playwright is added:

- create `tests/visual/studio-v58.spec.js`;
- screenshot `studio-v58-reference.png`;
- use a masking rule only for dynamic timestamps/avatars;
- fail when diff exceeds an agreed threshold.

If adding Playwright is too heavy, Phase 1 may use a deterministic screenshot job through the existing browser-capable test setup, but a real pixel screenshot check must be added before calling V5.8 complete.

Static CSS-string tests are not a substitute.

---

# 16. Functional acceptance gates

All must pass before merge:

1. quotation state persists after reload;
2. save to history works;
3. customer autocomplete still works;
4. product entry and Excel paste/import work;
5. VAT/discount/currency totals remain correct;
6. terms/signature edit and visibility work;
7. theme switching works from left miniatures and right inspector;
8. logo controls work;
9. print/PDF preflight works;
10. JSON/Excel/CSV export remains unchanged;
11. local PC storage tests remain green;
12. Device Gate / production config remains green;
13. Service Worker tests remain green;
14. full DOM regression remains green;
15. migration tests remain green;
16. smoke tests remain green;
17. production build succeeds;
18. visual screenshot gate passes.

---

# 17. Explicit “do not do” list

Do not:

- add another full-width Studio command bar;
- show the V5.7 six-step stepper on the normal library-home screen;
- expose every existing action simultaneously in the preview toolbar;
- create a second copy of customer/product/payment inputs in the inspector;
- add a generic global font-size control;
- change fixed report typography outside the product table;
- create AI-generated backgrounds;
- use large gradients to hide spacing/layout mismatches;
- add `!important`;
- merge just because CI is green;
- publish until screenshot fidelity is reviewed.

---

# 18. Definition of Done

V5.8 is done only when all statements below are true:

- At 1664×912, the first glance clearly resembles the supplied screenshot.
- The left side reads as **application rail + “Thêm nội dung” browser**, not a wizard.
- The center is visually dominated by a correctly scaled white A4 page.
- The right side reads as a compact **Design / Content / Check** inspector.
- There is one clear global header and one compact preview toolbar.
- No duplicate Studio command hierarchy is visible.
- Existing quotation logic is unchanged or explicitly regression-tested.
- Studio CSS has one clean V5.8 owner rather than another override pile.
- Automated functional tests pass.
- Screenshot/visual comparison passes.
- Only then: PR ready → merge → GitHub Pages build → production smoke/read-back.

---

# 19. Implementation checklist by commit

Recommended commit sequence:

1. `docs(ui): add V5.8 pixel-lock implementation spec`
2. `refactor(studio): create clean V5.8 shell and stylesheet`
3. `feat(studio): add content library home and block routing`
4. `refactor(studio): extract shared theme application controller`
5. `refactor(studio): rebuild reference topbar`
6. `refactor(studio): compact preview toolbar and fit A4 geometry`
7. `refactor(studio): rebuild Design inspector sections`
8. `feat(studio): wire Content and Check inspector views`
9. `refactor(studio): remove V5.7 visible workflow clutter`
10. `test(studio): add V5.8 geometry and integration guards`
11. `test(visual): add canonical 1664x912 Studio screenshot gate`
12. `chore(release): bump to 5.8.0`
13. fix any failing gate without changing the reference contract
14. merge only after exact-head green + visual acceptance

---

# 20. Final implementation principle

When an existing component conflicts with the screenshot, prefer this order:

1. preserve its logic;
2. move/reuse its DOM if practical;
3. replace its presentation;
4. extract shared controller code;
5. remove obsolete visible shell;
6. never duplicate state merely to imitate the screenshot.

The target is not a static mockup. It is a working quotation application whose **interaction model remains real while its Studio shell is locked closely to the supplied reference**.
