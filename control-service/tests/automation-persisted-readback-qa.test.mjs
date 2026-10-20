import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const qa=readFileSync(new URL("../scripts/real-worker-wrangler-gate-smoke.mjs",import.meta.url),"utf8");
const store=readFileSync(new URL("../src/automation-store.ts",import.meta.url),"utf8");

test("real source Worker QA uses only disposable local D1 and owner credentials",()=>{
  assert.match(qa,/mkdtemp\(join\(tmpdir\(\),"real-wrangler-private-gate-"\)\)/);
  assert.match(qa,/PRICE_REPORT_CONTROL_SERVICE_SECRET/);
  assert.match(qa,/await limitAccess\(storage,varsFile\)/);
  assert.match(qa,/--local/);
  assert.match(qa,/--persist-to/);
  assert.doesNotMatch(qa,/--remote/);
});
test("QA writes all three supported fields with real owner command and expected values",()=>{
  assert.match(qa,/operation:"set-device-automation",commandId/);
  assert.match(qa,/const commandId=randomUUID\(\)/);
  assert.match(qa,/autoApproveDevices:!before\.autoApproveDevices/);
  assert.match(qa,/autoBlockPendingDevices:!before\.autoBlockPendingDevices/);
  assert.match(qa,/pendingBlockAfterHours:before\.pendingBlockAfterHours===24\?168:24/);
  assert.match(qa,/assert\.equal\(response\.revision,before\.revision\+1\)/);
});
test("independent HTTP GET after POST is mandatory",()=>{
  assert.match(qa,/const observed=await fetch\(publicUrl\+"\/api\/control\/automation"/);
  assert.match(qa,/assert\.equal\(observed\.status,200\)/);
  assert.match(qa,/for\(const field of Object\.keys\(desired\)\)assert\.equal\(independent\[field\],desired\[field\]\)/);
});
test("disposable Worker exit then separate D1 CLI proves stored values and revision",()=>{
  assert.match(qa,/const termination=new Promise/);
  assert.match(qa,/await termination;/);
  assert.match(qa,/const lookup=await exec\(process\.execPath/);
  assert.ok(qa.indexOf("await termination;") < qa.indexOf("const lookup=await exec"));
  assert.match(qa,/SELECT auto_approve_devices, auto_block_pending_devices, pending_block_after_hours, revision FROM kt_automation_policy/);
  assert.match(qa,/assert\.equal\(row\?\.revision,independent\.revision\)/);
});
test("QA teardown never claims global quiescence or Production approval",()=>{
  assert.match(qa,/Disposable QA-only child; NOT native graceful CLI ACK/);
  assert.match(qa,/globalD1Drain:"BLOCKED"/);
  assert.match(qa,/gracefulWindowsExit:"BLOCKED"/);
  assert.match(qa,/userD1Touched:false/);
});
test("owning PriceReport production code uses revision CAS and SQL readback",()=>{
  assert.match(store,/UPDATE kt_automation_policy/);
  assert.match(store,/WHERE id=1 AND revision=\?/);
  assert.match(store,/Number\(mutation\.meta\.changes \?\? 0\) !== 1/);
  assert.match(store,/const updated = await readPriceReportAutomationPolicy\(database\)/);
  assert.match(store,/AUTOMATION_READBACK_MISMATCH/);
});

test("disposable D1 is preserved if child exit cannot be confirmed",()=>{
  assert.match(qa,/const qaProcessExited=!child\|\|child\.exitCode!==null\|\|child\.signalCode!==null/);
  assert.match(qa,/qaCleanupVerified=qaProcessExited&&descendantsExited&&portsReleased/);
  assert.match(qa,/if\(qaCleanupVerified\)\{/);
  assert.match(qa,/QA_STORAGE_PRESERVED_SHUTDOWN_UNVERIFIED/);
});

test("QA proves idempotent retry and rejects a stale expected state",()=>{
  assert.match(qa,/const replay=await fetch\(publicUrl\+"\/api\/control\/automation"/);
  assert.match(qa,/assert\.equal\(\(await replay\.json\(\)\)\.replayed,true\)/);
  assert.match(qa,/const stale=await fetch/);
  assert.match(qa,/assert\.equal\(stale\.status,409\)/);
  assert.match(qa,/assert\.equal\(afterConflict\.revision,independent\.revision\)/);
});

test("Windows cleanup needs two descendant snapshots plus both localhost port releases",()=>{
  assert.match(qa,/descendantsBeforeStop=descendantsOf\(await windowsProcesses\(\),child\.pid\)/);
  assert.match(qa,/const one=await windowsProcesses\(\);processSnapshotsChecked\+\+/);
  assert.match(qa,/const two=await windowsProcesses\(\);processSnapshotsChecked\+\+/);
  assert.match(qa,/const portsReleased=await portReleased\(backend\)&&await portReleased\(frontWanted\)/);
  assert.match(qa,/globalD1Drain:"BLOCKED",nativeCliGracefulAck:false/);
});

test("PASS receipt cannot appear before Windows disposable QA cleanup proof",()=>{
  assert.match(qa,/verifiedProductReceipt=\{result:"SOURCE_WORKER_PRIVATE_DOTENV_GATE_PASS"/);
  assert.match(qa,/if\(qaCleanupVerified\)\{[\s\S]*?if\(verifiedProductReceipt\) \{[\s\S]*?console\.log\(JSON\.stringify/);
  assert.doesNotMatch(qa,/console\.log\(JSON\.stringify\(\{result:"SOURCE_WORKER_PRIVATE_DOTENV_GATE_PASS"/);
  assert.match(qa,/descendantProcessTreeScope:"captured PID descendants only; not global isolate census"/);
  assert.match(qa,/descendantsExited=Boolean\(!child\|\|descendantsBeforeStop!==null\)/);
});

test("source smoke checks pinned installed workerd before temporary D1 or Worker starts",()=>{
  assert.match(qa,/runWorkerdReadOnlyPreflight\(ROOT\)/);
  assert.match(qa,/QA_BLOCKED_WORKERD_COMPAT_PRECHECK/);
  assert.ok(qa.indexOf("runWorkerdReadOnlyPreflight(ROOT)") <
    qa.indexOf('const storage=await mkdtemp'));
  assert.match(qa,/process\.exit\(2\)/);
});
