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
echo {"headSha":"%PFP_TEST_CI_SHA%","conclusion":"%PFP_TEST_CI_CONCLUSION%","headBranch":"%PFP_TEST_CI_BRANCH%","event":"%PFP_TEST_CI_EVENT%","name":"%PFP_TEST_CI_NAME%"}
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
    $env:PFP_TEST_CI_BRANCH = 'main'
    $env:PFP_TEST_CI_EVENT = 'push'
    $env:PFP_TEST_CI_NAME = 'Governance CI'
    $env:PFP_TEST_NPM_FAIL_ON = ''
    return [pscustomobject]@{ Root = $root; Main = $main; Remote = $remote; Task = $task; Commit = $commit; Branch = 'codex/task-008-fixture'; UserOwnedPaths = @() }
}

function Add-IgnoredUserOwnedFiles {
    param($Fixture)
    $relativePath = 'ci-user-owned.bin'
    $exclude = [string](@(Invoke-External git @('-C', $Fixture.Main, 'rev-parse', '--git-path', 'info/exclude'))[0])
    if (-not [IO.Path]::IsPathRooted($exclude)) { $exclude = Join-Path $Fixture.Main $exclude }
    [IO.File]::AppendAllText($exclude, "`n$relativePath`n", (New-Object Text.UTF8Encoding($false)))
    $mainUserFile = Join-Path $Fixture.Main $relativePath
    $taskUserFile = Join-Path $Fixture.Task $relativePath
    Write-Utf8NoBom $mainUserFile 'main-user-owned-before-ci-failure'
    Write-Utf8NoBom $taskUserFile 'task-user-owned-before-ci-failure'
    $Fixture.UserOwnedPaths = @($mainUserFile, $taskUserFile)
}

function Publish-Completion {
    param($Fixture)
    Invoke-External git @('-C', $Fixture.Task, 'push', 'origin', 'HEAD:main') | Out-Null
    $env:PFP_TEST_CI_SHA = $Fixture.Commit
}

function Invoke-Completion {
    param($Fixture, [string]$RepositoryPath = '', [string]$TaskPath = '', [string]$ExpectedBranch = '', [switch]$WhatIf)
    if ([string]::IsNullOrEmpty($RepositoryPath)) { $RepositoryPath = $Fixture.Main }
    if ([string]::IsNullOrEmpty($TaskPath)) { $TaskPath = $Fixture.Task }
    if ([string]::IsNullOrEmpty($ExpectedBranch)) { $ExpectedBranch = $Fixture.Branch }
    & $tool -RepositoryPath $RepositoryPath -TaskWorktree $TaskPath -TaskId 'TASK-008' -ExpectedTaskBranch $ExpectedBranch -CompletionCommit $Fixture.Commit -WorkflowRunId 1 -WhatIf:$WhatIf
}

function Add-ExcludedSameNameWorktree {
    param($Fixture)
    $other = Join-Path (Join-Path $Fixture.Root 'other') 'Personal-Finance-Planner'
    Invoke-External git @('-C', $Fixture.Main, 'worktree', 'add', '-b', 'codex/unrelated-same-name', $other, 'HEAD') | Out-Null
    Write-Utf8NoBom (Join-Path $other 'tracked.txt') 'unrelated-dirty-tracked'
    Write-Utf8NoBom (Join-Path $other 'manifest.yml') 'unrelated-untracked-manifest'
    $marker = [string](@(Invoke-External git @('-C', $other, 'rev-parse', '--git-path', 'MERGE_HEAD'))[0])
    if (-not [IO.Path]::IsPathRooted($marker)) { $marker = Join-Path $other $marker }
    Write-Utf8NoBom $marker $Fixture.Commit
    return [pscustomobject]@{ Path = $other; Marker = $marker }
}

function Get-ExcludedWorktreeSnapshot {
    param($Fixture, $Excluded)
    $records = (@(Invoke-External git @('-C', $Fixture.Main, 'worktree', 'list', '--porcelain')) -join "`n") -split "`n`n"
    $excludedRecord = ([string](@($records | Where-Object { $_ -match '(?m)^branch refs/heads/codex/unrelated-same-name$' } | Select-Object -First 1)[0])).Trim()
    if ([string]::IsNullOrWhiteSpace($excludedRecord)) { throw 'excluded same-name worktree registration is missing' }
    return [ordered]@{
        Tracked = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Excluded.Path 'tracked.txt')))
        Manifest = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Excluded.Path 'manifest.yml')))
        Marker = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Excluded.Marker))
        Status = (@(Invoke-External git @('-C', $Excluded.Path, 'status', '--porcelain=v2', '--branch', '--untracked-files=all')) -join "`n")
        Head = [string](@(Invoke-External git @('-C', $Excluded.Path, 'rev-parse', 'HEAD'))[0])
        Branch = [string](@(Invoke-External git @('-C', $Excluded.Path, 'symbolic-ref', 'HEAD'))[0])
        WorktreeRecord = $excludedRecord
    }
}

