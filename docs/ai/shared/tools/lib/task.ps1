# TASK file model, spec hash and claim (RULES I2 I3).
Set-StrictMode -Version Latest

$script:TaskStatuses = @('DRAFT', 'READY', 'ACTIVE', 'REVIEW', 'DONE', 'BLOCKED', 'CANCELLED')
$script:TaskTransitions = @{
    DRAFT     = @('READY', 'ACTIVE', 'CANCELLED')
    READY     = @('ACTIVE', 'DRAFT', 'CANCELLED')
    ACTIVE    = @('REVIEW', 'BLOCKED', 'DONE', 'CANCELLED')
    REVIEW    = @('ACTIVE', 'DONE', 'BLOCKED', 'CANCELLED')
    BLOCKED   = @('ACTIVE', 'CANCELLED')
    DONE      = @()
    CANCELLED = @()
}
$script:TaskKinds = @('chore', 'fix', 'feature', 'spec', 'risk')

function Get-TaskPath { param([string]$Root, [string]$TaskId) if ($TaskId -cnotmatch '\ATASK-\d{3,6}\z') { Stop-Shared -Reason 'TASK_ID_INVALID' -Message "TASK id must look like TASK-123: '$TaskId'" }; return (Join-Path $Root "docs/ai/tasks/$TaskId.md") }

function ConvertFrom-TaskText {
    param([Parameter(Mandatory)][string]$Text)
    $t = ConvertTo-Lf $Text
    if ($t -notmatch '(?s)\A---\n(.*?)\n---\n?(.*)\z') { Stop-Shared -Reason 'TASK_INVALID' -Message 'TASK file must start with a --- frontmatter block.' }
    $fm = ConvertFrom-KeyValueLines $Matches[1]
    return [pscustomobject]@{ Front = $fm; Body = $Matches[2]; Id = [string]$fm['id']; Kind = [string]$fm['kind']; Status = [string]$fm['status'] }
}

function Read-Task {
    param([string]$Root, [string]$TaskId)
    $path = Get-TaskPath -Root $Root -TaskId $TaskId
    if (-not (Test-Path -LiteralPath $path)) { Stop-Shared -Reason 'TASK_MISSING' -Message "No such TASK file: $path" }
    $t = ConvertFrom-TaskText -Text (Read-TextLf $path)
    if ($t.Id -cne $TaskId) { Stop-Shared -Reason 'TASK_INVALID' -Message "Frontmatter id '$($t.Id)' does not match file name $TaskId." }
    if ($script:TaskStatuses -cnotcontains $t.Status) { Stop-Shared -Reason 'TASK_INVALID' -Message "Unknown status '$($t.Status)'." }
    if ($script:TaskKinds -cnotcontains $t.Kind) { Stop-Shared -Reason 'TASK_INVALID' -Message "Unknown kind '$($t.Kind)'." }
    return $t
}

function Get-Section {
    param([string]$Body, [string]$Name)
    if ($Body -match "(?ms)^##[ \t]+$([regex]::Escape($Name))[ \t]*\n(.*?)(?=^##[ \t]|\z)") { return $Matches[1] }
    return ''
}

function Get-SpecHash {
    # The adopted specification = id + kind + Requirements + Acceptance, whitespace-normalised.
    # Changing any of them after ADOPT invalidates the adoption (the spec is GPT's, not Claude's).
    param([Parameter(Mandatory)]$Task)
    $norm = { param($s) (((ConvertTo-Lf $s) -split "`n" | ForEach-Object { $_.TrimEnd() }) -join "`n").Trim() }
    $canon = "id=$($Task.Id)`nkind=$($Task.Kind)`n[requirements]`n$(& $norm (Get-Section $Task.Body 'Requirements'))`n[acceptance]`n$(& $norm (Get-Section $Task.Body 'Acceptance'))"
    return (Get-Sha256Hex $canon)   # the full 256 bits: a truncated hash can be collided (birthday) to swap an adopted spec
}

function Assert-TaskTransition {
    param([string]$From, [string]$To)
    if ($script:TaskTransitions[$From] -cnotcontains $To) { Stop-Shared -Reason 'TASK_TRANSITION' -Message "$From -> $To is not allowed (allowed: $($script:TaskTransitions[$From] -join ', '))." }
}

function Set-TaskFrontValue {
    param([string]$Path, [string]$Key, [string]$Value)
    $t = Read-TextLf $Path
    if ($t -match "(?m)^$([regex]::Escape($Key)):.*$") { $t = [regex]::Replace($t, "(?m)^$([regex]::Escape($Key)):.*$", "${Key}: $Value", 1) }
    else { $t = [regex]::Replace($t, '(?m)^---\n', "---`n", 1); $t = $t -replace '(?s)\A---\n(.*?)\n---', "---`n`$1`n${Key}: $Value`n---" }
    Write-Utf8NoBom -Path $Path -Text $t
}

