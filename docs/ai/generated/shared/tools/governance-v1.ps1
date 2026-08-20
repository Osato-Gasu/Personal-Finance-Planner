# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

function Get-GovernanceV1Contract {
    [CmdletBinding()]
    param()

    $outputFields=@(
        'TASK-ID',[regex]::Unescape('\u6a5f\u80fd'),[regex]::Unescape('\u30d5\u30a7\u30fc\u30ba'),[regex]::Unescape('\u4f9d\u983c\u5148'),
        [regex]::Unescape('\u6e21\u3059\u30bb\u30c3\u30b7\u30e7\u30f3'),[regex]::Unescape('\u30e2\u30c7\u30eb'),[regex]::Unescape('\u8ca0\u8377'),
        [regex]::Unescape('\u5b9f\u884c\u7d42\u4e86\u6642\u523b'),[regex]::Unescape('\u7279\u7b46\u4e8b\u9805'),
        [regex]::Unescape('\u4f9d\u983c\u5148\u3078\u306e\u30b3\u30d4\u30da\u30d7\u30ed\u30f3\u30d7\u30c8')
    )
    $publicPhases=@(
        [regex]::Unescape('\u8981\u4ef6\u5b9a\u7fa9'),[regex]::Unescape('\u8a2d\u8a08'),[regex]::Unescape('\u8a2d\u8a08\u30ec\u30d3\u30e5\u30fc'),
        [regex]::Unescape('\u5b9f\u88c5'),[regex]::Unescape('\u5b9f\u88c5\u30ec\u30d3\u30e5\u30fc'),[regex]::Unescape('\u5b9f\u88c5\u4fee\u6b63'),[regex]::Unescape('\u5b8c\u4e86')
    )
    $missing=[regex]::Unescape('\u306a\u3057')
    [pscustomobject][ordered]@{
        NormativeLayers = @('global','project','task')
        DisplayLayerLabels = [ordered]@{ global='GLOBAL'; project='PROJECT'; task='TASK' }
        NormativeOwners = [ordered]@{
            global = @('GLOBAL_AGENTS','POLICY','CONSTITUTION','OUTPUT','LIFECYCLE','ARTIFACTS','EXECUTION')
            project = @('PROJECT_RULES','WORKFLOW','PROJECT_ADAPTER')
            task = @('TASK_BODY')
        }
        ArtifactRoles = @(
            'managed_loader','identity_lock','product_identity','handoff_payload','report_evidence',
            'review_request','review_result','disposition_audit','generated_next_action',
            'generated_progress','generated_entrypoint'
        )
        StateRoles = @('active_task_frontmatter','current_state_index','derived_next_action','derived_progress')
        TaskBodySections = @(
            'objective','scope','out_of_scope','requirements','accepted_required_changes',
            'acceptance_criteria','required_tests_evidence','user_approved_conditions_exceptions','rule_relations'
        )
        LegacyIdMap = [ordered]@{
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
        ReservedDeclarationKeys = @(
            'NormativeRuleId','RuleRelations','ConstraintClass','UpperConstraintId',
            'ExtensionKey','PreservedConstraintIds','SemanticReviewRequired'
        )
        RelationModes = @('reference','strengthen','specialize')
        ConstraintClasses = @('non_relaxable','relaxable')
        EvidenceFields = @(
            'repository_identity','shared_identity','objective','scope','out_of_scope','acceptance',
            'project_rules','workflow','project_adapter','shared_lock','external_resource_identity'
        )
        CompletenessStatuses = @('complete','missing','unknown','not_applicable')
        TriggerValues = @('true','false','unknown','not_applicable')
        HighRiskTriggers = @(
            'auth_or_authz','security','billing','db_migration','deletion_or_data_loss',
            'major_architecture','broad_compatibility','shared_governance','multi_project_impact',
            'unexplained_severe_failure'
        )
        NormalTriggers = @(
            'new_feature','multi_file_behavior','data_structure','ui_flow','api',
            'non_trivial_algorithm','broad_behavior'
        )
        SmallTriggers = @(
            'small_bounded_cause_scope','small_established_pattern','small_complete_acceptance',
            'small_no_architecture_data_security_product_safety_decision'
        )
        ModelOrder = @('Spark','Luna','Terra','Sol')
        EffortOrder = @('medium','high','xhigh','max')
        RouteIds = @(
            'Spark-high','Spark-xhigh','Luna-high','Luna-xhigh','Terra-high','Terra-xhigh',
            'Sol-medium','Sol-high','Sol-xhigh','Sol-max'
        )
        LegacyRouteMap = [ordered]@{
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
        PurposeOrders = [ordered]@{
            CODE = @('Spark-high','Spark-xhigh','Terra-high','Terra-xhigh','Sol-medium','Sol-high','Sol-xhigh','Sol-max')
            REVIEW = @('Luna-high','Luna-xhigh','Terra-high','Terra-xhigh','Sol-medium','Sol-high','Sol-xhigh','Sol-max')
        }
        AssignmentPurpose = [ordered]@{
            CHATGPT_ORCHESTRATOR = 'REVIEW'
            CHATGPT_INDEPENDENT_REVIEWER = 'REVIEW'
            CODEX_MAIN = 'CODE'
            BOUNDED_BUILD = 'CODE'
            AUTHORITATIVE_VERIFY = 'REVIEW'
        }
        GlobalMinimumByAssignmentClass = [ordered]@{
            CHATGPT_ORCHESTRATOR = [ordered]@{ small='Luna-high'; normal='Terra-high'; high_risk='Sol-max' }
            CHATGPT_INDEPENDENT_REVIEWER = [ordered]@{ small='not_applicable'; normal='Sol-high'; high_risk='Sol-max' }
            CODEX_MAIN = [ordered]@{ small='Spark-high'; normal='Spark-xhigh'; high_risk='Sol-xhigh' }
            BOUNDED_BUILD = [ordered]@{ small='Spark-high'; normal='Spark-xhigh'; high_risk='Sol-xhigh' }
            AUTHORITATIVE_VERIFY = [ordered]@{ small='Terra-high'; normal='Terra-high'; high_risk='Sol-xhigh' }
        }
        Availability = @('available','unavailable','unknown')
        ReviewGates = @('DESIGN_SELF_CHECK','BUILD_SELF_CHECK','AUTHORITATIVE_VERIFY','RELEASE_GATE')
        MaximumBuildWorkers = 2
        PurposeIds = @('CODE','REVIEW')
        AssignmentPurposeMeaning = [ordered]@{
            CHATGPT_ORCHESTRATOR='ChatGPT|ORCHESTRATOR_AND_REVIEWER'
            CHATGPT_INDEPENDENT_REVIEWER='ChatGPT|INDEPENDENT_REVIEWER'
            CODEX_MAIN='Codex|IMPLEMENTER|Main'
            BOUNDED_BUILD='bounded BUILD worker'
            AUTHORITATIVE_VERIFY='separated read-only VERIFY'
        }
        WorkerFields = @('ScopeId','Paths','DependencyScopeIds','MutableOutputPaths','IndependentlyCommittable','EffortClass','WorkerAllowed','OwnershipStatus','EvidenceStatus','IndependentExecution')
        WorkerEffortClasses = @('small','normal','large')
        WorkerOwnershipStatuses = @('exact','conflict','unknown')
        WorkerEvidenceStatuses = @('bounded','unbounded','unknown')
        WorkerIndependentExecution = @('optional','required')
        LifecyclePhases = @('requirements','design','design_review','implementation','implementation_review','browser_evidence','release','completion_sync','user_decision','blocked')
        LifecycleReviewProfiles = @('standard','narrowed','terminal')
        OutputFields = $outputFields
        PublicPhases = $publicPhases
        SessionValues = @([regex]::Unescape('\u65b0\u898f'),[regex]::Unescape('\u7d99\u7d9a'),$missing)
        OutputFieldSuffix = [regex]::Unescape('\uff1a')
        OutputPromptMarker = [regex]::Unescape('\u3010\u4ee5\u4e0b\u6307\u793a\u5185\u5bb9\u3011')
        OutputMissingValue = $missing
        OutputUnknownTaskId = [regex]::Unescape('\u672a\u63a1\u756a')
        RoleLabels = [ordered]@{
            ORCHESTRATOR_AND_REVIEWER=[regex]::Unescape('ChatGPT\u30fb\u7d71\u62ec\u30fb\u30ec\u30d3\u30e5\u30fc\u62c5\u5f53')
            IMPLEMENTER=[regex]::Unescape('Codex\u30fb\u5b9f\u88c5\u62c5\u5f53')
            INDEPENDENT_REVIEWER=[regex]::Unescape('\u72ec\u7acb\u30ec\u30d3\u30e5\u30fc\u62c5\u5f53')
            USER=[regex]::Unescape('\u30e6\u30fc\u30b6\u30fc')
            NONE=$missing
        }
        EffortLabels = [ordered]@{medium=[regex]::Unescape('\u4e2d');high=[regex]::Unescape('\u9ad8');xhigh=[regex]::Unescape('\u6975\u9ad8');max=[regex]::Unescape('\u6700\u5927')}
        RelaxableReviewCategories = @('non_required_ui','minor_wording','optional_optimization','question','scope_expansion','ideal_design')
        NonRelaxableReviewCategories = @('requirement_violation','major_functionality','calculation_accuracy','decision_accuracy','data_preservation','data_integrity','rollback','raw_byte_portability','validator','required_test','release_gate','security','backward_compatibility')
    }
}

function Assert-Gv1ExactSequence {
    param([object[]]$Actual,[string[]]$Expected,[string]$Name)
    if($null-eq$Actual){throw "governance v1 ${Name} is missing"}
    $values=@($Actual)
    if($values.Count-ne$Expected.Count){throw "governance v1 ${Name} cardinality mismatch"}
    for($i=0;$i-lt$Expected.Count;$i++){
        if([string]$values[$i]-cne$Expected[$i]){throw "governance v1 ${Name} order/value mismatch at index $i"}
    }
    $true
}

function Assert-Gv1ExactDictionaryKeys {
    param($Dictionary,[string[]]$Expected,[string]$Name)
    if($Dictionary-isnot[Collections.IDictionary]){throw "governance v1 ${Name} must be a mapping"}
    $keys=@($Dictionary.Keys|ForEach-Object{[string]$_})
    if($keys.Count-ne$Expected.Count){throw "governance v1 ${Name} key cardinality mismatch"}
    foreach($key in $Expected){if($keys-cnotcontains$key){throw "governance v1 ${Name} missing key: $key"}}
    foreach($key in $keys){if($Expected-cnotcontains$key){throw "governance v1 ${Name} unknown key: $key"}}
    $true
}

function Assert-Gv1PolicyLexicalOrder {
    param([string]$Text,[string[]]$Names,[int]$Indent,[string]$Name)
    $positions=[Collections.Generic.List[int]]::new();$prefix=' ' * $Indent
    foreach($property in $Names){
        $matches=[regex]::Matches($Text,"(?m)^$([regex]::Escape($prefix))$([regex]::Escape($property)) =")
        if($matches.Count-ne1){throw "governance v1 ${Name} must contain exactly one lexical property: $property"}
        $positions.Add($matches[0].Index)
    }
    for($i=1;$i-lt$positions.Count;$i++){if($positions[$i]-le$positions[$i-1]){throw "governance v1 ${Name} lexical order mismatch"}}
    $true
}

function Assert-GovernanceV1Policy {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)]$Policy,[string]$Text='')

    $c=Get-GovernanceV1Contract
    if($Policy-isnot[Collections.IDictionary]){throw 'governance v1 POLICY must be a mapping'}
    $rootKeys=@('SchemaVersion','GovernanceVersion','NormativeLayers','NormativeLayerOrder','DisplayLayerLabels','NormativeOwners','ArtifactRoles','StateRoles','TaskBodySections','LegacyIdMap','Declaration','Startup','Routing','Relay','IndependentReview','ProjectConstraints','ProjectAdapter','Manifest','ManagedAdoptionClassification','LoaderIdentity','Worker','ReviewGates','Verification','Output','Lifecycle')
    $null=Assert-Gv1ExactDictionaryKeys $Policy $rootKeys 'POLICY root'
    if($Policy.SchemaVersion-isnot[int]-or[int]$Policy.SchemaVersion-ne1){throw 'governance v1 POLICY SchemaVersion must be integer 1'}
    if($Policy.GovernanceVersion-isnot[string]-or[string]$Policy.GovernanceVersion-cne'1.0.0'){throw 'governance v1 POLICY GovernanceVersion must be 1.0.0'}
    $null=Assert-Gv1ExactSequence @($Policy.NormativeLayers) $c.NormativeLayers 'NormativeLayers'
    $null=Assert-Gv1ExactSequence @($Policy.NormativeLayerOrder) $c.NormativeLayers 'NormativeLayerOrder'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.DisplayLayerLabels $c.NormativeLayers 'DisplayLayerLabels'
    foreach($layer in $c.NormativeLayers){if([string]$Policy.DisplayLayerLabels[$layer]-cne[string]$c.DisplayLayerLabels[$layer]){throw "governance v1 display layer mismatch: $layer"}}
    $null=Assert-Gv1ExactDictionaryKeys $Policy.NormativeOwners $c.NormativeLayers 'NormativeOwners'
    foreach($layer in $c.NormativeLayers){$null=Assert-Gv1ExactSequence @($Policy.NormativeOwners[$layer]) $c.NormativeOwners[$layer] "NormativeOwners.$layer"}
    $null=Assert-Gv1ExactSequence @($Policy.ArtifactRoles) $c.ArtifactRoles 'ArtifactRoles'
    $null=Assert-Gv1ExactSequence @($Policy.StateRoles) $c.StateRoles 'StateRoles'
    $null=Assert-Gv1ExactSequence @($Policy.TaskBodySections) $c.TaskBodySections 'TaskBodySections'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.LegacyIdMap @($c.LegacyIdMap.Keys) 'LegacyIdMap'
    foreach($key in $c.LegacyIdMap.Keys){if([string]$Policy.LegacyIdMap[$key]-cne[string]$c.LegacyIdMap[$key]){throw "governance v1 LegacyIdMap mismatch: $key"}}

    $declarationKeys=@('Name','ReservedKeys','ConstraintClasses','Modes','Layers','SemanticReviewRequired','RuleIdPattern','ExtensionPattern','AnchorPattern','PathPattern','TupleFieldCount','TupleSeparator','KeySeparator','PreservedSeparator','EmptyPreserved','SemanticReviewFlag','MarkdownCarrier','ProjectAdapterCarrier','MarkdownEmptyAllowed','ProjectAdapterEmptyBlockAllowed','ProjectAdapterZeroBlocksAllowed','ProjectAdapterRootPropertyOrder','ExtensionDomains')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Declaration $declarationKeys 'Declaration'
    if([string]$Policy.Declaration.Name-cne'governance-rule-v1'-or$Policy.Declaration.SemanticReviewRequired-isnot[bool]-or-not$Policy.Declaration.SemanticReviewRequired){throw 'governance v1 Declaration identity/semantic flag mismatch'}
    $null=Assert-Gv1ExactSequence @($Policy.Declaration.ReservedKeys) $c.ReservedDeclarationKeys 'Declaration.ReservedKeys'
    $null=Assert-Gv1ExactSequence @($Policy.Declaration.ConstraintClasses) $c.ConstraintClasses 'Declaration.ConstraintClasses'
    $null=Assert-Gv1ExactSequence @($Policy.Declaration.Modes) $c.RelationModes 'Declaration.Modes'
    $null=Assert-Gv1ExactSequence @($Policy.Declaration.Layers) $c.NormativeLayers 'Declaration.Layers'
    $declarationScalars=[ordered]@{RuleIdPattern='^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$';ExtensionPattern='^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$';AnchorPattern='^[a-z0-9]+(?:-[a-z0-9]+)*$';PathPattern='^[A-Za-z0-9._/-]+$';TupleSeparator='|';KeySeparator=': ';PreservedSeparator=', ';EmptyPreserved='[]';SemanticReviewFlag='true';MarkdownCarrier='markdown';ProjectAdapterCarrier='project_adapter_psd1'}
    foreach($key in $declarationScalars.Keys){if([string]$Policy.Declaration[$key]-cne[string]$declarationScalars[$key]){throw "governance v1 Declaration scalar mismatch: $key"}}
    if($Policy.Declaration.TupleFieldCount-isnot[int]-or[int]$Policy.Declaration.TupleFieldCount-ne7-or$Policy.Declaration.MarkdownEmptyAllowed-isnot[bool]-or-not$Policy.Declaration.MarkdownEmptyAllowed-or$Policy.Declaration.ProjectAdapterEmptyBlockAllowed-isnot[bool]-or$Policy.Declaration.ProjectAdapterEmptyBlockAllowed-or$Policy.Declaration.ProjectAdapterZeroBlocksAllowed-isnot[bool]-or-not$Policy.Declaration.ProjectAdapterZeroBlocksAllowed){throw 'governance v1 Declaration finite carrier values mismatch'}
    $null=Assert-Gv1ExactSequence @($Policy.Declaration.ProjectAdapterRootPropertyOrder) @('ProjectOverlayValidator','RuleRelations','ProjectConstraints','StartupContextLimitBytes') 'Declaration.ProjectAdapterRootPropertyOrder'
    if($Policy.Declaration.ExtensionDomains-isnot[Collections.Hashtable]){throw 'governance v1 Declaration.ExtensionDomains must be System.Collections.Hashtable'}

    $startupKeys=@('CompletenessStatuses','TriggerValues','EssentialEvidence','ExternalIdentityNotApplicableOnly','EvidenceNotApplicableFields','HighRiskTriggers','NormalTriggers','SmallPredicates','ClassOrder')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Startup $startupKeys 'Startup'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.CompletenessStatuses) $c.CompletenessStatuses 'Startup.CompletenessStatuses'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.TriggerValues) $c.TriggerValues 'Startup.TriggerValues'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.EssentialEvidence) $c.EvidenceFields 'Startup.EssentialEvidence'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.HighRiskTriggers) $c.HighRiskTriggers 'Startup.HighRiskTriggers'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.NormalTriggers) $c.NormalTriggers 'Startup.NormalTriggers'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.SmallPredicates) $c.SmallTriggers 'Startup.SmallPredicates'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.ClassOrder) @('small','normal','high_risk') 'Startup.ClassOrder'
    $null=Assert-Gv1ExactSequence @($Policy.Startup.EvidenceNotApplicableFields) @('external_resource_identity') 'Startup.EvidenceNotApplicableFields'
    if($Policy.Startup.ExternalIdentityNotApplicableOnly-isnot[bool]-or-not$Policy.Startup.ExternalIdentityNotApplicableOnly){throw 'governance v1 Startup external identity applicability mismatch'}

    $routingKeys=@('ModelOrder','EffortOrder','RouteIds','LegacyRouteMap','PurposeIds','PurposeOrders','AssignmentIds','AssignmentPurpose','AssignmentPurposeMeaning','GlobalMinimumByAssignmentClass','Availability')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Routing $routingKeys 'Routing'
    $null=Assert-Gv1ExactSequence @($Policy.Routing.ModelOrder) $c.ModelOrder 'Routing.ModelOrder'
    $null=Assert-Gv1ExactSequence @($Policy.Routing.EffortOrder) $c.EffortOrder 'Routing.EffortOrder'
    $null=Assert-Gv1ExactSequence @($Policy.Routing.RouteIds) $c.RouteIds 'Routing.RouteIds'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Routing.LegacyRouteMap @($c.LegacyRouteMap.Keys) 'Routing.LegacyRouteMap'
    foreach($key in $c.LegacyRouteMap.Keys){if([string]$Policy.Routing.LegacyRouteMap[$key]-cne[string]$c.LegacyRouteMap[$key]){throw "governance v1 legacy route mismatch: $key"}}
    $null=Assert-Gv1ExactSequence @($Policy.Routing.PurposeIds) $c.PurposeIds 'Routing.PurposeIds'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Routing.PurposeOrders $c.PurposeIds 'Routing.PurposeOrders'
    foreach($purpose in $c.PurposeIds){$null=Assert-Gv1ExactSequence @($Policy.Routing.PurposeOrders[$purpose]) $c.PurposeOrders[$purpose] "Routing.PurposeOrders.$purpose"}
    $assignments=@($c.AssignmentPurpose.Keys)
    $null=Assert-Gv1ExactSequence @($Policy.Routing.AssignmentIds) $assignments 'Routing.AssignmentIds'
    foreach($mappingName in @('AssignmentPurpose','AssignmentPurposeMeaning','GlobalMinimumByAssignmentClass')){$null=Assert-Gv1ExactDictionaryKeys $Policy.Routing[$mappingName] $assignments "Routing.$mappingName"}
    foreach($assignment in $assignments){
        if([string]$Policy.Routing.AssignmentPurpose[$assignment]-cne[string]$c.AssignmentPurpose[$assignment]){throw "governance v1 assignment purpose mismatch: $assignment"}
        if([string]$Policy.Routing.AssignmentPurposeMeaning[$assignment]-cne[string]$c.AssignmentPurposeMeaning[$assignment]){throw "governance v1 assignment meaning mismatch: $assignment"}
        $null=Assert-Gv1ExactDictionaryKeys $Policy.Routing.GlobalMinimumByAssignmentClass[$assignment] @('small','normal','high_risk') "Routing.GlobalMinimumByAssignmentClass.$assignment"
        foreach($class in @('small','normal','high_risk')){if([string]$Policy.Routing.GlobalMinimumByAssignmentClass[$assignment][$class]-cne[string]$c.GlobalMinimumByAssignmentClass[$assignment][$class]){throw "governance v1 global minimum mismatch: $assignment/$class"}}
    }
    $null=Assert-Gv1ExactSequence @($Policy.Routing.Availability) $c.Availability 'Routing.Availability'

    $relayKeys=@('DecisionIds','EventIds','CandidateIdentity','OverlayFailurePattern','NextActionTemplates','Requirements')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay $relayKeys 'Relay'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.CandidateIdentity @('Decisions','IndependentReviewKinds') 'Relay.CandidateIdentity'
    $relayDecisions=@('APPROVED','CHANGES_REQUESTED','BLOCKED','NEEDS_USER_DECISION');$relayEvents=@('REQUIREMENTS_DEFINED','INDEPENDENT_REVIEW_REQUESTED','INDEPENDENT_REVIEW_COMPLETED')
    $null=Assert-Gv1ExactSequence @($Policy.Relay.DecisionIds) $relayDecisions 'Relay.DecisionIds';$null=Assert-Gv1ExactSequence @($Policy.Relay.EventIds) $relayEvents 'Relay.EventIds'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.CandidateIdentity.Decisions $relayDecisions 'Relay.CandidateIdentity.Decisions'
    foreach($decision in $relayDecisions){$null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.CandidateIdentity.Decisions[$decision] @('design','implementation') "Relay.CandidateIdentity.Decisions.$decision";if([string]$Policy.Relay.CandidateIdentity.Decisions[$decision].design-cne'design_candidate'-or[string]$Policy.Relay.CandidateIdentity.Decisions[$decision].implementation-cne'implementation_candidate'){throw "governance v1 Relay candidate identity mismatch: $decision"}}
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.CandidateIdentity.IndependentReviewKinds @('design','implementation') 'Relay.CandidateIdentity.IndependentReviewKinds'
    if([string]$Policy.Relay.CandidateIdentity.IndependentReviewKinds.design-cne'design_candidate'-or[string]$Policy.Relay.CandidateIdentity.IndependentReviewKinds.implementation-cne'implementation_candidate'){throw 'governance v1 Relay independent review candidate identity mismatch'}
    if([string]$Policy.Relay.OverlayFailurePattern-cne'(?m)^.*governance error:\s*(.+)$'){throw 'governance v1 Relay overlay failure pattern mismatch'}
    $nextDecisions=@($relayDecisions+$relayEvents)
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.NextActionTemplates $nextDecisions 'Relay.NextActionTemplates';foreach($decision in $nextDecisions){if($Policy.Relay.NextActionTemplates[$decision]-isnot[string]-or[string]::IsNullOrWhiteSpace([string]$Policy.Relay.NextActionTemplates[$decision])){throw "governance v1 Relay next-action template is invalid: $decision"}}
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Relay.Requirements @('Priorities','Executors','BaseCommitPolicy') 'Relay.Requirements'
    $null=Assert-Gv1ExactSequence @($Policy.Relay.Requirements.Priorities) @('low','normal','high') 'Relay.Requirements.Priorities';$null=Assert-Gv1ExactSequence @($Policy.Relay.Requirements.Executors) @('ChatGPT') 'Relay.Requirements.Executors'
    if([string]$Policy.Relay.Requirements.BaseCommitPolicy-cne'exact_head'){throw 'governance v1 Relay requirements base-commit policy mismatch'}

    $independentReviewKeys=@('PolicyVersion','ActiveExecutor','AllowedKinds','Role','Model','AllowedEfforts','RequiredSessionRelation','ExecutionMode','ExecutorPolicy','ProviderSubstitution','ReturnPair','EvidenceAuthority','VisibleAuthoringTranscriptAllowed','AmbientContextPresenceIsFailure','AmbientContextUseAllowed','ProhibitedEvidenceSources','RequiredResultAttestations')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.IndependentReview $independentReviewKeys 'IndependentReview'
    if($Policy.IndependentReview.PolicyVersion-isnot[int]-or[int]$Policy.IndependentReview.PolicyVersion-ne2){throw 'governance v1 IndependentReview PolicyVersion must be integer 2'}
    $independentReviewScalars=[ordered]@{ActiveExecutor='ChatGPT';Role='INDEPENDENT_REVIEWER';Model='Sol';RequiredSessionRelation='distinct_conversation';ExecutionMode='separate_session';ExecutorPolicy='strict';ProviderSubstitution='none';ReturnPair='ChatGPT|ORCHESTRATOR_AND_REVIEWER';EvidenceAuthority='immutable_repository_only'}
    foreach($key in $independentReviewScalars.Keys){if($Policy.IndependentReview[$key]-isnot[string]-or[string]$Policy.IndependentReview[$key]-cne[string]$independentReviewScalars[$key]){throw "governance v1 IndependentReview scalar mismatch: $key"}}
    $null=Assert-Gv1ExactSequence @($Policy.IndependentReview.AllowedKinds) @('design','implementation') 'IndependentReview.AllowedKinds'
    $null=Assert-Gv1ExactSequence @($Policy.IndependentReview.AllowedEfforts) @('xhigh','max') 'IndependentReview.AllowedEfforts'
    $null=Assert-Gv1ExactSequence @($Policy.IndependentReview.ProhibitedEvidenceSources) @('conversation_memory','project_memory','personal_context','summary_reader','file_library','unrequested_web') 'IndependentReview.ProhibitedEvidenceSources'
    $null=Assert-Gv1ExactSequence @($Policy.IndependentReview.RequiredResultAttestations) @('distinct_conversation_user_attested','visible_authoring_transcript_present','non_repository_context_used','ref_resolution_count','resolved_commit','resolved_tree','source_blobs','tool_calls') 'IndependentReview.RequiredResultAttestations'
    foreach($key in @('VisibleAuthoringTranscriptAllowed','AmbientContextPresenceIsFailure','AmbientContextUseAllowed')){if($Policy.IndependentReview[$key]-isnot[bool]-or[bool]$Policy.IndependentReview[$key]){throw "governance v1 IndependentReview boolean mismatch: $key"}}

    $projectConstraintKeys=@('PropertyOrder','RootPropertyOrder','ReviewClassFloor','AssignmentOrder','ClassOrder','EmptyMinimum','NotApplicableMinimum','RuntimeInvalidResult')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.ProjectConstraints $projectConstraintKeys 'POLICY.ProjectConstraints'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectConstraints.PropertyOrder) @('ReviewClassFloor','ProhibitedRouteIds','MinimumRouteByAssignmentClass') 'POLICY.ProjectConstraints.PropertyOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectConstraints.RootPropertyOrder) @('ProjectOverlayValidator','RuleRelations','ProjectConstraints','StartupContextLimitBytes') 'POLICY.ProjectConstraints.RootPropertyOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectConstraints.ReviewClassFloor) @('none','normal','high_risk') 'POLICY.ProjectConstraints.ReviewClassFloor'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectConstraints.AssignmentOrder) $assignments 'POLICY.ProjectConstraints.AssignmentOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectConstraints.ClassOrder) @('small','normal','high_risk') 'POLICY.ProjectConstraints.ClassOrder'
    foreach($pair in @(@('EmptyMinimum','none'),@('NotApplicableMinimum','not_applicable'),@('RuntimeInvalidResult','BLOCKED'))){if([string]$Policy.ProjectConstraints[$pair[0]]-cne$pair[1]){throw "governance v1 POLICY ProjectConstraints scalar mismatch: $($pair[0])"}}

    $projectAdapterKeys=@('SchemaVersion','RootPropertyOrder','PhaseExtensionFields','PhaseExtensionContainerRuntimeType','PhaseExtensionRecordRuntimeType','PhaseExtensionMappingKind','ReviewCategoryContainerRuntimeType','ReviewCategoryElementRuntimeType','ReviewCategoryOrder','ReviewCategoryAdditiveNonRelaxable','RelayPropertyOrder','RelayRequirementsPropertyOrder','ForbiddenCommonProperties')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.ProjectAdapter $projectAdapterKeys 'POLICY.ProjectAdapter'
    if($Policy.ProjectAdapter.SchemaVersion-isnot[int]-or[int]$Policy.ProjectAdapter.SchemaVersion-ne2-or[string]$Policy.ProjectAdapter.PhaseExtensionContainerRuntimeType-cne'System.Object[]'-or[string]$Policy.ProjectAdapter.PhaseExtensionRecordRuntimeType-cne'System.Collections.Hashtable'-or[string]$Policy.ProjectAdapter.PhaseExtensionMappingKind-cne'direct_public'-or[string]$Policy.ProjectAdapter.ReviewCategoryContainerRuntimeType-cne'System.Object[]'-or[string]$Policy.ProjectAdapter.ReviewCategoryElementRuntimeType-cne'System.String'-or[string]$Policy.ProjectAdapter.ReviewCategoryOrder-cne'ordinal'-or$Policy.ProjectAdapter.ReviewCategoryAdditiveNonRelaxable-isnot[bool]-or-not$Policy.ProjectAdapter.ReviewCategoryAdditiveNonRelaxable){throw 'governance v1 POLICY ProjectAdapter scalar mismatch'}
    $adapterRootKeys=@('SchemaVersion','ProjectName','PermanentRequirementsHandoff','ProjectOverlayValidator','RuleRelations','ProjectConstraints','StartupContextLimitBytes','ExtensionDomains','ActiveTaskLimitBytes','PhaseExtensions','ReviewCategoryExtensions','TaskHistory','Backlog','ProductIdentity','Relay')
    $null=Assert-Gv1ExactSequence @($Policy.ProjectAdapter.RootPropertyOrder) $adapterRootKeys 'POLICY.ProjectAdapter.RootPropertyOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectAdapter.PhaseExtensionFields) @('Id','PublicPhase','SourceReference') 'POLICY.ProjectAdapter.PhaseExtensionFields'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectAdapter.RelayPropertyOrder) @('Repository','Requirements') 'POLICY.ProjectAdapter.RelayPropertyOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectAdapter.RelayRequirementsPropertyOrder) @('RequireProductIdentityReference','ProductIdentityReferences','TaskMetadata') 'POLICY.ProjectAdapter.RelayRequirementsPropertyOrder'
    $null=Assert-Gv1ExactSequence @($Policy.ProjectAdapter.ForbiddenCommonProperties) @('PhaseLabels','DefaultLabelLocale','RoleLabels','DisplayLabels','ModelRouting','ImplementationReview') 'POLICY.ProjectAdapter.ForbiddenCommonProperties'

    $null=Assert-Gv1ExactDictionaryKeys $Policy.Manifest @('SchemaVersion','EntryPropertyOrder','Modes','SnapshotTargetRoot','ManagedRequiresExplicitAdoption','SeedRequiresExplicitInstallOrAdoption','SourceOnlyDistributed') 'Manifest'
    if($Policy.Manifest.SchemaVersion-isnot[int]-or[int]$Policy.Manifest.SchemaVersion-ne2-or[string]$Policy.Manifest.SnapshotTargetRoot-cne'docs/ai/generated/shared'){throw 'governance v1 Manifest scalar mismatch'}
    $null=Assert-Gv1ExactSequence @($Policy.Manifest.EntryPropertyOrder) @('path','target','mode','sha256') 'Manifest.EntryPropertyOrder';$null=Assert-Gv1ExactSequence @($Policy.Manifest.Modes) @('snapshot','managed','seed','source_only') 'Manifest.Modes'
    if($Policy.Manifest.ManagedRequiresExplicitAdoption-isnot[bool]-or-not$Policy.Manifest.ManagedRequiresExplicitAdoption-or$Policy.Manifest.SeedRequiresExplicitInstallOrAdoption-isnot[bool]-or-not$Policy.Manifest.SeedRequiresExplicitInstallOrAdoption-or$Policy.Manifest.SourceOnlyDistributed-isnot[bool]-or$Policy.Manifest.SourceOnlyDistributed){throw 'governance v1 Manifest mode boundary mismatch'}
    $null=Assert-Gv1ExactDictionaryKeys $Policy.ManagedAdoptionClassification @('SchemaVersion','Format','CoverageUnit','Classifications','Dispositions') 'ManagedAdoptionClassification'
    if($Policy.ManagedAdoptionClassification.SchemaVersion-isnot[int]-or[int]$Policy.ManagedAdoptionClassification.SchemaVersion-ne1-or[string]$Policy.ManagedAdoptionClassification.Format-cne'json'-or[string]$Policy.ManagedAdoptionClassification.CoverageUnit-cne'raw_utf8_byte'){throw 'governance v1 ManagedAdoptionClassification scalar mismatch'}
    $null=Assert-Gv1ExactSequence @($Policy.ManagedAdoptionClassification.Classifications) @('common_governance','project_safety','project_execution','non_normative') 'ManagedAdoptionClassification.Classifications'
    $null=Assert-Gv1ExactSequence @($Policy.ManagedAdoptionClassification.Dispositions) @('replaced_by_managed_loader','moved_to_project_rules','moved_to_workflow','retained_project_owned','discarded_non_normative') 'ManagedAdoptionClassification.Dispositions'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.LoaderIdentity @('TemplateSchemaVersion','SubstitutionSchemaVersion','LockSchemaVersion','EvidenceSchemaVersion','Encoding','LineFeedCodePoint','TerminalLineFeedCount','AllowedActualProofMethods') 'LoaderIdentity'
    foreach($key in @('TemplateSchemaVersion','SubstitutionSchemaVersion','LockSchemaVersion','EvidenceSchemaVersion','LineFeedCodePoint','TerminalLineFeedCount')){$expected=if($key-ceq'LineFeedCodePoint'){10}else{1};if($Policy.LoaderIdentity[$key]-isnot[int]-or[int]$Policy.LoaderIdentity[$key]-ne$expected){throw "governance v1 LoaderIdentity integer mismatch: $key"}}
    if([string]$Policy.LoaderIdentity.Encoding-cne'utf-8-no-bom'){throw 'governance v1 LoaderIdentity encoding mismatch'};$null=Assert-Gv1ExactSequence @($Policy.LoaderIdentity.AllowedActualProofMethods) @('connector_exact_export','platform_export_file') 'LoaderIdentity.AllowedActualProofMethods'

    $workerKeys=@('Fields','EffortClasses','OwnershipStatuses','EvidenceStatuses','IndependentExecution','SortOrder','MaximumBuildWorkers','MaximumSelected','Selection','FanoutAvailability')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Worker $workerKeys 'Worker'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.Fields) $c.WorkerFields 'Worker.Fields'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.EffortClasses) $c.WorkerEffortClasses 'Worker.EffortClasses'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.OwnershipStatuses) $c.WorkerOwnershipStatuses 'Worker.OwnershipStatuses'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.EvidenceStatuses) $c.WorkerEvidenceStatuses 'Worker.EvidenceStatuses'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.IndependentExecution) $c.WorkerIndependentExecution 'Worker.IndependentExecution'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.SortOrder) @('large','normal','small') 'Worker.SortOrder'
    $null=Assert-Gv1ExactSequence @($Policy.Worker.FanoutAvailability) $c.Availability 'Worker.FanoutAvailability'
    if($Policy.Worker.MaximumBuildWorkers-isnot[int]-or[int]$Policy.Worker.MaximumBuildWorkers-ne2){throw 'governance v1 Worker.MaximumBuildWorkers must be integer 2'}
    if($Policy.Worker.MaximumSelected-isnot[int]-or[int]$Policy.Worker.MaximumSelected-ne2-or[string]$Policy.Worker.Selection-cne'single-pass-greedy-no-backtracking'){throw 'governance v1 Worker finite selection contract mismatch'}
    $null=Assert-Gv1ExactSequence @($Policy.ReviewGates) $c.ReviewGates 'ReviewGates'
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Verification @('VerifyResults','SeparateAuthorityRequired','SelfCheckSatisfiesVerify','FailRequiresNewCandidate','BlockedForbidsRelease') 'Verification'
    $null=Assert-Gv1ExactSequence @($Policy.Verification.VerifyResults) @('PASS','FAIL','BLOCKED') 'Verification.VerifyResults'
    if($Policy.Verification.SeparateAuthorityRequired-isnot[bool]-or-not$Policy.Verification.SeparateAuthorityRequired-or$Policy.Verification.SelfCheckSatisfiesVerify-isnot[bool]-or$Policy.Verification.SelfCheckSatisfiesVerify-or$Policy.Verification.FailRequiresNewCandidate-isnot[bool]-or-not$Policy.Verification.FailRequiresNewCandidate-or$Policy.Verification.BlockedForbidsRelease-isnot[bool]-or-not$Policy.Verification.BlockedForbidsRelease){throw 'governance v1 Verification booleans mismatch'}
    $outputKeys=@('Fields','FieldSuffix','Encoding','LineFeedCodePoint','CarriageReturnAllowed','FieldLineFeedCount','CopyPromptFieldHasInlineValue','CopyPromptMarker','MarkerLineFeedCount','PayloadStart','TerminalLineFeedCount','PublicPhases','SessionValues','MissingValue','UnknownTaskId','IdleAssignee','IdleSession','IdlePromptPayload','DefaultLabelLocale','RoleLabels','EffortLabels')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Output $outputKeys 'Output'
    $null=Assert-Gv1ExactSequence @($Policy.Output.Fields) $c.OutputFields 'Output.Fields'
    $null=Assert-Gv1ExactSequence @($Policy.Output.PublicPhases) $c.PublicPhases 'Output.PublicPhases'
    $null=Assert-Gv1ExactSequence @($Policy.Output.SessionValues) $c.SessionValues 'Output.SessionValues'
    foreach($pair in @(@('FieldSuffix',$c.OutputFieldSuffix),@('Encoding','utf-8-no-bom'),@('CopyPromptMarker',$c.OutputPromptMarker),@('PayloadStart','immediately_after_marker_lf'),@('MissingValue',$c.OutputMissingValue),@('UnknownTaskId',$c.OutputUnknownTaskId),@('IdleAssignee','ChatGPT'),@('IdleSession',$c.OutputMissingValue),@('IdlePromptPayload',$c.OutputMissingValue))){if([string]$Policy.Output[$pair[0]]-cne$pair[1]){throw "governance v1 Output scalar mismatch: $($pair[0])"}}
    foreach($pair in @(@('LineFeedCodePoint',10),@('FieldLineFeedCount',1),@('MarkerLineFeedCount',1),@('TerminalLineFeedCount',1))){if($Policy.Output[$pair[0]]-isnot[int]-or[int]$Policy.Output[$pair[0]]-ne[int]$pair[1]){throw "governance v1 Output integer mismatch: $($pair[0])"}}
    if($Policy.Output.CarriageReturnAllowed-isnot[bool]-or$Policy.Output.CarriageReturnAllowed-or$Policy.Output.CopyPromptFieldHasInlineValue-isnot[bool]-or$Policy.Output.CopyPromptFieldHasInlineValue){throw 'governance v1 Output boolean contract mismatch'}
    if([string]$Policy.Output.DefaultLabelLocale-cne'ja-JP'){throw 'governance v1 Output locale mismatch'}
    foreach($mapping in @(@('RoleLabels',$c.RoleLabels),@('EffortLabels',$c.EffortLabels))){$null=Assert-Gv1ExactDictionaryKeys $Policy.Output[$mapping[0]] @($mapping[1].Keys) "Output.$($mapping[0])";foreach($key in $mapping[1].Keys){if([string]$Policy.Output[$mapping[0]][$key]-cne[string]$mapping[1][$key]){throw "governance v1 Output label mismatch: $($mapping[0])/$key"}}}
    $lifecycleKeys=@('InternalPhases','RequiredPhases','CompletedPhase','ForbiddenPhaseAlias','ReviewProfiles','MaximumImplementationReviewAttempts','RelaxationAfterFailures','RelaxableOnlyOnAttempt','StandardActionableFindingLimit','NarrowedAfterFailures','TerminalAfterFailures','ImplementationReviewStateTable','NarrowedReviewScopes','TerminalReviewScopes','TerminalReviewSeverities','RelaxableReviewCategories','NonRelaxableReviewCategories','FinalFailureDecision','PublicPhaseDerivation')
    $null=Assert-Gv1ExactDictionaryKeys $Policy.Lifecycle $lifecycleKeys 'Lifecycle'
    $null=Assert-Gv1ExactSequence @($Policy.Lifecycle.InternalPhases) @($c.LifecyclePhases+'completed') 'Lifecycle.InternalPhases'
    $null=Assert-Gv1ExactSequence @($Policy.Lifecycle.RequiredPhases) $c.LifecyclePhases 'Lifecycle.RequiredPhases'
    $null=Assert-Gv1ExactSequence @($Policy.Lifecycle.ReviewProfiles) $c.LifecycleReviewProfiles 'Lifecycle.ReviewProfiles'
    if([string]$Policy.Lifecycle.CompletedPhase-cne'completed'-or[string]$Policy.Lifecycle.ForbiddenPhaseAlias-cne'done'-or$Policy.Lifecycle.MaximumImplementationReviewAttempts-isnot[int]-or[int]$Policy.Lifecycle.MaximumImplementationReviewAttempts-ne3){throw 'governance v1 Lifecycle finite contract mismatch'}
    foreach($pair in @(@('RelaxationAfterFailures',2),@('RelaxableOnlyOnAttempt',3),@('StandardActionableFindingLimit',2),@('NarrowedAfterFailures',1),@('TerminalAfterFailures',2))){if($Policy.Lifecycle[$pair[0]]-isnot[int]-or[int]$Policy.Lifecycle[$pair[0]]-ne[int]$pair[1]){throw "governance v1 Lifecycle integer mismatch: $($pair[0])"}}
    $reviewStates=@($Policy.Lifecycle.ImplementationReviewStateTable);if($reviewStates.Count-ne4){throw 'governance v1 Lifecycle implementation review state cardinality mismatch'}
    $stateExpected=@(@(0,1,'standard',$false),@(1,2,'narrowed',$false),@(2,3,'terminal',$false),@(3,3,'terminal',$true));for($i=0;$i-lt4;$i++){$state=$reviewStates[$i];$null=Assert-Gv1ExactDictionaryKeys $state @('Cycles','Attempt','Profile','Terminated') "Lifecycle review state $i";if($state.Cycles-isnot[int]-or[int]$state.Cycles-ne$stateExpected[$i][0]-or$state.Attempt-isnot[int]-or[int]$state.Attempt-ne$stateExpected[$i][1]-or[string]$state.Profile-cne$stateExpected[$i][2]-or$state.Terminated-isnot[bool]-or[bool]$state.Terminated-ne[bool]$stateExpected[$i][3]){throw "governance v1 Lifecycle implementation review state mismatch: $i"}}
    $reviewScopes=@('accepted_prior_finding','new_regression','requirement_violation','major_functionality','security','data_loss','data_integrity','required_test','backward_compatibility','release_gate');$null=Assert-Gv1ExactSequence @($Policy.Lifecycle.NarrowedReviewScopes) $reviewScopes 'Lifecycle.NarrowedReviewScopes';$null=Assert-Gv1ExactSequence @($Policy.Lifecycle.TerminalReviewScopes) $reviewScopes 'Lifecycle.TerminalReviewScopes';$null=Assert-Gv1ExactSequence @($Policy.Lifecycle.TerminalReviewSeverities) @('BLOCKER','MAJOR') 'Lifecycle.TerminalReviewSeverities'
    $null=Assert-Gv1ExactSequence @($Policy.Lifecycle.RelaxableReviewCategories) $c.RelaxableReviewCategories 'Lifecycle.RelaxableReviewCategories';$null=Assert-Gv1ExactSequence @($Policy.Lifecycle.NonRelaxableReviewCategories) $c.NonRelaxableReviewCategories 'Lifecycle.NonRelaxableReviewCategories'
    if([string]$Policy.Lifecycle.FinalFailureDecision-cne'NEEDS_USER_DECISION'){throw 'governance v1 Lifecycle final failure decision mismatch'}
    $derivation=$Policy.Lifecycle.PublicPhaseDerivation;$null=Assert-Gv1ExactDictionaryKeys $derivation @('Direct','Discriminated','Delegated','ProjectExtensionContract') 'Lifecycle.PublicPhaseDerivation'
    $direct=[ordered]@{requirements=$c.PublicPhases[0];design=$c.PublicPhases[1];design_review=$c.PublicPhases[2];implementation_review=$c.PublicPhases[4];browser_evidence=$c.PublicPhases[3];release=$c.PublicPhases[6];completion_sync=$c.PublicPhases[6];completed=$c.PublicPhases[6]}
    $null=Assert-Gv1ExactDictionaryKeys $derivation.Direct @($direct.Keys) 'Lifecycle.PublicPhaseDerivation.Direct';foreach($key in $direct.Keys){if([string]$derivation.Direct[$key]-cne[string]$direct[$key]){throw "governance v1 direct public phase mismatch: $key"}}
    $null=Assert-Gv1ExactDictionaryKeys $derivation.Discriminated @('implementation') 'Lifecycle.PublicPhaseDerivation.Discriminated';$implementation=$derivation.Discriminated.implementation;$null=Assert-Gv1ExactDictionaryKeys $implementation @('Field','Values') 'Lifecycle implementation derivation';$null=Assert-Gv1ExactDictionaryKeys $implementation.Values @('normal','revision') 'Lifecycle implementation derivation values'
    if([string]$implementation.Field-cne'implementation_mode'-or[string]$implementation.Values.normal-cne$c.PublicPhases[3]-or[string]$implementation.Values.revision-cne$c.PublicPhases[5]){throw 'governance v1 implementation public phase derivation mismatch'}
    $null=Assert-Gv1ExactDictionaryKeys $derivation.Delegated @('user_decision','blocked') 'Lifecycle.PublicPhaseDerivation.Delegated';foreach($phase in @('user_decision','blocked')){$record=$derivation.Delegated[$phase];$null=Assert-Gv1ExactDictionaryKeys $record @('OriginField','OriginImplementationModeField','SharedOriginKinds','AllowValidatedProjectExtensions','RejectOrigins') "Lifecycle delegated $phase";$null=Assert-Gv1ExactSequence @($record.SharedOriginKinds) @('direct','discriminated') "Lifecycle delegated origin kinds $phase";$null=Assert-Gv1ExactSequence @($record.RejectOrigins) @('user_decision','blocked') "Lifecycle delegated rejected origins $phase";if([string]$record.OriginField-cne'origin_phase'-or[string]$record.OriginImplementationModeField-cne'origin_implementation_mode'-or$record.AllowValidatedProjectExtensions-isnot[bool]-or-not$record.AllowValidatedProjectExtensions){throw "governance v1 delegated public phase mismatch: $phase"}}
    $extension=$derivation.ProjectExtensionContract;$null=Assert-Gv1ExactDictionaryKeys $extension @('RequiredFields','MappingKind','DelegatedOriginAllowed','AliasAllowed') 'Lifecycle project extension contract';$null=Assert-Gv1ExactSequence @($extension.RequiredFields) @('Id','PublicPhase','SourceReference') 'Lifecycle project extension fields'
    if([string]$extension.MappingKind-cne'direct_public'-or$extension.DelegatedOriginAllowed-isnot[bool]-or-not$extension.DelegatedOriginAllowed-or$extension.AliasAllowed-isnot[bool]-or$extension.AliasAllowed){throw 'governance v1 Lifecycle project extension contract mismatch'}

    if(-not[string]::IsNullOrEmpty($Text)){
        if($Text.Contains("`r")-or-not$Text.EndsWith("`n")){throw 'governance v1 POLICY lexical text is not canonical'}
        $null=Assert-Gv1PolicyLexicalOrder $Text $rootKeys 4 'POLICY root'
    }
    $true
}

