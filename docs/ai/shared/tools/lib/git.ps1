# Guarded git access, exact-SHA resolution and the remote-write protocol (RULES I1 I2 I3 I4).
Set-StrictMode -Version Latest

$script:EmptyGraftFile = ''
# m-8: the git executable is resolved ONCE, to a full path, when the tools load, and every call starts that path (no PATH lookup per call).
$script:GitExe = ''
$gitCommand = Get-Command -Name git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $gitCommand) { $script:GitExe = [string]$gitCommand.Source }

# Replaceable in tests (fault injection). Returns @{ ExitCode; Out; Err }.
$script:GitImpl = {
    param([string]$Dir, [string[]]$GitArgs)
    if ([string]::IsNullOrEmpty($script:GitExe)) { Stop-Shared -Reason 'GIT_MISSING' -Message 'git is not on PATH.' -Code 2 }
    $psi = [System.Diagnostics.ProcessStartInfo]::new($script:GitExe)
    $psi.WorkingDirectory = $Dir
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    # M4 (m1): nothing inherited from the caller's environment may choose the repository, object store, configuration,
    # transport or helper that git uses (GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_OBJECT_DIRECTORY, GIT_COMMON_DIR,
    # GIT_NAMESPACE, GIT_CONFIG_*, GIT_SSH_COMMAND, GIT_EXEC_PATH, GIT_ALLOW_PROTOCOL, GIT_ASKPASS, ...). Every GIT_* is
    # removed, then only what the tools need is set. One exception, deliberate: GIT_AUTHOR_DATE and GIT_COMMITTER_DATE only set
    # commit timestamps (they cannot select a repository, an object or a transport); they are kept because the identical-clock
    # regression test (test-git-safety) depends on forcing equal timestamps. Flagged in the commit body for review.
    $keep = @{}; foreach ($k in 'GIT_AUTHOR_DATE', 'GIT_COMMITTER_DATE') { $v = [Environment]::GetEnvironmentVariable($k); if (-not [string]::IsNullOrEmpty($v)) { $keep[$k] = $v } }
    foreach ($k in @($psi.Environment.Keys)) { if ([string]$k -like 'GIT_*') { [void]$psi.Environment.Remove([string]$k) } }
    foreach ($k in $keep.Keys) { $psi.Environment[$k] = $keep[$k] }
    $psi.Environment['GIT_TERMINAL_PROMPT'] = '0'
    $psi.Environment['LC_ALL'] = 'C'
    # One object graph for every decision (SH3 m1): replacement objects/grafts, a stale commit-graph and injected
    # config or alternates could make an ancestry check disagree with what the server sees. Switch them all off here,
    # in the single process launcher, so the fast-forward proof and the push use the same real commits.
    $psi.Environment['GIT_NO_REPLACE_OBJECTS'] = '1'
    # <GIT_DIR>/info/grafts is still honoured by --no-replace-objects: point git at a file that is guaranteed empty (a plain file,
    # not a device name: 'NUL' made `git checkout --orphan` fail on Windows).
    # m-6: a PRIVATE directory with a fresh random name, created by this process (owner-only where the platform supports it). A
    # predictable path in the shared temp directory could be pre-created with a graft; nothing that already exists is ever reused.
    if (-not $script:EmptyGraftFile) {
        $graftDir = Join-Path ([System.IO.Path]::GetTempPath()) ("shared-" + [guid]::NewGuid().ToString('N'))
        [void][System.IO.Directory]::CreateDirectory($graftDir)
        if (-not $IsWindows) { [System.IO.File]::SetUnixFileMode($graftDir, [System.IO.UnixFileMode]::UserRead -bor [System.IO.UnixFileMode]::UserWrite -bor [System.IO.UnixFileMode]::UserExecute) }
        $graft = Join-Path $graftDir 'no-grafts.txt'
        [System.IO.File]::WriteAllText($graft, '')
        $script:EmptyGraftFile = $graft
    }
    if ((Get-Item -LiteralPath $script:EmptyGraftFile).Length -ne 0) { [System.IO.File]::WriteAllText($script:EmptyGraftFile, '') }
    $psi.Environment['GIT_GRAFT_FILE'] = $script:EmptyGraftFile
    # Transports: an explicit allowlist (ext::, fd::, custom helpers and anything unlisted are refused by git itself).
    # Local-path remotes exist only in the test fixtures, which opt in with SHARED_ALLOW_LOCAL_REMOTE=1; production never sets it.
    $pre = @('-c', 'protocol.allow=never', '-c', 'protocol.https.allow=always', '-c', 'protocol.ssh.allow=always')
    if ($env:SHARED_ALLOW_LOCAL_REMOTE -eq '1') { $pre += @('-c', 'protocol.file.allow=always') }
    # F2 (R3 MINOR-1): repository config must not decide whether git reads a tracked file. core.fsmonitor (a hook or daemon) can
    # tell git that a file is unchanged without reading it, so git status would miss an edit (measured: with a hook that reports
    # no changes, the edit was not reported; with core.fsmonitor=false it was). core.ignoreStat=false is pinned for the same
    # reason; a miss from core.ignoreStat alone was NOT reproduced (git 2.43), so it is hygiene, not a demonstrated fix.
    foreach ($a in @($pre + @('--no-replace-objects', '-c', 'core.commitGraph=false', '-c', 'core.useReplaceRefs=false', '-c', 'core.fsmonitor=false', '-c', 'core.ignoreStat=false'))) { [void]$psi.ArgumentList.Add($a) }
    foreach ($a in $GitArgs) { [void]$psi.ArgumentList.Add($a) }
    $p = [System.Diagnostics.Process]::Start($psi)
    $so = $p.StandardOutput.ReadToEndAsync()
    $se = $p.StandardError.ReadToEndAsync()
    $p.WaitForExit()
    return @{ ExitCode = $p.ExitCode; Out = $so.Result; Err = $se.Result }
}

