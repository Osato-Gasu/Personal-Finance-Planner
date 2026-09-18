[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Stop-Hook([string]$Message) {
    throw ('Shared reference update rejected: ' + $Message)
}

function Get-RequiredIdentity {
    $repository = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_REPOSITORY')
    $version = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_VERSION')
    $commit = [Environment]::GetEnvironmentVariable('SHARED_SYNC_SOURCE_COMMIT')
    $present = 0
    foreach ($value in @($repository, $version, $commit)) {
        if ($null -ne $value) { $present++ }
    }
    if ($present -ne 3) { Stop-Hook 'all three Shared identity environment values are required' }
    if ([string]::IsNullOrWhiteSpace($repository) -or
        [string]::IsNullOrWhiteSpace($version) -or
        [string]::IsNullOrWhiteSpace($commit)) {
        Stop-Hook 'Shared identity environment values must be non-empty'
    }
    if ($repository -cne 'Osato-Gasu/shared') { Stop-Hook 'source repository is not Osato-Gasu/shared' }
    $versionMatch = [regex]::Match($version, '\A(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\z')
    if (-not $versionMatch.Success) { Stop-Hook 'source version is not a released numeric semver' }
    try { $major = [int64]$versionMatch.Groups[1].Value } catch { Stop-Hook 'source version is out of range' }
    if ($major -lt 2) { Stop-Hook 'source version is outside the supported Shared 2.x-or-later policy' }
    if (-not [regex]::IsMatch($commit, '\A[0-9a-fA-F]{40}\z')) { Stop-Hook 'source commit is not a full SHA-1' }
    if ([regex]::IsMatch($commit, '\A0{40}\z')) { Stop-Hook 'source commit is the null SHA' }
    return [pscustomobject]@{
        Repository = $repository
        Version = $version
        Commit = $commit.ToLowerInvariant()
    }
}

$identity = Get-RequiredIdentity
$root = [IO.Path]::GetFullPath((Get-Location).Path)
$lockRelative = 'docs/ai/SHARED_RULES.lock.yml'
$lockPath = [IO.Path]::GetFullPath((Join-Path $root ($lockRelative.Replace('/', [IO.Path]::DirectorySeparatorChar))))
$lockDirectory = Split-Path -Parent $lockPath
$rootPrefix = $root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
if (-not $lockPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Hook 'lock path escaped the Project root'
}
if (-not (Test-Path -LiteralPath $lockDirectory -PathType Container)) {
    Stop-Hook 'lock directory is missing'
}
if (Test-Path -LiteralPath $lockPath) {
    $existing = Get-Item -LiteralPath $lockPath -Force
    if (($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or
        -not ($existing -is [IO.FileInfo])) {
        Stop-Hook 'lock path is not a regular file'
    }
}

$content = @(
    'schema_version: 2'
    ('source_repository: ' + $identity.Repository)
    ('source_version: ' + $identity.Version)
    ('source_commit: ' + $identity.Commit)
) -join "`n"
$tempPath = Join-Path $lockDirectory ('.SHARED_RULES.lock.yml.' + [guid]::NewGuid().ToString('N') + '.tmp')
$backupPath = Join-Path $lockDirectory ('.SHARED_RULES.lock.yml.' + [guid]::NewGuid().ToString('N') + '.bak')
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
try {
    [IO.File]::WriteAllText($tempPath, $content + "`n", $utf8NoBom)
    if (Test-Path -LiteralPath $lockPath -PathType Leaf) {
        [IO.File]::Replace($tempPath, $lockPath, $backupPath)
        if (Test-Path -LiteralPath $backupPath) { [IO.File]::Delete($backupPath) }
    } else {
        [IO.File]::Move($tempPath, $lockPath)
    }
} finally {
    if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    }
}