function Assert-GovernanceV1CanonicalTextBytes {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][byte[]]$Bytes,[string]$Source='input')

    if($Bytes.Length-ge3-and$Bytes[0]-eq0xEF-and$Bytes[1]-eq0xBB-and$Bytes[2]-eq0xBF){throw "governance v1 UTF-8 BOM is forbidden: $Source"}
    if($Bytes-contains13){throw "governance v1 CR is forbidden: $Source"}
    $terminalLf=0
    for($i=$Bytes.Length-1;$i-ge0-and$Bytes[$i]-eq10;$i--){$terminalLf++}
    if($terminalLf-ne1){throw "governance v1 text must have exactly one terminal LF: $Source"}
    try{$text=[Text.UTF8Encoding]::new($false,$true).GetString($Bytes)}catch{throw "governance v1 text is not strict UTF-8: $Source"}
    if(-not ($text.IsNormalized([Text.NormalizationForm]::FormC))){throw "governance v1 text is not Unicode NFC: $Source"}
    $text
}

function Read-GovernanceV1PolicyFile {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Path)

    $resolved=[IO.Path]::GetFullPath($Path)
    if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw "governance v1 POLICY file is missing: $resolved"}
    $bytes=[IO.File]::ReadAllBytes($resolved)
    $text=Assert-GovernanceV1CanonicalTextBytes $bytes $resolved
    $temporary=Join-Path ([IO.Path]::GetTempPath()) ("governance-v1-policy-"+[guid]::NewGuid().ToString('N')+'.psd1')
    try{
        [IO.File]::WriteAllText($temporary,$text,[Text.UTF8Encoding]::new($true))
        $policy=Import-PowerShellDataFile -LiteralPath $temporary -ErrorAction Stop
    }finally{
        if(Test-Path -LiteralPath $temporary -PathType Leaf){Remove-Item -LiteralPath $temporary -Force}
    }
    $null=Assert-GovernanceV1Policy $policy $text
    [pscustomobject][ordered]@{Policy=$policy;Text=$text;Bytes=$bytes;Path=$resolved}
}

