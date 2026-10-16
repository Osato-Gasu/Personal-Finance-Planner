# Downstream Shared pin: validation, plan and lock-only apply (RULES I8). Shared never writes a Project.
Set-StrictMode -Version Latest

function Get-LockPath { param([string]$ProjectRoot) return (Join-Path $ProjectRoot 'docs/ai/SHARED_RULES.lock.yml') }

function Read-Lock {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { Stop-Shared -Reason 'LOCK_MISSING' -Message "No lock file: $Path" }
    $m = ConvertFrom-KeyValueLines (Read-TextLf $Path)
    foreach ($k in 'source_repository', 'source_version', 'source_commit') {
        if (-not $m.Contains($k) -or [string]::IsNullOrWhiteSpace([string]$m[$k])) { Stop-Shared -Reason 'LOCK_INVALID' -Message "Lock is missing '$k'." }
    }
    if ([string]$m['source_repository'] -notmatch '\A[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+\z') { Stop-Shared -Reason 'LOCK_INVALID' -Message 'source_repository must be owner/name.' }
    if ([string]$m['source_version'] -notmatch '\A\d+\.\d+\.\d+(-[0-9A-Za-z.\-]+)?\z') { Stop-Shared -Reason 'LOCK_INVALID' -Message "source_version '$($m['source_version'])' is not semver." }
    if (-not (Test-Sha40 ([string]$m['source_commit']))) { Stop-Shared -Reason 'LOCK_INVALID' -Message 'source_commit must be a full lowercase 40-hex commit id.' }
    return $m
}

function Get-SharedFileAt {
    param([string]$SharedRoot, [string]$Sha, [string]$Path)
    $r = Invoke-Git -Dir $SharedRoot -GitArgs @('show', "${Sha}:$Path") -AllowFail
    if ($r.ExitCode -ne 0) { return $null }
    return (ConvertTo-Lf $r.Out)
}

function Test-SharedPathAt { param([string]$SharedRoot, [string]$Sha, [string]$Path) return ((Invoke-Git -Dir $SharedRoot -GitArgs @('cat-file', '-e', "${Sha}:$Path") -AllowFail).ExitCode -eq 0) }

function Test-SharedRootMatchesRepo {
    # The checkout we read Shared from must be the repository the lock names. M8 (m6): a missing remote, or a remote that is not a
    # GitHub repository, is UNKNOWN (PIN_REPOSITORY_UNVERIFIED), never "no problem". The host is anchored (Get-RemoteRepoId).
    param([string]$SharedRoot, [string]$Repository)
    $r = Invoke-Git -Dir $SharedRoot -GitArgs @('config', '--get', 'remote.origin.url') -AllowFail
    $url = $r.Out.Trim()
    if ($r.ExitCode -ne 0 -or $url -eq '') { return @('PIN_REPOSITORY_UNVERIFIED') }
    $id = Get-RemoteRepoId $url
    if ($null -eq $id) { return @('PIN_REPOSITORY_UNVERIFIED') }
    if ($id -ine $Repository) { return @('PIN_REPOSITORY_MISMATCH') }
    return @()
}

function Test-PinIdentity {
    # An existing pin must stay a true statement: that commit exists in Shared, carries that version,
    # and was integrated on Shared's main line. Returns a list of problem codes (empty = identity holds).
    param([string]$SharedRoot, $Lock, [string]$MainRef = 'origin/main')
    $problems = @()
    $sha = [string]$Lock['source_commit']
    $problems += @(Test-SharedRootMatchesRepo -SharedRoot $SharedRoot -Repository ([string]$Lock['source_repository']))
    if (-not (Test-CommitPresent -Dir $SharedRoot -Sha $sha)) { return @($problems + 'PIN_COMMIT_NOT_IN_SHARED') }
    $ver = Get-SharedFileAt -SharedRoot $SharedRoot -Sha $sha -Path 'VERSION'
    if ($null -eq $ver -or $ver.Trim() -cne [string]$Lock['source_version']) { $problems += 'PIN_VERSION_MISMATCH' }
    $main = Invoke-Git -Dir $SharedRoot -GitArgs @('rev-parse', '--verify', '--quiet', "$MainRef^{commit}") -AllowFail
    if ($main.ExitCode -ne 0) { $problems += 'PIN_MAIN_UNKNOWN' }   # cannot prove it was integrated: fail closed
    elseif (-not (Test-IsAncestor -Dir $SharedRoot -Ancestor $sha -Descendant $main.Out.Trim())) { $problems += 'PIN_NOT_ON_MAIN' }
    return $problems
}

