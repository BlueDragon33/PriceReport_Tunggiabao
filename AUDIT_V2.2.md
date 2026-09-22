# V2.2 QA / UX / Report Design Audit

Date: 2026-09-22

## Scope
Audit of the local-first quotation WebApp covering:
- quotation creation/editing;
- product entry and calculations;
- quote lifecycle/history;
- customer/product reusable data;
- backup/restore;
- logo handling;
- print/PDF preflight;
- template/report design consistency;
- responsive/offline architecture.

## Critical / high-impact findings fixed

1. **Duplicate quotations could collide**
   - Multiple copies could reuse `-COPY` and later overwrite/update the wrong history entry.
   - Fixed with unique copy numbering and persistent history record identity.

2. **History silently mixed currencies**
   - VND/USD/RUB values were summed and displayed as VND.
   - Fixed: history totals are grouped by actual currency; each row displays its own currency.

3. **Product catalog could reuse a price in the wrong currency**
   - A VND catalog price could be inserted into a USD/RUB quotation.
   - Fixed: catalog stores currency; cross-currency insertion keeps product data but resets price to 0 for safe re-entry.

4. **New quotation carried demo/transaction state too aggressively**
   - New quote workflow could reuse transactional details unintentionally.
   - Fixed: new quote starts with one blank product while preserving company/design/payment/standard terms.

5. **Preset semantics were unsafe**
   - A saved preset could carry customer, quote number and product transaction data.
   - Fixed: presets are reusable configuration only.

6. **Logo storage created performance/storage pressure**
   - Base64 logo data could be re-written on every autosave and duplicated into history/presets.
   - Fixed: logo asset is stored separately; history/presets do not duplicate it; legacy duplicate assets are compacted.

7. **Print/PDF had no document-level validation**
   - Incomplete or contradictory documents could be printed without warning.
   - Fixed: document health + preflight checks for critical fields, product validity, VAT/terms consistency, payment completeness, logo state and hidden totals.

8. **Table layout was visually inefficient**
   - Every product column had equal width and currency codes repeated in every numeric cell.
   - Fixed: adaptive role-based column widths and numeric-only cells under currency-labeled headers.

9. **Reset/export UX contained misleading or duplicate actions**
   - Reset copy implied all app data would be removed; two JSON export actions duplicated each other.
   - Fixed: reset is explicitly current-quote only; duplicate export action replaced by a preflight action.

10. **Design panel close/open was partly cosmetic on desktop**
    - Fixed to control the real panel state.

## Report design review

### Reference baseline
`Chuẩn công ty` is the recommended baseline and follows the supplied PDF structure:
- logo in the left header cell;
- company block centered inside the right header cell;
- company title centered over left-aligned detail lines;
- quotation title centered independently from header/meta geometry;
- white A4 background;
- restrained Times New Roman typography;
- no oversized decorative shapes.

### Other templates
All templates share the same fixed header/title geometry. They may change:
- accent;
- typography;
- border treatment;
- section/table styling.

They may not move:
- logo/company structural columns;
- company block axis;
- quotation title axis.

### Recommended use
- **Chuẩn công ty**: default / most formal quotations.
- **Doanh nghiệp**: B2B and wholesale.
- **Tối giản**: long price lists.
- **Trang trọng**: formal documents.
- **Xanh thương hiệu**: brand-forward food/agriculture use.
- **Ấm nhẹ**: retail/customer-friendly quotations.
- **Cao cấp sáng**: proposal-like quotations.
- **Đen trắng**: economical monochrome printing.

## Automated quality gates

`npm test` now includes:
1. JavaScript syntax check.
2. Core business-rule tests.
3. JSDOM integration tests.
4. Static smoke/contract tests.

Integration coverage includes:
- application boot;
- product add/render sync;
- template switching;
- history save;
- print preflight;
- current-only reset behavior.

## Known scope limitations
These are intentional, not current defects:
- no account/backend/cloud sync;
- no automatic FX conversion;
- PDF generation uses browser print/save-PDF;
- data is local to the current browser profile unless backed up/restored.

Within the current local-first scope, the release gate requires all automated tests and the production build to pass before merge.