function Test-Gv1Scalar {
    param([string]$Value)
    -not[string]::IsNullOrWhiteSpace($Value)-and$Value-match'^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
}

function Test-Gv1Path {
    param([string]$Value)
    if([string]::IsNullOrWhiteSpace($Value)-or[IO.Path]::IsPathRooted($Value)-or$Value-notmatch'^[A-Za-z0-9._/-]+$'){return $false}
    foreach($part in $Value.Split('/')){if([string]::IsNullOrEmpty($part)-or$part-in@('.','..')){return $false}}
    $true
}

function Test-Gv1Anchor {
    param([string]$Value)
    -not[string]::IsNullOrWhiteSpace($Value)-and$Value-match'^[a-z0-9]+(?:-[a-z0-9]+)*$'
}

function ConvertFrom-GovernanceV1RuleBlock {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)][ValidateSet('Markdown','ProjectAdapter')][string]$Carrier,
        [string]$PhysicalPath='unknown',
        [string]$OwnerLayer,
        [string]$OwnerAnchor
    )

    if(($Text.Length-gt0-and[int]$Text[0]-eq0xFEFF)-or($Text.Contains("`r"))-or(-not ($Text.EndsWith("`n")))-or($Text.EndsWith("`n`n"))){throw 'governance v1 rule block text is not canonical UTF-8/LF-shaped text'}
    if(-not ($Text.IsNormalized([Text.NormalizationForm]::FormC))){throw 'governance v1 rule block is not Unicode NFC'}
    $lines=@($Text.Substring(0,$Text.Length-1).Split("`n"))
    if($lines.Count-lt5-or$lines[0]-cne':::governance-rule-v1'-or$lines[$lines.Count-1]-cne':::'){throw 'governance v1 rule block delimiters are invalid'}
    foreach($line in $lines){if($line-match'[ \x09]+$'){throw 'governance v1 rule block contains trailing whitespace'}}
    $idMatch=[regex]::Match($lines[1],'^NormativeRuleId: (?<id>[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)$')
    if(-not$idMatch.Success){throw 'governance v1 NormativeRuleId line is invalid'}
    $classMatch=[regex]::Match($lines[2],'^ConstraintClass: (?<class>non_relaxable|relaxable)$')
    if(-not$classMatch.Success){throw 'governance v1 ConstraintClass line is invalid'}
    $relations=[Collections.Generic.List[object]]::new()
    $empty=$lines[3]-ceq'RuleRelations: []'
    if($empty){
        if($lines.Count-ne5){throw 'governance v1 empty rule block has nested or extra lines'}
        if($Carrier-cne'Markdown'){throw 'governance v1 PSD1-carried empty rule block is forbidden'}
        if($OwnerLayer-notin@('global','project','task')-or-not(Test-Gv1Path $PhysicalPath)-or-not(Test-Gv1Anchor $OwnerAnchor)){throw 'governance v1 empty Markdown block owner is invalid'}
    }else{
        if($lines[3]-cne'RuleRelations:'){throw 'governance v1 RuleRelations line is invalid'}
        if($lines.Count-lt10-or(($lines.Count-5)%5)-ne0){throw 'governance v1 non-empty relation block cardinality is invalid'}
        $lowerIdentity=$null
        for($lineIndex=4;$lineIndex-lt$lines.Count-1;$lineIndex+=5){
            $tupleMatch=[regex]::Match($lines[$lineIndex],'^  - (?<mode>reference|strengthen|specialize)\|(?<lowerLayer>global|project|task)\|(?<lowerPath>[A-Za-z0-9._/-]+)\|(?<lowerAnchor>[a-z0-9]+(?:-[a-z0-9]+)*)\|(?<upperLayer>global|project|task)\|(?<upperPath>[A-Za-z0-9._/-]+)\|(?<upperAnchor>[a-z0-9]+(?:-[a-z0-9]+)*)$')
            if(-not$tupleMatch.Success){throw 'governance v1 relation tuple is invalid'}
            $upperMatch=[regex]::Match($lines[$lineIndex+1],'^    UpperConstraintId: (?<id>[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)$')
            $extensionMatch=[regex]::Match($lines[$lineIndex+2],'^    ExtensionKey: (?<value>none|[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*=[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)$')
            $preservedMatch=[regex]::Match($lines[$lineIndex+3],'^    PreservedConstraintIds: (?<value>\[\]|\[[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*(?:, [a-z][a-z0-9]*(?:[._-][a-z0-9]+)*)*\])$')
            if(-not$upperMatch.Success-or-not$extensionMatch.Success-or-not$preservedMatch.Success-or$lines[$lineIndex+4]-cne'    SemanticReviewRequired: true'){throw 'governance v1 relation entry keys/order/value are invalid'}
            foreach($name in @('lowerPath','upperPath')){if(-not(Test-Gv1Path $tupleMatch.Groups[$name].Value)){throw "governance v1 relation $name is invalid"}}
            $layerOrder=@{global=0;project=1;task=2}
            if($layerOrder[$tupleMatch.Groups['lowerLayer'].Value]-le$layerOrder[$tupleMatch.Groups['upperLayer'].Value]){throw 'governance v1 relation lower layer must be below upper layer'}
            $lower="$($tupleMatch.Groups['lowerLayer'].Value)|$($tupleMatch.Groups['lowerPath'].Value)|$($tupleMatch.Groups['lowerAnchor'].Value)"
            if($null-eq$lowerIdentity){$lowerIdentity=$lower}elseif($lower-cne$lowerIdentity){throw 'governance v1 relation block has multiple lower owners'}
            $preserved=@()
            if($preservedMatch.Groups['value'].Value-cne'[]'){$preserved=@($preservedMatch.Groups['value'].Value.Substring(1,$preservedMatch.Groups['value'].Value.Length-2).Split(', '))}
            if(@($preserved|Select-Object -Unique).Count-ne$preserved.Count){throw 'governance v1 PreservedConstraintIds contains a duplicate'}
            $mode=$tupleMatch.Groups['mode'].Value;$upperId=$upperMatch.Groups['id'].Value;$extension=$extensionMatch.Groups['value'].Value
            if($mode-ceq'reference'-and($extension-cne'none'-or$preserved.Count-ne0)){throw 'governance v1 reference relation values are invalid'}
            if($mode-ceq'strengthen'){
                if($extension-cne'none'-or@($preserved|Where-Object{$_-ceq$upperId}).Count-ne1){throw 'governance v1 strengthen relation values are invalid'}
                $remaining=@($preserved|Where-Object{$_-cne$upperId});$sorted=@($remaining|Sort-Object -CaseSensitive)
                for($i=0;$i-lt$remaining.Count;$i++){if($remaining[$i]-cne$sorted[$i]){throw 'governance v1 strengthen preserved ancestor IDs are not ordinal'}}
            }
            if($mode-ceq'specialize'-and($extension-ceq'none'-or$preserved.Count-ne1-or$preserved[0]-cne$upperId)){throw 'governance v1 specialize relation values are invalid'}
            $relations.Add([pscustomobject][ordered]@{
                Mode=$mode;LowerLayer=$tupleMatch.Groups['lowerLayer'].Value;LowerPath=$tupleMatch.Groups['lowerPath'].Value;LowerAnchor=$tupleMatch.Groups['lowerAnchor'].Value
                UpperLayer=$tupleMatch.Groups['upperLayer'].Value;UpperPath=$tupleMatch.Groups['upperPath'].Value;UpperAnchor=$tupleMatch.Groups['upperAnchor'].Value
                UpperConstraintId=$upperId;ExtensionKey=$extension;PreservedConstraintIds=$preserved;SemanticReviewRequired=$true
            })
        }
        if($Carrier-ceq'ProjectAdapter'){
            $ownerParts=$lowerIdentity.Split('|');$OwnerLayer=$ownerParts[0];$PhysicalPath=$ownerParts[1];$OwnerAnchor=$ownerParts[2]
        }elseif($OwnerLayer-notin@('global','project','task')-or-not(Test-Gv1Path $PhysicalPath)-or-not(Test-Gv1Anchor $OwnerAnchor)){
            throw 'governance v1 non-empty Markdown block owner is invalid'
        }elseif("$OwnerLayer|$PhysicalPath|$OwnerAnchor"-cne$lowerIdentity){
            throw 'governance v1 Markdown owner does not match the relation lower tuple'
        }
    }
    [pscustomobject][ordered]@{
        NormativeRuleId=$idMatch.Groups['id'].Value
        ConstraintClass=$classMatch.Groups['class'].Value
        RuleRelations=@($relations)
        Carrier=$Carrier
        PhysicalPath=$PhysicalPath
        OwnerLayer=$OwnerLayer
        OwnerPath=$PhysicalPath
        OwnerAnchor=$OwnerAnchor
        CanonicalText=$Text
    }
}

