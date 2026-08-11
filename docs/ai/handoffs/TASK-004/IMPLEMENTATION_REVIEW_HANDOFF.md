# IMPLEMENTATION REVIEW HANDOFF — TASK-004

## Identity

- task_id: TASK-004
- feature: 手取り計算ベータ
- phase: implementation_review
- status: review_requested
- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- model: 5.6 Sol
- effort: high
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-004-take-home-beta
- baseline_commit: bfb64e6cc6edf5e2e6a1fd43bff670db2e3de054
- baseline_tree: c375ef6c3b817fa1b733ebb7010ff03e365dbdfc
- implementation_candidate: 106868ea12ebd6766cfa89499e6b12f9b341e08e
- candidate_commit: 106868ea12ebd6766cfa89499e6b12f9b341e08e
- candidate_tree: 560dcd7b6f6bd0a36bc88a02198fcc6457c8e052
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
- spec_revision: 1
- review_stage: implementation
- changes_requested_cycles: 0
- implementation_review_attempt: 1
- implementation_review_profile: standard
- implementation_review_terminated: false
- review_attempt: 1
- review_profile: standard
- final_review: false

## Assignment / result

- purpose: 2026年の給与所得者向け手取り概算を公式一次資料の固定ruleで算出し、家計へ参照連携する
- scope: AppState v3、v1/v2 migration、給与・賞与、所得税、協会けんぽ等employee負担、住民税manual、rule validator、Store、budget link、standalone UI
- out_of_scope: 複数勤務先、給与所得以外、組合健保自動、全国住民税自動、2027年以降、住宅ローン控除、iDeCo上限、deployment、release
- acceptance_criteria: TASK-004.mdの全Acceptance criteria
- forbidden_changes: docs/product/**、generated shared snapshot、main、tag、release、非公式制度値
- tests_and_build: PowerShell 5.1/7 governance and product identity smoke PASS; npm typecheck/lint/format/test/build/test:rules/test:portable PASS; 207 Vitest tests, 44 rule tests, 78 portable browser checks PASS
- browser_evidence: system Edge file:// PASS; 2026計算／賞与／live budget link／reload／360px／keyboard、runtime requests 0
- commit_policy: implementation candidateを変更せずexact reviewする
- stop_conditions: 計算・端数・data preservation・migration・rollback・validator・required test・security・backward compatibility・standalone portability・candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-004/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-12 01:14:00 JST
- workflow_run_id: 31514623846
- workflow_head_sha: 106868ea12ebd6766cfa89499e6b12f9b341e08e
- workflow_conclusion: success
- execution_finished_at: 2026-08-12 01:54:50 JST

## Architecture modules

- src/domain/state.ts
- src/domain/migration.ts
- src/domain/take-home-plan.ts
- src/domain/take-home-calculator.ts
- src/domain/linked-value.ts
- src/data/storage-repository.ts
- src/rules/jp/take-home/metadata.ts
- src/rules/jp/take-home/income-tax/rules-2026.ts
- src/rules/jp/take-home/social-insurance/rules-2026.ts
- src/rules/jp/take-home/validator.ts
- src/modules/take-home/take-home-view.ts
- tools/test-portable-build.mjs

## Primary sources and verification

- 国税庁: 令和8年度税制改正、給与所得控除、所得税速算・復興特別所得税
- 全国健康保険協会: 令和7・8年度都道府県別料率、介護保険料率、子ども・子育て支援金率、保険料額表
- 日本年金機構: 厚生年金料率・標準報酬・標準賞与・端数処理
- 厚生労働省: 令和7・8年度雇用保険料率・労働者負担端数処理
- verified_at: 2026-08-12

## Review policy

- attempt 1 and attempt 2 use the same mandatory standard.
- only attempt 3 after two failures may relax non-required UI, wording, or optional optimization.
- calculation accuracy, data preservation, rollback, raw-byte portability, validator, required tests, release gates, security, and backward compatibility are never relaxable.
- a failed attempt 3 terminates review without attempt 4.

## Evidence focus

- schema v1/v2は旧bytesを残し、plan/source IDとlinkを維持してschema v3へ移行する。corrupt v3から旧keyへfallbackしない。
- TakeHomeResultは永続化せず、plan・member・期間付きruleから純粋導出する。
- 2026年の所得税、復興特別所得税、健康・介護・追加保険料・厚生年金・雇用保険を項目別に計算し、住民税未計算はcompleteにしない。
- 47都道府県と期間連続性をvalidatorで検証し、法定丸めは整数・有理数演算で行う。
- linked valueはcomplete resultだけを人物一致で参照し、plan変更を即時反映してstale copyを作らない。
- standalone HTMLを別folderへコピーしたfile起動で78項目を動的検証し、runtime request 0を確認した。
