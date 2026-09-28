# UI/UX Constitution — PriceReport_Tunggiabao

**Document:** UI/UX Constitution  
**Status:** Active  
**Version:** 1.0  
**Owner:** PriceReport_Tunggiabao  
**Applies to:** Entire application  
**Authority:** Permanent Product Design Governance

> This document is the Design Source of Truth for PriceReport_Tunggiabao. It is not a temporary prompt, roadmap, mockup, or version note.

## 1. Product North Star

PriceReport must feel like a professional, modern, trustworthy quotation-management application that ordinary users can use without training.

The UI must make a complex quotation workflow feel simple. A new UI is better than an old UI only when the user experience is better, not merely different.

**Protected product feel:** Professional, Focused, Trustworthy, Fast, Predictable, Calm, Modern, Clear.

**Do not make the product feel:** Flashy, Toy-like, Cyberpunk, Experimental, Chaotic, Over-designed, Technical, or like a generic dashboard template.

## 2. Decision Priority

When design goals conflict, use this order:

1. Data Safety
2. Business Correctness
3. Accessibility
4. Usability
5. Information Hierarchy
6. Consistency
7. Performance
8. Visual Polish
9. Decorative Effects

Decorative motion, cards, effects, or density must be removed when they hurt clarity, speed, mobile usability, or task completion.

## 3. Core UX Laws

### REQUIRED — Clarity before density
Do not display everything merely because it exists. The user should understand the screen before being exposed to advanced capability.

### REQUIRED — Progressive disclosure
Default to simple. Reveal advanced controls only when they are needed.

### RECOMMENDED — One primary action
Each screen or workspace should have one dominant action. Avoid competing primary buttons.

### REQUIRED — Recognition over memory
Do not require users to remember tab locations, codes, hidden workflow rules, or technical terminology.

### REQUIRED — Safe by default
Normal work must be fast. Destructive work must be difficult to trigger accidentally and must provide recovery where feasible.

### REQUIRED — Visible system state
Show real state: Saving, Saved, Unsaved changes, Importing, Error, Offline, Standalone, Managed. Never fake a state.

### REQUIRED — Local-first confidence
Core quotation work must remain trustworthy when Internet connectivity is unavailable after assets are available offline.

## 4. Official Design Language

**Modern Professional Business Application**

Blend:
- Professional Admin Application
- Document Editing Workspace
- Modern Data-entry Application

Do not use as the primary visual language:
- neon / cyberpunk / glow;
- strong decorative gradients;
- saturated color everywhere;
- heavy shadows;
- decorative animation;
- excessive glassmorphism;
- card-inside-card patterns;
- border-heavy surfaces.

Prefer typography, spacing, alignment, hierarchy, readability, interaction, and consistency.

## 5. Semantic Design Tokens

UI modules must reuse semantic tokens instead of choosing independent visual values.

Canonical token families:

```css
--surface-app
--surface-panel
--surface-raised
--surface-muted

--text-primary
--text-secondary
--text-muted
--text-inverse

--border-default
--border-strong

--accent-primary
--accent-primary-hover
--accent-primary-soft

--state-success
--state-warning
--state-danger
--state-info
```

Rules:
- Success means success only.
- Warning means attention required.
- Danger means error or destructive action.
- Accent communicates hierarchy and action.
- Do not hard-code repeated colors when a semantic token already exists.

## 6. Typography Constitution

Maintain a coherent scale:
- Display
- H1
- H2
- H3
- Body
- Body Small
- Label
- Caption
- Button
- Data / Numeric

REQUIRED:
- Do not shrink readable content to 8–9px to fit a layout.
- Mobile form input text must avoid iOS auto-zoom behavior.
- Numeric values must be easy to scan.
- Heading scale must express hierarchy, not spectacle.
- Font size must never be used to hide a layout problem.

## 7. Spacing, Radius, and Elevation

Use a consistent spacing family: 4, 8, 12, 16, 20, 24, 32, 40, 48.

Distinguish:
- internal component spacing;
- component-to-component spacing;
- section spacing;
- functional-region spacing.

Radius levels: small, medium, large, pill. Do not make everything a pill.

Use shadow only for meaningful elevation: modal, dropdown, popover, floating controls, A4 paper. Do not shadow every card.

