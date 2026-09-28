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

Completed additionally in V6.28:
- shared Search surface, border, radius, icon, placeholder and result-hover contract;
- Dashboard, History, master-data, Studio command/content/template/product searches and Content Workspace customer search consume the shared Search contract;
- Toast now supports whitelisted Neutral / Info / Success / Warning / Danger semantic tones while remaining backward compatible;
- existing Preview Customizer is formally governed as the Drawer primitive instead of introducing a duplicate component;
- automated Search/feedback/Drawer regression gate added.

Remaining:
- migrate critical error flows away from ephemeral toast where persistent error UX is required;
- deprecate/remove historical variants only after usages are migrated.

U3 component foundation is now complete enough to move primary effort to U4 Responsive Consolidation while continuing opportunistic component cleanup.

Method remains:
mark old variants deprecated → migrate usages → test → remove obsolete selectors.

### Phase U4 — Responsive consolidation
**Status: started in V6.29**

V6.29:
- retired 11 proven-redundant `!important` declarations from the later V6.10 responsive layer;
- reduced `responsive-v610.css` from 478 to 451 lines and 156 to 145 `!important`;
- added a guard preventing the later responsive layer from repeating an identical property/value already owned by V6.9;
- expanded real-browser Constitution coverage with 1366×768, 1280×800 and 360×800 in addition to the existing desktop/tablet/390px coverage;
- no layout behavior was intentionally changed in this first cleanup slice.

V6.30:
- retired the remaining six legacy responsive font-size declarations below 10px that V6.10 already superseded with readable values or intentionally hidden metadata;
- reduced `responsive-v69.css` from 305 to 300 `!important` and 1018 to 1012 lines;
- added a regression rule: responsive layers may not introduce sub-10px text;
- no intended computed typography regression because the later V6.10 readable values remain the active ownership.

V6.31:
- retired obsolete phone Product Workspace toolbar grid/spacer/button declarations from V6.9 after V6.10 became the sole touch toolbar owner;
- reduced `responsive-v69.css` from 300 to 292 `!important` and 1012 to 1002 lines;
- preserved the only unsuperseded legacy declaration (`height:auto`) to avoid behavior drift;
- added a regression ceiling so V6.9 responsive debt cannot silently increase;
- no intended computed UI change because V6.10 already supplied the active touch toolbar layout.

V6.32:
- retired additional V6.9 phone declarations already superseded by V6.10 in the same `max-width:599px` context;
- cleanup covers topbar metadata, More sheet positioning, flow/footer sizing and template-card sizing;
- retained unsuperseded properties such as overflow, border radius, width/display/gap and review action spacing;
- reduced `responsive-v69.css` from 292 to 279 `!important` and 1002 to 972 lines;
- added regression guards for retired values and their current V6.10 owners;
- no intended computed UI change; browser viewport gates remain authoritative.

V6.33:
- used media-context-aware ownership analysis to identify declarations where V6.9 and V6.10 own the exact same selector/property inside `max-width:599px`;
- removed 20 V6.9 declarations only when every selector in the grouped rule had a current V6.10 owner;
- reduced `responsive-v69.css` from 279 to 269 `!important` and 972 to 952 lines;
- current V6.10 values remain unchanged, so this is ownership retirement rather than visual redesign;
- strengthened regression guards around phone navigation, content/product workspace rows and retired legacy values.

V6.34:
- removed 12 empty legacy phone rules left behind by prior ownership retirement;
- reduced `responsive-v69.css` from 952 to 933 lines without changing any declaration or computed style;
- added a regression rule preventing empty responsive selectors from accumulating again.

V6.35:
- retired the V6.9 phone-specific width/min-width/height/font-size rule for `.studio-topbar-doc` because V6.10 is the active ≤599px owner and hides that element completely;
- reduced `responsive-v69.css` from 933 to 927 lines with no intended rendered change;
- added ownership guards tying the retirement to the current V6.10 hide rule.

V6.36:
- retired 15 low-risk `!important` flags from the V6.10 phone layer while preserving every selector and value;
- scope is limited to typography/spacing properties where prior CSS has no important owner for the same component surface;
- reduced `responsive-v610.css` from 145 to 130 `!important`;
- 360×800 and 390×844 browser gates remain authoritative for computed behavior.

