# V5.7 Reference Fidelity UI/UX — Audit

Date: 2026-09-24

## Objective

V5.7 corrects the remaining mismatch between the current PriceReport Studio and the user-supplied reference screenshot. V5.6 established readable typography and a 118px navigation language, but the Studio still placed the Design panel before the preview and used light tool surfaces that did not match the reference composition.

This pass is intentionally visual-first. Business logic is frozen unless a UI regression requires a compatibility fix.

## Reference findings

The supplied screenshot establishes these dominant visual relationships:

- narrow dark application rail on the far left;
- dark content/editor column immediately after the rail;
- A4 document preview as the largest center region;
- dark Design inspector on the far right;
- a dark top toolbar visually connecting the Studio tool surfaces;
- bright A4 sheet separated by a blue-gray preview canvas;
- large, readable editor blocks instead of a dense collection of tiny controls.

No new image asset is needed. The screenshot is translated into CSS geometry and component treatment.

## Pass 1 — Structural fidelity

Implemented on `feature/v5-7-reference-fidelity`:

- moved the active UI scope from `reference-ui-v56` to `reference-ui-v57`;
- changed desktop geometry from 118 / 350 / 315 / preview to 118 / 320 / flexible preview / 368;
- used explicit CSS grid placement so the existing DOM can remain stable while Preview appears before Design;
- changed collapse geometry to preserve the central preview and right inspector;
- added a V5.7 Wide Preview override so wide mode still becomes 118px rail + flexible preview;
- converted Editor and Design surfaces to a coordinated dark-navy chrome;
- converted the preview toolbar to the same dark chrome;
- changed preview canvas to a blue-gray neutral distinct from the white A4;
- kept the strongest blue emphasis on primary actions, especially PDF;
- moved the Design collapse handle to its inner edge next to Preview;
- converted the existing Studio stepper into a vertical content-block navigator;
- removed workflow-step duplication from the Studio application rail;
- retained the existing light management-workspace visual system for Dashboard, History, Data, Publishing, Settings and System;
- added the reference inspector's Design / Content / Check tabs without creating duplicate editors: Content routes into existing Studio steps and Check reuses the existing document-health / preflight engine;
- added a 68px Studio-wide command bar above Editor / Preview / Inspector, synchronized to current quote identity and document health, with Save / Preview / PDF actions forwarding to the existing engines.

## Release alignment

- body scope: `reference-ui-v57`;
- package: `5.7.0`;
- Service Worker cache: `pricereport-shell-v57-reference-fidelity`;
- bounded stylesheet recovery key: `tgb-style-recovery-v3`.

## Guard changes

The V5 UI guard now checks:

- V5.7 body scope;
- 118 / 320 / 368 geometry tokens;
- exact desktop grid order with flexible preview in the middle;
- explicit Preview column 3 / Design column 4 placement;
- dark Studio chrome and separated preview canvas;
- workflow-step hiding in the Studio application rail;
- existing no-`!important`, report-isolation, root-cascade and responsive-layer constraints.

Smoke checks are aligned to the V5.7 scope, cache generation and recovery key.

## Remaining gate

Do not merge because the design looks plausible. The branch must pass the full exact-head CI suite and production build. Any UI guard, DOM test, smoke test or build failure must be fixed on this branch, then CI must be re-run on the new exact head.

After merge, confirm the GitHub Pages workflow succeeds before considering V5.7 published.
