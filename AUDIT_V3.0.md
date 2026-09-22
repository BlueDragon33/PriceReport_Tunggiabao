# AUDIT V3.0 — Mobile Report View, Excel I/O & Remembered PC Workspace

Date: 2026-09-22  
Branch: `feature/v3.0-mobile-excel-pc`  
PR: #25

## Scope

V3.0 addresses six explicit usability gaps:
1. remove obsolete company fields;
2. make report font-size adjustment actually work;
3. integrate Excel import/export into the Export/Import/Print workflow;
4. provide a dedicated report-view tab for phone/iPad;
5. eliminate surplus/infinite mobile scrolling after the document end;
6. save explicit quote saves to a remembered PC folder when browser permissions allow it.

No storage key, backup schema, currency rule, quotation calculation rule or A4 business invariant is changed.

## 1. Removed fields

Removed from visible editor and preview:
- Chi nhánh Khánh Hòa;
- Chi nhánh Đồng Nai;
- Trại / cơ sở.

Legacy state keys remain tolerated internally for backward compatibility, but they are no longer exposed in the current Tùng Gia Bảo report workflow.

## 2. Font-size fix

Root `.paper` font-size alone was insufficient because template/report components use explicit font sizes with stronger selectors.

V3.0:
- computes a font scale from `docFontSize / 12.2`;
- writes explicit CSS variables for each report typography role;
- applies those variables after all template geometry rules;
- keeps quotation title size independently controlled by the existing title-size setting.

Affected content includes company text, subtitle, metadata, recipient, introduction, section headers, table, summary, words, payment, terms, signatures and footer.

## 3. Export / Import / Print

The navigation entry is now **Xuất / Nhập / In**.

The tab exposes:
- Print / Save PDF;
- Export Excel;
- Import Excel;
- Import handwriting image;
- JSON current quote import/export;
- full WebApp backup/restore.

Excel export uses a canonical row structure intentionally compatible with the current semantic Excel importer.

## 4. Dedicated Report View

New nav tab: **Xem báo cáo**.

Behavior:
- hides editor and design panels;
- keeps only report-oriented toolbar actions;
- fits the physical A4 report to available width;
- provides an explicit Back to edit action;
- refits after resize/content render;
- preserves print/PDF behavior.

## 5. Finite mobile scrolling

The old preview relied on a transformed 210 mm wrapper whose layout box and visual box could diverge on narrow devices.

V3.0 report-view:
- removes wrapper transform;
- scales the paper itself;
- sets wrapper width and height to the exact scaled visual dimensions;
- removes the A4 `min-height` from the wrapper in report-view;
- on <=980 px, uses natural document/body scrolling with no forced preview min-height.

This makes the scrollable area terminate at the real visual document end.

## 6. Remembered PC Folder

Implemented in `src/pc-storage.js`.

On supported Chrome/Edge desktop:
- `showDirectoryPicker()` selects a read/write folder;
- the FileSystemDirectoryHandle is stored in IndexedDB;
- permission state is checked on later sessions;
- explicit Save Quote triggers non-blocking PC autosave when permission is granted;
- manual Save Now can request permission again;
- Read Latest restores `PriceReport_Tunggiabao-current.json` after confirmation.

Files written:
- `PriceReport_Tunggiabao-current.json`;
- `PriceReport_Tunggiabao-backup.json`;
- a quote-specific JSON filename based on quote number/date.

Browser security does not expose a full Windows absolute path to web apps. The remembered object is a permission-scoped directory handle, not an unrestricted filesystem path.

Unsupported browsers fall back safely without breaking local-first storage.

## Regression coverage

CI #234:
- runtime audit: 0 vulnerabilities;
- CORE LOGIC PASS;
- IMPORTER LOGIC PASS;
- PC STORAGE LOGIC PASS;
- 2 DOM test files, 32/32 tests PASS;
- SMOKE PASS: 258 IDs, 79 bindings, 22 preview targets;
- production build PASS.

Added regression assertions:
- removed legacy company fields are absent from editor and preview;
- font-size slider updates report role font variables;
- report-view tab enters/exits and exposes aria-current correctly;
- Export tab includes Excel/OCR/PC controls;
- exact scaled wrapper height exists in report-view implementation;
- explicit quote save invokes PC autosave;
- PC filename sanitization and unsupported-environment fallback.

## Release criterion

Merge only after final documentation head repeats:
- runtime audit;
- all logic/DOM/smoke tests;
- production build.

After merge, verify the GitHub Pages workflow for the exact merge commit.
