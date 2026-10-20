import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {evaluateWorkerdCompatibility} from "../scripts/workerd-compatibility-preflight.mjs";

const VERSION="1.20261012.1",WRANGLER="4.151.1",DATE="2026-09-22";
const valid={
  requiredDate:DATE,expectedWrangler:WRANGLER,expectedWorkerd:VERSION,
  installedWrangler:WRANGLER,installedWorkerd:VERSION,
  installedWindowsBinary:true,windowsNativePackageVersion:VERSION,
  platform:"win32",architecture:"x64",
  binaryOutput:"workerd 2026-10-12",binaryError:null,
};
function evaluate(patch={}){return evaluateWorkerdCompatibility({...valid,...patch});}
const source=readFileSync(new URL("../scripts/real-worker-wrangler-gate-smoke.mjs",import.meta.url),"utf8");
const helper=readFileSync(new URL("../scripts/workerd-compatibility-preflight.mjs",import.meta.url),"utf8");

test("matching pinned Wrangler, workerd and binary permit preflight only, never runtime PASS",()=>{
  const result=evaluate();
  assert.equal(result.status,"PREFLIGHT_COMPATIBLE_NOT_RUNTIME_QA");
  assert.equal(result.realWorkerQaPassed,false);
  assert.equal(result.wranglerStarted,false);
  assert.equal(result.d1Touched,false);
  assert.equal(result.globalD1Quiescence,"BLOCKED");
});
test("observed May workerd binary blocks September compatibility even with matching package metadata",()=>{
  const result=evaluate({binaryOutput:"workerd 2026-05-22"});
  assert.equal(result.status,"BLOCKED_DEPENDENCY_DRIFT");
  assert.ok(result.issues.includes("WORKERD_BINARY_TOO_OLD_FOR_SOURCE_DATE"));
  assert.equal(result.observedBinaryReleaseDate,"2026-05-22");
});
test("installed May workerd package blocks locked October package",()=>{
  const result=evaluate({
    installedWorkerd:"1.20260522.0",
    windowsNativePackageVersion:"1.20260522.0",
    binaryOutput:"workerd 2026-05-22",
  });
  assert.ok(result.issues.includes("WORKERD_LOCK_MISMATCH"));
  assert.ok(result.issues.includes("WORKERD_WINDOWS_BINARY_PACKAGE_MISMATCH"));
});
test("outdated Wrangler even with newer workerd must fail closed",()=>{
  assert.ok(evaluate({installedWrangler:"4.92.0"}).issues.includes("WRANGLER_LOCK_MISMATCH"));
});
test("missing, broken or unreadable native binary cannot claim compatibility",()=>{
  assert.ok(evaluate({installedWindowsBinary:false,binaryError:"ENOENT",binaryOutput:null}).issues.includes("WORKERD_WINDOWS_EXE_MISSING"));
  assert.ok(evaluate({binaryError:"ACCESS_DENIED",binaryOutput:null}).issues.includes("WORKERD_WINDOWS_EXE_VERSION_FAILED"));
  assert.ok(evaluate({binaryOutput:"unknown build"}).issues.includes("WORKERD_BINARY_VERSION_UNREADABLE"));
});
test("invalid compatibility date or unsupported Windows architecture blocks",()=>{
  assert.ok(evaluate({requiredDate:"not-a-date"}).issues.includes("INVALID_SOURCE_COMPATIBILITY_DATE"));
  assert.ok(evaluate({architecture:"arm64"}).issues.includes("UNVERIFIED_WINDOWS_ARCHITECTURE"));
});
test("preflight occurs before generating secrets, temporary DB or starting Wrangler",()=>{
  const preflight=source.indexOf("runWorkerdReadOnlyPreflight(ROOT)");
  const temp=source.indexOf('const storage=await mkdtemp');
  const secret=source.indexOf('const secret= randomBytes');
  const spawn=source.indexOf('child=spawn(process.execPath');
  assert.ok(preflight>=0&&preflight<temp&&preflight<secret&&preflight<spawn);
  assert.match(source,/QA_BLOCKED_WORKERD_COMPAT_PRECHECK/);
  assert.match(source,/process\.exit\(2\)/);
});
test("preflight does not mutate source config, npm packages, D1 or running processes",()=>{
  assert.doesNotMatch(helper,/npm install|npm ci|rm\(|spawn\(.*wrangler|kill\(/);
  assert.match(helper,/readFile\(filename,"utf8"\)/);
  assert.match(helper,/execute\(exe,\["--version"\]/);
  assert.match(helper,/sourceConfigUnchanged:true/);
});

test("external workerd binary override cannot bypass pinned native executable validation",()=>{
  assert.ok(evaluate({binaryOverrideActive:true}).issues.includes("WORKERD_BINARY_OVERRIDE_UNVERIFIED"));
});
