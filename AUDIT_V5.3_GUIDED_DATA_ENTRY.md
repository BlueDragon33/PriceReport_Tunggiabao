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
