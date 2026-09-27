# BUSINESS RULES

1. Quotation data is source of truth; DOM/preview/export are adapters.
2. `calculateQuoteBreakdown()` is the single money engine.
3. Historical quotation data is immutable snapshot data.
4. Statuses: draft, sent, accepted, rejected, expired.
5. Normal lifecycle: draft -> sent -> accepted/rejected/expired.
6. Reopening a final status requires an explicit workflow.
7. Final quotations require quote number and valid quote date.
8. Import/restore must not leave partial persistence.
9. UI must not claim saved before persistence verifies.
10. Management/device services are optional to standalone core.