# Allowlist, not denylist: only these subcommands and flags exist for the tools. Bundled short flags (-fu), `+refspec`,
# `--upload-pack=...`, `rebase`, `reset`, `update-ref`, `rm -rf` ... are simply not on the list.
$script:GitAllowedFlags = @{
    'rev-parse'  = @('--verify', '--quiet', '--git-common-dir', '--abbrev-ref', '--is-shallow-repository', '--show-toplevel')
    'status'     = @('--porcelain=v1', '--untracked-files=all')
    'ls-remote'  = @('--symref', '--get-url')
    'fetch'      = @('--quiet')
    'checkout'   = @('--quiet', '-b')
    'add'        = @('-A', '--')
    'commit'     = @('--quiet', '--allow-empty', '-m')   # --allow-empty: the claim commit of a TASK file that already exists on the base changes no file
    'push'       = @('--quiet', '--porcelain')
    'merge-base' = @('--is-ancestor')
    'rev-list'   = @('--first-parent', '--reverse')   # task start -Resume: find the claim commit of a branch (positionals are exact shas, optionally ^excluded)
    'merge'      = @('--ff-only', '--quiet')           # task start -Resume: advance a local branch that is strictly behind the remote one
    'cat-file'   = @('-e')
    'show'       = @()
    'diff'       = @('--name-status', '-z', '-M')
    'ls-files'   = @('-z', '--cached', '--others', '--exclude-standard', '-v')   # -v: the valid-bit tags (H, h, S) for M2
    'config'     = @('--get', '--get-all', '--get-regexp')
}

# Branches the tools never write (case-insensitive: GitHub refs are case-sensitive but people and Windows are not).
# Defaults here; shared.ps1 adds policy.json `base_branch` and `protected_branches`; Invoke-SafePush adds the remote's real default branch.
$script:ProtectedBranches = @('main', 'master')
$script:ExpectedRepository = ''

function Set-ProtectedBranches {
    param([string[]]$Patterns)
    $script:ProtectedBranches = @(@('main', 'master') + @($Patterns | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) | Select-Object -Unique)
}

function Test-ProtectedBranch {
    param([string]$Name, [string[]]$Extra = @())
    foreach ($p in @($script:ProtectedBranches) + @($Extra)) { if (Test-GlobMatch -Path $Name -Pattern $p) { return $true } }
    return $false
}

