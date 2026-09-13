[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$failures = New-Object 'Collections.Generic.List[string]'
$baseline = 'e7de34d7b36b7f6ec514d321a0b66381cc810fa2'
$baselineTree = '1653fbcc89c029da3546145ed54b500e9e0a8266'

function Fail([string]$Message) {
    $script:failures.Add($Message)
}

function Project-Path([string]$RelativePath) {
    [IO.Path]::GetFullPath((Join-Path $root $RelativePath))
}

function Read-ProjectFile([string]$RelativePath) {
    $path = Project-Path $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Fail "required file is missing: $RelativePath"
        return ''
    }
    [IO.File]::ReadAllText($path)
}

function Normalize-Lf([string]$Text) {
    ($Text -replace "`r`n", "`n") -replace "`r", "`n"
}

function Assert-MapValue($Map, [string]$Key, [string]$Expected, [string]$Owner) {
    if (-not $Map.ContainsKey($Key)) {
        Fail "$Owner is missing key: $Key"
    } elseif ([string]$Map[$Key] -cne $Expected) {
        Fail "$Owner value mismatch for $Key"
    }
}

$requiredFiles = @(
    'AGENTS.md',
    'docs/ai/PROJECT.md',
    'docs/ai/PROJECT_ADAPTER.psd1',
    'docs/ai/SHARED_RULES.lock.yml',
    'docs/ai/AUDIT_IDENTITIES.json',
    'docs/ai/tasks/TASK-020.md',
    'docs/ai/evidence/TASK-020/EVENTS.jsonl',
    'tools/validate-ai-governance.ps1',
    'tools/test-shared2-task-start.ps1',
    'tools/generate-progress.ps1',
    'board/PROGRESS.html',
    '.github/workflows/ci.yml'
)
foreach ($relative in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Project-Path $relative) -PathType Leaf)) {
        Fail "required file is missing: $relative"
    }
}

$forbiddenPaths = @(
    'docs/ai/PROJECT_RULES.md',
    'docs/ai/WORKFLOW.md',
    'docs/ai/CURRENT_STATE.md',
    'docs/ai/NEXT_ACTION.yml',
    'docs/ai/BACKLOG.md',
    'docs/ai/DECISIONS.md',
    'docs/ai/SESSION_START.md',
    'docs/ai/PRODUCT_IDENTITIES.yml',
    'docs/ai/handoffs/PROJECT_REQUIREMENTS.md',
    'docs/ai/generated/shared',
    'tools/generate-next-action.ps1',
    'tools/relay-bundle.ps1',
    'tools/route-go.ps1',
    'tools/sync-shared-governance.ps1',
    'tools/test-requirements-defined-smoke.ps1',
    'tools/validate-project-overlay.ps1',
    'tools/validate-audit-identities.ps1',
    'tools/test-audit-identity-normalization.ps1',
    'tools/validate-task-001-boundary.ps1'
)
foreach ($relative in $forbiddenPaths) {
    if (Test-Path -LiteralPath (Project-Path $relative)) {
        Fail "legacy path remains: $relative"
    }
}

$lock = Normalize-Lf (Read-ProjectFile 'docs/ai/SHARED_RULES.lock.yml')
$expectedLock = @(
    'schema_version: 2',
    'source_repository: Osato-Gasu/shared',
    'source_version: 2.0.0',
    'source_commit: a528200ffdd71747e320abaad1da807e27ba14e3'
) -join "`n"
if ($lock.TrimEnd("`n") -cne $expectedLock) {
    Fail 'Shared lock is not the exact schema-2 TASK-020 identity'
}

$agents = Normalize-Lf (Read-ProjectFile 'AGENTS.md')
foreach ($fragment in @(
    'Load the exact Shared commit selected by `docs/ai/SHARED_RULES.lock.yml`.',
    'Read Shared `AGENTS.md`.',
    'Read `docs/ai/PROJECT.md` when present.',
    'Read only the TASK explicitly assigned to the session.',
    'Do not infer active TASK state from generated view files.'
)) {
    if (-not $agents.Contains($fragment)) { Fail "AGENTS bootstrap is missing: $fragment" }
}
if ($agents.Contains('docs/ai/generated/shared/')) {
    Fail 'AGENTS still references the generated Shared snapshot'
}