function Find-IncompatibleConsumers {
    # What the Project itself (its tools, tests, workflows, scripts, docs) assumes about Shared. A major step (2.x -> 3.x) breaks
    # hard-coded version gates and references to files/roles 3.0 does not have. Read-only; it can only see THIS repository:
    # consumers elsewhere (other repos' CI, wrappers, secrets) are UNKNOWN and the caller says so.
    # M8 (m6): every tracked text file is read (not a list of directories and extensions), matching is case-insensitive, the
    # path lookbehind does not exclude '/' (so '$SharedRoot/core/x' and '../shared/core/x' are seen), the 2.x gate has the
    # StartsWith and -like forms, and nothing is skipped silently: a line of any length is read, and a file above 5 MB is
    # reported as UNSCANNED (a finding, so an unacknowledged pin is refused). Binary files (NUL in the first 8 KB) are not text.
    param([string]$ProjectRoot, [string]$SharedRoot, [string]$Target, [int]$NewMajor)
    $found = [System.Collections.Generic.List[string]]::new()
    $scanned = 0
    $unscanned = 0   # D2: every file that is not read as text is counted here and is a finding (never a silent skip)
    $cap = 5MB
    $ci = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    $major2 = [regex]::new('\^2\\\.|\^2\\\\\.|StartsWith\(\s*[''"]2\.[''"]\s*\)|-(?:c|i)?like\s+[''"]2\.\*?[''"]|-(?:c|i)?match\s+[''"]\^?2\\\.', $ci)
    $pathRef = [regex]::new('(?<![A-Za-z0-9_.\-])((?:core|tools|templates)/[A-Za-z0-9_./\-]+\.(?:md|psd1|ps1|yml|json))', $ci)
    $retired = [regex]::new('RELEASED_SHARED|NEXT_ACTION\.yml|validate-(?:project|shared)\.ps1|SHARED_SYNC_|CODEX_MAIN|INDEPENDENT_REVIEW|GPT_ORCHESTRATOR|first-proof|downstream-sweep', $ci)
    foreach ($f in @(Get-TrackedFiles -Root $ProjectRoot)) {
        $path = Join-Path $ProjectRoot $f
        if (-not (Test-IsPlainFile $path)) {
            # D2: a link is reported as UNSCANNED_REPARSE_POINT; any other non-file (directory, unreadable) as UNSCANNED_NOT_A_PLAIN_FILE.
            $unscanned++
            if (Test-IsReparsePoint $path) { $found.Add("UNSCANNED_REPARSE_POINT: $f is a link; its content was not read (links are not followed). Review its target by hand before pinning.") }
            else { $found.Add("UNSCANNED_NOT_A_PLAIN_FILE: $f is not a plain file and was not read. Review it by hand before pinning.") }
            continue
        }
        if ((Get-Item -Force -LiteralPath $path).Length -gt $cap) { $unscanned++; $found.Add("UNSCANNED: $f is larger than 5 MB and was not read (review it by hand before pinning)"); continue }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $nul = [Array]::IndexOf($bytes, [byte]0)
        if ($nul -ge 0 -and $nul -lt 8192) {
            # D2: a NUL byte in the first 8 KB is binary, or UTF-16 as written by Windows PowerShell. It is not scanned as text,
            # so it is a finding and is counted as unscanned, never skipped silently.
            $unscanned++
            $found.Add("UNSCANNED_BINARY_OR_UTF16: $f has a NUL byte in its first 8 KB (binary, or UTF-16 text) and was not scanned as text. Review it by hand before pinning.")
            continue
        }
        $scanned++
        $n = 0
        foreach ($line in ((ConvertTo-Lf ([System.Text.Encoding]::UTF8.GetString($bytes))) -split "`n")) {
            $n++
            if ($NewMajor -ne 2 -and $major2.IsMatch($line)) {
                $snippet = $line.Trim(); if ($snippet.Length -gt 100) { $snippet = $snippet.Substring(0, 100) }
                $found.Add("${f}:${n} hard-codes Shared 2.x versions (^2\.): $snippet")
            }
            if ($f -notmatch '\A(?:AGENTS|CLAUDE)\.md\z') { foreach ($m in $pathRef.Matches($line)) {
                $ref = $m.Groups[1].Value
                if ($f -like 'tools/*' -and $ref -like 'tools/*') { continue }   # the Project's own tools/ path, not Shared's
                if ($ref -like 'core/*' -or $ref -like 'templates/*') { if (-not (Test-SharedPathAt -SharedRoot $SharedRoot -Sha $Target -Path $ref)) { $found.Add("${f}:${n} reads Shared path ${ref}, absent in the target") } }
            } }   # (AGENTS.md / CLAUDE.md paths are the bootstrap probe's job: MissingBootstrapPaths)
            foreach ($m in $retired.Matches($line)) { $found.Add("${f}:${n} depends on a 2.x mechanism 3.0 retired: $($m.Value)") }
        }
    }
    return [pscustomobject]@{ Consumers = @($found | Select-Object -Unique); FilesScanned = $scanned; FilesUnscanned = $unscanned }
}

