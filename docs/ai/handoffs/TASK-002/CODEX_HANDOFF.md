# RELAY HANDOFF — TASK-002

- relay_schema: 2
- task_id: TASK-002
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-002-architecture-spike
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

実制度値や完成UIの前に、横断アーキテクチャのデータ保全と計算順序をコードと自動テストで証明する

## Scope

- Vite、TypeScript、Vitest、ESLint、Prettierの開発基盤
- 5 routeのhash routingと最小アプリシェル
- 単一Store、StorageRepository、有効期間付きRuleResolver
- 最大2人物State、linked value、資産形成拠出分離、最小計算パイプライン
- transactional export/importとactive TASK非依存governance smoke

## Out of scope

- 実際の税率、保険料率、NISA・iDeCo制度上限
- 完成UI、家計CRUD、グラフ、PWA、cloud同期、login、外部API、deployment、release

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- TASK-002のgovernance正本一式が同期する
- 5 route、Store、Repository、RuleResolver、linked value、contribution分離、import transactionが独立moduleとして成立する
- stale copy、broken linkの0円化、二重計上、rule期間誤選択、import失敗時の破壊を自動テストで防止する
- active TASK branchからproduct identity smokeが成功する
- PowerShell 5.1と7のgovernance検証およびnpm typecheck、lint、format、test、buildが成功する
- candidate exact commitのGitHub Actionsが成功する

## Tests

- route遷移と未知route正規化
- Store、人物State、不変条件、linked value、contribution分離、RuleResolver、calculation pipeline
- export/import transactionと失敗時不変性
- active TASK product identity smokeとproduct identity拒否境界
- PowerShell 5.1/7、npm typecheck/lint/format/test/build、GitHub Actions

## Forbidden changes

- docs/product/**とgenerated shared snapshotを変更しない
- 実制度値、完成UI、外部runtime CDNを実装しない
- main、tag、release、source branchを変更しない

Validated full bundle: docs/ai/reports/TASK-002/RELAY_BUNDLE.json