V6.37:
- retired 13 additional low-risk `!important` flags from touch/tablet spacing, min-size and radius rules while preserving all selectors and values;
- reduced `responsive-v610.css` from 130 to 117 `!important`;
- tablet portrait/compact landscape and wide landscape declarations now rely on normal cascade where no prior important owner exists;
- 834×1194, 1024×768 and 1112×834 browser coverage remains authoritative.

V6.38:
- retired 8 additional low-risk `!important` flags from touch Content/Quote card surfaces, borders, hover surface and workspace shadow resets while preserving every selector and value;
- reduced `responsive-v610.css` from 117 to 109 `!important`;
- added regression assertions that these surface declarations remain non-important;
- no V6.9 competing owner exists for the migrated properties, so normal cascade now owns them;
- browser viewport gates remain authoritative for tablet/phone computed behavior.

V6.39:
- retired 8 additional `!important` flags from the touch Product Workspace action rail: display, alignment, overflow, button flex/width/white-space and spacer visibility;
- reduced `responsive-v610.css` from 109 to 101 `!important`;
- preserved the separate V6.9 phone `height:auto!important` owner because it is not yet superseded;
- added regression assertions for the new normal-cascade ownership;
- browser phone/tablet gates remain authoritative.

V6.40:
- moved phone bottom-navigation ownership from layered `!important` overrides to normal cascade where selector specificity and load order are sufficient;
- V6.9 touch baseline keeps normal `min-height:0`, `border-radius:10px` and phone safe-area padding;
- V6.10 phone refinement keeps normal gap, top padding, 52px touch height, 12px radius, 10px label text and 18px glyph size;
- reduced `responsive-v69.css` from 269 to 266 `!important` and `responsive-v610.css` from 101 to 95;
- added regression guards for both baseline and refinement ownership;
- 360×800 and 390×844 browser gates remain authoritative.

V6.41:
- retired 6 phone Content Home `!important` flags for section padding, completion/flow card padding, content-list gap and content-row min-height/padding;
- reduced `responsive-v610.css` from 95 to 89 `!important`;
- V6.9 now supplies only normal baseline values, while the later V6.10 phone selectors own refinements through normal cascade;
- added regression assertions that these declarations remain present and non-important;
- phone browser gates at 360×800 and 390×844 remain authoritative.

V6.42:
- retired all 9 `!important` flags from the phone template sample rail while preserving flex rail layout, scroll behavior, card width and minimum height;
- reduced `responsive-v610.css` from 89 to 80 `!important`;
- base Studio template grid remains normal grid ownership, while the later phone selector switches it to the horizontal rail through specificity/load order;
- added regression assertions for every migrated rail property;
- 360×800 and 390×844 browser gates remain authoritative.

V6.43:
- retired 6 additional `!important` flags from low-risk touch chrome ownership while preserving selectors and values;
- scope: touch Content Library background, Content Workspace width-control visibility, phone Studio document visibility, phone topbar horizontal padding and topbar-context gap;
- reduced `responsive-v610.css` from 80 to 74 `!important`;
- added regression assertions so these properties remain on normal cascade;
- no report/business/storage changes; real phone/tablet browser gates remain authoritative.

V6.44:
- retired 8 additional `!important` flags from phone Content Workspace header/chrome while preserving selectors and values;
- scope: workspace icon geometry, heading typography, toolbar padding and toolbar helper visibility;
- reduced `responsive-v610.css` from 74 to 66 `!important`;
- added regression assertions so these properties remain on normal cascade;
- no report/business/storage changes; phone browser gates remain authoritative.

V6.45:
- retired 5 additional low-risk `!important` flags from phone workspace spacing while preserving selectors and values;
- scope: content/product workspace body padding+gap, main padding+radius, and content row spacing;
- reduced `responsive-v610.css` from 66 to 61 `!important`;
- intentionally left card/heading flags untouched because their current base owners still use `!important`;
- added regression assertions so the migrated spacing stays on normal cascade.

V6.46:
- retired 9 low-risk `!important` flags from phone Quote Flow step spacing, button geometry, marker geometry and line-height/review typography;
- preserved the Quote Flow navigator/card layout declarations that still override an important V6.9 owner;
- preserved the review-button min-height flag because V6.9 still owns a competing `min-height:40px!important`;
- browser regression proved the 10px step-label font must remain important because the base workspace still owns 9.5px with `!important`; that flag was restored rather than weakening the visual gate;
- reduced `responsive-v610.css` from 61 to 52 `!important`;
- added exact ownership assertions so the migrated declarations cannot return to important cascade.

Remaining target:
- continue merging duplicated responsive ownership;
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