function Get-PinPlan {
    param([Parameter(Mandatory)][string]$ProjectRoot, [Parameter(Mandatory)][string]$SharedRoot, [Parameter(Mandatory)][string]$To, [string]$MainRef = 'origin/main')
    $lock = Read-Lock -Path (Get-LockPath $ProjectRoot)
    $target = Resolve-Commit -Dir $SharedRoot -Rev $To
    $tver = Get-SharedFileAt -SharedRoot $SharedRoot -Sha $target -Path 'VERSION'
    if ($null -eq $tver) { Stop-Shared -Reason 'TARGET_INVALID' -Message "Target $target has no VERSION file." }
    $tver = $tver.Trim()
    if ($tver -notmatch '\A\d+\.\d+\.\d+(-[0-9A-Za-z.\-]+)?\z') { Stop-Shared -Reason 'TARGET_INVALID' -Message "Target $target has a VERSION that is not a single semver line." }
    $main = Invoke-Git -Dir $SharedRoot -GitArgs @('rev-parse', '--verify', '--quiet', "$MainRef^{commit}") -AllowFail
    $onMain = ($main.ExitCode -eq 0 -and (Test-IsAncestor -Dir $SharedRoot -Ancestor $target -Descendant $main.Out.Trim()))
    $curMajor = [int](([string]$lock['source_version']) -split '\.')[0]
    $newMajor = [int]($tver -split '\.')[0]
    # Static migration probe: Shared paths named by the Project's bootstrap files must exist in the target.
    $missing = @()
    foreach ($f in 'AGENTS.md', 'CLAUDE.md') {
        $p = Join-Path $ProjectRoot $f
        if (-not (Test-Path $p)) { continue }
        foreach ($m in [regex]::Matches((Read-TextLf $p), '(?<![A-Za-z0-9_./\-])((?:core|tools|templates)/[A-Za-z0-9_./\-]+\.(?:md|psd1|ps1|yml|json))')) {
            $rel = $m.Groups[1].Value
            if (-not (Test-SharedPathAt -SharedRoot $SharedRoot -Sha $target -Path $rel)) { $missing += "$f -> $rel" }
        }
    }
    $active = @(Get-AllTasks -Root $ProjectRoot | Where-Object { $_.Status -in @('READY', 'ACTIVE', 'REVIEW', 'BLOCKED') -and $_.Shared -ne $target } | ForEach-Object { "$($_.Id) keeps $(if ($_.Shared) { $_.Shared } else { 'its recorded pin' })" })
    $cons = Find-IncompatibleConsumers -ProjectRoot $ProjectRoot -SharedRoot $SharedRoot -Target $target -NewMajor $newMajor
    $verdict = 'OK'
    $reasons = @()
    if (-not $onMain) { $verdict = 'BLOCKED'; $reasons += 'TARGET_NOT_ON_SHARED_MAIN' }
    if ($target -ceq [string]$lock['source_commit']) { $reasons += 'ALREADY_PINNED' }
    if ($verdict -ne 'BLOCKED' -and ($missing.Count -gt 0 -or $newMajor -ne $curMajor -or $cons.Consumers.Count -gt 0)) { $verdict = 'MIGRATION_REQUIRED' }
    $identity = @(Test-PinIdentity -SharedRoot $SharedRoot -Lock $lock -MainRef $MainRef)
    return [pscustomobject]@{ ExistingPinProblems = $identity; Current = [string]$lock['source_commit']; CurrentVersion = [string]$lock['source_version']; Target = $target; TargetVersion = $tver; MajorChange = ($newMajor -ne $curMajor); MissingBootstrapPaths = $missing; ActiveTaskPins = $active; Consumers = $cons.Consumers; ConsumerFilesScanned = $cons.FilesScanned; ConsumerFilesUnscanned = $cons.FilesUnscanned; OutsideConsumers = 'UNKNOWN (CI/wrappers/secrets in other repositories are not visible from here)'; Reasons = $reasons; Verdict = $verdict }
}

