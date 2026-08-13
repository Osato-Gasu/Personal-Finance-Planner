[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryPath,
    [Parameter(Mandatory = $true)][string]$TaskWorktree,
    [Parameter(Mandatory = $true)][string]$CompletionCommit,
    [long]$WorkflowRunId,
    [switch]$SkipFetch,
    [switch]$SkipLauncherGate,
    [switch]$SkipCiGate
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

$repository = (Resolve-Path -LiteralPath $RepositoryPath).Path
$task = (Resolve-Path -LiteralPath $TaskWorktree).Path
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

$mainRecords = @($records | Where-Object { $_.Branch -eq 'refs/heads/main' -and (Split-Path -Leaf $_.Path) -eq 'Personal-Finance-Planner' })
if ($mainRecords.Count -ne 1) { throw 'exactly one main worktree named Personal-Finance-Planner is required' }
$main = (Resolve-Path -LiteralPath $mainRecords[0].Path).Path
if ($task -eq $main) { throw 'main worktree must never be removed' }
$taskRecords = @($records | Where-Object { (Resolve-Path -LiteralPath $_.Path).Path -eq $task })
if ($taskRecords.Count -ne 1) { throw 'TASK worktree is not registered exactly once' }

# All destructive-operation preconditions are checked before synchronization/removal.
Assert-Clean $main 'main'
Assert-Clean $task 'TASK'
$completionOutput = @(Invoke-Git $task @('rev-parse', "$CompletionCommit^{commit}"))
$completion = [string]$completionOutput[0]
if ($taskRecords[0].Head -ne $completion) { throw 'TASK worktree HEAD must equal the completion commit' }
if (-not $SkipFetch) { Invoke-Git $main @('fetch', 'origin', 'main') | Out-Null }
& git -C $main merge-base --is-ancestor $completion 'origin/main'
if ($LASTEXITCODE -ne 0) { throw 'completion commit is not reachable from origin/main' }
& git -C $main merge-base --is-ancestor 'HEAD' 'origin/main'
if ($LASTEXITCODE -ne 0) { throw 'local main cannot be fast-forwarded to origin/main' }
if (-not $SkipCiGate) {
    if ($WorkflowRunId -le 0) { throw 'exact origin/main workflow run ID is required' }
    $remoteUrl = [string](@(Invoke-Git $main @('remote', 'get-url', 'origin'))[0])
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $ciJson = & gh run view $WorkflowRunId --repo $remoteUrl --json headSha,conclusion 2>&1
    $ciExit = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($ciExit -ne 0) { throw "GitHub Actions lookup failed: $ciJson" }
    $ci = ($ciJson | ConvertFrom-Json)
    $originMain = [string](@(Invoke-Git $main @('rev-parse', 'origin/main'))[0])
    if ($ci.headSha -ne $originMain -or $ci.conclusion -ne 'success') { throw 'origin/main exact GitHub Actions run is not successful' }
}

if ($PSCmdlet.ShouldProcess($main, 'fast-forward local main and validate launcher')) {
    Invoke-Git $main @('merge', '--ff-only', 'origin/main') | Out-Null
    $local = [string](@(Invoke-Git $main @('rev-parse', 'HEAD'))[0])
    $remote = [string](@(Invoke-Git $main @('rev-parse', 'origin/main'))[0])
    if ($local -ne $remote) { throw 'local main does not equal origin/main' }
    if (-not $SkipLauncherGate) {
        & npm --prefix $main run verify:launcher
        if ($LASTEXITCODE -ne 0) { throw 'launcher freshness gate failed' }
        & npm --prefix $main run test:portable
        if ($LASTEXITCODE -ne 0) { throw 'launcher portable smoke failed' }
        Assert-Clean $main 'main after launcher gate'
    }
}

if ($PSCmdlet.ShouldProcess($task, 'remove completed TASK worktree')) {
    Invoke-Git $main @('worktree', 'remove', $task) | Out-Null
    Invoke-Git $main @('worktree', 'prune') | Out-Null
    if (Test-Path -LiteralPath $task) { throw 'TASK worktree still exists after removal' }
}

Write-Output "completion local flow: PASS main=$main completion=$completion task_removed=$task"
