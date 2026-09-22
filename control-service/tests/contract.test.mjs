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

test("D1 owns KT registry challenge session command and audit tables", async () => {
  const migration = await source("../migrations/0001_device_control.sql");
  for (const table of ["kt_devices","kt_device_challenges","kt_device_sessions","kt_control_commands","kt_audit_log"]) {
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
  assert.match(worker, /p256ChallengeProof: ready && appOriginReady/);
  assert.match(worker, /deviceRegistry: \{ owner: "PriceReport_Tunggiabao", namespace: "KT-" \}/);
});

test("local worker config uses an isolated D1 binding", async () => {
  const config = JSON.parse(await source("../wrangler.local.jsonc"));
  assert.equal(config.name, "price-report-control-local");
  assert.equal(config.main, "src/index.ts");
  assert.equal(config.d1_databases?.[0]?.binding, "DB");
  assert.equal(config.d1_databases?.[0]?.migrations_dir, "migrations");
});