function Invoke-PinApply {
    # Edits only the three identity lines of the lock, atomically, then reads them back.
    param([string]$ProjectRoot, [string]$SharedRoot, [string]$To, [switch]$AcknowledgeMigration, [switch]$AcknowledgeConsumers)
    Assert-Sha40 $To 'pin -To (apply needs the exact 40-hex commit; use plan to resolve a tag or branch)'
    Assert-CleanTree -Dir $ProjectRoot
    $plan = Get-PinPlan -ProjectRoot $ProjectRoot -SharedRoot $SharedRoot -To $To
    if ($plan.Verdict -eq 'BLOCKED') { Stop-Shared -Reason 'PIN_BLOCKED' -Message ("Refusing to pin: " + ($plan.Reasons -join ', ')) -Code 2 }
    if ($plan.Verdict -eq 'MIGRATION_REQUIRED' -and -not $AcknowledgeMigration) {
        Stop-Shared -Reason 'MIGRATION_REQUIRED' -Message "Major or bootstrap change. Update the Project bootstrap in the same PR and re-run with -AcknowledgeMigration. Missing: $($plan.MissingBootstrapPaths -join '; ')" -Code 2
    }
    if ($plan.Consumers.Count -gt 0 -and -not $AcknowledgeConsumers) {
        Stop-Shared -Reason 'PIN_INCOMPATIBLE_CONSUMERS' -Message "The Project's own files still assume Shared 2.x ($($plan.Consumers.Count) finding(s), first: $($plan.Consumers[0])). Fix them in the same PR (a migration TASK), then re-run with -AcknowledgeConsumers. -AcknowledgeMigration alone is not enough." -Code 2
    }
    if ($plan.Reasons -contains 'ALREADY_PINNED') { return $plan }
    $path = Get-LockPath $ProjectRoot
    $text = Read-TextLf $path
    $set = { param($t, $k, $v) if ($t -match "(?m)^$k\s*:") { [regex]::Replace($t, "(?m)^$k\s*:.*$", "${k}: $v") } else { $t.TrimEnd("`n") + "`n${k}: $v`n" } }
    $text = & $set $text 'source_version' $plan.TargetVersion
    $text = & $set $text 'source_commit' $plan.Target
    Write-Utf8NoBom -Path $path -Text $text
    $back = Read-Lock -Path $path
    if ([string]$back['source_commit'] -cne $plan.Target -or [string]$back['source_version'] -cne $plan.TargetVersion) { Stop-Shared -Reason 'PIN_READBACK' -Message 'Lock readback differs from the intended pin.' -Code 3 }
    return $plan
}
