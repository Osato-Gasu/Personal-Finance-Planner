[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8 = New-Object Text.UTF8Encoding($false)
$checks = 0
function Assert-True([bool]$Condition, [string]$Message) { if (-not $Condition) { throw "FAIL: $Message" }; $script:checks++ }
function Assert-Failure([object]$Result, [string]$Diagnostic, [string]$Message) {
    Assert-True $Result.Failed $Message
    $output = $Result.Output | Out-String
    Assert-True $output.Contains($Diagnostic) "$Message (diagnostic)"
}
function Invoke-Failure([string]$ScriptPath, [string]$ProjectRoot) {
    $stdoutPath = Join-Path $ProjectRoot '.__governance-contract.stdout.txt'
    $stderrPath = Join-Path $ProjectRoot '.__governance-contract.stderr.txt'
    $shell = Join-Path $PSHOME $(if ($PSEdition -eq 'Core') { 'pwsh.exe' } else { 'powershell.exe' })
    try {
        $process = Start-Process -FilePath $shell -ArgumentList @('-NoProfile','-File',"`"$ScriptPath`"",'-ProjectRoot',"`"$ProjectRoot`"") -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -Wait -PassThru -WindowStyle Hidden
        $output = (Get-Content -Raw -LiteralPath $stdoutPath -ErrorAction SilentlyContinue) + (Get-Content -Raw -LiteralPath $stderrPath -ErrorAction SilentlyContinue)
        [pscustomobject]@{ Failed = ($process.ExitCode -ne 0); Output = $output }
    } catch {
        [pscustomobject]@{ Failed = $true; Output = ($_ | Out-String) }
    } finally {
        Remove-Item -LiteralPath $stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
    }
}
function Write-Utf8([string]$Path, [string]$Text) { [IO.File]::WriteAllText($Path, $Text, $utf8) }

$governance = Join-Path $root 'tools/validate-ai-governance.ps1'
$generator = Join-Path $root 'tools/update-task-html.ps1'
Assert-True (Test-Path -LiteralPath $governance -PathType Leaf) 'governance entrypoint exists'
$governanceText = [IO.File]::ReadAllText($governance, $utf8)
Assert-True ($governanceText.Contains("if (`$status -eq 'ACTIVE') { `$active++ }")) 'pending CI debt does not prevent an unrelated ACTIVE TASK'
$global:LASTEXITCODE = 0
& $generator -Check | Out-Null
Assert-True ($LASTEXITCODE -eq 0) 'TASK HTML freshness check passes'

$workflowPath = Join-Path $root '.github/workflows/ci.yml'
$workflow = [IO.File]::ReadAllText($workflowPath, $utf8)
$lockText = [IO.File]::ReadAllText((Join-Path $root 'docs/ai/SHARED_RULES.lock.yml'), $utf8)
$lockVersion = [regex]::Match($lockText, '(?m)^source_version:\s*(\d+)\.\d+\.\d+\s*$')
$lockCommit = [regex]::Match($lockText, '(?m)^source_commit:\s*([0-9a-fA-F]{40})\s*$')
Assert-True ($lockText -match '(?m)^schema_version:\s*2\s*$' -and $lockVersion.Success -and [int]$lockVersion.Groups[1].Value -ge 2 -and $lockCommit.Success -and $lockCommit.Groups[1].Value -notmatch '\A0+\z') 'supported future Shared lock shape is present'
foreach ($fragment in @('workflow_dispatch:', 'candidate_sha:', 'head_sha', 'branches-ignore:', 'no-ci/**', 'actions/setup-node@v4', 'tools/test-governance-contract.ps1', 'tools/test-task-html-contract.ps1')) {
    Assert-True $workflow.Contains($fragment) "CI contains $fragment"
}
$guardIndex = $workflow.IndexOf('Exact candidate SHA guard', [StringComparison]::Ordinal)
$setupIndex = $workflow.IndexOf('actions/setup-node@v4', [StringComparison]::Ordinal)
Assert-True ($guardIndex -ge 0 -and $guardIndex -lt $setupIndex) 'exact candidate guard precedes Node setup/tests'
Assert-True ($workflow -match '(?s)workflow_dispatch:.*candidate_sha.*required:\s*true') 'candidate_sha is required for workflow dispatch'
$withoutHeadGuard = $workflow.Replace('$head_sha', '$removed_head')
Assert-True (-not ($withoutHeadGuard -match 'head_sha')) 'candidate guard negative mutation is detectable'

$fixture = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('pfp-governance-negative-' + [guid]::NewGuid().ToString('N'))))
try {
    [IO.Directory]::CreateDirectory((Join-Path $fixture 'docs/ai')) | Out-Null
    [IO.Directory]::CreateDirectory((Join-Path $fixture 'tools')) | Out-Null
    Copy-Item -LiteralPath $governance -Destination (Join-Path $fixture 'tools/validate-ai-governance.ps1')
    Copy-Item -LiteralPath (Join-Path $root 'tools/validate-project-overlay.ps1') -Destination (Join-Path $fixture 'tools/validate-project-overlay.ps1')
    Copy-Item -LiteralPath $generator -Destination (Join-Path $fixture 'tools/update-task-html.ps1')
    Write-Utf8 (Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml') "schema_version: 1`nsource_repository: Osato-Gasu/shared`nsource_version: 9.9.9`nsource_commit: 1234567890abcdef1234567890abcdef12345678`n"
    Write-Utf8 (Join-Path $fixture 'docs/ai/PROJECT_ADAPTER.psd1') '@{ SchemaVersion = 2 }'
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'lock schema_version must be 2' 'schema-1 lock is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml') "schema_version: 2`nsource_repository: wrong/repository`nsource_version: 9.9.9`nsource_commit: 1234567890abcdef1234567890abcdef12345678`n"
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'lock source_repository is invalid' 'wrong repository is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml') "schema_version: 2`nsource_repository: Osato-Gasu/shared`nsource_version: 9.9.9`nsource_commit: 0000000000000000000000000000000000000000`n"
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'lock source_commit must be a non-zero full SHA' 'zero lock SHA is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/SHARED_RULES.lock.yml') "schema_version: 2`nsource_repository: Osato-Gasu/shared`nsource_version: 9.9.9`nsource_commit: 1234567890abcdef1234567890abcdef12345678`n"
    Write-Utf8 (Join-Path $fixture 'docs/ai/PROJECT_ADAPTER.psd1') @'