function Assert-SafeGitArgs {
    param([Parameter(Mandatory)][AllowEmptyString()][string[]]$GitArgs)
    $cmd = if ($GitArgs.Count -gt 0) { $GitArgs[0] } else { '' }
    if (-not $script:GitAllowedFlags.ContainsKey($cmd)) { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git '$cmd' is not an allowed command (history/user data protection)." -Code 2 }
    $allowed = $script:GitAllowedFlags[$cmd]
    $afterDashDash = $false
    $branchName = '[A-Za-z0-9._][A-Za-z0-9._/\-]*'
    $flagsSeen = @(); $positionals = @()
    foreach ($a in @($GitArgs | Select-Object -Skip 1)) {
        if ($null -eq $a) { continue }
        if (-not $afterDashDash -and $a -ceq '--') { $afterDashDash = $true; if ($allowed -cnotcontains '--') { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git ${cmd}: '--' is not allowed here." -Code 2 }; continue }
        if (-not $afterDashDash -and $a.StartsWith('-')) {
            # The ONE lease form the tools may send (server-side compare-and-swap, SH3-RC1-F01): push only, exactly
            # --force-with-lease=refs/heads/<branch>:<40 hex | empty>, at most once. Bare/other lease or force flags stay forbidden.
            if ($cmd -eq 'push' -and $a.StartsWith('--force-with-lease=')) {
                if ($a -cnotmatch "\A--force-with-lease=refs/heads/$branchName`:(?:[0-9a-f]{40})?\z") { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git push lease '$a' is not --force-with-lease=refs/heads/<branch>:<40-hex or empty>." -Code 2 }
                if (@($flagsSeen | Where-Object { $_.StartsWith('--force-with-lease=') }).Count -gt 0) { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message 'git push takes at most one lease.' -Code 2 }
                $flagsSeen += $a
                continue
            }
            if ($allowed -cnotcontains $a) { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git $cmd flag '$a' is not allowed (history/user data protection)." -Code 2 }
            $flagsSeen += $a
            continue
        }
        # positional: never a force (+) or delete (:) refspec, never an option-looking value after --
        if ($a.StartsWith('+') -or $a.StartsWith(':') -or ($afterDashDash -and $a.StartsWith('-'))) { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git $cmd argument '$a' would force or delete a ref." -Code 2 }
        if ($cmd -in @('push', 'fetch') -and $a -match '(\A|:)\+') { Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git $cmd refspec '$a' would force a ref." -Code 2 }
        $positionals += $a
    }
    # `commit -m <message>`, `add -- <paths>`, `show <rev>:<path>` etc. carry free-form values; only transport commands are value-checked.
    $valueFlags = @($flagsSeen | Where-Object { $_ -eq '-m' })
    if ($cmd -eq 'commit' -and $valueFlags.Count -eq 1) { return }
    Assert-SafeGitPositionals -Cmd $cmd -Flags $flagsSeen -Pos $positionals
}

function Assert-SafeGitPositionals {
    # Flags are allowlisted above; the VALUES matter too (remote names, refspecs, `ext::` transports, writing main).
    param([string]$Cmd, [string[]]$Flags, [string[]]$Pos)
    $branch = '[A-Za-z0-9._][A-Za-z0-9._/\-]*'
    $deny = { param($m) Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "git ${Cmd}: $m" -Code 2 }
    $safeName = { param($v, $what) try { Assert-SafeName $v $what } catch { & $deny $_.Exception.Message } }
    switch ($Cmd) {
        'push' {
            if ($Pos.Count -ne 2) { & $deny 'push takes exactly <remote> <refspec>.' }
            & $safeName $Pos[0] 'remote'
            $dest = if ($Pos[1] -match ':(?:refs/heads/)?([^:]+)\z') { $Matches[1] } else { $Pos[1] }
            if (Test-ProtectedBranch $dest) { Stop-Shared -Reason 'REF_PROTECTED' -Message "Tools never write $dest (protected branch); it changes through a PR and its gate." -Code 2 }
            # Source is an exact 40-hex commit (never a movable name), destination a plain branch under refs/heads/.
            if ($Pos[1] -cnotmatch "\A[0-9a-f]{40}:refs/heads/($branch)\z") { & $deny "refspec '$($Pos[1])' is not <40-hex sha>:refs/heads/<branch>." }
            # A push without the expected-old-value lease is not an atomic compare-and-swap: refused (SH3-RC1-F01/RC2).
            $leases = @($Flags | Where-Object { $_.StartsWith('--force-with-lease=') })
            if ($leases.Count -ne 1) { & $deny 'push must carry exactly one --force-with-lease=refs/heads/<branch>:<expected> (server-side compare-and-swap).' }
            if ($leases[0] -cnotlike "--force-with-lease=refs/heads/${dest}:*") { & $deny "the lease must name the pushed ref refs/heads/$dest." }
        }
        'fetch' {
            if ($Pos.Count -lt 1 -or $Pos.Count -gt 2) { & $deny 'fetch takes <remote> [<refspec>].' }
            & $safeName $Pos[0] 'remote'
            if ($Pos.Count -eq 2 -and $Pos[1] -cnotmatch "\A(?:refs/heads/)?$branch(?::refs/remotes/$branch)?\z") { & $deny "refspec '$($Pos[1])' is not a plain branch or branch:refs/remotes/... refspec." }
        }
        'ls-remote' {
            if ($Pos.Count -lt 1 -or $Pos.Count -gt 2) { & $deny 'ls-remote takes <remote> [<ref>].' }
            & $safeName $Pos[0] 'remote'
            if ($Pos.Count -eq 2 -and $Pos[1] -cnotmatch '\A(?:refs/[A-Za-z0-9._/\-]+|HEAD)\z') { & $deny "ref '$($Pos[1])' is not a refs/... name or HEAD." }
        }
        'rev-list' {
            if ($Pos.Count -lt 1 -or $Pos.Count -gt 2) { & $deny 'rev-list takes [^<excluded sha>] <sha>.' }
            foreach ($p in $Pos) { if ($p -cnotmatch '\A\^?[0-9a-f]{40}\z') { & $deny "'$p' is not a 40-hex commit id (optionally ^-prefixed)." } }
        }
        'merge' {
            if ($Flags -cnotcontains '--ff-only') { & $deny 'merge is allowed only as --ff-only.' }
            if ($Pos.Count -ne 1 -or $Pos[0] -cnotmatch '\A[0-9a-f]{40}\z') { & $deny 'merge --ff-only takes exactly one 40-hex commit id.' }
        }
        'checkout' {
            if ($Flags -contains '-b') { if ($Pos.Count -lt 1 -or $Pos.Count -gt 2) { & $deny 'checkout -b takes <new-branch> [<start>].' } }
            else {
                # M6 (m4): one positional is a revision: a 40-hex commit, a full branch ref or a plain branch name. Anything else
                # could be read by git as a pathspec, and `git checkout <tracked file>` restores (overwrites) that file.
                if ($Pos.Count -ne 1) { & $deny 'checkout takes exactly one revision (no pathspecs).' }
                if ($Pos[0] -cnotmatch "\A(?:[0-9a-f]{40}|refs/heads/$branch|$branch)\z" -or $Pos[0] -match '\.\.|//') { & $deny "'$($Pos[0])' is not a commit id, refs/heads/<branch> or a branch name." }
            }
        }
        'config' {
            if ($Flags -contains '--get-regexp') {
                # m-4: the url rewrite rules (insteadOf / pushInsteadOf), read-only
                if ($Pos.Count -ne 1 -or $Pos[0] -cne '^url\..+\.(push)?insteadof$') { & $deny 'config --get-regexp is limited to the url rewrite rules.' }
            }
            elseif ($Pos.Count -ne 1 -or $Pos[0] -cnotmatch '\Aremote\.[A-Za-z0-9._\-]+\.(?:url|pushurl)\z') { & $deny 'config is limited to reading remote.<name>.url and .pushurl and the url rewrite rules.' }
        }
    }
}

function Assert-SafeName {
    # Remote and branch names that come from callers: no option injection, no path tricks.
    param([string]$Value, [string]$What)
    if ([string]::IsNullOrEmpty($Value) -or $Value -notmatch '\A[A-Za-z0-9._][A-Za-z0-9._/\-]*\z' -or $Value -match '\.\.|//|\.lock\z|/\z') { Stop-Shared -Reason 'NAME_INVALID' -Message "$What '$Value' is not a plain name." }
}

function Assert-PushIsFastForward {
    # `--force-with-lease` binds the server-side expected old value but does NOT by itself refuse a non-fast-forward
    # update (git-push docs: a matching lease permits it). The fast-forward property is therefore proven here, in the one
    # dispatcher every tool git call goes through, for the very values that are about to be sent: the lease value must be
    # an ancestor of the pushed commit (ancestry is an immutable fact of the commit objects, so "server ref == lease" plus
    # "lease is an ancestor" means the update can only be a fast-forward). An empty lease = create a ref that must not exist.
    # Rewinds, diverged commits and unknown/absent objects are refused before anything is sent.
    param([string]$Dir, [string[]]$GitArgs)
    $lease = @($GitArgs | Where-Object { $_ -is [string] -and $_.StartsWith('--force-with-lease=') })[0]
    $expect = $lease -replace '\A--force-with-lease=refs/heads/.*:', ''
    if ($expect -eq '') { return }
    $sha = ($GitArgs[-1] -split ':')[0]
    if (-not (Test-CommitPresent -Dir $Dir -Sha $expect) -or -not (Test-CommitPresent -Dir $Dir -Sha $sha) -or -not (Test-IsAncestor -Dir $Dir -Ancestor $expect -Descendant $sha)) {
        Stop-Shared -Reason 'NOT_FAST_FORWARD' -Message "Commit $sha does not descend from the expected remote value $expect (or an object is missing). Not a fast-forward: nothing was sent." -Code 4
    }
}

function Assert-NotTrackedPath {
    # M6 (m4): `git checkout <name>` with a name that is also a tracked path restores that path from the index and overwrites
    # the user's edit. Compared case-insensitively (Windows and macOS checkouts fold case): refused when in doubt.
    param([string]$Dir, [string]$Name)
    $r = & $script:GitImpl $Dir @('ls-files', '-z', '--cached')
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'GIT_FAILED' -Message "ls-files failed: $($r.Err.Trim())" }
    foreach ($p in ($r.Out -split "`0")) {
        if ($p -ieq $Name -or $p.StartsWith("$Name/", [StringComparison]::OrdinalIgnoreCase)) {
            Stop-Shared -Reason 'GIT_FORBIDDEN' -Message "checkout '$Name' names a tracked path; git would overwrite that file. Use a commit id or a branch name." -Code 2
        }
    }
}

function Invoke-Git {
    param([Parameter(Mandatory)][string]$Dir, [Parameter(Mandatory)][string[]]$GitArgs, [switch]$AllowFail)
    Assert-SafeGitArgs -GitArgs $GitArgs
    if ($GitArgs[0] -eq 'checkout' -and -not ($GitArgs -contains '-b')) {
        $target = @($GitArgs | Select-Object -Skip 1 | Where-Object { $_ -notlike '-*' })
        if ($target.Count -eq 1) { Assert-NotTrackedPath -Dir $Dir -Name $target[0] }
    }
    if ($GitArgs[0] -eq 'push') { Assert-PushIsFastForward -Dir $Dir -GitArgs $GitArgs }
    $r = & $script:GitImpl $Dir $GitArgs
    if ($r.ExitCode -ne 0 -and -not $AllowFail) {
        Stop-Shared -Reason 'GIT_FAILED' -Message ("git {0} -> exit {1}: {2}" -f ($GitArgs -join ' '), $r.ExitCode, $r.Err.Trim())
    }
    if ($AllowFail) { return $r }
    return $r.Out.TrimEnd("`r", "`n")
}

function Resolve-Commit {
    # Exact resolution: the revision must name one commit; the result is always a full lowercase sha.
    param([Parameter(Mandatory)][string]$Dir, [Parameter(Mandatory)][string]$Rev)
    $r = Invoke-Git -Dir $Dir -GitArgs @('rev-parse', '--verify', '--quiet', "$Rev^{commit}") -AllowFail
    $sha = $r.Out.Trim()
    if ($r.ExitCode -ne 0 -or -not (Test-Sha40 $sha)) { Stop-Shared -Reason 'REV_UNRESOLVED' -Message "Cannot resolve '$Rev' to a commit." }
    return $sha
}

function Get-GitDir { param([string]$Dir) return [System.IO.Path]::GetFullPath((Invoke-Git -Dir $Dir -GitArgs @('rev-parse', '--git-common-dir')), $Dir) }

function Assert-CleanTree {
    param([Parameter(Mandatory)][string]$Dir)
    $s = Invoke-Git -Dir $Dir -GitArgs @('status', '--porcelain=v1', '--untracked-files=all')
    if ($s.Trim().Length -gt 0) { Stop-Shared -Reason 'TREE_DIRTY' -Message "Working tree has user changes; refusing to proceed:`n$s" -Code 2 }
}

function Get-RemoteRef {
    # Live read of one remote ref. Returns the sha, or $null when the ref does not exist. Throws on transport error.
    param([string]$Dir, [string]$Remote, [string]$Ref)
    Assert-SafeName $Remote 'remote'
    # M5 (m2): identity first. An unconfigured remote name (e.g. 'sub/dir', a local path) must be refused before git
    # contacts anything; `ls-remote --get-url` used by the check resolves the configuration without touching the network.
    Assert-RemoteIdentity -Dir $Dir -Remote $Remote
    $r = Invoke-Git -Dir $Dir -GitArgs @('ls-remote', $Remote, $Ref) -AllowFail
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'REMOTE_UNREADABLE' -Message "ls-remote failed: $($r.Err.Trim())" -Code 3 }
    foreach ($line in ($r.Out -split "`n")) {
        if ($line -match '\A([0-9a-f]{40})\s+(\S+)\s*\z' -and $Matches[2] -ceq $Ref) { return $Matches[1] }
    }
    return $null
}

# ---- journal (local, inside .git; never part of the repository) --------------------------------

function Get-JournalPath { param([string]$Dir) $d = Join-Path (Get-GitDir $Dir) 'shared'; if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }; return (Join-Path $d 'journal.jsonl') }

function Add-JournalEntry {
    param([string]$Dir, [hashtable]$Entry)
    $line = ($Entry | ConvertTo-Json -Compress -Depth 8)
    [System.IO.File]::AppendAllText((Get-JournalPath $Dir), $line + "`n", [System.Text.UTF8Encoding]::new($false))
}

function Get-PendingWrites {
    # Open intents. A journal line that cannot be parsed (torn write, disk full) is itself an unproven outcome:
    # it is reported as a pending entry that only a human can clear, never silently skipped.
    param([string]$Dir)
    $p = Get-JournalPath $Dir
    if (-not (Test-Path $p)) { return @() }
    $open = [ordered]@{}
    $n = 0
    foreach ($l in (Get-Content -LiteralPath $p)) {
        $n++
        if ([string]::IsNullOrWhiteSpace($l)) { continue }
        $e = try { $l | ConvertFrom-Json } catch { $null }
        if ($null -eq $e -or $null -eq (Get-Prop $e 'id') -or $null -eq (Get-Prop $e 'state')) {
            $open["corrupt-$n"] = [pscustomobject]@{ id = "corrupt-$n"; state = 'PENDING'; remote = ''; ref = "(unreadable journal line $n in $p)"; from = ''; to = ''; corrupt = $true }
            continue
        }
        if ($e.state -eq 'PENDING') { $open[[string]$e.id] = $e } else { $open.Remove([string]$e.id) }
    }
    return @($open.Values)
}

function Assert-NoPendingWrites {
    # An earlier write whose outcome was never proven blocks every further write until `recover` settles it (I4).
    param([string]$Dir)
    $p = @(Get-PendingWrites -Dir $Dir)
    if ($p.Count -gt 0) { Stop-Shared -Reason 'OUTCOME_UNKNOWN' -Message "$($p.Count) earlier write(s) have an unproven outcome (first: $($p[0].ref)). STOP: run 'shared.ps1 recover' first." -Code 3 }
}

function Test-IsAncestor {
    param([string]$Dir, [string]$Ancestor, [string]$Descendant)
    $r = Invoke-Git -Dir $Dir -GitArgs @('merge-base', '--is-ancestor', $Ancestor, $Descendant) -AllowFail
    return ($r.ExitCode -eq 0)
}

function Test-CommitPresent { param([string]$Dir, [string]$Sha) return ((Invoke-Git -Dir $Dir -GitArgs @('cat-file', '-e', "$Sha^{commit}") -AllowFail).ExitCode -eq 0) }

function Resolve-WriteOutcome {
    # Classify the remote state after a write attempt (or for crash recovery). Never writes.
    # Returns APPLIED | NOT_APPLIED | CONFLICT | UNKNOWN.
    param([string]$Dir, [string]$Remote, [string]$Ref, [string]$From, [string]$To)
    try { $now = Get-RemoteRef -Dir $Dir -Remote $Remote -Ref $Ref } catch { return 'UNKNOWN' }
    if ($now -ceq $To) { return 'APPLIED' }
    if (($null -eq $now -and [string]::IsNullOrEmpty($From)) -or ($now -ceq $From)) { return 'NOT_APPLIED' }
    if ($null -eq $now) { return 'CONFLICT' } # ref disappeared: someone else deleted it
    if (-not (Test-CommitPresent -Dir $Dir -Sha $now)) {
        $f = Invoke-Git -Dir $Dir -GitArgs @('fetch', '--quiet', $Remote, $Ref) -AllowFail
        if ($f.ExitCode -ne 0 -or -not (Test-CommitPresent -Dir $Dir -Sha $now)) { return 'UNKNOWN' }
    }
    if (Test-IsAncestor -Dir $Dir -Ancestor $To -Descendant $now) { return 'APPLIED' } # ours landed, then others advanced it
    return 'CONFLICT'
}

function Get-RemoteRepoId {
    # owner/name of a GitHub remote URL, or $null for anything else (local paths, ext::, other hosts, file://).
    param([string]$Url)
    if ($Url -match '\Ahttps://(?:[^/@]+@)?github\.com/([A-Za-z0-9_.\-]+)/([A-Za-z0-9_.\-]+?)(?:\.git)?/?\z') { return "$($Matches[1])/$($Matches[2])" }
    if ($Url -match '\A(?:ssh://)?git@github\.com[:/]([A-Za-z0-9_.\-]+)/([A-Za-z0-9_.\-]+?)(?:\.git)?/?\z') { return "$($Matches[1])/$($Matches[2])" }
    return $null
}

function Get-UrlRewriteRules {
    # m-4: git rewrites URLs with url.<base>.insteadOf and url.<base>.pushInsteadOf (the value is the prefix that is replaced).
    # D1: every rule is read, and a rule that cannot be read is refused, never dropped. "No such key" (exit 1) means no rules;
    # any other failure is not "no rules".
    param([string]$Dir)
    $rules = @()
    $r = Invoke-Git -Dir $Dir -GitArgs @('config', '--get-regexp', '^url\..+\.(push)?insteadof$') -AllowFail
    if ($r.ExitCode -eq 1) { return @() }
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "The url rewrite rules could not be read ($($r.Err.Trim())); refusing to judge the remote." -Code 2 }
    foreach ($line in ($r.Out -split "`n")) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match '\Aurl\.(.+)\.(insteadof|pushinsteadof) (.+)\z') { $rules += [pscustomobject]@{ Base = $Matches[1]; Prefix = $Matches[3].Trim(); Push = ($Matches[2] -ieq 'pushinsteadof') } }
        else { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "A url rewrite rule could not be read ('$($line.Trim())'); refusing to judge the remote." -Code 2 }
    }
    return $rules
}

function Get-ConfigValues {
    # Every value of one key. A missing key is an empty list; any other failure to read it is refused (D1: never "no value").
    param([string]$Dir, [string]$Key)
    $r = Invoke-Git -Dir $Dir -GitArgs @('config', '--get-all', $Key) -AllowFail
    if ($r.ExitCode -eq 1) { return @() }
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "$Key could not be read ($($r.Err.Trim())); refusing to judge the remote." -Code 2 }
    return @($r.Out -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
}

function Get-PossibleRemoteUrls {
    # D1 (m-4): every url git could push to, judged together. Starts = the fetch url and every url / pushurl value. From each one,
    # every rewrite that ANY insteadOf or pushInsteadOf rule can make is added (git rewrites once and picks one rule; which one is
    # not judged here, so every candidate must be the expected repository). The extra rounds only add candidates (fail closed),
    # and the set is capped so that a runaway rule refuses instead of looping.
    param([string[]]$Starts, $Rules)
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $frontier = [System.Collections.Generic.List[string]]::new()
    foreach ($s in $Starts) { if ($s -ne '') { $frontier.Add($s) } }
    for ($round = 0; $round -lt 4 -and $frontier.Count -gt 0; $round++) {
        $next = [System.Collections.Generic.List[string]]::new()
        foreach ($u in $frontier) {
            if (-not $seen.Add($u)) { continue }
            if ($seen.Count -gt 256) { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message 'Too many possible push urls to judge; refusing.' -Code 2 }
            if ($round -lt 3) { foreach ($rule in $Rules) { if ($u.StartsWith([string]$rule.Prefix, [StringComparison]::Ordinal)) { $next.Add([string]$rule.Base + $u.Substring($rule.Prefix.Length)) } } }
        }
        $frontier = $next
    }
    return @($seen)
}

function Test-LocalPathRemote {
    # m-7: a local remote exists only as an ABSOLUTE path (test fixtures). scp-style user@host:path and any other spelling is not one.
    param([string]$Url)
    if ($Url -match '::' -or $Url -match '://') { return $false }
    return ($Url -cmatch '\A(?:/[^:@]|[A-Za-z]:[\\/])')
}

function Assert-RemoteIdentity {
    # A write goes only to a configured remote whose EFFECTIVE fetch and push urls are the expected GitHub repository: not another
    # host, a fork, a local path or a transport helper. m-4: "effective" means every url git may push to: the fetch url, every
    # remote.<name>.url and remote.<name>.pushurl value (git pushes to each), and each of those after EVERY insteadOf and
    # pushInsteadOf rule that matches it (D1: no rule is chosen by preference). Tests use local bare remotes and opt in with
    # SHARED_ALLOW_LOCAL_REMOTE=1 (never set in CI or production).
    param([string]$Dir, [string]$Remote)
    # M5 (m2): a remote name is a plain token (remote.<name>.url); anything else is refused before git is asked anything.
    if ($Remote -cnotmatch '\A[A-Za-z0-9._\-]+\z') { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "'$Remote' is not a configured remote name." -Code 2 }
    $u = Invoke-Git -Dir $Dir -GitArgs @('ls-remote', '--get-url', $Remote) -AllowFail
    $url = $u.Out.Trim()
    $configured = (Invoke-Git -Dir $Dir -GitArgs @('config', '--get', "remote.$Remote.url") -AllowFail).ExitCode -eq 0
    if ($u.ExitCode -ne 0 -or $url -eq '' -or -not $configured) { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "Remote '$Remote' is not a configured remote of this repository." -Code 2 }
    $starts = @($url) + @(Get-ConfigValues -Dir $Dir -Key "remote.$Remote.url") + @(Get-ConfigValues -Dir $Dir -Key "remote.$Remote.pushurl")
    $rules = @(@(Get-UrlRewriteRules -Dir $Dir) | Where-Object { $null -ne $_ })
    $all = @(Get-PossibleRemoteUrls -Starts @($starts) -Rules $rules)
    foreach ($x in $all) {
        $id = Get-RemoteRepoId $x
        if ($null -eq $id) {
            if ($env:SHARED_ALLOW_LOCAL_REMOTE -eq '1' -and (Test-LocalPathRemote $x)) { continue }
            Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "Remote '$Remote' ($x) is not a GitHub repository url; tools write only to GitHub." -Code 2
        }
        if ($script:ExpectedRepository -ne '' -and $id -ine $script:ExpectedRepository) { Stop-Shared -Reason 'REMOTE_IDENTITY' -Message "Remote '$Remote' points to $id (effective url $x) but this repository is $($script:ExpectedRepository)." -Code 2 }
    }
}

function Get-RemoteDefaultBranch {
    # The remote's real default branch (HEAD symref), or '' when it has none. Unreadable = stop (the write cannot be judged).
    param([string]$Dir, [string]$Remote)
    $r = Invoke-Git -Dir $Dir -GitArgs @('ls-remote', '--symref', $Remote, 'HEAD') -AllowFail
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'REMOTE_UNREADABLE' -Message "ls-remote --symref failed: $($r.Err.Trim())" -Code 3 }
    foreach ($line in ($r.Out -split "`n")) { if ($line -match '\Aref:\s+refs/heads/(\S+)\s+HEAD\s*\z') { return $Matches[1] } }
    return ''
}

