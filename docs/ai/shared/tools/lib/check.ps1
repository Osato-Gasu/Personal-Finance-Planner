# Repository validation: structure, traceability, links, secrets, portability, frozen history (RULES I1 I9 I10).
Set-StrictMode -Version Latest

function New-Finding { param([string]$Level, [string]$Code, [string]$Message) [pscustomobject]@{ Level = $Level; Code = $Code; Message = $Message } }

function Test-PathExistsNoFollow { param([string]$Path) try { $null = [System.IO.File]::GetAttributes($Path); return $true } catch { return $false } }

function Test-IsPlainFile {
    param([string]$Path)
    try { $a = [System.IO.File]::GetAttributes($Path); return (-not ($a -band [System.IO.FileAttributes]::ReparsePoint) -and -not ($a -band [System.IO.FileAttributes]::Directory)) } catch { return $false }
}

function Test-IsReparsePoint {
    # D2: a symbolic link (or other reparse point). Callers report it; they never skip it silently.
    param([string]$Path)
    try { $a = [System.IO.File]::GetAttributes($Path); return [bool]($a -band [System.IO.FileAttributes]::ReparsePoint) } catch { return $false }
}

function Get-TrackedFiles {
    param([string]$Root)
    $out = Invoke-Git -Dir $Root -GitArgs @('ls-files', '-z', '--cached', '--others', '--exclude-standard')
    # Existence is tested without following links: a dangling symlink is still a tracked path that the path checks must see.
    return @($out -split "`0" | Where-Object { $_ -ne '' } | Where-Object { Test-PathExistsNoFollow (Join-Path $Root $_) })
}

function Test-FrozenPath {
    param($Eff, [string]$Path)
    if (Test-AnyGlob -Path $Path -Patterns $Eff.FrozenPaths) { return $true }
    if ($Path -match '\Adocs/ai/tasks/TASK-(\d+)\.md\z' -and [int]$Matches[1] -le $Eff.FrozenTaskMax) { return $true }
    return $false
}

function Test-FrozenHistory {
    # Existing history may only be added to. EVENTS.jsonl may only gain lines at the end.
    param([string]$Root, $Eff, [string]$Base)
    $f = @()
    $baseCommit = Resolve-Commit -Dir $Root -Rev $Base
    $mb = (Invoke-Git -Dir $Root -GitArgs @('merge-base', $baseCommit, 'HEAD')).Trim()
    $lines = (Invoke-Git -Dir $Root -GitArgs @('diff', '--name-status', '-z', '-M', $mb, 'HEAD')) -split "`0"
    for ($i = 0; $i -lt $lines.Count; ) {
        $st = $lines[$i]; if ($st -eq '') { break }
        if ($st.StartsWith('R') -or $st.StartsWith('C')) { $old = $lines[$i + 1]; $new = $lines[$i + 2]; $i += 3 } else { $old = $lines[$i + 1]; $new = $old; $i += 2 }
        # Every EVENTS.jsonl is append-only (hash chains cannot see an edited last line; Git can).
        if (-not ($old -match '/EVENTS\.jsonl\z') -and -not (Test-FrozenPath -Eff $Eff -Path $old)) { continue }
        if ($st -eq 'A') { continue }
        if ($st -eq 'M' -and $old.EndsWith('/EVENTS.jsonl')) {
            $oldText = (Invoke-Git -Dir $Root -GitArgs @('show', "${mb}:$old")) -replace "`r`n", "`n"
            $newText = ConvertTo-Lf ([System.IO.File]::ReadAllText((Join-Path $Root $new)))
            if (-not $newText.StartsWith($oldText.TrimEnd("`n") + "`n")) { $f += New-Finding 'FAIL' 'FROZEN_EVENTS_REWRITTEN' "$old was edited, not appended." }
            continue
        }
        $f += New-Finding 'FAIL' 'FROZEN_HISTORY_CHANGED' "$st $old (history is add-only)."
    }
    return $f
}

