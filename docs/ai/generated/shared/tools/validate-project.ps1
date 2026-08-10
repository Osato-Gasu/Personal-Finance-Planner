# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$ProjectRoot,[switch]$SkipOverlay)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root = [IO.Path]::GetFullPath($ProjectRoot)
$failures = [Collections.Generic.List[string]]::new()

function Project-Path([string]$Relative) { Join-Path $root $Relative }
function Read-ProjectFile([string]$Relative) { [IO.File]::ReadAllText((Project-Path $Relative)) }
function Add-Failure([string]$Message) { $script:failures.Add($Message) }
function Test-AssignmentAllowed($Adapter,[string]$Actor,[string]$Role,[string]$Model,[string]$Effort) {
    $core=@{'5.3 Codex Spark|high'='Spark-high';'5.3 Codex Spark|xhigh'='Spark-xhigh';'5.6 Luna|high'='Luna-high';'5.6 Luna|xhigh'='Luna-xhigh';'5.6 Terra|high'='Terra-high';'5.6 Terra|xhigh'='Terra-xhigh';'5.6 Sol|medium'='Sol-medium';'5.6 Sol|high'='Sol-high';'5.6 Sol|xhigh'='Sol-xhigh';'5.6 Sol|Ultra'='Sol-Ultra'}
    $review=@{'5.6 Luna|high'='Luna-high';'5.6 Luna|xhigh'='Luna-xhigh';'5.6 Terra|high'='Terra-high';'5.6 Terra|xhigh'='Terra-xhigh';'5.6 Sol|medium'='Sol-medium';'5.6 Sol|high'='Sol-high';'5.6 Sol|xhigh'='Sol-xhigh';'5.6 Sol|Ultra'='Sol-Ultra'}
    $pair="$Model|$Effort"
    if($core.ContainsKey($pair)-and@($Adapter.ModelRouting.DeprecatedRoutes)-ccontains$core[$pair]){return $false}
    if (@($Adapter.Relay.Assignments) -ccontains "$Actor|$Role|$Model|$Effort") { return $true }
    if($null-ne$Adapter.ModelRouting-and$Actor-ceq'Codex'-and$Role-ceq'IMPLEMENTER'-and$core.ContainsKey($pair)-and@($Adapter.ModelRouting.CoreRoutes)-ccontains$core[$pair]){return $true}
    if($null-ne$Adapter.ModelRouting-and$Actor-ceq'ChatGPT'-and$Role-ceq'ORCHESTRATOR_AND_REVIEWER'-and$review.ContainsKey($pair)-and@($Adapter.ModelRouting.ReviewRoutes)-ccontains$review[$pair]){return $true}
    $review=$Adapter.Relay.IndependentReview
    if($null-eq$review-or$Role-cne'INDEPENDENT_REVIEWER'){return $false}
    if($Actor-ceq[string]$review.PreferredExecutor){return $Model-notmatch'(?i)^(none|unknown|tbd|runtime[-_ ]selected)$'-and$Effort-notmatch'(?i)^(none|unknown|tbd|runtime[-_ ]selected)$'}
    if($Actor-ceq[string]$review.FallbackExecutor){return @($review.FallbackAssignments)-ccontains"$Actor|$Role|$Model|$Effort"}
    return $false
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

$required = @(
    'AGENTS.md',
    'docs/ai/PROJECT_ADAPTER.psd1',
    'docs/ai/PROJECT_RULES.md',
    'docs/ai/CURRENT_STATE.md',
    'docs/ai/BACKLOG.md',
    'docs/ai/NEXT_ACTION.yml',
    'docs/ai/SESSION_START.md',
    'docs/ai/SHARED_RULES.lock.yml',
    'docs/ai/generated/shared/START.md',
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
$taskHistoryPolicy = 'git_only'
$retainedTaskPairs = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
try {
    $adapter = Import-AdapterFile -Path (Project-Path 'docs/ai/PROJECT_ADAPTER.psd1') -ExpectedBom present
    if ([int]$adapter.SchemaVersion -ne 1) { Add-Failure "unsupported project adapter schema: $($adapter.SchemaVersion)" }
    $requiredPhases = @('requirements','design','design_review','implementation','implementation_review','browser_evidence','release','completion_sync','user_decision','blocked','completed')
    foreach ($phase in $requiredPhases) { if (-not $adapter.PhaseLabels.ContainsKey($phase)) { Add-Failure "project adapter missing required phase: $phase" } }
    if ($adapter.PhaseLabels.ContainsKey('done')) { Add-Failure 'project adapter must use completed instead of done' }
    if([string]::IsNullOrWhiteSpace([string]$adapter.DefaultLabelLocale)){Add-Failure 'project adapter label locale is missing'}
    foreach($phase in $requiredPhases){if([string]::IsNullOrWhiteSpace([string]$adapter.PhaseLabels[$phase])){Add-Failure "project adapter missing human phase label: $phase"}}
    foreach($role in @('ORCHESTRATOR_AND_REVIEWER','IMPLEMENTER','INDEPENDENT_REVIEWER')){if(-not$adapter.RoleLabels.ContainsKey($role)-or[string]::IsNullOrWhiteSpace([string]$adapter.RoleLabels[$role])){Add-Failure "project adapter missing human role label: $role"}}
    foreach($effort in @('medium','high','xhigh','Ultra')){if($null-eq$adapter.DisplayLabels-or$null-eq$adapter.DisplayLabels.Effort-or[string]::IsNullOrWhiteSpace([string]$adapter.DisplayLabels.Effort[$effort])){Add-Failure "project adapter missing human effort label: $effort"}}
    $routing=$adapter.ModelRouting
    if($null-ne$routing){
        $core=@($routing.CoreRoutes);$review=@($routing.ReviewRoutes);$deprecated=@($routing.DeprecatedRoutes);$declared=@($core+$review+$deprecated|Where-Object{-not[string]::IsNullOrWhiteSpace([string]$_)})
        if($core.Count-eq0-or$review.Count-eq0-or$core.Count-ne@($core|Select-Object -Unique).Count-or$review.Count-ne@($review|Select-Object -Unique).Count-or$deprecated.Count-ne@($deprecated|Select-Object -Unique).Count){Add-Failure 'project adapter model routing routes are incomplete or duplicated'}
        if([string]::IsNullOrWhiteSpace([string]$routing.DocumentDefault)-or[string]::IsNullOrWhiteSpace([string]$routing.CodeDefault)-or$declared-cnotcontains[string]$routing.DocumentDefault-or$declared-cnotcontains[string]$routing.CodeDefault){Add-Failure 'project adapter model routing defaults must be declared routes'}
        if([string]::IsNullOrWhiteSpace([string]$routing.NewWorkSelection)-or[string]$routing.LunaToSolCostRatio-notmatch'^\d+(?:\.\d+)?/\d+(?:\.\d+)?$'-or[string]$routing.TerraToSolCostRatio-notmatch'^\d+(?:\.\d+)?/\d+(?:\.\d+)?$'-or$null-eq$routing.UltraRequiresUserApproval-or$routing.UltraRequiresUserApproval.GetType()-ne[bool]){Add-Failure 'project adapter model routing policy values are invalid'}
    }
    if (-not $adapter.Relay -or [string]::IsNullOrWhiteSpace([string]$adapter.Relay.Repository)) { Add-Failure 'project adapter relay repository is missing' }
    if (@($adapter.Relay.Assignments).Count -eq 0) { Add-Failure 'project adapter relay assignments are missing' }
    foreach ($decision in @('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION','REQUIREMENTS_DEFINED','INDEPENDENT_REVIEW_REQUESTED','INDEPENDENT_REVIEW_COMPLETED')) { if ([string]::IsNullOrWhiteSpace([string]$adapter.Relay.NextActionTemplates[$decision])) { Add-Failure "project adapter relay next_action template is missing: $decision" } }
    if($null-eq$adapter.Relay.CandidateIdentity){Add-Failure 'project adapter relay candidate identity mapping is missing'}else{
        foreach($decision in @('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION')){$mapping=$adapter.Relay.CandidateIdentity.Decisions[$decision];foreach($stage in @('design','implementation')){if($mapping-isnot[Collections.IDictionary]-or[string]::IsNullOrWhiteSpace([string]$mapping[$stage])){Add-Failure "project adapter relay candidate field is missing: $decision/$stage"}}}
        foreach($kind in @($adapter.Relay.IndependentReview.AllowedKinds)){if([string]::IsNullOrWhiteSpace([string]$adapter.Relay.CandidateIdentity.IndependentReviewKinds[$kind])){Add-Failure "project adapter independent review candidate field is missing: $kind"}}
    }
    if([string]::IsNullOrWhiteSpace([string]$adapter.Relay.OverlayFailurePattern)){Add-Failure 'project adapter relay overlay failure pattern is missing'}
    if($null-eq$adapter.Relay.IndependentReview-or@($adapter.Relay.IndependentReview.AllowedKinds).Count-eq0){Add-Failure 'project adapter independent review configuration is missing'}
    if([string]$adapter.Relay.Requirements.BaseCommitPolicy-cne'exact_head'){Add-Failure 'project adapter requirements base commit policy must be exact_head'}
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
                if(@($adapter.PhaseLabels.Keys)-cnotcontains$phase){Add-Failure "RetainedTaskStates Phase is not declared in PhaseLabels: $phase"}
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
            $activeTaskText=[IO.File]::ReadAllText($activeTaskPath);$activePhase=Read-Value $activeTaskText 'current_phase' $activeTaskPath;$activeActor=Read-Value $activeTaskText 'next_actor' $activeTaskPath;$activeRole=Read-Value $activeTaskText 'next_role' $activeTaskPath;$activeModel=Read-Value $activeTaskText 'assigned_model' $activeTaskPath;$activeEffort=Read-Value $activeTaskText 'assigned_effort' $activeTaskPath
            if(-not$adapter.PhaseLabels.ContainsKey($activePhase)){Add-Failure "unknown active TASK phase: $activePhase"}
            if(-not(Test-AssignmentAllowed $adapter $activeActor $activeRole $activeModel $activeEffort)){Add-Failure "active TASK assignment is not allowed by project adapter: $activeActor/$activeRole/$activeModel/$activeEffort"}
            foreach($spec in @($adapter.Relay.Requirements.TaskMetadata)){$value=Read-Value $activeTaskText ([string]$spec.Field) $activeTaskPath;if([string]$spec.Type-ceq'boolean'-and$value-notin@('true','false')){Add-Failure "active TASK metadata boolean is invalid: $($spec.Field)"};if([string]$spec.Type-ceq'enum'-and@($spec.Allowed)-cnotcontains$value){Add-Failure "active TASK metadata enum is invalid: $($spec.Field)"}}
        } catch { Add-Failure $_.Exception.Message }
    }
    if (-not (Test-Path -LiteralPath (Project-Path "docs/ai/handoffs/$id") -PathType Container)) { Add-Failure "active handoff directory missing: $id" }
    if (-not (Test-Path -LiteralPath (Project-Path "docs/ai/reports/$id") -PathType Container)) { Add-Failure "active report directory missing: $id" }
}

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
    foreach ($field in @('write_bridge', 'write_probe', 'relay_status')) { [void](Read-Value $next $field 'NEXT_ACTION') }

    $actorRoles = @{ ChatGPT=@('ORCHESTRATOR_AND_REVIEWER','INDEPENDENT_REVIEWER'); Codex=@('IMPLEMENTER'); Claude=@('INDEPENDENT_REVIEWER'); USER=@('USER'); NONE=@('NONE') }
    if (-not $actorRoles.ContainsKey($actor) -or $actorRoles[$actor] -cnotcontains $role) { Add-Failure "invalid actor/role: $actor/$role" }
    if ($adapter -and -not(Test-AssignmentAllowed $adapter $actor $role $nextModel $nextEffort)) { Add-Failure "NEXT_ACTION assignment is not allowed by project adapter: $actor/$role/$nextModel/$nextEffort" }
    if ($policy -notin @('preferred_fallback', 'strict')) { Add-Failure "invalid executor_policy: $policy" }
    if ($role -eq 'INDEPENDENT_REVIEWER') {
        if ($preferred -cne 'Claude') { Add-Failure 'independent reviewer preferred_executor must be Claude' }
        if ($policy -eq 'preferred_fallback' -and $allowed -notmatch 'ChatGPT') { Add-Failure 'preferred_fallback must allow ChatGPT' }
        if ($policy -eq 'strict' -and $allowed -match 'ChatGPT') { Add-Failure 'strict policy must not allow ChatGPT' }
        if($actualExecutor-cne$actor){Add-Failure 'independent review actual_executor must match next_actor'}
        if($actor-ceq'Claude'-and$providerSubstitution-cne'none'){Add-Failure 'Claude independent review must not record provider substitution'}
        if($actor-ceq'ChatGPT'-and$providerSubstitution-cne'Claude_to_ChatGPT'){Add-Failure 'ChatGPT independent review fallback must record provider substitution'}
        if($reviewRole-cne'INDEPENDENT_REVIEWER'){Add-Failure 'independent review review_role must be INDEPENDENT_REVIEWER'}
        if(@($adapter.Relay.IndependentReview.AllowedKinds)-cnotcontains$reviewKind){Add-Failure 'independent review kind is invalid'}
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
        if(@($adapter.Relay.IndependentReview.AllowedKinds)-cnotcontains$reviewKind){Add-Failure 'completed independent review kind is invalid'}
        if($actualExecutor-notin@([string]$adapter.Relay.IndependentReview.PreferredExecutor,[string]$adapter.Relay.IndependentReview.FallbackExecutor)){Add-Failure 'completed independent review actual_executor is invalid'}
        if($executionMode-cne'separate_session'-or$repositoryAccess-cne'true'){Add-Failure 'completed independent review execution context is invalid'}
        if($reviewedCandidate-notmatch'^[0-9a-f]{40}$'-or$reviewedSpecRevision-notmatch'^\d+$'-or$reviewRequestId-notmatch'^[A-F0-9]{64}$'){Add-Failure 'completed independent review identity is invalid'}
        if($reviewStartedAt-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'-or$reviewCompletedAt-notmatch'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} JST$'){Add-Failure 'completed independent review audit timestamps are invalid'}
        if($reviewResult-notin@('NO_BLOCKING_FINDINGS','CHANGES_RECOMMENDED','BLOCKED','FAILED')-or$reviewFindingsCount-notmatch'^\d+$'-or[string]::IsNullOrWhiteSpace($reviewFindingIds)){Add-Failure 'completed independent review result audit is invalid'}
        $taskText=Read-ProjectFile "docs/ai/tasks/$taskId.md"
        foreach($field in @('review_kind','review_role','review_status','request_review_status','review_model','review_effort','preferred_executor','actual_executor','provider_substitution','executor_policy','reviewed_candidate','reviewed_spec_revision','review_request_id','review_started_at','review_completed_at','review_result','review_findings_count','review_finding_ids')){if((Read-Value $taskText $field "TASK $taskId")-cne(Read-Value $next $field 'NEXT_ACTION')){Add-Failure "completed independent review TASK field mismatch: $field"}}
        if(Test-Path -LiteralPath (Project-Path $handoff)-PathType Leaf){$auditHandoff=Read-ProjectFile $handoff;foreach($field in @('review_kind','review_role','review_status','request_review_status','review_model','review_effort','preferred_executor','actual_executor','provider_substitution','executor_policy','reviewed_candidate','reviewed_spec_revision','review_request_id','review_started_at','review_completed_at','review_result','review_findings_count','review_finding_ids')){if((Read-Value $auditHandoff $field $handoff)-cne(Read-Value $next $field 'NEXT_ACTION')){Add-Failure "completed independent review handoff mismatch: $field"}}}
        if($actualExecutor-ceq[string]$adapter.Relay.IndependentReview.PreferredExecutor-and(Read-Value $taskText "claude_${reviewKind}_review_status" "TASK $taskId")-cne'completed'){Add-Failure 'Claude provider review status must be completed'}
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
        'USER_DECISION_HANDOFF.md'=@{Decision='NEEDS_USER_DECISION';Status='needs_user_decision';Phase='user_decision';Actor='USER';Role='USER'}
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
                    $twoCycleGate=$expected.Decision-ceq'NEEDS_USER_DECISION'-and$sourceDecisionMatch.Success-and$sourceDecisionMatch.Groups[1].Value.Trim()-ceq'CHANGES_REQUESTED'-and[string]$relay.decision-ceq'CHANGES_REQUESTED'-and[string]$relay.relay_recipient-ceq'Codex'-and[string]$relay.relay_recipient_role-ceq'IMPLEMENTER'
                    if([int]$relay.schema_version-ne2-or(-not$twoCycleGate-and[string]$relay.decision-cne$expected.Decision)-or[string]$relay.task_id-cne$taskId-or(-not$twoCycleGate-and([string]$relay.relay_recipient-cne'Codex'-or[string]$relay.relay_recipient_role-cne'IMPLEMENTER'))){
                        Add-Failure 'canonical relay bundle does not match TASK transition'
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

$start = if (Test-Path -LiteralPath (Project-Path 'docs/ai/generated/shared/START.md')) { Read-ProjectFile 'docs/ai/generated/shared/START.md' } else { '' }
$chat = if (Test-Path -LiteralPath (Project-Path 'docs/ai/generated/shared/CHAT_OUTPUT.md')) { Read-ProjectFile 'docs/ai/generated/shared/CHAT_OUTPUT.md' } else { '' }
$session = if (Test-Path -LiteralPath (Project-Path 'docs/ai/SESSION_START.md')) { Read-ProjectFile 'docs/ai/SESSION_START.md' } else { '' }
$roles = if (Test-Path -LiteralPath (Project-Path 'docs/ai/generated/shared/ROLES.md')) { Read-ProjectFile 'docs/ai/generated/shared/ROLES.md' } else { '' }
$go = if (Test-Path -LiteralPath (Project-Path 'docs/ai/generated/shared/GO_PROTOCOL.md')) { Read-ProjectFile 'docs/ai/generated/shared/GO_PROTOCOL.md' } else { '' }
$route = if (Test-Path -LiteralPath (Project-Path 'docs/ai/generated/shared/tools/route-go.ps1')) { Read-ProjectFile 'docs/ai/generated/shared/tools/route-go.ps1' } else { '' }
$graphMatch=[regex]::Match($start,'(?s)```entrypoint-graph\s*(?<graph>.*?)\s*```')
if(-not$graphMatch.Success){Add-Failure 'entrypoint graph is missing'}else{
    $edges=@{};$indegree=@{};$graphLines=@($graphMatch.Groups['graph'].Value-split'\r?\n'|Where-Object{$_-match'->'})
    foreach($line in $graphLines){$parts=$line-split'\s*->\s*';if($parts.Count-ne2){Add-Failure "invalid entrypoint graph line: $line";continue};$fromNodes=@($parts[0]-split','|ForEach-Object{$_.Trim()});$toNodes=@($parts[1]-split','|ForEach-Object{$_.Trim()});foreach($node in @($fromNodes+$toNodes)){if(-not$edges.ContainsKey($node)){$edges[$node]=[Collections.Generic.List[string]]::new();$indegree[$node]=0}};foreach($from in $fromNodes){foreach($to in $toNodes){$edges[$from].Add($to);$indegree[$to]=[int]$indegree[$to]+1}}}
    $queue=[Collections.Generic.Queue[string]]::new();foreach($node in $indegree.Keys){if($indegree[$node]-eq0){$queue.Enqueue($node)}};$visited=0;while($queue.Count){$node=$queue.Dequeue();$visited++;foreach($to in $edges[$node]){$indegree[$to]=[int]$indegree[$to]-1;if($indegree[$to]-eq0){$queue.Enqueue($to)}}};if($visited-ne$indegree.Count){Add-Failure 'entrypoint graph contains a cycle'}
    foreach($requiredEdge in @('SESSION_START -> AGENTS','AGENTS -> START','START_CLOCK -> CURRENT_POSITION_OUTPUT')){if($graphLines-cnotcontains$requiredEdge){Add-Failure "entrypoint graph edge missing: $requiredEdge"}}
}
foreach ($fragment in @('## 現在地点', '- TASK-ID：', '- 機能：', '- フェーズ：', 'write bridge', 'portable relay bundle', 'active TASKがなくても')) {
    if ($start.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "GO output contract missing: $fragment" }
}
foreach ($fragment in @('## 依頼先情報', '## コピペ用プロンプト', 'USER_RELAY_REQUIRED')) {
    if ($chat.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "chat completion contract missing: $fragment" }
}
$chatTemplateMatch = [regex]::Match($chat, '(?ms)```text(?<template>.*?)```')
if ($chatTemplateMatch.Success -and ($chatTemplateMatch.Groups['template'].Value -match '実行開始時刻|実行終了時刻')) {
    Add-Failure 'normal chat template body must not expose execution timestamps'
}

foreach ($fragment in @('repository path:', 'GitHub repository:', 'entrypoint:', 'actor:', 'role:', 'session_mode:', 'routing_mode:', 'NEXT_ACTION:', 'entrypoint graph', 'silent read', 'write capability', 'USER_RELAY_REQUIRED', 'route-go.ps1', 'connector_read_only')) {
    if ($session.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "new-session contract missing: $fragment" }
}
$sessionTemplateMatch = [regex]::Match($session, '(?ms)^3\..*?##\s*3 section template(?<template>[\s\S]*?)(?=^4\.|\Z)')
if (-not $sessionTemplateMatch.Success -or
    $sessionTemplateMatch.Groups['template'].Value -notmatch '## 現在地点' -or
    $sessionTemplateMatch.Groups['template'].Value -notmatch '## 依頼先情報' -or
    $sessionTemplateMatch.Groups['template'].Value -notmatch '## コピペ用プロンプト' -or
    $sessionTemplateMatch.Groups['template'].Value -match '実行開始時刻|実行終了時刻') {
    Add-Failure 'SESSION_START normal chat template block is missing or contains timestamp fields'
}
if ($session -match '依頼先情報だけを返してください|依頼先情報だけ') { Add-Failure 'SESSION_START still contains single-section return instruction' }
if ($session -notmatch '開始時刻.*silent取得' -or $session -notmatch '実行終了時刻.*取得' -or $session -notmatch 'report') {
    Add-Failure 'SESSION_START lacks explicit silent clock capture and audit persistence contract'
}
if ($session -match '通常chat.*実行開始時刻|通常chat.*実行終了時刻') { Add-Failure 'SESSION_START should not show timestamps in normal chat fields' }
if ($sessionTemplateMatch.Success -and (
    $sessionTemplateMatch.Groups['template'].Value -notmatch 'blocker理由' -or
    $sessionTemplateMatch.Groups['template'].Value -notmatch '再開条件'
)) {
    Add-Failure 'SESSION_START prompt must keep blocker reason and resume condition'
}
if ($session -match '未着手|BLOCKED|mismatch' -and $session -notmatch '3 section') {
    Add-Failure 'SESSION_START must keep 3 section format even when work cannot start'
}

foreach ($fragment in @('preferred_fallback', 'strict', 'actual_executor: ChatGPT', 'execution_mode: separate_session', 'provider_substitution: Claude_to_ChatGPT', 'repository_access: true')) {
    if ($roles.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "review fallback contract missing: $fragment" }
}
foreach ($fragment in @('repository_write_access: available / unavailable', '正本を更新済みと記録せず', 'RELAY_BUNDLE.json', 'bundle name、SHA-256、bytes、format', 'artifactも作成不能な場合だけ', '完全なGO-only state transitionはwrite bridge利用時だけ')) {
    if ($go.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "write bridge contract missing: $fragment" }
}
foreach ($fragment in @('tools/route-go.ps1', 'connector_read_only', 'relay_recipient_role', 'actor／role', '全7 decision')) {
    if ($go.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "GO router contract missing: $fragment" }
}
foreach ($fragment in @('local_script','connector_read_only','remote_read_only','not_observable','state_write_allowed','relay_import_allowed','HANDOFF_IDENTITY_INVALID')) {
    if ($route.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) { Add-Failure "GO route result contract missing: $fragment" }
}
if ($start -notmatch '(?ms)^5\..*実行開始時刻' -or $start -notmatch '(?ms)^6\..*3 section' -or $start -notmatch '(?ms)^7\..*実行終了時刻') {
    Add-Failure 'START audit timing contract steps 5-7 is missing'
}
if ($start -notmatch 'report／handoffへ保存') { Add-Failure 'START timestamp audit persistence contract missing' }
$startTemplateHasClock = $startTemplateMatch.Success -and ($startTemplateMatch.Groups['template'].Value -match '実行開始時刻|実行終了時刻')
if ($startTemplateHasClock) { Add-Failure 'START normal chat template block contains timestamp fields' }
$startTemplateMatch = [regex]::Match($start, '(?ms)^6\..*?```text(?<template>.*?)```(?=.*^7\.)')
if (-not $startTemplateMatch.Success -or
    $startTemplateMatch.Groups['template'].Value -notmatch '## 現在地点' -or
    $startTemplateMatch.Groups['template'].Value -notmatch '## 依頼先情報' -or
    $startTemplateMatch.Groups['template'].Value -notmatch '## コピペ用プロンプト' -or
    $startTemplateMatch.Groups['template'].Value -match '実行開始時刻|実行終了時刻') {
    Add-Failure 'START normal chat template block is missing or contains timestamp fields'
}
if ($start -notmatch '(?m)^5\.\s*' -or $start -notmatch '(?m)^6\.\s*' -or $start -notmatch '(?m)^7\.\s*' -or $start -notmatch '(?ms)^5\..*?\r?\n\s*6\..*?\r?\n\s*7\.') {
    Add-Failure 'START steps 5,6,7 are not consecutive'
}

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

$startup = @('AGENTS.md', 'docs/ai/generated/shared/START.md', 'docs/ai/PROJECT_ADAPTER.psd1', 'docs/ai/PROJECT_RULES.md', 'docs/ai/CURRENT_STATE.md', 'docs/ai/NEXT_ACTION.yml')
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
