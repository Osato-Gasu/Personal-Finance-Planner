[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$tool = Join-Path $PSScriptRoot 'complete-task-local.ps1'
$caseNames = New-Object System.Collections.Generic.List[string]
$originalPath = $env:PATH

function Invoke-External {
    param([string]$Command, [string[]]$Arguments)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) { throw "$Command failed: $($Arguments -join ' '): $output" }
    return @($output)
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Value)
    [IO.File]::WriteAllText($Path, $Value, (New-Object Text.UTF8Encoding($false)))
}

function New-TestCommands {
    param([string]$Root)
    $bin = Join-Path $Root 'test-bin'
    New-Item -ItemType Directory -Path $bin | Out-Null
    Write-Utf8NoBom (Join-Path $bin 'gh.cmd') @'
@echo off
echo {"headSha":"%PFP_TEST_CI_SHA%","conclusion":"%PFP_TEST_CI_CONCLUSION%"}
'@
    Write-Utf8NoBom (Join-Path $bin 'npm.cmd') @'
@echo off
if not "%PFP_TEST_NPM_FAIL_ON%"=="" (
  echo %* | findstr /C:"%PFP_TEST_NPM_FAIL_ON%" >nul
  if not errorlevel 1 exit /b 1
)
exit /b 0
'@
    $env:PATH = "$bin$([IO.Path]::PathSeparator)$originalPath"
}

function New-Fixture {
    param([string]$MainName = 'Personal-Finance-Planner')
    $root = Join-Path ([IO.Path]::GetTempPath()) ("pfp-completion-" + [guid]::NewGuid().ToString('N'))
    $main = Join-Path $root $MainName
    $remote = Join-Path $root 'remote.git'
    $task = Join-Path $root 'task-worktree'
    New-Item -ItemType Directory -Path $root | Out-Null
    Invoke-External git @('init', '--bare', $remote) | Out-Null
    Invoke-External git @('init', '-b', 'main', $main) | Out-Null
    Invoke-External git @('-C', $main, 'config', 'user.email', 'test@example.invalid') | Out-Null
    Invoke-External git @('-C', $main, 'config', 'user.name', 'Completion Test') | Out-Null
    Write-Utf8NoBom (Join-Path $main 'tracked.txt') 'initial'
    Invoke-External git @('-C', $main, 'add', 'tracked.txt') | Out-Null
    Invoke-External git @('-C', $main, 'commit', '-m', 'initial') | Out-Null
    Invoke-External git @('-C', $main, 'remote', 'add', 'origin', $remote) | Out-Null
    Invoke-External git @('-C', $main, 'push', '-u', 'origin', 'main') | Out-Null
    Invoke-External git @('-C', $main, 'worktree', 'add', '-b', 'codex/task-008-fixture', $task) | Out-Null
    Write-Utf8NoBom (Join-Path $task 'tracked.txt') 'complete'
    Invoke-External git @('-C', $task, 'add', 'tracked.txt') | Out-Null
    Invoke-External git @('-C', $task, 'commit', '-m', 'complete') | Out-Null
    $commit = [string](@(Invoke-External git @('-C', $task, 'rev-parse', 'HEAD'))[0])
    New-TestCommands $root
    $env:PFP_TEST_CI_SHA = $commit
    $env:PFP_TEST_CI_CONCLUSION = 'success'
    $env:PFP_TEST_NPM_FAIL_ON = ''
    return [pscustomobject]@{ Root = $root; Main = $main; Remote = $remote; Task = $task; Commit = $commit; Branch = 'codex/task-008-fixture' }
}

function Publish-Completion {
    param($Fixture)
    Invoke-External git @('-C', $Fixture.Task, 'push', 'origin', 'HEAD:main') | Out-Null
    $env:PFP_TEST_CI_SHA = $Fixture.Commit
}

