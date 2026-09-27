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