function Get-GovernanceV1MarkdownRules {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][ValidateSet('global','project','task')][string]$Layer
    )

    $allowedPath=if($Layer-ceq'global'){@('AGENTS.md','core/CONSTITUTION.md','core/OUTPUT.md','core/LIFECYCLE.md','core/ARTIFACTS.md','core/EXECUTION.md')-ccontains$Path}elseif($Layer-ceq'project'){$Path-in@('docs/ai/PROJECT_RULES.md','docs/ai/WORKFLOW.md')}else{$Path-match'^docs/ai/tasks/TASK-[0-9]+\.md$'}
    if(-not$allowedPath){throw "governance v1 Markdown path is not a canonical normative owner: $Path"}
    if(($Text.Contains("`r"))-or(-not ($Text.EndsWith("`n")))){throw "governance v1 Markdown text is not canonical: $Path"}
    $lines=@($Text.Substring(0,$Text.Length-1).Split("`n"))
    $rules=[Collections.Generic.List[object]]::new();$inFence=$false;$heading=$null
    for($i=0;$i-lt$lines.Count;$i++){
        if($lines[$i]-match'^```'){$inFence=-not$inFence;continue}
        if($inFence){continue}
        $headingMatch=[regex]::Match($lines[$i],'^## (?<anchor>[a-z0-9]+(?:[_-][a-z0-9]+)*)$')
        if($headingMatch.Success){$heading=$headingMatch.Groups['anchor'].Value;continue}
        if($lines[$i]-cne':::governance-rule-v1'){continue}
        if($null-eq$heading-or$i-eq0-or$lines[$i-1]-cne"## $heading"){throw "governance v1 Markdown block is not immediately after an allowed heading: $Path"}
        if($Layer-ceq'task'-and$heading-cne'rule_relations'){throw "governance v1 TASK block must follow rule_relations heading: $Path"}
        if($Layer-cne'task'-and-not(Test-Gv1Anchor $heading)){throw "governance v1 Markdown heading is not a canonical anchor: $Path"}
        $ownerAnchor=if($Layer-ceq'task'){'rule-relations'}else{$heading}
        $end=$i+1
        while($end-lt$lines.Count-and$lines[$end]-cne':::'){$end++}
        if($end-ge$lines.Count){throw "governance v1 Markdown block is unterminated: $Path"}
        $block=($lines[$i..$end]-join"`n")+"`n"
        $rules.Add((ConvertFrom-GovernanceV1RuleBlock -Text $block -Carrier Markdown -PhysicalPath $Path -OwnerLayer $Layer -OwnerAnchor $ownerAnchor))
        $i=$end
    }
    if($inFence){throw "governance v1 Markdown fence is unterminated: $Path"}
    @($rules)
}

