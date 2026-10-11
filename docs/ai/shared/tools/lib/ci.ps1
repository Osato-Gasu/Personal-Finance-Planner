# CI recommendation (RULES §6). Core, pure over data. CI is not run by default: at completion the AI says whether a run is recommended,
# the user asks for it, and only then is it dispatched. The machine decides what it can; the rest is left to a human judgment.
Set-StrictMode -Version Latest

# Paths whose change can break a build or a dependency set, or the CI itself: always worth a run.
$script:CiBuiltinRecommend = @('.github/**', '**/package.json', '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/*.csproj', '**/*.sln', '**/*.props', '**/*.targets', '**/Directory.*', '**/global.json', '**/nuget.config', '**/Dockerfile*', '**/docker-compose*', '**/Makefile', '**/go.mod', '**/go.sum', '**/requirements*.txt')
# Documents and records only: never worth a run.
$script:CiBuiltinSkip = @('README.md', 'docs/**/*.md', 'docs/ai/tasks/**', 'docs/ai/reports/**')

function Test-CiPathIndeterminate {
    param([AllowNull()][string]$Path)
    return ([string]::IsNullOrWhiteSpace($Path) -or $Path.StartsWith('/') -or $Path -match '[\\:\x00-\x1f]' -or $Path -match '(\A|/)\.\.(/|\z)')
}

function Get-CiRecommendation {
    # Verdict: RECOMMEND (a machine rule matched, or a path cannot be judged), NOT_NEEDED (documents and records only),
    # JUDGE (no rule decides: the AI decides, e.g. a difference between Windows and Linux that the local run cannot show).
    param([AllowNull()][string[]]$ChangedPaths, [string[]]$RecommendPaths = @(), [string[]]$SkipPaths = @())
    $paths = @($ChangedPaths | Where-Object { $null -ne $_ })
    if ($paths.Count -eq 0) { return [pscustomobject]@{ Verdict = 'JUDGE'; Reason = 'no changed path was found'; Matched = @() } }
    $rec = @($script:CiBuiltinRecommend + $RecommendPaths)
    $skip = @($script:CiBuiltinSkip + $SkipPaths)
    $hit = @(); $bad = @(); $allSkip = $true
    foreach ($p in $paths) {
        if (Test-CiPathIndeterminate $p) { $bad += $p; $allSkip = $false; continue }
        if (Test-AnyGlob -Path $p -Patterns $rec) { $hit += $p; $allSkip = $false; continue }
        if (-not (Test-AnyGlob -Path $p -Patterns $skip)) { $allSkip = $false }
    }
    if ($bad.Count -gt 0) { return [pscustomobject]@{ Verdict = 'RECOMMEND'; Reason = "a path cannot be judged: $($bad[0])"; Matched = $bad } }
    if ($hit.Count -gt 0) { return [pscustomobject]@{ Verdict = 'RECOMMEND'; Reason = "build, dependency, workflow or Project-listed path changed: $($hit[0])$(if ($hit.Count -gt 1) { " (+$($hit.Count - 1) more)" })"; Matched = $hit } }
    if ($allSkip) { return [pscustomobject]@{ Verdict = 'NOT_NEEDED'; Reason = 'documents and records only'; Matched = @() } }
    return [pscustomobject]@{ Verdict = 'JUDGE'; Reason = 'no rule decides; recommend it if the local run cannot show a difference (for example Windows versus Linux) or if verification was not possible locally'; Matched = @() }
}

function Get-ChangedPaths {
    # Paths changed between the merge base of -Base and -Head and -Head, both sides of a rename. Uses only allowlisted git.
    param([Parameter(Mandatory)][string]$Root, [string]$Base = 'origin/main', [string]$Head = 'HEAD')
    $b = Resolve-Commit -Dir $Root -Rev $Base
    $h = Resolve-Commit -Dir $Root -Rev $Head
    $mb = (Invoke-Git -Dir $Root -GitArgs @('merge-base', $b, $h)).Trim()
    $lines = (Invoke-Git -Dir $Root -GitArgs @('diff', '--name-status', '-z', '-M', $mb, $h)) -split "`0"
    $out = [System.Collections.Generic.List[string]]::new()
    for ($i = 0; $i -lt $lines.Count; ) {
        $st = $lines[$i]; if ($st -eq '') { break }
        if ($st.StartsWith('R') -or $st.StartsWith('C')) { $out.Add($lines[$i + 1]); $out.Add($lines[$i + 2]); $i += 3 } else { $out.Add($lines[$i + 1]); $i += 2 }
    }
    return @($out | Select-Object -Unique)
}
