# STORAGE AND MIGRATION

V6.19 preserves all existing storage keys and backup schema v4. No destructive migration occurs.

`createStorageRepository(storage)` owns safe raw/JSON reads, verified writes, snapshot capture and verified rollback. History/customer/catalog/UI preference reads now use this boundary.

Startup legacy profile/logo migration remains in the composition root until dedicated fixtures cover it. Future schema changes must use ordered vN -> vN+1 migrations with safe fallback.
