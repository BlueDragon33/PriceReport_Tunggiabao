# ARCHITECTURE

V6.19 uses an incremental Strangler refactor.

```
UI adapters -> transitional commands in main.js -> domain modules -> storage repository -> browser storage
Domain -> report/export adapters
```

Implemented owners:
- `src/core.js`: shared calculation/date/currency primitives.
- `src/domain/entities.js`: entity helpers, IDs, search normalization and quotation lifecycle contract.
- `src/domain/validation.js`: DOM-free quotation validation.
- `src/storage/repository.js`: safe Storage abstraction with verification and rollback.
- `src/importers.js`: import parsing/mapping.
- `src/exporters.js`: export adapter using the shared calculation engine.

`main.js` remains the composition root during migration. Optional management/device services must never block standalone quotation operations.

## V6.19 final extraction

Additional implemented boundaries:
- `src/application/quotation-commands.js`: itemId-oriented bulk mutations and move/query primitives.
- `src/storage/migrations.js`: schema marker and ordered migration engine.
- `src/services/backup-service.js`: backup envelope/version validation and normalization.
- `src/report/report-view-model.js`: canonical report projection shared by preview totals and spreadsheet export.
- `src/storage/integrity.js`: non-destructive valid/rejected partition and quarantine payload foundation.

The composition root remains intentionally large because UI controllers are migrated only when a tested ownership boundary exists; new business rules must not be added directly to DOM handlers.
