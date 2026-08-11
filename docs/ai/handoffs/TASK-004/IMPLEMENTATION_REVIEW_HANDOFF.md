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
- implementation_candidate: 0f7ae95e296caa741ab3fdde03b9180c3bea122e
- candidate_commit: 0f7ae95e296caa741ab3fdde03b9180c3bea122e
- candidate_tree: e139244d9cd538e3177dc35c176fa161910f12ee
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
- spec_revision: 2
- review_stage: implementation
- changes_requested_cycles: 2
- implementation_review_attempt: 3
- implementation_review_profile: relaxed
- implementation_review_terminated: false
- review_attempt: 3
- review_profile: relaxed
- final_review: true

## Assignment / result

- purpose: 2026年給与所得者の人物別手取りを公式一次資料と有効期間付きruleで安全に概算し、家計へ参照連携する
- scope: AppState v3、v1/v2 migration、給与・賞与、所得税、協会けんぽ等employee負担、住民税manual、rule validator、Store、budget link、standalone UI
- out_of_scope: 複数勤務先、給与所得以外、組合健保自動、全国住民税自動、2027年以降、住宅ローン控除、iDeCo上限、deployment、release
- acceptance_criteria: docs/ai/tasks/TASK-004.mdのspec revision 2 Acceptance criteria全件
- forbidden_changes: docs/product/**、generated shared snapshot、main、tag、release、非公式制度値
- tests_and_build: PowerShell 5.1/7 governance and product identity smoke PASS; npm ci/typecheck/lint/format/test/build/test:rules/test:portable PASS; 237 Vitest tests, 60 rule tests, 112 portable browser checks PASS
- browser_evidence: system Edge file:// PASS; 65/75歳移行、月別賃金null/明示0円、必須結果、manual→auto、reload、360px、keyboard、console/page errors 0、runtime requests 0
- commit_policy: implementation candidateを変更せずexact reviewする
- stop_conditions: 計算・端数・data preservation・migration・rollback・validator・required test・security・backward compatibility・standalone portability・candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-004/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-12 05:53:51 JST
- workflow_run_id: 31536781347
- workflow_head_sha: 0f7ae95e296caa741ab3fdde03b9180c3bea122e
- workflow_conclusion: success
- execution_finished_at: 2026-08-12 06:15:13 JST

## Attempt 2 findings resolved

- FINDING-004-R2-08: 基準所得税、floorによる復興特別所得税、丸め前合計、100円未満切捨て後総額を分離した
- FINDING-004-R2-09: 2026年中の65／75歳移行をmanual補完なしではunsupportedとし、家計linkを未計算にした
- FINDING-004-R2-10: 月別雇用保険対象賃金をnumber|nullで保持し、12か月明示前はincompleteにした
- FINDING-004-R2-11: その他法定控除、法定控除合計、控除率、iDeCo比較を表示し、auto modeでもその他法定控除を編集可能にした

## Primary sources and verification

- 国税庁: 令和8年度税制改正、令和8年分年末調整関係資料、給与所得控除、所得税速算・復興特別所得税
- 全国健康保険協会: 令和7・8年度都道府県別料率、介護保険料率、子ども・子育て支援金率、保険料額表
- 日本年金機構: 厚生年金料率、標準報酬月額、標準賞与額、端数処理
- 厚生労働省: 令和7・8年度雇用保険料率、労働者負担端数処理
- verified_at: 2026-08-12

## Review policy

- attempt 3 uses the relaxed final profile.
- only non-required UI, wording, and optional optimization may be relaxed.
- calculation accuracy, data preservation, rollback, raw-byte portability, validator, required tests, release gates, security, and backward compatibility are never relaxable.
- this is the final review; failure terminates review without attempt 4.

## Evidence focus

- corrected route bundles were exact-validated at 16329 bytes with SHA-256 B05C87B548AA496188F8BE565CAE29C15709051FDB4BFBACAD4BED0787F866CB and 60C69D9433EE56DCC2BFD7055875C5C4D715478102D451A9D290CE3468AC8206.
- spec revision 2 adoption is isolated in commit 591938617d3d84622fb846e61118b94b26d70ba4; historical spec revision 1 relay evidence remains byte-exact.
- candidate exact workflow 31536781347 succeeded for head SHA 0f7ae95e296caa741ab3fdde03b9180c3bea122e.
- 6,000,000円goldenは基準所得税236,500円、復興特別所得税4,966円、丸め前241,466円、最終241,400円を固定する。
- 65／75歳移行、月別賃金null／明示0円、save／reload／import、家計unresolvedを含む237 testsが成功した。
- standalone HTML file launch passed 112 browser checks with console errors 0, page errors 0, and runtime requests 0.