function Invoke-SafePush {
    # The only way tools write to a remote ref. Fast-forward / create only, server-side compare-and-swap on the
    # expected remote value (--force-with-lease=<ref>:<expect>), intent journal before sending, readback after, UNKNOWN stops (I3, I4).
    param(
        [Parameter(Mandatory)][string]$Dir,
        [Parameter(Mandatory)][string]$Ref,        # refs/heads/<name>
        [Parameter(Mandatory)][string]$Sha,        # exact local commit to publish
        [string]$Expect = '',                      # exact current remote value; '' = ref must not exist (claim/create)
        [string]$Remote = 'origin'
    )
    Assert-SafeName $Remote 'remote'
    Assert-Sha40 $Sha 'push sha'
    if ($Expect -ne '') { Assert-Sha40 $Expect 'expected remote sha' }
    if ($Ref -cmatch '\Arefs/heads/(.+)\z' -and (Test-ProtectedBranch $Matches[1])) { Stop-Shared -Reason 'REF_PROTECTED' -Message "Tools never write $Ref (protected branch); it changes through a PR and its gate." -Code 2 }
    Assert-NoPendingWrites -Dir $Dir
    if ($Ref -notmatch '\Arefs/heads/[A-Za-z0-9._/\-]+\z' -or $Ref -match '\.\.|//|/\.|\.lock(/|\z)|/\z|\.\z') { Stop-Shared -Reason 'REF_INVALID' -Message "Only refs/heads/* may be written: $Ref" }
    if (-not (Test-CommitPresent -Dir $Dir -Sha $Sha)) { Stop-Shared -Reason 'REV_UNRESOLVED' -Message "Local commit $Sha does not exist." }
    Assert-RemoteIdentity -Dir $Dir -Remote $Remote
    $remoteDefault = Get-RemoteDefaultBranch -Dir $Dir -Remote $Remote
    if ($remoteDefault -ne '' -and $Ref -ceq "refs/heads/$remoteDefault") { Stop-Shared -Reason 'REF_PROTECTED' -Message "Tools never write ${Ref}: it is the remote's default branch." -Code 2 }

    $cur = Get-RemoteRef -Dir $Dir -Remote $Remote -Ref $Ref
    if ($cur -ceq $Sha) { return [pscustomobject]@{ Result = 'ALREADY_APPLIED'; Ref = $Ref; Sha = $Sha } }
    if (($null -eq $cur -and $Expect -ne '') -or ($null -ne $cur -and $cur -cne $Expect)) {
        Stop-Shared -Reason 'REMOTE_MOVED' -Message "Remote $Ref is '$cur' but the write expected '$Expect'. Fetch, reconcile, retry; nothing was sent." -Code 4
    }
    if ($Expect -ne '') {
        if (-not (Test-CommitPresent -Dir $Dir -Sha $Expect) -or -not (Test-IsAncestor -Dir $Dir -Ancestor $Expect -Descendant $Sha)) {
            Stop-Shared -Reason 'NOT_FAST_FORWARD' -Message "Commit $Sha does not descend from the expected remote value $Expect. Nothing was sent." -Code 4
        }
    }

    $id = [guid]::NewGuid().ToString('N')
    Add-JournalEntry -Dir $Dir -Entry @{ id = $id; state = 'PENDING'; ts = [DateTime]::UtcNow.ToString('o'); remote = $Remote; ref = $Ref; from = $Expect; to = $Sha }
    $sendError = $null
    try {
        if ($env:SHARED_TEST_FAULT -eq 'before-send') { throw 'injected: before-send' }
        # Server-side compare-and-swap (SH3-RC1-F01): the lease puts the expected old value on the wire, so receive-pack
        # rejects the update under the ref lock if the ref is not exactly $Expect ('' = must not exist). A plain push would
        # send whatever the ref advertises right now and accept any fast-forward of it. Still non-force: the update is only
        # sent after $Expect was proven an ancestor of $Sha above, so it can only ever be a fast-forward or a create.
        $r = Invoke-Git -Dir $Dir -GitArgs @('push', '--porcelain', "--force-with-lease=${Ref}:${Expect}", $Remote, "${Sha}:${Ref}") -AllowFail
        if ($r.ExitCode -ne 0) { $sendError = $r.Err.Trim() }
        if ($env:SHARED_TEST_FAULT -eq 'lost-response') { throw 'injected: response lost after send' }
    } catch { $sendError = $_.Exception.Message }

    $outcome = Resolve-WriteOutcome -Dir $Dir -Remote $Remote -Ref $Ref -From $Expect -To $Sha
    if ($outcome -ne 'UNKNOWN') { Add-JournalEntry -Dir $Dir -Entry @{ id = $id; state = $outcome; ts = [DateTime]::UtcNow.ToString('o'); error = $sendError } } # UNKNOWN stays PENDING until recover proves it
    switch ($outcome) {
        'APPLIED' { return [pscustomobject]@{ Result = 'APPLIED'; Ref = $Ref; Sha = $Sha; Note = $sendError } }
        'NOT_APPLIED' { Stop-Shared -Reason 'PUSH_NOT_APPLIED' -Message "Push failed and readback proves nothing was written ($sendError). Safe to retry." -Code 1 }
        'CONFLICT' { Stop-Shared -Reason 'REMOTE_MOVED' -Message "Another writer changed $Ref; our write is not in it. Reconcile, do not overwrite." -Code 4 }
        default { Stop-Shared -Reason 'OUTCOME_UNKNOWN' -Message "Cannot prove whether the write to $Ref was applied. STOP. Run 'shared.ps1 recover' before any retry." -Code 3 }
    }
}