function New-TaskFile {
    param([string]$Root, [string]$TaskId, [string]$Title, [string]$Kind, [string]$SharedCommit = '')
    if ($script:TaskKinds -cnotcontains $Kind) { Stop-Shared -Reason 'TASK_INVALID' -Message "kind must be one of: $($script:TaskKinds -join ', ')" }
    if ([string]::IsNullOrWhiteSpace($Title) -or $Title -match "[`r`n]") { Stop-Shared -Reason 'TASK_INVALID' -Message 'title must be one non-empty line.' }
    $path = Get-TaskPath -Root $Root -TaskId $TaskId
    if (Test-Path -LiteralPath $path) { Stop-Shared -Reason 'TASK_EXISTS' -Message "Refusing to overwrite $path" -Code 4 }
    if ($SharedCommit -ne '') { Assert-Sha40 $SharedCommit 'shared commit' }
    $text = "---`nschema: 1`nid: $TaskId`ntitle: $Title`nkind: $Kind`nstatus: DRAFT`nshared: $SharedCommit`n---`n## Requirements`n`n(What must be true when this TASK is done.)`n`n## Acceptance`n`n(Observable checks. Real-device checks are listed here as USER checks.)`n`n## Notes`n"
    Write-Utf8NoBom -Path $path -Text $text
    return $path
}

function Assert-TaskNumberAvailable {
    # 3.0 TASK numbers live above everything 2.x ever used or may still allocate: at most frozen_task_max is history
    # (a new file there would be frozen the moment it merges), and below task_id_min the 2.x line may still be handing out
    # numbers. A branch anywhere on the remote that mentions the number (codex/task-175-build-3, work/TASK-9 ...) is a collision.
    param([string]$TaskId, $Policy, [string]$Dir, [string]$Remote)
    Assert-RemoteIdentity -Dir $Dir -Remote $Remote   # M5 (m2): identity before the first ls-remote of this remote
    $n = [int]($TaskId -replace '\D', '')
    if ($null -ne $Policy) {
        $frozen = [int](Get-Prop $Policy 'frozen_task_max' 0); $min = [int](Get-Prop $Policy 'task_id_min' 0)
        if ($n -le $frozen) { Stop-Shared -Reason 'TASK_NUMBER_FROZEN' -Message "$TaskId is at or below frozen_task_max ($frozen): the number belongs to frozen 2.x history." -Code 2 }
        if ($n -lt $min) { Stop-Shared -Reason 'TASK_NUMBER_RESERVED' -Message "$TaskId is below task_id_min ($min): numbers below it are reserved for the 2.x line." -Code 2 }
    }
    $r = Invoke-Git -Dir $Dir -GitArgs @('ls-remote', $Remote) -AllowFail
    if ($r.ExitCode -ne 0) { Stop-Shared -Reason 'REMOTE_UNREADABLE' -Message "ls-remote failed: $($r.Err.Trim())" -Code 3 }
    $pat = "(?i)(?<![0-9])task[-_ ]?0*$n(?![0-9])"
    foreach ($line in ($r.Out -split "`n")) {
        if ($line -match '\A[0-9a-f]{40}\s+refs/heads/(\S+)\s*\z') {
            $name = $Matches[1]   # a second -match would overwrite $Matches
            if ($name -match $pat -and $name -cne "work/$TaskId") { Stop-Shared -Reason 'TASK_NUMBER_IN_USE' -Message "$TaskId collides with the existing branch '$name' on $Remote." -Code 4 }
        }
    }
}