function Invoke-Completion {
    param($Fixture, [string]$TaskPath = '', [string]$ExpectedBranch = '', [switch]$WhatIf)
    if ([string]::IsNullOrEmpty($TaskPath)) { $TaskPath = $Fixture.Task }
    if ([string]::IsNullOrEmpty($ExpectedBranch)) { $ExpectedBranch = $Fixture.Branch }
    & $tool -RepositoryPath $Fixture.Main -TaskWorktree $TaskPath -TaskId 'TASK-008' -ExpectedTaskBranch $ExpectedBranch -CompletionCommit $Fixture.Commit -WorkflowRunId 1 -WhatIf:$WhatIf
}

function Get-PreservationSnapshot {
    param($Fixture)
    $paths = @()
    foreach ($worktree in @($Fixture.Main, $Fixture.Task)) {
        $relativePaths = @(
            @(Invoke-External git @('-C', $worktree, 'ls-files'))
            @(Invoke-External git @('-C', $worktree, 'ls-files', '--others', '--exclude-standard'))
        ) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
        $paths += @($relativePaths | ForEach-Object { Join-Path $worktree ([string]$_) })
    }
    $snapshot = @{}
    foreach ($path in $paths) {
        $snapshot[$path] = if (Test-Path -LiteralPath $path -PathType Leaf) {
            [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
        } else { $null }
    }
    return $snapshot
}

function Assert-Preserved {
    param($Fixture, $Snapshot)
    if (-not (Test-Path -LiteralPath $Fixture.Main -PathType Container)) { throw 'main worktree was removed on failure' }
    if (-not (Test-Path -LiteralPath $Fixture.Task -PathType Container)) { throw 'TASK worktree was removed on failure' }
    foreach ($path in $Snapshot.Keys) {
        $actual = if (Test-Path -LiteralPath $path -PathType Leaf) {
            [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
        } else { $null }
        if ($actual -cne $Snapshot[$path]) { throw "failure changed protected bytes: $path" }
    }
}

function Expect-Failure {
    param($Fixture, [scriptblock]$Action, [string]$CaseName)
    $snapshot = Get-PreservationSnapshot $Fixture
    $failed = $false
    try { & $Action | Out-Null } catch { $failed = $true }
    if (-not $failed) { throw "expected failure: $CaseName" }
    Assert-Preserved $Fixture $snapshot
    $caseNames.Add($CaseName)
}

function Remove-Fixture {
    param($Fixture)
    $env:PATH = $originalPath
    $env:PFP_TEST_CI_SHA = $null
    $env:PFP_TEST_CI_CONCLUSION = $null
    $env:PFP_TEST_NPM_FAIL_ON = $null
    if (Test-Path -LiteralPath $Fixture.Root) { Remove-Item -LiteralPath $Fixture.Root -Recurse -Force }
}

$command = Get-Command $tool
$parameterNames = @($command.Parameters.Keys)
foreach ($forbidden in @('SkipFetch', 'SkipLauncherGate', 'SkipCiGate')) {
    if ($parameterNames -contains $forbidden) { throw "production bypass parameter remains: $forbidden" }
}
$caseNames.Add('production mandatory gates have no public bypass')

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Invoke-Completion $fixture -WhatIf | Out-Null
    if (-not (Test-Path -LiteralPath $fixture.Task)) { throw 'WhatIf removed the TASK worktree' }
    $caseNames.Add('unique main worktree')
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture -MainName 'wrong-main-folder'
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture } 'wrong main folder' } finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $ambiguous = Join-Path (Join-Path $fixture.Root 'other') 'Personal-Finance-Planner'
    Invoke-External git @('-C', $fixture.Main, 'worktree', 'add', '--detach', $ambiguous, 'HEAD') | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'ambiguous named main worktree'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try { Publish-Completion $fixture; Write-Utf8NoBom (Join-Path $fixture.Main 'tracked.txt') 'dirty-main'; Expect-Failure $fixture { Invoke-Completion $fixture } 'tracked dirty main' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Write-Utf8NoBom (Join-Path $fixture.Main 'user-owned.txt') 'main-user'; Expect-Failure $fixture { Invoke-Completion $fixture } 'untracked main' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Write-Utf8NoBom (Join-Path $fixture.Task 'tracked.txt') 'dirty-task'; Expect-Failure $fixture { Invoke-Completion $fixture } 'tracked dirty TASK' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Write-Utf8NoBom (Join-Path $fixture.Task 'user-owned.txt') 'task-user'; Expect-Failure $fixture { Invoke-Completion $fixture } 'untracked TASK' } finally { Remove-Fixture $fixture }

