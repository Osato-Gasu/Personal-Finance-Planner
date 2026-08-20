# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('New','Validate','Import')][string]$Action,
    [Parameter(Mandatory=$true)][string]$ProjectRoot,
    [Parameter(Mandatory=$true)][string]$BundlePath,
    [string]$OutputPath,
    [string]$ExpectedSha256,
    [long]$ExpectedBytes,
    [ValidateSet('none','after_writes','after_next_action')][string]$FailureInjection='none'
)

$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root=[IO.Path]::GetFullPath($ProjectRoot)
$utf8NoBom=[Text.UTF8Encoding]::new($false)
$policy=Import-AdapterFile -Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'core/POLICY.psd1') -ExpectedBom absent
function Resolve-SharedPowerShellExe {
    param(
        [string]$EditionOverride,
        [string]$ProcessPathOverride,
        [string]$HostHomeOverride,
        [switch]$NoPathLookup
    )
    $edition = if ([string]::IsNullOrWhiteSpace($EditionOverride)) {
        $PSVersionTable.PSEdition
    } else {
        $EditionOverride
    }
    if ($edition -ne 'Desktop' -and $edition -ne 'Core') {
        throw "Cannot resolve PowerShell host: unsupported PSEdition=$edition"
    }

    $attempted = [Collections.Generic.List[string]]::new()
    $attemptProcess = if ([string]::IsNullOrWhiteSpace($ProcessPathOverride)) {
        try {
            [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
        } catch {
            $null
        }
    } else {
        $ProcessPathOverride
    }

    if (-not [string]::IsNullOrWhiteSpace($attemptProcess)) {
        $attempted.Add($attemptProcess)
        $processName = [IO.Path]::GetFileName($attemptProcess).ToLowerInvariant()
        if ($edition -eq 'Core') {
            $isAllowed = ($processName -ceq 'pwsh.exe' -or $processName -ceq 'pwsh')
        } else {
            $isAllowed = ($processName -ceq 'powershell.exe')
        }
        if ($isAllowed -and [IO.Path]::IsPathRooted($attemptProcess) -and (Test-Path -LiteralPath $attemptProcess -PathType Leaf)) {
            return [IO.Path]::GetFullPath($attemptProcess)
        }
    }

    $hostHome = if ([string]::IsNullOrWhiteSpace($HostHomeOverride)) { $PSHOME } else { $HostHomeOverride }
    $hostNames = if ($edition -eq 'Core') { @('pwsh.exe', 'pwsh') } else { @('powershell.exe') }
    foreach ($hostName in $hostNames) {
        $psHomeCandidate = Join-Path $hostHome $hostName
        $attempted.Add($psHomeCandidate)
        if (Test-Path -LiteralPath $psHomeCandidate -PathType Leaf) {
            return [IO.Path]::GetFullPath($psHomeCandidate)
        }
    }
    if (-not $NoPathLookup) {
        foreach ($hostName in $hostNames) {
            $pathResolved = (Get-Command $hostName -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
            if (-not [string]::IsNullOrWhiteSpace($pathResolved)) {
                $attempted.Add($pathResolved)
                if (Test-Path -LiteralPath $pathResolved -PathType Leaf) {
                    return [IO.Path]::GetFullPath($pathResolved)
                }
            }
        }
    }

    throw "Cannot resolve PowerShell host for PSEdition=$edition. Tried: $($attempted -join ', ')"
}

$powershellExe = Resolve-SharedPowerShellExe
function Project-Path([string]$Relative){Join-Path $root $Relative}
function Require-Text($Value,[string]$Name){if($null-eq$Value-or[string]::IsNullOrWhiteSpace([string]$Value)){throw "relay bundle field is empty: $Name"}}
function Require-SingleLine($Value,[string]$Name){Require-Text $Value $Name;if([string]$Value-match'[\r\n]'){throw "relay bundle field must be single-line: $Name"}}
function Require-List($Value,[string]$Name){if($null-eq$Value-or@($Value).Count-eq0){throw "relay bundle list is empty: $Name"};foreach($item in @($Value)){Require-Text $item $Name}}
function Require-Bool($Value,[string]$Name){if($null-eq$Value-or$Value.GetType()-ne[bool]){throw "relay bundle field must be boolean: $Name"}}
function Require-NonNegativeInteger($Value,[string]$Name){if($null-eq$Value-or($Value-isnot[int]-and$Value-isnot[long])-or[long]$Value-lt0){throw "relay bundle field must be a non-negative integer: $Name"}}
function Require-CommitOrNone($Value,[string]$Name){Require-Text $Value $Name;if([string]$Value-cne'none'-and[string]$Value-notmatch'^[0-9a-f]{40}$'){throw "relay bundle commit is invalid: $Name"}}
function Test-FindingId([string]$Value){
    -not[string]::IsNullOrWhiteSpace($Value)-and$Value-match'^[A-Z][A-Z0-9_-]*-[0-9]+$'
}
function Read-Key([string]$Text,[string]$Key,[string]$Source){
    $matches=[regex]::Matches($Text,"(?m)^\s*(?:-\s*)?$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if($matches.Count-eq0){throw "Missing '$Key' in $Source"}
    if($matches.Count-ne1){throw "Duplicate '$Key' in $Source"}
    $value=$matches[0].Groups[1].Value.Trim()
    if($value-match'^`([^`]+)`$'){$value=$Matches[1]}
    $value
}
function Read-ImplementationReviewConvergenceState([string]$Text,[string]$Source){
    $values=[ordered]@{}
    foreach($field in @('review_stage','changes_requested_cycles','implementation_review_attempt','implementation_review_profile','implementation_review_terminated')){$values[$field]=Read-Key $Text $field $Source}
    [pscustomobject]$values
}
function Assert-ExistingImplementationReviewPreflight([string]$TaskText,[string]$StateText,[string]$NextText,[string]$HandoffText,[string]$TaskSource,[string]$HandoffSource){
    $sources=[ordered]@{
        $TaskSource=(Read-ImplementationReviewConvergenceState $TaskText $TaskSource)
        'CURRENT_STATE'=(Read-ImplementationReviewConvergenceState $StateText 'CURRENT_STATE')
        'NEXT_ACTION'=(Read-ImplementationReviewConvergenceState $NextText 'NEXT_ACTION')
        $HandoffSource=(Read-ImplementationReviewConvergenceState $HandoffText $HandoffSource)
    }
    $canonical=$sources[$TaskSource]
    foreach($source in $sources.GetEnumerator()){
        foreach($field in @('review_stage','changes_requested_cycles','implementation_review_attempt','implementation_review_profile','implementation_review_terminated')){
            if([string]$source.Value.$field-cne[string]$canonical.$field){throw "implementation review preflight mismatch: $field in $($source.Key)"}
        }
    }
    if([string]$canonical.review_stage-notin@('design','implementation')){throw 'implementation review preflight review_stage is invalid'}
    if([string]$canonical.changes_requested_cycles-notmatch'^[0-3]$'-or[string]$canonical.implementation_review_attempt-notmatch'^[1-3]$'-or[string]$canonical.implementation_review_terminated-notin@('true','false')){throw 'implementation review preflight state contains an invalid scalar'}
    $cycles=[int]$canonical.changes_requested_cycles
    $expectedAttempt=if($cycles-eq0){'1'}elseif($cycles-eq1){'2'}else{'3'}
    $expectedProfile=if($cycles-eq0){'standard'}elseif($cycles-eq1){'narrowed'}else{'terminal'}
    $expectedTerminated=if($cycles-eq3){'true'}else{'false'}
    if([string]$canonical.implementation_review_attempt-cne$expectedAttempt-or[string]$canonical.implementation_review_profile-cne$expectedProfile-or[string]$canonical.implementation_review_terminated-cne$expectedTerminated){throw 'implementation review preflight state combination is invalid'}
    if($cycles-eq3){
        $taskPhase=Read-Key $TaskText 'current_phase' $TaskSource;$nextPhase=Read-Key $NextText 'phase' 'NEXT_ACTION';$taskActor=Read-Key $TaskText 'next_actor' $TaskSource;$nextActor=Read-Key $NextText 'next_actor' 'NEXT_ACTION';$taskRole=Read-Key $TaskText 'next_role' $TaskSource;$nextRole=Read-Key $NextText 'next_role' 'NEXT_ACTION';$taskHandoff=Read-Key $TaskText 'handoff_file' $TaskSource;$nextHandoff=Read-Key $NextText 'handoff_file' 'NEXT_ACTION';$handoffDecision=Read-Key $HandoffText 'decision' $HandoffSource
        $confirmationRequired=Read-Key $NextText 'user_confirmation_required' 'NEXT_ACTION';$confirmationPrompt=Read-Key $NextText 'user_confirmation_prompt' 'NEXT_ACTION'
        if([string]$canonical.review_stage-cne'implementation'-or$taskPhase-cne'user_decision'-or$nextPhase-cne'user_decision'-or$taskActor-cne'ChatGPT'-or$nextActor-cne'ChatGPT'-or$taskRole-cne'ORCHESTRATOR_AND_REVIEWER'-or$nextRole-cne'ORCHESTRATOR_AND_REVIEWER'-or$taskHandoff-cne$nextHandoff-or(Split-Path -Leaf $taskHandoff)-cne'USER_DECISION_HANDOFF.md'-or$handoffDecision-cne'NEEDS_USER_DECISION'-or$confirmationRequired-cne'true'-or$confirmationPrompt-ceq'none'){throw 'implementation review preflight terminated route is invalid'}
    }
    $canonical
}
function Set-Key([string]$Text,[string]$Key,[string]$Value,[string]$Source){$pattern="(?m)^$([regex]::Escape($Key)):\s*.*?$";if(-not[regex]::IsMatch($Text,$pattern)){throw "Missing '$Key' in $Source"};[regex]::Replace($Text,$pattern,"${Key}: $Value",1)}
function Set-OrAdd-Key([string]$Text,[string]$Key,[string]$Value,[string]$Source){$pattern="(?m)^$([regex]::Escape($Key)):\s*.*?$";if([regex]::IsMatch($Text,$pattern)){return [regex]::Replace($Text,$pattern,"${Key}: $Value",1)};$anchor='(?m)^updated_at:\s*.*?$';if(-not[regex]::IsMatch($Text,$anchor)){throw "Missing 'updated_at' in $Source"};[regex]::Replace($Text,$anchor,"${Key}: $Value`n`$0",1)}
function Lines($Items){(@($Items)|ForEach-Object{"- $_"})-join"`n"}
function Get-Identity([string]$Path){[pscustomobject]@{Name=[IO.Path]::GetFileName($Path);Sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash;Bytes=(Get-Item -LiteralPath $Path).Length;Format='JSON'}}
function ConvertTo-CanonicalJsonText($Value){
    $json=ConvertTo-Json -InputObject $Value -Depth 20
    $lf=$json.Replace("`r`n","`n").Replace("`r","`n")
    $lf.TrimEnd([char[]]"`n")+"`n"
}
function Normalize-OptionalCollection($Value){
    if($null-eq$Value){return ,([object[]]@())}
    return ,([object[]]@($Value))
}
function Get-ReviewRequestId($Review){
    $repositoryAccess=([string][bool]$Review.repository_access).ToLowerInvariant()
    $canonical="review_kind=$($Review.kind)`nreviewed_candidate=$($Review.reviewed_candidate)`nreviewed_spec_revision=$($Review.reviewed_spec_revision)`npreferred_executor=$($Review.preferred_executor)`nactual_executor=$($Review.actual_executor)`nprovider_substitution=$($Review.provider_substitution)`nexecutor_policy=$($Review.executor_policy)`nreview_role=$($Review.review_role)`nexecution_mode=$($Review.execution_mode)`nrepository_access=$repositoryAccess`nreview_status=$($Review.review_status)`nmodel=$($Review.model)`neffort=$($Review.effort)`nstarted_at=$($Review.started_at)`n"
    $bytes=[Text.Encoding]::UTF8.GetBytes($canonical);[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)).Replace('-','')
}
function Convert-ResultToRequest($Result){
    [pscustomobject][ordered]@{
        kind=[string]$Result.review_kind
        reviewed_candidate=[string]$Result.reviewed_candidate
        reviewed_spec_revision=[int]$Result.spec_revision
        request_id=[string]$Result.request_id
        preferred_executor=[string]$Result.preferred_executor
        actual_executor=[string]$Result.actual_executor
        provider_substitution=[string]$Result.provider_substitution
        executor_policy=[string]$Result.executor_policy
        review_role=[string]$Result.review_role
        execution_mode=[string]$Result.execution_mode
        repository_access=[bool]$Result.repository_access
        review_status=[string]$Result.request_review_status
        model=[string]$Result.model
        effort=[string]$Result.effort
        started_at=[string]$Result.started_at
    }
}
function Read-StoredReviewRequest([string]$Text,[string]$Source){
    $access=Read-Key $Text 'repository_access' $Source;if($access-notin@('true','false')){throw "invalid repository_access in $Source"}
    [pscustomobject][ordered]@{
        kind=Read-Key $Text 'review_kind' $Source
        reviewed_candidate=Read-Key $Text 'reviewed_candidate' $Source
        reviewed_spec_revision=[int](Read-Key $Text 'reviewed_spec_revision' $Source)
        request_id=Read-Key $Text 'review_request_id' $Source
        preferred_executor=Read-Key $Text 'preferred_executor' $Source
        actual_executor=Read-Key $Text 'actual_executor' $Source
        provider_substitution=Read-Key $Text 'provider_substitution' $Source
        executor_policy=Read-Key $Text 'executor_policy' $Source
        review_role=Read-Key $Text 'review_role' $Source
        execution_mode=Read-Key $Text 'execution_mode' $Source
        repository_access=($access-ceq'true')
        review_status=Read-Key $Text 'request_review_status' $Source
        model=Read-Key $Text 'review_model' $Source
        effort=Read-Key $Text 'review_effort' $Source
        started_at=Read-Key $Text 'review_started_at' $Source
    }
}
function Assert-ReviewRequestEqual($Expected,$Actual,[string]$Source){
    foreach($field in @('kind','reviewed_candidate','reviewed_spec_revision','request_id','preferred_executor','actual_executor','provider_substitution','executor_policy','review_role','execution_mode','repository_access','review_status','model','effort','started_at')){
        if([string]$Expected.$field-cne[string]$Actual.$field){throw "independent review request identity mismatch in $Source`: $field"}
    }
    if([string]$Actual.request_id-cne(Get-ReviewRequestId $Actual)){throw "independent review request_id does not match stored identity in $Source"}
}
function Assert-RelayIdentity($Expected,$Actual,[string]$Source){
    foreach($field in @('schema_version','status','task_id','spec_revision','repository','branch','shared_candidate')){if([string]$Expected.$field-cne[string]$Actual.$field){throw "current canonical relay identity mismatch in $Source`: $field"}}
}
function Json-Scalar($Value){ConvertTo-Json -InputObject $Value -Compress}
function Json-Value($Value){
    if($null-eq$Value){return 'null'}
    if($Value-is[Collections.IDictionary]){
        $names=[string[]]@($Value.Keys|ForEach-Object{[string]$_});[Array]::Sort($names,[StringComparer]::Ordinal)
        return '{'+(($names|ForEach-Object{(Json-Scalar $_)+':'+(Json-Value $Value[$_])})-join',')+'}'
    }
    if($Value.GetType().FullName-ceq'System.Management.Automation.PSCustomObject'){
        $names=[string[]]@($Value.PSObject.Properties|ForEach-Object{$_.Name});[Array]::Sort($names,[StringComparer]::Ordinal)
        return '{'+(($names|ForEach-Object{$property=$Value.PSObject.Properties[$_];(Json-Scalar $_)+':'+(Json-Value $property.Value)})-join',')+'}'
    }
    if($Value-is[Collections.IEnumerable]-and$Value-isnot[string]){return '['+((@($Value)|ForEach-Object{Json-Value $_})-join',')+']'}
    Json-Scalar $Value
}
function Get-GitBlob([string]$Commit,[string]$Relative){
    $blob=(& git -C $root rev-parse "$Commit`:$Relative" 2>$null).Trim()
    if($LASTEXITCODE-ne0-or$blob-notmatch'^[0-9a-f]{40}$'){throw "routing identity blob is missing: $Relative"}
    $blob
}
function Read-GitText([string]$Commit,[string]$Relative){
    $text=& git -C $root show "$Commit`:$Relative" 2>$null
    if($LASTEXITCODE-ne0){throw "routing identity file is missing: $Relative"}
    ($text-join"`n")+"`n"
}
function Test-AssignmentAllowed($Adapter,[string]$Actor,[string]$Role,[string]$Model,[string]$Effort){
    if($Actor-in@('USER','NONE')){return $Model-ceq'none'-and$Effort-ceq'none'}
    $assignment=if($Actor-ceq'ChatGPT'-and$Role-ceq'ORCHESTRATOR_AND_REVIEWER'){'CHATGPT_ORCHESTRATOR'}elseif($Actor-ceq'ChatGPT'-and$Role-ceq'INDEPENDENT_REVIEWER'){'CHATGPT_INDEPENDENT_REVIEWER'}elseif($Actor-ceq'Codex'-and$Role-ceq'IMPLEMENTER'){'CODEX_MAIN'}else{return $false}
    if($Model-ceq'none'-and$Effort-ceq'none'){return $true}
    $modelId=if($Model-match'(?i)(Spark|Luna|Terra|Sol)$'){$Matches[1]}else{$Model}
    $modelId=(Get-Culture).TextInfo.ToTitleCase($modelId.ToLowerInvariant())
    $effortId=if($Effort-ceq'Ultra'){'max'}else{$Effort.ToLowerInvariant()}
    $routeId="$modelId-$effortId";if($policy.Routing.LegacyRouteMap.ContainsKey($routeId)){$routeId=[string]$policy.Routing.LegacyRouteMap[$routeId]}
    $purpose=[string]$policy.Routing.AssignmentPurpose[$assignment]
    return @($policy.Routing.PurposeOrders[$purpose])-ccontains$routeId
}
function Get-Transition([string]$Decision,$Bundle,$Adapter){
    if($Decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
        $review=$Bundle.independent_review
        $phase=if([string]$review.kind-ceq'design'){'design_review'}else{'implementation_review'}
        return @{Status='review_requested';Phase=$phase;Actor=[string]$review.actual_executor;Role='INDEPENDENT_REVIEWER';Handoff='INDEPENDENT_REVIEW_HANDOFF.md';ReturnTo='ChatGPT'}
    }
    if($Decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){
        $kind=[string]$Bundle.independent_review_result.review_kind;$phase=if($kind-ceq'design'){'design_review'}else{'implementation_review'}
        return @{Status='review_completed';Phase=$phase;Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER';Handoff='INDEPENDENT_REVIEW_RESULT_HANDOFF.md';ReturnTo='ChatGPT'}
    }
    $stage=[string]$Bundle.review_stage
    if($Decision-ceq'APPROVED'){
        if($stage-ceq'design'){return @{Status='ready';Phase='implementation';Actor='Codex';Role='IMPLEMENTER';Handoff='DESIGN_APPROVED_HANDOFF.md';ReturnTo='ChatGPT'}}
        return @{Status='approved';Phase='release';Actor='Codex';Role='IMPLEMENTER';Handoff='RELEASE_HANDOFF.md';ReturnTo='ChatGPT'}
    }
    if($Decision-ceq'CHANGES_REQUESTED'){
        if($stage-ceq'design'){return @{Status='changes_requested';Phase='design';Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER';Handoff='DESIGN_REVISION_HANDOFF.md';ReturnTo='ChatGPT'}}
        return @{Status='changes_requested';Phase='implementation';Actor='Codex';Role='IMPLEMENTER';Handoff='RELAY_HANDOFF.md';ReturnTo='ChatGPT'}
    }
    $table=@{
        BLOCKED=@{Status='blocked';Phase='blocked';Actor='dynamic';Role='dynamic';Handoff='BLOCKED_HANDOFF.md';ReturnTo='dynamic'}
        NEEDS_USER_DECISION=@{Status='needs_user_decision';Phase='user_decision';Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER';Handoff='USER_DECISION_HANDOFF.md';ReturnTo='ChatGPT'}
        REQUIREMENTS_DEFINED=@{Status='ready';Phase='implementation';Actor='Codex';Role='IMPLEMENTER';Handoff='CODEX_HANDOFF.md';ReturnTo='ChatGPT'}
    }
    if(-not$table.ContainsKey($Decision)){throw "relay bundle decision is unsupported: $Decision"}
    $table[$Decision]
}
function Resolve-CandidateField($Bundle,$Adapter){
    $mapping=$policy.Relay.CandidateIdentity
    if([string]$Bundle.decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
        $field=[string]$mapping.IndependentReviewKinds[[string]$Bundle.independent_review.kind]
    }elseif([string]$Bundle.decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){
        $field=[string]$mapping.IndependentReviewKinds[[string]$Bundle.independent_review_result.review_kind]
    }else{
        $decisionMapping=$mapping.Decisions[[string]$Bundle.decision]
        $field=if($decisionMapping-is[Collections.IDictionary]){[string]$decisionMapping[[string]$Bundle.review_stage]}else{[string]$decisionMapping}
    }
    if([string]::IsNullOrWhiteSpace($field)){throw "project adapter candidate field is missing for decision: $($Bundle.decision)"}
    $field
}
function Validate-SpecRevisionReset($Reset,[int]$TargetRevision){
    if($null-eq$Reset){throw 'spec revision reset object is required'}
    foreach($name in @('approved','approved_by','from_revision','to_revision','approval_id','approved_at')){
        if($null-eq$Reset.PSObject.Properties[$name]){throw "spec revision reset field is missing: $name"}
    }
    Require-Bool $Reset.approved 'spec_revision_reset.approved'
    Require-NonNegativeInteger $Reset.from_revision 'spec_revision_reset.from_revision'
    Require-NonNegativeInteger $Reset.to_revision 'spec_revision_reset.to_revision'
    Require-SingleLine $Reset.approved_by 'spec_revision_reset.approved_by'
    Require-SingleLine $Reset.approval_id 'spec_revision_reset.approval_id'
    Require-SingleLine $Reset.approved_at 'spec_revision_reset.approved_at'
    if(-not[bool]$Reset.approved-or[string]$Reset.approved_by-cne'USER'){throw 'spec revision reset requires explicit USER approval'}
    if([int]$Reset.to_revision-ne$TargetRevision-or[int]$Reset.from_revision-ge[int]$Reset.to_revision){throw 'spec revision reset revision range is invalid'}
    if([string]$Reset.approved_at-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){throw 'spec revision reset approval timestamp is invalid'}
}
function Validate-Bundle($Bundle,$Adapter,$FindingDispositions){
    if([int]$Bundle.schema_version-ne2){throw 'relay bundle schema_version must be 2'}
    if([string]$Bundle.status-cne'USER_RELAY_REQUIRED'){throw 'relay bundle status must be USER_RELAY_REQUIRED'}
    foreach($name in @('task_id','repository','branch','relay_recipient','relay_recipient_role','result_return_to','decision','next_phase','next_actor','next_role','model','effort','purpose','created_at')){Require-SingleLine $Bundle.$name $name}
    if([string]$Bundle.task_id-notmatch'^TASK-[0-9]+$'){throw 'relay bundle task_id is invalid'}
    if([int]$Bundle.spec_revision-lt1){throw 'relay bundle spec_revision is invalid'}
    $specRevisionResetProperty=$Bundle.PSObject.Properties['spec_revision_reset']
    if($null-ne$specRevisionResetProperty-and$null-ne$Bundle.spec_revision_reset){Validate-SpecRevisionReset $Bundle.spec_revision_reset ([int]$Bundle.spec_revision)}
    if([string]$Bundle.repository-notmatch'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'){throw 'relay bundle repository is invalid'}
    if([string]$Bundle.relay_recipient-cne'Codex'){throw 'relay_recipient must be Codex'}
    if([string]$Bundle.relay_recipient_role-cne'IMPLEMENTER'){throw 'relay_recipient_role must be IMPLEMENTER'}
    if([string]$Bundle.result_return_to-notin@('ChatGPT','Codex','Claude','USER')){throw 'result_return_to is invalid'}
    if([string]$Bundle.created_at-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){throw 'relay bundle created_at is invalid'}
    Require-List $Bundle.scope 'scope';Require-List $Bundle.out_of_scope 'out_of_scope';Require-List $Bundle.acceptance_criteria 'acceptance_criteria';Require-List $Bundle.tests 'tests';Require-List $Bundle.forbidden_changes 'forbidden_changes'
    $routingModeProperty=$Bundle.PSObject.Properties['routing_mode'];$routeResultProperty=$Bundle.PSObject.Properties['route_result']
    if($null-ne$routingModeProperty-or$null-ne$routeResultProperty){
        Require-SingleLine $Bundle.routing_mode 'routing_mode';if([string]$Bundle.routing_mode-notin@('local_script','connector_read_only')){throw 'relay bundle routing_mode is invalid'}
        if($null-eq$routeResultProperty-or$null-eq$Bundle.route_result){throw 'relay bundle route_result is required when routing_mode is present'}
        $routeResult=$Bundle.route_result
        foreach($name in @('repository','requested_ref','resolved_commit','next_action_blob','handoff_blob','adapter_blob')){Require-SingleLine $routeResult.$name "route_result.$name"}
        if([string]$routeResult.repository-cne[string]$Bundle.repository){throw 'route_result repository mismatch'}
        $requestedRef=[string]$routeResult.requested_ref
        if($requestedRef-notmatch'^refs/(heads|tags)/'){throw 'route_result requested_ref must be a full branch or tag ref'}
        & git -C $root check-ref-format $requestedRef|Out-Null;if($LASTEXITCODE-ne0){throw 'route_result requested_ref is invalid'}
        if($requestedRef.StartsWith('refs/heads/',[StringComparison]::Ordinal)-and$requestedRef-cne"refs/heads/$($Bundle.branch)"){throw 'route_result branch ref mismatch'}
        foreach($name in @('resolved_commit','next_action_blob','handoff_blob','adapter_blob')){if([string]$routeResult.$name-notmatch'^[0-9a-f]{40}$'){throw "route_result.$name is invalid"}}
    }
    $decision=[string]$Bundle.decision;$requestPresent=$null-ne$Bundle.independent_review;$resultPresent=$null-ne$Bundle.independent_review_result;$requirementsPresent=$null-ne$Bundle.requirements
    if($decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
        if(-not$requestPresent-or$resultPresent-or$requirementsPresent){throw 'INDEPENDENT_REVIEW_REQUESTED requires request object and forbids result/requirements objects'}
    }elseif($decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){
        if($requestPresent-or-not$resultPresent-or$requirementsPresent){throw 'INDEPENDENT_REVIEW_COMPLETED requires result object and forbids request/requirements objects'}
    }elseif($decision-ceq'REQUIREMENTS_DEFINED'){
        if($requestPresent-or$resultPresent-or-not$requirementsPresent){throw 'REQUIREMENTS_DEFINED requires requirements object and forbids review objects'}
    }elseif($decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
        if($requestPresent-or$requirementsPresent){throw "$decision forbids independent_review and requirements objects"}
    }
    if([string]$Bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
        Require-SingleLine $Bundle.review_stage 'review_stage';if([string]$Bundle.review_stage-notin@('design','implementation')){throw 'review_stage is invalid'}
    }
    if([string]$Bundle.decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
        $review=$Bundle.independent_review;if($null-eq$review){throw 'INDEPENDENT_REVIEW_REQUESTED requires independent_review object'}
        foreach($name in @('kind','reviewed_candidate','request_id','preferred_executor','actual_executor','provider_substitution','executor_policy','review_role','execution_mode','review_status','model','effort','started_at')){Require-SingleLine $review.$name "independent_review.$name"}
        Require-NonNegativeInteger $review.reviewed_spec_revision 'independent_review.reviewed_spec_revision'
        Require-Bool $review.repository_access 'independent_review.repository_access'
        $reviewConfig=$policy.IndependentReview;if($null-eq$reviewConfig){throw 'global independent review configuration is missing'}
        if(@($reviewConfig.AllowedKinds)-cnotcontains[string]$review.kind){throw 'independent_review.kind is invalid'}
        if([string]$review.reviewed_candidate-cne[string]$Bundle.reviewed_candidate-or[int]$review.reviewed_spec_revision-ne[int]$Bundle.spec_revision){throw 'independent review request identity mismatch'}
        if([string]$review.model-cne[string]$Bundle.model-or[string]$review.effort-cne[string]$Bundle.effort){throw 'independent review request model/effort mismatch'}
        if([string]$review.request_id-notmatch'^[A-F0-9]{64}$'-or[string]$review.request_id-cne(Get-ReviewRequestId $review)){throw 'independent review request_id mismatch'}
        if([string]$review.preferred_executor-cne[string]$reviewConfig.ActiveExecutor-or[string]$review.actual_executor-cne[string]$reviewConfig.ActiveExecutor){throw 'independent_review executor mismatch'}
        if([string]$review.executor_policy-cne[string]$reviewConfig.ExecutorPolicy){throw 'independent_review executor policy is invalid'}
        if([string]$review.review_role-cne[string]$reviewConfig.Role){throw 'independent_review review_role mismatch'}
        if([string]$review.review_status-cne'requested'){throw 'independent_review review_status must be requested'}
        if([string]$review.started_at-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){throw 'independent_review.started_at is invalid'}
        if([string]$review.execution_mode-cne[string]$reviewConfig.ExecutionMode){throw 'independent_review execution_mode mismatch'}
        if(-not[bool]$review.repository_access){throw 'independent_review repository_access must be true'}
        if([string]$review.provider_substitution-cne[string]$reviewConfig.ProviderSubstitution-or[string]$review.model-cne[string]$reviewConfig.Model-or@($reviewConfig.AllowedEfforts)-cnotcontains[string]$review.effort){throw 'independent review route/substitution is invalid'}
    }
    if([string]$Bundle.decision-ceq'INDEPENDENT_REVIEW_COMPLETED'-or$null-ne$Bundle.independent_review_result){
        $result=$Bundle.independent_review_result;if($null-eq$result){throw 'INDEPENDENT_REVIEW_COMPLETED requires independent_review_result object'}
        foreach($name in @('review_kind','reviewed_candidate','request_id','preferred_executor','actual_executor','execution_mode','provider_substitution','executor_policy','review_role','request_review_status','model','effort','started_at','completed_at','result','review_status','finding_ids')){Require-SingleLine $result.$name "independent_review_result.$name"}
        Require-NonNegativeInteger $result.spec_revision 'independent_review_result.spec_revision';Require-NonNegativeInteger $result.findings_count 'independent_review_result.findings_count'
        Require-Bool $result.repository_access 'independent_review_result.repository_access'
        if([int]$result.spec_revision-ne[int]$Bundle.spec_revision){throw 'independent review result spec_revision mismatch'}
        if([string]$result.reviewed_candidate-cne[string]$Bundle.reviewed_candidate){throw 'independent review result candidate mismatch'}
        if([string]$result.review_status-cne'completed'){throw 'independent review result review_status must be completed'}
        if([string]$result.request_review_status-cne'requested'){throw 'independent review result request_review_status must be requested'}
        if([string]$result.review_role-cne'INDEPENDENT_REVIEWER'){throw 'independent review result review_role must be INDEPENDENT_REVIEWER'}
        $resultRequest=Convert-ResultToRequest $result
        if([string]$result.request_id-notmatch'^[A-F0-9]{64}$'-or[string]$result.request_id-cne(Get-ReviewRequestId $resultRequest)){throw 'independent review result request_id mismatch'}
        if([string]$result.executor_policy-cne[string]$policy.IndependentReview.ExecutorPolicy){throw 'independent review result executor_policy is invalid'}
        if([string]$result.result-notin@('NO_BLOCKING_FINDINGS','CHANGES_RECOMMENDED','BLOCKED','FAILED')){throw 'independent review result is invalid'}
        if([string]$result.started_at-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'-or[string]$result.completed_at-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){throw 'independent review result timestamp is invalid'}
        if([string]$result.started_at-cgt[string]$result.completed_at){throw 'independent review result completed_at precedes started_at'}
        if([int]$result.findings_count-ne@($Bundle.findings).Count){throw 'independent review result findings_count mismatch'}
        $expectedIds=(@($Bundle.findings|ForEach-Object{[string]$_.id})-join',');if([string]::IsNullOrWhiteSpace($expectedIds)){$expectedIds='none'};if([string]$result.finding_ids-cne$expectedIds){throw 'independent review result finding_ids mismatch'}
        $reviewConfig=$policy.IndependentReview
        if(@($reviewConfig.AllowedKinds)-cnotcontains[string]$result.review_kind){throw 'independent review result review_kind is invalid'}
        if([string]$result.preferred_executor-cne[string]$reviewConfig.ActiveExecutor-or[string]$result.actual_executor-cne[string]$reviewConfig.ActiveExecutor){throw 'independent review result executor mismatch'}
        if([string]$result.executor_policy-cne[string]$reviewConfig.ExecutorPolicy-or[string]$result.provider_substitution-cne[string]$reviewConfig.ProviderSubstitution){throw 'independent review result policy/substitution is invalid'}
        if([string]$result.execution_mode-cne[string]$reviewConfig.ExecutionMode-or-not[bool]$result.repository_access-or[string]$result.model-cne[string]$reviewConfig.Model-or@($reviewConfig.AllowedEfforts)-cnotcontains[string]$result.effort){throw 'independent review result execution context is invalid'}
    }
    $transition=Get-Transition ([string]$Bundle.decision) $Bundle $Adapter
    if([string]$Bundle.next_phase-cne$transition.Phase){throw "decision/phase mismatch: $($Bundle.decision)/$($Bundle.next_phase)"}
    if($transition.Actor-cne'dynamic'-and([string]$Bundle.next_actor-cne$transition.Actor-or[string]$Bundle.next_role-cne$transition.Role)){throw "decision actor/role mismatch: $($Bundle.decision)"}
    if($transition.ReturnTo-cne'dynamic'-and[string]$Bundle.result_return_to-cne$transition.ReturnTo){throw "decision result_return_to mismatch: $($Bundle.decision)"}
    $phaseIds=@($policy.Lifecycle.InternalPhases+@($Adapter.PhaseExtensions|ForEach-Object{[string]$_.Id}))
    if($phaseIds-cnotcontains[string]$Bundle.next_phase){throw "unknown relay phase: $($Bundle.next_phase)"}
    $assignment="$($Bundle.next_actor)|$($Bundle.next_role)|$($Bundle.model)|$($Bundle.effort)"
    if(-not(Test-AssignmentAllowed $Adapter ([string]$Bundle.next_actor) ([string]$Bundle.next_role) ([string]$Bundle.model) ([string]$Bundle.effort))){throw "invalid relay model/effort assignment: $assignment"}
    if($null-eq$Bundle.findings){throw 'relay bundle findings must be an array'}
    foreach($finding in @($Bundle.findings)){
        foreach($name in @('id','severity','target','problem','evidence','impact','required_change')){Require-Text $finding.$name "findings.$name"}
        if(-not(Test-FindingId ([string]$finding.id))){throw "invalid finding id: $($finding.id)"}
        if([string]$finding.severity-notin@('BLOCKER','MAJOR','MINOR','QUESTION')){throw "invalid finding severity: $($finding.severity)"}
    }
    $findingIds=@($Bundle.findings|ForEach-Object{[string]$_.id});if(@($findingIds|Select-Object -Unique).Count-ne$findingIds.Count){throw 'relay bundle finding ids must be unique'}
    $formalDecision=[string]$Bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')
    $postReviewDecision=$formalDecision-and$null-ne$Bundle.independent_review_result
    $dispositionProperty=$Bundle.PSObject.Properties['finding_dispositions']
    if($postReviewDecision){
        if($null-eq$dispositionProperty-or$null-eq$Bundle.finding_dispositions){throw 'post-review decision requires finding_dispositions array'}
        $dispositions=$FindingDispositions
        if($dispositions.Count-ne$findingIds.Count){throw 'finding disposition count must match original findings'}
        $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach($disposition in $dispositions){
            foreach($name in @('finding_id','status','reason')){Require-Text $disposition.$name "finding_dispositions.$name"}
            $id=[string]$disposition.finding_id;if(-not$seen.Add($id)){throw "duplicate finding disposition: $id"}
            if($findingIds-cnotcontains$id){throw "unknown finding disposition id: $id"}
            if([string]$disposition.status-notin@('accepted','rejected','deferred','needs_user_decision')){throw "invalid finding disposition status: $($disposition.status)"}
        }
        foreach($id in $findingIds){if(-not$seen.Contains($id)){throw "missing finding disposition: $id"}}
        $accepted=@($dispositions|Where-Object{[string]$_.status-ceq'accepted'});$needsUser=@($dispositions|Where-Object{[string]$_.status-ceq'needs_user_decision'})
        if([string]$Bundle.decision-ceq'APPROVED'-and($accepted.Count-ne0-or$needsUser.Count-ne0)){throw 'APPROVED forbids accepted and needs_user_decision dispositions'}
        if([string]$Bundle.decision-ceq'CHANGES_REQUESTED'-and($accepted.Count-eq0-or$needsUser.Count-ne0)){throw 'CHANGES_REQUESTED requires accepted dispositions and forbids needs_user_decision'}
        if([string]$Bundle.decision-ceq'BLOCKED'){
            if($needsUser.Count-ne0){throw 'BLOCKED forbids needs_user_decision dispositions'}
            $acceptedBlockers=@($accepted|Where-Object{$acceptedId=[string]$_.finding_id;@($Bundle.findings|Where-Object{[string]$_.id-ceq$acceptedId-and[string]$_.severity-ceq'BLOCKER'}).Count-eq1})
            if($acceptedBlockers.Count-eq0){throw 'BLOCKED requires an accepted BLOCKER finding'}
        }
        if([string]$Bundle.decision-ceq'NEEDS_USER_DECISION'-and($needsUser.Count-eq0-or$accepted.Count-ne0)){throw 'NEEDS_USER_DECISION requires needs_user_decision dispositions and forbids accepted'}
    }elseif($null-ne$dispositionProperty-and$null-ne$Bundle.finding_dispositions){throw 'finding_dispositions are only allowed for post-review formal decisions'}
    if($null-ne$Bundle.independent_review_result){
        $result=$Bundle.independent_review_result;$blockers=@($Bundle.findings|Where-Object{[string]$_.severity-ceq'BLOCKER'}).Count;$blocking=@($Bundle.findings|Where-Object{[string]$_.severity-in@('BLOCKER','MAJOR')}).Count
        if([string]$result.result-ceq'NO_BLOCKING_FINDINGS'-and$blocking-ne0){throw 'NO_BLOCKING_FINDINGS cannot contain BLOCKER or MAJOR findings'}
        if([string]$result.result-ceq'CHANGES_RECOMMENDED'-and@($Bundle.findings).Count-eq0){throw 'CHANGES_RECOMMENDED requires at least one finding'}
        if([string]$result.result-in@('BLOCKED','FAILED')-and$blockers-eq0){throw "$($result.result) requires at least one BLOCKER finding"}
    }
    if([string]$Bundle.decision-in@('CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')-and@($Bundle.findings).Count-eq0){throw "$($Bundle.decision) relay bundle requires complete findings"}
    Require-CommitOrNone $Bundle.shared_candidate 'shared_candidate';if([string]$Bundle.shared_candidate-ceq'none'){throw 'shared_candidate requires an exact commit'}
    if([string]$Bundle.decision-cne'REQUIREMENTS_DEFINED'){
        foreach($name in @('reviewed_candidate','reviewed_handoff_head')){Require-CommitOrNone $Bundle.$name $name;if([string]$Bundle.$name-ceq'none'){throw "$name requires an exact commit"}}
    }else{
        foreach($name in @('reviewed_candidate','reviewed_handoff_head')){Require-CommitOrNone $Bundle.$name $name}
        $requirements=$Bundle.requirements;if($null-eq$requirements){throw 'REQUIREMENTS_DEFINED requires requirements object'}
        foreach($name in @('title','priority','base_commit','base_tree','accepted_product_identity_reference','claude_design_review_recommendation','claude_implementation_review_recommendation','claude_design_review_status','claude_implementation_review_status','preferred_executor','allowed_executors','executor_policy','rollback','handoff_mode')){Require-SingleLine $requirements.$name "requirements.$name"}
        foreach($name in @('base_commit','base_tree')){if([string]$requirements.$name-notmatch'^[0-9a-f]{40}$'){throw "requirements.$name must be an exact commit"}}
        if(@($policy.Relay.Requirements.Priorities)-cnotcontains[string]$requirements.priority){throw 'requirements.priority is invalid'}
        if([bool]$Adapter.Relay.Requirements.RequireProductIdentityReference-and[string]$requirements.accepted_product_identity_reference-ceq'none'){throw 'requirements accepted product identity reference is required'}
        if(@($Adapter.Relay.Requirements.ProductIdentityReferences)-cnotcontains[string]$requirements.accepted_product_identity_reference){throw 'requirements accepted product identity reference is not allowed by project adapter'}
        Require-Bool $requirements.browser_evidence_required 'requirements.browser_evidence_required';Require-Bool $requirements.claude_design_review_required 'requirements.claude_design_review_required';Require-Bool $requirements.claude_implementation_review_required 'requirements.claude_implementation_review_required'
        foreach($name in @('claude_design_review_recommendation','claude_implementation_review_recommendation')){if([string]$requirements.$name-notin@('not_needed','optional','recommended','strongly_recommended')){throw "requirements.$name is invalid"}}
        foreach($name in @('claude_design_review_status','claude_implementation_review_status')){if([string]$requirements.$name-notin@('not_requested','completed','skipped_quota','declined','not_applicable')){throw "requirements.$name is invalid"}}
        if([string]$requirements.executor_policy-cne[string]$policy.IndependentReview.ExecutorPolicy){throw 'requirements.executor_policy is invalid'}
        if([string]$requirements.handoff_mode-notin@('existing','new')){throw 'requirements.handoff_mode is invalid'}
        $allowedExecutorValues=@($policy.Relay.Requirements.Executors);if($allowedExecutorValues-cnotcontains[string]$requirements.preferred_executor){throw 'requirements.preferred_executor is invalid'}
        if([string]$requirements.preferred_executor-cne[string]$policy.IndependentReview.ActiveExecutor){throw 'requirements.preferred_executor does not match global policy'}
        $selectedExecutors=@(([string]$requirements.allowed_executors)-split','|ForEach-Object{$_.Trim()}|Where-Object{$_})
        if($selectedExecutors.Count-eq0-or@($selectedExecutors|Where-Object{$allowedExecutorValues-cnotcontains$_}).Count-ne0-or@($selectedExecutors|Select-Object -Unique).Count-ne$selectedExecutors.Count){throw 'requirements.allowed_executors is invalid'}
        $expectedExecutors=@([string]$policy.IndependentReview.ActiveExecutor)
        if(@($selectedExecutors|Where-Object{$expectedExecutors-cnotcontains$_}).Count-ne0-or@($expectedExecutors|Where-Object{$selectedExecutors-cnotcontains$_}).Count-ne0){throw 'requirements.allowed_executors does not match executor_policy'}
        $metadata=$requirements.project_metadata
        foreach($spec in @($Adapter.Relay.Requirements.TaskMetadata)){
            Require-SingleLine $spec.Field 'adapter task metadata field';Require-SingleLine $spec.Source 'adapter task metadata source'
            $property=if($null-ne$metadata){$metadata.PSObject.Properties[[string]$spec.Source]}else{$null};if($null-eq$property){throw "requirements.project_metadata is missing: $($spec.Source)"}
            $value=$property.Value;Require-SingleLine $value "requirements.project_metadata.$($spec.Source)"
            if([string]$spec.Type-ceq'boolean' -and $value.GetType()-ne[bool]){throw "requirements.project_metadata.$($spec.Source) must be boolean"}
            if([string]$spec.Type-ceq'enum' -and @($spec.Allowed)-cnotcontains[string]$value){throw "requirements.project_metadata.$($spec.Source) is invalid"}
        }
        Require-List $requirements.build 'requirements.build'
    }
    $transition
}
function Get-ActionableFindings($Bundle,$FindingDispositions){
    $dispositionProperty=$Bundle.PSObject.Properties['finding_dispositions']
    if($null-eq$dispositionProperty-or$null-eq$Bundle.finding_dispositions){return @($Bundle.findings)}
    $actionableIds=@($FindingDispositions|Where-Object{[string]$_.status-in@('accepted','needs_user_decision')}|ForEach-Object{[string]$_.finding_id})
    return @($Bundle.findings|Where-Object{$actionableIds-ccontains[string]$_.id})
}
function Read-OpenImplementationFindingIds([string]$TaskText){
    $matches=[regex]::Matches($TaskText,'(?m)^implementation_review_open_finding_ids:\s*(.*?)\s*$')
    if($matches.Count-eq0){return @()}
    if($matches.Count-ne1){throw 'TASK implementation review open finding registry is duplicated'}
    $raw=$matches[0].Groups[1].Value.Trim();if([string]::IsNullOrWhiteSpace($raw)-or$raw-ceq'none'){return @()}
    $ids=@($raw-split','|ForEach-Object{$_.Trim()}|Where-Object{$_})
    $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach($id in $ids){if(-not(Test-FindingId $id)-or-not$seen.Add($id)){throw 'TASK implementation review open finding registry is invalid'}}
    return $ids
}
function Read-HandoffFindingIds([string]$HandoffText,[string]$SectionTitle,[string]$Source){
    $pattern='(?ms)^## +{0}\s*\r?\n(?<body>.*?)(?=^##\s+\S|\z)' -f [regex]::Escape($SectionTitle)
    $match=[regex]::Match($HandoffText,$pattern)
    if(-not$match.Success){return @()}
    $ids=[Collections.Generic.List[string]]::new()
    foreach($line in ([regex]::Split($match.Groups['body'].Value,'\r?\n'))){
        if($line -match '^\s*-\s*(?:none|not_applicable)\s*$'){continue}
        if($line -match '^\s*-\s*(?<id>\S+)\s+\[(?<severity>[^\]]+)\].*$'){$id=[string]$Matches['id'];$severity=[string]$Matches['severity'];if(-not(Test-FindingId $id)-or$severity-notin@('BLOCKER','MAJOR','MINOR','QUESTION')){throw "$Source $SectionTitle contains an invalid finding line"};if($ids.Contains($id)){throw "$Source $SectionTitle contains duplicate finding id: $id"};$ids.Add($id);continue}
        if(-not[string]::IsNullOrWhiteSpace($line)){throw "$Source $SectionTitle contains an invalid finding line"}
    }
    @($ids)
}
function Validate-ImplementationReviewFindingScope($Bundle,[int]$CurrentCycles,$FindingDispositions,[bool]$Reset,[string[]]$OpenFindingIds,[string[]]$AcceptedPriorFindingIds,[string[]]$DispositionFindingIds){
    if([string]$Bundle.decision-notin@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')-or[string]$Bundle.review_stage-cne'implementation'){return}
    $reviewCycles=if($Reset){0}else{$CurrentCycles}
    if($reviewCycles-ge3){throw 'implementation review terminated; no fourth implementation review is permitted'}
    $actionable=Get-ActionableFindings $Bundle $FindingDispositions
    if($reviewCycles-le1-and$actionable.Count-gt[int]$policy.Lifecycle.StandardActionableFindingLimit){throw 'implementation review exceeds the POLICY actionable finding limit'}
    if($reviewCycles-ge1){
        $allowedNarrowed=@($policy.Lifecycle.NarrowedReviewScopes)
        $allowedTerminal=@($policy.Lifecycle.TerminalReviewScopes)
        foreach($finding in @($actionable)){
            $priorProperty=$finding.PSObject.Properties['prior_finding_id'];$prior=if($null-ne$priorProperty){[string]$priorProperty.Value}else{''}
            if(-not[string]::IsNullOrWhiteSpace($prior)){
                if(-not(Test-FindingId $prior)-or$AcceptedPriorFindingIds-cnotcontains$prior-or($DispositionFindingIds-ccontains$prior-and$AcceptedPriorFindingIds-cnotcontains$prior)-or$OpenFindingIds-cnotcontains$prior){throw "prior_finding_id does not exactly match an accepted unresolved finding: $($finding.id)"}
            }
            $scopeProperty=$finding.PSObject.Properties['review_scope'];$scope=if($null-ne$scopeProperty){[string]$scopeProperty.Value}else{''}
            $allowed=if($reviewCycles-eq1){$allowedNarrowed}else{$allowedTerminal}
            if($allowed-cnotcontains$scope){throw "implementation review scope is not allowed on attempt $([int]$reviewCycles+1): $($finding.id)"}
            if($scope-ceq'accepted_prior_finding' -and ([string]::IsNullOrWhiteSpace($prior) -or $OpenFindingIds-cnotcontains$prior)){throw "accepted prior finding must be an exact open finding: $($finding.id)"}
            if($scope-ceq'new_regression' -and [string]::IsNullOrWhiteSpace($prior)){ }
            if($reviewCycles-eq2 -and [string]$finding.severity-notin@($policy.Lifecycle.TerminalReviewSeverities)){throw "terminal implementation review rejects non-blocking finding: $($finding.id)"}
            if($reviewCycles-eq1 -and $scope-ne'accepted_prior_finding' -and [string]$finding.severity-notin@($policy.Lifecycle.TerminalReviewSeverities)){throw "narrowed implementation review rejects new non-blocking finding: $($finding.id)"}
        }
    }
}
function Resolve-ProductIdentity([string]$Reference,$Adapter){
    if($Reference-ceq'none'){return [pscustomobject]@{Reference='none';Sha256='none'}}
    if(@($Adapter.Relay.Requirements.ProductIdentityReferences)-cnotcontains$Reference){throw 'accepted product identity reference is not allowed by project adapter'}
    $parts=$Reference-split'#',2;if($parts.Count-ne2-or$parts[1]-notmatch'^(.+?)\*$'){throw 'accepted product identity reference is invalid'}
    $source=$parts[0];$prefix=$matches[1];if([IO.Path]::IsPathRooted($source)){throw 'accepted product identity source must be repository-relative'}
    $sourcePath=[IO.Path]::GetFullPath((Project-Path $source));$rootPrefix=$root.TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar
    if(-not$sourcePath.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'accepted product identity source escapes project root'}
    $text=[IO.File]::ReadAllText($sourcePath);$sha=Read-Key $text ($prefix+'sha256') $source
    if($sha-notmatch'^[A-F0-9]{64}$'){throw 'accepted product identity reference has invalid SHA-256'}
    [pscustomobject]@{Reference=$Reference;Sha256=$sha}
}
function Get-TaskMetadataLines($Requirements,$Adapter){
    $lines=[Collections.Generic.List[string]]::new();$metadata=$Requirements.project_metadata
    foreach($spec in @($Adapter.Relay.Requirements.TaskMetadata)){$value=$metadata.PSObject.Properties[[string]$spec.Source].Value;if($value.GetType()-eq[bool]){$value=([string]$value).ToLowerInvariant()};$lines.Add("$($spec.Field): $value")}
    if($lines.Count-eq0){return ''};return (($lines-join"`n")+"`n")
}
function Invoke-ProjectScript([string]$Relative,[string[]]$Arguments=@()){
    & $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Project-Path $Relative) @Arguments
    if($LASTEXITCODE-ne0){throw "project script failed: $Relative"}
}
function Get-OverlayFailures($Adapter){
    $relative=[string]$Adapter.ProjectOverlayValidator;if([string]::IsNullOrWhiteSpace($relative)-or$relative-ceq'none'){return @()}
    $previousPreference=$ErrorActionPreference;$ErrorActionPreference='Continue'
    try{$output=& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Project-Path $relative) 2>&1;$exitCode=$LASTEXITCODE}finally{$ErrorActionPreference=$previousPreference}
    $text=($output-join"`n")
    $pattern=[string]$policy.Relay.OverlayFailurePattern;if([string]::IsNullOrWhiteSpace($pattern)){throw 'global relay overlay failure pattern is missing'}
    $failures=@([regex]::Matches($text,$pattern)|ForEach-Object{if($_.Groups.Count-gt1){$_.Groups[1].Value.Trim()}else{$_.Value.Trim()}}|Sort-Object -Unique)
    if($exitCode-ne0-and$failures.Count-eq0){throw "project overlay failed without comparable failure identity: $relative"}
    return @($failures)
}

$inputPath=[IO.Path]::GetFullPath($BundlePath)
if(-not(Test-Path -LiteralPath $inputPath -PathType Leaf)){throw "relay bundle missing: $inputPath"}
$adapterPath=Project-Path 'docs/ai/PROJECT_ADAPTER.psd1'
if(-not(Test-Path -LiteralPath $adapterPath -PathType Leaf)){throw 'project adapter is missing'}
$adapter=Import-AdapterFile -Path $adapterPath -ExpectedBom absent
if([int]$adapter.SchemaVersion-ne[int]$policy.ProjectAdapter.SchemaVersion-or-not$adapter.Relay-or[string]::IsNullOrWhiteSpace([string]$adapter.Relay.Repository)-or$null-eq$adapter.Relay.Requirements){throw 'project adapter relay configuration is incomplete'}
$bundle=([IO.File]::ReadAllText($inputPath)|ConvertFrom-Json)
$findingDispositions=Normalize-OptionalCollection $bundle.finding_dispositions
$transition=Validate-Bundle $bundle $adapter $findingDispositions
$currentTaskPath=Project-Path "docs/ai/tasks/$([string]$bundle.task_id).md"
$currentReviewStatus='not_requested'
if(Test-Path -LiteralPath $currentTaskPath -PathType Leaf){
    $currentTaskText=[IO.File]::ReadAllText($currentTaskPath);$currentReviewStatusMatch=[regex]::Match($currentTaskText,'(?m)^review_status:\s*(.*?)\s*$')
    if($currentReviewStatusMatch.Success){$currentReviewStatus=$currentReviewStatusMatch.Groups[1].Value.Trim()}
}
if([string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
    if($currentReviewStatus-ceq'completed'-and$null-eq$bundle.independent_review_result){throw 'decision after completed independent review requires independent_review_result audit'}
    if($currentReviewStatus-cne'completed'-and$null-ne$bundle.independent_review_result){throw 'decision without completed independent review forbids independent_review_result'}
}
$normalized=ConvertTo-CanonicalJsonText $bundle
$normalizedBytes=$utf8NoBom.GetBytes($normalized)

if($Action-eq'New'){
    if([string]::IsNullOrWhiteSpace($OutputPath)){throw 'OutputPath is required for New'}
    $out=[IO.Path]::GetFullPath($OutputPath);[IO.Directory]::CreateDirectory((Split-Path -Parent $out))|Out-Null;[IO.File]::WriteAllBytes($out,$normalizedBytes);$readback=[IO.File]::ReadAllBytes($out);if([Convert]::ToBase64String($readback)-cne[Convert]::ToBase64String($normalizedBytes)){throw 'canonical relay bundle byte readback mismatch'};$written=Get-Identity $out;$written|ConvertTo-Json -Compress;return
}

$identity=Get-Identity $inputPath
if($ExpectedSha256-notmatch'^[A-Fa-f0-9]{64}$'-or$identity.Sha256-cne$ExpectedSha256.ToUpperInvariant()){throw 'relay bundle SHA-256 mismatch'}
if($ExpectedBytes-le0-or$identity.Bytes-ne$ExpectedBytes){throw 'relay bundle bytes mismatch'}
if($Action-eq'Validate'){$identity|ConvertTo-Json -Compress;return}

# Import preflight: no repository file is changed before this block completes.
$status=@(git -C $root status --porcelain=v1 --untracked-files=all);if($LASTEXITCODE-ne0){throw 'repository status check failed'};if($status.Count-ne0){throw 'relay import requires a clean worktree'}
$head=(git -C $root rev-parse HEAD).Trim();if($LASTEXITCODE-ne0-or$head-notmatch'^[0-9a-f]{40}$'){throw 'repository HEAD identity check failed'}
$branch=(git -C $root branch --show-current).Trim();if($LASTEXITCODE-ne0-or$branch-cne[string]$bundle.branch){throw "relay bundle branch mismatch: $branch"}
$origin=(git -C $root remote get-url origin).Trim();if($LASTEXITCODE-ne0-or$origin-notmatch("(?i)(github\.com[:/])"+[regex]::Escape([string]$bundle.repository)+"(?:\.git)?$")){throw 'relay bundle repository remote mismatch'}
    if([string]$adapter.Relay.Repository-cne[string]$bundle.repository){throw 'relay bundle repository does not match project adapter'}
    & git -C $root check-ref-format --branch ([string]$bundle.branch)|Out-Null;if($LASTEXITCODE-ne0){throw 'relay bundle branch is invalid'}
    if($null-ne$bundle.PSObject.Properties['route_result']){
        $routeResult=$bundle.route_result
        & git -C $root rev-parse --verify --quiet "$($routeResult.resolved_commit)`^{commit}"|Out-Null;if($LASTEXITCODE-ne0){throw 'route_result resolved commit does not exist'}
        if([string]$routeResult.resolved_commit-cne$head){throw 'route_result resolved commit does not match import HEAD'}
        $resolvedRef=(& git -C $root rev-parse --verify "$($routeResult.requested_ref)`^{commit}" 2>$null).Trim();if($LASTEXITCODE-ne0-or$resolvedRef-cne$head){throw 'route_result requested ref no longer resolves to import HEAD'}
        $routeNextRelative='docs/ai/NEXT_ACTION.yml';$routeAdapterRelative='docs/ai/PROJECT_ADAPTER.psd1'
        $routeNextText=Read-GitText $head $routeNextRelative;$routeHandoffRelative=Read-Key $routeNextText 'handoff_file' 'route_result NEXT_ACTION'
        if([IO.Path]::IsPathRooted($routeHandoffRelative)-or$routeHandoffRelative-match'(^|[\\/])\.\.([\\/]|$)'){throw 'route_result handoff path escapes project root'}
        foreach($pair in @(
            @('next_action_blob',[string]$routeResult.next_action_blob,(Get-GitBlob $head $routeNextRelative)),
            @('handoff_blob',[string]$routeResult.handoff_blob,(Get-GitBlob $head $routeHandoffRelative)),
            @('adapter_blob',[string]$routeResult.adapter_blob,(Get-GitBlob $head $routeAdapterRelative))
        )){if($pair[1]-cne$pair[2]){throw "route_result blob mismatch: $($pair[0])"}}
    }
    $statePath=Project-Path 'docs/ai/CURRENT_STATE.md';$nextPath=Project-Path 'docs/ai/NEXT_ACTION.yml';$state=[IO.File]::ReadAllText($statePath);$next=[IO.File]::ReadAllText($nextPath);$taskId=[string]$bundle.task_id
$active=@([regex]::Matches($state,'(?m)^\s+-\s+(TASK-[0-9]+)\s*$')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique);if($state-match'(?m)^active_tasks:\s*\[\]\s*$'){$active=@()}
$taskRelative="docs/ai/tasks/$taskId.md";$taskPath=Project-Path $taskRelative
    $lock=[IO.File]::ReadAllText((Project-Path 'docs/ai/SHARED_RULES.lock.yml'));$lockCommitKey=if($lock-match'(?m)^source_commit:'){'source_commit'}else{'commit'};if((Read-Key $lock $lockCommitKey 'SHARED_RULES.lock.yml')-cne[string]$bundle.shared_candidate){throw 'relay bundle shared candidate mismatch'}
$specRevisionReset=$false
$openFindingIds=@()
if([string]$bundle.decision-eq'REQUIREMENTS_DEFINED'){
    if($active.Count-ne0){throw 'REQUIREMENTS_DEFINED relay requires zero active TASKs'}
    if(Test-Path -LiteralPath $taskPath){throw 'REQUIREMENTS_DEFINED target TASK already exists'}
    $baseCommit=[string]$bundle.requirements.base_commit;$actualTree=(git -C $root rev-parse "$baseCommit`^{tree}").Trim();if($LASTEXITCODE-ne0-or$actualTree-cne[string]$bundle.requirements.base_tree){throw 'REQUIREMENTS_DEFINED base commit/tree mismatch'}
    if([string]$policy.Relay.Requirements.BaseCommitPolicy-cne'exact_head'-or$head-cne$baseCommit){throw 'REQUIREMENTS_DEFINED base commit must equal current HEAD'}
}else{
    if($active.Count-ne1-or$active[0]-cne$taskId){throw 'relay bundle task does not match active TASK'}
    if(-not(Test-Path -LiteralPath $taskPath -PathType Leaf)){throw 'active TASK file is missing'}
    $taskExisting=[IO.File]::ReadAllText($taskPath);$taskSpecRevision=[int](Read-Key $taskExisting 'spec_revision' $taskRelative);$specRevisionReset=$false
    $resetProperty=$bundle.PSObject.Properties['spec_revision_reset']
    if($taskSpecRevision-ne[int]$bundle.spec_revision){
        if($null-eq$resetProperty-or$null-eq$bundle.spec_revision_reset){throw 'relay bundle spec_revision mismatch'}
        Validate-SpecRevisionReset $bundle.spec_revision_reset ([int]$bundle.spec_revision)
        if([int]$bundle.spec_revision_reset.from_revision-ne$taskSpecRevision){throw 'spec revision reset source revision mismatch'}
        $specRevisionReset=$true
    }elseif($null-ne$resetProperty-and$null-ne$bundle.spec_revision_reset){throw 'spec revision reset requires a changed spec_revision'}
    $openFindingIds=@(Read-OpenImplementationFindingIds $taskExisting)
    $terminatedStateMatch=[regex]::Match($taskExisting,'(?m)^implementation_review_terminated:\s*true\s*$')
    if($terminatedStateMatch.Success-and-not$specRevisionReset-and[string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')-and[string]$bundle.review_stage-ceq'implementation'){
        if([string]$bundle.decision-ceq'APPROVED'){throw 'terminated implementation review requires explicit user decision before release'}
        throw 'implementation review terminated; no fourth implementation review is permitted'
    }
    $currentHandoffRelative=Read-Key $next 'handoff_file' 'NEXT_ACTION';$currentHandoffPath=Project-Path $currentHandoffRelative;if(-not(Test-Path -LiteralPath $currentHandoffPath -PathType Leaf)){throw 'current handoff is missing'};$currentHandoff=[IO.File]::ReadAllText($currentHandoffPath)
    $acceptedPriorFindingIds=@(Read-HandoffFindingIds $currentHandoff 'Required changes' $currentHandoffRelative)
    $dispositionFindingIds=@(Read-HandoffFindingIds $currentHandoff 'Independent review disposition audit' $currentHandoffRelative)
    $currentReportRelative="docs/ai/reports/$taskId/RELAY_IMPORT.md";$currentReportPath=Project-Path $currentReportRelative;if(-not(Test-Path -LiteralPath $currentReportPath -PathType Leaf)){throw 'current relay import report is missing'};$currentReport=[IO.File]::ReadAllText($currentReportPath)
    Assert-ExistingImplementationReviewPreflight $taskExisting $state $next $currentHandoff $taskRelative $currentHandoffRelative|Out-Null
    $candidateField=Resolve-CandidateField $bundle $adapter
    if((Read-Key $currentHandoff $candidateField $currentHandoffRelative)-cne[string]$bundle.reviewed_candidate){throw 'relay bundle candidate does not match canonical review candidate'}
    $canonicalRelative="docs/ai/reports/$taskId/RELAY_BUNDLE.json";$currentCanonicalPath=Project-Path $canonicalRelative
    if([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){
        if(-not(Test-Path -LiteralPath $currentCanonicalPath -PathType Leaf)){throw 'independent review result requires canonical request bundle'}
        try{$requestCanonical=[IO.File]::ReadAllText($currentCanonicalPath)|ConvertFrom-Json}catch{throw 'canonical request bundle JSON is invalid'}
        $requestCanonicalDispositions=Normalize-OptionalCollection $requestCanonical.finding_dispositions
        Validate-Bundle $requestCanonical $adapter $requestCanonicalDispositions|Out-Null
        if([string]$requestCanonical.decision-cne'INDEPENDENT_REVIEW_REQUESTED'){throw 'current canonical bundle is not an independent review request'}
        Assert-RelayIdentity $bundle $requestCanonical $canonicalRelative
        if([string]$requestCanonical.reviewed_candidate-cne[string]$bundle.reviewed_candidate){throw 'canonical request candidate mismatch'}
        $resultRequest=Convert-ResultToRequest $bundle.independent_review_result
        $taskRequest=Read-StoredReviewRequest $taskExisting $taskRelative
        $nextRequest=Read-StoredReviewRequest $next 'NEXT_ACTION'
        $handoffRequest=Read-StoredReviewRequest $currentHandoff $currentHandoffRelative
        $requestComparisons=@(
            [pscustomobject]@{Expected=$resultRequest;Actual=$taskRequest;Source=$taskRelative},
            [pscustomobject]@{Expected=$resultRequest;Actual=$nextRequest;Source='NEXT_ACTION'},
            [pscustomobject]@{Expected=$resultRequest;Actual=$handoffRequest;Source=$currentHandoffRelative},
            [pscustomobject]@{Expected=$resultRequest;Actual=$requestCanonical.independent_review;Source=$canonicalRelative}
        )
        foreach($comparison in $requestComparisons){Assert-ReviewRequestEqual $comparison.Expected $comparison.Actual $comparison.Source}
        if((Read-Key $currentHandoff 'review_status' $currentHandoffRelative)-cne'requested'){throw 'independent review result requires a requested review handoff'}
    }
    $taskReviewStatusMatch=[regex]::Match($taskExisting,'(?m)^review_status:\s*(.*?)\s*$');$taskReviewStatus=if($taskReviewStatusMatch.Success){$taskReviewStatusMatch.Groups[1].Value}else{'not_requested'}
    if($taskReviewStatus-ceq'completed'-and[string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
        if(-not(Test-Path -LiteralPath $currentCanonicalPath -PathType Leaf)){throw 'completed independent review canonical bundle is missing'}
        try{$resultCanonical=[IO.File]::ReadAllText($currentCanonicalPath)|ConvertFrom-Json}catch{throw 'completed independent review canonical bundle JSON is invalid'}
        $resultCanonicalDispositions=Normalize-OptionalCollection $resultCanonical.finding_dispositions
        Validate-Bundle $resultCanonical $adapter $resultCanonicalDispositions|Out-Null
        if([string]$resultCanonical.decision-cne'INDEPENDENT_REVIEW_COMPLETED'){throw 'current canonical bundle is not an independent review result'}
        Assert-RelayIdentity $bundle $resultCanonical $canonicalRelative
        if([string]$resultCanonical.reviewed_candidate-cne[string]$bundle.reviewed_candidate){throw 'completed independent review canonical candidate mismatch'}
        if((Json-Value $resultCanonical.independent_review_result)-cne(Json-Value $bundle.independent_review_result)){throw 'completed independent review canonical result audit mismatch'}
        if((Json-Value @($resultCanonical.findings))-cne(Json-Value @($bundle.findings))){throw 'completed independent review canonical finding detail mismatch'}
        $result=$bundle.independent_review_result;$persistent=[ordered]@{review_kind=[string]$result.review_kind;review_status='completed';request_review_status=[string]$result.request_review_status;review_model=[string]$result.model;review_effort=[string]$result.effort;preferred_executor=[string]$result.preferred_executor;review_role=[string]$result.review_role;actual_executor=[string]$result.actual_executor;provider_substitution=[string]$result.provider_substitution;executor_policy=[string]$result.executor_policy;reviewed_candidate=[string]$result.reviewed_candidate;reviewed_spec_revision=[string]$result.spec_revision;review_request_id=[string]$result.request_id;review_started_at=[string]$result.started_at;review_completed_at=[string]$result.completed_at;review_result=[string]$result.result;review_findings_count=[string]$result.findings_count;review_finding_ids=[string]$result.finding_ids}
        foreach($pair in $persistent.GetEnumerator()){
            if((Read-Key $taskExisting $pair.Key $taskRelative)-cne[string]$pair.Value-or(Read-Key $next $pair.Key 'NEXT_ACTION')-cne[string]$pair.Value-or(Read-Key $currentHandoff $pair.Key $currentHandoffRelative)-cne[string]$pair.Value){throw "completed independent review audit mismatch: $($pair.Key)"}
        }
        $canonicalRequest=Convert-ResultToRequest $resultCanonical.independent_review_result
        $persistentComparisons=@(
            [pscustomobject]@{Actual=(Read-StoredReviewRequest $taskExisting $taskRelative);Source=$taskRelative},
            [pscustomobject]@{Actual=(Read-StoredReviewRequest $next 'NEXT_ACTION');Source='NEXT_ACTION'},
            [pscustomobject]@{Actual=(Read-StoredReviewRequest $currentHandoff $currentHandoffRelative);Source=$currentHandoffRelative}
        )
        foreach($comparison in $persistentComparisons){Assert-ReviewRequestEqual $canonicalRequest $comparison.Actual $comparison.Source}
    }
    & git -C $root rev-parse --verify --quiet "$($bundle.reviewed_candidate)`^{commit}"|Out-Null;if($LASTEXITCODE-ne0){throw 'relay bundle reviewed candidate commit does not exist'}
    if($head-cne[string]$bundle.reviewed_handoff_head){throw 'relay bundle handoff HEAD mismatch'}
    & git -C $root merge-base --is-ancestor ([string]$bundle.reviewed_candidate) ([string]$bundle.reviewed_handoff_head);if($LASTEXITCODE-ne0){throw 'relay bundle reviewed candidate is not an ancestor of handoff HEAD'}
}
$changesRequestedCycles=0
$effectiveDecision=[string]$bundle.decision
$materializedFromChangesRequested=$false
$implementationReviewAttempt=1
$implementationReviewProfile='standard'
$implementationReviewTerminated='false'
$reviewUserConfirmationRequired='false'
$reviewUserConfirmationPrompt='none'
$reviewTerminationReason='none'
if(Test-Path -LiteralPath $taskPath){
    $cycleMatch=[regex]::Match($taskExisting,'(?m)^changes_requested_cycles:\s*(.*?)\s*$')
    if($cycleMatch.Success){$rawCycles=$cycleMatch.Groups[1].Value.Trim();if($rawCycles-notmatch'^\d+$'){throw 'TASK changes_requested_cycles is invalid'};$changesRequestedCycles=[int]$rawCycles}
    if($specRevisionReset){$changesRequestedCycles=0}
    $storedAttempt=1;$storedProfile='standard';$storedTerminated='false'
    $attemptMatch=[regex]::Match($taskExisting,'(?m)^implementation_review_attempt:\s*(.*?)\s*$');if($attemptMatch.Success){$storedAttempt=[int]$attemptMatch.Groups[1].Value.Trim()}
    $profileMatch=[regex]::Match($taskExisting,'(?m)^implementation_review_profile:\s*(.*?)\s*$');if($profileMatch.Success){$storedProfile=$profileMatch.Groups[1].Value.Trim()}
    $terminatedMatch=[regex]::Match($taskExisting,'(?m)^implementation_review_terminated:\s*(.*?)\s*$');if($terminatedMatch.Success){$storedTerminated=$terminatedMatch.Groups[1].Value.Trim().ToLowerInvariant()}
    if(-not$specRevisionReset){
        if($changesRequestedCycles-lt0-or$changesRequestedCycles-gt3){throw 'TASK changes_requested_cycles is invalid'}
        $expectedStoredAttempt=if($changesRequestedCycles-eq0){1}elseif($changesRequestedCycles-eq1){2}else{3}
    $expectedStoredProfile=if($changesRequestedCycles-eq0){'standard'}elseif($changesRequestedCycles-eq1){'narrowed'}else{'terminal'}
        $expectedStoredTerminated=if($changesRequestedCycles-ge3){'true'}else{'false'}
        if($storedAttempt-ne$expectedStoredAttempt-or$storedProfile-cne$expectedStoredProfile-or$storedTerminated-cne$expectedStoredTerminated){throw 'TASK implementation review state is inconsistent'}
    }
    Validate-ImplementationReviewFindingScope $bundle $changesRequestedCycles $findingDispositions $specRevisionReset $openFindingIds $acceptedPriorFindingIds $dispositionFindingIds
    if([string]$bundle.decision-ceq'CHANGES_REQUESTED'-and[string]$bundle.review_stage-ceq'implementation'){
        if($changesRequestedCycles-eq2){
            $changesRequestedCycles=3
            $implementationReviewTerminated='true'
            $implementationReviewProfile='terminal'
            $effectiveDecision='NEEDS_USER_DECISION'
            $materializedFromChangesRequested=$true
            $transition=Get-Transition $effectiveDecision $bundle $adapter
        } else {
            $changesRequestedCycles++
        }
    }elseif([string]$bundle.decision-ceq'APPROVED'){
        $changesRequestedCycles=0
    }
}
$implementationReviewAttempt=if($changesRequestedCycles-eq0){1}elseif($changesRequestedCycles-eq1){2}else{3}
if($changesRequestedCycles-eq0){$implementationReviewProfile='standard'}elseif($changesRequestedCycles-eq1){$implementationReviewProfile='narrowed'}else{$implementationReviewProfile='terminal'}
$implementationReviewTerminated=if($changesRequestedCycles-ge3){'true'}elseif($implementationReviewTerminated -ceq 'true'){$implementationReviewTerminated}else{'false'}
$reviewUserConfirmationRequired=if($implementationReviewTerminated-ceq'true' -or $effectiveDecision-ceq'NEEDS_USER_DECISION'){'true'}else{'false'}
$reviewTerminationReason=if($implementationReviewTerminated-ceq'true'){'third implementation-review CHANGES_REQUESTED; explicit user confirmation required'}else{'none'}
$reviewUserConfirmationPrompt=if($reviewUserConfirmationRequired-ceq'true'){ 'Review unresolved blockers, choose release, remediation, or a new approved spec revision; no fourth implementation review is permitted.' }else{'none'}
$implementationReviewStage=if([string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){[string]$bundle.review_stage}elseif([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){[string]$bundle.independent_review.kind}elseif([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){[string]$bundle.independent_review_result.review_kind}else{'implementation'}
$implementationReviewOpenFindingIds=@($openFindingIds)
if($specRevisionReset-or[string]$bundle.decision-ceq'APPROVED'){$implementationReviewOpenFindingIds=@()}
elseif([string]$bundle.review_stage-ceq'implementation'-and[string]$bundle.decision-in@('CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){$implementationReviewOpenFindingIds=@(Get-ActionableFindings $bundle $findingDispositions|ForEach-Object{[string]$_.id}|Select-Object -Unique)}
$implementationReviewOpenFindingValue=if($implementationReviewOpenFindingIds.Count-eq0){'none'}else{$implementationReviewOpenFindingIds-join', '}
$effectivePhase=if($materializedFromChangesRequested){[string]$transition.Phase}else{[string]$bundle.next_phase}
$effectiveActor=if($materializedFromChangesRequested){[string]$transition.Actor}else{[string]$bundle.next_actor}
$effectiveRole=if($materializedFromChangesRequested){[string]$transition.Role}else{[string]$bundle.next_role}
$effectiveModel=if($materializedFromChangesRequested){'none'}else{[string]$bundle.model}
$effectiveEffort=if($materializedFromChangesRequested){'none'}else{[string]$bundle.effort}
$effectiveReturnTo=if($materializedFromChangesRequested){[string]$transition.ReturnTo}else{[string]$bundle.result_return_to}
$handoffRelative="docs/ai/handoffs/$taskId/$($transition.Handoff)";$reportRelative="docs/ai/reports/$taskId/RELAY_IMPORT.md";$canonicalRelative="docs/ai/reports/$taskId/RELAY_BUNDLE.json"
$nextTemplate=[string]$policy.Relay.NextActionTemplates[$effectiveDecision];if([string]::IsNullOrWhiteSpace($nextTemplate)){throw 'global relay next_action template is missing'}
$nextAction=$nextTemplate
$nextAction=$nextAction.Replace('{task_id}',$taskId)
$nextAction=$nextAction.Replace('{decision}',$effectiveDecision)
$nextAction=$nextAction.Replace('{actor}',$effectiveActor)
$nextAction=$nextAction.Replace('{implementation_review_attempt}',$implementationReviewAttempt.ToString())
$nextAction=$nextAction.Replace('{implementation_review_profile}',$implementationReviewProfile)
$nextAction=$nextAction.Replace('{implementation_review_terminated}',$implementationReviewTerminated)

if(Test-Path -LiteralPath $taskPath){
    $task=[IO.File]::ReadAllText($taskPath)
    foreach($pair in ([ordered]@{
        status=$transition.Status;spec_revision=[string]$bundle.spec_revision;spec_revision_reset=([string][bool]$specRevisionReset).ToLowerInvariant();current_phase=$effectivePhase;current_role_id=$effectiveRole;next_actor=$effectiveActor;next_role=$effectiveRole;
        assigned_model=$effectiveModel;assigned_effort=$effectiveEffort;handoff_file=$handoffRelative;return_to=$effectiveReturnTo;
        reviewed_candidate=[string]$bundle.reviewed_candidate;shared_candidate=[string]$bundle.shared_candidate;
        review_stage=$implementationReviewStage;changes_requested_cycles=[string]$changesRequestedCycles;implementation_review_attempt=[string]$implementationReviewAttempt;
        implementation_review_profile=$implementationReviewProfile;implementation_review_terminated=$implementationReviewTerminated;implementation_review_open_finding_ids=$implementationReviewOpenFindingValue;user_confirmation_required=$reviewUserConfirmationRequired;user_confirmation_prompt=$reviewUserConfirmationPrompt;review_termination_reason=$reviewTerminationReason
    }).GetEnumerator()){
        if($pair.Key-in@('reviewed_candidate','shared_candidate','spec_revision_reset','review_stage','changes_requested_cycles','implementation_review_attempt','implementation_review_profile','implementation_review_terminated','implementation_review_open_finding_ids','user_confirmation_required','user_confirmation_prompt','review_termination_reason')){$task=Set-OrAdd-Key $task $pair.Key $pair.Value $taskRelative}else{$task=Set-Key $task $pair.Key $pair.Value $taskRelative}
    }
    $task=Set-OrAdd-Key $task 'changes_requested_cycles' ([string]$changesRequestedCycles) $taskRelative
    $task=Set-OrAdd-Key $task 'implementation_review_attempt' ([string]$implementationReviewAttempt) $taskRelative
    $task=Set-OrAdd-Key $task 'implementation_review_profile' $implementationReviewProfile $taskRelative
    $task=Set-OrAdd-Key $task 'implementation_review_terminated' $implementationReviewTerminated $taskRelative
    $task=Set-OrAdd-Key $task 'implementation_review_open_finding_ids' $implementationReviewOpenFindingValue $taskRelative
    if([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
        $review=$bundle.independent_review;$allowed=[string]$policy.IndependentReview.ActiveExecutor
        $repositoryAccess=([string][bool]$review.repository_access).ToLowerInvariant()
        $reviewValues=[ordered]@{preferred_executor=[string]$review.preferred_executor;allowed_executors=$allowed;executor_policy=[string]$review.executor_policy;review_kind=[string]$review.kind;review_role=[string]$review.review_role;execution_mode=[string]$review.execution_mode;repository_access=$repositoryAccess;review_status=[string]$review.review_status;request_review_status=[string]$review.review_status;review_model=[string]$review.model;review_effort=[string]$review.effort;actual_executor=[string]$review.actual_executor;provider_substitution=[string]$review.provider_substitution;reviewed_candidate=[string]$review.reviewed_candidate;reviewed_spec_revision=[string]$review.reviewed_spec_revision;review_request_id=[string]$review.request_id;review_started_at=[string]$review.started_at;review_completed_at='none';review_result='none';review_findings_count='0';review_finding_ids='none'}
        foreach($pair in $reviewValues.GetEnumerator()){$task=Set-OrAdd-Key $task $pair.Key $pair.Value $taskRelative}
    }elseif([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_COMPLETED'){
        $result=$bundle.independent_review_result;$resultValues=[ordered]@{preferred_executor=[string]$result.preferred_executor;review_kind=[string]$result.review_kind;review_role=[string]$result.review_role;execution_mode=[string]$result.execution_mode;repository_access=(([string][bool]$result.repository_access).ToLowerInvariant());review_status=[string]$result.review_status;request_review_status=[string]$result.request_review_status;review_model=[string]$result.model;review_effort=[string]$result.effort;actual_executor=[string]$result.actual_executor;provider_substitution=[string]$result.provider_substitution;executor_policy=[string]$result.executor_policy;reviewed_candidate=[string]$result.reviewed_candidate;reviewed_spec_revision=[string]$result.spec_revision;review_request_id=[string]$result.request_id;review_started_at=[string]$result.started_at;review_completed_at=[string]$result.completed_at;review_result=[string]$result.result;review_findings_count=[string]$result.findings_count;review_finding_ids=[string]$result.finding_ids}
        foreach($pair in $resultValues.GetEnumerator()){$task=Set-OrAdd-Key $task $pair.Key $pair.Value $taskRelative}
    }elseif([string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
        $task=Set-OrAdd-Key $task 'review_stage' ([string]$bundle.review_stage) $taskRelative
    }
}else{
    $requirements=$bundle.requirements;$createdDate=([string]$bundle.created_at).Substring(0,10);$product=Resolve-ProductIdentity ([string]$requirements.accepted_product_identity_reference) $adapter;$metadataLines=Get-TaskMetadataLines $requirements $adapter
    $browserValue=([string]$requirements.browser_evidence_required).ToLowerInvariant();$designRequired=([string]$requirements.claude_design_review_required).ToLowerInvariant();$implementationRequired=([string]$requirements.claude_implementation_review_required).ToLowerInvariant()
    $task="---`ntask_id: $taskId`ntitle: $($requirements.title)`nstatus: $($transition.Status)`nroute: TWO_SESSION_FAST`npriority: $($requirements.priority)`nspec_revision: $($bundle.spec_revision)`nspec_status: accepted`ncurrent_phase: $($bundle.next_phase)`ncurrent_role_id: $($bundle.next_role)`nnext_actor: $($bundle.next_actor)`nnext_role: $($bundle.next_role)`nassigned_model: $($bundle.model)`nassigned_effort: $($bundle.effort)`nsession_mode: $($requirements.handoff_mode)`nhandoff_file: $handoffRelative`npreferred_executor: $($requirements.preferred_executor)`nallowed_executors: $($requirements.allowed_executors)`nexecutor_policy: $($requirements.executor_policy)`nreturn_to: $($bundle.result_return_to)`nbrowser_evidence_required: $browserValue`nclaude_design_review_recommendation: $($requirements.claude_design_review_recommendation)`nclaude_implementation_review_recommendation: $($requirements.claude_implementation_review_recommendation)`nclaude_design_review_required: $designRequired`nclaude_implementation_review_required: $implementationRequired`nclaude_design_review_status: $($requirements.claude_design_review_status)`nclaude_implementation_review_status: $($requirements.claude_implementation_review_status)`nbase_commit: $($requirements.base_commit)`nbase_tree: $($requirements.base_tree)`naccepted_product_identity_reference: $($product.Reference)`naccepted_product_sha256: $($product.Sha256)`n$metadataLines`nreview_stage: $implementationReviewStage`nchanges_requested_cycles: $changesRequestedCycles`nimplementation_review_attempt: $implementationReviewAttempt`nimplementation_review_profile: $implementationReviewProfile`nimplementation_review_terminated: $implementationReviewTerminated`nimplementation_review_open_finding_ids: $implementationReviewOpenFindingValue`nupdated_at: $createdDate`n---`n`n# $taskId — $($requirements.title)`n`n## Purpose`n`n$($bundle.purpose)`n`n## Scope`n`n$(Lines $bundle.scope)`n`n## Out of scope`n`n$(Lines $bundle.out_of_scope)`n`n## Acceptance criteria`n`n$(Lines $bundle.acceptance_criteria)`n`n## Tests`n`n$(Lines $bundle.tests)`n`n## Build`n`n$(Lines $requirements.build)`n`n## Rollback`n`n$($requirements.rollback)`n`n## Forbidden changes`n`n$(Lines $bundle.forbidden_changes)`n"
}
$postReviewFormal=[string]$bundle.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')-and$null-ne$bundle.independent_review_result
$dispositionById=@{};foreach($disposition in $findingDispositions){$dispositionById[[string]$disposition.finding_id]=$disposition}
$requiredFindings=if($postReviewFormal){@($bundle.findings|Where-Object{[string]$dispositionById[[string]$_.id].status-ceq'accepted'})}else{@($bundle.findings)}
$requiredLines=@($requiredFindings|ForEach-Object{"- $($_.id) [$($_.severity)] $($_.target): $($_.problem) Evidence: $($_.evidence) Impact: $($_.impact) Required: $($_.required_change)"});if($requiredLines.Count-eq0){$requiredLines=@('- none')}
$userDecisionLines=if($postReviewFormal){@($bundle.findings|Where-Object{[string]$dispositionById[[string]$_.id].status-ceq'needs_user_decision'}|ForEach-Object{"- $($_.id): $($dispositionById[[string]$_.id].reason)"})}else{@()};if($userDecisionLines.Count-eq0){$userDecisionLines=@('- none')}
$dispositionAuditLines=if($postReviewFormal){@($bundle.findings|ForEach-Object{$disposition=$dispositionById[[string]$_.id];"- $($_.id) [$($_.severity)] disposition=$($disposition.status); reason=$($disposition.reason); original_problem=$($_.problem); original_evidence=$($_.evidence); original_impact=$($_.impact); original_required_change=$($_.required_change)"})}else{@('- not_applicable')}
$routeDetails=if($null-ne$bundle.PSObject.Properties['route_result']){"- routing_mode: $($bundle.routing_mode)`n- route_repository: $($bundle.route_result.repository)`n- requested_ref: $($bundle.route_result.requested_ref)`n- resolved_commit: $($bundle.route_result.resolved_commit)`n- next_action_blob: $($bundle.route_result.next_action_blob)`n- handoff_blob: $($bundle.route_result.handoff_blob)`n- adapter_blob: $($bundle.route_result.adapter_blob)`n"}else{"- routing_mode: legacy_unspecified`n"}
$candidateDetail=if(-not[string]::IsNullOrWhiteSpace([string]$candidateField)-and$candidateField-notin@('candidate_commit','reviewed_candidate')){"- ${candidateField}: $($bundle.reviewed_candidate)`n"}else{''}
$reviewDetails=if([string]$bundle.decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){"- review_kind: $($bundle.independent_review.kind)`n- review_role: $($bundle.independent_review.review_role)`n- execution_mode: $($bundle.independent_review.execution_mode)`n- repository_access: $(([string][bool]$bundle.independent_review.repository_access).ToLowerInvariant())`n- review_status: $($bundle.independent_review.review_status)`n- request_review_status: $($bundle.independent_review.review_status)`n- review_model: $($bundle.independent_review.model)`n- review_effort: $($bundle.independent_review.effort)`n- preferred_executor: $($bundle.independent_review.preferred_executor)`n- actual_executor: $($bundle.independent_review.actual_executor)`n- provider_substitution: $($bundle.independent_review.provider_substitution)`n- executor_policy: $($bundle.independent_review.executor_policy)`n- reviewed_spec_revision: $($bundle.independent_review.reviewed_spec_revision)`n- review_request_id: $($bundle.independent_review.request_id)`n- review_started_at: $($bundle.independent_review.started_at)`n$candidateDetail"}elseif($null-ne$bundle.independent_review_result){"- review_kind: $($bundle.independent_review_result.review_kind)`n- review_role: $($bundle.independent_review_result.review_role)`n- review_status: completed`n- request_review_status: $($bundle.independent_review_result.request_review_status)`n- review_model: $($bundle.independent_review_result.model)`n- review_effort: $($bundle.independent_review_result.effort)`n- preferred_executor: $($bundle.independent_review_result.preferred_executor)`n- actual_executor: $($bundle.independent_review_result.actual_executor)`n- execution_mode: $($bundle.independent_review_result.execution_mode)`n- repository_access: $(([string][bool]$bundle.independent_review_result.repository_access).ToLowerInvariant())`n- provider_substitution: $($bundle.independent_review_result.provider_substitution)`n- executor_policy: $($bundle.independent_review_result.executor_policy)`n- reviewed_spec_revision: $($bundle.independent_review_result.spec_revision)`n- review_request_id: $($bundle.independent_review_result.request_id)`n- review_started_at: $($bundle.independent_review_result.started_at)`n- review_completed_at: $($bundle.independent_review_result.completed_at)`n- review_result: $($bundle.independent_review_result.result)`n- review_findings_count: $($bundle.independent_review_result.findings_count)`n- review_finding_ids: $($bundle.independent_review_result.finding_ids)`n$candidateDetail"}else{$candidateDetail}
$handoff="# RELAY HANDOFF — $taskId`n`n- relay_schema: 2`n- task_id: $taskId`n- decision: $($bundle.decision)`n- relay_recipient: $($bundle.relay_recipient)`n- relay_recipient_role: $($bundle.relay_recipient_role)`n- result_return_to: $($bundle.result_return_to)`n- repository: $($bundle.repository)`n- branch: $($bundle.branch)`n- reviewed_candidate: $($bundle.reviewed_candidate)`n- candidate_commit: $($bundle.reviewed_candidate)`n- reviewed_handoff_head: $($bundle.reviewed_handoff_head)`n- shared_candidate: $($bundle.shared_candidate)`n- spec_revision_reset: $(([string][bool]$specRevisionReset).ToLowerInvariant())`n- next_phase: $($bundle.next_phase)`n- next_actor: $($bundle.next_actor)`n- next_role: $($bundle.next_role)`n- model: $($bundle.model)`n- effort: $($bundle.effort)`n$routeDetails$reviewDetails`n## Purpose`n`n$($bundle.purpose)`n`n## Scope`n`n$(Lines $bundle.scope)`n`n## Out of scope`n`n$(Lines $bundle.out_of_scope)`n`n## Required changes`n`n$($requiredLines-join"`n")`n`n## User decisions required`n`n$($userDecisionLines-join"`n")`n`n## Independent review disposition audit`n`n$($dispositionAuditLines-join"`n")`n`n## Acceptance criteria`n`n$(Lines $bundle.acceptance_criteria)`n`n## Tests`n`n$(Lines $bundle.tests)`n`n## Forbidden changes`n`n$(Lines $bundle.forbidden_changes)`n`nValidated full bundle: $canonicalRelative`n"
$handoff=[regex]::Replace($handoff,'(?m)^- spec_revision_reset:.*$',"- spec_revision_reset: $(([string][bool]$specRevisionReset).ToLowerInvariant())`n- review_stage: $implementationReviewStage`n- changes_requested_cycles: $changesRequestedCycles`n- implementation_review_attempt: $implementationReviewAttempt`n- implementation_review_profile: $implementationReviewProfile`n- implementation_review_terminated: $implementationReviewTerminated`n- user_confirmation_required: $reviewUserConfirmationRequired`n- user_confirmation_prompt: $reviewUserConfirmationPrompt`n- review_termination_reason: $reviewTerminationReason`n- implementation_review_open_finding_ids: $implementationReviewOpenFindingValue")
if($materializedFromChangesRequested){
    $handoff=[regex]::Replace($handoff,'(?m)^- decision:.*$',"- decision: $effectiveDecision`n- source_decision: $($bundle.decision)")
    $handoff=[regex]::Replace($handoff,'(?m)^- relay_recipient:.*$',"- relay_recipient: $effectiveActor")
    $handoff=[regex]::Replace($handoff,'(?m)^- relay_recipient_role:.*$',"- relay_recipient_role: $effectiveRole")
    $handoff=[regex]::Replace($handoff,'(?m)^- result_return_to:.*$',"- result_return_to: $effectiveReturnTo")
    $handoff=[regex]::Replace($handoff,'(?m)^- next_phase:.*$',"- next_phase: $effectivePhase")
    $handoff=[regex]::Replace($handoff,'(?m)^- next_actor:.*$',"- next_actor: $effectiveActor")
    $handoff=[regex]::Replace($handoff,'(?m)^- next_role:.*$',"- next_role: $effectiveRole")
    $handoff=[regex]::Replace($handoff,'(?m)^- model:.*$',"- model: $effectiveModel")
    $handoff=[regex]::Replace($handoff,'(?m)^- effort:.*$',"- effort: $effectiveEffort")
}
$handoff=[regex]::Replace($handoff,'(?m)^- changes_requested_cycles:.*$',"- changes_requested_cycles: $changesRequestedCycles")
$handoff=[regex]::Replace($handoff,'(?m)^- spec_revision_reset:.*$',"- spec_revision_reset: $(([string][bool]$specRevisionReset).ToLowerInvariant())")
$handoff=[regex]::Replace($handoff,'(?m)^- implementation_review_attempt:.*$',"- implementation_review_attempt: $implementationReviewAttempt")
$handoff=[regex]::Replace($handoff,'(?m)^- implementation_review_profile:.*$',"- implementation_review_profile: $implementationReviewProfile")
$handoff=[regex]::Replace($handoff,'(?m)^- implementation_review_terminated:.*$',"- implementation_review_terminated: $implementationReviewTerminated")
$handoff=[regex]::Replace($handoff,'(?m)^- review_stage:.*$',"- review_stage: $implementationReviewStage")
$handoff=[regex]::Replace($handoff,'(?m)^- implementation_review_open_finding_ids:.*$',"- implementation_review_open_finding_ids: $implementationReviewOpenFindingValue")
$canonicalBytes=$normalizedBytes;$canonicalSha=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($canonicalBytes)).Replace('-','')
if($active.Count-eq0){$state=[regex]::Replace($state,'(?m)^active_tasks:\s*\[\]\s*$',"active_tasks:`n  - $taskId")}
$state=[regex]::Replace($state,'(?m)^next_action:\s*.*$',"next_action: $nextAction")
$state=Set-OrAdd-Key $state 'review_stage' $implementationReviewStage 'CURRENT_STATE'
$state=Set-OrAdd-Key $state 'changes_requested_cycles' ([string]$changesRequestedCycles) 'CURRENT_STATE'
$state=Set-OrAdd-Key $state 'implementation_review_attempt' ([string]$implementationReviewAttempt) 'CURRENT_STATE'
$state=Set-OrAdd-Key $state 'implementation_review_profile' $implementationReviewProfile 'CURRENT_STATE'
$state=Set-OrAdd-Key $state 'implementation_review_terminated' $implementationReviewTerminated 'CURRENT_STATE'

$targets=@($taskPath,$statePath,$nextPath,(Project-Path 'board/PROGRESS.html'),(Project-Path $handoffRelative),(Project-Path $reportRelative),(Project-Path $canonicalRelative))|Select-Object -Unique
$directories=@($targets|ForEach-Object{Split-Path -Parent $_}|Select-Object -Unique);$backups=@{};$directoryExisted=@{}
foreach($path in $targets){$backups[$path]=if(Test-Path -LiteralPath $path -PathType Leaf){[pscustomobject]@{Exists=$true;Bytes=[IO.File]::ReadAllBytes($path)}}else{[pscustomobject]@{Exists=$false;Bytes=$null}}}
foreach($directory in $directories){$directoryExisted[$directory]=Test-Path -LiteralPath $directory -PathType Container}
$overlayBefore=@(Get-OverlayFailures $adapter)
try{
    foreach($path in @($taskPath,(Project-Path $handoffRelative),(Project-Path $reportRelative),(Project-Path $canonicalRelative),$statePath)){[IO.Directory]::CreateDirectory((Split-Path -Parent $path))|Out-Null}
    [IO.File]::WriteAllText($taskPath,$task,$utf8NoBom);[IO.File]::WriteAllText((Project-Path $handoffRelative),$handoff,$utf8NoBom);[IO.File]::WriteAllBytes((Project-Path $canonicalRelative),$canonicalBytes);[IO.File]::WriteAllText($statePath,$state,$utf8NoBom)
    $canonicalReadback=[IO.File]::ReadAllBytes((Project-Path $canonicalRelative));if([Convert]::ToBase64String($canonicalReadback)-cne[Convert]::ToBase64String($canonicalBytes)){throw 'canonical relay bundle byte readback mismatch'}
    $canonicalIdentity=Get-Identity (Project-Path $canonicalRelative);if($canonicalIdentity.Sha256-cne$canonicalSha-or$canonicalIdentity.Bytes-ne$canonicalBytes.Length){throw 'canonical relay bundle identity readback mismatch'}
    $report="# RELAY IMPORT — $taskId`n`n- source bundle: $($identity.Name)`n- source SHA-256: $($identity.Sha256)`n- source bytes: $($identity.Bytes)`n- identity verified: true`n- canonical bundle: $canonicalRelative`n- canonical SHA-256: $($canonicalIdentity.Sha256)`n- canonical bytes: $($canonicalIdentity.Bytes)`n- semantic round-trip: verified`n- decision: $($bundle.decision)`n- relay_recipient: $($bundle.relay_recipient)`n- relay_recipient_role: $($bundle.relay_recipient_role)`n- result_return_to: $($bundle.result_return_to)`n- candidate: $($bundle.reviewed_candidate)`n- handoff HEAD: $($bundle.reviewed_handoff_head)`n- spec_revision_reset: $(([string][bool]$specRevisionReset).ToLowerInvariant())`n- review_stage: $implementationReviewStage`n- changes_requested_cycles: $changesRequestedCycles`n- implementation_review_attempt: $implementationReviewAttempt`n- implementation_review_profile: $implementationReviewProfile`n- implementation_review_terminated: $implementationReviewTerminated`n- user_confirmation_required: $reviewUserConfirmationRequired`n- user_confirmation_prompt: $reviewUserConfirmationPrompt`n- review_termination_reason: $reviewTerminationReason`n- implementation_review_open_finding_ids: $implementationReviewOpenFindingValue`n$routeDetails$reviewDetails- imported findings: $(@($bundle.findings).Count)`n- accepted findings: $(@($requiredFindings).Count)`n- finding dispositions: $($findingDispositions.Count)`n"
    [IO.File]::WriteAllText((Project-Path $reportRelative),$report,$utf8NoBom)
    if($FailureInjection-eq'after_writes'){throw 'injected relay failure after writes'}
    Invoke-ProjectScript 'tools/generate-next-action.ps1';if($FailureInjection-eq'after_next_action'){throw 'injected relay failure after NEXT_ACTION'}
    Invoke-ProjectScript 'tools/generate-progress.ps1'
    Invoke-ProjectScript 'docs/ai/generated/shared/tools/validate-project.ps1' @('-ProjectRoot',$root,'-SkipOverlay')
    $overlayAfter=@(Get-OverlayFailures $adapter);$newOverlayFailures=@($overlayAfter|Where-Object{$overlayBefore-cnotcontains$_});if($newOverlayFailures.Count-ne0){throw "project overlay introduced new governance failures: $($newOverlayFailures-join', ')"}
    $roundTrip=ConvertTo-CanonicalJsonText ([IO.File]::ReadAllText((Project-Path $canonicalRelative))|ConvertFrom-Json);if($roundTrip-cne$normalized){throw 'canonical relay bundle semantic round-trip mismatch'}
}catch{
    $original=$_
    foreach($path in $targets){$backup=$backups[$path];if($backup.Exists){[IO.Directory]::CreateDirectory((Split-Path -Parent $path))|Out-Null;[IO.File]::WriteAllBytes($path,$backup.Bytes)}elseif(Test-Path -LiteralPath $path -PathType Leaf){Remove-Item -LiteralPath $path -Force}}
    foreach($directory in @($directories|Sort-Object Length -Descending)){if(-not$directoryExisted[$directory]-and(Test-Path -LiteralPath $directory -PathType Container)-and@(Get-ChildItem -LiteralPath $directory -Force).Count-eq0){Remove-Item -LiteralPath $directory -Force}}
    throw $original
}
$identity|Add-Member -NotePropertyName Imported -NotePropertyValue $true -PassThru|ConvertTo-Json -Compress
