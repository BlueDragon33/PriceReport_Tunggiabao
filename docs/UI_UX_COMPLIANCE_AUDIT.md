# Current UI/UX Compliance Audit

**Audit baseline:** V6.21 main (`073dbf4980eca5041f84adbc1bb05bd48b7d1577`)  
**Constitution target:** UI/UX Constitution 1.0  
**Migration mode:** Incremental; no big-bang rewrite.

## Summary

The product already has several strong structural boundaries: Standalone/local-first mode, unified Studio work, dedicated responsive files, isolated print stylesheet, and browser regression gates. However, the CSS estate still carries substantial historical override debt. The correct next step is controlled consolidation by ownership, not a visual rewrite.

| Area | Classification | Notes |
| --- | --- | --- |
| Data safety / business boundary | PASS | UI work is protected by domain/storage/report boundaries and release gates. |
| Standalone / local-first UX | PASS | Application Management is optional and core quotation work remains local-first. |
| Report / Print isolation | PASS | Dedicated print layer and browser print regression already exist. |
| Application shell | MINOR DEBT | Shell is largely unified, but legacy naming/version CSS remains. |
| Navigation | MINOR DEBT | Functional hierarchy exists; future changes must converge toward Constitution mental model without duplicate destinations. |
| Dashboard | MINOR DEBT | Work-oriented direction exists; audit future metrics/cards for usefulness. |
| Quotation Studio | PASS / MINOR DEBT | Document-centered three-region workspace exists and adapts; ownership needs further consolidation. |
| Data-entry workspaces | PASS / MINOR DEBT | Large content/product workspaces exist; continue reducing narrow-panel legacy. |
| Product UX | PASS | Supports keyboard/paste/Excel/catalog/review patterns with regression coverage. |
| Customer UX | PASS | Reusable library and quotation integration exist. |
| Responsive | MAJOR DEBT | Behavior exists, but override-heavy responsive CSS indicates accumulated cascade debt. |
| Accessibility | MINOR DEBT | Focus traps, labels and keyboard regressions exist; every new component still requires review. |
| Component system | MAJOR DEBT | Shared primitives exist, but many historical selectors/variants remain across multiple version files. |
| Design tokens | MAJOR DEBT | Colors and dimensions are still frequently hard-coded; semantic-token consolidation is incomplete. |
| CSS ownership | MINOR / MAJOR DEBT | Report-vs-App boundaries are guarded, but legacy override density remains high. |
| Legacy UI removal | MAJOR DEBT | Historical version layers require migration/removal rather than indefinite overrides. |

## Measured debt baseline

Repository audit at Constitution creation:

| File | Lines | `!important` count | Media blocks | Hex color literals |
| --- | ---: | ---: | ---: | ---: |
| `src/styles.css` | 1087 | 428 | 6 | 242 |
| `src/ui-v5.css` | 5081 | 0 | 4 | 382 |
| `src/studio-v59.css` | 2341 | 0 | 4 | 461 |
| `src/content-workspace-v63.css` | 1157 | 59 | 4 | 196 |
| `src/responsive-v69.css` | 1018 | 305 | 3 | 19 |
| `src/responsive-v610.css` | 478 | 156 | 5 | 7 |
| `src/print-v618.css` | 87 | 51 | 0 | 2 |
| `src/quotation-themes-v60.css` | 272 | 286 | 0 | 176 |

These values are **not permission to add more debt**. They are migration baselines.

## What is already protected

- `scripts/ui-debt.test.mjs` prevents application selectors from leaking back into report CSS and prevents growth beyond existing report debt ceilings.
- `scripts/ui-v5.test.mjs` protects shared shell/UI behavior.
- Chromium browser gate protects major Studio visual/runtime flows.
- Print-media browser regression protects PDF isolation.
- Production Release Gate prevents publishing when canonical verification fails.

## Migration Roadmap

### Phase U1 — Governance foundation
**Status: this change**

- Add UI/UX Constitution.
- Add Constitution changelog.
- Add repository-level agent instruction.
- Add compliance audit.
- Add automated governance guard.

### Phase U2 — Semantic token consolidation
**Status: foundation implemented in V6.23; continue incrementally**

