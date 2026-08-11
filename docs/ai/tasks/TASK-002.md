---
task_id: TASK-002
title: 基盤・横断アーキテクチャスパイク
status: ready
route: TWO_SESSION_FAST
priority: high
spec_revision: 2
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: existing
handoff_file: docs/ai/handoffs/TASK-002/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: optional
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: 530b9708b43fc593ae8571f69b03ba62b91f628d
base_tree: 21aa743bc67fb63ddf9d1b0c3589bba9e92c3a71
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#architecture_*
accepted_product_sha256: 359008B7D3F54AF15B28020EBDD89AD734B361081E5243D0DB6704982B96D72C
updated_at: 2026-08-11
---

# TASK-002 — 基盤・横断アーキテクチャスパイク

## Purpose

実制度値や完成UIの前に、横断アーキテクチャのデータ保全と計算順序をコードと自動テストで証明する

## Scope

- Vite、TypeScript、Vitest、ESLint、Prettierの開発基盤
- 5 routeのhash routingと最小アプリシェル
- 単一Store、StorageRepository、有効期間付きRuleResolver
- 最大2人物State、linked value、資産形成拠出分離、最小計算パイプライン
- transactional export/importとactive TASK非依存governance smoke
- source module分離を維持したstandalone single HTML build
- Windows Chromium系browserによる`file://` portable smoke

## Out of scope

- 実際の税率、保険料率、NISA・iDeCo制度上限
- 完成UI、家計CRUD、グラフ、PWA、cloud同期、login、外部API、deployment、release

## Acceptance criteria

- TASK-002のgovernance正本一式が同期する
- 5 route、Store、Repository、RuleResolver、linked value、contribution分離、import transactionが独立moduleとして成立する
- stale copy、broken linkの0円化、二重計上、rule期間誤選択、import失敗時の破壊を自動テストで防止する
- active TASK branchからproduct identity smokeが成功する
- PowerShell 5.1と7のgovernance検証およびnpm typecheck、lint、format、test、buildが成功する
- candidate exact commitのGitHub Actionsが成功する
- `dist/index.html`単体を別folderへコピーしてダブルクリック相当の`file://`起動ができる
- 5 route、未知route正規化、navigation、戻る／進む、reloadが`file://`で動作する
- same-path localStorageがreload後も保持され、runtime network requestが発生しない

## Tests

- route遷移と未知route正規化
- Store、人物State、不変条件、linked value、contribution分離、RuleResolver、calculation pipeline
- export/import transactionと失敗時不変性
- active TASK product identity smokeとproduct identity拒否境界
- PowerShell 5.1/7、npm typecheck/lint/format/test/build、GitHub Actions
- `npm run test:portable`によるsingle HTML構造、別folder単体copy、system Edge／Chromeでの動的検証

## Build

- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run build
- npm run test:portable

## Rollback

discard the TASK-002 isolated branch and preserve main at the fixed baseline

## Forbidden changes

- generated shared snapshotを直接変更しない
- 実制度値、完成UI、外部runtime CDNを実装しない
- main、tag、release、source branchを変更しない

## Spec revision audit

- spec revision 1のimplementation review attempt 1～3とcandidate evidenceは既存handoff／Git履歴へ保持する。
- ユーザー承認済み仕様変更によりspec revision 2へ移行し、implementation reviewはattempt 1／standardへresetする。
- spec revision 1で受容されたactive link整合性問題は既知事項として保持し、本revisionのportable build scopeでは修正しない。
