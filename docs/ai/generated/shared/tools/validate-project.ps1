# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ProjectRoot,[switch]$SkipOverlay)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
. (Join-Path $PSScriptRoot 'governance-v1.ps1')
$root = [IO.Path]::GetFullPath($ProjectRoot)
$failures = [Collections.Generic.List[string]]::new()
$sharedSourceRoot = Split-Path -Parent $PSScriptRoot
$policyPath = Join-Path $sharedSourceRoot 'core/POLICY.psd1'
$governancePolicy = Import-AdapterFile -Path $policyPath -ExpectedBom absent

function Project-Path([string]$Relative) { Join-Path $root $Relative }
function Read-ProjectFile([string]$Relative) { [IO.File]::ReadAllText((Project-Path $Relative)) }
function Add-Failure([string]$Message) { $script:failures.Add($Message) }
function Test-AssignmentAllowed($Policy,[string]$Actor,[string]$Role,[string]$Model,[string]$Effort) {
    if($Actor-in@('USER','NONE')){return $Model-ceq'none'-and$Effort-ceq'none'}
    $assignment=if($Actor-ceq'ChatGPT'-and$Role-ceq'ORCHESTRATOR_AND_REVIEWER'){'CHATGPT_ORCHESTRATOR'}elseif($Actor-ceq'ChatGPT'-and$Role-ceq'INDEPENDENT_REVIEWER'){'CHATGPT_INDEPENDENT_REVIEWER'}elseif($Actor-ceq'Codex'-and$Role-ceq'IMPLEMENTER'){'CODEX_MAIN'}else{return $false}
    if($Model-ceq'none'-and$Effort-ceq'none'){return $true}
    $modelId=if($Model-match'(?i)(Spark|Luna|Terra|Sol)$'){$Matches[1]}else{$Model}
    $modelId=(Get-Culture).TextInfo.ToTitleCase($modelId.ToLowerInvariant())
    $effortId=if($Effort-ceq'Ultra'){'max'}else{$Effort.ToLowerInvariant()}
    $routeId="$modelId-$effortId"
    if($Policy.Routing.LegacyRouteMap.ContainsKey($routeId)){$routeId=[string]$Policy.Routing.LegacyRouteMap[$routeId]}
    $purpose=[string]$Policy.Routing.AssignmentPurpose[$assignment]
    return @($Policy.Routing.PurposeOrders[$purpose])-ccontains$routeId
}
function Read-Value([string]$Text, [string]$Key, [string]$Source) {
    $matches = [regex]::Matches($Text, "(?m)^\s*(?:-\s*)?$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if ($matches.Count -eq 0) { throw "Missing '$Key' in $Source" }
    if ($matches.Count -ne 1) { throw "Duplicate '$Key' in $Source" }
    $matches[0].Groups[1].Value.Trim()
}
function Read-HandoffIdentityValue([string]$Text,[string[]]$Keys,[string]$Source){
    $found=@();foreach($key in $Keys){$found+=@([regex]::Matches($Text,"(?m)^\s*(?:-\s*)?$([regex]::Escape($key)):\s*(.*?)\s*$"))}
    if($found.Count-ne1){throw "Expected exactly one of '$($Keys-join'/')' in $Source"}
    $value=$found[0].Groups[1].Value.Trim();$quoted=[regex]::Match($value,'^`([^`]+)`$');if($quoted.Success){$value=$quoted.Groups[1].Value};$value
}
function Test-TaskHistoryScalar([string]$Value) {
    -not [string]::IsNullOrWhiteSpace($Value) -and
        $Value -match '^[A-Za-z0-9][A-Za-z0-9_-]*$' -and
        @('none','null','unknown','tbd','runtime-selected','runtime_selected','runtime selected') -cnotcontains $Value.ToLowerInvariant()
}
function Read-RetainedTaskFrontmatter([string]$Path) {
    $text=[IO.File]::ReadAllText($Path)
    $frontmatter=[regex]::Match($text,'\A---\r?\n(?<body>.*?)\r?\n---(?:\r?\n|\z)',[Text.RegularExpressions.RegexOptions]::Singleline)
    if(-not$frontmatter.Success){throw "malformed retained TASK frontmatter: $Path"}
    $values=@{}
    foreach($key in @('task_id','status','current_phase')){
        $matches=[regex]::Matches($frontmatter.Groups['body'].Value,"(?m)^$([regex]::Escape($key)):\s*(.*?)\s*$")
        if($matches.Count-eq0){throw "Missing '$key' in retained TASK frontmatter: $Path"}
        if($matches.Count-ne1){throw "Duplicate '$key' in retained TASK frontmatter: $Path"}
        $value=$matches[0].Groups[1].Value.Trim()
        if(-not(Test-TaskHistoryScalar $value)){throw "invalid retained TASK frontmatter value for '$key': $Path"}
        $values[$key]=$value
    }
    $values
}
function Validate-CompletedTasksLedger([string]$Text,[string]$Source){
    $startMarker='<!-- COMPLETED_TASKS:START -->'
    $endMarker='<!-- COMPLETED_TASKS:END -->'
    $startCount=[regex]::Matches($Text,$startMarker).Count
    $endCount=[regex]::Matches($Text,$endMarker).Count
    if($startCount -ne 1){throw "COMPLETED_TASKS must contain exactly one START marker in $Source"}
    if($endCount -ne 1){throw "COMPLETED_TASKS must contain exactly one END marker in $Source"}

    $startIndex=$Text.IndexOf($startMarker)
    if($startIndex -lt 0){throw "COMPLETED_TASKS markers are missing in $Source"}
    $endIndex=$Text.IndexOf($endMarker,$startIndex+$startMarker.Length)
    if($endIndex -lt 0){throw "COMPLETED_TASKS END marker is missing in $Source"}
    if($endIndex -lt $startIndex){throw 'COMPLETED_TASKS END marker appears before START marker'}

    $beforeText=$Text.Substring(0,$startIndex)
    $afterText=$Text.Substring($endIndex+$endMarker.Length)
    if($beforeText -match '(?m)^\s*\|'){throw "COMPLETED_TASKS markers must wrap only the ledger section in $Source"}
    if($afterText -match '(?m)^\s*\|'){throw "COMPLETED_TASKS markers must wrap only the ledger section in $Source"}

    $contentText=$Text.Substring($startIndex+$startMarker.Length, $endIndex-$startIndex-$startMarker.Length)
    $lines=@($contentText -split '\r?\n'|Where-Object{-not[string]::IsNullOrWhiteSpace($_)})
    if($lines.Count -lt 2){throw "COMPLETED_TASKS table is incomplete in $Source"}

    $headerExpected=@('TASK-ID','機能','完了日時')
    $headers=@($lines[0].Trim('|').Split('|')|ForEach-Object{$_.Trim()})
    if($headers.Count -ne $headerExpected.Count){throw "COMPLETED_TASKS header column count mismatch in $Source"}
    for($i=0;$i-lt$headerExpected.Count;$i++){if($headers[$i]-cne$headerExpected[$i]){throw "COMPLETED_TASKS header mismatch in ${Source} at index ${i}"}}

    $separator=@($lines[1].Trim('|').Split('|')|ForEach-Object{$_.Trim()})
    if($separator.Count -ne 3-or@($separator|Where-Object{$_-notmatch'^:?-{3,}:?$'}).Count){throw "COMPLETED_TASKS separator row is invalid in $Source"}

    $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    for($lineIndex=2;$lineIndex-lt$lines.Count;$lineIndex++){
        $line=$lines[$lineIndex]
        if($line -notmatch '^\|'){throw "Malformed COMPLETED_TASKS line in ${Source}: ${line}"}
        $cells=@($line.Trim('|').Split('|')|ForEach-Object{$_.Trim()})
        if($cells.Count -ne 3){throw "COMPLETED_TASKS row must have 3 cells in ${Source}: ${line}"}
        if($cells[0]-notmatch'^TASK-[0-9]+$'){throw "Invalid COMPLETED_TASKS TASK-ID in ${Source}: $($cells[0])"}
        if(-not $seen.Add($cells[0])){throw "Duplicate COMPLETED_TASKS TASK-ID in ${Source}: $($cells[0])"}
        if([string]::IsNullOrWhiteSpace($cells[1])){throw "COMPLETED_TASKS feature is empty in ${Source}: $($cells[0])"}
        if($cells[2]-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){throw "COMPLETED_TASKS completion datetime is invalid in ${Source}: $($cells[0])"}
        $timestamp=$cells[2].Substring(0,19)
        $parsed=[DateTime]::MinValue
        if(-not [DateTime]::TryParseExact($timestamp,'yyyy-MM-dd HH:mm:ss',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::None,[ref]$parsed)){throw "COMPLETED_TASKS completion datetime is invalid in ${Source}: $($cells[0])"}
    }
    return $true
}

$required = @(
    'AGENTS.md',
    'docs/ai/PROJECT_ADAPTER.psd1',
    'docs/ai/PROJECT_RULES.md',
    'docs/ai/WORKFLOW.md',
    'docs/ai/CURRENT_STATE.md',
    'docs/ai/BACKLOG.md',
    'docs/ai/COMPLETED_TASKS.md',
    'docs/ai/NEXT_ACTION.yml',
    'docs/ai/SESSION_START.md',
    'docs/ai/SHARED_RULES.lock.yml',
    'docs/ai/generated/shared/core/START.md',
    'docs/ai/generated/shared/manifest.yml',
    'board/PROGRESS.html',
    'tools/sync-shared-governance.ps1',
    'tools/generate-next-action.ps1',
    'tools/generate-progress.ps1',
    'docs/ai/generated/shared/tools/route-go.ps1',
    'tools/validate-ai-governance.ps1'
)
foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Project-Path $relative) -PathType Leaf)) {
        Add-Failure "missing required file: $relative"
    }
}

