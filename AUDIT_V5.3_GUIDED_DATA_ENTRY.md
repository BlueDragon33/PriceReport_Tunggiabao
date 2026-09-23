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


## Pass 4 — Keyboard recovery from guided correction

### Finding
Issue items were keyboard-focusable, but once a user activated an issue and focus moved to the field, returning to the original checklist item still required pointer navigation.

### Corrections
- Guided issue activation now remembers the originating issue control.
- After focus moves to the target field, Escape returns focus to the exact issue item that launched the correction.
- The same behavior applies to mapped product-row corrections.
- No global Escape override was added; the behavior is scoped to the focused correction target.

### Regression coverage
- A missing-company issue can be activated from guidance.
- Focus moves to the company field.
- Escape returns focus to the exact guidance item.

### Next pass
Run a consolidated V5.3 gate, inspect failures, and only then decide whether to continue into guided defaults/prefill or package a V5.3 release candidate.

## Pass 5 — Guidance routing and focus resilience

### Finding
The first consolidated tester pass found three interaction defects that source/DOM coverage had not modeled closely enough:
- the Escape return handler was registered with `once: true`, so any ordinary key pressed while editing consumed the handler before Escape;
- live guidance refresh rebuilds the issue list after an input event, which can detach the original issue button and leave Escape pointing at a stale DOM node;
- product validation routing was incomplete: “Chưa có sản phẩm hợp lệ” fell back to the General step, while named-product warnings did not resolve the actual product row.

### Corrections
- Escape recovery now remains armed through normal typing and is removed only after Escape is actually handled.
- Guidance items receive a stable validation key. After a live re-render, Escape resolves the current issue button by that key instead of focusing a detached node.
- If the issue has disappeared after correction, focus falls back to the connected guidance control instead of a dead element.
- “Chưa có sản phẩm hợp lệ” explicitly routes to Products.
- Named-product warnings resolve the matching product row by name and focus that row when possible.
- Existing row-number errors continue to use their exact source product index.

### Regression coverage
- Simulates a real `input` event while the guidance panel is open, verifies the issue button is replaced, then verifies Escape returns to the refreshed issue.
- Verifies a named-product quantity warning focuses the matching product row.
- Smoke gate now guards the no-product → Products routing contract.

### Next pass
Run the full V5.3 gate on the final head. If green, perform release-candidate cleanup and documentation/version alignment before merge.

