# 2026-10-20 — PriceReport owning-client policy persistence receipt

Blueprint OS 1.3.0. Evidence: Windows console output supplied by the operator; not an independent CI/remote re-execution. Scope: disposable Windows QA Worker, local D1 only. Candidate worktree checkout verified previously at SHA 557bc9b27d2c7fffbfc5ecaa087b2ed18f78c0a1.

## Recorded operator output
- tests: 20 total, 20 pass, 0 fail; NEW_REGRESSION_EXIT: 0
- result: SOURCE_WORKER_PRIVATE_DOTENV_GATE_PASS
- WORKER_D1_PILOT_EXIT: 0; QA_RECOVERY_EXIT: 0
- QA_ISOLATED_DEPENDENCIES_READY
- platform: win32; database: price-report-control-local-db
- realD1Health: true; realWorkerContract: true
- directBackend403: true; proxy200: true; shutdownPreflight503: true
- realSourceWorkerAutomationWrite: true; independentPolicyGet: true
- replayIdempotencyChecked: true; staleRevisionRejected: true
- persistedAutomationAfterWorkerExit: true
- checkedFields: autoApproveDevices, autoBlockPendingDevices, pendingBlockAfterHours, revision
- qaPortsReleased: true; capturedDescendantsExited: true; processSnapshotsChecked: 2
- secretInArgv: false; secretInProcessEnv: false; secretFileACLProtected: true
- userD1Touched: false; globalD1Drain: BLOCKED; gracefulWindowsExit: BLOCKED

## Scope qualification

PASS for the isolated PriceReport owning-client control service: authenticated write, independent HTTP GET, revision CAS, replay idempotency, and a separate local D1 CLI persisted-state read after disposable Worker process exit. The source QA also checked that its selected ports were released and captured descendant PIDs had exited.

NOT VERIFIED: Application-Management catalog + credential connection to this Worker, UI after reload, Production auth/2FA, the actual deployed PriceReport, a global process/isolate census, native Wrangler CLI graceful shutdown ACK, or global D1 quiescence. PR #133 remains Draft and unmerged; CI remains PENDING; 10/10 D1 local-ops adapters remain BLOCKED (0 READY).

## Root-cause recovery history

Earlier Windows QA attempts were blocked by legacy installed dependencies (Wrangler 4.92.0, workerd 1.20260515.1), incompatible with locked Wrangler 4.151.1/workerd 1.20261012.1 and compatibility date 2026-09-22. Subsequent issues involved Windows PowerShell 5.1 npm lockfile parsing and existing QA node_modules. Both were addressed on the isolated candidate. Retained old QA D1 data should not be deleted without separate process proof.

## Exactly one next product gate

Test Application-Management → PriceReport Universal Contract with an authorized disposable catalog/credential and independent owning-client GET, including the reopening/readback experience. Do not rerun the already passed standalone PriceReport D1 pilot at unchanged SHA, and do not use GitHub-hosted Actions, merge, ratify, publish or modify Production.
