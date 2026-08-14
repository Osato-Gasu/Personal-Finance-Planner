# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [string]$SharedRoot,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$utf8Bom = [System.Text.UTF8Encoding]::new($true)
$strictUtf8NoBom = [System.Text.UTF8Encoding]::new($false, $true)
$directEditForbidden = [regex]::Unescape('\u76f4\u63a5\u7de8\u96c6\u7981\u6b62')
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$generatedRoot = Join-Path $project 'docs/ai/generated/shared'
$lockPath = Join-Path $project 'docs/ai/SHARED_RULES.lock.yml'

function Get-Sha256Bytes([byte[]]$Bytes) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '') }
    finally { $sha.Dispose() }
}
function Get-Sha256File([string]$Path) { return Get-Sha256Bytes ([System.IO.File]::ReadAllBytes($Path)) }
function Get-GitBlobIdBytes([byte[]]$Bytes) {
    $header = [Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0")
    $input = [byte[]]::new($header.Length + $Bytes.Length)
    [Array]::Copy($header, 0, $input, 0, $header.Length)
    [Array]::Copy($Bytes, 0, $input, $header.Length, $Bytes.Length)
    $sha = [Security.Cryptography.SHA1]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($input))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function ConvertFrom-CanonicalTextBytes([byte[]]$Bytes, [string]$Source) {
    if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) { throw "UTF-8 BOM is forbidden: $Source" }
    if ($Bytes -contains 13) { throw "CR byte is forbidden: $Source" }
    if ($Bytes.Length -eq 0 -or $Bytes[$Bytes.Length - 1] -ne 10 -or ($Bytes.Length -ge 2 -and $Bytes[$Bytes.Length - 2] -eq 10)) { throw "File must end with exactly one LF: $Source" }
    try { $text = $strictUtf8NoBom.GetString($Bytes) }
    catch { throw "Canonical text must be valid UTF-8: $Source" }
    foreach ($character in $text.ToCharArray()) {
        $code = [int]$character
        if ([char]::IsControl($character) -and $code -ne 9 -and $code -ne 10) { throw "Control character is forbidden in text payload: $Source" }
    }
    return $text
}
function Invoke-GitValue([string[]]$Arguments, [string]$Failure) {
    $value = @(& git -C $resolvedShared @Arguments 2>$null)
    if ($LASTEXITCODE -ne 0) { throw $Failure }
    return ($value -join "`n").Trim()
}
function Assert-SourceRepository {
    $sourceCommit = Invoke-GitValue @('rev-parse', '--verify', 'HEAD^{commit}') 'Shared source must have a committed HEAD.'
    if ($sourceCommit -notmatch '^[0-9a-f]{40}$') { throw 'Shared source commit identity is invalid.' }
    $repositoryRoot = Invoke-GitValue @('rev-parse', '--show-toplevel') 'Shared source must be a Git worktree.'
    $expectedRoot = [IO.Path]::GetFullPath($resolvedShared).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $actualRoot = [IO.Path]::GetFullPath($repositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if (-not $actualRoot.Equals($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "SharedRoot must be the Git worktree root: $actualRoot" }
    $status = @(& git -C $resolvedShared status --porcelain=v1 --untracked-files=all --ignore-submodules=none 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'Shared source clean-state check failed.' }
    if ($status.Count -ne 0) { throw "Shared source must be clean (no staged, unstaged, or untracked files): $($status -join '; ')" }
    return $sourceCommit
}
function Read-CommittedCanonicalText([string]$Relative, [string]$Commit) {
    $relativePath = $Relative.Replace('\', '/')
    if ([IO.Path]::IsPathRooted($relativePath) -or $relativePath -match '(^|/)\.\.(/|$)') { throw "Manifest source path escapes SharedRoot: $Relative" }
    $fullPath = [IO.Path]::GetFullPath((Join-Path $resolvedShared $relativePath))
    $rootPrefix = [IO.Path]::GetFullPath($resolvedShared).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Manifest source path escapes SharedRoot: $Relative" }
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "Committed source file is missing: $Relative" }
    if (((Get-Item -LiteralPath $fullPath).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Reparse point is forbidden: $Relative" }
    $bytes = [IO.File]::ReadAllBytes($fullPath)
    $text = ConvertFrom-CanonicalTextBytes $bytes $Relative
    $workingBlob = Get-GitBlobIdBytes $bytes
    $commitBlob = Invoke-GitValue @('rev-parse', "$Commit`:$relativePath") "Committed source blob is missing: $Relative"
    if ($commitBlob -notmatch '^[0-9a-f]{40}$' -or $workingBlob -cne $commitBlob) { throw "Working bytes do not match source commit blob: $Relative" }
    return [pscustomobject]@{ Bytes=$bytes; Text=$text; Blob=$commitBlob }
}
function Get-Payload([string]$Text) {
    $pattern = '\A# GENERATED FILE: DO NOT EDIT\.\r?\n# source version: .+?\r?\n# source commit: .+?\r?\n# \u76f4\u63a5\u7de8\u96c6\u7981\u6b62\r?\n\r?\n'
    return [regex]::Replace($Text, $pattern, '', [Text.RegularExpressions.RegexOptions]::None)
}
function Read-Key([string]$Text, [string]$Key, [string]$Source) {
    $match = [regex]::Match($Text, "(?m)^$([regex]::Escape($Key)):\s*(.+?)\s*$")
    if (-not $match.Success) { throw "Missing '$Key' in $Source" }
    return $match.Groups[1].Value.Trim()
}
function Read-Manifest([string]$Text) {
    $matches = [regex]::Matches($Text, '(?ms)^  - path:\s*(?<path>\S+)\s*\r?\n    target:\s*(?<target>\S+)\s*\r?\n    sha256:\s*(?<sha>[A-F0-9]{64})\s*$')
    if ($matches.Count -eq 0) { throw 'manifest.yml has no files.' }
    return @($matches | ForEach-Object { [pscustomobject]@{ Path=$_.Groups['path'].Value; Target=$_.Groups['target'].Value; Sha=$_.Groups['sha'].Value } })
}
function Resolve-SharedRoot {
    if (-not [string]::IsNullOrWhiteSpace($SharedRoot)) { return [System.IO.Path]::GetFullPath($SharedRoot) }
    if (-not [string]::IsNullOrWhiteSpace($env:AI_DEVELOPMENT_GOVERNANCE_ROOT)) { return [System.IO.Path]::GetFullPath($env:AI_DEVELOPMENT_GOVERNANCE_ROOT) }
    return [System.IO.Path]::GetFullPath((Join-Path $project '../../_shared/ai-development-governance'))
}

$resolvedShared = Resolve-SharedRoot
$sharedRootExists = Test-Path -LiteralPath $resolvedShared -PathType Container
$sourceAvailable = Test-Path -LiteralPath (Join-Path $resolvedShared 'manifest.yml') -PathType Leaf
$snapshotManifestPath = Join-Path $generatedRoot 'manifest.yml'

if ($sharedRootExists -and -not $sourceAvailable) { throw "Shared source directory exists but manifest.yml is missing: $resolvedShared" }
if (-not $sourceAvailable -and -not $Check) { throw "Shared source is unavailable: $resolvedShared" }
if (-not $sourceAvailable -and -not (Test-Path -LiteralPath $snapshotManifestPath -PathType Leaf)) { throw 'Shared source and project snapshot are both unavailable.' }
if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf) -and $Check) { throw 'Missing docs/ai/SHARED_RULES.lock.yml.' }

if ($sourceAvailable) {
    $sourceCommit = Assert-SourceRepository
    $sourceRecords = @{}
    $sourceRecords['manifest.yml'] = Read-CommittedCanonicalText 'manifest.yml' $sourceCommit
    $sourceRecords['VERSION'] = Read-CommittedCanonicalText 'VERSION' $sourceCommit
    $sourceRecords['.gitattributes'] = Read-CommittedCanonicalText '.gitattributes' $sourceCommit
    $manifestText = $sourceRecords['manifest.yml'].Text
    $manifestBytes = $sourceRecords['manifest.yml'].Bytes
    $version = $sourceRecords['VERSION'].Text.Trim()
    $syncedAt = Invoke-GitValue @('show', '-s', '--format=%cI', $sourceCommit) 'Shared source commit time is unavailable.'
} else {
    $snapshotManifestBytes = [System.IO.File]::ReadAllBytes($snapshotManifestPath)
    $snapshotManifestText = ConvertFrom-CanonicalTextBytes $snapshotManifestBytes 'generated manifest snapshot'
    $manifestText = Get-Payload $snapshotManifestText
    $manifestBytes = $utf8NoBom.GetBytes($manifestText)
    $lockTextForSource = [System.IO.File]::ReadAllText($lockPath)
    $version = Read-Key $lockTextForSource 'version' $lockPath
    $sourceCommit = Read-Key $lockTextForSource 'commit' $lockPath
    $syncedAt = Read-Key $lockTextForSource 'synced_at' $lockPath
    $manifestText = ConvertFrom-CanonicalTextBytes $manifestBytes 'generated manifest payload'
}

$sourceName = Read-Key $manifestText 'source_name' 'manifest.yml'
$sourceRepository = Read-Key $manifestText 'source_repository' 'manifest.yml'
$payloadType = Read-Key $manifestText 'payload_type' 'manifest.yml'
if ($payloadType -cne 'text') { throw "Unsupported manifest payload_type: $payloadType" }
$manifestVersion = Read-Key $manifestText 'version' 'manifest.yml'
if ($manifestVersion -cne $version) { throw "VERSION and manifest version differ: $version / $manifestVersion" }
$manifestSha = Get-Sha256Bytes $manifestBytes
$entries = Read-Manifest $manifestText
foreach ($entry in $entries) {
    if ($entry.Path -ceq '.gitattributes' -or $entry.Target -ceq '.gitattributes') {
        throw '.gitattributes is a shared repository policy file and must not be distributed in the project snapshot.'
    }
}

if ($sourceAvailable) {
    foreach ($entry in $entries) {
        if (-not $sourceRecords.ContainsKey($entry.Path)) { $sourceRecords[$entry.Path] = Read-CommittedCanonicalText $entry.Path $sourceCommit }
        if ((Get-Sha256Bytes $sourceRecords[$entry.Path].Bytes) -cne $entry.Sha) { throw "Manifest hash mismatch: $($entry.Path)" }
    }
}

$header = "# GENERATED FILE: DO NOT EDIT.`n# source version: $version`n# source commit: $sourceCommit`n# $directEditForbidden`n`n"
$expectedTargets = @($entries.Target) + @('manifest.yml')

if ($Check) {
    $lockText = [System.IO.File]::ReadAllText($lockPath)
    $expectedLock = [ordered]@{
        schema_version='1'; source_name=$sourceName; source_repository=$sourceRepository; version=$version; commit=$sourceCommit
        manifest_sha256=$manifestSha; generated_root='docs/ai/generated/shared'; synced_at=$syncedAt
    }
    foreach ($pair in $expectedLock.GetEnumerator()) {
        if ((Read-Key $lockText $pair.Key $lockPath) -cne $pair.Value) { throw "Shared lock mismatch: $($pair.Key)" }
    }
    $files = @(Get-ChildItem -LiteralPath $generatedRoot -File -Recurse | ForEach-Object { $_.FullName.Substring($generatedRoot.Length + 1).Replace('\','/') })
    foreach ($target in $expectedTargets) { if ($files -cnotcontains $target) { throw "Generated snapshot file missing: $target" } }
    foreach ($file in $files) { if ($expectedTargets -cnotcontains $file) { throw "Unexpected generated snapshot file: $file" } }
    foreach ($entry in $entries) {
        $targetPath = Join-Path $generatedRoot $entry.Target
        $targetText = [System.IO.File]::ReadAllText($targetPath)
        if ($targetText -notmatch "\A# GENERATED FILE: DO NOT EDIT\.`r?`n# source version: $([regex]::Escape($version))`r?`n# source commit: $sourceCommit`r?`n# $([regex]::Escape($directEditForbidden))") { throw "Generated marker mismatch: $($entry.Target)" }
        $payloadBytes = $utf8NoBom.GetBytes((Get-Payload $targetText))
        $payloadHash = Get-Sha256Bytes $payloadBytes
        if ($payloadHash -cne $entry.Sha) { throw "Generated snapshot was modified: $($entry.Target)" }
        [void](ConvertFrom-CanonicalTextBytes $payloadBytes "generated payload $($entry.Target)")
    }
    $snapshotManifestPayload = Get-Payload ([System.IO.File]::ReadAllText($snapshotManifestPath))
    if ((Get-Sha256Bytes $utf8NoBom.GetBytes($snapshotManifestPayload)) -cne $manifestSha) { throw 'Generated manifest mismatch.' }
    Write-Output "Shared snapshot is current. version=$version commit=$sourceCommit source_available=$sourceAvailable"
    return
}

if ($sourceAvailable) {
    $finalSourceCommit = Assert-SourceRepository
    if ($finalSourceCommit -cne $sourceCommit) { throw 'Shared source HEAD changed during synchronization.' }
    foreach ($relative in @($sourceRecords.Keys)) {
        $currentRecord = Read-CommittedCanonicalText $relative $sourceCommit
        if ($currentRecord.Blob -cne $sourceRecords[$relative].Blob -or (Get-Sha256Bytes $currentRecord.Bytes) -cne (Get-Sha256Bytes $sourceRecords[$relative].Bytes)) { throw "Shared source bytes changed during synchronization: $relative" }
    }
}

[System.IO.Directory]::CreateDirectory($generatedRoot) | Out-Null
foreach ($entry in $entries) {
    $targetPath = Join-Path $generatedRoot $entry.Target
    [System.IO.Directory]::CreateDirectory((Split-Path -Parent $targetPath)) | Out-Null
    $payload = $sourceRecords[$entry.Path].Text
    $targetEncoding = if ([IO.Path]::GetExtension($targetPath) -ieq '.ps1') { $utf8Bom } else { $utf8NoBom }
    [System.IO.File]::WriteAllText($targetPath, $header + $payload, $targetEncoding)
}
[System.IO.File]::WriteAllText($snapshotManifestPath, $header + $manifestText, $utf8NoBom)
foreach ($file in @(Get-ChildItem -LiteralPath $generatedRoot -File -Recurse)) {
    $relative = $file.FullName.Substring($generatedRoot.Length + 1).Replace('\','/')
    if ($expectedTargets -cnotcontains $relative) { Remove-Item -LiteralPath $file.FullName -Force }
}
$lock = "schema_version: 1`nsource_name: $sourceName`nsource_repository: $sourceRepository`nversion: $version`ncommit: $sourceCommit`nmanifest_sha256: $manifestSha`ngenerated_root: docs/ai/generated/shared`nsynced_at: $syncedAt`n"
[System.IO.Directory]::CreateDirectory((Split-Path -Parent $lockPath)) | Out-Null
[System.IO.File]::WriteAllText($lockPath, $lock, $utf8NoBom)
Write-Output "Synchronized shared governance. version=$version commit=$sourceCommit files=$($entries.Count)"