$project = Normalize-Lf (Read-ProjectFile 'docs/ai/PROJECT.md')
foreach ($fragment in @(
    'Canonical owner for Personal Finance Planner repository-specific permanent',
    '`docs/product/**`',
    'Monetary calculations, effective rule periods, prevention of double counting,',
    '`docs/ai/AUDIT_IDENTITIES.json` is legacy historical evidence only.',
    '`board/PROGRESS.html`, when present, is a non-normative human view only.'
)) {
    if (-not $project.Contains($fragment)) { Fail "PROJECT owner is missing: $fragment" }
}

$adapter = $null
try {
    $adapter = Import-PowerShellDataFile -LiteralPath (Project-Path 'docs/ai/PROJECT_ADAPTER.psd1')
} catch {
    Fail "PROJECT_ADAPTER import failed: $($_.Exception.Message)"
}
if ($null -ne $adapter) {
    if ([int]$adapter.SchemaVersion -ne 2) { Fail 'PROJECT_ADAPTER SchemaVersion is not 2' }
    $topKeys = @($adapter.Keys | ForEach-Object { [string]$_ } | Sort-Object) -join ','
    if ($topKeys -cne 'CI,Commands,Paths,SchemaVersion') { Fail "PROJECT_ADAPTER top-level keys differ: $topKeys" }

    $expectedPaths = [ordered]@{
        Source = 'src'
        Tests = 'tests'
        ProductDocs = 'docs/product'
        RootLauncher = 'Personal-Finance-Planner.html'
        ProgressView = 'board/PROGRESS.html'
        CanonicalLocalMain = 'C:\Users\satoshi-sugaya.dh\Development\personal\Personal-Finance-Planner'
        CompletionTool = 'tools/complete-task-local.ps1'
    }
    foreach ($key in $expectedPaths.Keys) { Assert-MapValue $adapter.Paths $key $expectedPaths[$key] 'PROJECT_ADAPTER.Paths' }

    $expectedCommands = [ordered]@{
        Install = 'npm ci'
        Typecheck = 'npm run typecheck'
        Lint = 'npm run lint'
        FormatCheck = 'npm run format:check'
        Test = 'npm run test'
        TestRules = 'npm run test:rules'
        TestNisa = 'npm run test:nisa'
        TestIdeco = 'npm run test:ideco'
        TestOverview = 'npm run test:overview'
        Build = 'npm run build'
        VerifyLauncher = 'npm run verify:launcher'
        Portable = 'npm run test:portable'
        CompletionTest = 'npm run test:completion'
        Governance = 'pwsh -NoProfile -File tools/validate-ai-governance.ps1'
        TaskStartSmoke = 'pwsh -NoProfile -File tools/test-shared2-task-start.ps1'
        Release = ''
    }
    foreach ($key in $expectedCommands.Keys) { Assert-MapValue $adapter.Commands $key $expectedCommands[$key] 'PROJECT_ADAPTER.Commands' }
    Assert-MapValue $adapter.CI 'WorkflowName' 'Governance CI' 'PROJECT_ADAPTER.CI'
}

$task = Normalize-Lf (Read-ProjectFile 'docs/ai/tasks/TASK-020.md')
$frontmatterMatch = [regex]::Match($task, '(?ms)\A---\n(?<value>.*?)\n---(?:\n|$)')
if (-not $frontmatterMatch.Success) {
    Fail 'TASK-020 frontmatter is missing or malformed'
} else {
    $frontmatter = $frontmatterMatch.Groups['value'].Value
    foreach ($pair in @(
        @('task_id', 'TASK-020'),
        @('status', 'ACTIVE'),
        @('risk', 'high')
    )) {
        if ($frontmatter -notmatch "(?m)^$([regex]::Escape($pair[0])):\s*$([regex]::Escape($pair[1]))\s*$") {
            Fail "TASK-020 frontmatter mismatch for $($pair[0])"
        }
    }
    if ($frontmatter -notmatch '(?m)^phase:\s*(BuildVerifyFix|RCFreeze|Acceptance)\s*$') {
        Fail 'TASK-020 phase is outside the allowed migration phases'
    }
}

