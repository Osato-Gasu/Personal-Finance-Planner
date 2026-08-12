# IMPLEMENTATION REPORT — TASK-006

- task_id: TASK-006
- spec_revision: 1
- phase: implementation
- status: review_requested
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
- product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
- product_requirements_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
- product_architecture_sha256: 359008B7D3F54AF15B28020EBDD89AD734B361081E5243D0DB6704982B96D72C
- product_data_model_sha256: 997523E35C6E5B0543EB68C4DB89F3AA89AB4F554D02906848EE5C2B722FF0BD
- product_calculations_sha256: EF8A00706929FF14EA2C3DA7AD686D9D1E92EF71E50583A05C96919B81090E66
- product_rule_governance_sha256: B120F1B4A2E25B83127A0E442AA52143C925F77DA9DE15EC66E86786D6EC0B54
- product_review_policy_sha256: FF39B3AAD7417FAE6B33041A280D5D822CDE303D0C6003E9F8D0E0A97EDE25C2
- product_delivery_plan_sha256: C6CE22049E991F2957B0A44F51AADC43C66173170CAA2128A002A723194D4D65
- changed_files: .github/workflows/ci.yml; package.json; src/app/app.ts; src/data/storage-repository.ts; src/domain/budget.ts; src/domain/ideco.ts; src/domain/linked-value.ts; src/domain/migration.ts; src/domain/state.ts; src/domain/take-home-calculator.ts; src/domain/take-home-linked-calculator.ts; src/domain/take-home-plan.ts; src/modules/budget/budget-view.ts; src/modules/investments/ideco-view.ts; src/modules/investments/investments-view.ts; src/modules/take-home/take-home-view.ts; src/rules/jp/ideco/rules.ts; tests/fixtures/state.ts; tests/ideco-rules.test.ts; tests/ideco-state.test.ts; tests/migration-repository.test.ts; tests/nisa-state.test.ts; tests/schema-v3.test.ts; tests/storage-repository.test.ts; tools/test-portable-build.mjs
- validation_result: PowerShell 7/5.1 governance、product identity smoke、audit validator、normalization test PASS。npm ci/typecheck/lint/format/test/test:rules/test:nisa/test:ideco/build/test:portable PASS
- tests_passed: 401 Vitest tests; 69 focused take-home rule tests; 68 focused NISA tests; 86 focused iDeCo tests; 217 portable browser checks
- tests_failed: none
- browser_evidence: Edge file:// standalone suite passed 217 checks
- network: runtime_requests_0; console_errors_0; page_errors_0
- audit_identity: current F56B8FE68C7CBEF3768CF492476DE1E9C17FFF04A719A305D5C760FF487AF5A3 / 34370 bytes / blob d42192e7534ca5e2dced23955743a5815fec6c38; historical 0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E / 34723 bytes / blob 0f60e90764e81d4e7b02efa62c8a8900305d025b
- audit_checks: 21 source-binding normalization checks PASS on PowerShell 7 and 5.1
- nisa_regression: 68 focused tests PASS; src/domain/nisa.ts and src/rules/jp/nisa/rules-2024.ts statutory behavior unchanged
- unresolved: none
- worktree: clean_candidate
- main_state: origin/main remains b8f4c27544534c8ed00a92493307ac37ed7649d3 / tree 900ba8cff38ed6969f7bef8d79dacdfab05a67ca
- release_state: no_main_merge; no_tag; no_release
- actual_executor: Codex
- provider_substitution: none
- review_role: ORCHESTRATOR_AND_REVIEWER
- execution_mode: separate_session
- repository_access: true
- review_status: requested
- request_review_status: requested
- review_model: 5.6 Sol
- review_effort: high
- reviewed_candidate: 2d72860abfa342ee800b183ec5dbc8bb4be51c3b
- reviewed_spec_revision: 1
- review_request_id: none
- review_started_at: none
- review_completed_at: none
- review_result: none
- review_findings_count: 0
- review_finding_ids: none
- review_stage: implementation
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false
- attempt_4_forbidden: false
- execution_started_at: 2026-08-13 06:56:19 JST
- execution_finished_at: 2026-08-13 07:43:46 JST

