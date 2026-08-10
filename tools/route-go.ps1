[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('ChatGPT','Codex','Claude','USER','NONE')][string]$SessionActor,
    [Parameter(Mandatory=$true)][ValidateSet('ORCHESTRATOR_AND_REVIEWER','IMPLEMENTER','INDEPENDENT_REVIEWER','USER','NONE')][string]$SessionRole,
    [Parameter(Mandatory=$true)][ValidateSet('existing_session','separate_session')][string]$SessionMode,
    [ValidateSet('local_script','connector_read_only')][string]$RoutingMode='local_script',
    [string]$RequestedRef,
    [string]$ExpectedResolvedCommit,
    [string]$ExpectedNextActionBlob,
    [string]$ExpectedHandoffBlob,
    [string]$ExpectedAdapterBlob,
    [string]$RelayPointerPath,
    [string]$RelayBundlePath,
    [string]$ExpectedSha256,
    [long]$ExpectedBytes,
    [string]$ExpectedFormat,
    [switch]$ApplyChatGPTDocsBridge,
    [string]$ExpectedRemoteTip,
    [switch]$ImportRelay
)

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$arguments = @{} + $PSBoundParameters
& (Join-Path $projectRoot 'docs/ai/generated/shared/tools/route-go.ps1') -ProjectRoot $projectRoot @arguments
