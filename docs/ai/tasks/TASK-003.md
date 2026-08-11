---
task_id: TASK-003
title: 家計・生活費MVP
status: review_requested
route: TWO_SESSION_FAST
priority: high
spec_revision: 1
spec_status: accepted
current_phase: implementation_review
current_role_id: ORCHESTRATOR_AND_REVIEWER
next_actor: ChatGPT
next_role: ORCHESTRATOR_AND_REVIEWER
assigned_model: 5.6 Sol-Pro
assigned_effort: Pro
session_mode: existing
handoff_file: docs/ai/handoffs/TASK-003/IMPLEMENTATION_REVIEW_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: Codex
browser_evidence_required: true
claude_design_review_recommendation: optional
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: 288f49ccaebc62040ad797126f2d5eabb4d89555
base_tree: fcb3c24f7718abc6e6b8d559bd0456b37b37715a
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
implementation_candidate: 932fad6f46b2c1aea8dace9d448bacaf826c0f0f
review_stage: implementation
changes_requested_cycles: 1
implementation_review_attempt: 2
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
review_kind: implementation
review_role: ORCHESTRATOR_AND_REVIEWER
execution_mode: separate_session
repository_access: true
review_status: requested
request_review_status: requested
review_model: 5.6 Sol-Pro
review_effort: Pro
reviewed_candidate: 932fad6f46b2c1aea8dace9d448bacaf826c0f0f
reviewed_spec_revision: 1
review_request_id: none
review_started_at: none
review_completed_at: none
review_result: none
review_findings_count: 0
review_finding_ids: none
actual_executor: ChatGPT
provider_substitution: none

updated_at: 2026-08-11
---

# TASK-003 — 家計・生活費MVP

## Purpose

本人と同棲相手の手取り、生活費の平準化、3階層負担割合、詳細・簡易集計を安全に保存できる家計・生活費MVPを提供する。

## Scope

- AppState schema version 2とschema version 1からの非破壊migration
- active income linkの参照・人物・一意性検証
- 世帯・手取り設定、category CRUD、living expense CRUD
- 日・週・月・年の費用平準化と3階層負担割合
- 詳細・簡易集計、世帯・人物・category別月額summary
- responsiveかつkeyboard対応のbudget UI
- standalone file browser操作scenarioとruntime network request 0

## Out of scope

- 実際の税・社会保険計算と実制度値
- NISA・iDeCo完成実装、銀行等連携、cloud同期、login
- 3人以上の世帯、高度なgraph、receipt、支払履歴、通知
- deployment、tag、release

## Acceptance criteria

- TASK-003 governance正本一式が同期する
- schema v1を損失なくv2へmigrationし、失敗時にStateと永続化bytesを維持する
- active linkのsource・target・人物・組合せ・一意性を保存、load、import、migration前に検証する
- categoryと費目のCRUD、並び替え、無効化、検索、filter、sortが機能する
- 日・週・月・年の平準化、割合優先順位、人物別合計整合が正しい
- 詳細・簡易mode切替で双方のデータを維持する
- 世帯・本人・相手の手取り、支出、手残りと未計算状態を表示する
- 360px幅とkeyboard操作に対応する
- standalone HTML単体のfile起動、reload、localStorage、runtime request 0を実browserで検証する
- PowerShell 5.1/7、npm gates、candidate exact GitHub Actionsが成功する

## Tests

- budget normalization、share allocation、detailed/simple summaryのdomain境界
- schema v2 invariant、category/expense/store actionと無効action副作用なし
- v1/v2 repository load、migration、import transaction、active link拒否
- 実browserでbudget入力・CRUD・mode切替・reload・portable single HTMLを操作
- PowerShell 5.1/7 governanceとproduct identity smoke
- npm typecheck、lint、format:check、test、build、test:portable

## Build

- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run build
- npm run test:portable

## Rollback

discard the isolated TASK-003 branch and preserve main at the fixed baseline

## Forbidden changes

- main、tag、release、既存branchを変更しない
- generated shared snapshotとdocs/productを直接変更しない
- 実制度値、runtime CDN、外部API、distを追加しない
- test削除、skip、成功条件弱体化を行わない
- approved task scope外のrefactorを行わない