## 8. Application Shell

All product areas share one application shell and one design language:

```
APP
├── Navigation
├── Topbar
├── Main Workspace
└── Overlay Layer
```

REQUIRED:
- Dashboard, Studio, Management, tablet, and mobile must not become separate visual products.
- The shell may adapt responsively but must retain shared hierarchy and component language.

## 9. Navigation Governance

Navigation must match user mental models.

Preferred hierarchy:

**TỔNG QUAN**
- Trang chủ

**CÔNG VIỆC**
- Soạn báo giá
- Quản lý báo giá

**DỮ LIỆU**
- Khách hàng
- Sản phẩm

**THIẾT KẾ & XUẤT BẢN**
- Mẫu
- Xuất bản & dữ liệu

**HỆ THỐNG**
- Cài đặt
- Thiết bị & hệ thống

Before adding a navigation item, determine whether it is truly a destination or merely an action, modal, or child workflow.

## 10. Topbar

Topbar may contain:
- current context;
- critical status;
- primary actions;
- overflow actions.

Do not turn the topbar into a horizontal dumping ground for 8–10 peer actions.

## 11. Dashboard

Dashboard exists to help users work, not to display components.

Priority:
1. Primary Action
2. Quick Actions
3. Recent Quotations
4. Useful Business Context
5. System State

Primary CTA: **Tạo báo giá mới**.

Recent quotations should expose useful fields such as quote number, customer, date, total, status, edit, and quick export.

Do not add metrics or charts unless they help a real decision.

## 12. Quotation Studio

The Studio North Star is a **document-centered workspace**.

- A4 Preview is central.
- Editing controls support the document.
- Panels must not consume the entire viewport.
- Desktop may use Content Navigator + Preview + Inspector.
- Three columns are not absolute; adapt when viewport capacity is insufficient.

## 13. Content Navigator

Avoid one giant form for the entire quotation.

Canonical blocks:
- Thông tin chung
- Khách hàng
- Sản phẩm
- Thanh toán
- Điều khoản
- Chữ ký
- Nội dung bổ sung

Each block should communicate state: Hoàn tất, Đang chỉnh, or Cần bổ sung.

## 14. Data-entry Workspace

REQUIRED:
- Complex forms must not be squeezed into 280–320px sidebars.
- Large tasks should use a large modal, drawer, dedicated workspace, or full-screen mobile workspace.
- Desktop workspaces may reasonably use 1040–1480px depending on task.
- The goal is fast, spacious, scannable entry.

## 15. Modal and Overlay Contract

Use a modal only for a task with a clear start/end and a need for focus or contextual separation.

Canonical modal structure:
- Header
- Context
- Content
- Footer actions

Do not use tiny modals for large forms. Do not introduce parallel modal styles.

## 16. Product Workspace

Product entry is a critical workflow. Optimize for:
- fast data entry;
- keyboard use;
- paste;
- Excel;
- catalog reuse;
- search;
- duplicate detection;
- quick fill;
- validation;
- review.

Desktop may use spreadsheet-like layout. Tablet gets a large task workspace. Phone uses full-screen card editing. Never squeeze a nine-column desktop table into a ~390px viewport.

## 17. Customer UX

Inside a quotation:
**Search Customer → Select → Auto Fill**

The reusable Customer Library remains a data source; users should not have to leave the quotation flow just to pick a customer.

## 18. Form Contract

Every form needs:
- visible label;
- clear input;
- help text when needed;
- field-adjacent validation;
- logical grouping.

Do not use placeholder as the sole label. Avoid excessive inputs per row. Red is reserved for real errors/destructive meaning.

## 19. Button System

Supported primary families:
- Primary
- Secondary
- Ghost
- Danger
- Icon

Do not create uncontrolled button variants. A given action should keep consistent hierarchy across modules. Danger must never visually masquerade as Primary.

## 20. Icons

Icons must carry meaning. Avoid random Unicode symbols when a formal icon system is available.

Icon-only controls need accessible names and, where useful, tooltip/title. Do not force users to guess.

## 21. Table

Use table for data that benefits from column comparison.

Rules:
- clear header;
- numeric alignment;
- clear selected state;
- subtle row hover;
- restrained row actions;
- responsive fallback.

