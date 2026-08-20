# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$ProjectRoot,
    [switch]$Check
)

$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'import-adapter.ps1')
$root=[IO.Path]::GetFullPath($ProjectRoot)
$policy=Import-AdapterFile -Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'core/POLICY.psd1') -ExpectedBom absent
$statePath=Join-Path $root 'docs/ai/CURRENT_STATE.md'
$taskRoot=Join-Path $root 'docs/ai/tasks'
$lockPath=Join-Path $root 'docs/ai/SHARED_RULES.lock.yml'
$adapterPath=Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
$outputPath=Join-Path $root 'docs/ai/NEXT_ACTION.yml'
$utf8NoBom=[Text.UTF8Encoding]::new($false)
function Frontmatter([string]$Text,[string]$Source){$m=[regex]::Match($Text,'\A---\r?\n(?<body>.*?)\r?\n---\r?\n',[Text.RegularExpressions.RegexOptions]::Singleline);if(-not $m.Success){throw "Missing frontmatter: $Source"};return $m.Groups['body'].Value}
function Value([string]$Text,[string]$Key,[string]$Source){$m=[regex]::Match($Text,"(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$");if(-not $m.Success){throw "Missing '$Key': $Source"};return $m.Groups[1].Value.Trim()}
function OptionalValue([string]$Text,[string]$Key,[string]$Default){$m=[regex]::Match($Text,"(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$");if(-not$m.Success){return $Default};return $m.Groups[1].Value.Trim()}

if(-not(Test-Path -LiteralPath $adapterPath -PathType Leaf)){throw 'Missing docs/ai/PROJECT_ADAPTER.psd1.'}
$adapter=Import-AdapterFile -Path $adapterPath -ExpectedBom absent
if([int]$adapter.SchemaVersion -ne[int]$policy.ProjectAdapter.SchemaVersion){throw "Unsupported project adapter schema: $($adapter.SchemaVersion)"}
if([string]::IsNullOrWhiteSpace($adapter.PermanentRequirementsHandoff)){throw 'PermanentRequirementsHandoff is required.'}
$state=[IO.File]::ReadAllText($statePath)
$stateFm=Frontmatter $state 'docs/ai/CURRENT_STATE.md'
$active=@([regex]::Matches($stateFm,'(?m)^\s+-\s+(TASK-[0-9]+)\s*$')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique)
if($stateFm -match '(?m)^active_tasks:\s*\[\]\s*$'){$active=@()}
if($active.Count -gt 1){throw "Active TASK count must be 0 or 1; found $($active.Count)."}
$lockText=[IO.File]::ReadAllText($lockPath)
$rulesVersion=Value $lockText $(if($lockText-match'(?m)^source_version:'){'source_version'}else{'version'}) 'docs/ai/SHARED_RULES.lock.yml'
$rulesCommit=Value $lockText $(if($lockText-match'(?m)^source_commit:'){'source_commit'}else{'commit'}) 'docs/ai/SHARED_RULES.lock.yml'
$updatedAt=Value $stateFm 'updated_at' 'docs/ai/CURRENT_STATE.md'