function Invoke-Recover {
    param([Parameter(Mandatory)][string]$Dir)
    $report = @()
    foreach ($e in (Get-PendingWrites -Dir $Dir)) {
        if ($null -ne (Get-Prop $e 'corrupt')) { $report += [pscustomobject]@{ Id = [string]$e.id; Ref = $e.ref; To = ''; Outcome = 'UNKNOWN'; Action = 'journal is damaged: inspect the remote refs by hand, then move .git/shared/journal.jsonl away' }; continue }
        $o = Resolve-WriteOutcome -Dir $Dir -Remote $e.remote -Ref $e.ref -From ([string]$e.from) -To $e.to
        if ($o -ne 'UNKNOWN') { Add-JournalEntry -Dir $Dir -Entry @{ id = [string]$e.id; state = $o; ts = [DateTime]::UtcNow.ToString('o'); error = 'resolved by recover' } }
        $action = switch ($o) { 'APPLIED' { 'none: already in the remote' } 'NOT_APPLIED' { 'safe to re-run the original command' } 'CONFLICT' { 'reconcile with the remote writer; never overwrite' } default { 'remote unreadable: retry recover later' } }
        $report += [pscustomobject]@{ Id = [string]$e.id; Ref = $e.ref; To = $e.to; Outcome = $o; Action = $action }
    }
    return $report
}