## Rule and source evidence

- current rule `jp-ideco-2024-12-01` is current from 2024-12-01 through 2026-11-30. It covers category1/category4 68000円 residual, category2 no pension 23000円, category2 pension min(20000円, 55000円 residual), category3 23000円, and category5 unsupported.
- scheduled rule `jp-ideco-2026-12-01` starts exactly 2026-12-01 without early application. It covers category1/category4 75000円 residual, category2 no pension 62000円, category2 pension 62000円 residual, category3 23000円, and confirmed category5 62000円 or pension-residual.
- Both packages require a 5000円 minimum and 1000円 unit. null, explicit zero, 4999, 5000, 5001, 6000, allowed-1, allowed exact, allowed+1, and residual below minimum are tested without clamping.
- Official sources retrieved and verified on 2026-08-13: 厚生労働省「iDeCoの概要」 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/kyoshutsu/ideco.html ; 厚生労働省「2025年の制度改正」 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/kyoshutsu/2025kaisei.html ; 厚生労働省「国民年金基金令等改正通知」 https://www.mhlw.go.jp/web/t_doc?dataId=00tc9646&dataType=1&pageNo=1 ; iDeCo公式「加入資格」 https://www.ideco-koushiki.jp/start/entry.html ; iDeCo公式「ライブラリ」 https://www.ideco-koushiki.jp/library/ ; 国税庁「No.1135 小規模企業共済等掛金控除」 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1135.htm .
- participant category unconfirmed、required context null、matching contribution non-eligibility、iDeCo+、annual-unit contribution are distinguished as incomplete or unsupported and never completed with an inferred zero.

## State, tax-link, and projection evidence

- FINDING-006-R1-01: inactive linked IdecoPlanはtake-homeをincomplete/uncomputedにし、manual/0 fallbackを行わない。plan/link/manual値を保持し、新規UI候補から除外し、再active化で再計算するunit/portable testを追加した。
- FINDING-006-R1-02: 2026-08固定値を除去し、pure domainへ明示的referenceDate/taxYearを渡す。26日払込境界、未来snapshot拒否、過去払込欠落incomplete、futureのみ加算、payment-month/tax-year年末年始を決定的に検証した。
- FINDING-006-R1-03: linked IdecoPlanのout-of-rangeでincome tax結果null、manual/0 fallbackなし、linked値copyなし、State/storage bytes不変をfocused testで固定した。

- AppState schemaVersion 5 adds per-member IdecoPlan while keeping existing household, take-home, budget, NISA, and scenario data. v1-v4 imports migrate deterministically; v4 annualIdecoContributionYen remains byte-equivalent as manual business value with linkedIdecoPlanId null.
- Preview imports and failed commits leave State/storage bytes unchanged. Duplicate plans, missing members, active duplicates, scenario/member mismatch, broken take-home links, invalid snapshots, unsafe money, malformed structures, and prototype pollution are rejected before write with writer/listener side effects zero.
- taxContributionSnapshots separate contribution months from the following payment month, prevent overlap/double count, and keep missing past payment evidence incomplete. Linked take-home values are derived from the same-member IdecoPlan on every calculation and are never copied or silently replaced by manual/zero values.
- Income-tax benefit is calculated by the existing before/after income-tax engine. Resident-tax benefit, total benefit, and effective annual cost remain null/uncomputed rather than using a fixed rate.
- Projection reuses InvestmentScenario and distinguishes balance, principal, gain/loss, annual fee, explicit fixed monthly fee, beginning/end timing, and real value. NaN、Infinity、non-finite factors、unsafe integer overflow become out-of-range or pre-write rejection.
