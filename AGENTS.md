# Repository Agent Instructions

## Mandatory UI/UX Governance

Before changing any UI, UX, frontend layout, responsive behavior, component styling, navigation, modal, workspace, preview, report presentation, print presentation, or frontend interaction:

1. **Read `docs/UI_UX_CONSTITUTION.md` first.**
2. Treat it as the current design source of truth.
3. Inspect current component/layout/CSS ownership before editing.
4. Do not introduce a parallel design system.
5. Do not reintroduce deprecated UI patterns.
6. Reuse established components and semantic design tokens.
7. Validate desktop, tablet, and mobile.
8. Validate keyboard and accessibility.
9. Validate report/print isolation when relevant.
10. Run relevant regression tests.
11. If a Product Owner request intentionally changes a long-term UI policy, update the Constitution and `docs/UI_UX_CHANGELOG.md` in the same change.

Do not depend on memory from a previous chat. The repository itself carries the product design direction.

## Architecture Safety

- Preserve business correctness and user data before visual polish.
- Keep Standalone/local-first core usable without Application Management.
- Do not move business rules into DOM handlers or UI state.
- Do not bypass the Storage Repository for persistent runtime/business data.
- Never report a saved, connected, approved, synced, or production-ready state without verified evidence.
- Keep Application UI, Report Document, and Print Layer ownership separate.

## Merge Discipline

Develop on a branch. Open a PR. Do not merge until applicable Constitution Compliance, Webapp CI, and Production Release Gate checks pass on the exact PR head.
