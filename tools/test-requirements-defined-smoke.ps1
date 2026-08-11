[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8NoBom = [Text.UTF8Encoding]::new($false)
$powershellExe = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$temporaryRoot = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ('pfp-task001-product-identity-' + [guid]::NewGuid().ToString('N'))))

function Invoke-Git([string]$Repository,[string[]]$Arguments,[string]$Context) {
    $output = @(& git -C $Repository @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "$Context failed: $($output -join "`n")" }
    $output
}
function New-Fixture([string]$Name,[string]$Branch) {
    $fixture = Join-Path $temporaryRoot $Name
    $output = @(& git clone --no-checkout --quiet $root $fixture 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "fixture clone failed: $($output -join "`n")" }
    Invoke-Git $fixture @('config','core.autocrlf','false') "$Name autocrlf" | Out-Null
    Invoke-Git $fixture @('config','user.name','TASK-001 product identity smoke') "$Name user" | Out-Null
    Invoke-Git $fixture @('config','user.email','task001-product-identity@example.invalid') "$Name email" | Out-Null
    Invoke-Git $fixture @('checkout','-q','-b',$Branch,'HEAD') "$Name checkout" | Out-Null
    Invoke-Git $fixture @('remote','set-url','origin','https://github.com/Osato-Gasu/Personal-Finance-Planner.git') "$Name remote" | Out-Null
    $fixture
}
function Get-Snapshot([string]$Project) {
    $files = [ordered]@{}
    Get-ChildItem -LiteralPath $Project -Recurse -File -Force | Where-Object { $_.FullName -notlike "$Project\.git\*" } | Sort-Object FullName | ForEach-Object {
        $relative = $_.FullName.Substring($Project.Length + 1).Replace('\','/')
        $files[$relative] = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
    }
    $directories = @(Get-ChildItem -LiteralPath $Project -Recurse -Directory -Force | Where-Object { $_.FullName -notlike "$Project\.git*" } | ForEach-Object { $_.FullName.Substring($Project.Length + 1).Replace('\','/') } | Sort-Object)
    [pscustomobject]@{ Files=$files; Directories=$directories }
}
function Test-Snapshot($Before,$After) { (ConvertTo-Json $Before -Depth 6 -Compress) -ceq (ConvertTo-Json $After -Depth 6 -Compress) }
function New-RequirementsBundle([string]$Project,[string]$Branch,[string]$Reference) {
    $head = (@(Invoke-Git $Project @('rev-parse','HEAD') 'fixture HEAD'))[-1].Trim()
    $tree = (@(Invoke-Git $Project @('rev-parse','HEAD^{tree}') 'fixture tree'))[-1].Trim()
    [pscustomobject][ordered]@{
        schema_version = 2
        status = 'USER_RELAY_REQUIRED'
        task_id = 'TASK-002'
        spec_revision = 1
        repository = 'Osato-Gasu/Personal-Finance-Planner'
        branch = $Branch
        relay_recipient = 'Codex'
        relay_recipient_role = 'IMPLEMENTER'
        result_return_to = 'ChatGPT'
        reviewed_candidate = 'none'
        reviewed_handoff_head = 'none'
        shared_candidate = '10cd1466b10f814f1bd2aab2c5f6ba6465c5899e'
        decision = 'REQUIREMENTS_DEFINED'
        review_stage = 'implementation'
        next_phase = 'implementation'
        next_actor = 'Codex'
        next_role = 'IMPLEMENTER'
        model = '5.6 Sol'
        effort = 'high'
        purpose = 'verify zero-active requirements relay materialization'
        scope = @('governance smoke fixture only')
        out_of_scope = @('product implementation')
        findings = @()
        acceptance_criteria = @('TASK-002 governance artifacts are synchronized')
        tests = @('project validator passes')
        forbidden_changes = @('do not change docs/product')
        independent_review = $null
        independent_review_result = $null
        finding_dispositions = $null
        requirements = [pscustomobject][ordered]@{
            title = 'Product identity smoke fixture'
            priority = 'normal'
            base_commit = $head
            base_tree = $tree
            accepted_product_identity_reference = $Reference
            browser_evidence_required = $false
            claude_design_review_recommendation = 'not_needed'
            claude_implementation_review_recommendation = 'not_needed'
            claude_design_review_required = $false
            claude_implementation_review_required = $false
            claude_design_review_status = 'not_requested'
            claude_implementation_review_status = 'not_requested'
            preferred_executor = 'Claude'
            allowed_executors = 'Claude, ChatGPT'
            executor_policy = 'preferred_fallback'
            rollback = 'discard the isolated fixture'
            handoff_mode = 'new'
            build = @('governance-only smoke')
            project_metadata = [pscustomobject]@{}
        }
        created_at = '2026-08-11 00:00:00 JST'
    }
}
function Write-Bundle([string]$Path,$Bundle) { [IO.File]::WriteAllText($Path,($Bundle | ConvertTo-Json -Depth 30),$utf8NoBom) }
function Invoke-Relay([string]$Project,[string]$BundlePath) {
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $BundlePath).Hash
    $bytes = (Get-Item -LiteralPath $BundlePath).Length
    $script = Join-Path $Project 'docs/ai/generated/shared/tools/relay-bundle.ps1'
    $output = @(& $powershellExe -NoProfile -ExecutionPolicy Bypass -File $script -Action Import -ProjectRoot $Project -BundlePath $BundlePath -ExpectedSha256 $sha -ExpectedBytes $bytes 2>&1)
    [pscustomobject]@{ ExitCode=$LASTEXITCODE; Output=($output -join "`n") }
}

$sourceStatus = @(git -C $root status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $sourceStatus.Count -ne 0) { throw 'product identity smoke requires a clean source worktree' }

[IO.Directory]::CreateDirectory($temporaryRoot) | Out-Null
try {
    $successBranch = 'codex/task-002-product-identity-smoke'
    $success = New-Fixture 'success' $successBranch
    $successBundlePath = Join-Path $temporaryRoot 'success.json'
    Write-Bundle $successBundlePath (New-RequirementsBundle $success $successBranch 'docs/ai/PRODUCT_IDENTITIES.yml#requirements_*')
    $successResult = Invoke-Relay $success $successBundlePath
    if ($successResult.ExitCode -ne 0) { throw "valid REQUIREMENTS_DEFINED import failed: $($successResult.Output)" }
    $taskPath = Join-Path $success 'docs/ai/tasks/TASK-002.md'
    $handoffPath = Join-Path $success 'docs/ai/handoffs/TASK-002/CODEX_HANDOFF.md'
    $state = [IO.File]::ReadAllText((Join-Path $success 'docs/ai/CURRENT_STATE.md'))
    $next = [IO.File]::ReadAllText((Join-Path $success 'docs/ai/NEXT_ACTION.yml'))
    $progress = [IO.File]::ReadAllText((Join-Path $success 'board/PROGRESS.html'))
    if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf) -or -not (Test-Path -LiteralPath $handoffPath -PathType Leaf) -or $state -notmatch '(?m)^\s+-\s+TASK-002\s*$' -or $next -notmatch '(?m)^task_id:\s*TASK-002\s*$' -or $progress -notmatch 'TASK-002') { throw 'valid REQUIREMENTS_DEFINED import did not synchronize TASK-002 artifacts' }
    & (Join-Path $success 'tools/generate-next-action.ps1') -Check | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'generated NEXT_ACTION smoke check failed' }
    & (Join-Path $success 'tools/generate-progress.ps1') -Check | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'generated Progress smoke check failed' }
    & (Join-Path $success 'tools/validate-ai-governance.ps1') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'project validator failed after valid REQUIREMENTS_DEFINED import' }

    $invalidBranch = 'codex/task-002-invalid-product-identity'
    $invalid = New-Fixture 'invalid' $invalidBranch
    $invalidAdapterPath = Join-Path $invalid 'docs/ai/PROJECT_ADAPTER.psd1'
    $invalidAdapter = [IO.File]::ReadAllText($invalidAdapterPath).Replace("'docs/ai/PRODUCT_IDENTITIES.yml#requirements_*'","'docs/product/REQUIREMENTS.md'")
    [IO.File]::WriteAllText($invalidAdapterPath,$invalidAdapter,[Text.UTF8Encoding]::new($true))
    Invoke-Git $invalid @('add','docs/ai/PROJECT_ADAPTER.psd1') 'invalid adapter add' | Out-Null
    Invoke-Git $invalid @('commit','-q','-m','invalid plain product identity reference') 'invalid adapter commit' | Out-Null
    $invalidBundlePath = Join-Path $temporaryRoot 'invalid.json'
    Write-Bundle $invalidBundlePath (New-RequirementsBundle $invalid $invalidBranch 'docs/product/REQUIREMENTS.md')
    $before = Get-Snapshot $invalid
    $invalidResult = Invoke-Relay $invalid $invalidBundlePath
    $after = Get-Snapshot $invalid
    $invalidStatus = @(git -C $invalid status --porcelain=v1 --untracked-files=all)
    if ($invalidResult.ExitCode -eq 0 -or $invalidResult.Output -notmatch 'accepted product identity reference is invalid' -or -not (Test-Snapshot $before $after) -or $invalidStatus.Count -ne 0) { throw "invalid product identity reference was not rejected before write: $($invalidResult.Output)" }
    if (Test-Path -LiteralPath (Join-Path $invalid 'docs/ai/tasks/TASK-002.md')) { throw 'invalid product identity reference created TASK-002' }

    Write-Output 'Product identity REQUIREMENTS_DEFINED smoke passed: valid import and invalid pre-write rejection.'
} finally {
    $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($temporaryRoot.StartsWith($tempBase,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $temporaryRoot) -like 'pfp-task001-product-identity-*' -and (Test-Path -LiteralPath $temporaryRoot -PathType Container)) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}
