[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$tool = Join-Path $PSScriptRoot 'complete-task-local.ps1'
$checks = 0

function Invoke-External {
    param([string]$Command, [string[]]$Arguments)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $Command @Arguments 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) { throw "$Command failed: $($Arguments -join ' ')" }
}

function New-Fixture {
    $root = Join-Path ([IO.Path]::GetTempPath()) ("pfp-completion-" + [guid]::NewGuid().ToString('N'))
    $main = Join-Path $root 'Personal-Finance-Planner'
    $remote = Join-Path $root 'remote.git'
    $task = Join-Path $root 'task-worktree'
    New-Item -ItemType Directory -Path $root | Out-Null
    Invoke-External git @('init', '--bare', $remote)
    Invoke-External git @('init', '-b', 'main', $main)
    Invoke-External git @('-C', $main, 'config', 'user.email', 'test@example.invalid')
    Invoke-External git @('-C', $main, 'config', 'user.name', 'Completion Test')
    Set-Content -LiteralPath (Join-Path $main 'tracked.txt') -Value 'initial' -NoNewline
    Invoke-External git @('-C', $main, 'add', 'tracked.txt')
    Invoke-External git @('-C', $main, 'commit', '-m', 'initial')
    Invoke-External git @('-C', $main, 'remote', 'add', 'origin', $remote)
    Invoke-External git @('-C', $main, 'push', '-u', 'origin', 'main')
    Invoke-External git @('-C', $main, 'worktree', 'add', '-b', 'codex/test-task', $task)
    Set-Content -LiteralPath (Join-Path $task 'tracked.txt') -Value 'complete' -NoNewline
    Invoke-External git @('-C', $task, 'add', 'tracked.txt')
    Invoke-External git @('-C', $task, 'commit', '-m', 'complete')
    $commit = (& git -C $task rev-parse HEAD).Trim()
    return [pscustomobject]@{ Root = $root; Main = $main; Remote = $remote; Task = $task; Commit = $commit }
}

function Expect-Failure {
    param([scriptblock]$Action, [string]$Label)
    $failed = $false
    try { & $Action } catch { $failed = $true }
    if (-not $failed) { throw "expected failure: $Label" }
    $script:checks++
}

function Remove-Fixture {
    param($Fixture)
    if (Test-Path -LiteralPath $Fixture.Root) { Remove-Item -LiteralPath $Fixture.Root -Recurse -Force }
}

$fixture = New-Fixture
try {
    Expect-Failure { & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Main -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate } 'main removal'
    New-Item -ItemType File -Path (Join-Path $fixture.Task 'user-owned.txt') | Out-Null
    Expect-Failure { & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Task -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate } 'dirty task'
    Remove-Item -LiteralPath (Join-Path $fixture.Task 'user-owned.txt')
    $mergeHead = (& git -C $fixture.Task rev-parse --git-path MERGE_HEAD).Trim()
    Set-Content -LiteralPath $mergeHead -Value $fixture.Commit -NoNewline
    Expect-Failure { & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Task -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate } 'unfinished operation'
    Remove-Item -LiteralPath $mergeHead
    Expect-Failure { & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Task -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate } 'unreachable completion'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Invoke-External git @('-C', $fixture.Task, 'push', 'origin', 'HEAD:main')
    New-Item -ItemType File -Path (Join-Path $fixture.Main 'user-owned.txt') | Out-Null
    Expect-Failure { & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Task -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate } 'untracked main'
} finally { Remove-Fixture $fixture }

$fixture = New-Fixture
try {
    Invoke-External git @('-C', $fixture.Task, 'push', 'origin', 'HEAD:main')
    & $tool -RepositoryPath $fixture.Main -TaskWorktree $fixture.Task -CompletionCommit $fixture.Commit -SkipLauncherGate -SkipCiGate | Out-Null
    if ($LASTEXITCODE -ne 0 -or (Test-Path -LiteralPath $fixture.Task)) { throw 'safe completion failed' }
    $checks++
} finally { Remove-Fixture $fixture }

Write-Output "completion tool simulation: PASS checks=$checks"