function Get-Gv1ProjectConstraintsCanonicalText {
    param($ProjectConstraints)
    if($ProjectConstraints-isnot[Collections.Hashtable]){throw 'governance v1 ProjectConstraints must be System.Collections.Hashtable'}
    $c=Get-GovernanceV1Contract
    $null=Assert-Gv1ExactDictionaryKeys $ProjectConstraints @('ReviewClassFloor','ProhibitedRouteIds','MinimumRouteByAssignmentClass') 'ProjectConstraints'
    if($ProjectConstraints.ReviewClassFloor-isnot[string]-or[string]$ProjectConstraints.ReviewClassFloor-notin@('none','normal','high_risk')){throw 'governance v1 ReviewClassFloor is invalid'}
    if($ProjectConstraints.ProhibitedRouteIds-isnot[object[]]){throw 'governance v1 ProhibitedRouteIds must be System.Object[]'}
    $prohibited=@($ProjectConstraints.ProhibitedRouteIds)
    foreach($route in $prohibited){if($route-isnot[string]){throw 'governance v1 ProhibitedRouteIds element must be System.String'}}
    if(@($prohibited|Select-Object -Unique).Count-ne$prohibited.Count){throw 'governance v1 ProhibitedRouteIds contains a duplicate'}
    $expectedProhibited=@($c.RouteIds|Where-Object{$prohibited-ccontains$_})
    $null=Assert-Gv1ExactSequence $prohibited $expectedProhibited 'ProjectConstraints.ProhibitedRouteIds'
    foreach($route in $prohibited){if($c.RouteIds-cnotcontains$route){throw "governance v1 prohibited route is unknown: $route"}}
    $matrix=$ProjectConstraints.MinimumRouteByAssignmentClass
    if($matrix-isnot[Collections.Hashtable]){throw 'governance v1 MinimumRouteByAssignmentClass must be System.Collections.Hashtable'}
    $assignments=@($c.AssignmentPurpose.Keys)
    $null=Assert-Gv1ExactDictionaryKeys $matrix $assignments 'ProjectConstraints.MinimumRouteByAssignmentClass'
    foreach($assignment in $assignments){
        $row=$matrix[$assignment]
        if($row-isnot[Collections.Hashtable]){throw "governance v1 project minimum row must be System.Collections.Hashtable: $assignment"}
        $null=Assert-Gv1ExactDictionaryKeys $row @('small','normal','high_risk') "ProjectConstraints.MinimumRouteByAssignmentClass.$assignment"
        $purpose=[string]$c.AssignmentPurpose[$assignment];$order=@($c.PurposeOrders[$purpose])
        foreach($class in @('small','normal','high_risk')){
            $value=$row[$class]
            if($value-isnot[string]){throw "governance v1 project minimum cell must be System.String: $assignment/$class"}
            $global=[string]$c.GlobalMinimumByAssignmentClass[$assignment][$class]
            if($global-ceq'not_applicable'){
                if($value-cne'none'){throw "governance v1 project cannot make not_applicable cell applicable: $assignment/$class"}
                continue
            }
            if($value-ceq'none'){continue}
            $globalIndex=[array]::IndexOf($order,$global);$valueIndex=[array]::IndexOf($order,[string]$value)
            if($valueIndex-lt0){throw "governance v1 project minimum has wrong-purpose or unknown route: $assignment/$class"}
            if($valueIndex-lt$globalIndex){throw "governance v1 project minimum attempts a downgrade: $assignment/$class"}
        }
    }
    $prohibitedText=if($prohibited.Count-eq0){'@()'}else{'@('+(($prohibited|ForEach-Object{"'$_'"})-join', ')+')'}
    $lines=[Collections.Generic.List[string]]::new()
    $lines.Add('    ProjectConstraints = @{')
    $lines.Add("        ReviewClassFloor = '$($ProjectConstraints.ReviewClassFloor)'")
    $lines.Add("        ProhibitedRouteIds = $prohibitedText")
    $lines.Add('        MinimumRouteByAssignmentClass = @{')
    foreach($assignment in $assignments){
        $lines.Add("            $assignment = @{")
        foreach($class in @('small','normal','high_risk')){$lines.Add("                $class = '$($matrix[$assignment][$class])'")}
        $lines.Add('            }')
    }
    $lines.Add('        }');$lines.Add('    }')
    ($lines-join"`n")+"`n"
}

