[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$baseline = '171a1879416e6454a837c12fd465eb3eab111c35'
$baselineTree = 'f9f91d1d7cf40d78f401ee3791eb5544b0b30514'
$failures = [Collections.Generic.List[string]]::new()
function Fail([string]$Message) { $script:failures.Add($Message) }

$actualTree = (& git -C $root rev-parse "$baseline^{tree}").Trim()
if ($LASTEXITCODE -ne 0 -or $actualTree -cne $baselineTree) { Fail 'product baseline commit/tree identity mismatch' }
& git -C $root merge-base --is-ancestor $baseline HEAD
if ($LASTEXITCODE -ne 0) { Fail 'product baseline is not an ancestor of HEAD' }

$protected = @('README.md','.gitattributes','.gitignore','docs/product')
$protectedDiff = @(& git -C $root diff --name-only $baseline -- @protected)
if ($LASTEXITCODE -ne 0) { Fail 'unable to compare protected product files to baseline' }
if ($protectedDiff.Count -gt 0) { Fail ('protected product files changed: ' + ($protectedDiff -join ', ')) }

$allPaths = @(& git -C $root ls-files --cached --others --exclude-standard)
$forbidden = @($allPaths | Where-Object {
    $_ -ceq 'package.json' -or $_ -like 'src/*' -or $_ -like 'tests/*' -or $_ -like 'test/*' -or
    $_ -like 'rules/*' -or $_ -like 'rule-data/*'
})
if ($forbidden.Count -gt 0) { Fail ('TASK-001 forbidden paths exist: ' + ($forbidden -join ', ')) }

$adapterPath = Join-Path $root 'docs/ai/PROJECT_ADAPTER.psd1'
$adapter = Import-PowerShellDataFile -LiteralPath $adapterPath
$review = $adapter.ImplementationReview
if ([int]$review.MaxAttempts -ne 3 -or [int]$review.RelaxationAfterFailures -ne 2 -or [int]$review.RelaxableOnlyOnAttempt -ne 3) { Fail 'implementation review attempt policy is invalid' }
if ([string]$review.FailureAfterFinalAttempt -cne 'NEEDS_USER_DECISION') { Fail 'third failed review must route to NEEDS_USER_DECISION' }
$requiredRelaxable = @('non_required_ui','wording','optional_optimization')
if (@($review.RelaxableCategories).Count -ne 3 -or @($requiredRelaxable | Where-Object { @($review.RelaxableCategories) -cnotcontains $_ }).Count -gt 0) { Fail 'implementation review relaxable categories are invalid' }
foreach ($required in @('money_calculation','rule_period','double_counting','data_preservation')) {
    if (@($review.NonRelaxableCategories) -cnotcontains $required) { Fail "implementation review non-relaxable category missing: $required" }
}

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { [Console]::Error.WriteLine("governance error: $failure") }
    exit 1
}
Write-Output 'Project overlay validation passed.'
