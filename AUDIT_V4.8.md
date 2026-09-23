# AUDIT V4.8 — Device & System Center

## Goal
Add a real device/system workspace without inventing remote-management state.

## V4.8 changes
- Add a full-width Device & System workspace.
- Show current device classification and UI profile from the existing client runtime.
- Keep the local classification code separate from the Device Gate registry code.
- Show live Device Gate states published by the existing runtime:
  - classification-only
  - checking
  - pending
  - authorized
  - blocked
  - offline
- Show Application Management readiness and Remote Admin readiness from the loaded management contract.
- Show Control Plane readiness for registry, gateway, admin API and audit API.
- Show data-boundary policy:
  - local-first
  - quotation data excluded from Control Plane
  - customer data excluded from Control Plane
  - private key remains on device
- Add a runtime refresh action and current-device-code copy action.
- Add direct navigation from the Dashboard system card.

## Security
- The workspace never stores or renders the P-256 private key.
- Device Gate events are sanitized to state, deviceCode, lastKnownStatus and message only.
- No remote device list is fabricated when the backend is not production-ready.
- Device administration remains the responsibility of Application Management.

## Regression coverage
- System workspace enters application mode.
- Local device code is present.
- Synthetic Device Gate state events update the live UI.
- Registry code is distinct from local classification code.
- Returning to classification-only restores the expected state.
- Smoke gates require data-boundary indicators, event wiring and system renderer.

## Version
- App: 4.8.0
- Service worker cache: pricereport-shell-v36-system-center
