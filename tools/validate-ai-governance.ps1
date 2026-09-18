[CmdletBinding()]
param(
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
$root = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) } else { [IO.Path]::GetFullPath($ProjectRoot) }
$failures = New-Object 'Collections.Generic.List[string]'

function Fail([string]$Message) { $script:failures.Add($Message) }
function Require-File([string]$Relative) {
    $path = Join-Path $root $Relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { Fail "required file is missing: $Relative"; return $null }
    return $path
}
function Read-NoBom([string]$Path, [string]$Relative) {
    try {
        $bytes = [IO.File]::ReadAllBytes($Path)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { Fail "UTF-8 BOM is not permitted: $Relative" }
        $encoding = New-Object Text.UTF8Encoding($false, $true)
        return $encoding.GetString($bytes)
    } catch { Fail "strict UTF-8 read failed: $Relative ($($_.Exception.Message))"; return '' }
}
function Get-YamlScalar([string]$Text, [string]$Key, [string]$Relative, [switch]$Optional) {
    $matches = [regex]::Matches($Text, "(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if ($matches.Count -eq 0) { if (-not $Optional) { Fail "lock field is missing: $Key" }; return $null }
    if ($matches.Count -ne 1) { Fail "lock field must occur exactly once: $Key"; return $null }
    $value = $matches[0].Groups[1].Value.Trim()
    if (($value.StartsWith("'") -and $value.EndsWith("'")) -or ($value.StartsWith('"') -and $value.EndsWith('"'))) {
        if ($value.Length -lt 2) { Fail "lock field is malformed: $Key"; return $null }
        $value = $value.Substring(1, $value.Length - 2)
    }
    return $value
}
function Assert-RelativePath([string]$Value, [string]$Field) {
    if ([string]::IsNullOrWhiteSpace($Value) -or [IO.Path]::IsPathRooted($Value) -or $Value.Contains('\') -or $Value.Contains('..') -or $Value.Contains(':')) { Fail "$Field must be a safe repository-relative path" }
}
function Get-Frontmatter([string]$Text, [string]$Relative) {
    $match = [regex]::Match($Text, '\A---\r?\n(?<body>.*?)\r?\n---(?:\r?\n|\z)', [Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $match.Success) { Fail "TASK frontmatter is missing or malformed: $Relative"; return @{} }
    $result = @{}
    foreach ($line in ($match.Groups['body'].Value -split '\r?\n')) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch '^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]*(.*))?$') { Fail "TASK frontmatter line is malformed: $Relative"; continue }
        $key = $Matches[1]
        if ($result.ContainsKey($key)) { Fail "TASK frontmatter key is duplicated: $Relative/$key"; continue }
        $result[$key] = $Matches[2].Trim().Trim("'", '"')
    }
    return $result
}

if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "ProjectRoot is not a directory: $ProjectRoot" }
$lockPath = Require-File 'docs/ai/SHARED_RULES.lock.yml'
$adapterPath = Require-File 'docs/ai/PROJECT_ADAPTER.psd1'
$null = Require-File 'tools/update-task-html.ps1'

if ($null -ne $lockPath) {
    $lock = Read-NoBom $lockPath 'docs/ai/SHARED_RULES.lock.yml'
    $schema = Get-YamlScalar $lock 'schema_version' 'docs/ai/SHARED_RULES.lock.yml'
    if ($schema -ne '2') { Fail "lock schema_version must be 2 (actual '$schema')" }
    $repository = Get-YamlScalar $lock 'source_repository' 'docs/ai/SHARED_RULES.lock.yml'
    if ($repository -cne 'Osato-Gasu/shared') { Fail "lock source_repository is invalid: $repository" }
    $version = Get-YamlScalar $lock 'source_version' 'docs/ai/SHARED_RULES.lock.yml'
    if ([string]::IsNullOrWhiteSpace($version) -or $version -match '^<.*>$' -or $version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') { Fail "lock source_version is invalid: $version" }
    $commit = Get-YamlScalar $lock 'source_commit' 'docs/ai/SHARED_RULES.lock.yml'
    if ($commit -notmatch '^[0-9a-fA-F]{40}$' -or $commit -match '^0+$') { Fail 'lock source_commit must be a non-zero full SHA' }
    $tree = Get-YamlScalar $lock 'source_tree' 'docs/ai/SHARED_RULES.lock.yml' -Optional
    if ($null -ne $tree -and $tree -notmatch '^[0-9a-fA-F]{40}$') { Fail 'lock source_tree must be a full SHA when present' }
    $manifest = Get-YamlScalar $lock 'manifest_sha256' 'docs/ai/SHARED_RULES.lock.yml' -Optional
    if ($null -ne $manifest -and $manifest -notmatch '^[0-9A-Fa-f]{64}$') { Fail 'lock manifest_sha256 must be 64 hex characters when present' }
}

$adapter = $null
if ($null -ne $adapterPath) {
    try { $adapter = Import-PowerShellDataFile -LiteralPath $adapterPath }
    catch { Fail "PROJECT_ADAPTER.psd1 cannot be imported: $($_.Exception.Message)" }
}
if ($null -ne $adapter) {
    if ([int]$adapter.SchemaVersion -ne 2) { Fail 'PROJECT_ADAPTER SchemaVersion must be 2' }
    foreach ($section in @('Paths','Commands','CI','SharedSync')) { if (-not $adapter.ContainsKey($section)) { Fail "PROJECT_ADAPTER section is missing: $section" } }
    if ($adapter.Paths -and [string]$adapter.Paths.TaskHtml -cne 'docs/ai/TASKS.html') { Fail 'PROJECT_ADAPTER Paths.TaskHtml must be docs/ai/TASKS.html' }
    foreach ($command in @('TaskHtmlUpdate','TaskHtmlCheck')) {
        if (-not $adapter.Commands -or [string]::IsNullOrWhiteSpace([string]$adapter.Commands[$command])) { Fail "PROJECT_ADAPTER Commands.$command is missing" }
    }
    $sync = $adapter.SharedSync
    if ($null -ne $sync) {
        if ($sync.Enabled -ne $true) { Fail 'SharedSync.Enabled must be true' }
        if ([string]$sync.LockPath -cne 'docs/ai/SHARED_RULES.lock.yml') { Fail 'SharedSync.LockPath must be the exact lock path' }
        Assert-RelativePath ([string]$sync.ApplyScript) 'SharedSync.ApplyScript'
        if (@($sync.SmokeScripts).Count -lt 1) { Fail 'SharedSync.SmokeScripts must contain at least one script' }
        foreach ($script in @($sync.SmokeScripts)) { Assert-RelativePath ([string]$script) 'SharedSync.SmokeScripts entry' }
        if (@($sync.AllowedPaths).Count -ne 1 -or [string]$sync.AllowedPaths[0] -cne 'docs/ai/SHARED_RULES.lock.yml') { Fail 'SharedSync.AllowedPaths must contain only the exact lock path' }
        if ($sync.AutoIntegrate -ne $true) { Fail 'SharedSync.AutoIntegrate must be true' }
        if ([string]$sync.SharedSyncCiMode -cne 'none') { Fail 'SharedSync.SharedSyncCiMode must be none' }
    }
    $ci = $adapter.CI
    if ($null -ne $ci) {
        if ([string]$ci.FormalTrigger -cne 'workflow_dispatch') { Fail 'CI.FormalTrigger must be workflow_dispatch' }
        if ([string]$ci.CandidateShaInput -cne 'candidate_sha') { Fail 'CI.CandidateShaInput must be candidate_sha' }
        if ([string]$ci.DevelopmentBranchPrefix -cne 'no-ci/') { Fail 'CI.DevelopmentBranchPrefix must be no-ci/' }
        if ([string]$ci.ReleasedMainGate -cne 'identity_only') { Fail 'CI.ReleasedMainGate must be identity_only' }
        $nonePaths = @($ci.NonePathGlobs)
        if ($nonePaths -notcontains 'docs/ai/SHARED_RULES.lock.yml') { Fail 'CI.NonePathGlobs must include the lock-only future sync path' }
        foreach ($path in $nonePaths) { if ([string]$path -ne 'docs/ai/SHARED_RULES.lock.yml') { Fail "CI.NonePathGlobs contains an out-of-scope path: $path" } }
    }
}

$tasksDir = Join-Path $root 'docs/ai/tasks'
$active = 0
if (Test-Path -LiteralPath $tasksDir -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $tasksDir -Filter 'TASK-*.md' -File | Sort-Object Name)) {
        $relative = ('docs/ai/tasks/' + $file.Name).Replace('\','/')
        $text = Read-NoBom $file.FullName $relative
        $front = Get-Frontmatter $text $relative
        if (-not $front.ContainsKey('task_id') -or [string]$front.task_id -notmatch '^TASK-\d+$') { Fail "canonical TASK id is invalid: $relative" }
        if ($front.ContainsKey('task_id') -and [string]$front.task_id -cne $file.BaseName) { Fail "TASK filename and task_id do not match: $relative" }
        $taskNumber = if ([string]$front.task_id -match '^TASK-(\d+)$') { [int]$Matches[1] } else { 0 }
        $status = [string]$front.status
        if ($status -notin @('PLANNED','ACTIVE','PENDING_REMOTE_CI','BLOCKED','COMPLETED','CANCELLED','SUPERSEDED')) { Fail "TASK status is invalid: $relative ($status)" }
        if ($status -eq 'ACTIVE') { $active++ }
        if ([string]$front.phase -notin @('Discovery','Requirements','Design','IndependentReview','SpecGate','Implementation','BuildVerifyFix','RCFreeze','Acceptance','GoNoGo','Release','Completion')) { Fail "TASK phase is invalid: $relative" }
        $axisKeys = @('definition_state','implementation_state','static_verification_state','runtime_verification_state','hold_state')
        $axisPresent = @($axisKeys | Where-Object { $front.ContainsKey($_) })
        if ($axisPresent.Count -gt 0 -or $taskNumber -ge 20) {
            if ($axisPresent.Count -ne $axisKeys.Count) { Fail "canonical TASK tracking axes are incomplete: $relative" }
            if ([string]$front.definition_state -notin @('CONSIDERING','DESIGNED')) { Fail "definition_state is invalid: $relative" }
            if ([string]$front.implementation_state -notin @('NOT_IMPLEMENTED','IMPLEMENTING','IMPLEMENTED')) { Fail "implementation_state is invalid: $relative" }
            if ([string]$front.static_verification_state -notin @('NOT_RUN','PASS','FAIL','NOT_REQUIRED')) { Fail "static_verification_state is invalid: $relative" }
            if ([string]$front.runtime_verification_state -notin @('NOT_REQUIRED','PENDING','PASS','FAIL')) { Fail "runtime_verification_state is invalid: $relative" }
            if ([string]$front.hold_state -notin @('NONE','HOLD')) { Fail "hold_state is invalid: $relative" }
            if ([string]$front.hold_state -eq 'HOLD' -and (-not $front.ContainsKey('hold_reason') -or [string]::IsNullOrWhiteSpace([string]$front.hold_reason) -or [string]$front.hold_reason -eq 'null')) { Fail "HOLD TASK requires hold_reason: $relative" }
        }
        if ($front.ContainsKey('formal_ci_state') -and [string]$front.formal_ci_state -notin @('NOT_REQUIRED','NOT_RUN','RUNNING','PENDING_REMOTE_CI','PASS','FAIL')) { Fail "formal_ci_state is invalid: $relative" }
        if ($taskNumber -ge 20) {
            if (-not $front.ContainsKey('next_actor') -or [string]$front.next_actor -notin @('GPT_ORCHESTRATOR','INDEPENDENT_REVIEW','CODEX_MAIN','USER','NONE')) { Fail "maintained TASK next_actor is invalid or missing: $relative" }
            if (-not $front.ContainsKey('handoff_ref') -or [string]::IsNullOrWhiteSpace([string]$front.handoff_ref) -or [string]$front.handoff_ref -eq 'null') { Fail "maintained TASK handoff_ref is missing: $relative" }
            elseif ([string]$front.handoff_ref -ne 'none') {
                Assert-RelativePath ([string]$front.handoff_ref) 'TASK handoff_ref'
                if (-not (Test-Path -LiteralPath (Join-Path $root ([string]$front.handoff_ref)) -PathType Leaf)) { Fail "TASK handoff_ref file is missing: $relative" }
            }
        }
        if ($status -eq 'PENDING_REMOTE_CI' -or [string]$front.formal_ci_state -eq 'PENDING_REMOTE_CI') {
            if (-not $front.ContainsKey('formal_ci_subject_sha') -or [string]$front.formal_ci_subject_sha -notmatch '\A[0-9a-fA-F]{40}\z' -or [string]$front.formal_ci_subject_sha -match '\A0+\z') { Fail "PENDING_REMOTE_CI TASK requires a non-zero full formal_ci_subject_sha: $relative" }
            foreach ($field in @('frozen_remote_ref','formal_ci_workflow','ci_mode')) { if (-not $front.ContainsKey($field) -or [string]::IsNullOrWhiteSpace([string]$front[$field]) -or [string]$front[$field] -eq 'null') { Fail "PENDING_REMOTE_CI TASK requires $field`: $relative" } }
        }
    }
}
if ($active -gt 1) { Fail "at most one ACTIVE canonical TASK is allowed (actual $active)" }

if ($failures.Count -gt 0) { foreach ($failure in $failures) { [Console]::Error.WriteLine("governance error: $failure") }; exit 1 }
$overlay = Join-Path $root 'tools/validate-project-overlay.ps1'
if (-not (Test-Path -LiteralPath $overlay -PathType Leaf)) { Write-Error 'Project overlay validator is missing'; exit 1 }
& $overlay -ProjectRoot $root
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output "AI governance validation passed (Shared lock schema 2; active_tasks=$active)."
