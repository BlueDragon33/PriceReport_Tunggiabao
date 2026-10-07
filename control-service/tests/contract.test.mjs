import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("PriceReport control service is app-scoped and signed", async () => {
  const worker = await source("../src/index.ts");
  assert.match(worker, /PRICE_REPORT_CONTROL_SERVICE_SECRET/);
  assert.match(worker, /TOKEN_ISSUER = "application-management"/);
  assert.match(worker, /TOKEN_AUDIENCE = "price-report-control"/);
  assert.match(worker, /TOKEN_APP = "price-report-tunggiabao"/);
  assert.match(worker, /HMAC/);
});

test("KT device gateway uses P-256 proof and revocable sessions", async () => {
  const worker = await source("../src/index.ts");
  const store = await source("../src/device-store.ts");
  assert.match(worker, /\/api\/device\/register/);
  assert.match(worker, /\/api\/device\/challenge/);
  assert.match(worker, /\/api\/device\/verify/);
  assert.match(worker, /\/api\/device\/heartbeat/);
  assert.match(store, /price-report-device:v1:\$\{deviceId\}:\$\{challengeId\}:\$\{challenge\.challenge\}/);
  assert.match(store, /crypto\.subtle\.verify/);
  assert.match(store, /sessionToken = `kt1\.\$\{randomToken\(32\)\}`/);
  assert.match(store, /DEVICE_PENDING/);
  assert.match(store, /DEVICE_BLOCKED/);
});

test("private key never enters PriceReport control storage", async () => {
  const migration = await source("../migrations/0001_device_control.sql");
  const store = await source("../src/device-store.ts");
  assert.match(migration, /public_jwk_json TEXT NOT NULL/);
  assert.doesNotMatch(migration, /private[_ ]?(key|jwk)/i);
  assert.doesNotMatch(store, /privateKey|private_jwk|privateJwk/);
});

test("block preserves KT registry and revokes sessions", async () => {
  const store = await source("../src/device-store.ts");
  assert.match(store, /SET status='blocked', edit_enabled=0/);
  assert.match(store, /revokeDeviceSessions/);
  assert.match(store, /state='revoked'/);
  assert.match(store, /registryPreserved: true/);
  assert.doesNotMatch(store, /DELETE FROM kt_devices/);
});

test("KT command ledger is idempotent and compare-and-set protected", async () => {
  const store = await source("../src/device-store.ts");
  assert.match(store, /commandId/);
  assert.match(store, /expectedStatus/);
  assert.match(store, /COMMAND_ID_PAYLOAD_MISMATCH/);
  assert.match(store, /COMMAND_IN_PROGRESS/);
  assert.match(store, /COMMAND_REQUIRES_RECONCILIATION/);
  assert.match(store, /WHERE device_id=\? AND status=\?/);
  assert.match(store, /replayed: true/);
});