function Assert-GovernanceV1ProjectAdapter {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)]$Adapter,
        $Policy=$null
    )

    if($Text.Length-gt0-and[int]$Text[0]-eq0xFEFF){throw 'governance v1 PROJECT_ADAPTER text has a UTF-8 BOM'}
    if(($Text.Contains("`r"))-or(-not ($Text.EndsWith("`n")))-or(-not ($Text.IsNormalized([Text.NormalizationForm]::FormC)))){throw 'governance v1 PROJECT_ADAPTER text is not canonical'}
    if($Adapter-isnot[Collections.Hashtable]){throw 'governance v1 PROJECT_ADAPTER root must be System.Collections.Hashtable'}
    $rootKeys=@('SchemaVersion','ProjectName','PermanentRequirementsHandoff','ProjectOverlayValidator','RuleRelations','ProjectConstraints','StartupContextLimitBytes','ExtensionDomains','ActiveTaskLimitBytes','PhaseExtensions','ReviewCategoryExtensions','TaskHistory','Backlog','ProductIdentity','Relay')
    if($null-ne$Policy){$rootKeys=@($Policy.ProjectAdapter.RootPropertyOrder)}
    $null=Assert-Gv1ExactDictionaryKeys $Adapter $rootKeys 'PROJECT_ADAPTER root'
    if($Adapter.SchemaVersion-isnot[int]-or[int]$Adapter.SchemaVersion-ne2){throw 'governance v1 PROJECT_ADAPTER SchemaVersion must be integer 2'}
    foreach($key in @('ProjectName','PermanentRequirementsHandoff','ProjectOverlayValidator')){if($Adapter[$key]-isnot[string]-or[string]::IsNullOrWhiteSpace([string]$Adapter[$key])){throw "governance v1 PROJECT_ADAPTER scalar is invalid: $key"}}
    foreach($key in @('StartupContextLimitBytes','ActiveTaskLimitBytes')){if($Adapter[$key]-isnot[int]-or[int]$Adapter[$key]-le0){throw "governance v1 PROJECT_ADAPTER limit is invalid: $key"}}
    if($Adapter.ExtensionDomains-isnot[Collections.Hashtable]){throw 'governance v1 PROJECT_ADAPTER ExtensionDomains must be System.Collections.Hashtable'}
    foreach($key in @('PhaseExtensions','ReviewCategoryExtensions')){if($Adapter[$key]-isnot[object[]]){throw "governance v1 PROJECT_ADAPTER extension list must be System.Object[]: $key"}}
    foreach($key in @('TaskHistory','Backlog','ProductIdentity','Relay')){if($Adapter[$key]-isnot[Collections.Hashtable]){throw "governance v1 PROJECT_ADAPTER record must be System.Collections.Hashtable: $key"}}
    $rootPositions=[Collections.Generic.List[int]]::new()
    foreach($name in $rootKeys){$matches=[regex]::Matches($Text,"(?m)^    $([regex]::Escape($name)) =");if($matches.Count-ne1){throw "governance v1 PROJECT_ADAPTER requires exactly one lexical root property: $name"};$rootPositions.Add($matches[0].Index)}
    for($i=1;$i-lt$rootPositions.Count;$i++){if($rootPositions[$i]-le$rootPositions[$i-1]){throw 'governance v1 PROJECT_ADAPTER root property order is invalid'}}
    $phaseIds=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach($extension in @($Adapter.PhaseExtensions)){
        $null=Assert-Gv1ExactDictionaryKeys $extension @('Id','PublicPhase','SourceReference') 'PROJECT_ADAPTER PhaseExtensions record'
        $id=[string]$extension.Id;$public=[string]$extension.PublicPhase;$source=[string]$extension.SourceReference
        if(-not(Test-Gv1Scalar $id)-or-not$phaseIds.Add($id)-or[string]::IsNullOrWhiteSpace($source)){throw 'governance v1 PROJECT_ADAPTER PhaseExtensions identity is invalid'}
        if($null-ne$Policy){
            if(@($Policy.Lifecycle.InternalPhases)-ccontains$id-or@($Policy.Output.PublicPhases)-cnotcontains$public-or$id-in@('user_decision','blocked')){throw "governance v1 PROJECT_ADAPTER PhaseExtensions conflicts with shared lifecycle: $id"}
        }
    }
    $reviewIds=@($Adapter.ReviewCategoryExtensions)
    foreach($id in $reviewIds){if($id-isnot[string]-or-not(Test-Gv1Scalar ([string]$id))){throw 'governance v1 PROJECT_ADAPTER ReviewCategoryExtensions element is invalid'}}
    if(@($reviewIds|Select-Object -Unique).Count-ne$reviewIds.Count){throw 'governance v1 PROJECT_ADAPTER ReviewCategoryExtensions contains a duplicate'}
    $sortedReviewIds=@($reviewIds|Sort-Object -CaseSensitive);for($i=0;$i-lt$reviewIds.Count;$i++){if($reviewIds[$i]-cne$sortedReviewIds[$i]){throw 'governance v1 PROJECT_ADAPTER ReviewCategoryExtensions is not ordinal'}}
    $reviewStart=[regex]::Match($Text,'(?m)^    ReviewCategoryExtensions = ');$taskHistoryStart=[regex]::Match($Text,'(?m)^    TaskHistory = @\{$');$reviewSlice=$Text.Substring($reviewStart.Index,$taskHistoryStart.Index-$reviewStart.Index)
    $expectedReviewSlice=if($reviewIds.Count-eq0){"    ReviewCategoryExtensions = @()`n"}else{"    ReviewCategoryExtensions = @(`n"+(($reviewIds|ForEach-Object{"        '$_'"})-join"`n")+"`n    )`n"}
    if($reviewSlice-cne$expectedReviewSlice){throw 'governance v1 PROJECT_ADAPTER ReviewCategoryExtensions lexical serialization mismatch'}
    $null=Assert-Gv1ExactDictionaryKeys $Adapter.Relay @('Repository','Requirements') 'PROJECT_ADAPTER Relay'
    if($Adapter.Relay.Repository-isnot[string]-or[string]::IsNullOrWhiteSpace([string]$Adapter.Relay.Repository)){throw 'governance v1 PROJECT_ADAPTER Relay.Repository is invalid'}
    $null=Assert-Gv1ExactDictionaryKeys $Adapter.Relay.Requirements @('RequireProductIdentityReference','ProductIdentityReferences','TaskMetadata') 'PROJECT_ADAPTER Relay.Requirements'
    if($Adapter.Relay.Requirements.RequireProductIdentityReference-isnot[bool]-or$Adapter.Relay.Requirements.ProductIdentityReferences-isnot[object[]]-or$Adapter.Relay.Requirements.TaskMetadata-isnot[object[]]){throw 'governance v1 PROJECT_ADAPTER Relay.Requirements runtime type mismatch'}
    foreach($reference in @($Adapter.Relay.Requirements.ProductIdentityReferences)){if($reference-isnot[string]-or[string]::IsNullOrWhiteSpace([string]$reference)){throw 'governance v1 PROJECT_ADAPTER product identity reference is invalid'}}
    $propertyPatterns=[ordered]@{
        ProjectOverlayValidator='(?m)^    ProjectOverlayValidator = .+$'
        RuleRelations='(?m)^    RuleRelations = (?:@\(\)|@\()$'
        ProjectConstraints='(?m)^    ProjectConstraints = @\{$'
        StartupContextLimitBytes='(?m)^    StartupContextLimitBytes = \d+$'
    }
    $positions=@{}
    foreach($name in $propertyPatterns.Keys){$matches=[regex]::Matches($Text,$propertyPatterns[$name]);if($matches.Count-ne1){throw "governance v1 PROJECT_ADAPTER requires exactly one root property: $name"};$positions[$name]=$matches[0].Index}
    $ordered=@($propertyPatterns.Keys);for($i=1;$i-lt$ordered.Count;$i++){if($positions[$ordered[$i]]-le$positions[$ordered[$i-1]]){throw 'governance v1 PROJECT_ADAPTER root property order is invalid'}}
    $rules=@()
    $zeroMatch=[regex]::Match($Text,'(?m)^    RuleRelations = @\(\)$')
    if($zeroMatch.Success){
        if($Adapter.RuleRelations-isnot[object[]]-or@($Adapter.RuleRelations).Count-ne0){throw 'governance v1 RuleRelations zero-block runtime value is invalid'}
    }else{
        $start=[regex]::Match($Text,'(?m)^    RuleRelations = @\($')
        $projectStart=[regex]::Match($Text,'(?m)^    ProjectConstraints = @\{$')
        $slice=$Text.Substring($start.Index,$projectStart.Index-$start.Index)
        if(-not$slice.EndsWith("    )`n")){throw 'governance v1 RuleRelations wrapper closing line is invalid'}
        $sliceLines=@($slice.Substring(0,$slice.Length-1).Split("`n"));if($sliceLines[0]-cne'    RuleRelations = @('-or$sliceLines[$sliceLines.Count-1]-cne'    )'){throw 'governance v1 RuleRelations wrapper is invalid'}
        $logical=[Collections.Generic.List[string]]::new()
        foreach($line in $sliceLines[1..($sliceLines.Count-2)]){
            $match=[regex]::Match($line,"^        '([^']*)'$")
            if(-not$match.Success-or[string]::IsNullOrEmpty($match.Groups[1].Value)){throw 'governance v1 RuleRelations element wrapper is invalid'}
            $logical.Add($match.Groups[1].Value)
        }
        if($Adapter.RuleRelations-isnot[object[]]-or@($Adapter.RuleRelations).Count-ne$logical.Count){throw 'governance v1 RuleRelations runtime array is invalid'}
        for($i=0;$i-lt$logical.Count;$i++){if($Adapter.RuleRelations[$i]-isnot[string]-or[string]$Adapter.RuleRelations[$i]-cne$logical[$i]){throw 'governance v1 RuleRelations runtime element is invalid'}}
        $decoded=($logical-join"`n")+"`n";$index=0;$blocks=[Collections.Generic.List[string]]::new()
        while($index-lt$logical.Count){
            if($logical[$index]-cne':::governance-rule-v1'){throw 'governance v1 RuleRelations contains bytes outside a complete block'}
            $end=$index+1;while($end-lt$logical.Count-and$logical[$end]-cne':::'){$end++}
            if($end-ge$logical.Count){throw 'governance v1 RuleRelations contains an unterminated block'}
            $blocks.Add(($logical[$index..$end]-join"`n")+"`n");$index=$end+1
        }
        foreach($block in $blocks){$rules+=ConvertFrom-GovernanceV1RuleBlock -Text $block -Carrier ProjectAdapter -PhysicalPath 'docs/ai/PROJECT_ADAPTER.psd1'}
        $encoded=[Collections.Generic.List[string]]::new();$encoded.Add('    RuleRelations = @(');foreach($line in $logical){$encoded.Add("        '$line'")};$encoded.Add('    )')
        if((($encoded-join"`n")+"`n")-cne$slice){throw 'governance v1 RuleRelations carrier round-trip mismatch'}
        if($decoded.Length-eq0){throw 'governance v1 RuleRelations decoded bytes are empty'}
    }
    $projectStart=[regex]::Match($Text,'(?m)^    ProjectConstraints = @\{$')
    $startup=[regex]::Match($Text,'(?m)^    StartupContextLimitBytes = \d+$')
    $projectSlice=$Text.Substring($projectStart.Index,$startup.Index-$projectStart.Index)
    $canonical=Get-Gv1ProjectConstraintsCanonicalText $Adapter.ProjectConstraints
    if($projectSlice-cne$canonical){throw 'governance v1 ProjectConstraints lexical serialization/order mismatch'}
    [pscustomobject][ordered]@{RuleRecords=@($rules);ProjectConstraints=$Adapter.ProjectConstraints}
}

function Assert-GovernanceV1RuleSet {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][AllowEmptyCollection()][object[]]$Rules,$ExtensionDomains=@{})

    $byId=@{};$relationIds=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach($rule in @($Rules)){
        $id=[string]$rule.NormativeRuleId
        if($byId.ContainsKey($id)){throw "governance v1 duplicate NormativeRuleId: $id"}
        $byId[$id]=$rule
    }
    foreach($rule in @($Rules)){
        foreach($relation in @($rule.RuleRelations)){
            $upperId=[string]$relation.UpperConstraintId
            if(-not$byId.ContainsKey($upperId)){throw "governance v1 UpperConstraintId resolution count is zero: $upperId"}
            $upper=$byId[$upperId]
            if([string]$upper.OwnerLayer-cne[string]$relation.UpperLayer-or[string]$upper.OwnerPath-cne[string]$relation.UpperPath-or[string]$upper.OwnerAnchor-cne[string]$relation.UpperAnchor){throw "governance v1 upper owner identity mismatch: $upperId"}
            if([string]$rule.OwnerLayer-cne[string]$relation.LowerLayer-or[string]$rule.OwnerPath-cne[string]$relation.LowerPath-or[string]$rule.OwnerAnchor-cne[string]$relation.LowerAnchor){throw "governance v1 lower owner identity mismatch: $($rule.NormativeRuleId)"}
            $tuple="$($relation.Mode)|$($relation.LowerLayer)|$($relation.LowerPath)|$($relation.LowerAnchor)|$($relation.UpperLayer)|$($relation.UpperPath)|$($relation.UpperAnchor)"
            $relationId="$($rule.NormativeRuleId)|$tuple|$upperId"
            if(-not$relationIds.Add($relationId)){throw "governance v1 duplicate relation-record identity: $relationId"}
            if([string]$upper.ConstraintClass-ceq'non_relaxable'-and[string]$rule.ConstraintClass-cne'non_relaxable'){throw "governance v1 relation weakens a non-relaxable upper constraint: $upperId"}
            foreach($preserved in @($relation.PreservedConstraintIds)){if(-not$byId.ContainsKey([string]$preserved)){throw "governance v1 preserved constraint is unresolved: $preserved"}}
            if([string]$relation.Mode-ceq'specialize'){
                $parts=([string]$relation.ExtensionKey).Split('=',2);if($parts.Count-ne2-or$ExtensionDomains-isnot[Collections.IDictionary]-or-not$ExtensionDomains.Contains($upperId)){throw "governance v1 specialization domain is missing: $upperId"}
                $domain=$ExtensionDomains[$upperId];if($domain-isnot[Collections.IDictionary]-or-not$domain.Contains($parts[0])-or@($domain[$parts[0]])-cnotcontains$parts[1]){throw "governance v1 specialization value is outside the declared domain: $upperId"}
            }
        }
    }
    $visiting=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal);$visited=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    function Visit-Gv1Rule([string]$Id){
        if($script:gv1Visited.Contains($Id)){return}
        if(-not$script:gv1Visiting.Add($Id)){throw "governance v1 relation cycle detected at: $Id"}
        foreach($relation in @($script:gv1ById[$Id].RuleRelations)){Visit-Gv1Rule ([string]$relation.UpperConstraintId)}
        $null=$script:gv1Visiting.Remove($Id);$null=$script:gv1Visited.Add($Id)
    }
    $oldById=$script:gv1ById;$oldVisiting=$script:gv1Visiting;$oldVisited=$script:gv1Visited
    try{$script:gv1ById=$byId;$script:gv1Visiting=$visiting;$script:gv1Visited=$visited;foreach($id in @($byId.Keys)){Visit-Gv1Rule $id}}finally{$script:gv1ById=$oldById;$script:gv1Visiting=$oldVisiting;$script:gv1Visited=$oldVisited}
    $true
}

function Assert-GovernanceV1MachineAssuranceClaims {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string[]]$Claims)
    $allowed=@('fixed_schema','canonical_taxonomy','declaration_placement','declared_identity_membership','unique_resolution_and_cycles','byte_identical_duplicate','semantic_review_flag','semantic_evidence_identity','review_source_identity')
    if(@($Claims|Select-Object -Unique).Count-ne$Claims.Count){throw 'governance v1 machine assurance claim is duplicated'}
    foreach($claim in $Claims){if($allowed-cnotcontains$claim){throw "governance v1 machine assurance overclaim is forbidden: $claim"}}
    $true
}

