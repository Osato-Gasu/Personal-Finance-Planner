# IMPLEMENTATION REVIEW HANDOFF — TASK-006

## Identity

- task_id: TASK-006
- feature: iDeCoベータ
- phase: implementation_review
- status: review_requested
- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- model: 5.6 Sol
- effort: high
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-006-ideco-beta
- baseline_commit: b8f4c27544534c8ed00a92493307ac37ed7649d3
- baseline_tree: 900ba8cff38ed6969f7bef8d79dacdfab05a67ca
- baseline_workflow_run_id: 31634237954
- activation_commit: f2946f046b4a6e63596ad0cf87ba9f0439faf9eb
- activation_tree: 530477b61e3a43bcd08ed2925cf8f0b6d3d87176
- activation_workflow_run_id: 31637865222
- implementation_candidate: a5d28e3f9e1518743f6daa940bba684f6fb00b76
- candidate_commit: a5d28e3f9e1518743f6daa940bba684f6fb00b76
- candidate_tree: a6ffd49e65cbf15a33467710c1ca61000bf7be5d
- candidate_workflow_run_id: 31641150795
- candidate_workflow_conclusion: success
- shared_version: 0.12.20
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- shared_manifest_sha256: 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- spec_revision: 1
- review_stage: implementation
- changes_requested_cycles: 0
- implementation_review_attempt: 1
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false
- attempt_4_forbidden: false
- review_attempt: 1
- review_profile: standard
- final_review: false

## Assignment / result

- purpose: iDeCoの制度上限、掛金、AppState v5、手取り参照連携、税年払込snapshot、将来試算を公式一次資料と既存scenario正本に基づき安全に実装する
- scope: src/rules/jp/ideco、iDeCo domain/state/migration/storage、take-home linked source、investments UI、focused/portable tests、CI gate
- out_of_scope: 受取税額、住民税自動計算、年単位拠出、iDeCo+、商品・金融機関推奨、2027年以降の税社会保険rule、TASK-007統合、main merge、tag、release
- acceptance_criteria: docs/ai/tasks/TASK-006.mdのAcceptance criteria全件
- tests_and_build: PowerShell 7/5.1 governance、product identity smoke、audit validator、21-check normalization PASS。npm ci/typecheck/lint/format/test/test:rules/test:nisa/test:ideco/build/test:portable PASS
- test_counts: 394 Vitest、69 take-home focused、68 NISA focused、79 iDeCo focused、208 portable browser checks
- browser_evidence: Edge file:// standalone suite 208 checks PASS、runtime requests 0、console errors 0、page errors 0
- state_and_migration: AppState v5、v1-v4 deterministic migration、v4 manual annualIdecoContributionYen business value preservation、transactional import rollback
- rule_boundary: current jp-ideco-2024-12-01 through 2026-11-30; scheduled jp-ideco-2026-12-01 from 2026-12-01; category1-5 matrix、5000円 minimum、1000円 unitを検証
- unsupported_boundary: annual-unit contribution、iDeCo+、matching contribution非加入条件を明示的unsupportedとして0円補完しない
- tax_link: actual payment-month snapshotsを所得控除正本とし、linked take-homeはplan参照から毎回導出、resident tax benefitはuncomputed
- projection: shared InvestmentScenario、beginning/end timing、annual/fixed fee、inflation、principal/gain分離、non-finite/overflow safetyを検証
- preservation: docs/product/**、generated shared、AUDIT_IDENTITIES、audit tools、NISA statutory source/testはcandidateで不変
- official_sources: 厚生労省iDeCo概要・2025年制度改正・国民年金基金令等改正通知、iDeCo公式加入資格・library、国税庁No.1135を2026-08-13取得・検証
- commit_policy: candidate a5d28e3f9e1518743f6daa940bba684f6fb00b76を変更せずexact reviewする
- stop_conditions: 制度値、対象年月、加入区分、掛金境界、data preservation、migration、linked source、税計算、validator、required test、portability、candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-006/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-13 05:18:39 JST
- execution_finished_at: 2026-08-13 06:16:19 JST

## Review policy

- attempt 1 uses the standard profile; no requirement is relaxed.
- If attempt 1 does not pass, attempt 2 remains standard. Only attempt 3 may use the relaxed final profile, and no attempt 4 may be created.
- statutory calculation, date/person scope, data preservation, migration, rollback, raw-byte portability, validator, required tests, security, compatibility, and candidate identity are never relaxable.
