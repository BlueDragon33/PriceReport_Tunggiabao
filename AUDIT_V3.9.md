# AUDIT V3.9 — Device Gate chip ownership

## Defect found after V3.8 audit

`device-access-gate.js` owns the visible device status chip whenever remote Device Gate is active. It can show the real KT registry code and states such as approved, pending, blocked or offline.

At the same time, `device-profile.js` runs a 60-second heartbeat that refreshed the same chip from its local classification record. That local record uses a local-unmanaged code and could overwrite the authoritative Device Gate status after the gate had already rendered the managed state.

Impact:
- an approved device could visually revert to a generic local profile label;
- the visible KT code could change from the registry code back to the local classification code;
- user and Application Management troubleshooting could be misled.

## V3.9 fix

- Add `deviceGateOwnsDeviceChip(state)`.
- Treat every active Device Gate state except `classification-only` as authoritative for the shared chip.
- Prevent profile/orientation/heartbeat refreshes from overwriting the chip while Device Gate owns it.
- Preserve current behavior when Device Gate is disabled/classification-only.

## Regression coverage

`scripts/device-profile.test.mjs`
- authorized/pending/blocked/offline/checking => Device Gate owns chip
- classification-only/empty => profile runtime may update chip

`scripts/smoke.mjs`
- ownership helper required
- access-state integration required

## Gate

This branch is stacked on the V3.8 branch. Merge only after CI passes and after V3.8 is accepted.

## CI retarget note

The validation PR targets `main` so the repository's existing `pull_request.branches: [main]` workflow executes the full Webapp CI without merging or publishing.
