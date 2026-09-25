# V5.8 Studio Pixel-Lock — Implementation Audit

Date: 2026-09-25  
Reference viewport: 1664 × 912  
Scope: Quotation Studio shell/UI; business/report engines preserved.

## 1. Foundation reset

V5.8 is a structural rebuild rather than another override pass.

- The active scope is `reference-ui-v58`.
- Studio-specific presentation lives in `src/studio-v58.css`.
- `src/ui-v5.css` remains the shared application/workspace layer.
- The complete obsolete V5.7 reference override tail was removed.
- Remaining dead pre-V5.8 Studio header/stepper/command chrome was removed from the shared stylesheet.
- Shared form, draft-recovery, validation, import, product and workspace utilities remain in their established owners.
- Report/A4 typography stays in the report layer and is not owned by the new Studio stylesheet.

The cleanup reduced `src/ui-v5.css` from about 192.5 KB to about 134.5 KB, removing roughly 58 KB of inactive/obsolete UI overrides before the V5.8 shell became authoritative.

## 2. Canonical rendered architecture

At the locked 1664 × 912 viewport:

- app rail: 118px;
- content library: 320px;
- center preview: flexible, approximately 842px;
- inspector: 384px;
- Studio topbar: 72px;
- preview toolbar: 52px;
- fitted A4 target width: 706px ± 8px.

Visible order is fixed to:

`rail → Thêm nội dung → A4 preview → Design/Content/Check inspector`

One global topbar spans content + preview + inspector. The old V5.7 stepper and nested commandbar are no longer present in the normal Studio DOM.

## 3. Left content architecture

The left column is now a content library rather than a wizard.

Exact block order:

1. Thông tin chung
2. Khách hàng
3. Sản phẩm / Dịch vụ
4. Thanh toán
5. Điều khoản
6. Chữ ký
7. Văn bản tùy chỉnh

The new UI does not clone form state. `openContentBlock(kind)` routes the user to the existing panes/fields. The same existing `data-bind` controls remain the source of truth.

The content library includes:

- local block search;
- three compact theme previews;
- a local “Gợi ý bố cục” action that delegates to the existing auto-arrange engine;
- a detail mode with Back navigation.

No remote AI behavior is claimed by the layout suggestion.

## 4. Single topbar

The Studio now has one primary topbar with:

- current quote title;
- quote number;
- autosave/history context;
- quote status;
- command search;
- disabled undo/redo placeholders until a safe action history exists;
- Save Draft;
- Preview;
- Export PDF;
- compact overflow/command entry.

`Ctrl/Cmd + K` opens the Studio command search. `Ctrl/Cmd + S` keeps the existing save behavior.

The command search delegates to existing navigation/actions and creates no second command/state engine.

## 5. Preview cleanup

The preview toolbar is compact and document-oriented.

Always-visible controls are limited to:

- A4 label;
- zoom;
- fit;
- wide preview;
- layout tool;
- health/page status;
- overflow.

Lower-frequency actions such as validation, import, customization and print/PDF tooling live in the preview overflow menu.

The fit action calculates a maximum displayed paper width of 706px at the canonical viewport while retaining the existing scale engine.

## 6. Inspector rebuild

The right side keeps three top tabs:

- Thiết kế
- Nội dung
- Kiểm tra

Design section order is locked to:

1. Giao diện tổng thể
2. Màu chủ đạo
3. Font chữ
4. Thiết lập hiển thị
5. Cài đặt nâng cao
6. Brand Kit

Existing state is reused for themes, colors, visibility toggles, VAT, discount, currency, spacing, density, margins, table font size and logo behavior.

The Content tab is navigation only and routes back into the same seven content blocks.

The Check tab reuses `validateQuote()`, document health and guided correction; it does not create a new validation rule set.

## 7. Shared controller cleanup

V5.8 introduces/reuses explicit shared controllers instead of duplicating event logic:

- `applyTheme(themeName)`
- `openContentBlock(kind)`
- `showContentLibraryHome()`
- `openStudioCommandPalette(query)`
- existing `autoArrangePreview()`
- `renderInspectorCheckSummary(result)`

Obsolete V5.7 workflow-step state/controllers were removed after the corresponding visible UI was removed.

## 8. Report and business boundaries

V5.8 does not change:

- quote calculations;
- product model;
- currency behavior;
- history semantics;
- local storage/recovery;
- Excel/CSV/JSON import/export semantics;
- PC storage;
- Device Gate;
- production config;
- A4 report typography ownership.

The report rule remains: outside-table typography is fixed; only the product-table font size is user-adjustable.

## 9. Regression gates

The V5.8 branch runs the existing full suite plus new architecture gates:

- syntax;
- UI contract;
- UI debt;
- business logic;
- importer/exporter;
- PC storage;
- logo processing;
- device profile;
- production config;
- Service Worker;
- targeted V5.4/V5.5 DOM regressions;
- full app DOM suite;
- migration suite;
- smoke;
- production build.

DOM tests were migrated away from the removed six-step Studio chrome and now verify the seven-block content library and the Check inspector.

## 10. Rendered browser pixel-lock gate

V5.8 adds a real Chromium/Playwright gate instead of relying only on CSS-string checks.

At 1664 × 912 it verifies actual rendered bounding boxes for:

- 118px rail;
- 72px topbar;
- 320px content library;
- ~842px center preview;
- 384px inspector;
- 52px preview toolbar;
- fitted A4 width 706px ±8.

It also verifies:

- visible column order;
- exactly one visible Studio topbar;
- no V5.7 stepper/commandbar/global-bar;
- exact seven-block order;
- inspector section order;
- computed navy/background colors;
- command-search behavior;
- no runtime page errors.

This rendered gate is now part of `.github/workflows/ci.yml` and must pass before merge.

## 11. Release alignment

- package: `5.8.0`;
- body scope: `reference-ui-v58`;
- PWA cache: `pricereport-shell-v58-pixel-lock`;
- asset recovery key: `tgb-style-recovery-v4`;
- implementation spec: `UI_REFERENCE_V5.8_PIXEL_LOCK.md`;
- Studio stylesheet: `src/studio-v58.css`.

## 12. Merge rule

Do not merge because the markup “looks plausible”.

The exact PR head must pass:

1. all functional/static/DOM/migration/smoke/build gates;
2. the rendered Chromium pixel-lock gate.

After merge, GitHub Pages must build and deploy the exact merge revision successfully before V5.8 is considered published.