@{
  SchemaVersion = 2
  Paths = @{ TaskHtml = 'docs/ai/TASKS.html' }
  Commands = @{ TaskHtmlUpdate = 'update'; TaskHtmlCheck = 'check' }
  CI = @{ FormalTrigger = 'workflow_dispatch'; CandidateShaInput = 'candidate_sha'; DevelopmentBranchPrefix = 'no-ci/'; ReleasedMainGate = 'identity_only'; NonePathGlobs = @('docs/ai/SHARED_RULES.lock.yml'); ExtendedPathGlobs = @() }
  SharedSync = @{ Enabled = $true; LockPath = 'docs/ai/SHARED_RULES.lock.yml'; ApplyScript = 'tools/update-shared-reference.ps1'; SmokeScripts = @('tools/test-shared2-bootstrap-smoke.ps1'); AllowedPaths = @('docs/ai/SHARED_RULES.lock.yml'); AutoIntegrate = $true; SharedSyncCiMode = 'none' }
}
'@
    [IO.Directory]::CreateDirectory((Join-Path $fixture 'docs/ai/tasks')) | Out-Null
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') @'
---
task_id: TASK-020
status: ACTIVE
phase: Release
definition_state: DESIGNED
---
'@
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'canonical TASK tracking axes are incomplete' 'maintained TASK with partial five-axis tracking is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') @'
---
task_id: TASK-020
status: ACTIVE
phase: Release
---
'@
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'canonical TASK tracking axes are incomplete' 'maintained TASK with all five axes removed is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') @'
---
task_id: TASK-020
status: PENDING_REMOTE_CI
phase: Completion
definition_state: DESIGNED
implementation_state: IMPLEMENTED
static_verification_state: PASS
runtime_verification_state: NOT_REQUIRED
hold_state: NONE
hold_reason: null
next_actor: CODEX_MAIN
handoff_ref: none
formal_ci_state: PENDING_REMOTE_CI
formal_ci_subject_sha: null
frozen_remote_ref: no-ci/task-020
formal_ci_workflow: ci.yml
ci_mode: candidate
---
'@
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'PENDING_REMOTE_CI TASK requires a non-zero full formal_ci_subject_sha' 'PENDING_REMOTE_CI with null exact SHA is rejected'
    $task = Get-Content -Raw (Join-Path $fixture 'docs/ai/tasks/TASK-020.md')
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') ($task -replace 'formal_ci_subject_sha: null', 'formal_ci_subject_sha: 0000000000000000000000000000000000000000')
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'PENDING_REMOTE_CI TASK requires a non-zero full formal_ci_subject_sha' 'PENDING_REMOTE_CI with all-zero SHA is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') ($task -replace 'hold_state: NONE', 'hold_state: HOLD')
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'HOLD TASK requires hold_reason' 'HOLD TASK without a reason is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') ($task -replace 'formal_ci_subject_sha: null', 'formal_ci_subject_sha: 1234567890abcdef1234567890abcdef12345678' -replace 'status: PENDING_REMOTE_CI', 'status: ACTIVE' -replace 'formal_ci_state: PENDING_REMOTE_CI', 'formal_ci_state: PENDING_REMOTE_CI' -replace 'frozen_remote_ref: no-ci/task-020\r?\n', '')
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'PENDING_REMOTE_CI TASK requires frozen_remote_ref' 'ACTIVE TASK with pending formal CI and missing debt is rejected'
    Write-Utf8 (Join-Path $fixture 'docs/ai/tasks/TASK-020.md') ($task -replace 'formal_ci_subject_sha: null', 'formal_ci_subject_sha: 1234567890abcdef1234567890abcdef12345678' -replace 'definition_state: DESIGNED', 'definition_state: INVALID')
    $bad = Invoke-Failure (Join-Path $fixture 'tools/validate-ai-governance.ps1') $fixture
    Assert-Failure $bad 'definition_state is invalid' 'invalid TASK axis value is rejected'
    Write-Output "Governance contract passed: $checks checks."
} finally {
    if (Test-Path -LiteralPath $fixture -PathType Container) {
        $resolved = [IO.Path]::GetFullPath($fixture)
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
        if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolved) -notlike 'pfp-governance-negative-*') { throw "unsafe fixture cleanup path: $resolved" }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