function Assert-GovernanceV1SemanticEvidenceIdentity {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$CandidateCommit,
        [Parameter(Mandatory=$true)][string]$Blob,
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Anchor
    )
    if($CandidateCommit-notmatch'^[0-9a-f]{40}$'-or$Blob-notmatch'^[0-9a-f]{40}$'-or-not(Test-Gv1Path $Path)-or-not(Test-Gv1Anchor $Anchor)){throw 'governance v1 semantic review evidence identity is invalid'}
    [pscustomobject][ordered]@{CandidateCommit=$CandidateCommit;Blob=$Blob;Path=$Path;Anchor=$Anchor}
}

function Get-GovernanceV1BaseClass {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]$Evidence,
        [Parameter(Mandatory=$true)]$Triggers,
        [bool]$ExternalResourceNotApplicableProven=$false
    )

    $c=Get-GovernanceV1Contract
    if($Evidence-isnot[Collections.IDictionary]-or$Triggers-isnot[Collections.IDictionary]){return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_INPUT_INVALID';BaseClass='none'}}
    try{
        $null=Assert-Gv1ExactDictionaryKeys $Evidence $c.EvidenceFields 'classification evidence'
        $allTriggers=@($c.HighRiskTriggers+$c.NormalTriggers+$c.SmallTriggers)
        $null=Assert-Gv1ExactDictionaryKeys $Triggers $allTriggers 'classification triggers'
    }catch{return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_INPUT_INVALID';BaseClass='none'}}
    foreach($field in $c.EvidenceFields){
        $value=[string]$Evidence[$field]
        if($value-notin$c.CompletenessStatuses){return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_INPUT_INVALID';BaseClass='none'}}
        if($value-ceq'not_applicable'-and($field-cne'external_resource_identity'-or-not$ExternalResourceNotApplicableProven)){return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_APPLICABILITY_INVALID';BaseClass='none'}}
    }
    foreach($field in @($c.HighRiskTriggers+$c.NormalTriggers+$c.SmallTriggers)){
        if([string]$Triggers[$field]-notin$c.TriggerValues){return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_TRIGGER_INVALID';BaseClass='none'}}
        if([string]$Triggers[$field]-ceq'not_applicable'){return [pscustomobject]@{Outcome='BLOCKED';Reason='CLASS_TRIGGER_APPLICABILITY_INVALID';BaseClass='none'}}
    }
    if(@($c.EvidenceFields|Where-Object{[string]$Evidence[$_]-in@('missing','unknown')}).Count-gt0-or@($c.HighRiskTriggers+$c.NormalTriggers+$c.SmallTriggers|Where-Object{[string]$Triggers[$_]-ceq'unknown'}).Count-gt0){
        return [pscustomobject]@{Outcome='BLOCKED';Reason='EVIDENCE_OR_TRIGGER_UNKNOWN';BaseClass='none'}
    }
    if(@($c.HighRiskTriggers|Where-Object{[string]$Triggers[$_]-ceq'true'}).Count-gt0){return [pscustomobject]@{Outcome='CLASSIFIED';Reason='HIGH_RISK_TRIGGER';BaseClass='high_risk'}}
    $small=@($c.SmallTriggers|Where-Object{[string]$Triggers[$_]-ceq'true'}).Count-eq$c.SmallTriggers.Count
    $nonSmall=@($c.HighRiskTriggers+$c.NormalTriggers|Where-Object{[string]$Triggers[$_]-ceq'true'}).Count
    if($small-and$nonSmall-eq0){return [pscustomobject]@{Outcome='CLASSIFIED';Reason='ALL_SMALL_PREDICATES';BaseClass='small'}}
    [pscustomobject]@{Outcome='CLASSIFIED';Reason='NORMAL_DEFAULT';BaseClass='normal'}
}

function Select-GovernanceV1Route {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$AssignmentId,
        [Parameter(Mandatory=$true)][string]$BaseClass,
        [Parameter(Mandatory=$true)]$ProjectConstraints,
        [Parameter(Mandatory=$true)]$Availability
    )

    $c=Get-GovernanceV1Contract
    if($BaseClass-notin@('small','normal','high_risk')){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='BASE_CLASS_INVALID';BaseClass=$BaseClass;EffectiveClass='none';Purpose='none';Route='none'}}
    try{$null=Get-Gv1ProjectConstraintsCanonicalText $ProjectConstraints}catch{return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='PROJECT_CONSTRAINTS_INVALID';BaseClass=$BaseClass;EffectiveClass='none';Purpose='none';Route='none'}}
    $classOrder=@('small','normal','high_risk');$floor=[string]$ProjectConstraints.ReviewClassFloor
    $effective=$BaseClass
    if($floor-cne'none'-and[array]::IndexOf($classOrder,$floor)-gt[array]::IndexOf($classOrder,$BaseClass)){$effective=$floor}
    if(-not$c.AssignmentPurpose.Contains($AssignmentId)){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='ASSIGNMENT_PURPOSE_UNRESOLVED';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose='none';Route='none'}}
    $purpose=[string]$c.AssignmentPurpose[$AssignmentId];$order=@($c.PurposeOrders[$purpose])
    $minimum=[string]$c.GlobalMinimumByAssignmentClass[$AssignmentId][$effective]
    if($minimum-ceq'not_applicable'){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='ASSIGNMENT_CLASS_NOT_APPLICABLE';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}}
    $projectMinimum=[string]$ProjectConstraints.MinimumRouteByAssignmentClass[$AssignmentId][$effective]
    if($projectMinimum-cne'none'){$minimum=$projectMinimum}
    if($Availability-isnot[Collections.IDictionary]){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='AVAILABILITY_INVALID';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}}
    $start=[array]::IndexOf($order,$minimum);if($start-lt0){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='MINIMUM_ROUTE_INVALID';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}}
    $prohibited=@($ProjectConstraints.ProhibitedRouteIds)
    for($i=$start;$i-lt$order.Count;$i++){
        $route=$order[$i]
        if($prohibited-ccontains$route){continue}
        if(-not$Availability.Contains($route)-or[string]$Availability[$route]-notin$c.Availability){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='AVAILABILITY_INVALID';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}}
        $state=[string]$Availability[$route]
        if($state-ceq'unknown'){return [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='AVAILABILITY_UNKNOWN';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}}
        if($state-ceq'available'){return [pscustomobject][ordered]@{Outcome='SELECTED';Reason='FIRST_AVAILABLE';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route=$route}}
    }
    [pscustomobject][ordered]@{Outcome='BLOCKED';Reason='ZERO_ROUTE';BaseClass=$BaseClass;EffectiveClass=$effective;Purpose=$purpose;Route='none'}
}

function ConvertTo-Gv1ScopeRecord {
    param($Scope)
    $mandatory=@('ScopeId','Paths','DependencyScopeIds','MutableOutputPaths','IndependentlyCommittable','EffortClass','WorkerAllowed','OwnershipStatus','EvidenceStatus')
    $optional=@('IndependentExecution');$allowed=@($mandatory+$optional);$values=@{};$names=@()
    if($Scope-is[Collections.IDictionary]){
        foreach($key in @($Scope.Keys)){if($key-isnot[string]){throw 'scope field name is not System.String'};$names+=[string]$key}
        foreach($name in $names){try{$values[$name]=$Scope[$name]}catch{throw "scope field is inaccessible: $name"}}
    }elseif($Scope-is[pscustomobject]){
        $properties=@($Scope.PSObject.Properties)
        foreach($property in $properties){if($property.MemberType-notin@('NoteProperty','Property')){throw "scope field is not a data property: $($property.Name)"};$names+=[string]$property.Name;try{$values[$property.Name]=$property.Value}catch{throw "scope field is inaccessible: $($property.Name)"}}
    }else{throw 'scope record is not an exact mapping or object'}
    $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach($name in $names){if(-not$seen.Add($name)-or$allowed-cnotcontains$name){throw "scope record contains a duplicate or unknown field: $name"}}
    foreach($name in $mandatory){if($names-cnotcontains$name){throw "scope record is missing a mandatory field: $name"}}
    if($names.Count-ne$mandatory.Count-and$names.Count-ne($mandatory.Count+$optional.Count)){throw 'scope record field count is invalid'}
    foreach($name in @('Paths','DependencyScopeIds','MutableOutputPaths')){
        $value=$values[$name]
        if($null-eq$value-or$value-isnot[Array]-or$value.Rank-ne1){throw "scope collection must be an explicit one-dimensional array: $name"}
        foreach($item in $value){if($item-isnot[string]){throw "scope collection element must be System.String: $name"}}
    }
    $independent=if($names-ccontains'IndependentExecution'){$values.IndependentExecution}else{'optional'}
    [pscustomobject][ordered]@{
        ScopeId=$values.ScopeId;Paths=[string[]]@($values.Paths);DependencyScopeIds=[string[]]@($values.DependencyScopeIds);MutableOutputPaths=[string[]]@($values.MutableOutputPaths)
        IndependentlyCommittable=$values.IndependentlyCommittable;EffortClass=$values.EffortClass;WorkerAllowed=$values.WorkerAllowed;OwnershipStatus=$values.OwnershipStatus;EvidenceStatus=$values.EvidenceStatus;IndependentExecution=$independent
    }
}

