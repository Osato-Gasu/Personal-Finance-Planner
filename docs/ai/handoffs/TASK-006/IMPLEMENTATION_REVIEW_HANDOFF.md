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
- implementation_candidate: 2d72860abfa342ee800b183ec5dbc8bb4be51c3b
- candidate_commit: 2d72860abfa342ee800b183ec5dbc8bb4be51c3b
- candidate_tree: fe16d3e402da524863c2a5fde7ce3b2da82dbd82
- candidate_workflow_run_id: 31647525559
- candidate_workflow_conclusion: success
- shared_version: 0.12.20
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- shared_manifest_sha256: 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- spec_revision: 1
- review_stage: implementation
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false
- attempt_4_forbidden: false
- review_attempt: 2
- review_profile: standard
- final_review: false

## Assignment / result

- purpose: attempt 1の3件の非緩和findingを解消したTASK-006 candidateをattempt 2／standardでexact reviewする
- scope: inactive linked iDeCo source、明示的税計算基準日と払込snapshot境界、out-of-range no-fallback、focused/portable回帰test
- out_of_scope: 受取税額、住民税自動計算、年単位拠出、iDeCo+、商品・金融機関推奨、2027年以降の税社会保険rule、TASK-007統合、main merge、tag、release
- acceptance_criteria: docs/ai/tasks/TASK-006.mdのAcceptance criteria全件
- tests_and_build: PowerShell 7/5.1 governance、product identity smoke、audit validator、21-check normalization PASS。npm ci/typecheck/lint/format/test/test:rules/test:nisa/test:ideco/build/test:portable PASS
- test_counts: 401 Vitest、69 take-home focused、68 NISA focused、86 iDeCo focused、217 portable browser checks
- browser_evidence: Edge file:// standalone suite 217 checks PASS、runtime requests 0、console errors 0、page errors 0
- state_and_migration: AppState v5、v1-v4 deterministic migration、v4 manual annualIdecoContributionYen business value preservation、transactional import rollback
- rule_boundary: current jp-ideco-2024-12-01 through 2026-11-30; scheduled jp-ideco-2026-12-01 from 2026-12-01; category1-5 matrix、5000円 minimum、1000円 unitを検証
- unsupported_boundary: annual-unit contribution、iDeCo+、matching contribution非加入条件を明示的unsupportedとして0円補完しない
- tax_link: inactive planはlinked take-homeをincomplete/uncomputedにしmanual/0へfallbackせず、plan/link/manual値を保持して再active化時に再計算する
- temporal_boundary: pure domainへ明示的referenceDate/taxYearを渡し、26日の払込境界、未来snapshot拒否、過去実績欠落incomplete、未来分だけの加算、12月掛金の翌年1月払込を検証する
- out_of_range: linked IdecoPlanのout-of-rangeで所得税結果をnullに保ちmanual/0 fallback、linked値copy、State/storage mutationを行わない
- projection: shared InvestmentScenario、beginning/end timing、annual/fixed fee、inflation、principal/gain分離、non-finite/overflow safetyを検証
- preservation: docs/product/**、generated shared、AUDIT_IDENTITIES、audit tools、NISA statutory source/testはcandidateで不変
- official_sources: 厚生労省iDeCo概要・2025年制度改正・国民年金基金令等改正通知、iDeCo公式加入資格・library、国税庁No.1135を2026-08-13取得・検証
- commit_policy: candidate 2d72860abfa342ee800b183ec5dbc8bb4be51c3bを変更せずexact reviewする
- stop_conditions: 制度値、対象年月、加入区分、掛金境界、data preservation、migration、linked source、税計算、validator、required test、portability、candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-006/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-13 06:56:19 JST
- execution_finished_at: 2026-08-13 07:43:46 JST

## Review policy

- attempt 2 uses the standard profile; no requirement is relaxed.
- If attempt 2 does not pass, attempt 3 uses the relaxed final profile, and no attempt 4 may be created.
- statutory calculation, date/person scope, data preservation, migration, rollback, raw-byte portability, validator, required tests, security, compatibility, and candidate identity are never relaxable.
