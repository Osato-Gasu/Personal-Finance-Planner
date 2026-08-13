[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryPath,
    [Parameter(Mandatory = $true)][string]$TaskWorktree,
    [Parameter(Mandatory = $true)][ValidatePattern('^TASK-[0-9]+$')][string]$TaskId,
    [Parameter(Mandatory = $true)][string]$ExpectedTaskBranch,
    [Parameter(Mandatory = $true)][string]$CompletionCommit,
    [Parameter(Mandatory = $true)][ValidateRange(1, [long]::MaxValue)][long]$WorkflowRunId
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([string]$Path, [string[]]$Arguments)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & git -C $Path @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) { throw "git $($Arguments -join ' ') failed: $output" }
    return @($output)
}

function Assert-Clean {
    param([string]$Path, [string]$Label)
    $status = @(Invoke-Git $Path @('status', '--porcelain=v1', '--untracked-files=all'))
    if ($status.Count -ne 0) { throw "$Label worktree is not clean or has untracked files" }
    foreach ($marker in @('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply')) {
        $gitPathOutput = @(Invoke-Git $Path @('rev-parse', '--git-path', $marker))
        $gitPath = [string]$gitPathOutput[0]
        if (-not [IO.Path]::IsPathRooted($gitPath)) { $gitPath = Join-Path $Path $gitPath }
        if (Test-Path -LiteralPath $gitPath) { throw "$Label worktree has unfinished operation: $marker" }
    }
}

function Same-Path {
    param([string]$Left, [string]$Right)
    return [string]::Equals(
        [IO.Path]::GetFullPath($Left).TrimEnd([IO.Path]::DirectorySeparatorChar),
        [IO.Path]::GetFullPath($Right).TrimEnd([IO.Path]::DirectorySeparatorChar),
        [StringComparison]::OrdinalIgnoreCase
    )
}

function Invoke-NpmGate {
    param([string]$Path, [string[]]$Arguments, [string]$FailureMessage)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npm --prefix $Path @Arguments
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($exitCode -ne 0) { throw $FailureMessage }
}

$repository = (Resolve-Path -LiteralPath $RepositoryPath).Path
$task = (Resolve-Path -LiteralPath $TaskWorktree).Path
$expectedBranchRef = "refs/heads/$ExpectedTaskBranch"
$taskPrefix = "codex/$($TaskId.ToLowerInvariant())-"
if (-not $ExpectedTaskBranch.StartsWith($taskPrefix, [StringComparison]::Ordinal)) {
    throw 'expected TASK branch does not match TaskId'
}

$records = @()
$current = $null
foreach ($line in (Invoke-Git $repository @('worktree', 'list', '--porcelain'))) {
    if ($line -match '^worktree (.+)$') {
        if ($null -ne $current) { $records += [pscustomobject]$current }
        $current = @{ Path = $Matches[1]; Branch = ''; Head = '' }
    } elseif ($null -ne $current -and $line -match '^branch (.+)$') { $current.Branch = $Matches[1] }
    elseif ($null -ne $current -and $line -match '^HEAD (.+)$') { $current.Head = $Matches[1] }
}
if ($null -ne $current) { $records += [pscustomobject]$current }

$mainBranchRecords = @($records | Where-Object { $_.Branch -ceq 'refs/heads/main' })
if ($mainBranchRecords.Count -ne 1) { throw 'exactly one main branch worktree is required' }
$mainRecord = $mainBranchRecords[0]
if ((Split-Path -Leaf $mainRecord.Path) -cne 'Personal-Finance-Planner') {
    throw 'main branch worktree must be named Personal-Finance-Planner'
}
$main = (Resolve-Path -LiteralPath $mainRecord.Path).Path
if (-not (Same-Path $repository $main)) { throw 'RepositoryPath must identify the unique main worktree' }
if (Same-Path $task $main) { throw 'main worktree must never be removed' }
$taskRecords = @($records | Where-Object { Same-Path $_.Path $task })
if ($taskRecords.Count -ne 1) { throw 'TASK worktree is not registered exactly once' }
if ($taskRecords[0].Branch -cne $expectedBranchRef) { throw 'TASK worktree branch does not match the expected TASK branch' }