foreach ($operation in @('MERGE_HEAD', 'CHERRY_PICK_HEAD')) {
    $fixture = New-Fixture
    try {
        Publish-Completion $fixture
        $marker = [string](@(Invoke-External git @('-C', $fixture.Task, 'rev-parse', '--git-path', $operation))[0])
        Write-Utf8NoBom $marker $fixture.Commit
        Expect-Failure $fixture { Invoke-Completion $fixture } "unfinished $operation"
    } finally { Remove-Fixture $fixture }
}
$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $marker = [string](@(Invoke-External git @('-C', $fixture.Task, 'rev-parse', '--git-path', 'rebase-merge'))[0])
    New-Item -ItemType Directory -Path $marker | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'unfinished rebase'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture -TaskPath $fixture.Main } 'main worktree removal' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Expect-Failure $fixture { Invoke-Completion $fixture } 'unreachable completion commit' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture -ExpectedBranch 'codex/task-008-wrong' } 'wrong TASK branch' } finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Write-Utf8NoBom (Join-Path $fixture.Main 'main-only.txt') 'divergent'
    Invoke-External git @('-C', $fixture.Main, 'add', 'main-only.txt') | Out-Null
    Invoke-External git @('-C', $fixture.Main, 'commit', '-m', 'divergent main') | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'non-fast-forward main'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try { Publish-Completion $fixture; $env:PFP_TEST_CI_SHA = '0000000000000000000000000000000000000000'; Expect-Failure $fixture { Invoke-Completion $fixture } 'exact CI wrong SHA' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; $env:PFP_TEST_CI_CONCLUSION = 'failure'; Expect-Failure $fixture { Invoke-Completion $fixture } 'exact CI unsuccessful conclusion' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; $env:PFP_TEST_NPM_FAIL_ON = 'verify:launcher'; Expect-Failure $fixture { Invoke-Completion $fixture } 'launcher freshness failure' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; $env:PFP_TEST_NPM_FAIL_ON = 'test:portable'; Expect-Failure $fixture { Invoke-Completion $fixture } 'launcher portable failure' } finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Invoke-Completion $fixture | Out-Null
    $mainHead = [string](@(Invoke-External git @('-C', $fixture.Main, 'rev-parse', 'HEAD'))[0])
    if ($mainHead -cne $fixture.Commit) { throw 'ff-only synchronization did not reach completion commit' }
    $caseNames.Add('ff-only synchronization success')
    if (Test-Path -LiteralPath $fixture.Task) { throw 'safe completion did not remove TASK worktree' }
    $caseNames.Add('safe TASK worktree remove')
    $porcelain = @(Invoke-External git @('-C', $fixture.Main, 'worktree', 'list', '--porcelain')) -join "`n"
    if ($porcelain -match [regex]::Escape($fixture.Task)) { throw 'prune left TASK metadata' }
    $caseNames.Add('worktree prune result')
} finally { Remove-Fixture $fixture }

$expectedCases = @(
    'production mandatory gates have no public bypass', 'unique main worktree', 'wrong main folder',
    'ambiguous named main worktree', 'tracked dirty main', 'untracked main', 'tracked dirty TASK',
    'untracked TASK', 'unfinished MERGE_HEAD', 'unfinished CHERRY_PICK_HEAD', 'unfinished rebase',
    'main worktree removal', 'unreachable completion commit', 'wrong TASK branch', 'non-fast-forward main',
    'exact CI wrong SHA', 'exact CI unsuccessful conclusion', 'launcher freshness failure',
    'launcher portable failure', 'ff-only synchronization success', 'safe TASK worktree remove',
    'worktree prune result'
)
if (($caseNames -join '|') -cne ($expectedCases -join '|')) { throw "completion case mapping mismatch: $($caseNames -join ', ')" }
Write-Output "completion tool simulation: PASS checks=$($caseNames.Count) cases=$($caseNames -join ',')"
