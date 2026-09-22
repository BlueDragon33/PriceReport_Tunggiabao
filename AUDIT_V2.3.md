# V2.3 Data Safety / Print / Offline Audit

Date: 2026-09-22
PR: #18
Branch: `audit/v2.3-data-pwa-hardening`

## Scope

Follow-up audit after V2.2, focused on edge cases that can remain hidden behind normal happy-path tests:

- malformed or legacy LocalStorage data;
- full-backup and single-quotation import safety;
- storage-quota failure and rollback behavior;
- quotation date correctness in local time;
- imported design/config normalization;
- history currency integrity;
- multi-page printing;
- first-install PWA offline behavior;
- navigation accessibility state;
- preservation of reusable configuration when creating a new quotation.

## Findings fixed

1. **Nested restored data was trusted too much**
   - A backup could have a valid top-level shape but malformed history/customer/catalog/preset entries.
   - History, customer library, product catalog and presets are now normalized before use and before persistence.
   - Invalid collection entries are filtered instead of being allowed to crash management screens.

2. **Backup restore could partially overwrite data if LocalStorage failed**
   - Full restore and single-quotation import now take a storage snapshot before destructive writes.
   - If a write fails, the app restores the previous state instead of leaving mixed old/new collections.
   - Integration coverage injects a simulated `QuotaExceededError` and verifies rollback.

3. **Legacy logo migration could hide an otherwise readable quotation state**
   - Failure while separating a legacy embedded logo no longer drops the already loaded quotation back to defaults.
   - Migration is deferred while the loaded state stays usable.

4. **Non-finite numeric values could leak into imported data**
   - `Infinity`, `NaN`-like values and negative prices/quantities are normalized.
   - Layout controls are bounded to the same ranges as the UI.
   - Discount/VAT handling now follows the same finite-number rules in import, preview and core calculation.

5. **Imported design strings could leave controls/CSS in invalid states**
   - Font, logo treatment, blend mode and border mode use explicit supported-value lists.
   - Hex colors are normalized with a safe fallback.

6. **Quotation dates used UTC in some flows**
   - Defaults, duplicate, preset and new-quotation flows now use the browser's local calendar date.
   - ISO date validation was added to preflight.

7. **Multi-page print inherited preview overflow clipping**
   - Print overrides force the document to allow multi-page overflow.
   - Table rows still avoid splitting where possible; summary/words/payment/terms/closing/signature blocks receive break protection.

8. **First-load offline support was incomplete**
   - Service Worker cache moved from v12 to v13.
   - Install now reads the built index and precaches linked same-origin app assets in addition to the core shell.

9. **Preview totals and core business totals had duplicated calculation paths**
   - Grand total rendering now delegates to the core calculation.
   - Display percentages use the same bounded rules.

10. **Active navigation lacked explicit assistive-technology state**
    - The active pane now exposes `aria-current="page"`.

11. **Reusable signature/date configuration was unnecessarily reset**
    - New quotations preserve the standard date line and company representative name.
    - Presets explicitly clear the customer-side signer name.

## Report-design verification

The V2 reference geometry remains unchanged by this release:

- header structural ratio remains 41.5% / 58.5% with 6 mm gap;
- logo resizing stays inside the logo cell and does not push the company block sideways;
- company name stays centered within the company block while detail lines remain left aligned;
- no-logo mode centers the company block;
- quotation title remains structurally independent from the metadata card and follows the page title axis;
- all eight templates inherit the same structural geometry and differ only through typography, accent, borders, section/table treatment and restrained decoration.

No new illustrative image assets were introduced.

## Automated regression coverage added

Core:
- finite/non-negative numeric normalization;
- bounded imported layout values;
- local calendar date helper;
- valid/invalid ISO dates;
- hex color normalization;
- unsupported currency normalization.

DOM integration:
- malformed persisted collections do not crash History/Master Data;
- active navigation exposes `aria-current`;
- full restore rolls back when a storage write throws `QuotaExceededError`.

Smoke/contract:
- PWA first-install linked-asset precache;
- cache v13;
- collection/preset normalizers;
- transactional storage snapshot/rollback;
- local-date usage across quotation-date flows;
- design bounds/color/font guards;
- multi-page print overflow;
- date preflight validation.

## Release gate

V2.3 may merge only when the final PR head passes:

```bash
npm test
npm run build
```

After merge, GitHub Pages build and deploy must also complete successfully.

## Intentional scope limits

Unchanged from V2.2:

- local-first only; no account/backend/cloud synchronization;
- no automatic FX conversion;
- PDF generation uses browser print/save-PDF;
- cross-device continuity requires backup/restore;
- browser print engines can still differ slightly in pagination and font metrics.