On mobile, convert to cards or another layout when a table becomes unusable.

## 22. Card

A card groups one concept. Card-inside-card-inside-card is prohibited. If everything is a card, hierarchy is lost.

## 23. Status Semantics

Canonical semantic statuses:
Neutral, Info, Success, Warning, Danger.

The same state must have the same semantic treatment across the app.

## 24. Toast and Notification

Toast is for short-lived feedback such as:
- Đã lưu.
- Đã nhập 25 dòng.
- Đã xuất dữ liệu.

Important errors must use persistent inline state or an appropriate dialog, not a disappearing toast alone.

## 25. Empty State

Every primary list must communicate an empty state and the next useful action.

Example:
**Chưa có báo giá nào.**  
Tạo báo giá đầu tiên để bắt đầu.  
[Tạo báo giá]

## 26. Error UX

Every error should answer:
1. What happened?
2. Is the user's data safe?
3. What should the user do next?

Prefer user language over raw technical error names.

## 27. Content Design

Microcopy must be short, direct, natural Vietnamese, and non-technical.

Avoid exposing registry, contract, control plane, gateway, schema, or runtime unless the user truly needs those concepts.

Buttons should use clear verbs: Lưu báo giá, Thêm sản phẩm, Xuất PDF, Khôi phục, Áp dụng.

## 28. Responsive Constitution

Responsive is component architecture, not a final patch.

### Desktop
Use horizontal space effectively. Keep workspaces broad enough while avoiding excessively wide readable text.

### Tablet landscape
If capacity allows, editor + preview may coexist. Remove/collapse Inspector when it makes the preview too small.

### Tablet portrait
Prioritize focused tasks. Edit ↔ Preview switching is preferred over forcing all panels side-by-side.

### Mobile
Mobile is not a squeezed desktop.

REQUIRED:
- single-column task flow;
- full-screen workspace where appropriate;
- touch targets about 44px or larger;
- no horizontal body overflow;
- adequately sized inputs;
- sticky action footer when useful.

## 29. Breakpoint Governance

Do not add arbitrary breakpoints.

Use clear capability classes:
- Phone
- Tablet Portrait
- Tablet Landscape
- Desktop
- Wide Desktop

Prefer capability-based adaptation when appropriate.

## 30. Real Viewport Validation

For major UI changes, validate at minimum:

Desktop: 1664×912, 1366×768, 1280×800  
Tablet: 1112×834, 1024×768, 834×1194  
Phone: 390×844, 360×800

Check overflow, clipping, tiny text, button overlap, modal overflow, sticky elements, preview fit, and navigation.

## 31. Accessibility

REQUIRED validation:
- keyboard;
- focus and focus order;
- aria labels;
- dialog focus trap;
- Escape close;
- contrast;
- form labels;
- touch target.

Never remove focus outline without an accessible replacement.

## 32. Keyboard UX

Core data-entry workflows must be keyboard-operable.

- Tab follows a logical sequence.
- Enter must not accidentally submit destructive or unrelated actions.
- Escape closes overlays when safe.
- Ctrl+K is retained only while command search remains useful.

## 33. Motion

Motion is allowed for open, close, transition, and feedback. It must be fast, light, and non-distracting. Decorative long-running animation is prohibited.

## 34. A4 Preview

A4 Preview is a document surface.

- canvas/background differs from paper;
- paper is white, centered, with light elevation;
- application controls live outside the document;
- clicking document blocks may route to the correct editor;
- editing affordances never appear in printed output.

## 35. Application / Report / Print Boundary

REQUIRED architectural boundary:

```
APPLICATION UI
!= REPORT DOCUMENT
!= PRINT LAYER
```

Application styles must not casually style `.paper`. Report themes must not control the application shell. Print logic must remain isolated.

## 36. Print / PDF

Print is a separate subsystem.

Printed output contains the document only. It must exclude Navigation, Topbar, Editor, Inspector, Preview toolbar, Modal, Toast, and canvas background.

A4 is 210×297mm and must not scale based on viewport. Browser print-media regression must remain active.

## 37. Template System

Templates may change visual identity, typography, color, spacing, header/footer, section styling, and table styling.

