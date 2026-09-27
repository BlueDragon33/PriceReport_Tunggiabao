# OFFLINE ARCHITECTURE

PriceReport is Standalone/local-first. Create/edit/save, local libraries, preview/history, backup/restore and print must not depend on management services.

Device/management services start asynchronously. Service Worker cache owns app assets only; business data remains in storage and is never deleted during cache recovery.

V6.19 cache: `pricereport-shell-v619-architecture-final`.

The final V6.19 Service Worker explicitly precaches core ES modules imported by the application, including domain, storage, backup, command and report-model modules. Business records are still excluded from Cache Storage.
