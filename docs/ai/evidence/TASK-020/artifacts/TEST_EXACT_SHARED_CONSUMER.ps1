[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$SharedRoot, [string]$ProjectRoot)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../../..')) }
$selected = @(& git -C $SharedRoot rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $selected[0] -cne 'e384d21a43fcda1195556d4ef6fa382bede48da8') { throw 'consumer test requires exact released Shared2.0.6 source' }
$dirty = @(& git -C $SharedRoot status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) { throw 'consumer test requires clean Shared source' }
$script:Policy = Import-PowerShellDataFile -LiteralPath (Join-Path $SharedRoot 'core/POLICY.psd1')
$script:Utf8Strict = New-Object Text.UTF8Encoding($false,$true)
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $SharedRoot 'tools/sync-shared-downstreams.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { throw 'exact Shared consumer source parse failed' }
# Load only trusted, exact-source parser/policy helpers, not top-level Plan/Apply.
# Adapter data continues through Shared's unchanged strict data importer.
$names = @('Fail','Get-MapValue','Test-MapKey','Get-MapKeys','Assert-ExactKeys',
    'Assert-RelativePath','ConvertTo-Text','Get-AstData','Import-StrictDataText',
    'Read-Lock','Read-Adapter','Get-AdapterCiPolicy','Test-Glob','Get-EffectiveCiMode')
foreach ($name in $names) {
    $fn = @($ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst]}, $false) | Where-Object Name -CEQ $name)
    if ($fn.Count -ne 1) { throw "exact Shared helper is missing/ambiguous: $name" }
    . ([scriptblock]::Create($fn[0].Extent.Text))
}
$adapter = Read-Adapter ([IO.File]::ReadAllBytes((Join-Path $ProjectRoot 'docs/ai/PROJECT_ADAPTER.psd1'))) 'Project adapter'
if ($adapter.State -cne 'VALID' -or -not $adapter.Enrolled) { throw "exact consumer adapter is not VALID/Enrolled: $($adapter.Error)" }
$lock = Read-Lock ([IO.File]::ReadAllBytes((Join-Path $ProjectRoot 'docs/ai/SHARED_RULES.lock.yml'))) 'Project lock'
if ($lock.State -cne 'VALID') { throw "exact consumer lock is not VALID: $($lock.Error)" }
$ci = Get-AdapterCiPolicy $adapter
if (-not $ci.Known -or $ci.ReleasedGate -cne 'identity_only') { throw 'exact consumer CI policy is unknown/incompatible' }
$cases = @(
    @{ Paths=@('docs/ai/SHARED_RULES.lock.yml'); Expected='none' },
    @{ Paths=@('tools/update-shared-reference.ps1'); Expected='extended' },
    @{ Paths=@('.github/workflows/ci.yml'); Expected='extended' },
    @{ Paths=@('tools/validate-ai-governance.ps1'); Expected='extended' },
    @{ Paths=@('src/App.tsx'); Expected='candidate' },
    @{ Paths=@('docs/ai/SHARED_RULES.lock.yml','src/App.tsx'); Expected='candidate' },
    @{ Paths=@('unknown.file'); Expected='candidate' }
)
foreach ($case in $cases) {
    $actual = Get-EffectiveCiMode $adapter.Contract $ci $case.Paths
    if ($actual -cne $case.Expected) { throw "exact consumer CI mismatch: $($case.Paths -join ',') -> $actual (expected $($case.Expected))" }
}
Write-Output 'Exact Shared2.0.6 consumer PASS: Adapter VALID/Enrolled, Lock VALID, known identity_only CI; 7 effective-CI path cases PASS. Not a real post-integration Plan.'