function Invoke-RecoverRef {
    # Journal-less recovery (m6). The journal lives in .git/shared of ONE checkout; a recycled cloud container loses it,
    # and a lost journal is NOT evidence that nothing was in flight. The remote is the only truth: given the branch and the
    # commit the interrupted write was publishing (and, if it was an update, the value it expected), read the remote and
    # classify. Read-only: it never sends anything. Returns the same classes as Resolve-WriteOutcome.
    param([Parameter(Mandatory)][string]$Dir, [Parameter(Mandatory)][string]$Branch, [Parameter(Mandatory)][string]$Sha, [string]$Expect = '', [string]$Remote = 'origin')
    Assert-SafeName $Remote 'remote'; Assert-SafeName $Branch 'branch'; Assert-Sha40 $Sha 'recover sha'
    if ($Expect -ne '') { Assert-Sha40 $Expect 'recover expected value' }
    $ref = "refs/heads/$Branch"
    $o = Resolve-WriteOutcome -Dir $Dir -Remote $Remote -Ref $ref -From $Expect -To $Sha
    $action = switch ($o) { 'APPLIED' { 'none: the commit is in the remote branch' } 'NOT_APPLIED' { 'nothing was written: safe to re-run the original command' } 'CONFLICT' { 'another writer changed the branch and the commit is not in it: reconcile, never overwrite' } default { 'remote unreadable or the remote commit cannot be examined: STOP, retry recover later' } }
    return [pscustomobject]@{ Ref = $ref; To = $Sha; Outcome = $o; Action = $action; Source = 'remote readback (no journal)' }
}
