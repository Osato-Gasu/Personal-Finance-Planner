#!/usr/bin/env pwsh
# Shared 3.0 tool entry. PowerShell 7+, Linux and Windows. Rules: ../RULES.md
#   core: check | task start|status|list|hash | pin check|plan|apply | push | recover | sync | init-project | ci-recommend
#   gate tools (optional, tools/gate/): evidence append|verify | gate | merge | release verify|tag | authority
# Exit codes: 0 OK, 1 FAIL, 2 BLOCKED (needs a decision/authority), 3 UNKNOWN outcome (stop), 4 CONFLICT.
[CmdletBinding()]
param(
    [Parameter(Position = 0)][string]$Command = 'help',
    [Parameter(Position = 1)][string]$Sub = '',
    [string]$Root = '.',
    [string]$Id = '', [string]$Title = '', [string]$Kind = '', [string]$To = '', [string]$Type = '', [string]$Data = '{}',
    [string]$Base = '', [string]$Repo = '', [int]$Pr = 0, [string]$Expect = '', [string]$ExpectSha = '', [string]$Snapshot = '',
    [string]$Version = '', [string]$Sha = '', [string]$SharedRoot = '', [string]$Branch = '', [string]$Remote = 'origin',
    [switch]$Resume, [switch]$PostStatus, [switch]$IncludeGate, [switch]$PreviousHead, [switch]$All, [switch]$AcknowledgeMigration, [switch]$AcknowledgeConsumers, [switch]$Json
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($PSVersionTable.PSVersion.Major -lt 7) { Write-Error 'PowerShell 7+ (pwsh) is required.'; exit 1 }
# Core tools: always loaded. They need neither GitHub Actions nor a second GitHub identity.
foreach ($lib in 'common', 'git', 'task', 'policy', 'project', 'pin', 'check', 'ci', 'sync') { . (Join-Path $PSScriptRoot "lib/$lib.ps1") }
# Gate tools (gate, merge, release, authority, evidence): optional. A checkout without tools/gate/ runs the core commands only.
$script:GateAvailable = Test-Path -LiteralPath (Join-Path $PSScriptRoot 'gate/lib') -PathType Container
if ($script:GateAvailable) { foreach ($lib in 'evidence', 'policy-gate', 'gate', 'github', 'readiness') { . (Join-Path $PSScriptRoot "gate/lib/$lib.ps1") } }

function Assert-GateTools {
    param([string]$What)
    if (-not $script:GateAvailable) { throw (New-SharedError -Reason 'GATE_NOT_INSTALLED' -Message "'$What' needs the gate tools (tools/gate/), which this checkout does not have." -Code 2) }
}

function Write-Result {
    param($Object, [string]$Text)
    if ($Json) { $Object | ConvertTo-Json -Depth 8 } else { $Text }
}

function Get-ProjectSharedPin { param([string]$R) $lp = Get-LockPath $R; if (Test-Path $lp) { return [string](Read-Lock $lp)['source_commit'] } return '' }

function Get-GateInputs {
    # M1: a live read is judged with the LIVE base branch's policy and registry (never the PR's, never the local checkout).
    # A snapshot file is an offline PREVIEW and uses the local checkout's files; it can never post or merge.
    param($Live, [string]$R, [string]$SnapshotFile, [string]$RepoName, [int]$PrNumber)
    if ($SnapshotFile) { return @{ Policy = (Read-Policy -Root $R); Authority = (Read-Authority -Root $R); Snapshot = (Read-JsonFile $SnapshotFile) } }
    return @{ Policy = $Live.Policy; Authority = $Live.Authority; Snapshot = (Get-PrSnapshot -Repo $RepoName -Pr $PrNumber -Policy $Live.Policy) }
}

try {
    $R = [System.IO.Path]::GetFullPath($Root)
    # This repository's own policy decides which branches the tools never write and which GitHub repository it is.
    if (Test-Path -LiteralPath (Join-Path $R 'policy.json')) {
        $localPolicy = Read-Policy -Root $R
        Set-ProtectedBranches -Patterns (@([string](Get-Prop $localPolicy 'base_branch' '')) + @(ConvertTo-StringArray (Get-Prop $localPolicy 'protected_branches' @())))
        $script:ExpectedRepository = [string](Get-Prop $localPolicy 'repository' '')
    }
    switch ($Command) {
        'check' {
            $findings = @(Invoke-Check -Root $R -Base $Base -SharedRoot $SharedRoot -LiveRepo $Repo -PreviousHead:$PreviousHead)
            $fails = @($findings | Where-Object Level -eq 'FAIL')
            $lines = $findings | ForEach-Object { "{0} {1}: {2}" -f $_.Level, $_.Code, $_.Message }
            Write-Result @{ result = $(if ($fails.Count) { 'FAIL' } else { 'PASS' }); findings = $findings } ((@("RESULT: $(if ($fails.Count) { 'FAIL' } else { 'PASS' }) ($($fails.Count) fail, $(@($findings | Where-Object Level -eq 'WARN').Count) warn)") + $lines) -join "`n")
            exit $(if ($fails.Count) { 1 } else { 0 })
        }
        'sync' {
            if ($SharedRoot -eq '') { throw (New-SharedError -Reason 'USAGE' -Message 'sync -Root <project> -SharedRoot <Shared checkout at the pinned commit> [-IncludeGate]') }
            $s = Invoke-Sync -ProjectRoot $R -SharedRoot ([System.IO.Path]::GetFullPath($SharedRoot)) -IncludeGate:$IncludeGate
            Write-Result $s "RESULT: SYNCED $($s.Commit) ($($s.Files) files, $($s.Copied) written, $($s.Removed) removed). Review and commit them; nothing was committed."
        }
        'init-project' {
            if ($SharedRoot -eq '') { throw (New-SharedError -Reason 'USAGE' -Message 'init-project -Root <project> -SharedRoot <Shared checkout> [-IncludeGate]') }
            $i = Invoke-InitProject -ProjectRoot $R -SharedRoot ([System.IO.Path]::GetFullPath($SharedRoot)) -IncludeGate:$IncludeGate
            Write-Result $i ((@("RESULT: INITIALISED created=$(@($i.Created).Count) kept=$(@($i.Kept).Count) synced=$($i.Sync.Files) files at $($i.Sync.Commit)") + (@($i.Created) | ForEach-Object { "  created: $_" }) + (@($i.Kept) | ForEach-Object { "  kept (already there): $_" })) -join "`n")
        }
        'ci-recommend' {
            $front = Read-ProjectFront -Root $R
            $recommend = @(Get-ProjectStringList $front 'ci_recommend_paths')
            if (Test-Path -LiteralPath (Join-Path $R 'policy.json')) { $recommend += 'tools/**' }   # the Shared repository: a change to its tools is worth a Windows run
            $changed = @(Get-ChangedPaths -Root $R -Base $(if ($Base) { $Base } else { 'origin/main' }) -Head $(if ($Expect) { $Expect } else { 'HEAD' }))
            $v = Get-CiRecommendation -ChangedPaths $changed -RecommendPaths $recommend -SkipPaths @(Get-ProjectStringList $front 'ci_skip_paths')
            $label = switch ($v.Verdict) { 'RECOMMEND' { 'CI: 推奨' } 'NOT_NEEDED' { 'CI: 不要' } default { 'CI: 判断が要る' } }
            Write-Result @{ verdict = $v.Verdict; reason = $v.Reason; matched = $v.Matched; changed = $changed.Count } "$label（$($v.Reason)）"
        }
        'task' {
            switch ($Sub) {
                'start' {
                    if ($Resume) {
                        if ($Title -ne '' -or $Kind -ne '') { throw (New-SharedError -Reason 'USAGE' -Message 'task start -Resume takes the TASK from the branch: do not pass -Title or -Kind.' -Code 2) }
                        $r = Resume-Task -Root $R -TaskId $Id -Base $(if ($Base) { $Base } else { 'main' }) -Remote $Remote -ExpectSha $ExpectSha
                        Write-Result $r "RESULT: RESUMED $Id on work/$Id at $($r.Sha)"
                        break
                    }
                    # The TASK number band (frozen_task_max, task_id_min) protects the Shared repository's own 2.x numbers: only a repository with its own policy.json applies it.
                    $pf = if (Test-Path -LiteralPath (Join-Path $R 'policy.json')) { Join-Path $R 'policy.json' } else { '' }
                    $r = Start-Task -Root $R -TaskId $Id -Title $Title -Kind $Kind -Base $(if ($Base) { $Base } else { 'main' }) -Remote $Remote -Policy $(if ($pf) { Read-JsonFile $pf } else { $null })
                    Write-Result $r "RESULT: CLAIMED $Id on work/$Id at $($r.Sha)"
                }
                'status' {
                    $t = Read-Task -Root $R -TaskId $Id
                    Assert-TaskTransition -From $t.Status -To $To
                    Set-TaskFrontValue -Path (Get-TaskPath $R $Id) -Key 'status' -Value $To
                    if (Get-Command Add-TaskEvent -ErrorAction SilentlyContinue) {
                        $head = (Invoke-Git -Dir $R -GitArgs @('rev-parse', 'HEAD')).Trim()
                        Add-TaskEvent -Root $R -TaskId $Id -Type 'status' -Commit $head -Data @{ from = $t.Status; to = $To } | Out-Null
                    }
                    Write-Result @{ id = $Id; status = $To } "RESULT: $Id $($t.Status) -> $To"
                }
                'hash' { $t = Read-Task -Root $R -TaskId $Id; Write-Result @{ id = $Id; spec = (Get-SpecHash $t) } "spec=$(Get-SpecHash $t)" }
                'list' { $rows = @(Get-AllTasks -Root $R); Write-Result $rows (($rows | ForEach-Object { "{0,-10} {1,-9} {2,-8} {3}" -f $_.Id, $_.Status, $_.Kind, $_.Title }) -join "`n") }
                default { throw (New-SharedError -Reason 'USAGE' -Message 'task start|status|list|hash')}
            }
        }
        'evidence' {
            Assert-GateTools evidence
            switch ($Sub) {
                'append' {
                    $head = if (Test-Path (Join-Path $R '.git')) { (Invoke-Git -Dir $R -GitArgs @('rev-parse', 'HEAD')).Trim() } else { '' }
                    $d = @{}; foreach ($p in ((ConvertFrom-Json $Data -AsHashtable).GetEnumerator())) { $d[$p.Key] = $p.Value }
                    $e = Add-TaskEvent -Root $R -TaskId $Id -Type $Type -Data $d -Commit $head
                    Write-Result $e "RESULT: appended seq $($e.seq) ($Type) to $Id"
                }
                'verify' { $c = Test-EventChain -Path (Get-EventsPath $R $Id); Write-Result $c "RESULT: $($c.Status) $($c.Reason)"; if ($c.Status -eq 'BROKEN') { exit 1 } }
                default { throw (New-SharedError -Reason 'USAGE' -Message 'evidence append|verify') }
            }
        }
        'gate' {
            Assert-GateTools gate
            if (-not (Test-RepoName $Repo) -and -not $Snapshot) { throw (New-SharedError -Reason 'USAGE' -Message 'gate needs -Repo owner/name') }
            if ($PostStatus) {
                if ($Snapshot) { throw (New-SharedError -Reason 'PREVIEW_ONLY' -Message 'A snapshot file is a preview; only a live GitHub read may post the gate check.' -Code 2) }
                if ($env:GITHUB_ACTIONS -ne 'true') { throw (New-SharedError -Reason 'NOT_IN_ACTIONS' -Message 'The gate check is posted only by the trusted gate workflow (default-branch code, GITHUB_TOKEN).' -Code 2) }
            }
            $live = if ($Snapshot) { $null } else { Get-LiveBaseInputs -Repo $Repo }
            $ctxPolicy = if ($null -ne $live) { $live.Policy } else { Read-Policy -Root $R }
            # Phase A kill switch (RULES §3): while autonomous writes are not enabled on the live base, -PostStatus still evaluates
            # read-only, but no check run is posted (the verdict is only printed). Judged on the raw policy text.
            $policyText = if ($null -ne $live) { $live.PolicyText } else { Read-PolicyText -Root $R }
            $postEnabled = [bool]($PostStatus -and (Test-AutonomousWritesEnabled -PolicyText $policyText))
            $phaseAOff = [bool]($PostStatus -and -not $postEnabled)
            $prNumbers = @($Pr)
            $errors = 0
            if ($All) {
                if ($Snapshot) { throw (New-SharedError -Reason 'USAGE' -Message '-All reads live PRs; it cannot take a snapshot.') }
                $baseName = [string](Get-Prop $ctxPolicy 'base_branch' 'main')
                $prNumbers = @(@(Get-GitHubPages -Path "/repos/$Repo/pulls?state=open&base=$baseName") | ForEach-Object { [int]$_.number })
                if ($prNumbers.Count -eq 0) { Write-Result @{ result = 'NO_OPEN_PR' } 'RESULT: NO_OPEN_PR'; exit 0 }
            }
            elseif ($Pr -eq 0 -and -not $Snapshot) {
                # CI finished for a commit: re-evaluate every open PR whose head is exactly that commit.
                Assert-Sha40 $Sha 'gate -Sha'
                $prNumbers = @(@(Get-GitHubPages -Path "/repos/$Repo/commits/$Sha/pulls") | Where-Object { $_.state -eq 'open' -and $_.head.sha -ceq $Sha } | ForEach-Object { [int]$_.number })
                if ($prNumbers.Count -eq 0) { Write-Result @{ result = 'NO_OPEN_PR' } 'RESULT: NO_OPEN_PR'; exit 0 }
            }
            $worst = 0
            foreach ($n in $prNumbers) {
                try {
                    $in = Get-GateInputs -Live $live -R $R -SnapshotFile $Snapshot -RepoName $Repo -PrNumber $n
                    $g = Invoke-Gate -Snapshot $in.Snapshot -Policy $in.Policy -Authority $in.Authority -ExpectSha $Expect
                    if ($postEnabled) {
                        # M-5: the state is read AGAIN immediately before posting, and the check carries the verdict of that read.
                        # Posted only if the head is still the one that was read; otherwise the next event owns the verdict.
                        $fresh = Get-GateInputs -Live $live -R $R -SnapshotFile '' -RepoName $Repo -PrNumber $n
                        $g = Invoke-Gate -Snapshot $fresh.Snapshot -Policy $fresh.Policy -Authority $fresh.Authority -ExpectSha $Expect
                        $nowHead = [string](Invoke-GitHubApi -Path "/repos/$Repo/pulls/$n").head.sha
                        if ($nowHead -ceq $g.HeadSha) { Publish-GateCheck -Repo $Repo -Sha $g.HeadSha -Gate $g }
                    }
                } catch {
                    # The PR moved while it was being read: the event for the new head owns the verdict; post nothing here.
                    if ($_.Exception.Data.Contains('Reason') -and $_.Exception.Data['Reason'] -eq 'SNAPSHOT_STALE') { Write-Result @{ result = 'STALE' } "RESULT: STALE PR $n changed while being read; the next event re-evaluates it."; continue }
                    # A crashed gate must never leave an older success standing on the same sha.
                    if ($postEnabled) {
                        try {
                            $h = [string](Invoke-GitHubApi -Path "/repos/$Repo/pulls/$n").head.sha
                            $reason = if ($_.Exception.Data.Contains('Reason')) { $_.Exception.Data['Reason'] } else { 'UNEXPECTED' }
                            if (Test-Sha40 $h) { Publish-GateCheck -Repo $Repo -Sha $h -Gate ([pscustomobject]@{ Verdict = 'BLOCKED'; Tier = '?'; Missing = @("GATE_ERROR: $reason"); Context = [string](Get-Prop $ctxPolicy 'gate_context' 'shared/gate') }) }
                        } catch { }
                    }
                    if ($All) { $errors++; [Console]::Error.WriteLine("PR ${n}: $($_.Exception.Message)"); continue }   # one bad PR must not hide the others
                    throw
                }
                Write-Result $g ((@("$(if ($phaseAOff) { 'EVALUATED' } else { 'RESULT:' }) $($g.Verdict) tier=$($g.Tier) head=$($g.HeadSha)") + ($g.TierReasons | ForEach-Object { "  tier: $_" }) + ($g.Satisfied | ForEach-Object { "  ok: $_" }) + ($g.Missing | ForEach-Object { "  MISSING: $_" })) -join "`n")
                if ($g.Verdict -ne 'PASS') { $worst = 2 }
            }
            # With -PostStatus the verdict is carried by the check run; the job itself succeeds.
            if ($errors -gt 0) { exit 1 }
            if ($phaseAOff) {
                $n = @($prNumbers).Count
                Write-Result @{ result = 'POST_DISABLED_PHASE_A'; evaluated = $n } "RESULT: POST_DISABLED_PHASE_A no check run was posted: autonomous_writes is not enabled on the live base ($n PR(s) evaluated read-only)"
                exit 0
            }
            exit $(if ($PostStatus) { 0 } else { $worst })
        }
        'merge' {
            Assert-GateTools merge
            if (-not (Test-RepoName $Repo) -or $Pr -le 0) { throw (New-SharedError -Reason 'USAGE' -Message 'merge -Repo owner/name -Pr <n> [-Expect <head sha>]') }
            if ($Expect -ne '') { Assert-Sha40 $Expect 'merge -Expect' }
            # M1: the policy and the registry are the LIVE base branch's (a relaxed local copy or a PR's own edit cannot change the gate).
            $live = Get-LiveBaseInputs -Repo $Repo
            # M-2 / M2: the tools that run are the base commit's tools, from the checkout that runs; re-checked just before the write
            $prov = Assert-ToolsAreMain -Repo $Repo -Root $R -Sha $live.Sha -ToolsDir $PSScriptRoot
            # Phase A kill switch (RULES §3, §4): refused here, before the readiness is judged and before any write is sent.
            Assert-AutonomousWritesEnabled -PolicyText $live.PolicyText -Action 'merge'
            $toolsDir = $PSScriptRoot; $root = $R
            $guard = { Assert-ToolsProvenanceUnchanged -Provenance $prov -Root $root -ToolsDir $toolsDir }.GetNewClosure()
            $m = Invoke-GateMerge -Repo $Repo -Pr $Pr -ExpectSha $Expect -Policy $live.Policy -Authority $live.Authority -BeforeWrite $guard
            $why = @($m.Gate.Missing) -join '; '
            switch ($m.Result) {
                'APPLIED' { Write-Result $m "RESULT: MERGED PR $Pr head=$($m.Sha) merge=$($m.MergeSha)"; exit 0 }
                'REFUSED' { Write-Result $m "RESULT: REFUSED $($m.Gate.Verdict) tier=$($m.Gate.Tier): $why"; exit 2 }
                'STALE' { Write-Result $m "RESULT: STALE $why"; exit 4 }
                'CONFLICT' { Write-Result $m "RESULT: CONFLICT $($m.Note)"; exit 4 }
                'NOT_APPLIED' { Write-Result $m "RESULT: NOT_MERGED $($m.Note)"; exit 1 }
                'FAILED' { Write-Result $m "RESULT: FAILED $($m.Note)"; exit 1 }
                default { Write-Result $m "RESULT: UNKNOWN $($m.Note). STOP: read PR $Pr before any retry."; exit 3 }
            }
        }
        'release' {
            Assert-GateTools release
            if ($Sub -notin @('verify', 'tag')) { throw (New-SharedError -Reason 'USAGE' -Message 'release verify|tag') }
            if (-not $Snapshot) {
                if (-not (Test-RepoName $Repo)) { throw (New-SharedError -Reason 'USAGE' -Message 'release needs -Repo owner/name') }
                if ($Version -notmatch '\A\d+\.\d+\.\d+(-[0-9A-Za-z.\-]+)?\z') { throw (New-SharedError -Reason 'VERSION_INVALID' -Message "Version '$Version' is not semver.") }
                Assert-Sha40 $Sha 'release -Sha'
            }
            $live = if ($Snapshot) { $null } else { Get-LiveBaseInputs -Repo $Repo }
            $prov = if ($null -ne $live) { Assert-ToolsAreMain -Repo $Repo -Root $R -Sha $live.Sha -ToolsDir $PSScriptRoot } else { $null }   # M-2 / M2
            $policy = if ($null -ne $live) { $live.Policy } else { Read-Policy -Root $R }
            $policyText = if ($null -ne $live) { $live.PolicyText } else { Read-PolicyText -Root $R }
            # Phase A kill switch (RULES §3, §4): a tag is refused before the snapshot and the readiness are read. `verify` is read-only.
            if ($Sub -eq 'tag') { Assert-AutonomousWritesEnabled -PolicyText $policyText -Action 'release tag' }
            $authority = if ($null -ne $live) { $live.Authority } else { Read-Authority -Root $R }
            $snap = if ($Snapshot) { Read-JsonFile $Snapshot } else { Get-ReleaseSnapshot -Repo $Repo -Version $Version -Sha $Sha -Policy $policy -Authority $authority }
            $g = Invoke-ReleaseGate -Snapshot $snap -Policy $policy -Authority $authority
            if ($Sub -eq 'tag' -and $g.Verdict -eq 'PASS' -and -not $g.AlreadyTagged) {
                if ($Snapshot) { throw (New-SharedError -Reason 'PREVIEW_ONLY' -Message 'Tags are created only from a live GitHub read.' -Code 2) }
                Assert-ToolsProvenanceUnchanged -Provenance $prov -Root $R -ToolsDir $PSScriptRoot   # M2: a moved checkout creates no tag
                New-ReleaseTag -Repo $Repo -Version $Version -Sha $Sha
            }
            Write-Result $g ((@("RESULT: $($g.Verdict) v$($g.Version) $($g.Sha)") + ($g.Satisfied | ForEach-Object { "  ok: $_" }) + ($g.Missing | ForEach-Object { "  MISSING: $_" })) -join "`n")
            exit $(if ($g.Verdict -eq 'PASS') { 0 } else { 2 })
        }
        'pin' {
            if ($SharedRoot -eq '' -and $Sub -ne 'check') { throw (New-SharedError -Reason 'USAGE' -Message 'pin plan|apply needs -SharedRoot <Shared checkout> -To <rev>') }
            switch ($Sub) {
                'check' {
                    $lock = Read-Lock (Get-LockPath $R)
                    $p = @(if ($SharedRoot) { Test-PinIdentity -SharedRoot $SharedRoot -Lock $lock })
                    Write-Result @{ lock = $lock; problems = $p; identity_checked = [bool]$SharedRoot } ("RESULT: $(if ($p.Count) { 'FAIL ' + ($p -join ',') } elseif ($SharedRoot) { 'PASS' } else { 'LOCK_FORMAT_OK (identity NOT checked: pass -SharedRoot)' }) pin=$($lock['source_version']) $($lock['source_commit'])")
                    if ($p.Count) { exit 1 }
                }
                'plan' { $pl = Get-PinPlan -ProjectRoot $R -SharedRoot $SharedRoot -To $To; Write-Result $pl ("RESULT: $($pl.Verdict) $($pl.CurrentVersion) -> $($pl.TargetVersion)`n  existing pin problems: $($pl.ExistingPinProblems -join ', ')`n  missing bootstrap paths: $($pl.MissingBootstrapPaths -join '; ')`n  active TASK pins kept: $($pl.ActiveTaskPins -join '; ')`n  incompatible consumers in this repository ($($pl.ConsumerFilesScanned) files scanned, $($pl.ConsumerFilesUnscanned) not read as text): $(if ($pl.Consumers.Count) { $pl.Consumers -join ' || ' } else { 'none found' })`n  consumers outside this repository: $($pl.OutsideConsumers)"); if ($pl.Verdict -eq 'BLOCKED') { exit 2 } }
                'apply' { $pl = Invoke-PinApply -ProjectRoot $R -SharedRoot $SharedRoot -To $To -AcknowledgeMigration:$AcknowledgeMigration -AcknowledgeConsumers:$AcknowledgeConsumers; Write-Result $pl "RESULT: PINNED $($pl.TargetVersion) $($pl.Target) (lock only; commit it through the normal PR)" }
                default { throw (New-SharedError -Reason 'USAGE' -Message 'pin check|plan|apply') }
            }
        }
        'push' {
            if ($Branch -eq '') { throw (New-SharedError -Reason 'USAGE' -Message 'push -Branch <name> [-Expect <remote sha>]') }
            $sha = Resolve-Commit -Dir $R -Rev 'HEAD'
            $ref = "refs/heads/$Branch"
            $exp = if ($Expect -ne '') { $Expect } else { [string](Get-RemoteRef -Dir $R -Remote $Remote -Ref $ref) }
            $r = Invoke-SafePush -Dir $R -Ref $ref -Sha $sha -Expect $exp -Remote $Remote
            Write-Result $r "RESULT: $($r.Result) $ref $sha"
        }
        'recover' {
            if ($Branch -ne '') {
                if ($Sha -eq '') { throw (New-SharedError -Reason 'USAGE' -Message 'recover -Branch <name> -Sha <commit the write was publishing> [-Expect <value it expected>]  (journal-less readback)') }
                $one = Invoke-RecoverRef -Dir $R -Branch $Branch -Sha $Sha -Expect $Expect -Remote $Remote
                Write-Result $one "RESULT: $($one.Outcome) $($one.Ref) -> $($one.To) ($($one.Action))"
                if ($one.Outcome -eq 'UNKNOWN') { exit 3 }
                if ($one.Outcome -eq 'CONFLICT') { exit 4 }
                exit 0
            }
            $rep = @(Invoke-Recover -Dir $R)
            Write-Result $rep $(if ($rep.Count -eq 0) { 'RESULT: NOTHING_PENDING' } else { (@('RESULT: RECOVERED') + ($rep | ForEach-Object { "  $($_.Ref) -> $($_.To): $($_.Outcome) ($($_.Action))" })) -join "`n" })
            if (@($rep | Where-Object Outcome -eq 'UNKNOWN').Count) { exit 3 }
            if (@($rep | Where-Object Outcome -eq 'CONFLICT').Count) { exit 4 }
        }
        'authority' {
            Assert-GateTools authority
            $a = Read-Authority -Root $R; $p = @(Get-AuthorityProblems $a)
            Write-Result @{ problems = $p; actors = $a.actors } ("RESULT: $(if ($p.Count) { 'DECISIONS_FAIL_CLOSED ' + ($p -join ',') } else { 'OK' })")
        }
        { $_ -in @('help', '--help', '-h', '') } {
            Write-Output "usage: pwsh tools/shared.ps1 <check|task|pin|push|recover|sync|init-project|ci-recommend>  (gate tools, if installed: evidence|gate|merge|release|authority) ...  (see RULES.md and .claude/skills/)"
        }
        default { throw (New-SharedError -Reason 'USAGE' -Message "Unknown command '$Command'. Commands: check task pin push recover sync init-project ci-recommend (gate tools, if installed: evidence gate merge release authority).") }
    }
    exit 0
} catch {
    $reason = if ($_.Exception.Data.Contains('Reason')) { $_.Exception.Data['Reason'] } else { 'UNEXPECTED' }
    $code = if ($_.Exception.Data.Contains('Code')) { [int]$_.Exception.Data['Code'] } else { 1 }
    if ($Json) { @{ result = 'ERROR'; reason = $reason; exit = $code; message = $_.Exception.Message } | ConvertTo-Json -Compress } else { [Console]::Error.WriteLine("ERROR $reason (exit $code): $($_.Exception.Message)") }
    exit $code
}
