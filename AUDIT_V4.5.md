# AUDIT V4.5 — Quotation studio context

## Problem
The application-level Dashboard, Quotation Management and Master Data workspaces were clear, but the quotation studio still felt like a collection of tabs. Users could lose track of which quotation they were editing and where they were in the workflow.

A secondary mobile/tablet defect was also found: the Design panel could remain in its transient open state after navigating away and unexpectedly reappear later.

## V4.5 changes
- Add a compact studio context header inside the editor column.
- Show current quotation number, lifecycle status and whether the quotation already exists in History.
- Add a direct Home button back to Dashboard.
- Add five workflow steps:
  1. Content
  2. Products
  3. Payment
  4. Design
  5. Export
- Keep Customer under Content and Terms under Payment via stage mapping.
- Synchronize the studio header during render and tab changes.
- Close transient Design / Preview customizer state when leaving the relevant workspace.

## Regression coverage
- Current quotation number is shown in the studio.
- Current workflow step tracks tab navigation.
- Workflow steps are directly navigable.
- Home returns to Dashboard.
- Leaving Design clears the transient open state.
- Smoke gates require the context header, synchronizer, step wiring and active-step styles.

## Version
- App: 4.5.0
- Service worker cache: pricereport-shell-v33-studio-context
