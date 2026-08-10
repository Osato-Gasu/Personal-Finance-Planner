# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

@{
    SchemaVersion = 1
    ProjectName = '<project name>'
    PermanentRequirementsHandoff = 'docs/ai/handoffs/PROJECT_REQUIREMENTS.md'
    ProjectOverlayValidator = 'none'
    StartupContextLimitBytes = 65536
    ActiveTaskLimitBytes = 32768
    ZeroActive = @{ Model='none'; Effort='none' }
    TaskHistory = @{
        CompletedTaskFilePolicy = 'git_only'
        RetainedTaskStates = @()
    }
    Backlog = @{ Columns = @(
        @{ Key='id'; Header='ID'; SourceHeader='ID'; Type='id' }
        @{ Key='status'; Header='Status'; SourceHeader='status'; Type='map'; Labels=@{ ready='Ready'; blocked='Blocked' } }
        @{ Key='title'; Header='Title'; SourceHeader='title'; Type='text' }
    ) }
    PhaseLabels = @{
        requirements='要件定義'; design='設計'; design_review='設計レビュー'; implementation='実装'
        implementation_review='実装レビュー'; browser_evidence='実ブラウザ証拠'; release='リリース'
        completion_sync='完了同期'; user_decision='ユーザー判断'; blocked='停止'; completed='完了'
    }
    DefaultLabelLocale = 'ja-JP'
    RoleLabels = @{ ORCHESTRATOR_AND_REVIEWER='ChatGPT・統括・レビュー担当'; IMPLEMENTER='Codex・実装担当'; INDEPENDENT_REVIEWER='独立レビュー担当'; USER='ユーザー'; NONE='なし' }
    DisplayLabels = @{ Effort=@{ medium='中'; high='高'; xhigh='最高'; Ultra='超高' } }
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
    Relay = @{
        Repository = '<owner/repository>'
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
            'Codex|IMPLEMENTER|codex-model|high'
            'ChatGPT|ORCHESTRATOR_AND_REVIEWER|chatgpt-model|high'
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
            FallbackAssignments = @('ChatGPT|INDEPENDENT_REVIEWER|chatgpt-model|high')
        }
        Requirements = @{
            Priorities = @('low','normal','high')
            RequireProductIdentityReference = $false
            ProductIdentityReferences = @('none')
            Executors = @('Claude','ChatGPT')
            BaseCommitPolicy = 'exact_head'
            TaskMetadata = @()
        }
    }
}
