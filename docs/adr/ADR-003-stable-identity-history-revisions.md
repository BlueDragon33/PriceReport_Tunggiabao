# ADR-003: Stable quotation identity and revision preservation

Status: Accepted — V6.19

Quotation lines persist a stable itemId. A catalog reference is only provenance (`sourceProductId`); copied line data is the quotation snapshot.

A saved quotation keeps a stable history record/quotation identity. Subsequent saves increment `revision` and preserve the former current snapshot in `revisions[]`, avoiding silent historical data loss while keeping one quotation row in the existing UI.
