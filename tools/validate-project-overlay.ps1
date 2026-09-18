[CmdletBinding()]
param(
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
$root = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) } else { [IO.Path]::GetFullPath($ProjectRoot) }
$failures = New-Object 'Collections.Generic.List[string]'
function Fail([string]$Message) { $script:failures.Add($Message) }
function Read-Text([string]$Relative) {
    $path = Join-Path $root $Relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { Fail "required file is missing: $Relative"; return '' }
    try { return [IO.File]::ReadAllText($path, (New-Object Text.UTF8Encoding($false, $true))) }
    catch { Fail "strict UTF-8 read failed: $Relative"; return '' }
}
function Read-ExactField([string]$Text, [string]$Key, [string]$Source) {
    $matches = [regex]::Matches($Text, "(?m)^$([regex]::Escape($Key)):\s*(.*?)\s*$")
    if ($matches.Count -ne 1) { Fail "product identity field '$Key' must occur exactly once in $Source"; return $null }
    return $matches[0].Groups[1].Value.Trim().Trim("'", '"')
}

if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "ProjectRoot is not a directory: $ProjectRoot" }
$adapterPath = Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
if (-not (Test-Path -LiteralPath $adapterPath -PathType Leaf)) { Fail 'PROJECT_ADAPTER.psd1 is missing' }
$adapter = $null
if (Test-Path -LiteralPath $adapterPath -PathType Leaf) {
    try { $adapter = Import-PowerShellDataFile -LiteralPath $adapterPath }
    catch { Fail "PROJECT_ADAPTER.psd1 cannot be imported: $($_.Exception.Message)" }
}

$identityTargets = [ordered]@{
    requirements_ = 'docs/product/REQUIREMENTS.md'
    architecture_ = 'docs/product/ARCHITECTURE.md'
    data_model_ = 'docs/product/DATA_MODEL.md'
    calculations_ = 'docs/product/CALCULATIONS.md'
    rule_governance_ = 'docs/product/RULE_GOVERNANCE.md'
    review_policy_ = 'docs/product/REVIEW_POLICY.md'
    delivery_plan_ = 'docs/product/DELIVERY_PLAN.md'
}
$identityText = Read-Text 'docs/ai/PRODUCT_IDENTITIES.yml'
$seenPrefixes = New-Object 'Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
$references = @()
if ($null -ne $adapter) {
    if ([int]$adapter.SchemaVersion -ne 2) { Fail 'PROJECT_ADAPTER SchemaVersion must be 2' }
    if ($adapter.ContainsKey('ImplementationReview')) { Fail 'legacy ImplementationReview relay policy remains in PROJECT_ADAPTER' }
    if ($adapter.ContainsKey('Relay')) {
        $references = @($adapter.Relay.Requirements.ProductIdentityReferences)
        Fail 'legacy Relay owner remains in PROJECT_ADAPTER; product identity references must be direct project data'
    } elseif ($adapter.ContainsKey('ProductIdentity') -and $adapter.ProductIdentity.ContainsKey('References')) {
        $references = @($adapter.ProductIdentity.References)
    } elseif ($adapter.ContainsKey('Requirements') -and $adapter.Requirements.ContainsKey('ProductIdentityReferences')) {
        $references = @($adapter.Requirements.ProductIdentityReferences)
    }
}
if ($references.Count -eq 0) { $references = @($identityTargets.Keys | ForEach-Object { "docs/ai/PRODUCT_IDENTITIES.yml#$($_)*" }) }
if ($references.Count -ne $identityTargets.Count) { Fail "product identity reference count must be exactly $($identityTargets.Count)" }
foreach ($reference in $references) {
    $match = [regex]::Match([string]$reference, '^(?<source>docs/ai/PRODUCT_IDENTITIES\.yml)#(?<prefix>[a-z][a-z0-9_]*)\*$')
    if (-not $match.Success) { Fail "product identity reference format is invalid: $reference"; continue }
    $prefix = $match.Groups['prefix'].Value
    if (-not $seenPrefixes.Add($prefix)) { Fail "duplicate product identity prefix: $prefix"; continue }
    if (-not $identityTargets.Contains($prefix)) { Fail "unknown product identity prefix: $prefix"; continue }
    $target = Read-ExactField $identityText ($prefix + 'file') 'docs/ai/PRODUCT_IDENTITIES.yml'
    $recorded = Read-ExactField $identityText ($prefix + 'sha256') 'docs/ai/PRODUCT_IDENTITIES.yml'
    if ($null -eq $target -or $null -eq $recorded) { continue }
    if ($target -cne $identityTargets[$prefix]) { Fail "product identity target mismatch for $prefix"; continue }
    if ($recorded -notmatch '^[A-F0-9]{64}$') { Fail "product identity SHA-256 is invalid for $prefix"; continue }
    $targetPath = Join-Path $root $target
    if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) { Fail "product identity target is missing: $target"; continue }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $targetPath).Hash
    if ($actual -cne $recorded) { Fail "product identity byte hash mismatch: $target" }
}
foreach ($prefix in $identityTargets.Keys) { if (-not $seenPrefixes.Contains([string]$prefix)) { Fail "product identity reference missing for prefix: $prefix" } }

$projectOwner = Join-Path $root 'docs/ai/PROJECT.md'
if (-not (Test-Path -LiteralPath $projectOwner -PathType Leaf)) { Fail 'docs/ai/PROJECT.md is missing' }
else {
    $projectText = [IO.File]::ReadAllText($projectOwner, (New-Object Text.UTF8Encoding($false, $true)))
    foreach ($marker in @('monetary','effective rule','double counting','data preservation')) {
        if ($projectText.IndexOf($marker, [StringComparison]::OrdinalIgnoreCase) -lt 0) { Fail "PROJECT.md omits non-relaxable safety marker: $marker" }
    }
}

try { & (Join-Path $root 'tools/validate-audit-identities.ps1') -ProjectRoot $root | Out-Null }
catch { Fail "audit identity validation failed: $($_.Exception.Message)" }
try { & (Join-Path $root 'tools/test-audit-identity-normalization.ps1') | Out-Null }
catch { Fail "audit identity normalization test failed: $($_.Exception.Message)" }

if ($failures.Count -gt 0) { foreach ($failure in $failures) { [Console]::Error.WriteLine("governance error: $failure") }; exit 1 }
Write-Output 'Project overlay validation passed (product identity hashes and audit identities).'
