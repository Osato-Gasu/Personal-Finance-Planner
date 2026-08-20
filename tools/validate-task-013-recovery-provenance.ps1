[CmdletBinding()]
param(
    [ValidateSet('RepositoryState','ExternalRelayPreflight','CanonicalRelay','StateContractFixture','RelayContractFixture')]
    [string]$Mode = 'RepositoryState',
    [string]$ProjectRoot,
    [string]$RelayPath,
    [string]$FixturePath,
    [string]$RelayFixturePath,
    [string]$ProvenanceOverridePath
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Join-Path $PSScriptRoot '..' }
$root = [IO.Path]::GetFullPath($ProjectRoot)
$utf8Strict = [Text.UTF8Encoding]::new($false, $true)

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "TASK-013 recovery provenance BLOCKED: $Message" }
}
Assert-True ([string]::IsNullOrWhiteSpace($ProvenanceOverridePath) -or $Mode -in @('StateContractFixture','RelayContractFixture')) 'provenance override is fixture-only'
function Resolve-ProjectPath([string]$Relative) {
    Assert-True ($Relative -match '^[A-Za-z0-9._/-]+$' -and $Relative -notmatch '(^|/)\.\.(/|$)') "invalid project path: $Relative"
    $full = [IO.Path]::GetFullPath((Join-Path $root $Relative))
    $prefix = $root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
    Assert-True ($full.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) "path escapes project root: $Relative"
    $full
}
function Get-Sha256([byte[]]$Bytes) {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { ([BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace('-','') } finally { $algorithm.Dispose() }
}
function Get-Sha1([byte[]]$Bytes) {
    $algorithm = [Security.Cryptography.SHA1]::Create()
    try { ([BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace('-','').ToLowerInvariant() } finally { $algorithm.Dispose() }
}
function Get-GitBlobId([byte[]]$Bytes) {
    $header = [Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)`0")
    $combined = [byte[]]::new($header.Length + $Bytes.Length)
    [Array]::Copy($header,0,$combined,0,$header.Length)
    [Array]::Copy($Bytes,0,$combined,$header.Length,$Bytes.Length)
    Get-Sha1 $combined
}
function Read-CanonicalFile([string]$Relative) {
    $path = Resolve-ProjectPath $Relative
    Assert-True (Test-Path -LiteralPath $path -PathType Leaf) "missing file: $Relative"
    $bytes = [IO.File]::ReadAllBytes($path)
    Assert-True (-not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) "UTF-8 BOM is forbidden: $Relative"
    try { $text = $utf8Strict.GetString($bytes) } catch { throw "TASK-013 recovery provenance BLOCKED: invalid UTF-8: $Relative" }
    Assert-True (-not $text.Contains("`r") -and $text.EndsWith("`n")) "canonical LF/final-LF shape is invalid: $Relative"
    [pscustomobject]@{ Path=$path; Bytes=$bytes; Text=$text; Sha256=(Get-Sha256 $bytes); Blob=(Get-GitBlobId $bytes) }
}
function Read-ExternalCanonicalFile([string]$Path,[string]$Label) {
    Assert-True (-not [string]::IsNullOrWhiteSpace($Path)) "$Label path is required"
    $full = [IO.Path]::GetFullPath($Path)
    Assert-True (Test-Path -LiteralPath $full -PathType Leaf) "$Label file is missing"
    $bytes = [IO.File]::ReadAllBytes($full)
    Assert-True (-not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) "UTF-8 BOM is forbidden: $Label"
    try { $text = $utf8Strict.GetString($bytes) } catch { throw "TASK-013 recovery provenance BLOCKED: invalid UTF-8: $Label" }
    Assert-True (-not $text.Contains("`r") -and $text.EndsWith("`n")) "canonical LF/final-LF shape is invalid: $Label"
    [pscustomobject]@{ Path=$full; Bytes=$bytes; Text=$text; Sha256=(Get-Sha256 $bytes); Blob=(Get-GitBlobId $bytes) }
}
function Invoke-GitText([string[]]$Arguments, [string]$Failure) {
    $output = @(& git -C $root @Arguments 2>$null)
    if ($LASTEXITCODE -ne 0) { throw "TASK-013 recovery provenance BLOCKED: $Failure" }
    $output
}
function Get-GitBlobBytes([string]$Spec) {
    Assert-True ($Spec -match '^[0-9a-f]{40}:[A-Za-z0-9._/-]+$') "invalid Git blob spec: $Spec"
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = 'git'
    $start.Arguments = "-C `"$root`" cat-file blob `"$Spec`""
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($start)
    $memory = [IO.MemoryStream]::new()
    try {
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $errorText = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        Assert-True ($process.ExitCode -eq 0) "cannot read Git blob $Spec`: $errorText"
        ,$memory.ToArray()
    } finally {
        $memory.Dispose()
        $process.Dispose()
    }
}
function Get-GitTree([string]$Commit) {
    ((Invoke-GitText @('rev-parse','--verify',"$Commit`^{tree}") "cannot resolve tree for $Commit") -join '').Trim()
}
function Assert-SingleMarkdownValue([string]$Text,[string]$Key,[string]$Expected) {
    $matches = [regex]::Matches($Text,"(?m)^- $([regex]::Escape($Key)):\s*(.*?)\s*$")
    Assert-True ($matches.Count -ge 1) "original review field missing: $Key"
    foreach ($match in $matches) { Assert-True ($match.Groups[1].Value.Trim() -ceq $Expected) "original review field mismatch: $Key" }
}
function Get-LineAtByte([byte[]]$Bytes,[long]$Offset) {
    $line = 1
    for ($i=0; $i -lt $Offset; $i++) { if ($Bytes[$i] -eq 10) { $line++ } }
    $line
}
function Test-Utf8Boundary([byte[]]$Bytes,[long]$Offset) {
    if ($Offset -lt 0 -or $Offset -gt $Bytes.Length) { return $false }
    try { $null = $utf8Strict.GetString($Bytes,0,[int]$Offset); return $true } catch { return $false }
}
function Assert-Classification($Provenance) {
    $record = Read-CanonicalFile ([string]$Provenance.managed_adoption.phase_a_classification_path)
    $state = [string]$Provenance.phase_state
    if ($state -ceq 'PHASE_A_PRE_SYNC') {
        $expectedSha = [string]$Provenance.managed_adoption.phase_a_classification_sha256
        $expectedBaselineCommit = [string]$Provenance.phase_a_baseline.commit
        $expectedBaselineTree = [string]$Provenance.phase_a_baseline.tree
    } elseif ($state -in @('PHASE_B_PRE_MATERIALIZATION','PHASE_C0_MATERIALIZED')) {
        $expectedSha = [string]$Provenance.managed_adoption.approved_classification_sha256
        $expectedBaselineCommit = [string]$Provenance.managed_adoption.approved_baseline_commit
        $expectedBaselineTree = [string]$Provenance.managed_adoption.approved_baseline_tree
    } else {
        throw "TASK-013 recovery provenance BLOCKED: unknown phase_state: $state"
    }
    Assert-True ($expectedSha -cmatch '^[A-F0-9]{64}$' -and $record.Sha256 -ceq $expectedSha) 'classification artifact SHA is not bound to the current phase approval'
    $classification = $record.Text | ConvertFrom-Json -ErrorAction Stop
    Assert-True ([int]$classification.schema_version -eq 1 -and [string]$classification.task_id -ceq 'TASK-013' -and [string]$classification.target -ceq 'AGENTS.md') 'classification identity is invalid'
    Assert-True ([string]$classification.baseline_commit -ceq $expectedBaselineCommit -and [string]$classification.baseline_tree -ceq $expectedBaselineTree) 'classification baseline is not bound to the current phase approval'
    $oldBytes = Get-GitBlobBytes "$($classification.baseline_commit):AGENTS.md"
    Assert-True ((Get-GitTree ([string]$classification.baseline_commit)) -ceq [string]$classification.baseline_tree) 'classification baseline tree is invalid'
    Assert-True ((Get-GitBlobId $oldBytes) -ceq [string]$classification.old_target_blob -and (Get-Sha256 $oldBytes) -ceq [string]$classification.old_target_sha256) 'old AGENTS baseline bytes do not match classification'
    Assert-True ([long]$classification.source_byte_length -eq $oldBytes.Length -and [long]$classification.source_line_count -eq 6 -and [string]$classification.source_encoding -ceq 'utf-8' -and [string]$classification.source_bom -ceq 'absent' -and [string]$classification.source_line_endings -ceq 'lf') 'classification raw-source facts are invalid'
    $rendered = Read-CanonicalFile ([string]$Provenance.managed_adoption.rendered_candidate_path)
    Assert-True ($rendered.Bytes.Length -eq [int]$Provenance.managed_adoption.rendered_candidate_byte_length -and $rendered.Sha256 -ceq [string]$Provenance.managed_adoption.rendered_candidate_sha256 -and $rendered.Blob -ceq [string]$Provenance.managed_adoption.rendered_candidate_blob) 'rendered managed-loader evidence identity is invalid'
    Assert-True ($rendered.Sha256 -ceq 'A00F013797E5554357F31D5D3329CEE2AF5B20F507CA9147684B38B8AD87C619' -and $rendered.Blob -ceq 'a7e7dd2f3992df2469375b28a83624c1724f93ac') 'rendered managed-loader approved-source identity is invalid'
    $expectedStart = 0L
    $expectedRange = 1
    foreach ($range in @($classification.ranges)) {
        $rangeId = 'R-{0:D4}' -f $expectedRange
        $start = [long]$range.byte_start
        $end = [long]$range.byte_end_exclusive
        Assert-True ([string]$range.range_id -ceq $rangeId -and $start -eq $expectedStart -and $end -gt $start -and $end -le $oldBytes.Length) "classification range is invalid: $rangeId"
        Assert-True ((Test-Utf8Boundary $oldBytes $start) -and (Test-Utf8Boundary $oldBytes $end)) "classification UTF-8 boundary is invalid: $rangeId"
        Assert-True ([long]$range.line_start -eq (Get-LineAtByte $oldBytes $start) -and [long]$range.line_end_inclusive -eq (Get-LineAtByte $oldBytes ($end-1))) "classification line identity is invalid: $rangeId"
        $classificationId = [string]$range.classification
        $disposition = [string]$range.disposition
        Assert-True ($classificationId -in @('common_governance','project_safety','project_execution','non_normative')) "classification enum is invalid: $rangeId"
        Assert-True ($disposition -in @('replaced_by_managed_loader','moved_to_project_rules','moved_to_workflow','retained_project_owned','discarded_non_normative')) "classification disposition is invalid: $rangeId"
        Assert-True (-not [string]::IsNullOrWhiteSpace([string]$range.rationale)) "classification rationale is missing: $rangeId"
        if ($disposition -ceq 'discarded_non_normative') {
            Assert-True ($classificationId -ceq 'non_normative' -and [string]$range.destination_path -ceq 'none') "discarded classification destination is invalid: $rangeId"
        } else {
            $destination = if ([string]$range.destination_path -ceq 'AGENTS.md') { $rendered } else { Read-CanonicalFile ([string]$range.destination_path) }
            $anchorCount = [regex]::Matches($destination.Text,[regex]::Escape([string]$range.destination_anchor)).Count
            Assert-True ($anchorCount -eq 1 -and [string]$range.destination_candidate_blob -ceq $destination.Blob -and [string]$range.destination_candidate_sha256 -ceq $destination.Sha256) "classification destination identity is invalid: $rangeId"
        }
        $expectedStart = $end
        $expectedRange++
    }
    Assert-True ($expectedStart -eq $oldBytes.Length -and $expectedRange -gt 1) 'classification does not cover every old AGENTS byte'
    [pscustomobject]@{ Record=$record; Classification=$classification; Rendered=$rendered }
}
function Get-RequiredTaskValue([string]$Text,[string]$Key) {
    $matches = [regex]::Matches($Text,"(?m)^$([regex]::Escape($Key)):\s*([^\r\n]+)$")
    Assert-True ($matches.Count -eq 1) "TASK field must occur exactly once: $Key"
    $matches[0].Groups[1].Value.Trim()
}
function Get-RequiredYamlValue([string]$Text,[string]$Key) {
    $matches = [regex]::Matches($Text,"(?m)^$([regex]::Escape($Key)):\s*([^\r\n]+)$")
    Assert-True ($matches.Count -eq 1) "lock field must occur exactly once: $Key"
    $matches[0].Groups[1].Value.Trim()
}
function Assert-ManagedAndSharedIdentities($Context) {
    Assert-True ([string]$Context.agents_blob -ceq 'a7e7dd2f3992df2469375b28a83624c1724f93ac' -and [string]$Context.agents_sha256 -ceq 'A00F013797E5554357F31D5D3329CEE2AF5B20F507CA9147684B38B8AD87C619') 'managed AGENTS bytes are not the approved rendered candidate'
    Assert-True ([string]$Context.lock_repository -ceq 'Osato-Gasu/shared' -and [string]$Context.lock_version -ceq '1.0.1') 'shared lock repository/version is not exact v1.0.1'
    Assert-True ([string]$Context.lock_commit -ceq '4aa53fbe67edcbe2d7b6a147144b7b07022e5951' -and [string]$Context.lock_tree -ceq '366ed1ed65cf9481b37759a9caf9a1aac38e97f2') 'shared lock commit/tree is not exact v1.0.1'
    Assert-True ([string]$Context.lock_manifest_sha256 -ceq 'B85F3B6730FB242C81359DB25BA498259DA52C961F8259682862E5C0246D9114') 'shared lock manifest is not exact v1.0.1'
}
function Assert-ApprovedManagedBinding($Context) {
    Assert-True ([string]$Context.semantic_review_decision -ceq 'APPROVED') 'managed semantic review is not APPROVED'
    Assert-True ([string]$Context.semantic_review_plan_sha256 -cmatch '^[A-F0-9]{64}$') 'managed semantic review plan SHA is invalid'
    Assert-True ([string]$Context.approved_baseline_commit -cmatch '^[0-9a-f]{40}$' -and [string]$Context.approved_baseline_tree -cmatch '^[0-9a-f]{40}$') 'approved managed baseline identity is invalid'
    Assert-True ([string]$Context.approved_classification_sha256 -cmatch '^[A-F0-9]{64}$') 'approved classification SHA is invalid'
    Assert-True ([string]$Context.classification_record_sha256 -ceq [string]$Context.approved_classification_sha256) 'classification bytes are not bound to the approved SHA'
    Assert-True ([string]$Context.classification_baseline_commit -ceq [string]$Context.approved_baseline_commit -and [string]$Context.classification_baseline_tree -ceq [string]$Context.approved_baseline_tree) 'classification baseline is not bound to the approved baseline'
    Assert-True ([string]$Context.classification_old_blob -ceq '48cf4477a09125ed78808584c04a25b80c425ceb' -and [string]$Context.classification_old_sha256 -ceq '0E146BAC3986603F586F443536E8AA4E220C63FF1C4BAE14DFB2D13C1E4282F0') 'approved classification changed the immutable old AGENTS identity'
}
function Assert-RecoveryStateContract($Context,$Provenance) {
    $state = [string]$Context.phase_state
    $originalCommit = '1285f6745062545bb4e73a937cde141f6ab620d4'
    $originalTree = '3fb36efc2fd13b9321baf11a63e798d54fe48a12'
    if ($state -ceq 'PHASE_A_PRE_SYNC') {
        Assert-True ([string]$Context.recovery_commit -ceq 'none' -and [string]$Context.recovery_tree -ceq 'none') 'Phase A must not materialize recovery candidate B'
        Assert-True ([string]$Context.materialization_commit -ceq 'none' -and [string]$Context.materialization_tree -ceq 'none') 'Phase A must not materialize C0'
        Assert-True ([string]$Context.task_candidate_commit -ceq $originalCommit -and [string]$Context.task_candidate_tree -ceq $originalTree) 'Phase A TASK candidate is not the immutable product candidate'
        Assert-True ([string]$Context.semantic_review_decision -ceq 'pending' -and [string]$Context.semantic_review_plan_sha256 -ceq 'none') 'Phase A semantic approval state is invalid'
        Assert-True ([string]$Context.approved_baseline_commit -ceq 'none' -and [string]$Context.approved_baseline_tree -ceq 'none' -and [string]$Context.approved_classification_sha256 -ceq 'none') 'Phase A must not contain future approval bindings'
        Assert-True ([string]$Context.agents_sha256 -ceq '0E146BAC3986603F586F443536E8AA4E220C63FF1C4BAE14DFB2D13C1E4282F0') 'Phase A changed managed AGENTS target before semantic approval'
        Assert-True ([string]$Context.lock_repository -ceq 'Osato-Gasu/shared' -and [string]$Context.lock_version -ceq '0.12.25' -and [string]$Context.lock_commit -ceq 'f07571d3e8745b9a49a28b1ac77e211c210146a3' -and [string]$Context.lock_tree -ceq 'none' -and [string]$Context.lock_manifest_sha256 -ceq 'ADA91C21DF52BA7DF2B61D0CBCA5EC990E718A22339FF924A24B85D3B7016FBE') 'Phase A installed shared snapshot changed before sync'
        return
    }
    if ($state -ceq 'PHASE_B_PRE_MATERIALIZATION') {
        Assert-ApprovedManagedBinding $Context
        Assert-ManagedAndSharedIdentities $Context
        Assert-True ([string]$Context.recovery_commit -ceq 'none' -and [string]$Context.recovery_tree -ceq 'none') 'Phase B must keep recovery candidate B unmaterialized'
        Assert-True ([string]$Context.materialization_commit -ceq 'none' -and [string]$Context.materialization_tree -ceq 'none') 'Phase B must keep C0 unmaterialized'
        Assert-True ([string]$Context.task_candidate_commit -ceq $originalCommit -and [string]$Context.task_candidate_tree -ceq $originalTree) 'Phase B TASK candidate must remain the immutable product candidate'
        $atBaseline = [string]$Context.current_head -ceq [string]$Context.approved_baseline_commit -and [string]$Context.current_tree -ceq [string]$Context.approved_baseline_tree
        if (-not $atBaseline) {
            Assert-True ([string]$Context.current_parent -ceq [string]$Context.approved_baseline_commit) 'Phase B post-commit HEAD is not a direct child of the approved baseline'
            foreach ($path in @($Context.head_diff_paths)) { Assert-True (Test-AllowedRecoveryPath ([string]$path) $Provenance) "unauthorized Phase B path: $path" }
        }
        return
    }
    if ($state -ceq 'PHASE_C0_MATERIALIZED') {
        Assert-ApprovedManagedBinding $Context
        Assert-ManagedAndSharedIdentities $Context
        Assert-True ([string]$Context.recovery_commit -cmatch '^[0-9a-f]{40}$' -and [string]$Context.recovery_tree -cmatch '^[0-9a-f]{40}$') 'Phase C0 recovery candidate identity is incomplete'
        Assert-True ([string]$Context.recovery_actual_tree -ceq [string]$Context.recovery_tree) 'Phase C0 recovery candidate tree changed'
        Assert-True ([string]$Context.task_candidate_commit -ceq [string]$Context.recovery_commit -and [string]$Context.task_candidate_tree -ceq [string]$Context.recovery_tree) 'Phase C0 TASK candidate does not equal recovery B'
        Assert-True ([string]$Context.materialization_commit -cmatch '^[0-9a-f]{40}$' -and [string]$Context.materialization_tree -cmatch '^[0-9a-f]{40}$') 'Phase C0 materialization handoff identity is incomplete'
        Assert-True ([string]$Context.current_head -ceq [string]$Context.materialization_commit -and [string]$Context.current_tree -ceq [string]$Context.materialization_tree -and [string]$Context.current_parent -ceq [string]$Context.recovery_commit) 'Phase C0 materialization handoff is not the direct child of recovery B'
        return
    }
    throw "TASK-013 recovery provenance BLOCKED: unknown phase_state: $state"
}
function Test-AllowedRecoveryPath([string]$Path,$Provenance) {
    if (@($Provenance.allowed_recovery_exact_paths) -ccontains $Path) { return $true }
    foreach ($prefix in @($Provenance.allowed_recovery_path_prefixes)) { if ($Path.StartsWith([string]$prefix,[StringComparison]::Ordinal)) { return $true } }
    $false
}
function Get-ReviewRequestId($Review) {
    $repositoryAccess = ([string][bool]$Review.repository_access).ToLowerInvariant()
    $canonical = "review_kind=$($Review.kind)`nreviewed_candidate=$($Review.reviewed_candidate)`nreviewed_spec_revision=$($Review.reviewed_spec_revision)`npreferred_executor=$($Review.preferred_executor)`nactual_executor=$($Review.actual_executor)`nprovider_substitution=$($Review.provider_substitution)`nexecutor_policy=$($Review.executor_policy)`nreview_role=$($Review.review_role)`nexecution_mode=$($Review.execution_mode)`nrepository_access=$repositoryAccess`nreview_status=$($Review.review_status)`nmodel=$($Review.model)`neffort=$($Review.effort)`nstarted_at=$($Review.started_at)`n"
    Get-Sha256 ([Text.Encoding]::UTF8.GetBytes($canonical))
}
function Convert-ReviewResultToRequest($Result) {
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
function Assert-ReviewRequestIdentity($Request,[string]$RecoveryCommit) {
    Assert-True ($null -ne $Request) 'independent review request is missing'
    Assert-True ([string]$Request.kind -ceq 'implementation' -and [string]$Request.reviewed_candidate -ceq $RecoveryCommit -and [int]$Request.reviewed_spec_revision -eq 3) 'independent review request candidate/spec identity is invalid'
    Assert-True ([string]$Request.review_role -ceq 'INDEPENDENT_REVIEWER' -and [string]$Request.execution_mode -ceq 'separate_session' -and [bool]$Request.repository_access -and [string]$Request.review_status -ceq 'requested') 'independent review request execution identity is invalid'
    Assert-True ([string]$Request.request_id -cmatch '^[A-F0-9]{64}$' -and [string]$Request.request_id -ceq (Get-ReviewRequestId $Request)) 'independent review request_id is not canonical'
}
function Assert-ReviewResultIdentity($Result,[string]$RecoveryCommit) {
    Assert-True ($null -ne $Result) 'independent review result is missing'
    Assert-True ([string]$Result.review_kind -ceq 'implementation' -and [string]$Result.reviewed_candidate -ceq $RecoveryCommit -and [int]$Result.spec_revision -eq 3) 'independent review result candidate/spec identity is invalid'
    Assert-True ([string]$Result.review_role -ceq 'INDEPENDENT_REVIEWER' -and [string]$Result.execution_mode -ceq 'separate_session' -and [bool]$Result.repository_access -and [string]$Result.request_review_status -ceq 'requested' -and [string]$Result.review_status -ceq 'completed') 'independent review result execution identity is invalid'
    $request = Convert-ReviewResultToRequest $Result
    Assert-True ([string]$Result.request_id -cmatch '^[A-F0-9]{64}$' -and [string]$Result.request_id -ceq (Get-ReviewRequestId $request)) 'independent review result request_id is not canonical'
}
function Assert-ResultMatchesStoredRequest($Result,$Stored) {
    Assert-True ([string]$Stored.review_status -ceq 'requested') 'completed relay requires the canonical stored request state'
    $pairs = [ordered]@{
        review_kind=[string]$Result.review_kind; reviewed_candidate=[string]$Result.reviewed_candidate; reviewed_spec_revision=[string]$Result.spec_revision
        review_request_id=[string]$Result.request_id; preferred_executor=[string]$Result.preferred_executor; actual_executor=[string]$Result.actual_executor
        provider_substitution=[string]$Result.provider_substitution; executor_policy=[string]$Result.executor_policy; review_role=[string]$Result.review_role
        execution_mode=[string]$Result.execution_mode; repository_access=(([string][bool]$Result.repository_access).ToLowerInvariant())
        request_review_status=[string]$Result.request_review_status; review_model=[string]$Result.model; review_effort=[string]$Result.effort
        review_started_at=[string]$Result.started_at
    }
    foreach ($pair in $pairs.GetEnumerator()) { Assert-True ([string]$Stored.($pair.Key) -ceq [string]$pair.Value) "completed relay substituted stored request field: $($pair.Key)" }
}
function Assert-ResultMatchesStoredAudit($Result,$Stored) {
    Assert-True ([string]$Stored.review_status -ceq 'completed') 'final APPROVED requires the canonical stored completed-review state'
    Assert-ResultMatchesStoredRequest $Result ([pscustomobject]@{
        review_status='requested'; review_kind=$Stored.review_kind; reviewed_candidate=$Stored.reviewed_candidate; reviewed_spec_revision=$Stored.reviewed_spec_revision
        review_request_id=$Stored.review_request_id; preferred_executor=$Stored.preferred_executor; actual_executor=$Stored.actual_executor
        provider_substitution=$Stored.provider_substitution; executor_policy=$Stored.executor_policy; review_role=$Stored.review_role
        execution_mode=$Stored.execution_mode; repository_access=$Stored.repository_access; request_review_status=$Stored.request_review_status
        review_model=$Stored.review_model; review_effort=$Stored.review_effort; review_started_at=$Stored.review_started_at
    })
    $pairs = [ordered]@{
        review_completed_at=[string]$Result.completed_at; review_result=[string]$Result.result
        review_findings_count=[string]$Result.findings_count; review_finding_ids=[string]$Result.finding_ids
    }
    foreach ($pair in $pairs.GetEnumerator()) { Assert-True ([string]$Stored.($pair.Key) -ceq [string]$pair.Value) "final APPROVED substituted stored review-result field: $($pair.Key)" }
}
function Assert-Relay($Relay,$Provenance,[string]$RawText,$Context) {
    $review = $Provenance.original_product_review
    $recoveryCommit = [string]$Context.recovery_commit
    Assert-True ($recoveryCommit -cmatch '^[0-9a-f]{40}$') 'relay validation requires a materialized recovery candidate B'
    Assert-True ([string]$Relay.task_id -ceq 'TASK-013' -and [int]$Relay.spec_revision -eq 3 -and [string]$Relay.repository -ceq 'Osato-Gasu/Personal-Finance-Planner') 'relay task/spec/repository identity is invalid'
    Assert-True ([string]$Relay.shared_candidate -ceq [string]$Provenance.shared_source.commit) 'relay shared candidate is not exact shared v1.0.1'
    Assert-True ([string]$Relay.reviewed_candidate -ceq $recoveryCommit) 'relay reviewed candidate is not recovery candidate B'
    Assert-True ([string]$Relay.reviewed_handoff_head -ceq [string]$Context.current_head) 'relay reviewed handoff is not exact current HEAD'
    Assert-True ([string]$Relay.routing_mode -in @('local_script','connector_read_only') -and $null -ne $Relay.route_result) 'relay exact route_result is missing'
    $route = $Relay.route_result
    Assert-True ([string]$route.repository -ceq 'Osato-Gasu/Personal-Finance-Planner' -and [string]$route.requested_ref -ceq 'refs/heads/codex/task-013-public-audit-stable-id') 'relay route repository/ref identity is invalid'
    Assert-True ([string]$route.resolved_commit -ceq [string]$Context.current_head -and [string]$route.next_action_blob -ceq [string]$Context.next_action_blob -and [string]$route.handoff_blob -ceq [string]$Context.handoff_blob -and [string]$route.adapter_blob -ceq [string]$Context.adapter_blob) 'relay route/head/blob identity is invalid'
    $markers = @(
        [string]$review.candidate_commit,[string]$review.candidate_tree,[string]$review.reviewed_handoff_commit,
        [string]$review.result_sha256,[string]$review.result_byte_length,[string]$review.relay_sha256,[string]$review.relay_byte_length,
        [string]$Context.provenance_sha256
    )
    foreach ($marker in $markers) { Assert-True ($RawText.Contains($marker)) "relay lacks exact original-product provenance marker: $marker" }
    $decision = [string]$Relay.decision
    if ($decision -ceq 'INDEPENDENT_REVIEW_REQUESTED') {
        Assert-True ([string]$Context.stored_review.review_status -ceq 'not_requested') 'independent review request requires the canonical pre-request state'
        Assert-True ($null -ne $Relay.independent_review -and $null -eq $Relay.independent_review_result) 'INDEPENDENT_REVIEW_REQUESTED requires request and forbids result'
        Assert-ReviewRequestIdentity $Relay.independent_review $recoveryCommit
    } elseif ($decision -ceq 'INDEPENDENT_REVIEW_COMPLETED') {
        Assert-True ($null -eq $Relay.independent_review -and $null -ne $Relay.independent_review_result) 'INDEPENDENT_REVIEW_COMPLETED forbids request and requires result'
        Assert-ReviewResultIdentity $Relay.independent_review_result $recoveryCommit
        Assert-ResultMatchesStoredRequest $Relay.independent_review_result $Context.stored_review
    } elseif ($decision -ceq 'APPROVED') {
        Assert-True ([string]$Relay.review_stage -ceq 'implementation') 'final APPROVED relay review_stage is not implementation'
        Assert-True ($null -eq $Relay.independent_review -and $null -ne $Relay.independent_review_result) 'final APPROVED forbids request and requires exact completed result'
        Assert-ReviewResultIdentity $Relay.independent_review_result $recoveryCommit
        Assert-ResultMatchesStoredAudit $Relay.independent_review_result $Context.stored_review
    } else {
        throw "TASK-013 recovery provenance BLOCKED: unsupported recovery relay decision: $decision"
    }
    Assert-True ([int]$Relay.changes_requested_cycles -eq 0 -and [int]$Relay.implementation_review_attempt -eq 1) 'recovery relay must preserve cycles 0 / attempt 1'
}
function Get-StoredReviewContext([string]$TaskText) {
    $values = [ordered]@{}
    foreach ($field in @(
        'review_status','review_kind','reviewed_candidate','reviewed_spec_revision','review_request_id','preferred_executor','actual_executor',
        'provider_substitution','executor_policy','review_role','execution_mode','repository_access','request_review_status','review_model','review_effort',
        'review_started_at','review_completed_at','review_result','review_findings_count','review_finding_ids'
    )) { $values[$field] = Get-RequiredTaskValue $TaskText $field }
    [pscustomobject]$values
}
function Get-GitBlobAtCommit([string]$Commit,[string]$Relative) {
    Assert-True ($Relative -match '^[A-Za-z0-9._/-]+$' -and $Relative -notmatch '(^|/)\.\.(/|$)') "invalid Git path: $Relative"
    ((Invoke-GitText @('rev-parse',"$Commit`:$Relative") "cannot resolve blob for $Relative at $Commit") -join '').Trim()
}
function Get-RepositoryRelayContext($Provenance,$ProvenanceRecord,$Task,[string]$CurrentHead) {
    $handoff = Get-RequiredTaskValue $Task.Text 'handoff_file'
    [pscustomobject]@{
        recovery_commit=[string]$Provenance.recovery_candidate.commit
        current_head=$CurrentHead
        next_action_blob=(Get-GitBlobAtCommit $CurrentHead 'docs/ai/NEXT_ACTION.yml')
        handoff_blob=(Get-GitBlobAtCommit $CurrentHead $handoff)
        adapter_blob=(Get-GitBlobAtCommit $CurrentHead 'docs/ai/PROJECT_ADAPTER.psd1')
        provenance_sha256=[string]$ProvenanceRecord.Sha256
        stored_review=(Get-StoredReviewContext $Task.Text)
    }
}

$provenanceRecord = if ([string]::IsNullOrWhiteSpace($ProvenanceOverridePath)) {
    Read-CanonicalFile 'docs/ai/reports/TASK-013/RECOVERY_PROVENANCE.json'
} else {
    Read-ExternalCanonicalFile $ProvenanceOverridePath 'provenance override'
}
$provenance = $provenanceRecord.Text | ConvertFrom-Json -ErrorAction Stop
Assert-True ([int]$provenance.schema_version -eq 1 -and [string]$provenance.artifact_role -ceq 'report_evidence' -and [string]$provenance.task_id -ceq 'TASK-013' -and [int]$provenance.spec_revision -eq 3 -and [int]$provenance.recovery_design_revision -eq 5) 'provenance root identity is invalid'
Assert-True ([bool]$provenance.public_side_effect_authority -eq $false -and [bool]$provenance.release_authority -eq $false) 'recovery provenance grants unauthorized public/release authority'
$review = $provenance.original_product_review
Assert-True ([string]$review.candidate_commit -ceq '1285f6745062545bb4e73a937cde141f6ab620d4' -and [string]$review.candidate_tree -ceq '3fb36efc2fd13b9321baf11a63e798d54fe48a12') 'original product candidate identity changed'
Assert-True ([string]$review.reviewed_handoff_commit -ceq 'd96ebe1bcfe258185956fd0db3acf1ca15050af6' -and [string]$review.reviewed_handoff_tree -ceq '90f97b3e16aa3d0ce36cd872d1b59b9b8d49908a') 'original reviewed handoff identity changed'
Assert-True ([string]$review.decision -ceq 'APPROVED' -and [int]$review.findings_count -eq 0 -and [int]$review.implementation_review_attempt -eq 1 -and [string]$review.implementation_review_profile -ceq 'standard') 'original review decision/attempt/profile changed'
$shared = $provenance.shared_source
Assert-True ([string]$shared.repository -ceq 'Osato-Gasu/shared' -and [string]$shared.version -ceq '1.0.1' -and [string]$shared.commit -ceq '4aa53fbe67edcbe2d7b6a147144b7b07022e5951' -and [string]$shared.tree -ceq '366ed1ed65cf9481b37759a9caf9a1aac38e97f2') 'shared source identity changed'
Assert-True ([string]$shared.version_blob -ceq '7dea76edb3dc51b6e5e8223e9f941a35c1e364d6' -and [int]$shared.version_byte_length -eq 6 -and [string]$shared.version_sha256 -ceq '44E161E4495CAC2CF7858043E9E6418E9579F0DDCFAE826F9A372622968CE066') 'shared VERSION identity changed'
Assert-True ([int]$shared.manifest_schema_version -eq 2 -and [int]$shared.manifest_entry_count -eq 37 -and [string]$shared.manifest_blob -ceq '025664e13f9ee0307f2174ba10773dd95f5156ca' -and [int]$shared.manifest_byte_length -eq 6202 -and [string]$shared.manifest_sha256 -ceq 'B85F3B6730FB242C81359DB25BA498259DA52C961F8259682862E5C0246D9114') 'shared manifest identity changed'

$resultRecord = Read-CanonicalFile ([string]$review.result_path)
$relayRecord = Read-CanonicalFile ([string]$review.relay_path)
Assert-True ($resultRecord.Bytes.Length -eq [int]$review.result_byte_length -and $resultRecord.Sha256 -ceq [string]$review.result_sha256) 'original review-result raw bytes/SHA changed'
Assert-True ($relayRecord.Bytes.Length -eq [int]$review.relay_byte_length -and $relayRecord.Sha256 -ceq [string]$review.relay_sha256) 'original APPROVED relay raw bytes/SHA changed'
Assert-SingleMarkdownValue $resultRecord.Text 'decision' 'APPROVED'
Assert-SingleMarkdownValue $resultRecord.Text 'spec_revision' '3'
Assert-SingleMarkdownValue $resultRecord.Text 'implementation_review_attempt' '1'
Assert-SingleMarkdownValue $resultRecord.Text 'implementation_review_profile' 'standard'
Assert-SingleMarkdownValue $resultRecord.Text 'findings_count' '0'
Assert-SingleMarkdownValue $resultRecord.Text 'reviewed_candidate' ([string]$review.candidate_commit)
Assert-SingleMarkdownValue $resultRecord.Text 'candidate_tree' ([string]$review.candidate_tree)
Assert-SingleMarkdownValue $resultRecord.Text 'reviewed_handoff_head' ([string]$review.reviewed_handoff_commit)
Assert-SingleMarkdownValue $resultRecord.Text 'handoff_tree' ([string]$review.reviewed_handoff_tree)
$oldRelay = $relayRecord.Text | ConvertFrom-Json -ErrorAction Stop
Assert-True ([string]$oldRelay.reviewed_candidate -ceq [string]$review.candidate_commit -and [string]$oldRelay.reviewed_handoff_head -ceq [string]$review.reviewed_handoff_commit -and [string]$oldRelay.decision -ceq 'APPROVED') 'original relay review identity changed'
Assert-True ([int]$oldRelay.review_findings_count -eq 0 -and [int]$oldRelay.implementation_review_attempt -eq 1 -and [string]$oldRelay.implementation_review_profile -ceq 'standard') 'original relay findings/attempt/profile changed'
Assert-True ((Get-GitTree ([string]$review.candidate_commit)) -ceq [string]$review.candidate_tree -and (Get-GitTree ([string]$review.reviewed_handoff_commit)) -ceq [string]$review.reviewed_handoff_tree) 'original Git tree identity changed'
$null = Invoke-GitText @('merge-base','--is-ancestor',[string]$review.candidate_commit,[string]$review.reviewed_handoff_commit) 'original handoff is not a descendant of original product candidate'
$handoffParent = ((Invoke-GitText @('rev-parse',"$($review.reviewed_handoff_commit)^1") 'original handoff parent is unavailable') -join '').Trim()
Assert-True ($handoffParent -ceq [string]$review.candidate_commit) 'original reviewed handoff is not the candidate direct child'
$expectedHandoffPaths = @('board/PROGRESS.html','docs/ai/CURRENT_STATE.md','docs/ai/NEXT_ACTION.yml','docs/ai/handoffs/TASK-013/IMPLEMENTATION_REVIEW_HANDOFF.md','docs/ai/reports/TASK-013/IMPLEMENTATION_REPORT.md','docs/ai/tasks/TASK-013.md')
$actualHandoffPaths = @(Invoke-GitText @('diff','--name-only',[string]$review.candidate_commit,[string]$review.reviewed_handoff_commit) 'original candidate-to-handoff diff is unavailable')
Assert-True (($actualHandoffPaths -join '|') -ceq ($expectedHandoffPaths -join '|')) 'original candidate-to-handoff six-path boundary changed'
$classificationEvidence = Assert-Classification $provenance

if ($Mode -ceq 'StateContractFixture') {
    $fixtureRecord = Read-ExternalCanonicalFile $FixturePath 'state-contract fixture'
    $fixture = $fixtureRecord.Text | ConvertFrom-Json -ErrorAction Stop
    Assert-RecoveryStateContract $fixture $provenance
} elseif ($Mode -ceq 'RelayContractFixture') {
    $relayFixtureRecord = Read-ExternalCanonicalFile $RelayFixturePath 'relay-contract fixture'
    $relayFixture = $relayFixtureRecord.Text | ConvertFrom-Json -ErrorAction Stop
    Assert-Relay $relayFixture.relay $provenance $relayFixtureRecord.Text $relayFixture.context
} else {
    $task = Read-CanonicalFile 'docs/ai/tasks/TASK-013.md'
    $agents = Read-CanonicalFile 'AGENTS.md'
    $lock = Read-CanonicalFile 'docs/ai/SHARED_RULES.lock.yml'
    $lockVersionKey = if ($lock.Text -match '(?m)^source_version:') { 'source_version' } else { 'version' }
    $lockCommitKey = if ($lock.Text -match '(?m)^source_commit:') { 'source_commit' } else { 'commit' }
    $lockTree = if ($lock.Text -match '(?m)^source_tree:') { Get-RequiredYamlValue $lock.Text 'source_tree' } else { 'none' }
    $currentHead = ((Invoke-GitText @('rev-parse','HEAD') 'current HEAD is unavailable') -join '').Trim()
    $currentTree = Get-GitTree $currentHead
    $currentParent = ((Invoke-GitText @('rev-parse',"$currentHead^1") 'current HEAD parent is unavailable') -join '').Trim()
    $headDiffPaths = @()
    if ([string]$provenance.phase_state -ceq 'PHASE_B_PRE_MATERIALIZATION' -and [string]$provenance.managed_adoption.approved_baseline_commit -cmatch '^[0-9a-f]{40}$' -and $currentHead -cne [string]$provenance.managed_adoption.approved_baseline_commit) {
        $headDiffPaths = @(Invoke-GitText @('diff','--name-only',[string]$provenance.managed_adoption.approved_baseline_commit,$currentHead) 'Phase B candidate diff is unavailable')
    }
    $recoveryActualTree = 'none'
    if ([string]$provenance.recovery_candidate.commit -cmatch '^[0-9a-f]{40}$') { $recoveryActualTree = Get-GitTree ([string]$provenance.recovery_candidate.commit) }
    $context = [pscustomobject]@{
        phase_state=[string]$provenance.phase_state
        recovery_commit=[string]$provenance.recovery_candidate.commit
        recovery_tree=[string]$provenance.recovery_candidate.tree
        materialization_commit=[string]$provenance.recovery_candidate.materialization_handoff_commit
        materialization_tree=[string]$provenance.recovery_candidate.materialization_handoff_tree
        semantic_review_decision=[string]$provenance.managed_adoption.semantic_review_decision
        semantic_review_plan_sha256=[string]$provenance.managed_adoption.semantic_review_plan_sha256
        approved_baseline_commit=[string]$provenance.managed_adoption.approved_baseline_commit
        approved_baseline_tree=[string]$provenance.managed_adoption.approved_baseline_tree
        approved_classification_sha256=[string]$provenance.managed_adoption.approved_classification_sha256
        classification_record_sha256=[string]$classificationEvidence.Record.Sha256
        classification_baseline_commit=[string]$classificationEvidence.Classification.baseline_commit
        classification_baseline_tree=[string]$classificationEvidence.Classification.baseline_tree
        classification_old_blob=[string]$classificationEvidence.Classification.old_target_blob
        classification_old_sha256=[string]$classificationEvidence.Classification.old_target_sha256
        task_candidate_commit=(Get-RequiredTaskValue $task.Text 'candidate_commit')
        task_candidate_tree=(Get-RequiredTaskValue $task.Text 'candidate_tree')
        agents_blob=[string]$agents.Blob
        agents_sha256=[string]$agents.Sha256
        lock_repository=(Get-RequiredYamlValue $lock.Text 'source_repository')
        lock_version=(Get-RequiredYamlValue $lock.Text $lockVersionKey)
        lock_commit=(Get-RequiredYamlValue $lock.Text $lockCommitKey)
        lock_tree=$lockTree
        lock_manifest_sha256=(Get-RequiredYamlValue $lock.Text 'manifest_sha256')
        current_head=$currentHead
        current_tree=$currentTree
        current_parent=$currentParent
        head_diff_paths=$headDiffPaths
        recovery_actual_tree=$recoveryActualTree
    }
    Assert-RecoveryStateContract $context $provenance
    if ([string]$provenance.phase_state -ceq 'PHASE_C0_MATERIALIZED') {
        $recovery = $provenance.recovery_candidate
        $null = Invoke-GitText @('merge-base','--is-ancestor',[string]$review.candidate_commit,[string]$recovery.commit) 'recovery candidate is not a descendant of original product candidate'
        $changed = @(Invoke-GitText @('diff','--name-only',[string]$review.candidate_commit,[string]$recovery.commit) 'recovery candidate diff is unavailable')
        foreach ($path in $changed) { Assert-True (Test-AllowedRecoveryPath $path $provenance) "unauthorized recovery path: $path" }
    }
}

if ($Mode -in @('ExternalRelayPreflight','CanonicalRelay')) {
    if ($Mode -ceq 'CanonicalRelay') { $RelayPath = Join-Path $root 'docs/ai/reports/TASK-013/RELAY_BUNDLE.json' }
    Assert-True (-not [string]::IsNullOrWhiteSpace($RelayPath)) 'relay path is required'
    $relayFull = [IO.Path]::GetFullPath($RelayPath)
    Assert-True (Test-Path -LiteralPath $relayFull -PathType Leaf) 'relay file is missing'
    $relayBytes = [IO.File]::ReadAllBytes($relayFull)
    try { $relayText = $utf8Strict.GetString($relayBytes) } catch { throw 'TASK-013 recovery provenance BLOCKED: relay is not strict UTF-8' }
    Assert-True (-not $relayText.Contains("`r") -and $relayText.EndsWith("`n")) 'relay canonical byte shape is invalid'
    $relay = $relayText | ConvertFrom-Json -ErrorAction Stop
    $relayContext = Get-RepositoryRelayContext $provenance $provenanceRecord $task $currentHead
    Assert-Relay $relay $provenance $relayText $relayContext
}

Write-Output "TASK-013 recovery provenance validation passed. mode=$Mode phase=$($provenance.phase_state)"
