[CmdletBinding()]
param(
    [switch]$Check,
    [string]$SharedRoot,
    [switch]$BootstrapV1,
    [string]$ManagedAdoptionPlanPath,
    [switch]$InstallSeeds
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

if (-not $BootstrapV1) {
    if (-not [string]::IsNullOrWhiteSpace($ManagedAdoptionPlanPath) -or $InstallSeeds) {
        throw 'ManagedAdoptionPlanPath and InstallSeeds require explicit -BootstrapV1.'
    }
    $installedSync = Join-Path $projectRoot 'docs/ai/generated/shared/tools/sync-project.ps1'
    $arguments = @{ ProjectRoot = $projectRoot; Check = $Check }
    if (-not [string]::IsNullOrWhiteSpace($SharedRoot)) { $arguments.SharedRoot = $SharedRoot }
    & $installedSync @arguments
    exit $LASTEXITCODE
}

if ([string]::IsNullOrWhiteSpace($SharedRoot)) {
    throw 'BootstrapV1 requires an explicit SharedRoot pinned to the approved source checkout.'
}

$expectedCommit = '4aa53fbe67edcbe2d7b6a147144b7b07022e5951'
$expectedTree = '366ed1ed65cf9481b37759a9caf9a1aac38e97f2'
$expectedVersionSha = '44E161E4495CAC2CF7858043E9E6418E9579F0DDCFAE826F9A372622968CE066'
$expectedManifestSha = 'B85F3B6730FB242C81359DB25BA498259DA52C961F8259682862E5C0246D9114'
$resolvedShared = [IO.Path]::GetFullPath($SharedRoot)

function Invoke-SharedGit([string[]]$Arguments, [string]$Failure) {
    $output = @(& git -C $resolvedShared @Arguments 2>$null)
    if ($LASTEXITCODE -ne 0) { throw $Failure }
    $output
}

$sourceHead = ((Invoke-SharedGit @('rev-parse', '--verify', 'HEAD^{commit}') 'Shared HEAD is unavailable.') -join '').Trim()
$sourceTree = ((Invoke-SharedGit @('rev-parse', '--verify', 'HEAD^{tree}') 'Shared tree is unavailable.') -join '').Trim()
if ($sourceHead -cne $expectedCommit -or $sourceTree -cne $expectedTree) {
    throw "Shared v1 bootstrap identity mismatch: $sourceHead / $sourceTree"
}
$sourceStatus = @(Invoke-SharedGit @('status', '--porcelain=v1', '--untracked-files=all') 'Shared worktree status is unavailable.')
if ($sourceStatus.Count -ne 0) { throw 'Shared v1 bootstrap requires a clean exact-source worktree.' }

$versionPath = Join-Path $resolvedShared 'VERSION'
$manifestPath = Join-Path $resolvedShared 'manifest.yml'
$sourceSync = Join-Path $resolvedShared 'tools/sync-project.ps1'
foreach ($required in @($versionPath, $manifestPath, $sourceSync)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Shared v1 bootstrap file is missing: $required" }
}
$versionSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $versionPath).Hash
$manifestSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash
if ($versionSha -cne $expectedVersionSha -or $manifestSha -cne $expectedManifestSha) {
    throw 'Shared v1 VERSION or manifest bytes do not match the approved source identity.'
}
$versionBytes = [IO.File]::ReadAllBytes($versionPath)
if ($versionBytes.Length -ne 6 -or [Text.Encoding]::UTF8.GetString($versionBytes) -cne "1.0.1`n") {
    throw 'Shared v1 VERSION byte shape is invalid.'
}

$arguments = @{
    ProjectRoot = $projectRoot
    SharedRoot = $resolvedShared
    Check = $Check
    InstallSeeds = $InstallSeeds
}
if (-not [string]::IsNullOrWhiteSpace($ManagedAdoptionPlanPath)) {
    $arguments.ManagedAdoptionPlanPath = [IO.Path]::GetFullPath($ManagedAdoptionPlanPath)
}
& $sourceSync @arguments
exit $LASTEXITCODE
