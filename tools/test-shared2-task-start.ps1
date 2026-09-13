[CmdletBinding()]
param(
    [ValidatePattern('^TASK-[0-9]+$')]
    [string]$TaskId = 'TASK-020'
)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$temporaryRoot = [IO.Path]::Combine([IO.Path]::GetTempPath(), ('pfp-shared2-task-start-' + [guid]::NewGuid().ToString('N')))

function Resolve-ExplicitTask([string]$FixtureRoot, [string]$ExplicitTaskId) {
    if ([string]::IsNullOrWhiteSpace($ExplicitTaskId) -or $ExplicitTaskId -notmatch '^TASK-[0-9]+$') {
        throw 'an explicit TASK id is required'
    }
    $taskPath = Join-Path $FixtureRoot "docs/ai/tasks/$ExplicitTaskId.md"
    if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf)) {
        throw "explicitly assigned TASK does not exist: $ExplicitTaskId"
    }
    $text = [IO.File]::ReadAllText($taskPath)
    if ($text -notmatch "(?m)^task_id:\s*$([regex]::Escape($ExplicitTaskId))\s*$") {
        throw "TASK identity mismatch: $ExplicitTaskId"
    }
    $status = [regex]::Match($text, '(?m)^status:\s*([A-Z]+)\s*$')
    $phase = [regex]::Match($text, '(?m)^phase:\s*([A-Za-z]+)\s*$')
    if (-not $status.Success -or -not $phase.Success) { throw 'TASK state is incomplete' }
    [pscustomobject]@{ TaskId = $ExplicitTaskId; Status = $status.Groups[1].Value; Phase = $phase.Groups[1].Value }
}

[IO.Directory]::CreateDirectory($temporaryRoot) | Out-Null
try {
    foreach ($directory in @('docs/ai', 'docs/ai/tasks')) {
        [IO.Directory]::CreateDirectory((Join-Path $temporaryRoot $directory)) | Out-Null
    }
    foreach ($relative in @(
        'AGENTS.md',
        'docs/ai/SHARED_RULES.lock.yml',
        'docs/ai/PROJECT.md',
        'docs/ai/PROJECT_ADAPTER.psd1',
        "docs/ai/tasks/$TaskId.md"
    )) {
        $source = Join-Path $root $relative
        $destination = Join-Path $temporaryRoot $relative
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "fixture source is missing: $relative" }
        Copy-Item -LiteralPath $source -Destination $destination
    }

    $lock = [IO.File]::ReadAllText((Join-Path $temporaryRoot 'docs/ai/SHARED_RULES.lock.yml')) -replace "`r`n", "`n"
    foreach ($line in @(
        'schema_version: 2',
        'source_repository: Osato-Gasu/shared',
        'source_version: 2.0.0',
        'source_commit: a528200ffdd71747e320abaad1da807e27ba14e3'
    )) {
        if ($lock -notmatch "(?m)^$([regex]::Escape($line))\s*$") { throw "Shared lock mismatch: $line" }
    }

    $project = [IO.File]::ReadAllText((Join-Path $temporaryRoot 'docs/ai/PROJECT.md'))
    if ($project -notmatch 'Canonical owner for Personal Finance Planner') { throw 'Project owner was not resolved' }

    $adapter = Import-PowerShellDataFile -LiteralPath (Join-Path $temporaryRoot 'docs/ai/PROJECT_ADAPTER.psd1')
    if ([int]$adapter.SchemaVersion -ne 2 -or $adapter.Commands.TaskStartSmoke -cne 'pwsh -NoProfile -File tools/test-shared2-task-start.ps1') {
        throw 'schema-2 Project adapter was not resolved'
    }

    foreach ($legacy in @(
        'docs/ai/CURRENT_STATE.md',
        'docs/ai/NEXT_ACTION.yml',
        'docs/ai/handoffs',
        'docs/ai/generated/shared'
    )) {
        if (Test-Path -LiteralPath (Join-Path $temporaryRoot $legacy)) {
            throw "fixture unexpectedly depends on legacy state: $legacy"
        }
    }

    $resolved = Resolve-ExplicitTask $temporaryRoot $TaskId
    $missingWasRejected = $false
    try { Resolve-ExplicitTask $temporaryRoot 'TASK-999999' | Out-Null } catch { $missingWasRejected = $true }
    if (-not $missingWasRejected) { throw 'missing explicit TASK was not rejected' }

    Write-Output "Shared 2 explicit TASK start/resume smoke passed: task=$($resolved.TaskId) status=$($resolved.Status) phase=$($resolved.Phase)"
} finally {
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $resolvedTemp = [IO.Path]::GetFullPath($temporaryRoot)
    if ($resolvedTemp.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedTemp) -like 'pfp-shared2-task-start-*' -and
        (Test-Path -LiteralPath $resolvedTemp -PathType Container)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