function Start-Task {
    # Claim = atomic creation of the remote branch work/<TASK>. Exactly one creator wins (I3).
    # Validate everything first, build the claim commit on a detached HEAD, publish it, and only then create the local
    # branch. Any failure puts the working tree back where it was (the user's branch is never left behind).
    param([string]$Root, [string]$TaskId, [string]$Title = '', [string]$Kind = '', [string]$Base = 'main', [string]$Remote = 'origin', $Policy = $null)
    Assert-SafeName $Remote 'remote'; Assert-SafeName $Base 'base branch'
    $path = Get-TaskPath -Root $Root -TaskId $TaskId     # validates the id
    if ($script:TaskKinds -cnotcontains $Kind -and $Kind -ne '') { Stop-Shared -Reason 'TASK_INVALID' -Message "kind must be one of: $($script:TaskKinds -join ', ')" }
    if ($Title -match "[`r`n]") { Stop-Shared -Reason 'TASK_INVALID' -Message 'title must be one line.' }
    Assert-CleanTree -Dir $Root
    Assert-NoPendingWrites -Dir $Root
    $branch = "work/$TaskId"
    $ref = "refs/heads/$branch"
    if ($null -eq (Get-RemoteRef -Dir $Root -Remote $Remote -Ref $ref)) { Assert-TaskNumberAvailable -TaskId $TaskId -Policy $Policy -Dir $Root -Remote $Remote }
    if ($null -ne (Get-RemoteRef -Dir $Root -Remote $Remote -Ref $ref)) {
        Stop-Shared -Reason 'TASK_CLAIMED' -Message "$branch already exists on $Remote. Fetch it and continue there; to take it over append a 'takeover' event (evidence append). Never create a second claim." -Code 4
    }
    Invoke-Git -Dir $Root -GitArgs @('fetch', '--quiet', $Remote, "refs/heads/${Base}:refs/remotes/$Remote/$Base") | Out-Null
    $baseSha = Resolve-Commit -Dir $Root -Rev "refs/remotes/$Remote/$Base"
    $prev = (Invoke-Git -Dir $Root -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
    if ($prev -eq 'HEAD') { $prev = Resolve-Commit -Dir $Root -Rev 'HEAD' }
    $created = @()
    try {
        Invoke-Git -Dir $Root -GitArgs @('checkout', '--quiet', $baseSha) | Out-Null      # detached
        if (-not (Test-Path -LiteralPath $path)) {
            if ($Title -eq '' -or $Kind -eq '') { Stop-Shared -Reason 'TASK_MISSING' -Message "No $path on $Base; pass -Title and -Kind to create it." }
            New-TaskFile -Root $Root -TaskId $TaskId -Title $Title -Kind $Kind -SharedCommit $baseSha | Out-Null
            $created += $path
        }
        $task = Read-Task -Root $Root -TaskId $TaskId
        if ($task.Status -in @('DONE', 'CANCELLED')) { Stop-Shared -Reason 'TASK_TRANSITION' -Message "$TaskId is $($task.Status)." }
        # claim_id makes every claimant's commit unique. Without it two simultaneous claimants can build byte-identical
        # commits (same parent, tree, author, second), the second push becomes a no-op, and both believe they own the TASK.
        # It is recorded as a commit trailer; the Evidence event of the gate tools is added only when those tools are loaded.
        $claimId = [guid]::NewGuid().ToString('N')
        $addPaths = @("docs/ai/tasks/$TaskId.md")
        if (Get-Command Add-TaskEvent -ErrorAction SilentlyContinue) {
            $created += (Get-EventsPath -Root $Root -TaskId $TaskId)
            Add-TaskEvent -Root $Root -TaskId $TaskId -Type 'claim' -Commit $baseSha -Data @{ branch = $branch; base = $Base; spec = (Get-SpecHash $task); claim_id = $claimId } | Out-Null
            $addPaths += "docs/ai/evidence/$TaskId/EVENTS.jsonl"
        }
        Invoke-Git -Dir $Root -GitArgs (@('add', '--') + $addPaths) | Out-Null
        Invoke-Git -Dir $Root -GitArgs @('commit', '--quiet', '--allow-empty', '-m', "${TaskId}: claim`n`nclaim-id: $claimId") | Out-Null   # empty when the TASK file is already on the base
        $sha = Resolve-Commit -Dir $Root -Rev 'HEAD'
        $result = Invoke-SafePush -Dir $Root -Ref $ref -Sha $sha -Expect '' -Remote $Remote
        Invoke-Git -Dir $Root -GitArgs @('checkout', '--quiet', '-b', $branch, $sha) | Out-Null
        return $result
    } catch {
        $err = $_
        # Return to where the user was. Files this call itself created (still untracked) are removed; nothing else is touched.
        foreach ($f in $created) { if (Test-Path -LiteralPath $f) { $inIndex = (Invoke-Git -Dir $Root -GitArgs @('cat-file', '-e', "HEAD:$((Get-RelativePath $Root $f))") -AllowFail).ExitCode -eq 0; if (-not $inIndex) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue } } }
        # A bare branch name re-attaches HEAD (a full refs/heads/ name would detach it). If that restore cannot run, the
        # original error is what the caller must see, so it is rethrown below and the failed restore is reported.
        try { Invoke-Git -Dir $Root -GitArgs @('checkout', '--quiet', $prev) -AllowFail | Out-Null }
        catch { [Console]::Error.WriteLine("WARNING: could not return to '$prev': $($_.Exception.Message)") }
        throw $err
    }
}

function Get-AllTasks {
    param([string]$Root)
    $dir = Join-Path $Root 'docs/ai/tasks'
    if (-not (Test-Path $dir)) { return @() }
    foreach ($f in (Get-ChildItem -LiteralPath $dir -Filter 'TASK-*.md' | Sort-Object Name)) {
        try { $t = ConvertFrom-TaskText -Text (Read-TextLf $f.FullName); [pscustomobject]@{ Id = $t.Id; Status = $t.Status; Kind = $t.Kind; Title = [string]$t.Front['title']; Shared = [string]$t.Front['shared']; File = $f.Name } }
        catch { [pscustomobject]@{ Id = $f.BaseName; Status = 'LEGACY'; Kind = ''; Title = '(pre-3.0 format)'; Shared = ''; File = $f.Name } }
    }
}
