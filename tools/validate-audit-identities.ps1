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
    if ($path -notmatch '^[A-Za-z0-9._/-]+$' -or $path.StartsWith('/') -or $path -match '(^|/)\.\.(/|$)') { throw "$id current source_path is invalid" }
    if ($expectedBlob -notmatch '^[0-9a-f]{40}$') { throw "$id current git_blob is invalid" }
    if ($expectedSha -notmatch '^[A-F0-9]{64}$') { throw "$id current sha256 is invalid" }
    if ($expectedBytes -lt 0) { throw "$id current bytes is invalid" }
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
    if ([string]$history.declared_sha256 -notmatch '^[A-F0-9]{64}$') { throw "$id historical declared_sha256 is invalid" }
    if ([long]$history.declared_bytes -lt 0) { throw "$id historical declared_bytes is invalid" }
    if ([string]$history.declared_sha256 -ceq $expectedSha -and [long]$history.declared_bytes -eq $expectedBytes) { throw "$id historical mismatch must differ from current identity" }
    if ([string]$history.declared_sha256 -ceq $expectedSha -or [long]$history.declared_bytes -eq $expectedBytes) { throw "$id historical mismatch identity pair is only partially different" }
}

Write-Output "Audit identity validation passed: $($identities.Count) committed identity record(s)."
