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
- implementation_candidate: d83ceb854cf0c9f812d99675c3e9f2e2ae182026
- candidate_commit: d83ceb854cf0c9f812d99675c3e9f2e2ae182026
- candidate_tree: 2621ee0500e4d2ee81654c4b1160325e225f45b6
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
- spec_revision: 2
- review_stage: implementation
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_terminated: false
- review_attempt: 2
- review_profile: standard
- final_review: false

## Assignment / result

- purpose: 2026年給与所得者の人物別手取りを公式一次資料と有効期間付きruleで安全に概算し、家計へ参照連携する
- scope: AppState v3、v1/v2 migration、給与・賞与、所得税、協会けんぽ等employee負担、住民税manual、rule validator、Store、budget link、standalone UI
- out_of_scope: 複数勤務先、給与所得以外、組合健保自動、全国住民税自動、2027年以降、住宅ローン控除、iDeCo上限、deployment、release
- acceptance_criteria: docs/ai/tasks/TASK-004.mdのspec revision 2 Acceptance criteria全件
- forbidden_changes: docs/product/**、generated shared snapshot、main、tag、release、非公式制度値
- tests_and_build: PowerShell 5.1/7 governance and product identity smoke PASS; npm ci/typecheck/lint/format/test/build/test:rules/test:portable PASS; 231 Vitest tests, 60 rule tests, 88 portable browser checks PASS
- browser_evidence: system Edge file:// PASS; age eligibility、employment wage evidence、unsupported link、plan identity、reload、360px、keyboard、console/page errors 0、runtime requests 0
- commit_policy: implementation candidateを変更せずexact reviewする
- stop_conditions: 計算・端数・data preservation・migration・rollback・validator・required test・security・backward compatibility・standalone portability・candidate identityの失敗
- return_to: Codex
- report: docs/ai/reports/TASK-004/IMPLEMENTATION_REPORT.md
- execution_started_at: 2026-08-12 03:35:00 JST
- workflow_run_id: 31529422834
- workflow_head_sha: d83ceb854cf0c9f812d99675c3e9f2e2ae182026
- workflow_conclusion: success
- execution_finished_at: 2026-08-12 04:48:33 JST

## Attempt 1 findings resolved

- FINDING-004-R2-01: health、additional、pension、careの年齢資格を月別rule化し、給与・賞与へ40/65/70/75歳境界を適用した
- FINDING-004-R2-02: 雇用保険autoを月別実賃金根拠へ変更し、年収12等分を廃止した
- FINDING-004-R2-03: iDeCo控除なし／ありの課税所得・基準所得税・復興特別所得税・最終総額を独立再計算した
- FINDING-004-R2-04: active link後の未計算plan更新を保存可能にし、家計側をnull／unresolvedのまま維持した
- FINDING-004-R2-05: unsupported、incomplete、missing-rule、out-of-rangeを分離し、unsupportedConditionsを表示した
- FINDING-004-R2-06: 健康保険50等級・厚生年金32等級の全境界、全標準額、公式source identityを固定検証した
- FINDING-004-R2-07: planへbirthDate／residencePrefectureを保持し、人物プロフィール変更から独立させた

## Primary sources and verification

- 国税庁: 令和8年度税制改正、令和8年分年末調整関係資料、給与所得控除、所得税速算・復興特別所得税
- 全国健康保険協会: 令和7・8年度都道府県別料率、介護保険料率、子ども・子育て支援金率、保険料額表
- 日本年金機構: 厚生年金料率、標準報酬月額、標準賞与額、端数処理
- 厚生労働省: 令和7・8年度雇用保険料率、労働者負担端数処理
- verified_at: 2026-08-12

## Review policy

- attempt 2 uses the standard profile.
- no acceptance criterion is relaxed for attempt 2.
- calculation accuracy, data preservation, rollback, raw-byte portability, validator, required tests, release gates, security, and backward compatibility are never relaxable.
- a failed attempt 3 terminates review without attempt 4.

## Evidence focus

- corrected route bundles were exact-validated at 16329 bytes with SHA-256 B05C87B548AA496188F8BE565CAE29C15709051FDB4BFBACAD4BED0787F866CB and 60C69D9433EE56DCC2BFD7055875C5C4D715478102D451A9D290CE3468AC8206.
- spec revision 2 adoption is isolated in commit 591938617d3d84622fb846e61118b94b26d70ba4; historical spec revision 1 relay evidence remains byte-exact.
- candidate exact workflow 31529422834 succeeded for head SHA d83ceb854cf0c9f812d99675c3e9f2e2ae182026.
- complete→incomplete／unsupported／missing-ruleのlinked plan更新は永続化・通知され、家計値は0円化せずunresolvedになる。
- previous candidate v3、save/load/import、plan profile identity、rule golden／negative、migrationの回帰testを含む231 testsが成功した。
- standalone HTML file launch passed 88 browser checks with console errors 0, page errors 0, and runtime requests 0.
