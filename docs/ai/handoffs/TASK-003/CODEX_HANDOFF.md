# RELAY HANDOFF — TASK-003

- relay_schema: 2
- task_id: TASK-003
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-003-budget-mvp
- reviewed_candidate: none
- candidate_commit: none
- reviewed_handoff_head: none
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: legacy_unspecified
- review_stage: implementation

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

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

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

## Forbidden changes

- main、tag、release、既存branchを変更しない
- generated shared snapshotとdocs/productを直接変更しない
- 実制度値、runtime CDN、外部API、distを追加しない
- test削除、skip、成功条件弱体化を行わない
- approved task scope外のrefactorを行わない

Validated full bundle: docs/ai/reports/TASK-003/RELAY_BUNDLE.json
