# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

@{
    SchemaVersion = 1
    GovernanceVersion = '1.0.0'

    NormativeLayers = @('global', 'project', 'task')
    NormativeLayerOrder = @('global', 'project', 'task')
    DisplayLayerLabels = @{
        global = 'GLOBAL'
        project = 'PROJECT'
        task = 'TASK'
    }

    NormativeOwners = @{
        global = @('GLOBAL_AGENTS', 'POLICY', 'CONSTITUTION', 'OUTPUT', 'LIFECYCLE', 'ARTIFACTS', 'EXECUTION')
        project = @('PROJECT_RULES', 'WORKFLOW', 'PROJECT_ADAPTER')
        task = @('TASK_BODY')
    }

    ArtifactRoles = @(
        'managed_loader'
        'identity_lock'
        'product_identity'
        'handoff_payload'
        'report_evidence'
        'review_request'
        'review_result'
        'disposition_audit'
        'generated_next_action'
        'generated_progress'
        'generated_entrypoint'
    )

    StateRoles = @(
        'active_task_frontmatter'
        'current_state_index'
        'derived_next_action'
        'derived_progress'
    )

    TaskBodySections = @(
        'objective'
        'scope'
        'out_of_scope'
        'requirements'
        'accepted_required_changes'
        'acceptance_criteria'
        'required_tests_evidence'
        'user_approved_conditions_exceptions'
        'rule_relations'
    )

    LegacyIdMap = @{
        BOOTSTRAP = 'GLOBAL_AGENTS'
        PROJECT_PRODUCT = 'PROJECT_RULES'
        PROJECT_WORKFLOW = 'WORKFLOW'
        PROJECT_VARIATION = 'PROJECT_ADAPTER'
        shared_identity_lock = 'identity_lock'
        assignment_payload = 'handoff_payload'
        audit_record = 'disposition_audit'
        task_frontmatter_state = 'active_task_frontmatter'
        generated_entrypoint = 'generated_entrypoint'
    }

    Declaration = @{
        Name = 'governance-rule-v1'
        ReservedKeys = @(
            'NormativeRuleId'
            'RuleRelations'
            'ConstraintClass'
            'UpperConstraintId'
            'ExtensionKey'
            'PreservedConstraintIds'
            'SemanticReviewRequired'
        )
        ConstraintClasses = @('non_relaxable', 'relaxable')
        Modes = @('reference', 'strengthen', 'specialize')
        Layers = @('global', 'project', 'task')
        SemanticReviewRequired = $true
        RuleIdPattern = '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
        ExtensionPattern = '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
        AnchorPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        PathPattern = '^[A-Za-z0-9._/-]+$'
        TupleFieldCount = 7
        TupleSeparator = '|'
        KeySeparator = ': '
        PreservedSeparator = ', '
        EmptyPreserved = '[]'
        SemanticReviewFlag = 'true'
        MarkdownCarrier = 'markdown'
        ProjectAdapterCarrier = 'project_adapter_psd1'
        MarkdownEmptyAllowed = $true
        ProjectAdapterEmptyBlockAllowed = $false
        ProjectAdapterZeroBlocksAllowed = $true
        ProjectAdapterRootPropertyOrder = @('ProjectOverlayValidator', 'RuleRelations', 'ProjectConstraints', 'StartupContextLimitBytes')
        ExtensionDomains = @{}
    }

    Startup = @{
        CompletenessStatuses = @('complete', 'missing', 'unknown', 'not_applicable')
        TriggerValues = @('true', 'false', 'unknown', 'not_applicable')
        EssentialEvidence = @(
            'repository_identity'
            'shared_identity'
            'objective'
            'scope'
            'out_of_scope'
            'acceptance'
            'project_rules'
            'workflow'
            'project_adapter'
            'shared_lock'
            'external_resource_identity'
        )
        ExternalIdentityNotApplicableOnly = $true
        EvidenceNotApplicableFields = @('external_resource_identity')
        HighRiskTriggers = @(
            'auth_or_authz'
            'security'
            'billing'
            'db_migration'
            'deletion_or_data_loss'
            'major_architecture'
            'broad_compatibility'
            'shared_governance'
            'multi_project_impact'
            'unexplained_severe_failure'
        )
        NormalTriggers = @(
            'new_feature'
            'multi_file_behavior'
            'data_structure'
            'ui_flow'
            'api'
            'non_trivial_algorithm'
            'broad_behavior'
        )
        SmallPredicates = @(
            'small_bounded_cause_scope'
            'small_established_pattern'
            'small_complete_acceptance'
            'small_no_architecture_data_security_product_safety_decision'
        )
        ClassOrder = @('small', 'normal', 'high_risk')
    }

    Routing = @{
        ModelOrder = @('Spark', 'Luna', 'Terra', 'Sol')
        EffortOrder = @('medium', 'high', 'xhigh', 'max')
        RouteIds = @(
            'Spark-high'
            'Spark-xhigh'
            'Luna-high'
            'Luna-xhigh'
            'Terra-high'
            'Terra-xhigh'
            'Sol-medium'
            'Sol-high'
            'Sol-xhigh'
            'Sol-max'
        )
        LegacyRouteMap = @{
            'Spark-high' = 'Spark-high'
            'Spark-xhigh' = 'Spark-xhigh'
            'Luna-high' = 'Luna-high'
            'Luna-xhigh' = 'Luna-xhigh'
            'Terra-high' = 'Terra-high'
            'Terra-xhigh' = 'Terra-xhigh'
            'Sol-medium' = 'Sol-medium'
            'Sol-high' = 'Sol-high'
            'Sol-xhigh' = 'Sol-xhigh'
            'Sol-max' = 'Sol-max'
            'Sol-Ultra' = 'Sol-max'
        }
        PurposeIds = @('CODE', 'REVIEW')
        PurposeOrders = @{
            CODE = @('Spark-high', 'Spark-xhigh', 'Terra-high', 'Terra-xhigh', 'Sol-medium', 'Sol-high', 'Sol-xhigh', 'Sol-max')
            REVIEW = @('Luna-high', 'Luna-xhigh', 'Terra-high', 'Terra-xhigh', 'Sol-medium', 'Sol-high', 'Sol-xhigh', 'Sol-max')
        }
        AssignmentIds = @(
            'CHATGPT_ORCHESTRATOR'
            'CHATGPT_INDEPENDENT_REVIEWER'
            'CODEX_MAIN'
            'BOUNDED_BUILD'
            'AUTHORITATIVE_VERIFY'
        )
        AssignmentPurpose = @{
            CHATGPT_ORCHESTRATOR = 'REVIEW'
            CHATGPT_INDEPENDENT_REVIEWER = 'REVIEW'
            CODEX_MAIN = 'CODE'
            BOUNDED_BUILD = 'CODE'
            AUTHORITATIVE_VERIFY = 'REVIEW'
        }
        AssignmentPurposeMeaning = @{
            CHATGPT_ORCHESTRATOR = 'ChatGPT|ORCHESTRATOR_AND_REVIEWER'
            CHATGPT_INDEPENDENT_REVIEWER = 'ChatGPT|INDEPENDENT_REVIEWER'
            CODEX_MAIN = 'Codex|IMPLEMENTER|Main'
            BOUNDED_BUILD = 'bounded BUILD worker'
            AUTHORITATIVE_VERIFY = 'separated read-only VERIFY'
        }
        GlobalMinimumByAssignmentClass = @{
            CHATGPT_ORCHESTRATOR = @{ small = 'Luna-high'; normal = 'Terra-high'; high_risk = 'Sol-max' }
            CHATGPT_INDEPENDENT_REVIEWER = @{ small = 'not_applicable'; normal = 'Sol-high'; high_risk = 'Sol-max' }
            CODEX_MAIN = @{ small = 'Spark-high'; normal = 'Spark-xhigh'; high_risk = 'Sol-xhigh' }
            BOUNDED_BUILD = @{ small = 'Spark-high'; normal = 'Spark-xhigh'; high_risk = 'Sol-xhigh' }
            AUTHORITATIVE_VERIFY = @{ small = 'Terra-high'; normal = 'Terra-high'; high_risk = 'Sol-xhigh' }
        }
        Availability = @('available', 'unavailable', 'unknown')
    }

    Relay = @{
        DecisionIds = @('APPROVED', 'CHANGES_REQUESTED', 'BLOCKED', 'NEEDS_USER_DECISION')
        EventIds = @('REQUIREMENTS_DEFINED', 'INDEPENDENT_REVIEW_REQUESTED', 'INDEPENDENT_REVIEW_COMPLETED')
        CandidateIdentity = @{
            Decisions = @{
                APPROVED = @{ design = 'design_candidate'; implementation = 'implementation_candidate' }
                CHANGES_REQUESTED = @{ design = 'design_candidate'; implementation = 'implementation_candidate' }
                BLOCKED = @{ design = 'design_candidate'; implementation = 'implementation_candidate' }
                NEEDS_USER_DECISION = @{ design = 'design_candidate'; implementation = 'implementation_candidate' }
            }
            IndependentReviewKinds = @{
                design = 'design_candidate'
                implementation = 'implementation_candidate'
            }
        }
        OverlayFailurePattern = '(?m)^.*governance error:\s*(.+)$'
        NextActionTemplates = @{
            APPROVED = 'Codex processes APPROVED relay for {task_id}'
            CHANGES_REQUESTED = 'Codex processes CHANGES_REQUESTED relay for {task_id}'
            BLOCKED = '{actor} resolves BLOCKED relay for {task_id}'
            NEEDS_USER_DECISION = 'ChatGPT reviews NEEDS_USER_DECISION relay for {task_id} with user confirmation'
            REQUIREMENTS_DEFINED = 'Codex implements REQUIREMENTS_DEFINED relay for {task_id}'
            INDEPENDENT_REVIEW_REQUESTED = '{actor} performs independent review for {task_id}'
            INDEPENDENT_REVIEW_COMPLETED = 'ChatGPT evaluates completed independent review for {task_id}'
        }
        Requirements = @{
            Priorities = @('low', 'normal', 'high')
            Executors = @('ChatGPT')
            BaseCommitPolicy = 'exact_head'
        }
    }

    IndependentReview = @{
        PolicyVersion = 2
        ActiveExecutor = 'ChatGPT'
        AllowedKinds = @('design', 'implementation')
        Role = 'INDEPENDENT_REVIEWER'
        Model = 'Sol'
        AllowedEfforts = @('xhigh', 'max')
        RequiredSessionRelation = 'distinct_conversation'
        ExecutionMode = 'separate_session'
        ExecutorPolicy = 'strict'
        ProviderSubstitution = 'none'
        ReturnPair = 'ChatGPT|ORCHESTRATOR_AND_REVIEWER'
        EvidenceAuthority = 'immutable_repository_only'
        VisibleAuthoringTranscriptAllowed = $false
        AmbientContextPresenceIsFailure = $false
        AmbientContextUseAllowed = $false
        ProhibitedEvidenceSources = @('conversation_memory', 'project_memory', 'personal_context', 'summary_reader', 'file_library', 'unrequested_web')
        RequiredResultAttestations = @('distinct_conversation_user_attested', 'visible_authoring_transcript_present', 'non_repository_context_used', 'ref_resolution_count', 'resolved_commit', 'resolved_tree', 'source_blobs', 'tool_calls')
    }

    ProjectConstraints = @{
        PropertyOrder = @('ReviewClassFloor', 'ProhibitedRouteIds', 'MinimumRouteByAssignmentClass')
        RootPropertyOrder = @('ProjectOverlayValidator', 'RuleRelations', 'ProjectConstraints', 'StartupContextLimitBytes')
        ReviewClassFloor = @('none', 'normal', 'high_risk')
        AssignmentOrder = @('CHATGPT_ORCHESTRATOR', 'CHATGPT_INDEPENDENT_REVIEWER', 'CODEX_MAIN', 'BOUNDED_BUILD', 'AUTHORITATIVE_VERIFY')
        ClassOrder = @('small', 'normal', 'high_risk')
        EmptyMinimum = 'none'
        NotApplicableMinimum = 'not_applicable'
        RuntimeInvalidResult = 'BLOCKED'
    }

    ProjectAdapter = @{
        SchemaVersion = 2
        RootPropertyOrder = @(
            'SchemaVersion'
            'ProjectName'
            'PermanentRequirementsHandoff'
            'ProjectOverlayValidator'
            'RuleRelations'
            'ProjectConstraints'
            'StartupContextLimitBytes'
            'ExtensionDomains'
            'ActiveTaskLimitBytes'
            'PhaseExtensions'
            'ReviewCategoryExtensions'
            'TaskHistory'
            'Backlog'
            'ProductIdentity'
            'Relay'
        )
        PhaseExtensionFields = @('Id', 'PublicPhase', 'SourceReference')
        PhaseExtensionContainerRuntimeType = 'System.Object[]'
        PhaseExtensionRecordRuntimeType = 'System.Collections.Hashtable'
        PhaseExtensionMappingKind = 'direct_public'
        ReviewCategoryContainerRuntimeType = 'System.Object[]'
        ReviewCategoryElementRuntimeType = 'System.String'
        ReviewCategoryOrder = 'ordinal'
        ReviewCategoryAdditiveNonRelaxable = $true
        RelayPropertyOrder = @('Repository', 'Requirements')
        RelayRequirementsPropertyOrder = @('RequireProductIdentityReference', 'ProductIdentityReferences', 'TaskMetadata')
        ForbiddenCommonProperties = @('PhaseLabels', 'DefaultLabelLocale', 'RoleLabels', 'DisplayLabels', 'ModelRouting', 'ImplementationReview')
    }

    Manifest = @{
        SchemaVersion = 2
        EntryPropertyOrder = @('path', 'target', 'mode', 'sha256')
        Modes = @('snapshot', 'managed', 'seed', 'source_only')
        SnapshotTargetRoot = 'docs/ai/generated/shared'
        ManagedRequiresExplicitAdoption = $true
        SeedRequiresExplicitInstallOrAdoption = $true
        SourceOnlyDistributed = $false
    }

    ManagedAdoptionClassification = @{
        SchemaVersion = 1
        Format = 'json'
        CoverageUnit = 'raw_utf8_byte'
        Classifications = @('common_governance', 'project_safety', 'project_execution', 'non_normative')
        Dispositions = @('replaced_by_managed_loader', 'moved_to_project_rules', 'moved_to_workflow', 'retained_project_owned', 'discarded_non_normative')
    }

    LoaderIdentity = @{
        TemplateSchemaVersion = 1
        SubstitutionSchemaVersion = 1
        LockSchemaVersion = 1
        EvidenceSchemaVersion = 1
        Encoding = 'utf-8-no-bom'
        LineFeedCodePoint = 10
        TerminalLineFeedCount = 1
        AllowedActualProofMethods = @('connector_exact_export', 'platform_export_file')
    }

    Worker = @{
        Fields = @('ScopeId', 'Paths', 'DependencyScopeIds', 'MutableOutputPaths', 'IndependentlyCommittable', 'EffortClass', 'WorkerAllowed', 'OwnershipStatus', 'EvidenceStatus', 'IndependentExecution')
        EffortClasses = @('small', 'normal', 'large')
        OwnershipStatuses = @('exact', 'conflict', 'unknown')
        EvidenceStatuses = @('bounded', 'unbounded', 'unknown')
        IndependentExecution = @('optional', 'required')
        SortOrder = @('large', 'normal', 'small')
        MaximumBuildWorkers = 2
        MaximumSelected = 2
        Selection = 'single-pass-greedy-no-backtracking'
        FanoutAvailability = @('available', 'unavailable', 'unknown')
    }

    ReviewGates = @('DESIGN_SELF_CHECK', 'BUILD_SELF_CHECK', 'AUTHORITATIVE_VERIFY', 'RELEASE_GATE')

    Verification = @{
        VerifyResults = @('PASS', 'FAIL', 'BLOCKED')
        SeparateAuthorityRequired = $true
        SelfCheckSatisfiesVerify = $false
        FailRequiresNewCandidate = $true
        BlockedForbidsRelease = $true
    }

    Output = @{
        Fields = @(
            'TASK-ID'
            '機能'
            'フェーズ'
            '依頼先'
            '渡すセッション'
            'モデル'
            '負荷'
            '実行終了時刻'
            '特筆事項'
            '依頼先へのコピペプロンプト'
        )
        FieldSuffix = '：'
        Encoding = 'utf-8-no-bom'
        LineFeedCodePoint = 10
        CarriageReturnAllowed = $false
        FieldLineFeedCount = 1
        CopyPromptFieldHasInlineValue = $false
        CopyPromptMarker = '【以下指示内容】'
        MarkerLineFeedCount = 1
        PayloadStart = 'immediately_after_marker_lf'
        TerminalLineFeedCount = 1
        PublicPhases = @('要件定義', '設計', '設計レビュー', '実装', '実装レビュー', '実装修正', '完了')
        SessionValues = @('新規', '継続', 'なし')
        MissingValue = 'なし'
        UnknownTaskId = '未採番'
        IdleAssignee = 'ChatGPT'
        IdleSession = 'なし'
        IdlePromptPayload = 'なし'
        DefaultLabelLocale = 'ja-JP'
        RoleLabels = @{
            ORCHESTRATOR_AND_REVIEWER = 'ChatGPT・統括・レビュー担当'
            IMPLEMENTER = 'Codex・実装担当'
            INDEPENDENT_REVIEWER = '独立レビュー担当'
            USER = 'ユーザー'
            NONE = 'なし'
        }
        EffortLabels = @{
            medium = '中'
            high = '高'
            xhigh = '極高'
            max = '最大'
        }
    }

    Lifecycle = @{
        InternalPhases = @('requirements', 'design', 'design_review', 'implementation', 'implementation_review', 'browser_evidence', 'release', 'completion_sync', 'user_decision', 'blocked', 'completed')
        RequiredPhases = @('requirements', 'design', 'design_review', 'implementation', 'implementation_review', 'browser_evidence', 'release', 'completion_sync', 'user_decision', 'blocked')
        CompletedPhase = 'completed'
        ForbiddenPhaseAlias = 'done'
        ReviewProfiles = @('standard', 'narrowed', 'terminal')
        MaximumImplementationReviewAttempts = 3
        RelaxationAfterFailures = 2
        RelaxableOnlyOnAttempt = 3
        StandardActionableFindingLimit = 2
        NarrowedAfterFailures = 1
        TerminalAfterFailures = 2
        ImplementationReviewStateTable = @(
            @{ Cycles = 0; Attempt = 1; Profile = 'standard'; Terminated = $false }
            @{ Cycles = 1; Attempt = 2; Profile = 'narrowed'; Terminated = $false }
            @{ Cycles = 2; Attempt = 3; Profile = 'terminal'; Terminated = $false }
            @{ Cycles = 3; Attempt = 3; Profile = 'terminal'; Terminated = $true }
        )
        NarrowedReviewScopes = @('accepted_prior_finding', 'new_regression', 'requirement_violation', 'major_functionality', 'security', 'data_loss', 'data_integrity', 'required_test', 'backward_compatibility', 'release_gate')
        TerminalReviewScopes = @('accepted_prior_finding', 'new_regression', 'requirement_violation', 'major_functionality', 'security', 'data_loss', 'data_integrity', 'required_test', 'backward_compatibility', 'release_gate')
        TerminalReviewSeverities = @('BLOCKER', 'MAJOR')
        RelaxableReviewCategories = @('non_required_ui', 'minor_wording', 'optional_optimization', 'question', 'scope_expansion', 'ideal_design')
        NonRelaxableReviewCategories = @('requirement_violation', 'major_functionality', 'calculation_accuracy', 'decision_accuracy', 'data_preservation', 'data_integrity', 'rollback', 'raw_byte_portability', 'validator', 'required_test', 'release_gate', 'security', 'backward_compatibility')
        FinalFailureDecision = 'NEEDS_USER_DECISION'
        PublicPhaseDerivation = @{
            Direct = @{
                requirements = '要件定義'
                design = '設計'
                design_review = '設計レビュー'
                implementation_review = '実装レビュー'
                browser_evidence = '実装'
                release = '完了'
                completion_sync = '完了'
                completed = '完了'
            }
            Discriminated = @{
                implementation = @{
                    Field = 'implementation_mode'
                    Values = @{
                        normal = '実装'
                        revision = '実装修正'
                    }
                }
            }
            Delegated = @{
                user_decision = @{
                    OriginField = 'origin_phase'
                    OriginImplementationModeField = 'origin_implementation_mode'
                    SharedOriginKinds = @('direct', 'discriminated')
                    AllowValidatedProjectExtensions = $true
                    RejectOrigins = @('user_decision', 'blocked')
                }
                blocked = @{
                    OriginField = 'origin_phase'
                    OriginImplementationModeField = 'origin_implementation_mode'
                    SharedOriginKinds = @('direct', 'discriminated')
                    AllowValidatedProjectExtensions = $true
                    RejectOrigins = @('user_decision', 'blocked')
                }
            }
            ProjectExtensionContract = @{
                RequiredFields = @('Id', 'PublicPhase', 'SourceReference')
                MappingKind = 'direct_public'
                DelegatedOriginAllowed = $true
                AliasAllowed = $false
            }
        }
    }
}
