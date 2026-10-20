import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const script=readFileSync(new URL("../scripts/prepare-isolated-windows-qa.ps1",import.meta.url),"utf8");

test("dependencies install only inside detached price-p0 QA worktree",()=>{
  assert.match(script,/branch --show-current/);
  assert.match(script,/BLOCKED_QA_NOT_DETACHED/);
  assert.match(script,/E:\\BaumanWeb\\_qa\\price-p0-\*/);
  assert.match(script,/BLOCKED_SHARED_NODE_MODULES_JUNCTION/);
  assert.match(script,/BLOCKED_EXISTING_QA_DEPENDENCIES_DO_NOT_OVERWRITE/);
  assert.match(script,/Push-Location \$control/);
  assert.match(script,/& npm\.cmd @npmArgs/);
});
test("uses npm ci and lockfile pin, never edits Production source configuration",()=>{
  assert.match(script,/package-lock\.json/);
  assert.match(script,/\$lockedWrangler -ne '4\.151\.1'/);
  assert.match(script,/\$lockedWorkerd -ne '1\.20261012\.1'/);
  assert.match(script,/compatibility_date -ne '2026-09-22'/);
  assert.match(script,/@\('ci', '--no-audit', '--no-fund'/);
  assert.doesNotMatch(script,/npm (?:update|install) |set-content .*wrangler|git checkout|git merge|git reset/mi);
});
test("network package downloads require explicit AllowPackageDownloads flag",()=>{
  assert.match(script,/\[switch\]\$AllowPackageDownloads/);
  assert.match(script,/if \(\$AllowPackageDownloads\)/);
  assert.match(script,/\$npmArgs \+= '--offline'/);
  assert.match(script,/\$npmArgs \+= '--prefer-offline'/);
});
test("fail-closed startup checks stale QA, locked binary, regression before Worker D1 pilot",()=>{
  const a=script.indexOf("BLOCKED_STALE_QA_RUNTIME");
  const b=script.indexOf("& npm.cmd @npmArgs");
  const c=script.indexOf("& node scripts/workerd-compatibility-preflight.mjs");
  const d=script.indexOf("& node --test");
  const e=script.indexOf("& node scripts/real-worker-wrangler-gate-smoke.mjs");
  assert.ok(a>0 && a<b && b<c && c<d && d<e);
  assert.match(script,/\[switch\]\$RunWorkerPilot/);
  assert.match(script,/if \(\$RunWorkerPilot\)/);
  assert.match(script,/BLOCKED_QA_WORKERD_PREFLIGHT/);
});
test("cannot silently kill processes or delete old retained D1; primary checkout remains untouched",()=>{
  assert.match(script,/Get-CimInstance Win32_Process/);
  assert.match(script,/QA_ISOLATED_DEPENDENCIES_READY/);
  assert.doesNotMatch(script,/(?:Stop-Process|Remove-Item|taskkill|git clean|git stash|git checkout|wrangler deploy|--remote)/i);
});