$taskFiles = @(Get-ChildItem -LiteralPath (Project-Path 'docs/ai/tasks') -File -Filter 'TASK-*.md')
$activeTaskIds = New-Object 'Collections.Generic.List[string]'
foreach ($taskFile in $taskFiles) {
    $taskText = Normalize-Lf ([IO.File]::ReadAllText($taskFile.FullName))
    if ($taskText -match '(?m)^status:\s*ACTIVE\s*$') {
        if ($taskText -match '(?m)^task_id:\s*(TASK-[0-9]+)\s*$') {
            $activeTaskIds.Add($Matches[1])
        } else {
            Fail "active TASK has no valid task_id: $($taskFile.Name)"
        }
    }
}
if (($activeTaskIds -join ',') -cne 'TASK-020') {
    Fail "TASK-020 must be the only active TASK: $($activeTaskIds -join ',')"
}

$eventsPath = Project-Path 'docs/ai/evidence/TASK-020/EVENTS.jsonl'
if (Test-Path -LiteralPath $eventsPath -PathType Leaf) {
    $eventIds = New-Object 'Collections.Generic.HashSet[string]'
    $lineNumber = 0
    foreach ($line in [IO.File]::ReadAllLines($eventsPath)) {
        $lineNumber++
        if ([string]::IsNullOrWhiteSpace($line)) { Fail "EVENTS contains a blank line at $lineNumber"; continue }
        try { $event = $line | ConvertFrom-Json } catch { Fail "EVENTS line $lineNumber is invalid JSON"; continue }
        if ([string]::IsNullOrWhiteSpace([string]$event.event_id)) { Fail "EVENTS line $lineNumber has no event_id" }
        elseif (-not $eventIds.Add([string]$event.event_id)) { Fail "EVENTS has duplicate event_id: $($event.event_id)" }
        if ([string]::IsNullOrWhiteSpace([string]$event.type) -or [string]::IsNullOrWhiteSpace([string]$event.result)) {
            Fail "EVENTS line $lineNumber lacks type/result"
        }
        if ($null -eq $event.actual_model -or $null -eq $event.actual_effort) {
            Fail "EVENTS line $lineNumber must state actual model/effort or unknown"
        }
    }
}

$auditPath = Project-Path 'docs/ai/AUDIT_IDENTITIES.json'
if (Test-Path -LiteralPath $auditPath -PathType Leaf) {
    $auditSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $auditPath).Hash
    $auditBytes = (Get-Item -LiteralPath $auditPath).Length
    $auditBlob = [string](& git -C $root hash-object 'docs/ai/AUDIT_IDENTITIES.json')
    if ($LASTEXITCODE -ne 0) { Fail 'unable to hash AUDIT_IDENTITIES.json as Git blob' }
    if ($auditSha -cne '4029B2F7F472B8BBE7DF83F6E257594608F332629CBA85C3C77BC9D850FFAAB1' -or
        $auditBytes -ne 1250 -or $auditBlob.Trim() -cne 'e74c4b6492bd94db1eb887eb391e1dbc2273bc0a') {
        Fail 'AUDIT_IDENTITIES.json historical bytes changed'
    }
}

$actualBaselineTree = [string](& git -C $root rev-parse "$baseline^{tree}" 2>$null)
if ($LASTEXITCODE -ne 0 -or $actualBaselineTree.Trim() -cne $baselineTree) {
    Fail 'TASK-020 baseline commit/tree identity mismatch'
}
& git -C $root merge-base --is-ancestor $baseline HEAD 2>$null
if ($LASTEXITCODE -ne 0) { Fail 'TASK-020 baseline is not an ancestor of HEAD' }

$protected = @(
    'src', 'tests', 'docs/product', 'Personal-Finance-Planner.html', 'index.html',
    'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json',
    'eslint.config.js', 'tools/sync-root-launcher.mjs',
    'tools/test-portable-build.mjs', 'tools/complete-task-local.ps1',
    'tools/test-complete-task-local.ps1'
)
$protectedDiff = @(& git -C $root diff --name-only $baseline -- @protected)
if ($LASTEXITCODE -ne 0) { Fail 'unable to compare protected paths to TASK-020 baseline' }
if ($protectedDiff.Count -gt 0) { Fail ('protected paths changed: ' + ($protectedDiff -join ', ')) }
$untrackedProtected = @(& git -C $root ls-files --others --exclude-standard -- @protected)
if ($LASTEXITCODE -ne 0) { Fail 'unable to inspect untracked protected paths' }
if ($untrackedProtected.Count -gt 0) { Fail ('untracked protected paths exist: ' + ($untrackedProtected -join ', ')) }

