# Copy the pinned Shared into a Project (sync) and start a Project (init-project). Core.
# The Project keeps a COPY of the rules, the core tools, the templates and the skills, so a session that can fetch only the Project
# still has everything. Only this code writes the copied paths; the Project's own files are never touched. Nothing is committed.
Set-StrictMode -Version Latest

$script:SyncManifest = 'docs/ai/shared/MANIFEST'

function Get-SyncSources {
    # Tracked files of the Shared checkout that are copied, as @{ From; To } (repo-relative, '/' separated).
    param([Parameter(Mandatory)][string]$SharedRoot, [switch]$IncludeGate)
    $tracked = @((Invoke-Git -Dir $SharedRoot -GitArgs @('ls-files', '-z', '--cached')) -split "`0" | Where-Object { $_ -ne '' })
    $out = [System.Collections.Generic.List[object]]::new()
    foreach ($f in $tracked) {
        $to = $null
        if ($f -in @('RULES.md', 'ROLES.md')) { $to = "docs/ai/shared/$f" }
        elseif ($f -like 'templates/*') { $to = "docs/ai/shared/$f" }
        elseif ($f -eq 'tools/shared.ps1' -or $f -eq 'tools/README.md' -or $f -like 'tools/lib/*') { $to = "docs/ai/shared/$f" }
        elseif ($IncludeGate -and $f -like 'tools/gate/*') { $to = "docs/ai/shared/$f" }
        elseif ($f -like '.claude/skills/*') { $to = $f }
        if ($null -ne $to) { $out.Add([pscustomobject]@{ From = $f; To = $to }) }
    }
    return @($out)
}

function Read-SyncManifest {
    # @{ Commit; Files = @{ path = sha256 } } of the previous sync, or $null.
    param([string]$ProjectRoot)
    $p = Join-Path $ProjectRoot $script:SyncManifest
    if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { return $null }
    $files = @{}; $commit = ''
    foreach ($l in ((Read-TextLf $p) -split "`n")) {
        if ($l -match '\Acommit:\s*([0-9a-f]{40})\s*\z') { $commit = $Matches[1] }
        elseif ($l -match '\A([0-9a-f]{64})  (\S.*)\z') { $files[$Matches[2]] = $Matches[1] }
    }
    return @{ Commit = $commit; Files = $files }
}

function Invoke-Sync {
    # -TreeChecked: init-project has just checked the Project tree and then created its own files, which are not user changes.
    param([Parameter(Mandatory)][string]$ProjectRoot, [Parameter(Mandatory)][string]$SharedRoot, [switch]$IncludeGate, [switch]$TreeChecked)
    if (-not $TreeChecked) { Assert-CleanTree -Dir $ProjectRoot }
    Assert-CleanTree -Dir $SharedRoot
    $lock = Read-Lock (Get-LockPath $ProjectRoot)
    $head = Resolve-Commit -Dir $SharedRoot -Rev 'HEAD'
    if ($head -cne [string]$lock['source_commit']) {
        Stop-Shared -Reason 'SYNC_COMMIT_MISMATCH' -Message "The Shared checkout is at $head but the lock pins $($lock['source_commit']). Check out the pinned commit, or move the pin first (pin plan / pin apply)." -Code 2
    }
    $sources = @(Get-SyncSources -SharedRoot $SharedRoot -IncludeGate:$IncludeGate)
    if (@($sources | Where-Object { $_.From -eq 'RULES.md' }).Count -eq 0) { Stop-Shared -Reason 'SYNC_SOURCE_INVALID' -Message "$SharedRoot does not look like a Shared checkout (no tracked RULES.md)." -Code 2 }
    $prev = Read-SyncManifest -ProjectRoot $ProjectRoot
    $new = [ordered]@{}; $copied = 0
    foreach ($s in $sources) {
        $src = Join-Path $SharedRoot $s.From
        if (-not (Test-IsPlainFile $src)) { Stop-Shared -Reason 'SYNC_SOURCE_INVALID' -Message "$($s.From) is not a plain file (a link or a directory); it is not copied." -Code 2 }
        $bytes = [System.IO.File]::ReadAllBytes($src)
        $dst = Join-Path $ProjectRoot $s.To
        $same = (Test-Path -LiteralPath $dst -PathType Leaf) -and [System.Linq.Enumerable]::SequenceEqual([byte[]][System.IO.File]::ReadAllBytes($dst), [byte[]]$bytes)
        if (-not $same) {
            New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
            [System.IO.File]::WriteAllBytes($dst, $bytes); $copied++
        }
        $new[$s.To] = ([System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::HashData($bytes)) -replace '-', '').ToLowerInvariant()
    }
    # Remove only what an earlier sync wrote and Shared no longer ships.
    $removed = 0
    if ($null -ne $prev) {
        foreach ($old in $prev.Files.Keys) {
            if ($new.Contains($old)) { continue }
            if ($old -notlike 'docs/ai/shared/*' -and $old -notlike '.claude/skills/*') { continue }   # the manifest is not an authority to delete anywhere else
            $p = Join-Path $ProjectRoot $old
            if (Test-Path -LiteralPath $p -PathType Leaf) { Remove-Item -LiteralPath $p -Force; $removed++ }
        }
    }
    $lines = @("commit: $head") + @($new.Keys | Sort-Object | ForEach-Object { "$($new[$_])  $_" })
    $mp = Join-Path $ProjectRoot $script:SyncManifest
    New-Item -ItemType Directory -Path (Split-Path -Parent $mp) -Force | Out-Null
    Write-Utf8NoBom -Path $mp -Text (($lines -join "`n") + "`n")
    # Prune directories the removal left empty.
    foreach ($root in 'docs/ai/shared', '.claude/skills') {
        $r = Join-Path $ProjectRoot $root
        if (Test-Path -LiteralPath $r) { foreach ($d in @(Get-ChildItem -LiteralPath $r -Directory -Recurse | Sort-Object { $_.FullName.Length } -Descending)) { if (@(Get-ChildItem -LiteralPath $d.FullName -Force).Count -eq 0) { Remove-Item -LiteralPath $d.FullName -Force } } }
    }
    return [pscustomobject]@{ Commit = $head; Files = $new.Count; Copied = $copied; Removed = $removed }
}