Implemented:
- canonical semantic aliases for application surfaces, text, borders, accent, state, spacing and radius;
- dark Studio semantic overrides using the same token names;
- App Shell/common UI and Content Workspace begin consuming semantic tokens;
- report/theme CSS remains isolated and does not consume application tokens;
- automated token-usage and hard-coded-color debt ceilings added.

Measured V6.23 movement:
- `ui-v5.css`: 0 → 98 semantic token references;
- `studio-v59.css`: 0 → 70 semantic token references; hex literals 461 → 451;
- `content-workspace-v63.css`: 0 → 29 semantic token references; hex literals 196 → 172.

Remaining:
- continue migrating repeated application colors and typography values;
- migrate common component variants during U3 instead of duplicating token work;
- do not alter report theme identity.

Exit gate for the foundation:
- no visual regression;
- hard-coded common application colors decreased in migrated areas;
- no new parallel token system.

### Phase U3 — Component consolidation
**Status: foundation implemented in V6.24; continue incrementally**

Implemented:
- canonical control tokens for height, radius, border, background, hover, text and placeholder;
- canonical button tokens for Secondary, Primary and Danger variants;
- existing `.btn` remains the primary primitive; no parallel button system was introduced;
- Studio and Content Workspace variants now consume the shared component contract;
- automated component-contract regression gate added.

Completed additionally in V6.25:
- IconButton size/radius/border/background/text contract;
- shared focus border/shadow contract;
- shared disabled surface/text/opacity contract;
- Studio and Content Workspace close/icon actions consume the same state model.

Completed additionally in V6.26:
- shared Neutral / Info / Success / Warning / Danger feedback tokens;
- Studio status badge and quick-fill chips use shared status semantics;
- Content Workspace chips consume the same feedback contract;
- success/warning application affordances start using semantic feedback tokens.

Completed additionally in V6.27:
- shared Panel/Card surface contract;
- shared Toolbar surface/border contract;
- shared Tab default/hover/active/text contract;
- shared Overlay backdrop and Dialog surface/border/radius contract;
- Studio inspector tabs, Studio panels, Product Workspace modal and Content/Review dialogs consume the shared contract.

Remaining:
- Search-specific behavior and affordance consolidation;
- Alert/Toast persistence and severity variants;
- Drawer-specific behavior where a real drawer concept exists;
- deprecate/remove historical variants only after usages are migrated.

Method remains:
mark old variants deprecated → migrate usages → test → remove obsolete selectors.

### Phase U4 — Responsive consolidation
Target:
- merge duplicated responsive ownership;
- eliminate viewport-specific `!important` patches where cascade can be corrected;
- keep Phone / Tablet Portrait / Tablet Landscape / Desktop / Wide Desktop strategy explicit.

Mandatory viewport validation:
1664×912, 1366×768, 1280×800, 1112×834, 1024×768, 834×1194, 390×844, 360×800.

### Phase U5 — Shell / Navigation cleanup
Target:
- converge all destinations onto one hierarchy;
- remove duplicate or obsolete navigation;
- keep workspace actions out of primary navigation;
- preserve one shell across Dashboard, Studio and System.

### Phase U6 — Studio and workspace cleanup
Target:
- preserve document-centered preview;
- remove legacy hidden implementations after migration;
- ensure complex forms use large workspace/modal rather than narrow sidebar;
- consolidate content/product workspace components.

### Phase U7 — Legacy CSS retirement
Target:
- remove obsolete version override blocks only after usage migration;
- reduce `!important` debt;
- reduce duplicate colors and breakpoints;
- keep report/theme/print ownership explicit.

## Rules for migration execution

Each phase follows:

**Audit → Component/area → Refactor → Test → Visual validation → Remove legacy → Next component**

Do not perform a full UI rewrite. Working features and data must remain safe at every intermediate commit.

## Current blocking issues

There is no Constitution-level production blocker in the current UI requiring an emergency rewrite.

The highest-priority debt is **responsive/CSS consolidation and component/token convergence**, because these areas create the greatest risk of future “old/new UI mixed together” regressions.

## Exit criteria for this audit

This audit remains active until every MAJOR DEBT area is migrated to PASS or MINOR DEBT with measurable regression protection.
