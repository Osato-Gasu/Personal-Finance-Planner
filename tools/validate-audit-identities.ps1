[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [string]$RegistryPath
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Join-Path $PSScriptRoot '..' }
$root = [IO.Path]::GetFullPath($ProjectRoot)
if ([string]::IsNullOrWhiteSpace($RegistryPath)) { $RegistryPath = Join-Path $root 'docs/ai/AUDIT_IDENTITIES.json' }
elseif (-not [IO.Path]::IsPathRooted($RegistryPath)) { $RegistryPath = Join-Path $root $RegistryPath }
$RegistryPath = [IO.Path]::GetFullPath($RegistryPath)

function New-NativeGitProcess([string]$Arguments) {
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'git'
    $startInfo.Arguments = $Arguments
    $startInfo.WorkingDirectory = $root
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "failed to start git $Arguments" }
    $process
}

function Invoke-GitText([string]$Arguments) {
    $process = New-NativeGitProcess $Arguments
    try {
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw "git $Arguments failed: $stderr" }
        $stdout.Trim()
    } finally { $process.Dispose() }
}

function Invoke-GitBlobBytes([string]$Blob) {
    if ($Blob -notmatch '^[0-9a-f]{40}$') { throw "invalid Git blob id: $Blob" }
    $process = New-NativeGitProcess "cat-file blob $Blob"
    $memory = New-Object IO.MemoryStream
    try {
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $process.WaitForExit()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw "git cat-file blob failed: $stderr" }
        $memory.ToArray()
    } finally {
        $memory.Dispose()
        $process.Dispose()
    }
}

function Get-Sha256([byte[]]$Bytes) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '') }
    finally { $sha.Dispose() }
}

function Test-SafeRepositoryPath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    if ([IO.Path]::IsPathRooted($Path) -or $Path.StartsWith('/') -or $Path.StartsWith('\\')) { return $false }
    if ($Path -notmatch '^[A-Za-z0-9._/-]+$' -or $Path.Contains('\\') -or $Path.Contains('//') -or $Path.EndsWith('/')) { return $false }
    foreach ($segment in $Path.Split('/')) {
        if ([string]::IsNullOrEmpty($segment) -or $segment -eq '.' -or $segment -eq '..') { return $false }
    }
    $true
}

function Test-NonNegativeInteger($Value) {
    if ($null -eq $Value) { return $false }
    if ($Value -isnot [byte] -and $Value -isnot [int16] -and $Value -isnot [int32] -and $Value -isnot [int64] -and $Value -isnot [uint16] -and $Value -isnot [uint32] -and $Value -isnot [uint64]) { return $false }
    try { [uint64]$Value -ge 0 } catch { $false }
}

function ConvertFrom-StrictUtf8([byte[]]$Bytes,[string]$IdentityId) {
    $strictUtf8 = New-Object Text.UTF8Encoding($false,$true)
    try { $strictUtf8.GetString($Bytes) }
    catch { throw "$IdentityId historical declaration is not strict UTF-8" }
}

function Get-ExactlyOneDeclaration([string]$Text,[string]$Field,[string]$IdentityId) {
    $pattern = '(?m)^[ \t]*-[ \t]+' + [regex]::Escape($Field) + '[ \t]*:[ \t]*(\S+)[ \t]*$'
    $matches = [regex]::Matches($Text,$pattern)
    if ($matches.Count -ne 1) { throw "$IdentityId historical declaration must contain $Field exactly once; found $($matches.Count)" }
    $matches[0].Groups[1].Value
}

if (-not (Test-Path -LiteralPath $RegistryPath -PathType Leaf)) { throw "audit identity registry is missing: $RegistryPath" }
$registry = Get-Content -Raw -LiteralPath $RegistryPath | ConvertFrom-Json
if ([int]$registry.schema_version -ne 1) { throw 'audit identity registry schema_version must be 1' }
$identities = @($registry.identities)
if ($identities.Count -eq 0) { throw 'audit identity registry must contain at least one identity' }
$seen = New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)