Templates must never change customer data, product data, payment data, business calculations, or quotation identity.

## 38. Local-first UX

Default product mode: **Standalone + Local-first**.

Core workflow must not feel blocked by a server.

Users must be able to create/edit/save quotations, preview, manage customers/products, backup, and print/PDF offline when assets are available.

## 39. Application Management UX

Application Management is optional.

- Managed Mode appears only when truly enabled.
- Standalone hides unnecessary management complexity.
- Never fake Connected, Approved, Synced, or Ready.
- Manager failure must not disable core quotation work.

## 40. CSS Ownership

Canonical ownership:

- `styles.css` → report document base
- `quotation-themes-*.css` → report themes
- `ui-*.css` → application UI
- `studio-*.css` → quotation Studio
- `content-workspace-*.css` → editing workspaces
- `responsive-*.css` → responsive adaptations
- `print-*.css` → print only

Application selectors must not leak into report CSS. Report CSS must not own App Shell. Print rules must not be scattered through UI files.

## 41. CSS Debt Policy

REQUIRED:
- Do not use `!important` to hide ownership mistakes when cascade ownership can be corrected.
- Do not add viewport-specific CSS debt merely to make one screenshot look right.
- Do not create endless version override layers.
- After a migration is stable, consolidate.
- One component should converge toward one primary implementation.

Existing debt may remain temporarily under an explicit migration plan; new debt must not increase without justification.

## 42. Component Governance

Audit and standardize:
Button, IconButton, Input, Select, Textarea, Search, Checkbox, Radio, Toggle, Chip, Badge, Alert, Toast, Card, Panel, Table, Toolbar, Tabs, Sidebar, Topbar, Dropdown, Popover, Modal, Drawer, EmptyState, Progress, Stepper.

Each component requires:
- Purpose
- Variants
- States
- Responsive behavior
- Accessibility contract

Minimum states: default, hover, focus, disabled; loading for asynchronous actions.

Before creating a new component:
1. inspect existing components;
2. extend a current variant when conceptually correct;
3. create new only when the concept is genuinely different.

## 43. Deprecated UI

When replacing UI:
**Mark deprecated → migrate usages → test → remove legacy.**

Do not hide legacy with `display:none` indefinitely.

## 44. UI Debt Audit

Continuously monitor:
- duplicate selectors;
- dead CSS;
- hidden legacy UI;
- inline styles;
- `!important`;
- duplicate colors;
- duplicate breakpoints;
- unused modal;
- obsolete tab;
- obsolete event handlers.

Debt must not grow without control.

## 45. Prohibited Anti-patterns

REQUIRED — do not introduce:
- giant form pages;
- excessive or nested cards;
- tiny text;
- random gradients;
- uncontrolled shadows;
- inconsistent buttons;
- duplicate navigation;
- technical jargon for ordinary users;
- fake backend status;
- desktop squeezed into phone;
- UI state mixed into business data;
- application selectors in report CSS;
- scattered print rules;
- complex forms in narrow sidebars;
- primary buttons everywhere;
- a new design system per version.

## 46. Screenshot / Reference Image Policy

Screenshots are visual references for proportion, spacing, composition, hierarchy, density, and balance.

Do not blindly copy content, workflow, components, or logic. A screenshot never outranks this Constitution.

## 47. Design Source of Truth

If old screenshots, old prompts, old conversations, old CSS, legacy UI, or old implementation conflict with this Constitution, this Constitution controls design direction.

Exception: an intentional Product Owner request may change long-term policy. In that case, update this Constitution in the same change.

## 48. Change Governance and Versioning

Do not edit the Constitution for every CSS change.

Update it when long-term policy changes:
- design architecture;
- navigation policy;
- component system;
- responsive strategy;
- accessibility requirement;
- major interaction model;
- long-term visual direction.

Major policy changes must bump the Constitution version and update `docs/UI_UX_CHANGELOG.md`.

## 49. Exception Policy

A Constitution rule may be broken only when:
1. UX or technical reason is explicit;
2. reason is documented;
3. test evidence exists;
4. inconsistency is not introduced;
5. debt remains controlled.

“Looks prettier” is not sufficient justification.

## 50. Future Agent Protocol — REQUIRED

