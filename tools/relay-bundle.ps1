[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('New','Validate','Import')][string]$Action,
    [Parameter(Mandatory=$true)][string]$BundlePath,
    [string]$OutputPath,
    [string]$ExpectedSha256,
    [long]$ExpectedBytes,
    [ValidateSet('none','after_writes','after_next_action')][string]$FailureInjection='none'
)

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$arguments = @{} + $PSBoundParameters
& (Join-Path $projectRoot 'docs/ai/generated/shared/tools/relay-bundle.ps1') -ProjectRoot $projectRoot @arguments