$adapter = $null
$governanceRules = [Collections.Generic.List[object]]::new()
$phaseIds = @($governancePolicy.Lifecycle.InternalPhases)
$taskHistoryPolicy = 'git_only'
$retainedTaskPairs = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
try {
    Assert-GovernanceV1Policy $governancePolicy | Out-Null
    $adapterPath = Project-Path 'docs/ai/PROJECT_ADAPTER.psd1'
    $adapterText = [IO.File]::ReadAllText($adapterPath)
    $adapter = Import-AdapterFile -Path $adapterPath -ExpectedBom absent
    $adapterContract=Assert-GovernanceV1ProjectAdapter $adapterText $adapter $governancePolicy
    $globalOwners=[ordered]@{
        'source/AGENTS.md'='AGENTS.md'
        'core/CONSTITUTION.md'='core/CONSTITUTION.md'
        'core/OUTPUT.md'='core/OUTPUT.md'
        'core/LIFECYCLE.md'='core/LIFECYCLE.md'
        'core/ARTIFACTS.md'='core/ARTIFACTS.md'
        'core/EXECUTION.md'='core/EXECUTION.md'
    }
    foreach($entry in $globalOwners.GetEnumerator()){
        $generatedRelative="docs/ai/generated/shared/$($entry.Key)"
        foreach($rule in @(Get-GovernanceV1MarkdownRules -Text (Read-ProjectFile $generatedRelative) -Path $entry.Value -Layer global)){$governanceRules.Add($rule)}
    }
    foreach($projectRelative in @('docs/ai/PROJECT_RULES.md','docs/ai/WORKFLOW.md')){
        foreach($rule in @(Get-GovernanceV1MarkdownRules -Text (Read-ProjectFile $projectRelative) -Path $projectRelative -Layer project)){
            if(@($rule.RuleRelations).Count-ne0){throw "PROJECT Markdown relation entries are forbidden: $projectRelative"}
            $governanceRules.Add($rule)
        }
    }
    foreach($rule in @($adapterContract.RuleRecords)){$governanceRules.Add($rule)}
    $phaseIds = @($governancePolicy.Lifecycle.InternalPhases + @($adapter.PhaseExtensions | ForEach-Object { [string]$_.Id }))
    if(@($phaseIds | Select-Object -Unique).Count-ne$phaseIds.Count){Add-Failure 'project adapter phase extension duplicates a lifecycle phase'}
    if (-not $adapter.Relay -or [string]::IsNullOrWhiteSpace([string]$adapter.Relay.Repository)) { Add-Failure 'project adapter relay repository is missing' }
    if([string]$governancePolicy.Relay.Requirements.BaseCommitPolicy-cne'exact_head'){Add-Failure 'global requirements base commit policy must be exact_head'}
    if(@($adapter.Relay.Requirements.ProductIdentityReferences).Count-eq0){Add-Failure 'project adapter product identity reference allowlist is missing'}
    foreach($spec in @($adapter.Relay.Requirements.TaskMetadata)){if([string]::IsNullOrWhiteSpace([string]$spec.Field)-or[string]::IsNullOrWhiteSpace([string]$spec.Source)-or[string]$spec.Type-notin@('text','enum','boolean')){Add-Failure 'project adapter TASK metadata mapping is invalid'}}
    if($adapter.ContainsKey('TaskHistory')){
        $taskHistory=$adapter.TaskHistory
        if($taskHistory-isnot[Collections.IDictionary]){Add-Failure 'project adapter TaskHistory must be a mapping'}else{
            $taskHistoryPolicy=[string]$taskHistory.CompletedTaskFilePolicy
            if($taskHistoryPolicy-cnotin@('git_only','retain_validated')){Add-Failure "invalid CompletedTaskFilePolicy: $taskHistoryPolicy"}
            $retainedStates=@($taskHistory.RetainedTaskStates)
            if($taskHistoryPolicy-ceq'retain_validated'-and$retainedStates.Count-eq0){Add-Failure 'retain_validated requires at least one RetainedTaskStates entry'}
            foreach($entry in $retainedStates){
                if($entry-isnot[Collections.IDictionary]-or@($entry.Keys).Count-ne2-or@($entry.Keys)-cnotcontains'Status'-or@($entry.Keys)-cnotcontains'Phase'){
                    Add-Failure 'each RetainedTaskStates entry must contain exactly Status and Phase'
                    continue
                }
                $status=[string]$entry.Status;$phase=[string]$entry.Phase
                if(-not(Test-TaskHistoryScalar $status)-or-not(Test-TaskHistoryScalar $phase)){Add-Failure 'RetainedTaskStates Status and Phase must be non-empty exact scalar values';continue}
                if($phaseIds-cnotcontains$phase){Add-Failure "RetainedTaskStates Phase is not declared by POLICY or PhaseExtensions: $phase"}
                if(-not$retainedTaskPairs.Add("$status`0$phase")){Add-Failure "duplicate RetainedTaskStates pair: $status/$phase"}
            }
        }
    }
} catch {
    Add-Failure "project adapter invalid: $($_.Exception.Message)"
}

