@{
    SchemaVersion = 2

    Paths = @{
        Source             = 'src'
        Tests              = 'tests'
        ProductDocs        = 'docs/product'
        RootLauncher       = 'Personal-Finance-Planner.html'
        TaskHtml           = 'docs/ai/TASKS.html'
        CanonicalLocalMain = 'C:\Users\satoshi-sugaya.dh\Development\personal\Personal-Finance-Planner'
        CompletionTool     = 'tools/complete-task-local.ps1'
    }

    Commands = @{
        Install          = 'npm ci'
        Typecheck        = 'npm run typecheck'
        Lint             = 'npm run lint'
        FormatCheck      = 'npm run format:check'
        Test             = 'npm run test'
        TestRules        = 'npm run test:rules'
        TestNisa         = 'npm run test:nisa'
        TestIdeco        = 'npm run test:ideco'
        TestOverview     = 'npm run test:overview'
        Build            = 'npm run build'
        VerifyLauncher   = 'npm run verify:launcher'
        Portable         = 'npm run test:portable'
        CompletionTest   = 'npm run test:completion'
        Governance       = 'pwsh -NoProfile -File tools/validate-ai-governance.ps1'
        SharedSyncSmoke  = 'pwsh -NoProfile -File tools/test-shared2-bootstrap-smoke.ps1'
        SharedSyncTest   = 'pwsh -NoProfile -File tools/test-shared-sync-contract.ps1'
        TaskHtmlUpdate   = 'pwsh -NoProfile -File tools/update-task-html.ps1'
        TaskHtmlCheck    = 'pwsh -NoProfile -File tools/update-task-html.ps1 -Check'
        TaskStartSmoke   = 'pwsh -NoProfile -File tools/test-shared2-bootstrap-smoke.ps1'
        Release          = ''
    }

    CI = @{
        Workflow                  = '.github/workflows/ci.yml'
        FormalTrigger             = 'workflow_dispatch'
        CandidateShaInput         = 'candidate_sha'
        DevelopmentBranchPrefix   = 'no-ci/'
        ReleasedMainGate          = 'identity_only'
        SelfHostedFallbackAllowed = $false
        NonePathGlobs             = @('docs/ai/SHARED_RULES.lock.yml')
        ExtendedPathGlobs         = @(
            'AGENTS.md'
            'docs/ai/PROJECT.md'
            'docs/ai/PROJECT_ADAPTER.psd1'
            'docs/ai/CURRENT_STATE.md'
            'docs/ai/BACKLOG.md'
            'docs/ai/PRODUCT_IDENTITIES.yml'
            'docs/ai/AUDIT_IDENTITIES.json'
            'docs/ai/DECISIONS.md'
            'docs/ai/LEGACY_TASK_INVENTORY.json'
            'docs/ai/TASKS.html'
            'docs/ai/tasks/**'
            'docs/ai/evidence/**'
            'docs/ai/handoffs/**'
            '.github/workflows/**'
            'tools/**'
        )
    }

    SharedSync = @{
        Enabled          = $true
        LockPath         = 'docs/ai/SHARED_RULES.lock.yml'
        ApplyScript      = 'tools/update-shared-reference.ps1'
        SmokeScripts     = @('tools/test-shared2-bootstrap-smoke.ps1')
        AllowedPaths     = @('docs/ai/SHARED_RULES.lock.yml')
        AutoIntegrate    = $true
        SharedSyncCiMode = 'none'
    }
}
