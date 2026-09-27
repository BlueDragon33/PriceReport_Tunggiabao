# ADR-004: Explicit storage version and backup envelope

Status: Accepted — V6.19

The existing local data layout is formally storage schema V1 via a sidecar marker; business data is not rewritten just to add a version. Future migrations are ordered one-version steps and must have fixtures.

Backup envelope schema remains v4 and additionally records appVersion and dataVersion. Backup version and storage data version are intentionally separate.