if($active.Count -eq 1){
    $taskId=$active[0];$taskPath=Join-Path $taskRoot "$taskId.md"
    if(-not(Test-Path -LiteralPath $taskPath -PathType Leaf)){throw "Active TASK file missing: docs/ai/tasks/$taskId.md"}
    $taskFm=Frontmatter ([IO.File]::ReadAllText($taskPath)) "docs/ai/tasks/$taskId.md"
    if((Value $taskFm 'task_id' $taskPath) -cne $taskId){throw 'TASK filename and task_id differ.'}
    $values=[ordered]@{
        schema_version='1';task_id=$taskId;feature=(Value $taskFm 'title' $taskPath);phase=(Value $taskFm 'current_phase' $taskPath)
        status=(Value $taskFm 'status' $taskPath);next_actor=(Value $taskFm 'next_actor' $taskPath);next_role=(Value $taskFm 'next_role' $taskPath)
        model=(Value $taskFm 'assigned_model' $taskPath);effort=(Value $taskFm 'assigned_effort' $taskPath);session_mode=(Value $taskFm 'session_mode' $taskPath)
        handoff_file=(Value $taskFm 'handoff_file' $taskPath);rules_version=$rulesVersion;rules_commit=$rulesCommit
        preferred_executor=(Value $taskFm 'preferred_executor' $taskPath);allowed_executors=(Value $taskFm 'allowed_executors' $taskPath)
        executor_policy=(Value $taskFm 'executor_policy' $taskPath);return_to=(Value $taskFm 'return_to' $taskPath)
        actual_executor=(OptionalValue $taskFm 'actual_executor' (Value $taskFm 'next_actor' $taskPath));provider_substitution=(OptionalValue $taskFm 'provider_substitution' 'none')
        review_kind=(OptionalValue $taskFm 'review_kind' 'none');review_role=(OptionalValue $taskFm 'review_role' 'none')
        execution_mode=(OptionalValue $taskFm 'execution_mode' 'existing_session');repository_access=(OptionalValue $taskFm 'repository_access' 'true');review_status=(OptionalValue $taskFm 'review_status' 'not_requested')
        request_review_status=(OptionalValue $taskFm 'request_review_status' 'none');review_model=(OptionalValue $taskFm 'review_model' 'none');review_effort=(OptionalValue $taskFm 'review_effort' 'none')
        reviewed_candidate=(OptionalValue $taskFm 'reviewed_candidate' 'none');reviewed_spec_revision=(OptionalValue $taskFm 'reviewed_spec_revision' 'none');review_request_id=(OptionalValue $taskFm 'review_request_id' 'none')
        review_started_at=(OptionalValue $taskFm 'review_started_at' 'none');review_completed_at=(OptionalValue $taskFm 'review_completed_at' 'none');review_result=(OptionalValue $taskFm 'review_result' 'none');review_findings_count=(OptionalValue $taskFm 'review_findings_count' '0');review_finding_ids=(OptionalValue $taskFm 'review_finding_ids' 'none')
        spec_revision_reset=(OptionalValue $taskFm 'spec_revision_reset' 'false');review_stage=(OptionalValue $taskFm 'review_stage' 'none');changes_requested_cycles=(OptionalValue $taskFm 'changes_requested_cycles' '0')
        implementation_review_attempt=(OptionalValue $taskFm 'implementation_review_attempt' '1');implementation_review_profile=(OptionalValue $taskFm 'implementation_review_profile' 'standard');implementation_review_terminated=(OptionalValue $taskFm 'implementation_review_terminated' 'false')
        user_confirmation_required=(OptionalValue $taskFm 'user_confirmation_required' 'false');user_confirmation_prompt=(OptionalValue $taskFm 'user_confirmation_prompt' 'none');review_termination_reason=(OptionalValue $taskFm 'review_termination_reason' 'none')
        write_bridge='required_for_state_transition';write_probe='required_for_chatgpt';relay_status='none';updated_at=$updatedAt
    }
}else{
    $zeroModel='none'
    $zeroEffort='none'
    $values=[ordered]@{
        schema_version='1';task_id='none';feature='none';phase='requirements';status='ready';next_actor='ChatGPT';next_role='ORCHESTRATOR_AND_REVIEWER'
        model=$zeroModel;effort=$zeroEffort;session_mode='existing_or_new';handoff_file=[string]$adapter.PermanentRequirementsHandoff
        rules_version=$rulesVersion;rules_commit=$rulesCommit;preferred_executor=[string]$policy.IndependentReview.ActiveExecutor;allowed_executors=[string]$policy.IndependentReview.ActiveExecutor
        executor_policy=[string]$policy.IndependentReview.ExecutorPolicy;return_to='user';write_bridge='required_for_state_transition';write_probe='required_for_chatgpt';relay_status='none';updated_at=$updatedAt
        actual_executor='ChatGPT';provider_substitution='none';review_kind='none';review_role='none';execution_mode='existing_session';repository_access='true';review_status='not_requested';request_review_status='none';review_model='none';review_effort='none';reviewed_candidate='none';reviewed_spec_revision='none';review_request_id='none';review_started_at='none';review_completed_at='none';review_result='none';review_findings_count='0';review_finding_ids='none';spec_revision_reset='false';review_stage='none';changes_requested_cycles='0';implementation_review_attempt='1';implementation_review_profile='standard';implementation_review_terminated='false';user_confirmation_required='false';user_confirmation_prompt='none';review_termination_reason='none'
    }
}
$allowedPairs=@{'ChatGPT'=@('ORCHESTRATOR_AND_REVIEWER','INDEPENDENT_REVIEWER');'Codex'=@('IMPLEMENTER');'Claude'=@('INDEPENDENT_REVIEWER');'USER'=@('USER');'NONE'=@('NONE')}
if(-not $allowedPairs.ContainsKey($values.next_actor) -or $allowedPairs[$values.next_actor] -cnotcontains $values.next_role){throw "Invalid actor/role pair: $($values.next_actor)/$($values.next_role)"}
if($values.executor_policy -cne [string]$policy.IndependentReview.ExecutorPolicy){throw "Invalid executor_policy: $($values.executor_policy)"}
$content=(($values.GetEnumerator()|ForEach-Object{"$($_.Key): $($_.Value)"}) -join "`n")+"`n"
if($Check){if(-not(Test-Path $outputPath)-or [IO.File]::ReadAllText($outputPath)-cne $content){Write-Error 'docs/ai/NEXT_ACTION.yml is out of date.';exit 1};Write-Output "NEXT_ACTION is current. task=$($values.task_id) actor=$($values.next_actor)";return}
[IO.Directory]::CreateDirectory((Split-Path -Parent $outputPath))|Out-Null
[IO.File]::WriteAllText($outputPath,$content,$utf8NoBom)
Write-Output "Generated NEXT_ACTION. task=$($values.task_id) actor=$($values.next_actor)"
