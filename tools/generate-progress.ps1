[CmdletBinding()]
param([switch]$Check)

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
& (Join-Path $projectRoot 'docs/ai/generated/shared/tools/generate-progress.ps1') -ProjectRoot $projectRoot -Check:$Check
