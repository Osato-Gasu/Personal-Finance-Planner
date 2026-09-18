[CmdletBinding()]
param([string]$ProjectRoot)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = Join-Path $PSScriptRoot '..' }
$root = [IO.Path]::GetFullPath($ProjectRoot)
$baseline = 'e7de34d7b36b7f6ec514d321a0b66381cc810fa2'
$baselineTree = '1653fbcc89c029da3546145ed54b500e9e0a8266'
$tree = @(& git -C $root rev-parse "$baseline^{tree}")
if ($LASTEXITCODE -ne 0 -or $tree.Count -ne 1 -or $tree[0] -cne $baselineTree) { throw 'TASK-020 exact baseline tree mismatch' }
& git -C $root merge-base --is-ancestor $baseline HEAD
if ($LASTEXITCODE -ne 0) { throw 'TASK-020 baseline is not an ancestor' }

$changed = @(& git -C $root diff --name-only $baseline)
if ($LASTEXITCODE -ne 0) { throw 'TASK-020 protected diff cannot be read' }
$untracked = @(& git -C $root ls-files --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'TASK-020 untracked paths cannot be read' }
$allowedRoot = @('AGENTS.md', '.github/workflows/ci.yml', 'board/PROGRESS.html')
foreach ($path in @($changed) + @($untracked)) {
    if ($allowedRoot -ccontains $path -or $path.StartsWith('docs/ai/', [StringComparison]::Ordinal) -or
        $path -cmatch '^tools/[A-Za-z0-9-]+\.ps1$') { continue }
    throw "TASK-020 out-of-scope product/config path changed: $path"
}
$protected = @('src','tests','packages','rules','rule-data','docs/product','docs/bootstrap',
    'package.json','package-lock.json','Personal-Finance-Planner.html','README.md',
    '.gitattributes','.gitignore','.nvmrc','index.html','vite.config.ts','eslint.config.js',
    'tsconfig.json','tools/sync-root-launcher.mjs','tools/test-portable-build.mjs',
    'docs/ai/PRODUCT_IDENTITIES.yml','docs/ai/AUDIT_IDENTITIES.json',
    'tools/validate-audit-identities.ps1','tools/test-audit-identity-normalization.ps1',
    'tools/validate-task-001-boundary.ps1')
$protectedChanges = @(& git -C $root diff --name-only $baseline -- @protected)
if ($LASTEXITCODE -ne 0 -or $protectedChanges.Count -ne 0) { throw "TASK-020 protected bytes changed: $($protectedChanges -join ', ')" }
$untrackedProtected = @(& git -C $root ls-files --others --exclude-standard -- @protected)
if ($LASTEXITCODE -ne 0 -or $untrackedProtected.Count -ne 0) { throw 'TASK-020 untracked protected product data exists' }

$prior = @(& git -C $root rev-parse --verify '9fbd3e467dbd72d298afbe9eae46a12629d3306d^{tree}')
if ($LASTEXITCODE -ne 0 -or $prior[0] -cne '0a6711e8a1870adff065b4dc9dbdb2a3f3077d74') { throw 'TASK-020 prior candidate identity was not preserved' }
Write-Output 'TASK-020 boundary PASS: exact baseline/prior candidate preserved; protected product/config/document/audit/launcher bytes unchanged.'