foreach ($entry in $identities) {
    $id = [string]$entry.id
    if ([string]::IsNullOrWhiteSpace($id) -or -not $seen.Add($id)) { throw "audit identity id is missing or duplicate: $id" }
    $current = $entry.current_verified_identity
    $history = $entry.historical_mismatch
    $commit = [string]$current.source_commit
    $path = [string]$current.source_path
    $expectedBlob = [string]$current.git_blob
    $expectedSha = [string]$current.sha256
    $expectedBytes = [long]$current.bytes
    if ($commit -notmatch '^[0-9a-f]{40}$') { throw "$id current source_commit is invalid" }
    if (-not (Test-SafeRepositoryPath $path)) { throw "$id current source_path is invalid" }
    if ($expectedBlob -notmatch '^[0-9a-f]{40}$') { throw "$id current git_blob is invalid" }
    if ($expectedSha -notmatch '^[A-F0-9]{64}$') { throw "$id current sha256 is invalid" }
    if (-not (Test-NonNegativeInteger $current.bytes)) { throw "$id current bytes is invalid" }
    if ([string]$current.byte_source -cne 'exact_committed_git_blob') { throw "$id current byte_source must be exact_committed_git_blob" }
    if ([string]$current.eol_contract -cne 'normalized_lf') { throw "$id current eol_contract must be normalized_lf" }

    $resolvedBlob = Invoke-GitText "rev-parse --verify $commit`:$path"
    if ($resolvedBlob -cne $expectedBlob) { throw "$id Git blob mismatch: expected $expectedBlob actual $resolvedBlob" }
    $blobBytes = Invoke-GitBlobBytes $resolvedBlob
    $actualSha = Get-Sha256 $blobBytes
    if ($blobBytes.LongLength -ne $expectedBytes) { throw "$id byte count mismatch: expected $expectedBytes actual $($blobBytes.LongLength)" }
    if ($actualSha -cne $expectedSha) { throw "$id SHA-256 mismatch: expected $expectedSha actual $actualSha" }

    if ($null -eq $history) { throw "$id historical_mismatch is required" }
    if ([string]$history.finding_id -notmatch '^FINDING-[A-Z0-9-]+$') { throw "$id historical finding_id is invalid" }
    $declaredCommit = [string]$history.declared_by_commit
    $declaredPath = [string]$history.declared_by_path
    $declaredBlob = [string]$history.declared_by_git_blob
    $declaredSha = [string]$history.declared_sha256
    if ($declaredCommit -notmatch '^[0-9a-f]{40}$') { throw "$id historical declared_by_commit is invalid" }
    if (-not (Test-SafeRepositoryPath $declaredPath)) { throw "$id historical declared_by_path is invalid" }
    if ($declaredBlob -notmatch '^[0-9a-f]{40}$') { throw "$id historical declared_by_git_blob is invalid" }
    if ([string]::IsNullOrWhiteSpace([string]$history.explanation)) { throw "$id historical explanation is required" }
    if ($declaredSha -notmatch '^[A-F0-9]{64}$') { throw "$id historical declared_sha256 is invalid" }
    if (-not (Test-NonNegativeInteger $history.declared_bytes)) { throw "$id historical declared_bytes is invalid" }
    $declaredBytes = [long]$history.declared_bytes
    if ($declaredSha -ceq $expectedSha -and $declaredBytes -eq $expectedBytes) { throw "$id historical mismatch must differ from current identity" }
    if ($declaredSha -ceq $expectedSha -or $declaredBytes -eq $expectedBytes) { throw "$id historical mismatch identity pair is only partially different" }

    $resolvedDeclaredBlob = Invoke-GitText "rev-parse --verify $declaredCommit`:$declaredPath"
    if ($resolvedDeclaredBlob -cne $declaredBlob) { throw "$id historical Git blob mismatch: expected $declaredBlob actual $resolvedDeclaredBlob" }
    $declarationBytes = Invoke-GitBlobBytes $resolvedDeclaredBlob
    $declarationText = ConvertFrom-StrictUtf8 $declarationBytes $id
    $sourceSha = Get-ExactlyOneDeclaration $declarationText 'approval_relay_sha256' $id
    $sourceBytesText = Get-ExactlyOneDeclaration $declarationText 'approval_relay_bytes' $id
    if ($sourceSha -notmatch '^[A-F0-9]{64}$') { throw "$id historical approval_relay_sha256 is invalid" }
    if ($sourceBytesText -notmatch '^(0|[1-9][0-9]*)$') { throw "$id historical approval_relay_bytes is invalid" }
    if ($sourceSha -cne $declaredSha) { throw "$id historical approval_relay_sha256 mismatch: registry $declaredSha declaration $sourceSha" }
    if ([uint64]$sourceBytesText -ne [uint64]$declaredBytes) { throw "$id historical approval_relay_bytes mismatch: registry $declaredBytes declaration $sourceBytesText" }
}

Write-Output "Audit identity validation passed: $($identities.Count) committed identity record(s)."
