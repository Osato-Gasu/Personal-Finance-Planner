@{
    SchemaVersion = 2

    Paths = @{
        Source             = 'src'
        Tests              = 'tests'
        ProductDocs        = 'docs/product'
        RootLauncher       = 'Personal-Finance-Planner.html'
        ProgressView       = 'board/PROGRESS.html'
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
        TaskStartSmoke   = 'pwsh -NoProfile -File tools/test-shared2-task-start.ps1'
        Release          = ''
    }

    CI = @{
        WorkflowName = 'Governance CI'
    }
}
