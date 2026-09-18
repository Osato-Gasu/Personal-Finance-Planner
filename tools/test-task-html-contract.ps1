[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tool = Join-Path $root 'tools/update-task-html.ps1'
$utf8 = New-Object Text.UTF8Encoding($false)
$fixture = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('pfp-task-html-' + [guid]::NewGuid().ToString('N'))))
$checks = 0
function Assert-True([bool]$Condition, [string]$Message) { if (-not $Condition) { throw "FAIL: $Message" }; $script:checks++ }
function Write-Utf8([string]$Relative, [string]$Text) {
    $path = Join-Path $fixture $Relative
    $dir = Split-Path -Parent $path
    if (-not (Test-Path -LiteralPath $dir)) { [IO.Directory]::CreateDirectory($dir) | Out-Null }
    [IO.File]::WriteAllText($path, $Text, $utf8)
}
function Invoke-Generator([string]$FixturePath, [switch]$Check) {
    $global:LASTEXITCODE = 0
    if ($Check) { $out = @(& $tool -ProjectRoot $FixturePath -Check 2>&1) }
    else { $out = @(& $tool -ProjectRoot $FixturePath 2>&1) }
    if ($LASTEXITCODE -ne 0) { throw ($out -join "`n") }
    return ($out -join "`n")
}
function Assert-GeneratorFails([string]$FixturePath, [switch]$Check, [string]$Message) {
    $failed = $false
    try {
        if ($Check) { & $tool -ProjectRoot $FixturePath -Check | Out-Null }
        else { & $tool -ProjectRoot $FixturePath | Out-Null }
    } catch { $failed = $true }
    Assert-True $failed $Message
}

try {
    [IO.Directory]::CreateDirectory((Join-Path $fixture 'docs/ai/tasks')) | Out-Null
    Write-Utf8 'docs/ai/PROJECT_ADAPTER.psd1' "@{ SchemaVersion = 2; Paths = @{ TaskHtml = 'docs/ai/TASKS.html' } }`n"
    Write-Utf8 'docs/ai/LEGACY_TASK_INVENTORY.json' '{"schema_version":1,"tasks":[{"task_id":"TASK-001","summary":"未記録","status":"未記録","source":"fixture"}]}'
    Write-Utf8 'docs/ai/tasks/TASK-020.md' @'
---
task_id: TASK-020
summary: Contract fixture
status: ACTIVE
phase: Implementation
definition_state: DESIGNED
implementation_state: IMPLEMENTING
static_verification_state: NOT_RUN
runtime_verification_state: NOT_REQUIRED
hold_state: NONE
hold_reason: null
progress: Building
next_action: Verify
formal_ci_state: NOT_RUN
---
# TASK-020
'@
    Invoke-Generator $fixture | Out-Null
    $htmlPath = Join-Path $fixture 'docs/ai/TASKS.html'
    Assert-True (Test-Path -LiteralPath $htmlPath -PathType Leaf) 'generator writes default adapter path'
    $html = [IO.File]::ReadAllText($htmlPath, $utf8)
    foreach ($id in 1..20) { Assert-True $html.Contains(('TASK-{0:D3}' -f $id)) "HTML contains TASK-{0:D3}" -f $id }
    Assert-True $html.Contains('未記録') 'legacy and unknown tracking are explicit'
    Assert-True $html.Contains('Contract fixture') 'canonical TASK summary is rendered'
    $first = [Convert]::ToBase64String([IO.File]::ReadAllBytes($htmlPath))
    # deterministic check immediately after generation
    Assert-True (-not ([IO.File]::ReadAllText($htmlPath, $utf8)).EndsWith('stale')) 'fresh output has no stale marker'
    Invoke-Generator -FixturePath $fixture -Check:$true | Out-Null
    $second = [Convert]::ToBase64String([IO.File]::ReadAllBytes($htmlPath))
    Assert-True ($first -ceq $second) 'check is read-only and output is deterministic'
    [IO.File]::AppendAllText($htmlPath, 'stale', $utf8)
    Assert-GeneratorFails -FixturePath $fixture -Check:$true -Message 'stale HTML is rejected'
    Invoke-Generator $fixture | Out-Null
    [IO.File]::WriteAllText((Join-Path $fixture 'docs/ai/tasks/TASK-020.md'), 'not frontmatter', $utf8)
    Assert-GeneratorFails $fixture -Message 'malformed canonical TASK is rejected'
    Write-Output "TASK HTML contract passed: $checks checks."
} finally {
    if (Test-Path -LiteralPath $fixture -PathType Container) {
        $resolved = [IO.Path]::GetFullPath($fixture)
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
        if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolved) -notlike 'pfp-task-html-*') { throw "unsafe fixture cleanup path: $resolved" }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
