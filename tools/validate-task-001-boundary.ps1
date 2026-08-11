[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$baseline = '171a1879416e6454a837c12fd465eb3eab111c35'
$baselineTree = 'f9f91d1d7cf40d78f401ee3791eb5544b0b30514'
$failures = [Collections.Generic.List[string]]::new()
function Fail([string]$Message) { $script:failures.Add($Message) }

$actualTree = (& git -C $root rev-parse "$baseline^{tree}" 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $actualTree -cne $baselineTree) { Fail 'product baseline commit/tree identity mismatch' }
& git -C $root merge-base --is-ancestor $baseline HEAD
if ($LASTEXITCODE -ne 0) { Fail 'product baseline is not an ancestor of HEAD' }

$protected = @('README.md','.gitattributes','.gitignore','docs/product')
$protectedDiff = @(& git -C $root diff --name-only $baseline -- @protected)
if ($LASTEXITCODE -ne 0) { Fail 'unable to compare protected product files to baseline' }
if ($protectedDiff.Count -gt 0) { Fail ('protected product files changed: ' + ($protectedDiff -join ', ')) }
$untrackedProtected = @(& git -C $root ls-files --others --exclude-standard -- @protected)
if ($LASTEXITCODE -ne 0) { Fail 'unable to inspect untracked protected product files' }
if ($untrackedProtected.Count -gt 0) { Fail ('untracked protected product files exist: ' + ($untrackedProtected -join ', ')) }

$allPaths = @(& git -C $root ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { Fail 'unable to inspect TASK-001 candidate paths' }
$forbidden = @($allPaths | Where-Object {
    $_ -ceq 'package.json' -or $_ -like 'src/*' -or $_ -like 'tests/*' -or $_ -like 'test/*' -or
    $_ -like 'rules/*' -or $_ -like 'rule-data/*'
})
if ($forbidden.Count -gt 0) { Fail ('TASK-001 forbidden paths exist: ' + ($forbidden -join ', ')) }

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { [Console]::Error.WriteLine("TASK-001 boundary error: $failure") }
    exit 1
}
Write-Output 'TASK-001 boundary validation passed.'