try {
    & (Project-Path 'docs/ai/generated/shared/tools/sync-project.ps1') `
        -ProjectRoot $root -Check -SharedRoot (Project-Path '__shared_source_intentionally_absent__')
    $snapshotOk = $?
    if (-not $snapshotOk) { Add-Failure 'shared snapshot check failed' }
} catch { Add-Failure "shared snapshot check failed: $($_.Exception.Message)" }
try {
    & (Project-Path 'tools/generate-next-action.ps1') -Check
    $nextOk = $?
    if (-not $nextOk) { Add-Failure 'NEXT_ACTION check failed' }
} catch { Add-Failure "NEXT_ACTION check failed: $($_.Exception.Message)" }
try {
    & (Project-Path 'tools/generate-progress.ps1') -Check
    $progressOk = $?
    if (-not $progressOk) { Add-Failure 'Progress check failed' }
} catch { Add-Failure "Progress check failed: $($_.Exception.Message)" }

$state = if (Test-Path -LiteralPath (Project-Path 'docs/ai/CURRENT_STATE.md')) { Read-ProjectFile 'docs/ai/CURRENT_STATE.md' } else { '' }
$next = if (Test-Path -LiteralPath (Project-Path 'docs/ai/NEXT_ACTION.yml')) { Read-ProjectFile 'docs/ai/NEXT_ACTION.yml' } else { '' }
$active = @([regex]::Matches($state, '(?m)^\s+-\s+(TASK-[0-9]+)\s*$') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
if ($state -match '(?m)^active_tasks:\s*\[\]\s*$') { $active = @() }
if ($active.Count -gt 1) { Add-Failure "active TASK count exceeds 1: $($active.Count)" }
try {
    $updatedAt = Read-Value $state 'updated_at' 'CURRENT_STATE'
    if ($updatedAt -notmatch '^\d{4}-\d{2}-\d{2}$') { Add-Failure "CURRENT_STATE updated_at is invalid: $updatedAt" }
    $nextActionMatches = [regex]::Matches($state, '(?m)^next_action:\s*(.*?)\s*$')
    if ($nextActionMatches.Count -ne 1 -or [string]::IsNullOrWhiteSpace($nextActionMatches[0].Groups[1].Value) -or $nextActionMatches[0].Groups[1].Value.Trim() -in @('|','>')) { Add-Failure 'CURRENT_STATE next_action must be exactly one non-empty line' }
    try {
        Validate-CompletedTasksLedger (Read-ProjectFile 'docs/ai/COMPLETED_TASKS.md') 'docs/ai/COMPLETED_TASKS.md'
    } catch {
        Add-Failure $_.Exception.Message
    }
} catch { Add-Failure $_.Exception.Message }

$taskFiles = @(Get-ChildItem -LiteralPath (Project-Path 'docs/ai/tasks') -Filter 'TASK-*.md' -File -ErrorAction SilentlyContinue)
$handoffDirs = @(Get-ChildItem -LiteralPath (Project-Path 'docs/ai/handoffs') -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'TASK-*' })
$reportDirs = @(Get-ChildItem -LiteralPath (Project-Path 'docs/ai/reports') -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'TASK-*' })
foreach ($file in $taskFiles) {
    if ($active -cnotcontains $file.BaseName) {
        if($taskHistoryPolicy-cne'retain_validated'){
            Add-Failure "inactive TASK artifact remains: docs/ai/tasks/$($file.Name)"
        }else{
            try{
                if($file.Name-cnotmatch'^TASK-[0-9]+\.md$'){throw "retained TASK filename is invalid: docs/ai/tasks/$($file.Name)"}
                $frontmatter=Read-RetainedTaskFrontmatter $file.FullName
                if([string]$frontmatter.task_id-cne$file.BaseName){throw "retained TASK task_id does not match filename: docs/ai/tasks/$($file.Name)"}
                if($active-ccontains[string]$frontmatter.task_id){throw "retained TASK file is active: docs/ai/tasks/$($file.Name)"}
                $pair="$([string]$frontmatter.status)`0$([string]$frontmatter.current_phase)"
                if(-not$retainedTaskPairs.Contains($pair)){throw "retained TASK state is not allowed: $([string]$frontmatter.status)/$([string]$frontmatter.current_phase): docs/ai/tasks/$($file.Name)"}
            }catch{Add-Failure $_.Exception.Message}
        }
    }
}
foreach ($dir in @($handoffDirs + $reportDirs)) {
    if ($active -cnotcontains $dir.Name) { Add-Failure "inactive TASK artifact remains: $($dir.FullName.Substring($root.Length + 1))" }
}
foreach ($id in $active) {
    $activeTaskPath = Project-Path "docs/ai/tasks/$id.md"
    if (-not (Test-Path -LiteralPath $activeTaskPath -PathType Leaf)) { Add-Failure "active TASK file missing: $id" }
    else {
        $taskLimit = if($adapter.ActiveTaskLimitBytes){[long]$adapter.ActiveTaskLimitBytes}else{32768}; if((Get-Item -LiteralPath $activeTaskPath).Length -gt $taskLimit){Add-Failure "active TASK size exceeds limit: $id"}
        try {
            $activeTaskText=[IO.File]::ReadAllText($activeTaskPath)
            Assert-GovernanceV1TaskDocument $activeTaskText "docs/ai/tasks/$id.md" | Out-Null
            foreach($rule in @(Get-GovernanceV1MarkdownRules -Text $activeTaskText -Path "docs/ai/tasks/$id.md" -Layer task)){$governanceRules.Add($rule)}
            $activePhase=Read-Value $activeTaskText 'current_phase' $activeTaskPath;$activeActor=Read-Value $activeTaskText 'next_actor' $activeTaskPath;$activeRole=Read-Value $activeTaskText 'next_role' $activeTaskPath;$activeModel=Read-Value $activeTaskText 'assigned_model' $activeTaskPath;$activeEffort=Read-Value $activeTaskText 'assigned_effort' $activeTaskPath
            if($phaseIds-cnotcontains$activePhase){Add-Failure "unknown active TASK phase: $activePhase"}
            if(-not(Test-AssignmentAllowed $governancePolicy $activeActor $activeRole $activeModel $activeEffort)){Add-Failure "active TASK assignment is not allowed by POLICY: $activeActor/$activeRole/$activeModel/$activeEffort"}
            foreach($spec in @($adapter.Relay.Requirements.TaskMetadata)){$value=Read-Value $activeTaskText ([string]$spec.Field) $activeTaskPath;if([string]$spec.Type-ceq'boolean'-and$value-notin@('true','false')){Add-Failure "active TASK metadata boolean is invalid: $($spec.Field)"};if([string]$spec.Type-ceq'enum'-and@($spec.Allowed)-cnotcontains$value){Add-Failure "active TASK metadata enum is invalid: $($spec.Field)"}}
        } catch { Add-Failure $_.Exception.Message }
    }
    if (-not (Test-Path -LiteralPath (Project-Path "docs/ai/handoffs/$id") -PathType Container)) { Add-Failure "active handoff directory missing: $id" }
    if (-not (Test-Path -LiteralPath (Project-Path "docs/ai/reports/$id") -PathType Container)) { Add-Failure "active report directory missing: $id" }
}
try{Assert-GovernanceV1RuleSet -Rules @($governanceRules) -ExtensionDomains $adapter.ExtensionDomains | Out-Null}catch{Add-Failure "governance rule graph invalid: $($_.Exception.Message)"}

