# PriceReport Blueprint OS 1.3.0 — isolated exact-SHA Windows dependency recovery
# Run only from a newly created detached QA worktree. No admin privileges.
param(
  [switch]$AllowPackageDownloads,
  [switch]$RunWorkerPilot
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$control = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$qa = (Resolve-Path -LiteralPath (Join-Path $control '..')).Path
$head = (& git -C $qa rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED_QA_GIT_HEAD' }
[string]$branchOutput = & git -C $qa branch --show-current
$branch = $branchOutput.Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne '') { throw 'BLOCKED_QA_NOT_DETACHED' }

# PowerShell 5.1's native JSON conversion rejects valid npm package-lock.json
# because lock.packages contains an empty-string root key. Let Node parse JSON.
$metadataScript = Join-Path $control 'scripts\read-qa-lock-metadata.mjs'
$metadata = @(& node $metadataScript $control)
if ($LASTEXITCODE -ne 0 -or $metadata.Count -ne 4) {
  throw 'BLOCKED_QA_LOCKFILE_METADATA_READ'
}
$lockedWrangler = $metadata[0]
$lockedWorkerd = $metadata[1]
$lockedNative = $metadata[2]
$lockedCompatibilityDate = $metadata[3]
if ($lockedWrangler -ne '4.151.1' -or $lockedWorkerd -ne '1.20261012.1' -or
    $lockedNative -ne $lockedWorkerd) {
  throw 'BLOCKED_LOCKED_VERSIONS_UNEXPECTED'
}
if ($lockedCompatibilityDate -ne '2026-09-22') {
  throw 'BLOCKED_CONFIG_COMPATIBILITY_DATE_CHANGED'
}

if ($qa -notlike 'E:\BaumanWeb\_qa\price-p0-*') {
  throw 'BLOCKED_QA_WORKTREE_LOCATION'
}
# Do not start any Worker while an earlier disposable QA Node/workerd process
# might still be alive. No process kill and no cleanup of retained evidence.
$stale = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match '^(node|workerd)(\.exe)?$' -and
  $_.CommandLine -match '(?i)(real-wrangler-private-gate-|price-p0-)'
})
if ($stale.Count -gt 0) {
  Write-Host 'BLOCKED_STALE_QA_RUNTIME' -ForegroundColor Yellow
  $stale | Select-Object ProcessId,ParentProcessId,Name | Format-Table
  throw 'BLOCKED_STALE_QA_RUNTIME'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'BLOCKED_NPM_MISSING'
}

# Retry-safe local dependency recovery: never remove a shared junction,
# silently overwrite existing QA packages or touch retained D1 evidence.
$modules = Join-Path $control 'node_modules'
$existing = Get-Item -LiteralPath $modules -Force -ErrorAction SilentlyContinue
$reuseQaDependencies = $false
if ($null -ne $existing) {
  if (-not $existing.PSIsContainer) { throw 'BLOCKED_QA_MODULES_NOT_DIRECTORY' }
  if ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'BLOCKED_SHARED_NODE_MODULES_JUNCTION'
  }
  # Keep a proven exact-lock QA install. A matching package.json alone
  # is not enough: the native executable's observed release date is checked.
  Push-Location $control
  try {
    & node scripts/workerd-compatibility-preflight.mjs
    $existingPreflight = $LASTEXITCODE
  } finally { Pop-Location }
  if ($existingPreflight -eq 0) {
    Write-Host 'QA_DEPENDENCIES_REUSED_VERIFIED'
    $reuseQaDependencies = $true
  } else {
    # Existing QA dependency folder may contain a partial npm ci result.
    # Quarantine by moving, NEVER deleting. Path is unique and remains
    # entirely under the already validated isolated QA worktree.
    $quarantineRoot = Join-Path $qa '_dependency_quarantine'
    New-Item -ItemType Directory -Force -Path $quarantineRoot | Out-Null
    $quarantine = Join-Path $quarantineRoot ('node_modules-' + [guid]::NewGuid().ToString('N'))
    if (Test-Path -LiteralPath $quarantine) { throw 'BLOCKED_QA_QUARANTINE_COLLISION' }
    Move-Item -LiteralPath $modules -Destination $quarantine -ErrorAction Stop
    if (Test-Path -LiteralPath $modules) { throw 'BLOCKED_QA_DEPENDENCIES_QUARANTINE_FAILED' }
    Write-Host "QA_OLD_DEPENDENCIES_PRESERVED: $quarantine"
  }
}

$cache = Join-Path $qa '_npm_cache'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$npmArgs = @('ci', '--no-audit', '--no-fund', '--cache', $cache)
if ($AllowPackageDownloads) {
  $npmArgs += '--prefer-offline'
  Write-Host 'QA_NPM_DOWNLOADS_PERMITTED: true'
} else {
  $npmArgs += '--offline'
  Write-Host 'QA_NPM_DOWNLOADS_PERMITTED: false'
}
Write-Host "QA_SHA: $head"
Write-Host "QA_FOLDER: $qa"
Push-Location $control
try {
  if (-not $reuseQaDependencies) {
    & npm.cmd @npmArgs
    if ($LASTEXITCODE -ne 0) { throw "BLOCKED_QA_NPM_CI_EXIT_$LASTEXITCODE" }
  }
  & node scripts/workerd-compatibility-preflight.mjs
  $preflightExit = $LASTEXITCODE
  Write-Host "COMPATIBILITY_PREFLIGHT_EXIT: $preflightExit"
  if ($preflightExit -ne 0) { throw 'BLOCKED_QA_WORKERD_PREFLIGHT' }
  & node --test tests/workerd-compatibility-preflight.test.mjs tests/automation-persisted-readback-qa.test.mjs
  $testsExit = $LASTEXITCODE
  Write-Host "NEW_REGRESSION_EXIT: $testsExit"
  if ($testsExit -ne 0) { throw 'BLOCKED_QA_REGRESSION' }

  if ($RunWorkerPilot) {
    # Check again after npm scripts; fail closed rather than run alongside old QA.
    $runningOld = @(Get-CimInstance Win32_Process | Where-Object {
      $_.Name -match '^(node|workerd)(\.exe)?$' -and
      $_.CommandLine -match '(?i)(real-wrangler-private-gate-|price-p0-)'
    })
    if ($runningOld.Count -gt 0) { throw 'BLOCKED_STALE_QA_RUNTIME' }
    & node scripts/real-worker-wrangler-gate-smoke.mjs
    $pilotExit = $LASTEXITCODE
    Write-Host "WORKER_D1_PILOT_EXIT: $pilotExit"
    if ($pilotExit -ne 0) { throw 'BLOCKED_WORKER_D1_PILOT' }
  } else {
    Write-Host 'WORKER_D1_PILOT: NOT_RUN_BY_OPERATOR_CHOICE'
  }
  Write-Host 'QA_ISOLATED_DEPENDENCIES_READY'
} finally {
  Pop-Location
}
# Never delete the previous failed QA folder, its persisted D1, or this worktree.
