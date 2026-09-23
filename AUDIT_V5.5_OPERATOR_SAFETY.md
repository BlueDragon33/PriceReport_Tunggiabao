# V5.5 Operator Safety — Audit

Date: 2026-09-24

## Baseline

V5.5 starts from aligned V5.4 Data Management on `main` after PR #45. Existing customer/product collections remain the only Data Library storage engines.

## Pass 1 — Reversible Data Library mutations

### Findings

The first operator-safety audit found one inconsistent interaction model:
- Smart Import already exposes one-step Undo after applying data;
- Data Library row deletion, bulk deletion and import/update application did not;
- deleting customer/product records refreshed the visible table but did not refresh autocomplete suggestion lists, so deleted records could remain visible as stale suggestions.

This is especially risky for operators whose primary task is repetitive data entry rather than system configuration.

### Corrections

- Added one shared Data Library undo path instead of a second undo engine.
- Single customer deletion now captures the previous collection and offers **Hoàn tác**.
- Single product deletion now captures the previous collection and offers **Hoàn tác**.
- Bulk customer/product deletion uses the same reversible snapshot path.
- Transactional Data Library import/update now offers **Hoàn tác** after a successful apply.
- Undo restores the exact previous normalized collection, including existing record IDs.
- Customer/product selections are cleared after mutation/restore.
- Autocomplete suggestions are refreshed after deletion and after undo.
- Undo uses the existing toast action component with an 8-second action window.
- No schema version, canonical identity rule or second storage engine is introduced.

### Regression coverage

- row-level customer delete → autocomplete removes record → Undo restores collection and suggestion;
- bulk product delete → autocomplete removes record → Undo restores collection and suggestion;
- customer import that updates an existing canonical record → Undo restores original ID and data;
- smoke requires the V5.5 Data Library undo helper/action contract.

### Gate

Before continuing:
1. runtime dependency audit;
2. syntax + V5 UI/debt guards;
3. core/import/export/storage/service-worker tests;
4. focused V5.5 reversible Data Library DOM regression;
5. full app + migration DOM regression;
6. smoke;
7. production build;
8. GitHub Actions green on the exact head.

## Next pass

Audit Data Library import-session recovery. If a reviewed import is interrupted by accidental close/reload before Apply, preserve only safe parsed review state in session storage so the operator can resume without persisting raw files or creating a second data store.
