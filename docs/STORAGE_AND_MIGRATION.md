# STORAGE AND MIGRATION

V6.19 preserves all existing storage keys and backup schema v4. No destructive migration occurs.

`createStorageRepository(storage)` owns safe raw/JSON reads, verified writes, snapshot capture and verified rollback. History/customer/catalog/UI preference reads now use this boundary.

Startup legacy profile/logo migration remains in the composition root until dedicated fixtures cover it. Future schema changes must use ordered vN -> vN+1 migrations with safe fallback.

## V6.19 version marker and migration engine

The legacy persistent format is formally adopted as storage schema V1 using the sidecar key `tunggiabao-price-report-schema-meta-v1`. Marker creation does not rewrite business data. A newer-than-app marker is never overwritten; an older marker reports migration-required.

`migrateVersionedPayload()` applies explicit ordered migration functions one version at a time and fails when any step is missing. A legacy quotation fixture protects the migration seam.

Backup schema and storage data schema are separate concepts: backup remains envelope schema 4, while `dataVersion` identifies the storage/domain data version.
