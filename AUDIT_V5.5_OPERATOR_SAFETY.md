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

## Pass 2 — Interrupted import review recovery

### Findings

V5.4 made Data Library import transactional once Apply is pressed, but the review itself existed only in memory. A page reload or accidental close before Apply forced the operator to select and parse the file again.

Persisting the raw workbook would be excessive and would create a second file store, so recovery must remain session-scoped and store only parsed review material.

### Corrections

- Added a dedicated `sessionStorage` recovery key for Data Library import review.
- Recovery stores only:
  - import mode (customer/product);
  - source filename for operator context;
  - selected sheet name;
  - parsed row arrays for each reviewed sheet;
  - timestamp and recovery schema version.
- Raw File/Blob/ArrayBuffer data is not persisted.
- Recovery payload is capped at 1,000,000 serialized characters; oversized reviews continue to work normally but are not stored for reload recovery.
- On recovery, candidates are rebuilt through the existing normalizer against the **current** Data Library, so update counts and duplicate decisions are recalculated instead of trusting stale derived state.
- Closing the modal with X/backdrop keeps the recovery.
- Returning to Data Library offers a one-time **Khôi phục** action for that saved review.
- Explicit **Hủy** discards recovery.
- Successful Apply discards recovery before the modal closes.
- Failed persistence during Apply leaves the review/recovery intact.
- No raw-file cache, backend, IndexedDB store or second Data Library engine is introduced.

### Regression coverage

- parsed customer import writes session recovery;
- recovery payload contains parsed rows but no raw file/buffer object;
- close → leave Data Library → return → Khôi phục reopens the review with the same parsed customer;
- explicit Cancel clears recovery;
- successful Data Library import/update clears recovery before exposing Undo.

### Next pass

Audit repetitive import cleanup: allow the operator to resolve duplicate/invalid rows directly in review without returning to Excel when the correction is safe and local, while preserving the rule that the system must never silently choose a winner from duplicate source rows.

## Pass 2 hardening — Sequential import state

### Defect found by combined regression

When one Data Library import finished and a second import started immediately, the modal became visible before the new workbook finished parsing while the previous review counters and preview rows were still present. In a fast workflow this could briefly show stale data from the prior file and also made recovery tests race against old DOM state.

### Fix

- Starting a new import now resets all review counters, sheet selector, notice, preview rows and Apply state before asynchronous parsing begins.
- Apply stays disabled with an explicit loading label until the new candidate is ready.
- A read token invalidates an in-flight workbook parse when the modal is closed or a newer read begins, so a late result cannot repopulate a discarded review.
- Invalid recovery schema/mode is now removed from session storage instead of being left behind indefinitely.
- Regression covers stale count/preview reset while the next file's ArrayBuffer is deliberately held pending.


## Pass 3 — Explicit duplicate and invalid-row review decisions

### Findings

The transactional import review still forced operators back to the source spreadsheet for two common cleanup cases:
- duplicate source rows were visible but could only be skipped as a whole group;
- invalid source rows were counted but there was no explicit acknowledgement path in the review itself.

For repetitive data-entry work, that creates needless context switching. Automatically choosing a duplicate winner would be worse because price, note and contact differences can be meaningful.

### Corrections

- Added one operator-decision panel inside the existing Data Library import modal.
- Duplicate groups remain excluded by default.
- Each duplicate candidate exposes an explicit **Giữ dòng này** action.
- Selecting a winner admits exactly that source row into the pending transaction and leaves the other rows excluded.
- The operator may switch the selected winner before Apply.
- Invalid rows expose their source row number and raw visible cell values.
- Invalid rows remain unresolved until the operator explicitly chooses **Xác nhận bỏ qua dòng này**.
- Acknowledging an invalid row changes review state only; it does not rewrite the source row or invent missing data.
- Summary counts and Apply count are derived from the current review decisions instead of stale parser totals.
- Duplicate choices and invalid-row acknowledgements are stored with the existing session recovery payload, so accidental close/reload does not lose operator decisions.
- Apply still writes through the existing customer/product storage engines only.
- No automatic merge, fuzzy winner selection, second parser or second data store is introduced.

### Regression coverage

- unresolved duplicate group contributes no duplicate rows to Apply;
- explicitly choosing one duplicate winner increases the accepted count by exactly one;
- the selected duplicate row, including its price/note, is the one persisted;
- invalid rows remain visible until explicitly acknowledged;
- invalid-row acknowledgement is preserved in session recovery;
- existing V5.4 behavior remains safe when the operator makes no duplicate choice.

### Next pass

