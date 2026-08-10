@{
    SchemaVersion = 1
    ProjectName = 'Personal Finance Planner'
    PermanentRequirementsHandoff = 'docs/ai/handoffs/PROJECT_REQUIREMENTS.md'
    ProjectOverlayValidator = 'tools/validate-project-overlay.ps1'
    StartupContextLimitBytes = 65536
    ActiveTaskLimitBytes = 32768
    ZeroActive = @{ Model='5.6 Sol-Pro'; Effort='Pro' }
    TaskHistory = @{
        CompletedTaskFilePolicy = 'git_only'
        RetainedTaskStates = @()
    }
    Backlog = @{ Columns = @(
        @{ Key='id'; Header='ID'; SourceHeader='ID'; Type='id' }
        @{ Key='priority'; Header='優先度'; SourceHeader='優先度'; Type='map'; Labels=@{ high='高'; normal='中'; low='低' } }
        @{ Key='status'; Header='状態'; SourceHeader='状態'; Type='map'; Labels=@{ ready='準備完了'; queued='待機'; blocked='停止'; completed='完了' } }
        @{ Key='risk'; Header='リスク'; SourceHeader='リスク'; Type='map'; Labels=@{ high='高'; medium='中'; low='低' } }
        @{ Key='phase'; Header='フェーズ'; SourceHeader='フェーズ'; Type='map'; Labels=@{ requirements='要件定義'; design='設計'; design_review='設計レビュー'; implementation='実装'; implementation_review='実装レビュー'; browser_evidence='実ブラウザ証拠'; release='リリース'; completion_sync='完了同期'; user_decision='ユーザー判断'; blocked='停止'; completed='完了' } }
        @{ Key='title'; Header='タイトル'; SourceHeader='タイトル'; Type='text' }
        @{ Key='dependency'; Header='依存'; SourceHeader='依存'; Type='text' }
        @{ Key='next_step'; Header='次の作業'; SourceHeader='次の作業'; Type='text' }
    ) }
    PhaseLabels = @{
        requirements='要件定義'; design='設計'; design_review='設計レビュー'; implementation='実装'
        implementation_review='実装レビュー'; browser_evidence='実ブラウザ証拠'; release='リリース'
        completion_sync='完了同期'; user_decision='ユーザー判断'; blocked='停止'; completed='完了'
    }
    DefaultLabelLocale = 'ja-JP'
    RoleLabels = @{ ORCHESTRATOR_AND_REVIEWER='ChatGPT・統括・レビュー担当'; IMPLEMENTER='Codex・実装担当'; INDEPENDENT_REVIEWER='独立レビュー担当'; USER='ユーザー'; NONE='なし' }
    DisplayLabels = @{ Effort=@{ medium='中'; high='高'; xhigh='最高'; Ultra='超高'; Pro='Pro' } }
    ModelRouting = @{
        CoreRoutes = @('Spark-high','Spark-xhigh','Terra-high','Terra-xhigh','Sol-medium','Sol-high','Sol-xhigh','Sol-Ultra')
        ReviewRoutes = @('Luna-high','Luna-xhigh','Terra-high','Terra-xhigh','Sol-medium','Sol-high','Sol-xhigh','Sol-Ultra')
        DeprecatedRoutes = @()
        DocumentDefault = 'Luna-high'
        CodeDefault = 'Spark-high'
        NewWorkSelection = 'lowest_adequate'
        LunaToSolCostRatio = '1/25'
        TerraToSolCostRatio = '1/2.5'
        UltraRequiresUserApproval = $true
    }
    ProductIdentity = @{ Mode='none'; Display=$false }
    ImplementationReview = @{
        MaxAttempts = 3
        RelaxationAfterFailures = 2
        RelaxableOnlyOnAttempt = 3
        RelaxableCategories = @('non_required_ui','wording','optional_optimization')
        NonRelaxableCategories = @('money_calculation','rule_period','double_counting','data_preservation')
        FailureAfterFinalAttempt = 'NEEDS_USER_DECISION'
    }
    Relay = @{
        Repository = 'Osato-Gasu/Personal-Finance-Planner'
        CandidateIdentity = @{
            Decisions = @{
                APPROVED=@{design='design_candidate';implementation='implementation_candidate'}
                CHANGES_REQUESTED=@{design='design_candidate';implementation='implementation_candidate'}
                BLOCKED=@{design='design_candidate';implementation='implementation_candidate'}
                NEEDS_USER_DECISION=@{design='design_candidate';implementation='implementation_candidate'}
            }
            IndependentReviewKinds = @{ design='design_candidate'; implementation='implementation_candidate' }
        }
        OverlayFailurePattern = '(?m)^.*governance error:\s*(.+)$'
        Assignments = @(
            'Codex|IMPLEMENTER|5.6 Sol|medium'
            'Codex|IMPLEMENTER|5.6 Sol|high'
            'ChatGPT|ORCHESTRATOR_AND_REVIEWER|5.6 Sol-Pro|Pro'
            'ChatGPT|INDEPENDENT_REVIEWER|5.6 Sol-Pro|Pro'
            'USER|USER|none|none'
        )
        NextActionTemplates = @{
            APPROVED = 'Codex processes APPROVED relay for {task_id}'
            CHANGES_REQUESTED = 'Codex processes CHANGES_REQUESTED relay for {task_id}'
            BLOCKED = '{actor} resolves BLOCKED relay for {task_id}'
            NEEDS_USER_DECISION = 'USER decides NEEDS_USER_DECISION relay for {task_id}'
            REQUIREMENTS_DEFINED = 'Codex implements REQUIREMENTS_DEFINED relay for {task_id}'
            INDEPENDENT_REVIEW_REQUESTED = '{actor} performs independent review for {task_id}'
            INDEPENDENT_REVIEW_COMPLETED = 'ChatGPT evaluates completed independent review for {task_id}'
        }
        IndependentReview = @{
            PreferredExecutor = 'Claude'
            FallbackExecutor = 'ChatGPT'
            AllowedKinds = @('design','implementation')
            FallbackAssignments = @('ChatGPT|INDEPENDENT_REVIEWER|5.6 Sol-Pro|Pro')
        }
        Requirements = @{
            Priorities = @('low','normal','high')
            RequireProductIdentityReference = $true
            ProductIdentityReferences = @('docs/product/REQUIREMENTS.md','docs/product/ARCHITECTURE.md','docs/product/DATA_MODEL.md','docs/product/CALCULATIONS.md','docs/product/RULE_GOVERNANCE.md','docs/product/REVIEW_POLICY.md','docs/product/DELIVERY_PLAN.md')
            Executors = @('Claude','ChatGPT')
            BaseCommitPolicy = 'exact_head'
            TaskMetadata = @()
        }
    }
}
