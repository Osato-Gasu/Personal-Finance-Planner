[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$failures = [Collections.Generic.List[string]]::new()
function Fail([string]$Message) { $script:failures.Add($Message) }

$adapterPath = Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
$adapter = Import-PowerShellDataFile -LiteralPath $adapterPath
$identityTargets = [ordered]@{
    requirements_ = 'docs/product/REQUIREMENTS.md'
    architecture_ = 'docs/product/ARCHITECTURE.md'
    data_model_ = 'docs/product/DATA_MODEL.md'
    calculations_ = 'docs/product/CALCULATIONS.md'
    rule_governance_ = 'docs/product/RULE_GOVERNANCE.md'
    review_policy_ = 'docs/product/REVIEW_POLICY.md'
    delivery_plan_ = 'docs/product/DELIVERY_PLAN.md'
}
function Read-ExactIdentityField([string]$Text,[string]$Key,[string]$Source) {
    $matches = [regex]::Matches($Text,"(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if ($matches.Count -eq 0) { Fail "product identity field missing: $Key in $Source"; return $null }
    if ($matches.Count -ne 1) { Fail "product identity field must occur exactly once: $Key in $Source"; return $null }
    $matches[0].Groups[1].Value.Trim()
}
$identityReferences = @($adapter.Relay.Requirements.ProductIdentityReferences)
if ($identityReferences.Count -ne $identityTargets.Count -or @($identityReferences | Select-Object -Unique).Count -ne $identityReferences.Count) { Fail 'product identity reference allowlist count or uniqueness is invalid' }
$seenIdentityPrefixes = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($reference in $identityReferences) {
    $referenceText = [string]$reference
    $referenceMatch = [regex]::Match($referenceText,'^(?<source>docs/ai/[A-Za-z0-9._/-]+)#(?<prefix>[a-z][a-z0-9_]*_)\*$')
    if (-not $referenceMatch.Success) { Fail "product identity reference format is invalid: $referenceText"; continue }
    $source = $referenceMatch.Groups['source'].Value
    $prefix = $referenceMatch.Groups['prefix'].Value
    if (-not $seenIdentityPrefixes.Add($prefix)) { Fail "duplicate product identity prefix: $prefix"; continue }
    if (-not $identityTargets.Contains($prefix)) { Fail "unknown product identity prefix: $prefix"; continue }
    $sourcePath = [IO.Path]::GetFullPath((Join-Path $root $source))
    $aiRoot = [IO.Path]::GetFullPath((Join-Path $root 'docs/ai')) + [IO.Path]::DirectorySeparatorChar
    if (-not $sourcePath.StartsWith($aiRoot,[StringComparison]::OrdinalIgnoreCase)) { Fail "product identity source escapes docs/ai: $source"; continue }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { Fail "product identity source is missing: $source"; continue }
    $identityText = [IO.File]::ReadAllText($sourcePath)
    $target = Read-ExactIdentityField $identityText ($prefix + 'file') $source
    $recordedSha = Read-ExactIdentityField $identityText ($prefix + 'sha256') $source
    if ($null -eq $target -or $null -eq $recordedSha) { continue }
    $expectedTarget = [string]$identityTargets[$prefix]
    if ($target -cne $expectedTarget) { Fail "product identity target mismatch for $prefix"; continue }
    if ($recordedSha -notmatch '^[A-F0-9]{64}$') { Fail "product identity SHA-256 is invalid for $prefix"; continue }
    $targetPath = [IO.Path]::GetFullPath((Join-Path $root $target))
    $productRoot = [IO.Path]::GetFullPath((Join-Path $root 'docs/product')) + [IO.Path]::DirectorySeparatorChar
    if (-not $targetPath.StartsWith($productRoot,[StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $targetPath -PathType Leaf)) { Fail "product identity target is missing or outside docs/product: $target"; continue }
    $actualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetPath).Hash
    if ($actualSha -cne $recordedSha) { Fail "product identity byte hash mismatch: $target" }
}
foreach ($prefix in $identityTargets.Keys) { if (-not $seenIdentityPrefixes.Contains([string]$prefix)) { Fail "product identity reference missing for prefix: $prefix" } }
$review = $adapter.ImplementationReview
if ([int]$review.MaxAttempts -ne 3 -or [int]$review.RelaxationAfterFailures -ne 2 -or [int]$review.RelaxableOnlyOnAttempt -ne 3) { Fail 'implementation review attempt policy is invalid' }
if ([int]$review.StandardActionableFindingLimit -ne 2 -or [int]$review.NarrowedAfterFailures -ne 1 -or [int]$review.TerminalAfterFailures -ne 2) { Fail 'implementation review convergence thresholds are invalid' }
$requiredProfiles = @('standard','narrowed','terminal')
if (@($review.Profiles).Count -ne $requiredProfiles.Count -or @($review.Profiles | Select-Object -Unique).Count -ne $requiredProfiles.Count -or ((@($review.Profiles) -join ',') -cne ($requiredProfiles -join ','))) { Fail 'implementation review profiles are invalid' }
if ([string]$review.FailureAfterFinalAttempt -cne 'NEEDS_USER_DECISION') { Fail 'third failed review must route to NEEDS_USER_DECISION' }
$requiredRelaxable = @('non_required_ui','minor_wording','optional_optimization','question','scope_expansion','ideal_design')
if (@($review.RelaxableCategories).Count -ne $requiredRelaxable.Count -or @($review.RelaxableCategories | Select-Object -Unique).Count -ne $requiredRelaxable.Count -or @($requiredRelaxable | Where-Object { @($review.RelaxableCategories) -cnotcontains $_ }).Count -gt 0) { Fail 'implementation review relaxable categories are invalid' }
$requiredNonRelaxable = @('requirement_violation','major_functionality','calculation_accuracy','decision_accuracy','data_preservation','data_integrity','rollback','raw_byte_portability','validator','required_test','release_gate','security','backward_compatibility')
if (@($review.NonRelaxableCategories).Count -ne $requiredNonRelaxable.Count -or @($review.NonRelaxableCategories | Select-Object -Unique).Count -ne $requiredNonRelaxable.Count -or @($requiredNonRelaxable | Where-Object { @($review.NonRelaxableCategories) -cnotcontains $_ }).Count -gt 0) { Fail 'implementation review non-relaxable categories are invalid' }
if (@($adapter.Relay.Assignments) -cnotcontains 'ChatGPT|ORCHESTRATOR_AND_REVIEWER|none|none') { Fail 'ChatGPT NEEDS_USER_DECISION assignment is missing' }
if ([string]$adapter.Relay.NextActionTemplates.NEEDS_USER_DECISION -cne 'ChatGPT reviews NEEDS_USER_DECISION relay for {task_id} with user confirmation') { Fail 'NEEDS_USER_DECISION next action template is invalid' }
if ($adapter.ModelRouting.UltraRequiresUserApproval -ne $false) { Fail 'Ultra approval policy must be disabled' }

try { & (Join-Path $root 'tools/validate-audit-identities.ps1') -ProjectRoot $root | Out-Null }
catch { Fail "audit identity validation failed: $($_.Exception.Message)" }
try { & (Join-Path $root 'tools/test-audit-identity-normalization.ps1') | Out-Null }
catch { Fail "audit identity normalization test failed: $($_.Exception.Message)" }

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { [Console]::Error.WriteLine("governance error: $failure") }
    exit 1
}
Write-Output 'Project overlay validation passed.'
