# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$failures = [System.Collections.Generic.List[string]]::new()
$strictUtf8NoBom = [Text.UTF8Encoding]::new($false, $true)
$head = ''
function Fail([string]$Message) { $script:failures.Add($Message) }
function Hash([string]$Path) { return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash }
function Get-GitBlobIdBytes([byte[]]$Bytes) {
    $header = [Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0")
    $input = New-Object byte[] ($header.Length + $Bytes.Length)
    [Array]::Copy($header, 0, $input, 0, $header.Length)
    [Array]::Copy($Bytes, 0, $input, $header.Length, $Bytes.Length)
    $sha = [Security.Cryptography.SHA1]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($input))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Assert-CanonicalTextFile([string]$Relative) {
    $path = Join-Path $root $Relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
    $bytes = [IO.File]::ReadAllBytes($path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { Fail "UTF-8 BOM is forbidden: $Relative" }
    if ($bytes -contains 13) { Fail "CR byte is forbidden: $Relative" }
    if ($bytes.Length -eq 0 -or $bytes[$bytes.Length - 1] -ne 10 -or ($bytes.Length -ge 2 -and $bytes[$bytes.Length - 2] -eq 10)) { Fail "file must end with exactly one LF: $Relative" }
    try { $text = $strictUtf8NoBom.GetString($bytes) }
    catch { Fail "canonical text must be valid UTF-8: $Relative"; return }
    foreach ($character in $text.ToCharArray()) {
        $code = [int]$character
        if ([char]::IsControl($character) -and $code -ne 9 -and $code -ne 10) { Fail "control character is forbidden in text payload: $Relative"; break }
    }
}
function Assert-HeadBlob([string]$Relative) {
    if ($head -notmatch '^[0-9a-f]{40}$') { return }
    $path = Join-Path $root $Relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
    $bytes = [IO.File]::ReadAllBytes($path)
    $workingBlob = Get-GitBlobIdBytes $bytes
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $commitBlob = @(& git -C $root rev-parse "$head`:$($Relative.Replace('\','/'))" 2>$null)
        $commitBlobExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($commitBlobExit -ne 0 -or $commitBlob.Count -ne 1 -or $commitBlob[0] -notmatch '^[0-9a-f]{40}$') { Fail "HEAD blob is missing: $Relative"; return }
    if ($workingBlob -cne $commitBlob[0].Trim()) { Fail "working bytes do not match HEAD blob: $Relative" }
}
function Assert-TextAttributes([string]$Relative) {
    $output = @(& git -C $root check-attr text eol -- $Relative 2>$null)
    if ($LASTEXITCODE -ne 0) { Fail "git check-attr failed: $Relative"; return }
    $escaped = [regex]::Escape($Relative)
    if (($output -join "`n") -notmatch "(?m)^${escaped}: text: auto$") { Fail "text attribute must be auto: $Relative" }
    if (($output -join "`n") -notmatch "(?m)^${escaped}: eol: lf$") { Fail "eol attribute must be lf: $Relative" }
}

$headOutput = @(& git -C $root rev-parse --verify 'HEAD^{commit}' 2>$null)
if ($LASTEXITCODE -ne 0 -or $headOutput.Count -ne 1 -or $headOutput[0] -notmatch '^[0-9a-f]{40}$') { Fail 'shared repository must have a committed HEAD' }
else { $head = $headOutput[0].Trim() }
$topOutput = @(& git -C $root rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or $topOutput.Count -ne 1) { Fail 'shared root must be a Git worktree root' }
else {
    $actualRoot = [IO.Path]::GetFullPath($topOutput[0]).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $expectedRoot = $root.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not $actualRoot.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { Fail "shared root must equal Git worktree root: $actualRoot" }
}
$status = @(& git -C $root status --porcelain=v1 --untracked-files=all --ignore-submodules=none 2>$null)
if ($LASTEXITCODE -ne 0) { Fail 'shared repository clean-state check failed' }
elseif ($status.Count -ne 0) { Fail "shared repository must be clean (no staged, unstaged, or untracked files): $($status -join '; ')" }

$required = @(
    '.gitattributes','VERSION','README.md','manifest.yml',
    'core/START.md','core/CHAT_OUTPUT.md','core/GO_PROTOCOL.md','core/ROLES.md','core/TASK_LIFECYCLE.md',
    'core/HANDOFF_CONTRACT.md','core/REVIEW_CONTRACT.md','core/BROWSER_EVIDENCE.md','core/PROGRESS_CONTRACT.md',
    'templates/NEXT_ACTION.yml','templates/HANDOFF.md','templates/REPORT.md','templates/SESSION_START.md',
    'templates/PROJECT_ADAPTER.psd1','templates/PROJECT_REQUIREMENTS_HANDOFF.md','templates/USER_RELAY_REQUIRED.yml','templates/RELAY_BUNDLE.json',
    'tools/sync-project.ps1','tools/validate-shared.ps1','tools/test-shared-simulation.ps1','tools/import-adapter.ps1','tools/route-go.ps1','tools/relay-bundle.ps1','tools/generate-next-action.ps1','tools/generate-progress.ps1','tools/validate-project.ps1'
)
foreach ($relative in $required) {
    $path = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { Fail "missing required file: $relative"; continue }
    if (((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Fail "reparse point is forbidden: $relative" }
}

$attributesPath = Join-Path $root '.gitattributes'
$attributes = if (Test-Path -LiteralPath $attributesPath -PathType Leaf) { [IO.File]::ReadAllText($attributesPath) } else { '' }
Assert-CanonicalTextFile '.gitattributes'
Assert-CanonicalTextFile 'manifest.yml'
Assert-CanonicalTextFile 'VERSION'
Assert-HeadBlob '.gitattributes'
Assert-HeadBlob 'manifest.yml'
Assert-HeadBlob 'VERSION'
if ($attributes -notmatch '(?m)^\* text=auto eol=lf$') { Fail '.gitattributes must define * text=auto eol=lf' }
$binaryPatterns = @('*.png','*.jpg','*.jpeg','*.gif','*.webp','*.ico','*.pdf','*.zip','*.woff','*.woff2','*.ttf','*.otf','*.mp3','*.mp4','*.webm','*.wasm')
foreach ($pattern in $binaryPatterns) {
    if ($attributes -notmatch "(?m)^$([regex]::Escape($pattern)) -text$") { Fail ".gitattributes must mark binary pattern -text: $pattern" }
    $sample = 'future-policy-check' + $pattern.Substring(1)
    $output = @(& git -C $root check-attr text -- $sample 2>$null)
    if ($LASTEXITCODE -ne 0 -or ($output -join "`n") -notmatch "(?m)^$([regex]::Escape($sample)): text: unset$") { Fail "binary pattern must resolve text=unset: $pattern" }
}

$version = if (Test-Path (Join-Path $root 'VERSION')) { ([IO.File]::ReadAllText((Join-Path $root 'VERSION'))).Trim() } else { '' }
$manifest = if (Test-Path (Join-Path $root 'manifest.yml')) { [IO.File]::ReadAllText((Join-Path $root 'manifest.yml')) } else { '' }
if ($version -notmatch '^\d+\.\d+\.\d+$') { Fail "invalid VERSION: $version" }
if ($manifest -notmatch "(?m)^version:\s*$([regex]::Escape($version))\s*$") { Fail 'manifest version does not match VERSION' }
if ($manifest -notmatch '(?m)^source_repository:\s*Osato-Gasu/shared\s*$') { Fail 'manifest source_repository must be Osato-Gasu/shared' }
if ($manifest -notmatch '(?m)^payload_type:\s*text\s*$') { Fail 'manifest payload_type must be text' }
$nextTemplate=if(Test-Path(Join-Path $root 'templates/NEXT_ACTION.yml')){[IO.File]::ReadAllText((Join-Path $root 'templates/NEXT_ACTION.yml'))}else{''}
if($nextTemplate-notmatch'(?m)^rules_version:\s*<shared-version>\s*$'){Fail 'NEXT_ACTION template rules_version must use <shared-version> placeholder'}
$reviewContract=[IO.File]::ReadAllText((Join-Path $root 'core/REVIEW_CONTRACT.md'))
foreach($fragment in @('Bounded review policy','acceptance criteria, the actual candidate diff','no more than two findings','subagent may not be created merely to enlarge review scope','MINOR` or `QUESTION`')){if($reviewContract.IndexOf($fragment,[StringComparison]::Ordinal)-lt0){Fail "review contract bounded-policy fragment missing: $fragment"}}
$chatContract=[IO.File]::ReadAllText((Join-Path $root 'core/CHAT_OUTPUT.md'))
foreach($fragment in @("project adapter's Japanese phase, role, and effort",'Internal phase/role IDs','do not add explanatory fields','defaults `DefaultLabelLocale` to `ja-JP`')){if($chatContract.IndexOf($fragment,[StringComparison]::Ordinal)-lt0){Fail "chat output contract fragment missing: $fragment"}}
$lifecycle=[IO.File]::ReadAllText((Join-Path $root 'core/TASK_LIFECYCLE.md'))
foreach($fragment in @('changes_requested_cycles','implementation_review_attempt','standard','narrowed','terminal','implementation_review_terminated','NEEDS_USER_DECISION','no fourth implementation review','more than two actionable','prior_finding_id','ChatGPT','user_confirmation_required')){if($lifecycle.IndexOf($fragment,[StringComparison]::Ordinal)-lt0){Fail "lifecycle implementation-review convergence fragment missing: $fragment"}}
$relayTool=[IO.File]::ReadAllText((Join-Path $root 'tools/relay-bundle.ps1'))
foreach($fragment in @('Assert-ExistingImplementationReviewPreflight','current relay import report is missing','implementation review preflight mismatch','implementation review preflight state combination is invalid','implementation review preflight terminated route is invalid')){if($relayTool.IndexOf($fragment,[StringComparison]::Ordinal)-lt0){Fail "relay pre-write convergence fragment missing: $fragment"}}
$origin = (git -C $root remote get-url origin 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -cne 'https://github.com/Osato-Gasu/shared.git') { Fail 'origin must be https://github.com/Osato-Gasu/shared.git' }
$entries = [regex]::Matches($manifest, '(?ms)^  - path:\s*(?<path>\S+)\s*\r?\n    target:\s*(?<target>\S+)\s*\r?\n    sha256:\s*(?<sha>[A-F0-9]{64})\s*$')
$seenPaths = @{}; $seenTargets = @{}
foreach ($entry in $entries) {
    $relative = $entry.Groups['path'].Value
    $target = $entry.Groups['target'].Value
    if ($seenPaths.ContainsKey($relative)) { Fail "duplicate manifest path: $relative" } else { $seenPaths[$relative]=$true }
    if ($seenTargets.ContainsKey($target)) { Fail "duplicate manifest target: $target" } else { $seenTargets[$target]=$true }
    $path = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { Fail "manifest file missing: $relative" }
    elseif ((Hash $path) -cne $entry.Groups['sha'].Value) { Fail "manifest hash mismatch: $relative" }
    Assert-TextAttributes $relative
    Assert-CanonicalTextFile $relative
    Assert-HeadBlob $relative
}
if ($seenPaths.ContainsKey('.gitattributes') -or $seenTargets.ContainsKey('.gitattributes')) { Fail '.gitattributes must not be distributed by manifest' }
foreach ($relative in $required | Where-Object { $_ -notin @('manifest.yml','.gitattributes') }) {
    if (-not $seenPaths.ContainsKey($relative)) { Fail "required file absent from manifest: $relative" }
}
Assert-TextAttributes '.gitattributes'
Assert-TextAttributes 'manifest.yml'

$activeRuleFiles = @('core/START.md','core/CHAT_OUTPUT.md','core/GO_PROTOCOL.md','core/ROLES.md','core/TASK_LIFECYCLE.md','core/HANDOFF_CONTRACT.md','core/REVIEW_CONTRACT.md','core/BROWSER_EVIDENCE.md','core/PROGRESS_CONTRACT.md','templates/HANDOFF.md')
foreach($relative in $activeRuleFiles){
    $text=[IO.File]::ReadAllText((Join-Path $root $relative))
    if($text -match '(?m)^## NEXT_SESSION$'){Fail "legacy NEXT_SESSION contract remains active: $relative"}
}
foreach($relative in @('tools/sync-project.ps1','tools/validate-shared.ps1','tools/test-shared-simulation.ps1','tools/import-adapter.ps1','tools/route-go.ps1','tools/relay-bundle.ps1','tools/generate-next-action.ps1','tools/generate-progress.ps1','tools/validate-project.ps1')){
    $path=Join-Path $root $relative
    if(Test-Path $path){try{[void][ScriptBlock]::Create([IO.File]::ReadAllText($path))}catch{Fail "PowerShell parse failure: $relative - $($_.Exception.Message)"}}
}

if($failures.Count){foreach($failure in $failures){[Console]::Error.WriteLine("shared governance error: $failure")}; Write-Output "Shared governance validation failed: $($failures.Count) issue(s)."; exit 1}
Write-Output "Shared governance validation passed. version=$version files=$($entries.Count)"
return