# Every repository and user-data precondition is checked before synchronization or removal.
Assert-Clean $main 'main'
Assert-Clean $task 'TASK'
$completion = [string](@(Invoke-Git $task @('rev-parse', "$CompletionCommit^{commit}"))[0])
if ($taskRecords[0].Head -ne $completion) { throw 'TASK worktree HEAD must equal the completion commit' }

Invoke-Git $main @('fetch', 'origin', 'main') | Out-Null
& git -C $main merge-base --is-ancestor $completion 'origin/main'
if ($LASTEXITCODE -ne 0) { throw 'completion commit is not reachable from origin/main' }
& git -C $main merge-base --is-ancestor 'HEAD' 'origin/main'
if ($LASTEXITCODE -ne 0) { throw 'local main cannot be fast-forwarded to origin/main' }

$originMain = [string](@(Invoke-Git $main @('rev-parse', 'origin/main'))[0])
$remoteUrl = [string](@(Invoke-Git $main @('remote', 'get-url', 'origin'))[0])
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$ciJson = & gh run view $WorkflowRunId --repo $remoteUrl --json headSha,conclusion,headBranch,event,name 2>&1
$ciExit = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($ciExit -ne 0) { throw "GitHub Actions lookup failed: $ciJson" }
$ci = ($ciJson | ConvertFrom-Json)
if (
    $ci.headSha -cne $originMain -or
    $ci.conclusion -cne 'success' -or
    $ci.headBranch -cne 'main' -or
    $ci.event -cne 'push' -or
    $ci.name -cne 'Governance CI'
) {
    throw 'origin/main exact Governance CI push run is not successful'
}

# Validate the exact origin/main source in an isolated generated clone so a gate failure
# cannot change the user's main or TASK worktree bytes.
$gateParent = Join-Path ([IO.Path]::GetTempPath()) 'personal-finance-planner-completion-gates'
[IO.Directory]::CreateDirectory($gateParent) | Out-Null
$gate = Join-Path $gateParent ([guid]::NewGuid().ToString('N'))
try {
    & git clone --no-hardlinks --quiet $main $gate
    if ($LASTEXITCODE -ne 0) { throw 'launcher gate clone failed' }
    Invoke-Git $gate @('checkout', '--detach', $originMain) | Out-Null
    Invoke-NpmGate $gate @('ci') 'launcher dependency gate failed'
    Invoke-NpmGate $gate @('run', 'verify:launcher') 'launcher freshness gate failed'
    Invoke-NpmGate $gate @('run', 'test:portable') 'launcher portable smoke failed'
    Assert-Clean $gate 'launcher gate'
} finally {
    if (Test-Path -LiteralPath $gate) {
        $resolvedGate = [IO.Path]::GetFullPath($gate)
        $resolvedParent = [IO.Path]::GetFullPath($gateParent).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
        if (-not $resolvedGate.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'temporary launcher gate path escaped its parent'
        }
        [IO.Directory]::Delete($resolvedGate, $true)
    }
}

Assert-Clean $main 'main before synchronization'
Assert-Clean $task 'TASK before removal'
if ($PSCmdlet.ShouldProcess($main, 'fast-forward local main')) {
    Invoke-Git $main @('merge', '--ff-only', 'origin/main') | Out-Null
    $local = [string](@(Invoke-Git $main @('rev-parse', 'HEAD'))[0])
    if ($local -cne $originMain) { throw 'local main does not equal origin/main' }
}
if ($PSCmdlet.ShouldProcess($task, 'remove completed TASK worktree')) {
    Invoke-Git $main @('worktree', 'remove', $task) | Out-Null
    Invoke-Git $main @('worktree', 'prune') | Out-Null
    if (Test-Path -LiteralPath $task) { throw 'TASK worktree still exists after removal' }
    $remaining = @(Invoke-Git $main @('worktree', 'list', '--porcelain')) -join "`n"
    if ($remaining -match [regex]::Escape($task)) { throw 'TASK worktree metadata remains after prune' }
}

Write-Output "completion local flow: PASS task=$TaskId branch=$ExpectedTaskBranch main=$main completion=$completion task_removed=$task"
