# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$ProjectRoot,
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

$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root=[IO.Path]::GetFullPath($ProjectRoot)
$routeRepository='unknown';$routeRequestedRef='not_resolved';$routeResolvedCommit='not_resolved';$routeNextBlob='not_resolved';$routeHandoffBlob='not_resolved';$routeAdapterBlob='not_resolved'
$bridgeApplied=$false
function Project-Path([string]$Relative){Join-Path $root $Relative}
function Read-Key([string]$Text,[string]$Key,[string]$Source){
    $matches=[regex]::Matches($Text,"(?m)^\s*(?:-\s*)?$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if($matches.Count -ne 1){throw "Expected exactly one '$Key' in $Source"}
    return [string]$matches[0].Groups[1].Value.Trim()
}
function New-RouteResult([string]$Route,[string]$Outcome,[string]$Reason,[string]$TaskId,[string]$Phase,[string]$Handoff,[bool]$RelayImportAllowed=$false){
    $connector=$RoutingMode-ceq'connector_read_only'
    [ordered]@{
        schema_version=1
        routing_mode=$RoutingMode
        route=$Route
        outcome=$Outcome
        reason_code=$Reason
        actor=$SessionActor
        role=$SessionRole
        session_mode=$SessionMode
        task_id=$TaskId
        phase=$Phase
        handoff_file=$Handoff
        repository=$routeRepository
        requested_ref=$routeRequestedRef
        resolved_commit=$routeResolvedCommit
        next_action_blob=$routeNextBlob
        handoff_blob=$routeHandoffBlob
        adapter_blob=$routeAdapterBlob
        repository_access=if($connector){'remote_read_only'}else{'local_worktree'}
        local_script_executed=(-not$connector)
        local_worktree_state=if($connector){'not_observable'}else{'not_checked_by_router'}
        writer_conflict_state=if($connector){'not_observable'}else{'not_checked_by_router'}
        state_write_allowed=if($connector){$false}else{'not_probed'}
        relay_import_allowed=if($connector){$false}else{$RelayImportAllowed}
        repository_changed=$false
    }
}
function Invoke-GitValue([string[]]$Arguments,[string]$Failure){
    $value=(& git -C $root @Arguments 2>$null)
    if($LASTEXITCODE-ne0){throw $Failure}
    ($value-join"`n").Trim()
}
function Read-CommitFile([string]$Commit,[string]$Relative){
    $psi=New-Object Diagnostics.ProcessStartInfo
    $psi.FileName='git.exe'
    $psi.Arguments="-C `"$root`" show `"$Commit`:$Relative`""
    $psi.UseShellExecute=$false;$psi.CreateNoWindow=$true;$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true
    $psi.StandardOutputEncoding=[Text.Encoding]::UTF8
    $process=New-Object Diagnostics.Process;$process.StartInfo=$psi
    if(-not$process.Start()){throw "immutable connector file is missing: $Relative"}
    $text=$process.StandardOutput.ReadToEnd();$null=$process.StandardError.ReadToEnd();$process.WaitForExit()
    if($process.ExitCode-ne0){throw "immutable connector file is missing: $Relative"}
    $text
}
function Get-CommitBlob([string]$Commit,[string]$Relative){
    $blob=Invoke-GitValue @('rev-parse',"$Commit`:$Relative") "immutable connector blob is missing: $Relative"
    if($blob-notmatch'^[0-9a-f]{40}$'){throw "immutable connector blob identity is invalid: $Relative"}
    $blob
}
function Read-HandoffKey([string]$Text,[string[]]$Keys,[string]$Source){
    $found=@()
    foreach($key in $Keys){$matches=[regex]::Matches($Text,"(?m)^\s*(?:-\s*)?$([regex]::Escape($key)):\s*(.*?)\s*$");foreach($match in $matches){$found+=,$match}}
    if($found.Count-ne1){throw "Expected exactly one of '$($Keys-join'/')' in $Source"}
    $value=$found[0].Groups[1].Value.Trim();$quoted=[regex]::Match($value,'^`([^`]+)`$');if($quoted.Success){$value=$quoted.Groups[1].Value};$value
}
function Read-HandoffList([string]$Text,[string]$Key,[string]$Source){
    $match=[regex]::Match($Text,"(?ms)^\s*-\s*$([regex]::Escape($Key)):\s*\r?\n(?<items>(?:\s{2,}-\s*[^\r\n]+\r?\n?)+)")
    if(-not$match.Success){throw "Missing list '$Key' in $Source"}
    $items=@([regex]::Matches($match.Groups['items'].Value,'(?m)^\s+-\s*(.+?)\s*$')|ForEach-Object{$_.Groups[1].Value.Trim()})
    if($items.Count-eq0-or@($items|Select-Object -Unique).Count-ne$items.Count){throw "Invalid list '$Key' in $Source"}
    $items
}
function Test-BridgePath([string]$Path){
    -not[IO.Path]::IsPathRooted($Path)-and$Path-notmatch'(^|[\\/])\.\.([\\/]|$)'-and$Path-match'^docs/ai/'
}
function Assert-HandoffIdentity($Next,$HandoffText,$Adapter,[string]$TaskId,[string]$Phase,[string]$Source){
    if($TaskId-ceq'none'){return}
    $expected=[ordered]@{
        task_id=$TaskId
        phase=$Phase
        actor=(Read-Key $Next 'next_actor' 'NEXT_ACTION')
        role=(Read-Key $Next 'next_role' 'NEXT_ACTION')
        model=(Read-Key $Next 'model' 'NEXT_ACTION')
        effort=(Read-Key $Next 'effort' 'NEXT_ACTION')
        candidate_commit=(Read-Key $Next 'reviewed_candidate' 'NEXT_ACTION')
        shared_candidate=(Read-Key $Next 'rules_commit' 'NEXT_ACTION')
    }
    $actual=[ordered]@{
        task_id=(Read-HandoffKey $HandoffText @('task_id') $Source)
        phase=(Read-HandoffKey $HandoffText @('phase','next_phase') $Source)
        actor=(Read-HandoffKey $HandoffText @('actor','next_actor') $Source)
        role=(Read-HandoffKey $HandoffText @('role','next_role') $Source)
        model=(Read-HandoffKey $HandoffText @('model') $Source)
        effort=(Read-HandoffKey $HandoffText @('effort') $Source)
        candidate_commit=(Read-HandoffKey $HandoffText @('candidate_commit') $Source)
        shared_candidate=(Read-HandoffKey $HandoffText @('shared_candidate') $Source)
    }
    foreach($key in $expected.Keys){if([string]$actual[$key]-cne[string]$expected[$key]){throw "handoff identity mismatch: $key"}}
}
function Assert-ExpectedSnapshot{
    foreach($pair in @(
        @('resolved_commit',$ExpectedResolvedCommit,$routeResolvedCommit),
        @('next_action_blob',$ExpectedNextActionBlob,$routeNextBlob),
        @('handoff_blob',$ExpectedHandoffBlob,$routeHandoffBlob),
        @('adapter_blob',$ExpectedAdapterBlob,$routeAdapterBlob)
    )){if(-not[string]::IsNullOrWhiteSpace([string]$pair[1])-and[string]$pair[1]-cne[string]$pair[2]){throw "connector snapshot identity mismatch: $($pair[0])"}}
}
function Stop-ReadOnly([string]$Reason,[string]$Message,[string]$TaskId='unknown',[string]$Phase='unknown',[string]$Handoff='unknown'){
    New-RouteResult 'MISMATCH' 'DENY' $Reason $TaskId $Phase $Handoff|ConvertTo-Json -Depth 5 -Compress
    [Console]::Error.WriteLine("GO route error: $Message")
    exit 1
}
function Invoke-AuthorizedChatGPTDocsBridge([string]$ApprovedTip) {
    if($RoutingMode-cne'local_script'){throw 'write bridge is unavailable to a connector-only actor'}
    if($SessionActor-cne'Codex'-or$SessionRole-cne'IMPLEMENTER'){throw 'write bridge requires the local Codex IMPLEMENTER binding'}
    if($ApprovedTip-notmatch'^[0-9a-f]{40}$'){throw 'write bridge requires an exact expected remote tip'}
    $branch=Invoke-GitValue @('branch','--show-current') 'write bridge branch identity is unavailable'
    if([string]::IsNullOrWhiteSpace($branch)){throw 'write bridge requires a named branch'}
    if(-not[string]::IsNullOrWhiteSpace((Invoke-GitValue @('status','--porcelain') 'write bridge worktree state is unavailable'))){throw 'write bridge requires a clean worktree'}
    $head=Invoke-GitValue @('rev-parse','HEAD') 'write bridge local HEAD is unavailable'
    & git -C $root fetch --quiet origin 2>$null | Out-Null
    if($LASTEXITCODE-ne0){throw 'write bridge fetch failed'}
    $remoteRef="origin/$branch";$tip=Invoke-GitValue @('rev-parse','--verify',"$remoteRef`^{commit}") 'write bridge remote branch is unavailable'
    if($tip-cne$ApprovedTip){throw 'write bridge remote tip does not match the approved identity'}
    & git -C $root merge-base --is-ancestor $head $tip 2>$null
    if($LASTEXITCODE-ne0){throw 'write bridge rejects a diverged or non-fast-forward history'}
    $remoteNext=Read-CommitFile $tip 'docs/ai/NEXT_ACTION.yml'
    $bridgeTask=Read-Key $remoteNext 'task_id' 'remote NEXT_ACTION'
    $bridgeHandoff=Read-Key $remoteNext 'handoff_file' 'remote NEXT_ACTION'
    if($bridgeTask-notmatch'^TASK-[0-9]+$'){throw 'write bridge task identity is invalid'}
    if($bridgeHandoff-notmatch("^docs/ai/handoffs/"+[regex]::Escape($bridgeTask)+"/[^/]+\.md$")-or-not(Test-BridgePath $bridgeHandoff)){throw 'write bridge handoff path is invalid'}
    $handoff=Read-CommitFile $tip $bridgeHandoff
    if((Read-HandoffKey $handoff @('write_bridge_sync_authorized') 'bridge handoff')-cne'true'){throw 'write bridge authority is missing'}
    if((Read-HandoffKey $handoff @('bridge_task_id') 'bridge handoff')-cne$bridgeTask){throw 'write bridge task authority is invalid'}
    if((Read-HandoffKey $handoff @('bridge_handoff_file') 'bridge handoff')-cne$bridgeHandoff){throw 'write bridge handoff authority is invalid'}
    $reportPath=Read-HandoffKey $handoff @('bridge_report_file') 'bridge handoff'
    if($reportPath-notmatch("^docs/ai/reports/"+[regex]::Escape($bridgeTask)+"/[^/]+\.md$")-or-not(Test-BridgePath $reportPath)){throw 'write bridge report path is invalid'}
    $allowed=@(Read-HandoffList $handoff 'bridge_allowed_paths' 'bridge handoff')
    foreach($path in $allowed){if(-not(Test-BridgePath $path)){throw "write bridge rejects non-docs allowlist path: $path"}}
    foreach($required in @('docs/ai/NEXT_ACTION.yml','docs/ai/CURRENT_STATE.md',$bridgeHandoff,$reportPath)){if($allowed-cnotcontains$required){throw "write bridge allowlist is missing: $required"}}
    $changed=@(& git -C $root diff --name-only "$head..$tip" 2>$null)
    if($LASTEXITCODE-ne0-or$changed.Count-eq0){throw 'write bridge requires a remote-only docs transition'}
    foreach($path in $changed){if($allowed-cnotcontains$path){throw "write bridge rejects non-authorized remote path: $path"}}
    if((Read-HandoffKey $handoff @('previous_handoff_head') 'bridge handoff')-cne$head){throw 'write bridge authority does not bind the local HEAD'}
    $lsRemote=(& git -C $root ls-remote origin "refs/heads/$branch" 2>$null)-join"`n"
    if($LASTEXITCODE-ne0-or$lsRemote-notmatch("^"+[regex]::Escape($tip)+"\s")){throw 'write bridge remote race detected'}
    & git -C $root merge --ff-only $remoteRef 2>$null
    if($LASTEXITCODE-ne0){throw 'write bridge fast-forward failed'}
    if((Invoke-GitValue @('rev-parse','HEAD') 'write bridge final HEAD is unavailable')-cne$tip){throw 'write bridge final identity mismatch'}
    if(-not[string]::IsNullOrWhiteSpace((Invoke-GitValue @('status','--porcelain') 'write bridge final worktree state is unavailable'))){throw 'write bridge left a dirty worktree'}
    $script:bridgeApplied=$true
}
function Invoke-AutomaticChatGPTDocsBridge {
    if($RoutingMode -cne 'local_script' -or $SessionActor -cne 'Codex' -or $SessionRole -cne 'IMPLEMENTER' -or $SessionMode -cne 'existing_session' -or -not [string]::IsNullOrWhiteSpace($RelayPointerPath) -or -not [string]::IsNullOrWhiteSpace($RelayBundlePath)){return}
    $branch=Invoke-GitValue @('branch','--show-current') 'write bridge branch identity is unavailable'
    if([string]::IsNullOrWhiteSpace($branch)){throw 'write bridge requires a named branch'}
    if(-not[string]::IsNullOrWhiteSpace((Invoke-GitValue @('status','--porcelain') 'write bridge worktree state is unavailable'))){return}
    $head=Invoke-GitValue @('rev-parse','HEAD') 'write bridge local HEAD is unavailable'
    & git -C $root fetch --quiet origin 2>$null | Out-Null
    if($LASTEXITCODE-ne0){throw 'write bridge fetch failed'}
    $tip=Invoke-GitValue @('rev-parse','--verify',"origin/$branch`^{commit}") 'write bridge remote branch is unavailable'
    if($tip-ceq$head){return}
    & git -C $root merge-base --is-ancestor $head $tip 2>$null
    if($LASTEXITCODE-ne0){throw 'write bridge rejects a diverged or non-fast-forward history'}
    Invoke-AuthorizedChatGPTDocsBridge $tip
}

$taskId='unknown';$phase='unknown';$handoff='unknown'
try{
    if($ApplyChatGPTDocsBridge){Invoke-AuthorizedChatGPTDocsBridge $ExpectedRemoteTip}else{Invoke-AutomaticChatGPTDocsBridge}
    if([string]::IsNullOrWhiteSpace($RequestedRef)){$currentBranch=Invoke-GitValue @('branch','--show-current') 'repository branch identity is unavailable';$RequestedRef=if([string]::IsNullOrWhiteSpace($currentBranch)){'HEAD'}else{"refs/heads/$currentBranch"}}
    $routeRequestedRef=$RequestedRef
    $routeResolvedCommit=Invoke-GitValue @('rev-parse','--verify',"$RequestedRef`^{commit}") 'requested connector ref cannot be resolved'
    if($routeResolvedCommit-notmatch'^[0-9a-f]{40}$'){throw 'resolved connector commit is invalid'}
    $nextRelative='docs/ai/NEXT_ACTION.yml';$adapterRelative='docs/ai/PROJECT_ADAPTER.psd1'
    $next=Read-CommitFile $routeResolvedCommit $nextRelative;$adapterText=Read-CommitFile $routeResolvedCommit $adapterRelative
    $routeNextBlob=Get-CommitBlob $routeResolvedCommit $nextRelative;$routeAdapterBlob=Get-CommitBlob $routeResolvedCommit $adapterRelative
    $adapter=Import-AdapterText $adapterText;$routeRepository=[string]$adapter.Relay.Repository
    $taskId=Read-Key $next 'task_id' 'NEXT_ACTION';$phase=Read-Key $next 'phase' 'NEXT_ACTION';$handoff=Read-Key $next 'handoff_file' 'NEXT_ACTION'
    if([IO.Path]::IsPathRooted($handoff)-or$handoff-match'(^|[\\/])\.\.([\\/]|$)'){throw 'NEXT_ACTION handoff identity escapes project root'}
    $handoffText=Read-CommitFile $routeResolvedCommit $handoff;$routeHandoffBlob=Get-CommitBlob $routeResolvedCommit $handoff
    Assert-ExpectedSnapshot
    Assert-HandoffIdentity $next $handoffText $adapter $taskId $phase $handoff
}catch{Stop-ReadOnly 'HANDOFF_IDENTITY_INVALID' $_.Exception.Message $taskId $phase $handoff}
$nextActor=Read-Key $next 'next_actor' 'NEXT_ACTION';$nextRole=Read-Key $next 'next_role' 'NEXT_ACTION';$nextMode=Read-Key $next 'execution_mode' 'NEXT_ACTION'
if($nextActor-ceq$SessionActor-and$nextRole-ceq$SessionRole){
    if($nextRole-ceq'INDEPENDENT_REVIEWER'){
        if($SessionMode-cne'separate_session'-or$nextMode-cne'separate_session'){Stop-ReadOnly 'SESSION_MODE_MISMATCH' 'independent review requires a separately bound session' $taskId $phase $handoff}
        if((Read-Key $next 'actual_executor' 'NEXT_ACTION')-cne$SessionActor){Stop-ReadOnly 'ACTOR_MISMATCH' 'independent review session actor does not match actual_executor' $taskId $phase $handoff}
    }
    $route=if($RoutingMode-ceq'connector_read_only'){'CONNECTOR_READ_ONLY'}else{'NORMAL'}
    $result=New-RouteResult $route 'ALLOW' 'MATCH' $taskId $phase $handoff
    $result.repository_changed=$bridgeApplied
    $result|ConvertTo-Json -Depth 5 -Compress
    exit 0
}

if($RoutingMode-ceq'connector_read_only'){
    $reason=if($nextActor-cne$SessionActor){'ACTOR_MISMATCH'}else{'ROLE_MISMATCH'}
    Stop-ReadOnly $reason "actor/role mismatch: expected $nextActor/$nextRole, got $SessionActor/$SessionRole" $taskId $phase $handoff
}
if([string]::IsNullOrWhiteSpace($RelayPointerPath)-and[string]::IsNullOrWhiteSpace($RelayBundlePath)){
    $reason=if($nextActor-cne$SessionActor){'ACTOR_MISMATCH'}else{'ROLE_MISMATCH'}
    Stop-ReadOnly $reason "actor/role mismatch: expected $nextActor/$nextRole, got $SessionActor/$SessionRole" $taskId $phase $handoff
}
if(-not[string]::IsNullOrWhiteSpace($RelayPointerPath)){
    $pointer=[IO.Path]::GetFullPath($RelayPointerPath);if(-not(Test-Path -LiteralPath $pointer -PathType Leaf)){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer is missing' $taskId $phase $handoff}
    $pointerText=[IO.File]::ReadAllText($pointer)
    $pointerValues=@{};foreach($line in ($pointerText -split '\r?\n')){$pointerMatch=[regex]::Match($line,'^\s*(?<key>[A-Za-z0-9_]+):\s*(?<value>.*?)\s*$');if($pointerMatch.Success){$pointerValues[$pointerMatch.Groups['key'].Value]=$pointerMatch.Groups['value'].Value}}
    foreach($key in @('status','relay_bundle_name','relay_bundle_sha256','relay_bundle_bytes','relay_bundle_format')){if(-not$pointerValues.ContainsKey($key)){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' "relay pointer key is missing: $key" $taskId $phase $handoff}}
    if([string]$pointerValues['status']-cne'USER_RELAY_REQUIRED'){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer status is invalid' $taskId $phase $handoff}
    $pointerName=[string]$pointerValues['relay_bundle_name'];$pointerSha=[string]$pointerValues['relay_bundle_sha256'];$pointerBytes=[long]$pointerValues['relay_bundle_bytes'];$pointerFormat=[string]$pointerValues['relay_bundle_format']
    if([string]::IsNullOrWhiteSpace($RelayBundlePath)){$RelayBundlePath=Join-Path (Split-Path -Parent $pointer) $pointerName}
    if((Split-Path -Leaf $RelayBundlePath)-cne$pointerName){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer bundle name mismatch' $taskId $phase $handoff}
    if(-not[string]::IsNullOrWhiteSpace($ExpectedSha256)-and$ExpectedSha256-cne$pointerSha){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer SHA-256 conflicts with supplied identity' $taskId $phase $handoff}
    if($ExpectedBytes-gt0-and$ExpectedBytes-ne$pointerBytes){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer bytes conflict with supplied identity' $taskId $phase $handoff}
    if(-not[string]::IsNullOrWhiteSpace($ExpectedFormat)-and$ExpectedFormat-cne$pointerFormat){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay pointer format conflicts with supplied identity' $taskId $phase $handoff}
    $ExpectedSha256=$pointerSha;$ExpectedBytes=$pointerBytes;$ExpectedFormat=$pointerFormat
}
if([string]::IsNullOrWhiteSpace($RelayBundlePath)){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle path is missing' $taskId $phase $handoff}
if($ExpectedSha256 -notmatch '^[A-Fa-f0-9]{64}$'){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle SHA-256 is invalid' $taskId $phase $handoff}
if($ExpectedBytes -le 0){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle bytes are invalid' $taskId $phase $handoff}
if($ExpectedFormat -cne 'JSON'){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle format is invalid' $taskId $phase $handoff}
$bundlePath=[IO.Path]::GetFullPath($RelayBundlePath);if(-not(Test-Path -LiteralPath $bundlePath -PathType Leaf)){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle is missing' $taskId $phase $handoff}
$actualSha=(Get-FileHash -Algorithm SHA256 -LiteralPath $bundlePath).Hash;$actualBytes=(Get-Item -LiteralPath $bundlePath).Length
if($actualSha-cne$ExpectedSha256.ToUpperInvariant()-or$actualBytes-ne$ExpectedBytes){Stop-ReadOnly 'RELAY_IDENTITY_INVALID' 'relay bundle identity mismatch' $taskId $phase $handoff}
try{$bundle=[IO.File]::ReadAllText($bundlePath)|ConvertFrom-Json}catch{Stop-ReadOnly 'RELAY_SCHEMA_INVALID' 'relay bundle JSON is invalid' $taskId $phase $handoff}
if([string]$bundle.status-cne'USER_RELAY_REQUIRED'){Stop-ReadOnly 'RELAY_SCHEMA_INVALID' 'relay bundle status is invalid' $taskId $phase $handoff}
if([string]$bundle.relay_recipient-cne$SessionActor-or[string]$bundle.relay_recipient_role-cne$SessionRole){Stop-ReadOnly 'RELAY_RECIPIENT_MISMATCH' 'relay recipient does not match current session binding' $taskId $phase $handoff}
$relayTool=Join-Path $PSScriptRoot 'relay-bundle.ps1';if(-not(Test-Path -LiteralPath $relayTool -PathType Leaf)){Stop-ReadOnly 'ROUTING_AUTHORITY_MISSING' 'relay validator is missing' $taskId $phase $handoff}
$action=if($ImportRelay){'Import'}else{'Validate'}
$relayOutput=& $relayTool -Action $action -ProjectRoot $root -BundlePath $bundlePath -ExpectedSha256 $actualSha -ExpectedBytes $actualBytes
if(-not$?){exit 1}
$relayOutput
$route=if($ImportRelay){'RELAY_IMPORTED'}else{'RELAY_OVERRIDE_VALIDATED'}
$result=New-RouteResult $route 'ALLOW' 'VERIFIED_RELAY' ([string]$bundle.task_id) ([string]$bundle.next_phase) $handoff $true
$result.repository_changed=[bool]$ImportRelay
$result|ConvertTo-Json -Depth 5 -Compress
exit 0
