[CmdletBinding()]
param([switch]$Check,[string]$SharedRoot)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sync = Join-Path $projectRoot 'docs/ai/generated/shared/tools/sync-project.ps1'
$arguments = @{ ProjectRoot = $projectRoot; Check = $Check }
if (-not [string]::IsNullOrWhiteSpace($SharedRoot)) { $arguments.SharedRoot = $SharedRoot }
& $sync @arguments