test("D1 owns KT registry, automation, command and audit tables", async () => {
  const migration = (await source("../migrations/0001_device_control.sql")) + "\n" + (await source("../migrations/0002_automation_policy.sql"));
  for (const table of [
    "kt_devices",
    "kt_device_challenges",
    "kt_device_sessions",
    "kt_control_commands",
    "kt_automation_policy",
    "kt_automation_commands",
    "kt_audit_log",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});

test("control status only advertises live capabilities when D1/app origin are ready", async () => {
  const worker = await source("../src/index.ts");
  assert.match(worker, /CONTROL_PROTOCOL = "price-report-control-v1"/);
  assert.match(worker, /deviceRegistry: ready/);
  assert.match(worker, /deviceApproval: ready/);
  assert.match(worker, /deviceIdempotentCommands: ready/);
  assert.match(worker, /optimisticConcurrency: ready/);
  assert.match(worker, /deviceAutoApproval: ready/);
  assert.match(worker, /deviceAutoBlockPending: ready/);
  assert.match(worker, /automationIdempotentCommands: ready/);
  assert.match(worker, /automationOptimisticConcurrency: ready/);
  assert.match(worker, /automation: "\/api\/control\/automation"/);
  assert.match(worker, /p256ChallengeProof: ready && appOriginReady/);
  assert.match(worker, /deviceRegistry: \{ owner: "PriceReport_Tunggiabao", namespace: "KT-" \}/);
  assert.match(worker, /applicationManagementOriginConfigured/);
});

test("local worker config uses an isolated D1 binding", async () => {
  const config = JSON.parse(await source("../wrangler.local.jsonc"));
  assert.equal(config.name, "price-report-control-local");
  assert.equal(config.main, "src/index.ts");
  assert.equal(config.d1_databases?.[0]?.binding, "DB");
  assert.equal(config.d1_databases?.[0]?.migrations_dir, "migrations");
});


test("KT automation policy is client-owned, idempotent and compare-and-set protected", async () => {
  const worker = await source("../src/index.ts");
  const automation = await source("../src/automation-store.ts");
  assert.match(worker, /GET" && url\.pathname === "\/api\/control\/automation"/);
  assert.match(worker, /POST" && url\.pathname === "\/api\/control\/automation"/);
  assert.match(automation, /operation !== "set-device-automation"/);
  assert.match(automation, /AUTOMATION_STATE_CONFLICT/);
  assert.match(automation, /COMMAND_ID_PAYLOAD_MISMATCH/);
  assert.match(automation, /COMMAND_IN_PROGRESS/);
  assert.match(automation, /WHERE id=1 AND revision=\?/);
  assert.match(automation, /AUTOMATION_READBACK_MISMATCH/);
  assert.match(automation, /replayed: true/);
});

test("KT automation is behavior, not metadata only", async () => {
  const worker = await source("../src/index.ts");
  const devices = await source("../src/device-store.ts");
  const automation = await source("../src/automation-store.ts");
  assert.match(worker, /enforcePriceReportAutomation\(database\)/);
  assert.match(worker, /autoApprove: automation\.autoApproveDevices/);
  assert.match(devices, /initialStatus: PriceReportDeviceStatus = options\.autoApprove \? "approved" : "pending"/);
  assert.match(devices, /device_auto_approved/);
  assert.match(automation, /pending_device_auto_blocked/);
  assert.match(automation, /unixepoch\(created_at\)/);
  assert.match(automation, /status='blocked'/);
});


test("PriceReport publishes a first-class Universal Management Contract without credential", async () => {
  const worker = await source("../src/index.ts");
  assert.match(worker, /schema: "application-management\.contract\/v1"/);
  assert.match(worker, /url\.pathname === "\/api\/application-management\/contract"/);
  assert.match(worker, /deviceAutoApproval: true/);
  assert.match(worker, /deviceAutoBlockPending: true/);
  assert.match(worker, /automationIdempotentCommands: true/);
  assert.match(worker, /automationOptimisticConcurrency: true/);
  assert.match(worker, /automation: "\/api\/control\/automation"/);
  assert.match(worker, /credentialRequired: true/);
  const fetchStart = worker.indexOf("export default {");
  const fetchBlock = worker.slice(fetchStart);
  const routeIndex = fetchBlock.indexOf('url.pathname === "/api/application-management/contract"');
  const controlIndex = fetchBlock.lastIndexOf('url.pathname.startsWith("/api/control/")');
  assert.ok(fetchStart >= 0 && routeIndex >= 0 && controlIndex > routeIndex, "Universal contract must be reachable before protected control routing");
});


test("automation idempotency ledger is checked before optimistic-concurrency state", async () => {
  const automation = await source("../src/automation-store.ts");
  const priorIndex = automation.indexOf("const prior = await commandRow(database, commandId)");
  const currentIndex = automation.indexOf("const current = await readPriceReportAutomationPolicy(database)", priorIndex);
  const conflictIndex = automation.indexOf("if (!expectedMatches(current, expected, desired))", priorIndex);
  assert.ok(priorIndex >= 0 && currentIndex > priorIndex && conflictIndex > priorIndex);
  assert.match(automation.slice(priorIndex, currentIndex), /replayed: true/);
});