Audit large review ergonomics: collapsing resolved issue groups, navigating directly between unresolved issues, and keeping the decision panel usable with hundreds of imported rows without adding another pagination/state engine.


## Pass 4 — Large review ergonomics

### Findings

Pass 3 made duplicate and invalid-row decisions explicit, but a large import could still leave the operator scanning a long mixed list of resolved and unresolved cards. With dozens or hundreds of issues, already-completed work remained visual noise and there was no direct keyboard/focus path to the next pending decision.

Introducing a separate paginator or review store would duplicate state that already exists in the import draft, so the large-review pass stays derived from the current duplicate choices and invalid-row acknowledgements.

### Corrections

- The decision panel now derives one unresolved count from the existing review state.
- Resolved duplicate groups and acknowledged invalid rows are hidden by default.
- Added **Vấn đề tiếp theo** to focus and scroll directly to the next unresolved review card.
- After choosing a duplicate winner or acknowledging an invalid row, focus advances to the next unresolved item automatically.
- Added **Hiện đã xử lý** for operators who need to audit previous decisions without mixing them into the default work queue.
- Resolved duplicate cards remain editable when shown, so the selected winner can still be changed before Apply.
- Acknowledged invalid rows are shown as read-only resolved records when the resolved view is enabled.
- Loading a new file resets the resolved-view toggle and navigation count, preventing stale review UI from leaking across imports.
- No additional pagination state, database, parser or storage engine is introduced.

### Regression coverage

- a review containing multiple duplicate groups plus an invalid row exposes the correct unresolved count;
- default issue rendering contains only unresolved cards;
- **Vấn đề tiếp theo** moves focus into unresolved work;
- resolving one duplicate decreases the unresolved count and removes the resolved card from the default queue;
- enabling **Hiện đã xử lý** reveals the resolved card while preserving the unresolved cards;
- existing V5.4/V5.5 import, recovery and transactional behaviors remain under the full gate.

### Next pass

Audit import review completion semantics and operator safeguards: make the all-resolved state unmistakable, ensure Apply messaging distinguishes unresolved warnings from acknowledged skips, and verify keyboard-only operation across the complete review flow.


## Pass 5 — Review completion semantics and operator safeguards

### Findings

Pass 4 made large review queues easier to navigate, but the completion state was still implicit:
- the Apply button could remain enabled while unresolved duplicate/invalid issues existed, without explicitly stating that those unresolved items would not be imported;
- after the final issue was resolved, focus could fall out of the review work instead of moving to the next safe action;
- single-sheet imports always attempted to focus the sheet selector even when that control was not visible;
- Tab navigation had no modal boundary safeguard.

Changing transactional import semantics or blocking safe rows would break the established V5.4 contract, so Pass 5 keeps partial-safe Apply while making the consequences explicit.

### Corrections

- Added a dedicated completion status surface with three derived states:
  - pending while parsing;
  - warning while unresolved review work remains;
  - ready when the review is clear.
- Warning state explicitly states how many unresolved issues will not be imported.
- All-resolved state explicitly confirms that duplicate selections and acknowledged invalid-row skips are complete.
- Clean files with no review issues show a distinct **Dữ liệu đã sẵn sàng** state.
- Apply copy now distinguishes:
  - safe partial apply with unresolved issues;
  - fully reviewed apply;
  - empty/no-applicable-data state.
- Apply exposes a review-state data attribute for consistent UI and regression guards.
- Initial keyboard focus now goes to:
  1. visible sheet selector when multi-sheet selection is required;
  2. first unresolved review action;
  3. Apply when no review work remains;
  4. Cancel only as the final fallback.
- After resolving the final issue, focus advances to Apply.
- Tab/Shift+Tab are trapped within the import modal boundary while it is open.
- Escape behavior remains unchanged.
- No additional import engine, review store or persistence schema is introduced.

### Regression coverage

- unresolved review shows a warning completion state and Apply text that explicitly says unresolved issues are skipped;
- resolving the last duplicate/invalid issue changes completion state to ready;
- acknowledged invalid-row skips are distinguished from unresolved warnings;
- final resolution moves focus to Apply;
- single-sheet review starts keyboard focus in unresolved work instead of a hidden selector;
- Tab and Shift+Tab wrap within the modal;
- existing V5.4/V5.5 transactional, recovery, large-review and undo behavior remains under the full gate.

### Next pass

Audit destructive/reversible boundaries after import: confirm undo messaging, recovery expiration/cleanup and operator-visible history are consistent enough to close V5.5 Operator Safety without adding persistent audit infrastructure.
