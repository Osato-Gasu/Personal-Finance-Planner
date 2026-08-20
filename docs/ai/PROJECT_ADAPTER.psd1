@{
    SchemaVersion = 2
    ProjectName = 'Personal Finance Planner'
    PermanentRequirementsHandoff = 'docs/ai/handoffs/PROJECT_REQUIREMENTS.md'

    ProjectOverlayValidator = 'tools/validate-project-overlay.ps1'
    RuleRelations = @()
    ProjectConstraints = @{
        ReviewClassFloor = 'none'
        ProhibitedRouteIds = @()
        MinimumRouteByAssignmentClass = @{
            CHATGPT_ORCHESTRATOR = @{
                small = 'none'
                normal = 'none'
                high_risk = 'none'
            }
            CHATGPT_INDEPENDENT_REVIEWER = @{
                small = 'none'
                normal = 'none'
                high_risk = 'none'
            }
            CODEX_MAIN = @{
                small = 'none'
                normal = 'none'
                high_risk = 'none'
            }
            BOUNDED_BUILD = @{
                small = 'none'
                normal = 'none'
                high_risk = 'none'
            }
            AUTHORITATIVE_VERIFY = @{
                small = 'none'
                normal = 'none'
                high_risk = 'none'
            }
        }
    }
    StartupContextLimitBytes = 65536
    ExtensionDomains = @{}

    ActiveTaskLimitBytes = 32768
    PhaseExtensions = @()
    ReviewCategoryExtensions = @()
    TaskHistory = @{
        CompletedTaskFilePolicy = 'git_only'
        RetainedTaskStates = @()
    }
    Backlog = @{
        Columns = @(
            @{ Key = 'id'; Header = 'ID'; SourceHeader = 'ID'; Type = 'id' }
            @{ Key = 'priority'; Header = 'Priority'; SourceHeader = 'priority'; Type = 'map'; Labels = @{ high = 'High'; normal = 'Normal'; low = 'Low' } }
            @{ Key = 'status'; Header = 'Status'; SourceHeader = 'status'; Type = 'map'; Labels = @{ ready = 'Ready'; queued = 'Queued'; blocked = 'Blocked'; completed = 'Completed' } }
            @{ Key = 'risk'; Header = 'Risk'; SourceHeader = 'risk'; Type = 'map'; Labels = @{ high = 'High'; medium = 'Medium'; low = 'Low' } }
            @{ Key = 'phase'; Header = 'Phase'; SourceHeader = 'phase'; Type = 'text' }
            @{ Key = 'title'; Header = 'Title'; SourceHeader = 'title'; Type = 'text' }
            @{ Key = 'dependency'; Header = 'Dependency'; SourceHeader = 'dependency'; Type = 'text' }
            @{ Key = 'next_step'; Header = 'Next step'; SourceHeader = 'next_step'; Type = 'text' }
        )
    }
    ProductIdentity = @{ Mode = 'none'; Display = $false }
    Relay = @{
        Repository = 'Osato-Gasu/Personal-Finance-Planner'
        Requirements = @{
            RequireProductIdentityReference = $true
            ProductIdentityReferences = @(
                'docs/ai/PRODUCT_IDENTITIES.yml#requirements_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#architecture_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#data_model_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#calculations_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#rule_governance_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#review_policy_*'
                'docs/ai/PRODUCT_IDENTITIES.yml#delivery_plan_*'
            )
            TaskMetadata = @()
        }
    }
}