**BEFORE MODIFYING UI:**

1. Read `docs/UI_UX_CONSTITUTION.md`.
2. Inspect current component/layout ownership.
3. Identify Constitution rules relevant to the task.
4. Reuse the established design system.
5. Do not create a parallel UI system.
6. Do not reintroduce deprecated patterns.
7. Validate desktop.
8. Validate tablet.
9. Validate mobile.
10. Validate accessibility.
11. Validate report/print isolation when relevant.
12. Run regression tests.
13. Update Constitution only when product design policy itself changed.

After a major UI task, report:
- Constitution rules applied;
- Files changed;
- UI behavior changed;
- Responsive validation;
- Accessibility validation;
- Visual regression;
- Print regression;
- UI debt impact;
- Remaining issues.

## 51. Real User Journey Validation

Major UI changes must test at least:

1. Open app → New Quote → Customer → Product → Payment → Preview → PDF.
2. History → Edit old quote → Save.
3. Import Excel → Review → Fix → Apply.
4. Create/edit quote on tablet.
5. Quick edit on phone.

## 52. Pre-merge Visual Review Questions

Before merge, ask:
- Can a new user understand the screen?
- Is the primary action clear?
- Is there too much information?
- Is any text too small?
- Are actions duplicated?
- Are old/new components mixed?
- Is legacy merely hidden?
- Desktop acceptable?
- Tablet acceptable?
- Mobile acceptable?
- Keyboard usable?
- Accessibility acceptable?
- Any horizontal overflow?
- Report boundary intact?
- Print/PDF intact?
- Did UI debt increase?
- Any fake state?

If any required answer fails, continue fixing.

## 53. UI/UX Compliance Checklist

- [ ] Navigation hierarchy correct
- [ ] Primary action clear
- [ ] No duplicate component system
- [ ] Typography follows scale
- [ ] Spacing follows system
- [ ] No unreadably tiny text
- [ ] No unreasonable nested cards
- [ ] Desktop PASS
- [ ] Tablet PASS
- [ ] Mobile PASS
- [ ] Keyboard PASS
- [ ] Accessibility PASS
- [ ] No horizontal body overflow
- [ ] Modal/workspace width appropriate
- [ ] Application/Report CSS boundary PASS
- [ ] Print/PDF PASS
- [ ] No fake backend status
- [ ] UI debt did not grow unreasonably
- [ ] Legacy UI not reintroduced
- [ ] User workflow is no harder than before

## 54. Compliance Levels

**REQUIRED** — must not be violated unless this Constitution is deliberately updated or an exception is documented under Section 49.

**RECOMMENDED** — should be followed; deviations require a reason.

**OPTIONAL** — permitted pattern, not mandatory.

Examples:
- REQUIRED: Print contains no App UI.
- REQUIRED: No fake backend status.
- REQUIRED: Mobile has no horizontal body overflow.
- RECOMMENDED: One primary CTA per screen.
- OPTIONAL: Tooltips for icons when meaning is not sufficiently obvious.

## 55. Existing UI Migration Policy

Current UI must be classified as PASS, MINOR DEBT, MAJOR DEBT, or LEGACY in `docs/UI_UX_COMPLIANCE_AUDIT.md`.

Migration sequence:
**Audit → Component/Area → Refactor → Test → Visual Validation → Remove Legacy → Next Component**

No big-bang rewrite. The application must remain usable between phases.

## 56. Preserve Working Features

UI work must not break:
- business logic;
- quotation history;
- customers;
- products;
- Excel import/export;
- backup/restore;
- autosave;
- local-first;
- PWA;
- templates;
- A4 preview;
- PDF;
- Standalone architecture;
- Managed Mode boundary.

## 57. Definition of Done for Major UI Work

A major UI task is not DONE until applicable items are satisfied:
- Constitution rules identified and followed;
- relevant journey tests pass;
- desktop/tablet/mobile validated;
- accessibility validated;
- report/print isolation validated when relevant;
- visual/browser regression passes;
- no unreviewed increase in UI debt;
- deprecated UI removed after migration;
- CI passes on exact head;
- Production Release Gate passes before merge/publish.

---

**One product → one design language → one component system → one responsive strategy → one interaction model → one UX philosophy.**