function Assert-ExcludedWorktreePreserved {
    param($Fixture, $Excluded, $Snapshot)
    if (-not (Test-Path -LiteralPath $Excluded.Path -PathType Container)) { throw 'excluded same-name worktree was removed' }
    $actual = Get-ExcludedWorktreeSnapshot $Fixture $Excluded
    foreach ($key in $Snapshot.Keys) {
        if ([string]$actual[$key] -cne [string]$Snapshot[$key]) { throw "excluded same-name worktree changed: $key" }
    }
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
    $files = @{}
    $paths += @($Fixture.UserOwnedPaths)
    foreach ($path in @($paths | Select-Object -Unique)) {
        $files[$path] = if (Test-Path -LiteralPath $path -PathType Leaf) {
            [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
        } else { $null }
    }
    return [ordered]@{
        Files = $files
        MainStatus = (@(Invoke-External git @('-C', $Fixture.Main, 'status', '--porcelain=v2', '--branch', '--untracked-files=all')) -join "`n")
        MainHead = [string](@(Invoke-External git @('-C', $Fixture.Main, 'rev-parse', 'HEAD'))[0])
        MainBranch = [string](@(Invoke-External git @('-C', $Fixture.Main, 'rev-parse', '--symbolic-full-name', 'HEAD'))[0])
        TaskStatus = (@(Invoke-External git @('-C', $Fixture.Task, 'status', '--porcelain=v2', '--branch', '--untracked-files=all')) -join "`n")
        TaskHead = [string](@(Invoke-External git @('-C', $Fixture.Task, 'rev-parse', 'HEAD'))[0])
        TaskBranch = [string](@(Invoke-External git @('-C', $Fixture.Task, 'rev-parse', '--symbolic-full-name', 'HEAD'))[0])
        WorktreeRecords = (@(Invoke-External git @('-C', $Fixture.Main, 'worktree', 'list', '--porcelain')) -join "`n")
    }
}

function Assert-Preserved {
    param($Fixture, $Snapshot)
    if (-not (Test-Path -LiteralPath $Fixture.Main -PathType Container)) { throw 'main worktree was removed on failure' }
    if (-not (Test-Path -LiteralPath $Fixture.Task -PathType Container)) { throw 'TASK worktree was removed on failure' }
    foreach ($path in $Snapshot.Files.Keys) {
        $actual = if (Test-Path -LiteralPath $path -PathType Leaf) {
            [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
        } else { $null }
        if ($actual -cne $Snapshot.Files[$path]) { throw "failure changed protected bytes: $path" }
    }
    $actualState = Get-PreservationSnapshot $Fixture
    foreach ($key in @('MainStatus', 'MainHead', 'MainBranch', 'TaskStatus', 'TaskHead', 'TaskBranch', 'WorktreeRecords')) {
        if ([string]$actualState[$key] -cne [string]$Snapshot[$key]) { throw "failure changed protected worktree state: $key" }
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
    $env:PFP_TEST_CI_BRANCH = $null
    $env:PFP_TEST_CI_EVENT = $null
    $env:PFP_TEST_CI_NAME = $null
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
$fixture = New-Fixture -MainName 'personal-finance-planner'
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture } 'wrong-case main folder' } finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Invoke-External git @('-C', $fixture.Main, 'checkout', '--detach') | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'missing main branch worktree'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Invoke-External git @('-C', $fixture.Main, 'branch', '-m', 'main', 'main-case-transition') | Out-Null
    Invoke-External git @('-C', $fixture.Main, 'branch', '-m', 'main-case-transition', 'Main') | Out-Null
    $branch = [string](@(Invoke-External git @('-C', $fixture.Main, 'symbolic-ref', 'HEAD'))[0])
    if ($branch -cne 'refs/heads/Main') { throw "wrong-case branch fixture is not exact: $branch" }
    Expect-Failure $fixture { Invoke-Completion $fixture } 'wrong-case main branch ref'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $duplicate = Join-Path $fixture.Root 'duplicate-main'
    Invoke-External git @('-C', $fixture.Main, 'worktree', 'add', '--detach', $duplicate, 'HEAD') | Out-Null
    Invoke-External git @('-C', $duplicate, 'checkout', '--ignore-other-worktrees', 'main') | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'multiple main branch worktrees'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $excluded = Add-ExcludedSameNameWorktree $fixture
    $snapshot = Get-ExcludedWorktreeSnapshot $fixture $excluded
    Invoke-Completion $fixture | Out-Null
    Assert-ExcludedWorktreePreserved $fixture $excluded $snapshot
    $caseNames.Add('same-name non-main worktree excluded and preserved')
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $excluded = Add-ExcludedSameNameWorktree $fixture
    $snapshot = Get-ExcludedWorktreeSnapshot $fixture $excluded
    $env:PFP_TEST_CI_CONCLUSION = 'failure'
    Expect-Failure $fixture { Invoke-Completion $fixture } 'same-name non-main worktree preserved on CI failure'
    Assert-ExcludedWorktreePreserved $fixture $excluded $snapshot
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
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture -RepositoryPath $fixture.Task } 'RepositoryPath mismatch' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try {
    Publish-Completion $fixture
    $excluded = Add-ExcludedSameNameWorktree $fixture
    $snapshot = Get-ExcludedWorktreeSnapshot $fixture $excluded
    Expect-Failure $fixture { Invoke-Completion $fixture -RepositoryPath $excluded.Path } 'RepositoryPath same-name non-main mismatch'
    Assert-ExcludedWorktreePreserved $fixture $excluded $snapshot
} finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Expect-Failure $fixture { Invoke-Completion $fixture } 'unreachable completion commit' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Expect-Failure $fixture { Invoke-Completion $fixture -ExpectedBranch 'codex/task-008-wrong' } 'wrong TASK branch' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Write-Utf8NoBom (Join-Path $fixture.Task 'head-mismatch.txt') 'different HEAD'
    Invoke-External git @('-C', $fixture.Task, 'add', 'head-mismatch.txt') | Out-Null
    Invoke-External git @('-C', $fixture.Task, 'commit', '-m', 'different HEAD') | Out-Null
    Expect-Failure $fixture { Invoke-Completion $fixture } 'TASK HEAD identity mismatch'
} finally { Remove-Fixture $fixture }

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
try { Publish-Completion $fixture; Add-IgnoredUserOwnedFiles $fixture; $env:PFP_TEST_CI_BRANCH = 'codex/task-008-fixture'; Expect-Failure $fixture { Invoke-Completion $fixture } 'exact CI wrong branch' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; Add-IgnoredUserOwnedFiles $fixture; $env:PFP_TEST_CI_EVENT = 'pull_request'; Expect-Failure $fixture { Invoke-Completion $fixture } 'exact CI wrong event' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try { Publish-Completion $fixture; $env:PFP_TEST_CI_NAME = 'Other CI'; Expect-Failure $fixture { Invoke-Completion $fixture } 'exact CI wrong workflow' } finally { Remove-Fixture $fixture }
$fixture = New-Fixture
try {
    Publish-Completion $fixture
    Invoke-Completion $fixture -WhatIf | Out-Null
    if (-not (Test-Path -LiteralPath $fixture.Task)) { throw 'valid main push CI WhatIf removed the TASK worktree' }
    $caseNames.Add('exact main push Governance CI success')
} finally { Remove-Fixture $fixture }
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
    'production mandatory gates have no public bypass', 'unique main worktree', 'wrong main folder', 'wrong-case main folder',
    'missing main branch worktree', 'wrong-case main branch ref', 'multiple main branch worktrees',
    'same-name non-main worktree excluded and preserved', 'same-name non-main worktree preserved on CI failure',
    'tracked dirty main', 'untracked main', 'tracked dirty TASK',
    'untracked TASK', 'unfinished MERGE_HEAD', 'unfinished CHERRY_PICK_HEAD', 'unfinished rebase',
    'main worktree removal', 'RepositoryPath mismatch', 'RepositoryPath same-name non-main mismatch',
    'unreachable completion commit', 'wrong TASK branch',
    'TASK HEAD identity mismatch', 'non-fast-forward main',
    'exact CI wrong SHA', 'exact CI unsuccessful conclusion', 'exact CI wrong branch',
    'exact CI wrong event', 'exact CI wrong workflow', 'exact main push Governance CI success', 'launcher freshness failure',
    'launcher portable failure', 'ff-only synchronization success', 'safe TASK worktree remove',
    'worktree prune result'
)
if (($caseNames -join '|') -cne ($expectedCases -join '|')) { throw "completion case mapping mismatch: $($caseNames -join ', ')" }
Write-Output "completion tool simulation: PASS checks=$($caseNames.Count) cases=$($caseNames -join ',')"