$ci = Normalize-Lf (Read-ProjectFile '.github/workflows/ci.yml')
if ($ci -notmatch '(?m)^name:\s*Governance CI\s*$') { Fail 'workflow name is not Governance CI' }
foreach ($fragment in @(
    './tools/validate-ai-governance.ps1',
    './tools/test-shared2-task-start.ps1',
    'npm ci',
    'npm run typecheck',
    'npm run lint',
    'npm run format:check',
    'npm run test',
    'npm run test:rules',
    'npm run test:nisa',
    'npm run test:ideco',
    'npm run test:overview',
    'npm run build:app',
    'node tools/sync-root-launcher.mjs --check',
    './tools/test-complete-task-local.ps1',
    'npm run test:portable'
)) {
    if (-not $ci.Contains($fragment)) { Fail "CI gate is missing: $fragment" }
}
foreach ($legacyFragment in @('validate-task-001-boundary.ps1', 'test-requirements-defined-smoke.ps1', 'docs/ai/generated/shared')) {
    if ($ci.Contains($legacyFragment)) { Fail "CI retains legacy gate: $legacyFragment" }
}

$activeReferenceFiles = @(
    'docs/ai/PROJECT.md',
    'docs/ai/PROJECT_ADAPTER.psd1',
    '.github/workflows/ci.yml',
    'README.md',
    'tools/generate-progress.ps1',
    'tools/complete-task-local.ps1',
    'tools/test-complete-task-local.ps1',
    'tools/sync-root-launcher.mjs',
    'tools/test-portable-build.mjs',
    'board/PROGRESS.html'
)
$legacyOperationalReferences = @(
    'docs/ai/generated/shared',
    'docs/ai/CURRENT_STATE.md',
    'docs/ai/NEXT_ACTION.yml',
    'docs/ai/handoffs/PROJECT_REQUIREMENTS.md',
    'docs/ai/PRODUCT_IDENTITIES.yml',
    'tools/generate-next-action.ps1',
    'tools/relay-bundle.ps1',
    'tools/route-go.ps1',
    'tools/sync-shared-governance.ps1',
    'tools/test-requirements-defined-smoke.ps1',
    'tools/validate-project-overlay.ps1'
)
foreach ($relative in $activeReferenceFiles) {
    $path = Project-Path $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
    $text = Normalize-Lf ([IO.File]::ReadAllText($path))
    foreach ($reference in $legacyOperationalReferences) {
        if ($text.Contains($reference)) { Fail "active operational file references legacy path: $relative -> $reference" }
    }
}

$progress = Normalize-Lf (Read-ProjectFile 'board/PROGRESS.html')
if (-not $progress.Contains('NON-NORMATIVE HUMAN VIEW') -or -not $progress.Contains('docs/ai/tasks/TASK-*.md')) {
    Fail 'progress view is not clearly non-normative and TASK-derived'
}

foreach ($scriptRelative in @('tools/validate-ai-governance.ps1', 'tools/generate-progress.ps1', 'tools/test-shared2-task-start.ps1')) {
    $tokens = $null
    $parseErrors = $null
    [void][Management.Automation.Language.Parser]::ParseFile((Project-Path $scriptRelative), [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) { Fail "$scriptRelative has PowerShell parse errors: $($parseErrors -join '; ')" }
}

try {
    & (Project-Path 'tools/generate-progress.ps1') -Check | Out-Null
} catch {
    Fail "progress generation check failed: $($_.Exception.Message)"
}

if ($failures.Count -gt 0) {
    foreach ($failure in $failures) { [Console]::Error.WriteLine("Shared 2 governance error: $failure") }
    exit 1
}

Write-Output 'Shared 2 Project governance validation passed.'
