import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const script=readFileSync(new URL("../scripts/prepare-isolated-windows-qa.ps1",import.meta.url),"utf8");

test("dependencies install only inside detached price-p0 QA worktree",()=>{
  assert.match(script,/branch --show-current/);
  assert.match(script,/BLOCKED_QA_NOT_DETACHED/);
  assert.match(script,/E:\\BaumanWeb\\_qa\\price-p0-\*/);
  assert.match(script,/BLOCKED_SHARED_NODE_MODULES_JUNCTION/);
  assert.match(script,/QA_DEPENDENCIES_REUSED_VERIFIED/);
  assert.match(script,/QA_OLD_DEPENDENCIES_PRESERVED/);
  assert.match(script,/BLOCKED_QA_MODULES_NOT_DIRECTORY/);
  assert.match(script,/BLOCKED_QA_DEPENDENCIES_QUARANTINE_FAILED/);
  assert.match(script,/Push-Location \$control/);
  assert.match(script,/& npm\.cmd @npmArgs/);
});
test("uses npm ci and lockfile pin, never edits Production source configuration",()=>{
  assert.match(script,/package-lock\.json/);
  assert.match(script,/\$lockedWrangler -ne '4\.151\.1'/);
  assert.match(script,/\$lockedWorkerd -ne '1\.20261012\.1'/);
  assert.match(script,/\$lockedCompatibilityDate -ne '2026-09-22'/);
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
  const c=script.lastIndexOf("& node scripts/workerd-compatibility-preflight.mjs");
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

test("existing QA deps are reused only after native workerd compatibility succeeds",()=>{
  assert.match(script,/\$reuseQaDependencies = \$false/);
  assert.match(script,/\$existingPreflight = \$LASTEXITCODE/);
  assert.match(script,/if \(\$existingPreflight -eq 0\)/);
  assert.match(script,/\$reuseQaDependencies = \$true/);
  assert.match(script,/if \(-not \$reuseQaDependencies\) \{/);
});
test("stale QA deps are moved under QA quarantine, never deleted or overwritten",()=>{
  assert.match(script,/Join-Path \$qa '_dependency_quarantine'/);
  assert.match(script,/Move-Item -LiteralPath \$modules -Destination \$quarantine -ErrorAction Stop/);
  assert.match(script,/if \(Test-Path -LiteralPath \$quarantine\)/);
  assert.match(script,/\$existing\.Attributes -band \[IO\.FileAttributes\]::ReparsePoint/);
  assert.doesNotMatch(script,/Remove-Item|del\s+.*node_modules|rmdir\s+.*node_modules/mi);
});
test("stale runtime check precedes any QA dependency relocation or npm ci",()=>{
  const runtime=script.indexOf("BLOCKED_STALE_QA_RUNTIME");
  const quarantine=script.indexOf("Move-Item -LiteralPath $modules");
  const ci=script.indexOf("& npm.cmd @npmArgs");
  assert.ok(runtime>=0&&runtime<quarantine&&quarantine<ci);
});
