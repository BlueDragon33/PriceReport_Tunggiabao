# DATA MODEL

The persisted V6.18 flat quotation remains compatible in V6.19.

Canonical QuotationItem is prepared by `createQuotationItemSnapshot()` with itemId, sourceProductId, name/unit/pack/group snapshots, qty, unitPrice, discount, tax and note. Legacy aliases remain for compatibility. Runtime migration to stable itemId is deferred until all item commands move together.

`normalizeCustomerEntity()` and `normalizeProductEntity()` define canonical identities without rewriting existing libraries. Saved quotation history is snapshot data and must not be mutated by later library edits.
