# V5.1 Quotation Studio — UX, logic and report audit

Date: 2026-09-23

## Scope

This pass treats PriceReport as both:
1. a quotation-authoring application used repeatedly during daily work, and
2. a professional A4 quotation/report generator.

Primary flow audited:
Information → Products → Payment → Terms → Design → Export / Print.

## Findings confirmed

### Quotation-authoring UX

1. The visible workflow exposed 5 stages while the editor actually split work across more panes. Terms was hidden under the Payment stage and the user had to use another navigation surface to discover it.
2. Save / validate / A4 preview actions were not available where the user was editing. Saving required leaving the studio for Quotation Management.
3. The studio history badge treated any quote with a history id as “saved”, even after the quote had been edited again.
4. Creating a new quote used two consecutive native confirmation dialogs.
5. General already contained the practical customer fields, while reusable customer selection lived elsewhere with no direct shortcut.
6. Product entry did not focus the new product name after adding a row and offered no shortcut to the reusable product catalog.
7. A blank newly-added product appeared as an empty A4 row.
8. Deleting the only product row could clear meaningful data without confirmation.
9. A product row containing price/specification but no name was only a warning, so it could still reach print after confirmation.
10. Column visibility controls were a long ungrouped stack and financial editing had no local subtotal/total feedback.

### Business/data logic

11. Saving a quote assigned historyRecordId before history persistence succeeded. A failed history write could therefore leave a false “saved” identity.
12. A previously saved quote could be edited to a quote number already used by another history record because duplicate-number checking only ran for first-time saves.
13. Product grouping kept the previous active group across an ungrouped row, so a repeated group after a break could lose its group heading.
14. The default quantity of 1 made an otherwise blank product look partially filled to validation logic.

### A4 / professional report

15. Customer information was flattened into one bullet-separated line, making long addresses and contacts hard to scan.
16. Empty payment fields could still leave empty labeled cells in the payment block.
17. Pasted terms already numbered as “1.” / “2)” / bullets could be numbered again by the report’s ordered list.
18. An empty Terms block could remain visible when the feature was enabled but contained no usable term.

## Corrections implemented

- Six explicit studio steps: Information, Products, Payment, Terms, Design, Export.
- Studio command bar: Save draft, Validate, View A4, Previous/Next, workflow position and document-health badge.
- History state distinguishes New / Saved / Changed since last history save.
- Ctrl/Cmd+S saves the current quote to history.
- Single-confirm new-quote behavior when there are unsaved history changes.
- Customer and product reusable-data shortcuts directly from the drafting flow.
- New product row focuses the Name field.
- Blank product drafts stay out of A4 until they contain meaningful data.
- Meaningful unnamed products are visibly marked in preview and are a blocking validation error.
- Product delete confirmation is based on whether the row contains meaningful data.
- Product group heading resets correctly after ungrouped rows.
- Quote-number collision check also applies when updating an existing saved quote.
- historyRecordId is committed only after history persistence succeeds.
- Product column switches use a compact grid.
- Payment editor shows live subtotal and final total.
- Customer A4 block uses structured labeled lines.
- Empty payment lines are hidden.
- Pasted list numbering is normalized before rendering Terms.
- Empty terms content suppresses the Terms report section.
- Service Worker cache rotated for V5.1 RC1.

## Release gates

Required before merge:
- UI isolation / debt guards.
- Logic and import tests.
- Service Worker tests.
- DOM regression suite.
- V5.1 quotation UX regression tests.
- Smoke tests.
- Production build.
- GitHub Actions CI green.

No production merge should occur while any gate is red.