$handoff = 'none'
try {
    $taskId = Read-Value $next 'task_id' 'NEXT_ACTION'
    $actor = Read-Value $next 'next_actor' 'NEXT_ACTION'
    $role = Read-Value $next 'next_role' 'NEXT_ACTION'
    $handoff = Read-Value $next 'handoff_file' 'NEXT_ACTION'
    $policy = Read-Value $next 'executor_policy' 'NEXT_ACTION'
    $preferred = Read-Value $next 'preferred_executor' 'NEXT_ACTION'
    $allowed = Read-Value $next 'allowed_executors' 'NEXT_ACTION'
    $returnTo = Read-Value $next 'return_to' 'NEXT_ACTION'
    $nextModel = Read-Value $next 'model' 'NEXT_ACTION'
    $nextEffort = Read-Value $next 'effort' 'NEXT_ACTION'
    $actualExecutor = Read-Value $next 'actual_executor' 'NEXT_ACTION'
    $providerSubstitution = Read-Value $next 'provider_substitution' 'NEXT_ACTION'
    $reviewKind = Read-Value $next 'review_kind' 'NEXT_ACTION'
    $reviewRole = Read-Value $next 'review_role' 'NEXT_ACTION'
    $executionMode = Read-Value $next 'execution_mode' 'NEXT_ACTION'
    $repositoryAccess = Read-Value $next 'repository_access' 'NEXT_ACTION'
    $reviewStatus = Read-Value $next 'review_status' 'NEXT_ACTION'
    $requestReviewStatus = Read-Value $next 'request_review_status' 'NEXT_ACTION'
    $reviewModel = Read-Value $next 'review_model' 'NEXT_ACTION'
    $reviewEffort = Read-Value $next 'review_effort' 'NEXT_ACTION'
    $reviewedCandidate = Read-Value $next 'reviewed_candidate' 'NEXT_ACTION'
    $reviewedSpecRevision = Read-Value $next 'reviewed_spec_revision' 'NEXT_ACTION'
    $reviewRequestId = Read-Value $next 'review_request_id' 'NEXT_ACTION'
    $reviewStartedAt = Read-Value $next 'review_started_at' 'NEXT_ACTION'
    $reviewCompletedAt = Read-Value $next 'review_completed_at' 'NEXT_ACTION'
    $reviewResult = Read-Value $next 'review_result' 'NEXT_ACTION'
    $reviewFindingsCount = Read-Value $next 'review_findings_count' 'NEXT_ACTION'
    $reviewFindingIds = Read-Value $next 'review_finding_ids' 'NEXT_ACTION'
    $nextReviewStage = Read-Value $next 'review_stage' 'NEXT_ACTION'
    $nextChangesRequestedCycles = Read-Value $next 'changes_requested_cycles' 'NEXT_ACTION'
    $nextImplementationReviewAttempt = Read-Value $next 'implementation_review_attempt' 'NEXT_ACTION'
    $nextImplementationReviewProfile = Read-Value $next 'implementation_review_profile' 'NEXT_ACTION'
    $nextImplementationReviewTerminated = Read-Value $next 'implementation_review_terminated' 'NEXT_ACTION'
    foreach ($field in @('write_bridge', 'write_probe', 'relay_status')) { [void](Read-Value $next $field 'NEXT_ACTION') }

    $actorRoles = @{ ChatGPT=@('ORCHESTRATOR_AND_REVIEWER','INDEPENDENT_REVIEWER'); Codex=@('IMPLEMENTER'); Claude=@('INDEPENDENT_REVIEWER'); USER=@('USER'); NONE=@('NONE') }
    if (-not $actorRoles.ContainsKey($actor) -or $actorRoles[$actor] -cnotcontains $role) { Add-Failure "invalid actor/role: $actor/$role" }
    if ($adapter -and -not(Test-AssignmentAllowed $governancePolicy $actor $role $nextModel $nextEffort)) { Add-Failure "NEXT_ACTION assignment is not allowed by POLICY: $actor/$role/$nextModel/$nextEffort" }
    if ($policy -cne [string]$governancePolicy.IndependentReview.ExecutorPolicy) { Add-Failure "invalid executor_policy: $policy" }
    if ($role -eq 'INDEPENDENT_REVIEWER') {
        if ($preferred -cne [string]$governancePolicy.IndependentReview.ActiveExecutor) { Add-Failure 'independent reviewer preferred_executor does not match POLICY' }
        if ($policy -cne [string]$governancePolicy.IndependentReview.ExecutorPolicy) { Add-Failure 'independent reviewer executor_policy does not match POLICY' }
        if ($allowed -cne [string]$governancePolicy.IndependentReview.ActiveExecutor) { Add-Failure 'independent reviewer allowed_executors does not match POLICY' }
        if($actualExecutor-cne$actor){Add-Failure 'independent review actual_executor must match next_actor'}
        if($actor-cne[string]$governancePolicy.IndependentReview.ActiveExecutor-or$providerSubstitution-cne[string]$governancePolicy.IndependentReview.ProviderSubstitution){Add-Failure 'independent review executor/substitution does not match POLICY'}
        if($reviewRole-cne'INDEPENDENT_REVIEWER'){Add-Failure 'independent review review_role must be INDEPENDENT_REVIEWER'}
        if(@($governancePolicy.IndependentReview.AllowedKinds)-cnotcontains$reviewKind){Add-Failure 'independent review kind is invalid'}
        if($executionMode-cne'separate_session'){Add-Failure 'independent review execution_mode must be separate_session'}
        if($repositoryAccess-cne'true'){Add-Failure 'independent review repository_access must be true'}
        if($reviewStatus-cne'requested'){Add-Failure 'independent review review_status must be requested'}
        if($requestReviewStatus-cne'requested'){Add-Failure 'independent review request_review_status must be requested'}
        if($reviewModel-cne$nextModel-or$reviewEffort-cne$nextEffort){Add-Failure 'independent review model/effort identity mismatch'}
        $taskText=Read-ProjectFile "docs/ai/tasks/$taskId.md"
        foreach($pair in @(@('review_kind',$reviewKind),@('review_role',$reviewRole),@('execution_mode',$executionMode),@('repository_access',$repositoryAccess),@('review_status',$reviewStatus),@('request_review_status',$requestReviewStatus),@('review_model',$reviewModel),@('review_effort',$reviewEffort),@('preferred_executor',$preferred),@('actual_executor',$actualExecutor),@('provider_substitution',$providerSubstitution),@('reviewed_candidate',$reviewedCandidate),@('reviewed_spec_revision',$reviewedSpecRevision),@('review_request_id',$reviewRequestId),@('review_started_at',$reviewStartedAt))){if((Read-Value $taskText $pair[0] "TASK $taskId")-cne$pair[1]){Add-Failure "independent review TASK field mismatch: $($pair[0])"}}
        if($reviewRequestId-notmatch'^[A-F0-9]{64}$'){Add-Failure 'independent review request_id is invalid'}
        if($actor-ceq'Claude'-and(Read-Value $taskText "claude_${reviewKind}_review_status" "TASK $taskId")-cne'requested'){Add-Failure 'Claude provider review status must be requested'}
    } elseif ($reviewStatus -ceq 'completed') {
        if(@($governancePolicy.IndependentReview.AllowedKinds)-cnotcontains$reviewKind){Add-Failure 'completed independent review kind is invalid'}
        if($actualExecutor-cne[string]$governancePolicy.IndependentReview.ActiveExecutor){Add-Failure 'completed independent review actual_executor is invalid'}
        if($executionMode-cne'separate_session'-or$repositoryAccess-cne'true'){Add-Failure 'completed independent review execution context is invalid'}
        if($reviewedCandidate-notmatch'^[0-9a-f]{40}$'-or$reviewedSpecRevision-notmatch'^\d+$'-or$reviewRequestId-notmatch'^[A-F0-9]{64}$'){Add-Failure 'completed independent review identity is invalid'}
        if($reviewStartedAt-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'-or$reviewCompletedAt-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){Add-Failure 'completed independent review audit timestamps are invalid'}
        if($reviewResult-notin@('NO_BLOCKING_FINDINGS','CHANGES_RECOMMENDED','BLOCKED','FAILED')-or$reviewFindingsCount-notmatch'^\d+$'-or[string]::IsNullOrWhiteSpace($reviewFindingIds)){Add-Failure 'completed independent review result audit is invalid'}
        $taskText=Read-ProjectFile "docs/ai/tasks/$taskId.md"
        foreach($field in @('review_kind','review_role','review_status','request_review_status','review_model','review_effort','preferred_executor','actual_executor','provider_substitution','executor_policy','reviewed_candidate','reviewed_spec_revision','review_request_id','review_started_at','review_completed_at','review_result','review_findings_count','review_finding_ids')){if((Read-Value $taskText $field "TASK $taskId")-cne(Read-Value $next $field 'NEXT_ACTION')){Add-Failure "completed independent review TASK field mismatch: $field"}}
        if(Test-Path -LiteralPath (Project-Path $handoff)-PathType Leaf){$auditHandoff=Read-ProjectFile $handoff;foreach($field in @('review_kind','review_role','review_status','request_review_status','review_model','review_effort','preferred_executor','actual_executor','provider_substitution','executor_policy','reviewed_candidate','reviewed_spec_revision','review_request_id','review_started_at','review_completed_at','review_result','review_findings_count','review_finding_ids')){if((Read-Value $auditHandoff $field $handoff)-cne(Read-Value $next $field 'NEXT_ACTION')){Add-Failure "completed independent review handoff mismatch: $field"}}}
        if($actualExecutor-cne[string]$governancePolicy.IndependentReview.ActiveExecutor){Add-Failure 'independent review executor does not match POLICY'}
        if((Split-Path -Leaf $handoff)-ceq'INDEPENDENT_REVIEW_RESULT_HANDOFF.md'-and($actor-cne'ChatGPT'-or$role-cne'ORCHESTRATOR_AND_REVIEWER')){Add-Failure 'completed independent review result handoff must return to ChatGPT'}
    }
    if ($taskId -eq 'none') {
        if ($active.Count -ne 0) { Add-Failure 'NEXT_ACTION says none while active TASK exists' }
        if ($handoff -eq 'none') { Add-Failure 'idle NEXT_ACTION handoff must be permanent, not none' }
        if ($adapter -and $handoff -cne [string]$adapter.PermanentRequirementsHandoff) { Add-Failure 'idle NEXT_ACTION handoff does not match project adapter' }
    } elseif ($active.Count -ne 1 -or $active[0] -cne $taskId) {
        Add-Failure 'NEXT_ACTION task does not match active TASK'
    }
    if (-not (Test-Path -LiteralPath (Project-Path $handoff) -PathType Leaf)) { Add-Failure "NEXT_ACTION handoff missing: $handoff" }
    elseif($taskId-ne'none'){
        $handoffText=Read-ProjectFile $handoff
        $identityPairs=@(
            @('task_id',(Read-HandoffIdentityValue $handoffText @('task_id') $handoff),$taskId),
            @('phase',(Read-HandoffIdentityValue $handoffText @('phase','next_phase') $handoff),(Read-Value $next 'phase' 'NEXT_ACTION')),
            @('actor',(Read-HandoffIdentityValue $handoffText @('actor','next_actor') $handoff),$actor),
            @('role',(Read-HandoffIdentityValue $handoffText @('role','next_role') $handoff),$role),
            @('model',(Read-HandoffIdentityValue $handoffText @('model') $handoff),$nextModel),
            @('effort',(Read-HandoffIdentityValue $handoffText @('effort') $handoff),$nextEffort),
            @('candidate_commit',(Read-HandoffIdentityValue $handoffText @('candidate_commit') $handoff),$reviewedCandidate),
            @('shared_candidate',(Read-HandoffIdentityValue $handoffText @('shared_candidate') $handoff),(Read-Value $next 'rules_commit' 'NEXT_ACTION'))
        )
        foreach($pair in $identityPairs){if([string]$pair[1]-cne[string]$pair[2]){Add-Failure "handoff route identity mismatch: $($pair[0])"}}
    }
    if ([string]::IsNullOrWhiteSpace($returnTo)) { Add-Failure 'NEXT_ACTION return_to is empty' }
    $relayHandoffs=@{
        'DESIGN_APPROVED_HANDOFF.md'=@{Decision='APPROVED';Status='ready';Phase='implementation';Actor='Codex';Role='IMPLEMENTER'}
        'DESIGN_REVISION_HANDOFF.md'=@{Decision='CHANGES_REQUESTED';Status='changes_requested';Phase='design';Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER'}
        'RELEASE_HANDOFF.md'=@{Decision='APPROVED';Status='approved';Phase='release';Actor='Codex';Role='IMPLEMENTER'}
        'RELAY_HANDOFF.md'=@{Decision='CHANGES_REQUESTED';Status='changes_requested';Phase='implementation';Actor='Codex';Role='IMPLEMENTER'}
        'BLOCKED_HANDOFF.md'=@{Decision='BLOCKED';Status='blocked';Phase='blocked';Actor='dynamic';Role='dynamic'}
        'USER_DECISION_HANDOFF.md'=@{Decision='NEEDS_USER_DECISION';Status='needs_user_decision';Phase='user_decision';Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER'}
        'CODEX_HANDOFF.md'=@{Decision='REQUIREMENTS_DEFINED';Status='ready';Phase='implementation';Actor='Codex';Role='IMPLEMENTER'}
        'INDEPENDENT_REVIEW_HANDOFF.md'=@{Decision='INDEPENDENT_REVIEW_REQUESTED';Status='review_requested';Phase='dynamic';Actor='dynamic';Role='INDEPENDENT_REVIEWER'}
        'INDEPENDENT_REVIEW_RESULT_HANDOFF.md'=@{Decision='INDEPENDENT_REVIEW_COMPLETED';Status='review_completed';Phase='dynamic';Actor='ChatGPT';Role='ORCHESTRATOR_AND_REVIEWER'}
    }
    $handoffName=Split-Path -Leaf $handoff;$isRelayHandoff=(Test-Path -LiteralPath (Project-Path $handoff)-PathType Leaf)-and((Read-ProjectFile $handoff)-match'(?m)^# RELAY HANDOFF')
    if($taskId-ne'none'-and$isRelayHandoff-and$relayHandoffs.ContainsKey($handoffName)){
        $expected=$relayHandoffs[$handoffName];$taskText=Read-ProjectFile "docs/ai/tasks/$taskId.md"
        foreach($pair in @(@('status',$expected.Status),@('next_actor',$actor),@('next_role',$role))){if((Read-Value $taskText $pair[0] "TASK $taskId")-cne$pair[1]){Add-Failure "relay TASK transition mismatch: $($pair[0])"}}
        if($expected.Phase-cne'dynamic'-and(Read-Value $taskText 'current_phase' "TASK $taskId")-cne$expected.Phase){Add-Failure 'relay TASK transition mismatch: current_phase'}
        if($expected.Actor-cne'dynamic'-and($actor-cne$expected.Actor-or$role-cne$expected.Role)){Add-Failure "relay decision actor/role mismatch: $($expected.Decision)"}
        $relayHandoffText=Read-ProjectFile $handoff;$relaySchemaMatch=[regex]::Match($relayHandoffText,'(?m)^\s*-\s*relay_schema:\s*(\d+)\s*$');if(-not$relaySchemaMatch.Success){throw "Missing 'relay_schema' in $handoff"};$relaySchema=$relaySchemaMatch.Groups[1].Value
        if($relaySchema-ceq'2'){
            $canonical="docs/ai/reports/$taskId/RELAY_BUNDLE.json"
            if(-not(Test-Path -LiteralPath (Project-Path $canonical)-PathType Leaf)){
                Add-Failure "canonical relay bundle missing: $canonical"
            }else{
                try{
                    $canonicalPath=Project-Path $canonical
                    $canonicalSha=(Get-FileHash -Algorithm SHA256 -LiteralPath $canonicalPath).Hash
                    $canonicalBytes=(Get-Item -LiteralPath $canonicalPath).Length
                    & (Project-Path 'docs/ai/generated/shared/tools/relay-bundle.ps1') -Action Validate -ProjectRoot $root -BundlePath $canonicalPath -ExpectedSha256 $canonicalSha -ExpectedBytes $canonicalBytes | Out-Null
                    if(-not$?){throw 'canonical relay semantic validation failed'}
                    $relay=Read-ProjectFile $canonical|ConvertFrom-Json
                    $sourceDecisionMatch=[regex]::Match($relayHandoffText,'(?m)^- source_decision:\s*(.*?)\s*$')
                    $handoffCyclesMatch=[regex]::Match($relayHandoffText,'(?m)^-\s*changes_requested_cycles:\s*(\d+)\s*$');$handoffAttemptMatch=[regex]::Match($relayHandoffText,'(?m)^-\s*implementation_review_attempt:\s*(\d+)\s*$');$handoffProfileMatch=[regex]::Match($relayHandoffText,'(?m)^-\s*implementation_review_profile:\s*(\S+)\s*$');$handoffTerminatedMatch=[regex]::Match($relayHandoffText,'(?m)^-\s*implementation_review_terminated:\s*(\S+)\s*$')
                    $confirmationMatch=[regex]::Match($next,'(?m)^user_confirmation_required:\s*(\S+)\s*$');$promptMatch=[regex]::Match($next,'(?m)^user_confirmation_prompt:\s*(.*?)\s*$')
                    $terminalReviewGate=$expected.Decision-ceq'NEEDS_USER_DECISION'-and$sourceDecisionMatch.Success-and$sourceDecisionMatch.Groups[1].Value.Trim()-ceq'CHANGES_REQUESTED'-and[string]$relay.decision-ceq'CHANGES_REQUESTED'-and[string]$relay.review_stage-ceq'implementation'-and$handoffCyclesMatch.Success-and[int]$handoffCyclesMatch.Groups[1].Value-eq3-and$handoffAttemptMatch.Success-and[int]$handoffAttemptMatch.Groups[1].Value-eq3-and$handoffProfileMatch.Success-and$handoffProfileMatch.Groups[1].Value-ceq'terminal'-and$handoffTerminatedMatch.Success-and$handoffTerminatedMatch.Groups[1].Value-ceq'true'-and$actor-ceq'ChatGPT'-and$role-ceq'ORCHESTRATOR_AND_REVIEWER'-and$confirmationMatch.Success-and$confirmationMatch.Groups[1].Value-ceq'true'-and$promptMatch.Success-and$promptMatch.Groups[1].Value.Trim()-cne'none'-and[string]$relay.relay_recipient-ceq'Codex'-and[string]$relay.relay_recipient_role-ceq'IMPLEMENTER'
                    if([int]$relay.schema_version-ne2-or(-not$terminalReviewGate-and[string]$relay.decision-cne$expected.Decision)-or[string]$relay.task_id-cne$taskId-or(-not$terminalReviewGate-and([string]$relay.relay_recipient-cne'Codex'-or[string]$relay.relay_recipient_role-cne'IMPLEMENTER'))){
                        Add-Failure 'canonical relay bundle does not match TASK transition'
                    }
                    $reportRelative="docs/ai/reports/$taskId/RELAY_IMPORT.md"
                    if(-not(Test-Path -LiteralPath (Project-Path $reportRelative)-PathType Leaf)){Add-Failure "relay import report missing: $reportRelative"}else{
                        $reportText=Read-ProjectFile $reportRelative
                        $convergenceExpected=[ordered]@{
                            review_stage=$nextReviewStage
                            changes_requested_cycles=$nextChangesRequestedCycles
                            implementation_review_attempt=$nextImplementationReviewAttempt
                            implementation_review_profile=$nextImplementationReviewProfile
                            implementation_review_terminated=$nextImplementationReviewTerminated
                        }
                        foreach($field in $convergenceExpected.Keys){
                            $expectedValue=[string]$convergenceExpected[$field]
                            foreach($source in @(
                                [pscustomobject]@{Text=$taskText;Name="TASK $taskId"},
                                [pscustomobject]@{Text=$state;Name='CURRENT_STATE'},
                                [pscustomobject]@{Text=$relayHandoffText;Name=$handoff}
                            )){if((Read-Value $source.Text $field $source.Name)-cne$expectedValue){Add-Failure "implementation review convergence mismatch: $field in $($source.Name)"}}
                        }
                        if($nextChangesRequestedCycles-notmatch'^[0-3]$'-or$nextImplementationReviewAttempt-notmatch'^[1-3]$'-or$nextImplementationReviewTerminated-notin@('true','false')){Add-Failure 'implementation review convergence state contains an invalid scalar'}else{
                            $cycles=[int]$nextChangesRequestedCycles
                            $expectedAttempt=if($cycles-eq0){'1'}elseif($cycles-eq1){'2'}else{'3'}
                            $expectedProfile=if($cycles-eq0){'standard'}elseif($cycles-eq1){'narrowed'}else{'terminal'}
                            $expectedTerminated=if($cycles-eq3){'true'}else{'false'}
                            if($nextImplementationReviewAttempt-cne$expectedAttempt-or$nextImplementationReviewProfile-cne$expectedProfile-or$nextImplementationReviewTerminated-cne$expectedTerminated){Add-Failure 'implementation review convergence state combination is invalid'}
                            if($cycles-eq3-and($handoffName-cne'USER_DECISION_HANDOFF.md'-or$actor-cne'ChatGPT'-or$role-cne'ORCHESTRATOR_AND_REVIEWER'-or-not$confirmationMatch.Success-or$confirmationMatch.Groups[1].Value-cne'true'-or-not$promptMatch.Success-or$promptMatch.Groups[1].Value.Trim()-ceq'none')){Add-Failure 'terminated implementation review must route to ChatGPT with user confirmation'}
                        }
                    }
                    if([string]$relay.review_stage-ceq'implementation'-and[string]$relay.decision-in@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){
                        $actionableIds=if($null-eq$relay.finding_dispositions){@($relay.findings|ForEach-Object{[string]$_.id})}else{@($relay.finding_dispositions|Where-Object{[string]$_.status-in@('accepted','needs_user_decision')}|ForEach-Object{[string]$_.finding_id})}
                        $actionable=@($relay.findings|Where-Object{$actionableIds-ccontains[string]$_.id})
                        $reviewCycles=[int]$nextChangesRequestedCycles
                        if([string]$relay.decision-ceq'CHANGES_REQUESTED'){$reviewCycles--}
                        if($reviewCycles-le1-and$actionable.Count-gt2){Add-Failure 'standard implementation review exceeds actionable finding limit'}
                        if($reviewCycles-eq2){
                            $nonRelaxable=@('calculation_accuracy','decision_accuracy','data_preservation','rollback','raw_byte_portability','validator','required_test','release_gate','security','backward_compatibility')
                            foreach($finding in $actionable){if($nonRelaxable-cnotcontains[string]$finding.review_scope-or[string]$finding.severity-notin@('BLOCKER','MAJOR')){Add-Failure "terminal review contains a prohibited finding: $($finding.id)"}}
                        }
                    }
                    if($null-ne$relay.finding_dispositions){
                        $requiredMatch=[regex]::Match($relayHandoffText,'(?s)## Required changes\s*(?<body>.*?)\s*## User decisions required')
                        $auditMatch=[regex]::Match($relayHandoffText,'(?s)## Independent review disposition audit\s*(?<body>.*?)\s*## Acceptance criteria')
                        if(-not$requiredMatch.Success-or-not$auditMatch.Success){Add-Failure 'finding disposition handoff sections are missing'}else{
                            foreach($disposition in @($relay.finding_dispositions)){
                                $id=[string]$disposition.finding_id;$accepted=[string]$disposition.status-ceq'accepted'
                                if($accepted-ne($requiredMatch.Groups['body'].Value-match("(?m)^- "+[regex]::Escape($id)+"\b"))){Add-Failure "accepted-only required change mismatch: $id"}
                                if($auditMatch.Groups['body'].Value-notmatch([regex]::Escape($id)+'.*disposition='+[regex]::Escape([string]$disposition.status)+'.*reason='+[regex]::Escape([string]$disposition.reason))){Add-Failure "finding disposition audit mismatch: $id"}
                            }
                        }
                    }
                    if($expected.Decision-ceq'INDEPENDENT_REVIEW_REQUESTED'){
                        $requestAudit=[ordered]@{
                            review_kind=[string]$relay.independent_review.kind
                            review_role=[string]$relay.independent_review.review_role
                            request_review_status=[string]$relay.independent_review.review_status
                            review_model=[string]$relay.independent_review.model
                            review_effort=[string]$relay.independent_review.effort
                            preferred_executor=[string]$relay.independent_review.preferred_executor
                            reviewed_candidate=[string]$relay.independent_review.reviewed_candidate
                            reviewed_spec_revision=[string]$relay.independent_review.reviewed_spec_revision
                            review_request_id=[string]$relay.independent_review.request_id
                            actual_executor=[string]$relay.independent_review.actual_executor
                            execution_mode=[string]$relay.independent_review.execution_mode
                            repository_access=(([string][bool]$relay.independent_review.repository_access).ToLowerInvariant())
                            provider_substitution=[string]$relay.independent_review.provider_substitution
                            executor_policy=[string]$relay.independent_review.executor_policy
                            review_started_at=[string]$relay.independent_review.started_at
                        }
                        foreach($pair in $requestAudit.GetEnumerator()){
                            if((Read-Value $next $pair.Key 'NEXT_ACTION')-cne[string]$pair.Value-or(Read-Value $taskText $pair.Key "TASK $taskId")-cne[string]$pair.Value-or(Read-Value $relayHandoffText $pair.Key $handoff)-cne[string]$pair.Value){
                                Add-Failure "canonical review request audit mismatch: $($pair.Key)"
                            }
                        }
                    }
                    if($reviewStatus-ceq'completed'){
                        $result=$relay.independent_review_result
                        if($null-eq$result){
                            Add-Failure 'completed independent review canonical audit is missing'
                        }else{
                            $resultAudit=[ordered]@{
                                review_kind=[string]$result.review_kind
                                review_role=[string]$result.review_role
                                review_status=[string]$result.review_status
                                request_review_status=[string]$result.request_review_status
                                review_model=[string]$result.model
                                review_effort=[string]$result.effort
                                preferred_executor=[string]$result.preferred_executor
                                actual_executor=[string]$result.actual_executor
                                provider_substitution=[string]$result.provider_substitution
                                executor_policy=[string]$result.executor_policy
                                reviewed_candidate=[string]$result.reviewed_candidate
                                reviewed_spec_revision=[string]$result.spec_revision
                                review_request_id=[string]$result.request_id
                                review_started_at=[string]$result.started_at
                                review_completed_at=[string]$result.completed_at
                                review_result=[string]$result.result
                                review_findings_count=[string]$result.findings_count
                                review_finding_ids=[string]$result.finding_ids
                            }
                            foreach($pair in $resultAudit.GetEnumerator()){
                                if((Read-Value $next $pair.Key 'NEXT_ACTION')-cne[string]$pair.Value-or(Read-Value $taskText $pair.Key "TASK $taskId")-cne[string]$pair.Value-or(Read-Value $relayHandoffText $pair.Key $handoff)-cne[string]$pair.Value){
                                    Add-Failure "canonical completed review audit mismatch: $($pair.Key)"
                                }
                            }
                        }
                    }
                }catch{Add-Failure "canonical relay bundle invalid: $($_.Exception.Message)"}
            }
        }elseif($relaySchema-cne'1'){
            Add-Failure "unsupported active relay schema: $relaySchema"
        }
    }
} catch { Add-Failure $_.Exception.Message }

$canonicalSnapshotPaths=@('source/AGENTS.md','core/START.md','core/POLICY.psd1','core/CONSTITUTION.md','core/OUTPUT.md','core/LIFECYCLE.md','core/ARTIFACTS.md','core/EXECUTION.md')
foreach($relative in $canonicalSnapshotPaths){if(-not(Test-Path -LiteralPath (Project-Path "docs/ai/generated/shared/$relative") -PathType Leaf)){Add-Failure "canonical governance snapshot is missing: $relative"}}
$obsoleteSnapshotPaths=@('CHAT_OUTPUT.md','GO_PROTOCOL.md','ROLES.md','TASK_LIFECYCLE.md','HANDOFF_CONTRACT.md','REVIEW_CONTRACT.md','BROWSER_EVIDENCE.md','PROGRESS_CONTRACT.md')
foreach($relative in $obsoleteSnapshotPaths){if(Test-Path -LiteralPath (Project-Path "docs/ai/generated/shared/$relative") -PathType Leaf){Add-Failure "obsolete governance snapshot owner remains: $relative"}}
$session = if(Test-Path -LiteralPath (Project-Path 'docs/ai/SESSION_START.md')){Read-ProjectFile 'docs/ai/SESSION_START.md'}else{''}
if($session.IndexOf('artifact_role',[StringComparison]::Ordinal)-lt0-or$session.IndexOf('lock_file',[StringComparison]::Ordinal)-lt0){Add-Failure 'SESSION_START artifact identity is incomplete'}

if ($adapter) {
    $mode = [string]$adapter.ProductIdentity.Mode
    if ($mode -eq 'single_file') {
        try {
            $projectRulesText=Read-ProjectFile 'docs/ai/PROJECT_RULES.md'
            if($projectRulesText-match'(?m)^product_(path|commit|sha256|bytes|blob):'){Add-Failure 'PROJECT_RULES must not duplicate product identity values'}
            foreach($legacyKey in @('File','Commit','Sha256','Bytes','Blob')){if($adapter.ProductIdentity.ContainsKey($legacyKey)){Add-Failure "product identity must not be duplicated in adapter: $legacyKey"}}
            $identitySource = [string]$adapter.ProductIdentity.SourceFile
            $prefix = [string]$adapter.ProductIdentity.FieldPrefix
            if([string]::IsNullOrWhiteSpace($identitySource)-or[string]::IsNullOrWhiteSpace($prefix)){throw 'single_file product identity requires SourceFile and FieldPrefix'}
            $identityText=Read-ProjectFile $identitySource
            $productPath = Read-Value $identityText ($prefix+'file') $identitySource
            $expectedCommit = Read-Value $identityText ($prefix+'commit') $identitySource
            $expectedSha = Read-Value $identityText ($prefix+'sha256') $identitySource
            $expectedBytes = [long](Read-Value $identityText ($prefix+'bytes') $identitySource)
            $expectedBlob = Read-Value $identityText ($prefix+'blob') $identitySource
            if($expectedCommit-notmatch'^[0-9a-f]{40}$'-or$expectedSha-notmatch'^[A-F0-9]{64}$'-or$expectedBlob-notmatch'^[0-9a-f]{40}$'){throw 'product identity source has invalid exact identity'}
            $product = Project-Path $productPath
            if ((Get-FileHash -Algorithm SHA256 -LiteralPath $product).Hash -cne $expectedSha) { Add-Failure 'product SHA-256 changed' }
            if ((Get-Item -LiteralPath $product).Length -ne $expectedBytes) { Add-Failure 'product bytes changed' }
            $blob = (git -C $root hash-object -- $productPath).Trim()
            if ($LASTEXITCODE -ne 0 -or $blob -cne $expectedBlob) { Add-Failure 'product Git blob changed' }
            $commitBlob = (git -C $root rev-parse "$expectedCommit`:$productPath").Trim()
            if ($LASTEXITCODE -ne 0 -or $commitBlob -cne $expectedBlob) { Add-Failure 'product commit/blob identity mismatch' }
            $blobBytes = (git -C $root cat-file -s $expectedBlob).Trim()
            if ($LASTEXITCODE -ne 0 -or [long]$blobBytes -ne $expectedBytes) { Add-Failure 'product blob/bytes identity mismatch' }
        } catch { Add-Failure "product identity check failed: $($_.Exception.Message)" }
    } elseif ($mode -ne 'none') {
        Add-Failure "unknown product identity mode: $mode"
    }
}

$startup = @('AGENTS.md', 'docs/ai/generated/shared/core/START.md', 'docs/ai/PROJECT_ADAPTER.psd1', 'docs/ai/PROJECT_RULES.md', 'docs/ai/CURRENT_STATE.md', 'docs/ai/NEXT_ACTION.yml')
if ($handoff -and $handoff -ne 'none') { $startup += $handoff }
foreach ($id in $active) { $startup += "docs/ai/tasks/$id.md" }
$startupBytes = 0
foreach ($relative in $startup | Select-Object -Unique) {
    if (Test-Path -LiteralPath (Project-Path $relative)) { $startupBytes += (Get-Item -LiteralPath (Project-Path $relative)).Length }
}
$limit = if ($adapter -and $adapter.StartupContextLimitBytes) { [long]$adapter.StartupContextLimitBytes } else { 65536 }
if ($startupBytes -gt $limit) { Add-Failure "startup context exceeds limit: $startupBytes / $limit" }

if ($failures.Count) {
    foreach ($failure in $failures) { [Console]::Error.WriteLine("shared project error: $failure") }
    Write-Output "Shared project validation failed: $($failures.Count) issue(s)."
    exit 1
}

if (-not $SkipOverlay -and $adapter.ProjectOverlayValidator -and $adapter.ProjectOverlayValidator -ne 'none') {
    $overlay = Project-Path ([string]$adapter.ProjectOverlayValidator)
    if (-not (Test-Path -LiteralPath $overlay -PathType Leaf)) { Write-Error "Project overlay validator missing: $overlay"; exit 1 }
    & $overlay
    $overlayOk = $?
    if (-not $overlayOk) { Write-Error 'Project overlay validator failed.'; exit 1 }
}

Write-Output "Shared project validation passed. active_tasks=$($active.Count) startup_context_bytes=$startupBytes product_mode=$($adapter.ProductIdentity.Mode)"
