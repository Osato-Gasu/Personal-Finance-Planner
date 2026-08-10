[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
& (Join-Path $projectRoot 'docs/ai/generated/shared/tools/validate-project.ps1') -ProjectRoot $projectRoot