function Invoke-InitProject {
    # Creates what a Project needs and does not have; never overwrites. Then copies the pinned Shared (sync).
    param([Parameter(Mandatory)][string]$ProjectRoot, [Parameter(Mandatory)][string]$SharedRoot, [switch]$IncludeGate)
    Assert-CleanTree -Dir $ProjectRoot
    Assert-CleanTree -Dir $SharedRoot
    $head = Resolve-Commit -Dir $SharedRoot -Rev 'HEAD'
    $version = (Read-TextLf (Join-Path $SharedRoot 'VERSION')).Trim()
    $made = [System.Collections.Generic.List[string]]::new(); $kept = [System.Collections.Generic.List[string]]::new()
    $put = {
        param($rel, $text)
        $p = Join-Path $ProjectRoot $rel
        if (Test-Path -LiteralPath $p) { $kept.Add($rel); return }
        New-Item -ItemType Directory -Path (Split-Path -Parent $p) -Force | Out-Null
        Write-Utf8NoBom -Path $p -Text $text
        $made.Add($rel)
    }
    & $put 'AGENTS.md' (Read-TextLf (Join-Path $SharedRoot 'templates/AGENTS.md'))
    & $put 'CLAUDE.md' (Read-TextLf (Join-Path $SharedRoot 'templates/CLAUDE.md'))   # Claude Code reads CLAUDE.md, not AGENTS.md: it only imports the entry
    & $put 'docs/ai/PROJECT.md' (Read-TextLf (Join-Path $SharedRoot 'templates/PROJECT.md'))
    $repo = 'Osato-Gasu/shared'
    $pol = Join-Path $SharedRoot 'policy.json'
    if (Test-Path -LiteralPath $pol) { $r = [string](Get-Prop (Read-Policy -Root $SharedRoot) 'repository' ''); if (Test-RepoName $r) { $repo = $r } }
    & $put 'docs/ai/SHARED_RULES.lock.yml' "schema_version: 2`nsource_repository: $repo`nsource_version: $version`nsource_commit: $head`n"
    $lock = Read-Lock (Get-LockPath $ProjectRoot)
    $problems = @(Test-PinIdentity -SharedRoot $SharedRoot -Lock $lock)
    if ($problems.Count -gt 0) { Stop-Shared -Reason 'PIN_IDENTITY' -Message "The pin does not hold: $($problems -join ', ')." -Code 1 }
    $sync = Invoke-Sync -ProjectRoot $ProjectRoot -SharedRoot $SharedRoot -IncludeGate:$IncludeGate -TreeChecked
    return [pscustomobject]@{ Created = @($made); Kept = @($kept); Sync = $sync }
}
