# V5.3 Guided Data Entry — audit

Date: 2026-09-23

## Scope
Continue the full PriceReport redesign after V5.2 Smart Data Entry, focusing on users whose primary task is entering quotation data rather than configuring the application.

## Pass 1 — Guided validation navigation

### Finding
Studio already calculated document errors and warnings, but the primary “Kiểm tra” action delegated to the generic preview preflight alert. Users learned that something was wrong but were not guided to the field or workflow step that needed correction.

### Corrections
- Added an inline Studio validation panel.
- Errors and warnings are rendered separately with semantic severity.
- Each issue is actionable and routes the user to the relevant Studio step.
- Known field-level issues focus the corresponding input after navigation.
- Product issues route to the product-entry grid.
- The panel has an explicit close action and remains hidden until requested.
- The generic preview/print preflight remains intact for print safety.
- No new media-query layer or second validation engine was introduced.

### Regression coverage
- Guided panel exists and is hidden by default.
- Studio “Kiểm tra” opens the panel.
- A missing company name produces an actionable error item.
- Closing the panel restores the default hidden state.

### Next pass
Add step-level completion indicators to the Studio workflow so data-entry users can see which stage still needs attention before reaching Export, without forcing them to run a full preflight each time.

## Gate
Required before merge:
- syntax/UI debt guards;
- full npm test;
- DOM regression;
- smoke;
- production build;
- GitHub Actions green.


## Pass 2 — Workflow step health

### Finding
Even with guided preflight, users still had to explicitly run validation to know whether an earlier step needed attention.

### Corrections
- The existing Studio stepper now reuses the same validation engine to derive per-step health.
- Steps expose ready, warning and error states.
- Export reflects overall document health, so blocking issues are visible before the user reaches the final stage.
- No second business-validation engine was added.
- State styling uses existing V5 semantic tokens and adds no responsive/media-query debt.

### Regression coverage
- General becomes error when a required company name is cleared.
- Export reflects the blocking error.
- Restoring the value clears the error state after Studio context refresh.

### Next pass
Improve continuous feedback so step-health and the open guidance panel refresh after edits without forcing navigation between steps.


## Pass 3 — Continuous guidance refresh

### Finding
Step health refreshed during Studio navigation, but an already-open guidance panel could become stale after the user corrected a field.

### Corrections
- Open guidance now refreshes automatically after normal bound-field edits.
- Product-grid edits refresh the same guidance without forcing a full page rerender.
- Corrected issues disappear immediately from the visible checklist.
- Step health and document-health badges stay aligned with the same validation result.

### Regression coverage
- A missing-company error appears in guidance.
- Restoring the company name clears that exact issue immediately while the panel remains open.

### Next pass
Audit keyboard flow and focus restoration across guided corrections, especially from issue item → field → return to validation, so users can complete the workflow without mouse-dependent recovery.