function Test-LiveBase {
    # The frozen-history comparison is only as good as its base. A local `origin/main` that was never refreshed (or whose
    # refresh failed) must not produce a PASS (SH3-RC1-F02): the base must equal the live head of the branch, read now
    # through the API with the read-only token. Any read error, mismatch or missing local base is a FAIL, never a skip.
    param([string]$Root, [string]$Base, [string]$Repo)
    if (-not (Test-RepoName $Repo)) { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Live base check needs -Repo owner/name (got '$Repo').") }
    $branch = $Base -replace '\A(?:refs/remotes/)?[^/]+/', ''
    if ($branch -notmatch '\A[A-Za-z0-9._][A-Za-z0-9._/\-]*\z' -or $branch -match '\.\.|//|/\z') { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Cannot derive a plain branch name from base '$Base'.") }
    try { $local = Resolve-Commit -Dir $Root -Rev $Base }
    catch { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Local base '$Base' does not resolve ($($_.Exception.Message)); it was not fetched.") }
    try {
        $j = Invoke-GitHubApi -Path "/repos/$Repo/git/ref/heads/$branch"
        $live = [string](Get-Prop (Get-Prop $j 'object' $null) 'sha' '')
    } catch { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Live head of '$branch' could not be read: $($_.Exception.Message)") }
    if (-not (Test-Sha40 $live)) { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Live head of '$branch' came back malformed ('$live').") }
    if ($live -cne $local) { return @(New-Finding 'FAIL' 'BASE_STALE' "Local base $Base is $local but live '$branch' is $live (moved or never refreshed). Re-run on a fresh checkout; the comparison was not trusted.") }
    return @()
}

function Test-PreviousHead {
    # Push to the default branch: the base is the head this push replaced (GitHub's own `before`), not a moving ref.
    # It must exist locally and be an ancestor of HEAD (a rewritten main is a FAIL). All-zero = the very first push;
    # empty = an event that has no `before` (manual dispatch): both are reported, never silently treated as compared.
    param([string]$Root, [string]$Base)
    if ($Base -eq '') { return @(New-Finding 'WARN' 'BASE_NOT_AVAILABLE' 'This event has no previous head; frozen history was NOT compared on this run.') }
    if ($Base -cmatch '\A0{40}\z') { return @(New-Finding 'WARN' 'BASE_INITIAL' 'First push of this ref: there is no earlier history to compare.') }
    if (-not (Test-Sha40 $Base)) { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Previous head '$Base' is not an exact 40-hex commit.") }
    if (-not (Test-CommitPresent -Dir $Root -Sha $Base)) { return @(New-Finding 'FAIL' 'BASE_UNVERIFIED' "Previous head $Base is not in this checkout (shallow or unfetched).") }
    if (-not (Test-IsAncestor -Dir $Root -Ancestor $Base -Descendant (Resolve-Commit -Dir $Root -Rev 'HEAD'))) { return @(New-Finding 'FAIL' 'MAIN_REWRITTEN' "Previous head $Base is not an ancestor of HEAD: history of the default branch was rewritten.") }
    return @()
}

function Test-PortablePaths {
    # Every tracked path is checked, history included: a new `Docs/...` file would overwrite frozen history on a
    # case-folding checkout, and anything unportable added under a frozen directory could never be removed again.
    param($Eff, [string[]]$Files)
    $f = @()
    $seen = @{}
    $reserved = '\A(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?\z'
    foreach ($p in $Files) {
        $k = $p.ToLowerInvariant()
        if ($seen.ContainsKey($k) -and $seen[$k] -cne $p) { $f += New-Finding 'FAIL' 'PATH_CASE_COLLISION' "$p and $($seen[$k]) differ only by case (breaks Windows checkouts and can overwrite history)." }
        $seen[$k] = $p
        if ($p.Length -gt 200) { $f += New-Finding 'FAIL' 'PATH_TOO_LONG' "$p exceeds 200 chars (Windows MAX_PATH risk)." }
        foreach ($seg in ($p -split '/')) {
            if ($seg -match '[<>:"|?*\x00-\x1f]' -or $seg -match '[ .]\z' -or $seg -match $reserved -or $seg -match '~\d') { $f += New-Finding 'FAIL' 'PATH_NOT_PORTABLE' "$p has a segment Windows cannot create or may alias ('$seg')." }
        }
    }
    return $f
}

function Get-Utf16Text {
    # S1: UTF-16 text is decoded instead of skipped. The byte order comes from a BOM or, without one, from the NUL pattern of
    # ASCII-range text (a zero at every odd offset = little endian, at every even offset = big endian). The decode is strict
    # (odd length or an unpaired surrogate throws) and the result must be text (no control characters). Anything else is $null.
    param([byte[]]$Bytes)
    $n = $Bytes.Length - ($Bytes.Length % 2)   # a stray trailing byte cannot hold a code unit
    $start = 0; $big = $false
    if ($n -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) { $start = 2 }
    elseif ($n -ge 2 -and $Bytes[0] -eq 0xFE -and $Bytes[1] -eq 0xFF) { $start = 2; $big = $true }
    else {
        if ($n -lt 2) { return $null }
        $sample = [Math]::Min($n, 8192); $pairs = $sample / 2; $zeroEven = 0; $zeroOdd = 0
        for ($i = 0; $i -lt $sample; $i++) { if ($Bytes[$i] -eq 0) { if ($i % 2) { $zeroOdd++ } else { $zeroEven++ } } }
        if ($zeroOdd * 2 -ge $pairs -and $zeroOdd -gt $zeroEven) { $big = $false }
        elseif ($zeroEven * 2 -ge $pairs -and $zeroEven -gt $zeroOdd) { $big = $true }
        else { return $null }
    }
    $enc = [System.Text.UnicodeEncoding]::new($big, $false, $true)
    try { $text = $enc.GetString($Bytes, $start, $n - $start) } catch { return $null }
    if ($text -cmatch '[\x00-\x08\x0B\x0E-\x1F\x7F-\x9F\uFFFE\uFFFF]') { return $null }
    return $text
}

function Test-SecretScan {
    param([string]$Root, $Eff, [string[]]$Files)
    $f = @()
    $rx = @($Eff.SecretPatterns | ForEach-Object { [regex]::new($_) })
    $binary = [System.Collections.Generic.List[string]]::new()
    foreach ($p in $Files) {
        # No exemption for history: a credential or an unportable path added under a frozen directory could never be removed.
        $full = Join-Path $Root $p
        if (-not (Test-IsPlainFile $full)) {
            # Links and directories: path checks still apply and content is not followed. D2: a link is reported, never skipped silently.
            if (Test-IsReparsePoint $full) { $f += New-Finding 'WARN' 'UNSCANNED_REPARSE_POINT' "$p is a link (symbolic link or reparse point): its content was not read, and links are not followed. Review its target by hand." }
            # S2: a tracked directory is a submodule (git lists no other directories). Its content is another repository: reported, never silent.
            elseif ([System.IO.Directory]::Exists($full)) { $f += New-Finding 'WARN' 'UNSCANNED_SUBMODULE' "$p is a tracked directory (a submodule): its content was not scanned by this check. Scan that repository on its own." }
            continue
        }
        $fi = [System.IO.FileInfo]::new($full)
        # X1: a file is read in full up to a generous cap. Beyond it the content is not read, and that is reported (never a silent skip).
        if ($fi.Length -gt 64MB) { $f += New-Finding 'WARN' 'UNSCANNED_TOO_LARGE' "$p is larger than 64 MB: its content was not pattern-scanned. Review it by hand."; continue }
        # X2: a file that cannot be read is reported with its path (never a silent skip).
        try { $bytes = [System.IO.File]::ReadAllBytes($full) } catch { $f += New-Finding 'WARN' 'UNSCANNED_READ_ERROR' "$p could not be read ($($_.Exception.Message)): its content was not pattern-scanned. Review it by hand."; continue }   # (assignment, not try-as-expression: an empty file must stay an empty array)
        if ([Array]::IndexOf($bytes, [byte]0) -ge 0) {
            # S1: a NUL byte is not proof of binary. UTF-16 text is decoded and scanned; a blob that does not decode as text is reported.
            $text = Get-Utf16Text -Bytes $bytes
            if ($null -eq $text) { $binary.Add($p); continue }
        } else { $text = [System.Text.Encoding]::UTF8.GetString($bytes) }
        foreach ($r in $rx) { if ($r.IsMatch($text)) { $f += New-Finding 'FAIL' 'SECRET_PATTERN' "$p matches a credential pattern ($($r.ToString().Substring(0, [Math]::Min(18, $r.ToString().Length)))...). Remove it and rotate the credential (USER)." } }
    }
    # S1: still reported, never silent. Many binaries (images in a frozen history) are one finding with the count and the first paths,
    # so that a real warning is not buried; a few stay one finding each.
    if ($binary.Count -le 3) { foreach ($p in $binary) { $f += New-Finding 'WARN' 'UNSCANNED_BINARY' "$p is binary (or UTF-16 that does not decode as text): its content was not pattern-scanned. Review it by hand." } }
    elseif ($binary.Count -gt 0) { $f += New-Finding 'WARN' 'UNSCANNED_BINARY' "$($binary.Count) files are binary (or UTF-16 that does not decode as text): their content was not pattern-scanned. Review them by hand. First: $(($binary | Select-Object -First 5) -join ', ')" }
    return $f
}

function Test-MarkdownLinks {
    param([string]$Root, [string[]]$Files)
    $f = @()
    foreach ($p in $Files) {
        if ($p -notmatch '\.md\z') { continue }
        $dir = Split-Path -Parent (Join-Path $Root $p)
        $text = (Read-TextLf (Join-Path $Root $p)) -replace '(?s)```.*?```', ''
        foreach ($m in [regex]::Matches($text, '\]\(([^)\s]+)\)')) {
            $t = $m.Groups[1].Value
            if ($t -match '\A(https?:|mailto:|#)') { continue }
            $t = ($t -split '#')[0]
            if ($t -eq '') { continue }
            if (-not (Test-Path -LiteralPath (Join-Path $dir $t))) { $f += New-Finding 'FAIL' 'LINK_BROKEN' "$p links to missing '$t'." }
        }
        foreach ($m in [regex]::Matches($text, '(?<![A-Za-z0-9_./\-])(tools/[A-Za-z0-9_./\-]+\.ps1)')) {
            if (-not (Test-Path -LiteralPath (Join-Path $Root $m.Groups[1].Value))) { $f += New-Finding 'FAIL' 'TOOL_REF_BROKEN' "$p names missing tool '$($m.Groups[1].Value)'." }
        }
    }
    return $f
}

function Test-SkillFiles {
    param([string]$Root)
    $f = @()
    $dir = Join-Path $Root '.claude/skills'
    if (-not (Test-Path $dir)) { return $f }
    foreach ($d in (Get-ChildItem -LiteralPath $dir -Directory)) {
        $sf = Join-Path $d.FullName 'SKILL.md'
        if (-not (Test-Path $sf)) { $f += New-Finding 'FAIL' 'SKILL_INVALID' "$($d.Name) has no SKILL.md."; continue }
        $t = Read-TextLf $sf
        if ($t -notmatch '(?s)\A---\n(.*?)\n---\n') { $f += New-Finding 'FAIL' 'SKILL_INVALID' "$($d.Name): no frontmatter."; continue }
        $fm = ConvertFrom-KeyValueLines $Matches[1]
        if ([string]$fm['name'] -cne $d.Name) { $f += New-Finding 'FAIL' 'SKILL_INVALID' "$($d.Name): name must equal the directory." }
        if ([string]::IsNullOrWhiteSpace([string]$fm['description'])) { $f += New-Finding 'FAIL' 'SKILL_INVALID' "$($d.Name): description is empty." }
        if (($t -split "`n").Count -gt 80) { $f += New-Finding 'WARN' 'SKILL_LONG' "$($d.Name): more than 80 lines; split or trim." }
        if ($t -match '(?i)(approv|authori[sz]|permission)[^\n]{0,40}(granted|is given|you may skip)') { $f += New-Finding 'WARN' 'SKILL_AUTHORITY_CLAIM' "$($d.Name): a Skill is a runbook; it must not grant authority." }
    }
    return $f
}

function Test-InvariantTraceability {
    # Every invariant (`### Ix`) in the documents that state the machine-enforced guarantees needs at least one test tagged `# covers: Ix`
    # (deleting tests cannot silently drop a guarantee). RULES.md holds the rules people follow; the guarantees live in tools/README.md (core)
    # and tools/gate/README.md (gate tools).
    param([string]$Root)
    $f = @()
    $rules = Join-Path $Root 'RULES.md'
    if (-not (Test-Path $rules)) { return @(New-Finding 'FAIL' 'RULES_MISSING' 'RULES.md is missing.') }
    $ids = @()
    foreach ($rel in 'RULES.md', 'tools/README.md', 'tools/gate/README.md') {
        $p = Join-Path $Root $rel
        if (Test-Path -LiteralPath $p) { $ids += @([regex]::Matches((Read-TextLf $p), '(?m)^###\s+(I\d+)\b') | ForEach-Object { $_.Groups[1].Value }) }
    }
    $ids = @($ids | Select-Object -Unique)
    if ($ids.Count -eq 0) { return @(New-Finding 'FAIL' 'RULES_NO_INVARIANTS' 'No invariants (### I1 ...) in RULES.md, tools/README.md or tools/gate/README.md.') }
    $covered = @{}
    foreach ($t in @(Get-ChildItem -LiteralPath (Join-Path $Root 'tests') -Filter '*.ps1' -ErrorAction SilentlyContinue)) {
        foreach ($m in [regex]::Matches((Read-TextLf $t.FullName), '(?m)^\s*#\s*covers:\s*(.+)$')) { foreach ($i in ($m.Groups[1].Value -split '[,\s]+')) { if ($i) { $covered[$i] = $true } } }
    }
    foreach ($id in $ids) { if (-not $covered.ContainsKey($id)) { $f += New-Finding 'FAIL' 'INVARIANT_UNTESTED' "$id has no test tagged '# covers: $id'." } }
    return $f
}

function Test-TasksAndEvidence {
    param([string]$Root, $Eff)
    $f = @()
    foreach ($t in @(Get-ChildItem -LiteralPath (Join-Path $Root 'docs/ai/tasks') -Filter 'TASK-*.md' -ErrorAction SilentlyContinue)) {
        if (Test-FrozenPath -Eff $Eff -Path "docs/ai/tasks/$($t.Name)") { continue }
        # A TASK file from before this format (no `schema:` and no `id:` in its front matter) is history of a Project that has not migrated:
        # it is reported, never failed. A file in the current format is validated strictly.
        $raw = Read-TextLf $t.FullName
        if ($raw -match '(?s)\A---\n(.*?)\n---') { $fm0 = ConvertFrom-KeyValueLines $Matches[1]; if (-not $fm0.Contains('schema') -and -not $fm0.Contains('id')) { $f += New-Finding 'WARN' 'TASK_LEGACY_FORMAT' "$($t.Name) is in the pre-4.0 TASK format; it is not validated (migrate it only when the TASK is reopened)."; continue } }
        try { [void](Read-Task -Root $Root -TaskId $t.BaseName) } catch { $f += New-Finding 'FAIL' 'TASK_INVALID' "$($t.Name): $($_.Exception.Message)" }
    }
    # Evidence chains are a gate-tools format; without those tools loaded there is nothing to verify here (git's add-only comparison still covers EVENTS.jsonl).
    $chainTools = [bool](Get-Command Test-EventChain -ErrorAction SilentlyContinue)
    foreach ($e in @(if ($chainTools) { Get-ChildItem -LiteralPath (Join-Path $Root 'docs/ai/evidence') -Filter 'EVENTS.jsonl' -Recurse -ErrorAction SilentlyContinue })) {
        $rel = Get-RelativePath $Root $e.FullName
        $c = Test-EventChain -Path $e.FullName
        if ($c.Status -eq 'BROKEN') { $f += New-Finding 'FAIL' 'EVIDENCE_BROKEN' "${rel}: $($c.Reason)" }
    }
    return $f
}

function Invoke-Check {
    param([Parameter(Mandatory)][string]$Root, [string]$Base = '', [string]$SharedRoot = '', [string]$LiveRepo = '', [switch]$PreviousHead)
    $findings = @()
    $isShared = Test-Path (Join-Path $Root 'policy.json')
    $lockPath = Get-LockPath $Root
    $isProject = Test-Path $lockPath
    if (-not $isShared -and -not $isProject) { return @(New-Finding 'FAIL' 'NOT_A_SHARED_REPO' 'Neither policy.json (Shared) nor docs/ai/SHARED_RULES.lock.yml (Project) found.') }

    $authority = Read-Authority -Root $Root
    if ($isShared) {
        $policy = Read-Policy -Root $Root
        $ver = (Read-TextLf (Join-Path $Root 'VERSION')).Trim()
        if ($ver -notmatch '\A\d+\.\d+\.\d+(-[0-9A-Za-z.\-]+)?\z') { $findings += New-Finding 'FAIL' 'VERSION_INVALID' "VERSION '$ver' is not semver." }
    } else {
        # A Project's policy comes from its pinned Shared; without it only the Project-owned checks run.
        $pf = if ($SharedRoot) { Join-Path $SharedRoot 'policy.json' } else { '' }
        $policy = if ($pf -and (Test-Path $pf)) { Read-JsonFile $pf } else { [pscustomobject]@{ kinds = [pscustomobject]@{}; ci = [pscustomobject]@{ required = @() }; secret_patterns = @(); frozen_paths = @(); frozen_task_max = 0 } }
    }
    if (-not $isShared) {
        # The frozen history belongs to the Shared repository's own 2.x past. A Project's reports and TASKs stay editable: its pinned Shared policy
        # must not freeze them (a Project may still freeze paths of its own through its registry `extra.frozen_paths`).
        $policy | Add-Member -NotePropertyName 'frozen_paths' -NotePropertyValue @() -Force
        $policy | Add-Member -NotePropertyName 'frozen_task_max' -NotePropertyValue 0 -Force
    }
    $eff = Get-EffectivePolicy -Policy $policy -Authority $authority

    # The registry belongs to the gate tools: without them there is no decision to fail closed, so nothing is reported.
    if (Get-Command Get-AuthorityProblems -ErrorAction SilentlyContinue) { foreach ($p in (Get-AuthorityProblems $authority)) { $findings += New-Finding 'WARN' $p "Authority registry: $p (decisions fail closed until fixed; see docs/MIGRATION.md)." } }
    $files = Get-TrackedFiles -Root $Root
    $docFiles = @($files | Where-Object { (Test-IsPlainFile (Join-Path $Root $_)) -and -not (Test-FrozenPath -Eff $eff -Path $_) -and ($_ -match '\A(RULES|AGENTS|README|CLAUDE)\.md\z' -or $_ -match '\Adocs/[^/]+\.md\z' -or $_ -match '\A\.claude/skills/.+\.md\z' -or $_ -match '\Atemplates/.+\.md\z') })
    if (-not $isShared) {
        # Files that `sync` copied from the pinned Shared keep Shared-relative paths and links; they are not this Project's documents.
        $mf = Read-SyncManifest -ProjectRoot $Root
        if ($null -ne $mf) { $docFiles = @($docFiles | Where-Object { -not $mf.Files.ContainsKey($_) }) }
    }
    $findings += Test-PortablePaths -Eff $eff -Files $files
    $findings += Test-SecretScan -Root $Root -Eff $eff -Files $files
    $findings += Test-MarkdownLinks -Root $Root -Files $docFiles
    $findings += Test-TasksAndEvidence -Root $Root -Eff $eff
    if ($isShared) { $findings += Test-InvariantTraceability -Root $Root; $findings += Test-SkillFiles -Root $Root }
    if ($Base -ne '' -or $PreviousHead) {
        # A shallow checkout cannot prove history: refuse rather than compare what happens to be there.
        if ((Invoke-Git -Dir $Root -GitArgs @('rev-parse', '--is-shallow-repository')).Trim() -ne 'false') { $findings += New-Finding 'FAIL' 'HISTORY_INCOMPLETE' 'The checkout is shallow: frozen history cannot be verified (fetch the full history first: ''fetch --unshallow'' on the remote, or fetch-depth: 0 in CI).' }
        if ($PreviousHead) { $pf = @(Test-PreviousHead -Root $Root -Base $Base); $findings += $pf; $compare = ($Base -ne '' -and $Base -cnotmatch '\A0{40}\z' -and @($pf | Where-Object Level -eq 'FAIL').Count -eq 0) }
        else {
            $compare = $true
            if ($LiveRepo -ne '' -and (Get-Command Invoke-GitHubApi -ErrorAction SilentlyContinue)) { $findings += Test-LiveBase -Root $Root -Base $Base -Repo $LiveRepo }
            else { $findings += New-Finding 'WARN' 'BASE_NOT_LIVE_VERIFIED' "Frozen history was compared with the local '$Base' as it is; its freshness was NOT checked (pass -Repo owner/name; CI does)." }
        }
        # An uncomparable base (not fetched, unrelated history) is a FAIL finding, never a skipped comparison.
        if ($compare) {
            try { $findings += Test-FrozenHistory -Root $Root -Eff $eff -Base $Base }
            catch { $findings += New-Finding 'FAIL' 'FROZEN_HISTORY_UNCOMPARABLE' "Frozen history could not be compared with '$Base': $($_.Exception.Message)" }
        }
    }
    if ($isProject) {
        $lock = $null
        try {
            $lock = Read-Lock -Path $lockPath
            if ($SharedRoot -ne '') { foreach ($p in (Test-PinIdentity -SharedRoot $SharedRoot -Lock $lock)) { $findings += New-Finding 'FAIL' $p "Existing Shared pin identity does not hold ($($lock['source_commit']))." } }
        } catch { $findings += New-Finding 'FAIL' 'LOCK_INVALID' $_.Exception.Message }
        if ($SharedRoot -eq '') { $findings += New-Finding 'WARN' 'SHARED_ROOT_REQUIRED' 'Pin identity and the pinned Shared policy were NOT checked (pass -SharedRoot <Shared checkout>); built-in secret patterns were used.' }
        # The Project's copy of the pinned Shared (sync). Only a Project on 4.x or later is expected to have one; a stale copy is a warning, never a stop.
        if ($lock -and [string]$lock['source_version'] -match '\A([4-9]|\d{2,})\.') {
            $mf = Read-SyncManifest -ProjectRoot $Root
            if (-not (Test-Path -LiteralPath (Join-Path $Root 'CLAUDE.md'))) { $findings += New-Finding 'WARN' 'CLAUDE_MD_MISSING' 'CLAUDE.md is absent: Claude Code does not read AGENTS.md by itself. Add a CLAUDE.md that contains `@AGENTS.md` (template: templates/CLAUDE.md).' }
            elseif ((Read-TextLf (Join-Path $Root 'CLAUDE.md')) -notmatch '(?m)^@docs/ai/shared/RULES\.md\s*$') { $findings += New-Finding 'WARN' 'CLAUDE_MD_NO_RULES' 'CLAUDE.md does not import the rules: add the line `@docs/ai/shared/RULES.md` (and `@docs/ai/shared/ROLES.md`) so Claude Code has them at start (template: templates/CLAUDE.md).' }
            if ($null -eq $mf) { $findings += New-Finding 'WARN' 'SHARED_COPY_MISSING' 'docs/ai/shared/MANIFEST is absent: run `sync` to copy the pinned Shared into this Project.' }
            elseif ($mf.Commit -cne [string]$lock['source_commit']) { $findings += New-Finding 'WARN' 'SHARED_COPY_STALE' "The copied Shared is $($mf.Commit) but the lock pins $($lock['source_commit']): run `sync`." }
        }
        if (-not (Test-Path (Join-Path $Root 'AGENTS.md'))) { $findings += New-Finding 'FAIL' 'AGENTS_MISSING' 'Project needs AGENTS.md (template: templates/AGENTS.md).' }
    }
    return $findings
}