function Select-GovernanceV1BuildWorkers {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][object[]]$Scopes,[Parameter(Mandatory=$true)][ValidateSet('available','unavailable','unknown')][string]$FanoutAvailability)

    $scopeById=@{};$normalized=[Collections.Generic.List[object]]::new()
    foreach($scope in @($Scopes)){
        try{$record=ConvertTo-Gv1ScopeRecord $scope}catch{return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_RECORD_SCHEMA_INVALID';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}
        $id=$record.ScopeId;if($id-isnot[string]-or[string]::IsNullOrWhiteSpace($id)-or$scopeById.ContainsKey($id)){return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_ID_INVALID';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}
        $independent=$record.IndependentExecution;$committable=$record.IndependentlyCommittable;$workerAllowed=$record.WorkerAllowed;$effort=$record.EffortClass;$ownership=$record.OwnershipStatus;$evidence=$record.EvidenceStatus
        if($committable-isnot[bool]-or$workerAllowed-isnot[bool]-or$effort-isnot[string]-or$ownership-isnot[string]-or$evidence-isnot[string]-or$independent-isnot[string]-or$effort-notin@('small','normal','large')-or$ownership-notin@('exact','conflict','unknown')-or$evidence-notin@('bounded','unbounded','unknown')-or$independent-notin@('optional','required')){return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_RECORD_INVALID';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}
        if($ownership-ceq'unknown'-or$evidence-ceq'unknown'){return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_EVIDENCE_UNKNOWN';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}
        $paths=@($record.Paths);$dependencies=@($record.DependencyScopeIds);$outputs=@($record.MutableOutputPaths)
        foreach($set in @($paths,$dependencies,$outputs)){if(@($set|Select-Object -Unique).Count-ne$set.Count){return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_SET_DUPLICATE';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}}
        foreach($path in @($paths+$outputs)){if(-not(Test-Gv1Path ([string]$path))){return [pscustomobject]@{Outcome='BLOCKED';Reason='SCOPE_PATH_INVALID';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}}
        $record=[pscustomobject][ordered]@{ScopeId=$id;Paths=$paths;DependencyScopeIds=$dependencies;MutableOutputPaths=$outputs;IndependentlyCommittable=$committable;EffortClass=$effort;WorkerAllowed=$workerAllowed;OwnershipStatus=$ownership;EvidenceStatus=$evidence;IndependentExecution=$independent}
        $scopeById[$id]=$record;$normalized.Add($record)
    }
    foreach($scope in $normalized){foreach($dependency in $scope.DependencyScopeIds){if(-not$scopeById.ContainsKey([string]$dependency)){return [pscustomobject]@{Outcome='BLOCKED';Reason='DEPENDENCY_MISSING';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}}}
    function Get-Gv1DependencyClosure([string]$Id,[string[]]$Trail=@()){
        if($Trail-ccontains$Id){throw 'dependency cycle'}
        $result=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach($dep in $script:gv1WorkerScopeById[$Id].DependencyScopeIds){$dep=[string]$dep;$null=$result.Add($dep);foreach($nested in @(Get-Gv1DependencyClosure $dep @($Trail+$Id))){$null=$result.Add([string]$nested)}}
        @($result)
    }
    $oldScopeMap=$script:gv1WorkerScopeById;$closures=@{};try{$script:gv1WorkerScopeById=$scopeById;foreach($scope in $normalized){try{$closures[$scope.ScopeId]=@(Get-Gv1DependencyClosure $scope.ScopeId)}catch{return [pscustomobject]@{Outcome='BLOCKED';Reason='DEPENDENCY_CYCLE';WorkerCount=0;SelectedScopeIds=@();Execution='none'}}}}finally{$script:gv1WorkerScopeById=$oldScopeMap}
    $effortRank=@{large=0;normal=1;small=2}
    $eligible=@($normalized|Where-Object{$_.IndependentlyCommittable-and$_.WorkerAllowed-and$_.OwnershipStatus-ceq'exact'-and$_.EvidenceStatus-ceq'bounded'-and$_.EffortClass-in@('normal','large')}|Sort-Object @{Expression={$effortRank[$_.EffortClass]}},@{Expression={$_.ScopeId}})
    $selected=[Collections.Generic.List[object]]::new()
    foreach($scope in $eligible){
        $expandedIds=@($scope.ScopeId)+@($closures[$scope.ScopeId]);$expandedPaths=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach($expandedId in $expandedIds){$expanded=$scopeById[$expandedId];foreach($path in @($expanded.Paths+$expanded.MutableOutputPaths)){$null=$expandedPaths.Add([string]$path)}}
        $conflict=$false
        foreach($other in $selected){if(@($expandedIds|Where-Object{$other.ExpandedScopeIds-ccontains$_}).Count-gt0-or@($expandedPaths|Where-Object{$other.ExpandedPaths.Contains($_)}).Count-gt0){$conflict=$true;break}}
        if(-not$conflict){$selected.Add([pscustomobject]@{Record=$scope;ExpandedScopeIds=$expandedIds;ExpandedPaths=$expandedPaths});if($selected.Count-eq2){break}}
    }
    $required=@($normalized|Where-Object{$_.IndependentExecution-ceq'required'})
    if($required.Count-gt0){foreach($scope in $required){if(@($selected|Where-Object{$_.Record.ScopeId-ceq$scope.ScopeId}).Count-ne1){return [pscustomobject]@{Outcome='BLOCKED';Reason='REQUIRED_INDEPENDENCE_UNAVAILABLE';WorkerCount=0;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='none'}}}}
    if($selected.Count-ne2){return [pscustomobject]@{Outcome='MAIN_SEQUENTIAL';Reason='WORKER_PLAN_NOT_EXACTLY_TWO';WorkerCount=0;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='main_sequential'}}
    if($FanoutAvailability-ceq'unknown'){return [pscustomobject]@{Outcome='BLOCKED';Reason='FANOUT_UNKNOWN';WorkerCount=0;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='none'}}
    if($FanoutAvailability-ceq'unavailable'){
        if($required.Count-gt0){return [pscustomobject]@{Outcome='BLOCKED';Reason='REQUIRED_INDEPENDENCE_UNAVAILABLE';WorkerCount=0;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='none'}}
        return [pscustomobject]@{Outcome='MAIN_SEQUENTIAL';Reason='FANOUT_UNAVAILABLE';WorkerCount=0;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='main_sequential'}
    }
    [pscustomobject]@{Outcome='WORKERS_SELECTED';Reason='TWO_DISJOINT_SCOPES';WorkerCount=2;SelectedScopeIds=@($selected|ForEach-Object{$_.Record.ScopeId});Execution='parallel'}
}

function Get-GovernanceV1VerifyTransition {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][ValidateSet('small','normal','high_risk')][string]$RiskClass,
        [Parameter(Mandatory=$true)][ValidateSet('PASS','FAIL','BLOCKED')][string]$VerifyResult,
        [Parameter(Mandatory=$true)][string]$CandidateWriterAuthority,
        [Parameter(Mandatory=$true)][string]$VerifierAuthority,
        [bool]$ExactCommittedCandidate=$true
    )

    if(-not$ExactCommittedCandidate){return [pscustomobject]@{Outcome='BLOCKED';Next='none';ReleaseAllowed=$false;NewCandidateRequired=$false;NewRequestRequired=$false}}
    if([string]::IsNullOrWhiteSpace($VerifierAuthority)-or$VerifierAuthority-ceq$CandidateWriterAuthority){return [pscustomobject]@{Outcome='BLOCKED';Next='none';ReleaseAllowed=$false;NewCandidateRequired=$false;NewRequestRequired=$false}}
    if($VerifyResult-ceq'PASS'){return [pscustomobject]@{Outcome='PASS';Next='RELEASE_GATE';ReleaseAllowed=$false;NewCandidateRequired=$false;NewRequestRequired=$false}}
    if($VerifyResult-ceq'FAIL'){return [pscustomobject]@{Outcome='FAIL';Next='IMPLEMENTATION';ReleaseAllowed=$false;NewCandidateRequired=$true;NewRequestRequired=$true}}
    [pscustomobject]@{Outcome='BLOCKED';Next='CHATGPT';ReleaseAllowed=$false;NewCandidateRequired=$false;NewRequestRequired=$false}
}

function Resolve-GovernanceV1PublicPhase {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]$Policy,
        [Parameter(Mandatory=$true)][string]$InternalPhase,
        [string]$ImplementationMode='none',
        [string]$OriginPhase='none',
        [string]$OriginImplementationMode='none',
        [object[]]$PhaseExtensions=@()
    )

    $extensions=@{}
    foreach($extension in @($PhaseExtensions)){
        try{$null=Assert-Gv1ExactDictionaryKeys $extension @('Id','PublicPhase','SourceReference') 'phase extension'}catch{return [pscustomobject]@{Outcome='BLOCKED';Reason='PHASE_EXTENSION_INVALID';PublicPhase='none'}}
        $id=[string]$extension.Id;$public=[string]$extension.PublicPhase
        if(-not(Test-Gv1Scalar $id)-or$extensions.ContainsKey($id)-or@($Policy.Lifecycle.InternalPhases)-ccontains$id-or@($Policy.Output.PublicPhases)-cnotcontains$public-or$id-in@('user_decision','blocked')){return [pscustomobject]@{Outcome='BLOCKED';Reason='PHASE_EXTENSION_INVALID';PublicPhase='none'}}
        $extensions[$id]=$public
    }
    function Resolve-Gv1PhaseValue([string]$Phase,[string]$Mode,[bool]$AllowDelegated){
        if($script:gv1PhasePolicy.Lifecycle.PublicPhaseDerivation.Direct.ContainsKey($Phase)){return [pscustomobject]@{Outcome='RESOLVED';Reason='DIRECT';PublicPhase=[string]$script:gv1PhasePolicy.Lifecycle.PublicPhaseDerivation.Direct[$Phase]}}
        if($Phase-ceq'implementation'){
            $values=$script:gv1PhasePolicy.Lifecycle.PublicPhaseDerivation.Discriminated.implementation.Values
            if(-not$values.ContainsKey($Mode)){return [pscustomobject]@{Outcome='BLOCKED';Reason='IMPLEMENTATION_MODE_INVALID';PublicPhase='none'}}
            return [pscustomobject]@{Outcome='RESOLVED';Reason='DISCRIMINATED';PublicPhase=[string]$values[$Mode]}
        }
        if($script:gv1PhaseExtensions.ContainsKey($Phase)){return [pscustomobject]@{Outcome='RESOLVED';Reason='PROJECT_EXTENSION';PublicPhase=[string]$script:gv1PhaseExtensions[$Phase]}}
        if($Phase-in@('user_decision','blocked')){
            if(-not$AllowDelegated-or$script:gv1PhaseOrigin-in@('none','user_decision','blocked')){return [pscustomobject]@{Outcome='BLOCKED';Reason='DELEGATED_ORIGIN_INVALID';PublicPhase='none'}}
            return Resolve-Gv1PhaseValue $script:gv1PhaseOrigin $script:gv1PhaseOriginMode $false
        }
        [pscustomobject]@{Outcome='BLOCKED';Reason='PHASE_UNRESOLVED';PublicPhase='none'}
    }
    $oldPolicy=$script:gv1PhasePolicy;$oldExtensions=$script:gv1PhaseExtensions;$oldOrigin=$script:gv1PhaseOrigin;$oldOriginMode=$script:gv1PhaseOriginMode
    try{$script:gv1PhasePolicy=$Policy;$script:gv1PhaseExtensions=$extensions;$script:gv1PhaseOrigin=$OriginPhase;$script:gv1PhaseOriginMode=$OriginImplementationMode;Resolve-Gv1PhaseValue $InternalPhase $ImplementationMode $true}finally{$script:gv1PhasePolicy=$oldPolicy;$script:gv1PhaseExtensions=$oldExtensions;$script:gv1PhaseOrigin=$oldOrigin;$script:gv1PhaseOriginMode=$oldOriginMode}
}

function ConvertTo-GovernanceV1ChatOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]$Policy,
        [Parameter(Mandatory=$true)]$Values,
        [Parameter(Mandatory=$true)][string]$PromptPayload
    )

    $null=Assert-GovernanceV1Policy $Policy
    if($Values-isnot[Collections.IDictionary]){throw 'governance v1 chat output values must be a mapping'}
    $inlineFields=@($Policy.Output.Fields[0..8]);$null=Assert-Gv1ExactDictionaryKeys $Values $inlineFields 'chat output values'
    $lines=[Collections.Generic.List[string]]::new()
    foreach($field in $inlineFields){
        $value=$Values[$field]
        if($null-eq$value-or[string]::IsNullOrWhiteSpace([string]$value)){$value=[string]$Policy.Output.MissingValue}
        $value=[string]$value
        if($value.Contains("`r")-or$value.Contains("`n")){throw "governance v1 chat output field must be one line: $field"}
        if($field-ceq[regex]::Unescape('\u30d5\u30a7\u30fc\u30ba')-and@($Policy.Output.PublicPhases)-cnotcontains$value){throw 'governance v1 chat output public phase is invalid'}
        if($field-ceq[regex]::Unescape('\u6e21\u3059\u30bb\u30c3\u30b7\u30e7\u30f3')-and@($Policy.Output.SessionValues)-cnotcontains$value){throw 'governance v1 chat output session value is invalid'}
        $lines.Add("$field$($Policy.Output.FieldSuffix)$value")
    }
    if($PromptPayload.Length-gt0-and[int]$PromptPayload[0]-eq0xFEFF){throw 'governance v1 chat output prompt payload has BOM character'}
    if($PromptPayload.Contains("`r")){throw 'governance v1 chat output prompt payload contains CR'}
    $payload=$PromptPayload.TrimEnd("`n")
    if([string]::IsNullOrEmpty($payload)){$payload=[string]$Policy.Output.MissingValue}
    $copyField=[string]$Policy.Output.Fields[9]
    (($lines-join"`n")+"`n${copyField}$($Policy.Output.FieldSuffix)`n$($Policy.Output.CopyPromptMarker)`n${payload}`n")
}

function Assert-GovernanceV1ChatOutput {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Text,[Parameter(Mandatory=$true)]$Policy)

    if($Text.Length-gt0-and[int]$Text[0]-eq0xFEFF){throw 'governance v1 chat output starts with BOM'}
    if($Text.Contains("`r")-or-not$Text.EndsWith("`n")-or$Text.EndsWith("`n`n")){throw 'governance v1 chat output byte shape is invalid'}
    $lines=@($Text.Substring(0,$Text.Length-1).Split("`n"));if($lines.Count-lt11){throw 'governance v1 chat output is incomplete'}
    for($i=0;$i-lt9;$i++){
        $prefix="$($Policy.Output.Fields[$i])$($Policy.Output.FieldSuffix)"
        if(-not$lines[$i].StartsWith($prefix,[StringComparison]::Ordinal)-or$lines[$i].Length-eq$prefix.Length){throw "governance v1 chat output field line is invalid: $($Policy.Output.Fields[$i])"}
    }
    if($lines[9]-cne"$($Policy.Output.Fields[9])$($Policy.Output.FieldSuffix)"){throw 'governance v1 chat output copy-prompt heading is invalid'}
    if($lines[10]-cne[string]$Policy.Output.CopyPromptMarker){throw 'governance v1 chat output marker is invalid'}
    if($lines.Count-eq11-or[string]::IsNullOrEmpty(($lines[11..($lines.Count-1)]-join"`n"))){throw 'governance v1 chat output payload is missing'}
    $true
}

function Assert-GovernanceV1TaskDocument {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Text,[string]$Path='TASK.md')

    $front=[regex]::Match($Text,'\A---\n(?<body>.*?)\n---\n',[Text.RegularExpressions.RegexOptions]::Singleline);if(-not$front.Success){throw "governance v1 TASK frontmatter is missing: $Path"}
    $body=$Text.Substring($front.Length);$headings=@([regex]::Matches($body,'(?m)^## (?<id>[a-z][a-z0-9_]*)$')|ForEach-Object{$_.Groups['id'].Value})
    $null=Assert-Gv1ExactSequence $headings (Get-GovernanceV1Contract).TaskBodySections 'TASK_BODY sections'
    $forbidden=@('baseline_commit','reviewed_candidate','current_phase','risk_class','assigned_model','worker_plan','verify_plan','review_status','progress')
    foreach($key in $forbidden){if($body-match("(?m)^\s*(?:-\s*)?"+[regex]::Escape($key)+":\s*")){throw "governance v1 TASK_BODY repeats current state: $key"}}
    $true
}

function Resolve-GovernanceV1LocalAuthority {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepositoryRoot,[string[]]$RequiredPaths=@('docs/ai/PROJECT_RULES.md','docs/ai/WORKFLOW.md','docs/ai/PROJECT_ADAPTER.psd1','docs/ai/SHARED_RULES.lock.yml'))

    $root=[IO.Path]::GetFullPath($RepositoryRoot);$status=@(& git -C $root status --porcelain=v1 --untracked-files=all 2>$null);if($LASTEXITCODE-ne0-or$status.Count-ne0){throw 'governance v1 startup requires a clean local worktree'}
    foreach($name in @('MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','BISECT_LOG','rebase-merge','rebase-apply')){$gitPath=(& git -C $root rev-parse --git-path $name 2>$null).Trim();if($LASTEXITCODE-ne0-or(Test-Path -LiteralPath $gitPath)){throw "governance v1 startup rejects unfinished Git operation: $name"}}
    $commit=(& git -C $root rev-parse --verify 'HEAD^{commit}' 2>$null).Trim();$tree=(& git -C $root rev-parse --verify 'HEAD^{tree}' 2>$null).Trim();if($commit-notmatch'^[0-9a-f]{40}$'-or$tree-notmatch'^[0-9a-f]{40}$'){throw 'governance v1 startup cannot resolve immutable HEAD'}
    $records=[Collections.Generic.List[object]]::new()
    foreach($path in $RequiredPaths){if(-not(Test-Gv1Path $path)){throw "governance v1 startup path is invalid: $path"};$blob=(& git -C $root rev-parse "$commit`:$path" 2>$null).Trim();if($LASTEXITCODE-ne0-or$blob-notmatch'^[0-9a-f]{40}$'){throw "governance v1 startup required blob is missing: $path"};$records.Add([pscustomobject]@{Path=$path;Commit=$commit;Blob=$blob})}
    [pscustomobject][ordered]@{Commit=$commit;Tree=$tree;Records=@($records)}
}
