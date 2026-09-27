# DATA MODEL

The persisted V6.18 flat quotation remains compatible in V6.19.

Canonical QuotationItem is prepared by `createQuotationItemSnapshot()`. Runtime quotation lines now receive stable `itemId` values and optional `sourceProductId`; legacy lines receive IDs without a destructive storage migration. Catalog-to-quotation adds record the catalog source while copied business values remain local snapshots. UI handlers still use transitional indexes in several places and will move to itemId commands incrementally.

History records now expose `recordId`, `quotationId`, `revision` and nested prior `revisions[]`. Saving an already-saved quotation advances revision while preserving the previous snapshot inside the same history entry, so the management UI does not suddenly show duplicate quotation rows.

`normalizeCustomerEntity()` and `normalizeProductEntity()` define canonical identities without rewriting existing libraries. Saved quotation history is snapshot data and must not be mutated by later library edits.
