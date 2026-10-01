import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";
const exports = {};
new Function("exports", ts.transpileModule(readFileSync(new URL("../src/pending-device-deletion.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const id = "a".repeat(64);
function registry(status = "pending", beforeDelete) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE devices (device_id TEXT PRIMARY KEY, display_code TEXT, status TEXT); CREATE TABLE business_records (value TEXT); INSERT INTO business_records VALUES ('preserve');");
  sqlite.prepare("INSERT INTO devices VALUES (?, 'XX-123', ?)").run(id, status);
  const db = { prepare(sql) { return { bind(...args) { return { async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async run() { beforeDelete?.(sqlite); return { meta: { changes: sqlite.prepare(sql).run(...args).changes } }; } }; } }; } };
  return { sqlite, db };
}
const payload = { deviceId: id, confirmDeviceCode: "XX-123", expectedStatus: "pending" };
test("deletes the actual pending registration and preserves business data", async () => {
  const { db, sqlite } = registry();
  const result = await exports.deletePendingRegistration(db, "devices", payload);
  assert.equal(result.verifiedStatus, "deleted");
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM devices").get().n, 0);
  assert.equal(sqlite.prepare("SELECT value FROM business_records").get().value, "preserve");
  assert.equal((await exports.deletePendingRegistration(db, "devices", payload)).alreadyAbsent, true);
});
for (const status of ["approved", "blocked"]) test(`cannot delete a ${status} registration`, async () => {
  const { db, sqlite } = registry(status);
  await assert.rejects(exports.deletePendingRegistration(db, "devices", payload), { code: "DEVICE_STATE_CONFLICT" });
  assert.equal(sqlite.prepare("SELECT status FROM devices").get().status, status);
});
test("approval between read and delete is protected atomically", async () => {
  const { db, sqlite } = registry("pending", db => db.exec("UPDATE devices SET status='approved'"));
  await assert.rejects(exports.deletePendingRegistration(db, "devices", payload), { code: "DEVICE_STATE_CONFLICT" });
  assert.equal(sqlite.prepare("SELECT status FROM devices").get().status, "approved");
});
test("requires the pending snapshot and matching confirmation code", async () => {
  const { db, sqlite } = registry();
  await assert.rejects(exports.deletePendingRegistration(db, "devices", { ...payload, expectedStatus: "approved" }), { code: "DEVICE_STATE_CONFLICT" });
  await assert.rejects(exports.deletePendingRegistration(db, "devices", { ...payload, confirmDeviceCode: "WRONG" }), { code: "DEVICE_CODE_MISMATCH" });
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM devices").get().n, 1);
});
