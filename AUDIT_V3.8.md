# AUDIT V3.8 — Runtime management readiness sync

## Defect found after V3.7

Production materialization can publish `policy.remoteAdminReady=true` and live readiness values after KT Control health verification. However, `src/device-profile.js` still exposed `window.PriceReportManagement.remoteAdminReady=false` unconditionally.

Impact:
- Application Management or runtime inspectors could see a stale false readiness state even after a valid production rollout.
- The deployed management contract and in-page runtime could disagree.
- Operational tooling could misclassify a fully managed PriceReport client as classification-only.

## V3.8 fix

- Add `resolveRemoteAdminReady(contract)` with fail-closed validation.
- Require the expected application id and live `deviceRegistry`, `deviceGateway`, and `adminApi` readiness before reporting remote admin ready.
- Load `./management-contract.json` with `cache: no-store`.
- Expose `refreshManagementReadiness()` on `window.PriceReportManagement`.
- Publish `pricereport:management-readiness` after each refresh.
- Keep the checked-in source contract rollout-off; production materialization remains the only path that can make the deployed contract ready.
- On fetch/parse/mismatch failure, runtime falls back to `remoteAdminReady=false`.

## Regression coverage

`scripts/device-profile.test.mjs`
- ready contract => true
- rollout-off contract => false
- wrong application id => false
- incomplete backend readiness => false

`scripts/smoke.mjs`
- runtime resolver required
- deployed contract path required
- no-store fetch required
- refresh API and readiness event required
- legacy hard-coded runtime block forbidden

## Gate

Merge only after PR CI passes all existing tests/build/smoke gates.
