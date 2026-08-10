---
task_id: TASK-001
title: shared v0.12.20共通AI開発基盤の導入
status: completed
priority: high
risk_level: high
current_phase: completed
assigned_actor: Codex
assigned_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
base_commit: 171a1879416e6454a837c12fd465eb3eab111c35
base_tree: f9f91d1d7cf40d78f401ee3791eb5544b0b30514
branch: codex/task-001-shared-governance-adoption
shared_repository: Osato-Gasu/shared
shared_branch: main
shared_version: 0.12.20
shared_commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
browser_evidence_required: false
database_change_required: false
data_migration_required: false
destructive_data_operation_required: false
---

# TASK-001 共通AI開発基盤の導入

## 1. 目的

`Osato-Gasu/shared`の固定済み共通AI開発基盤をPersonal-Finance-Plannerへ導入し、以後の製品実装をTASK、handoff、candidate固定、review、validationの正本管理下で進められる状態にする。

このTASKでは製品コード、制度計算、Vite環境を実装しない。

## 2. 作業場所

- repository: `Osato-Gasu/Personal-Finance-Planner`
- remote: `https://github.com/Osato-Gasu/Personal-Finance-Planner.git`
- branch: `codex/task-001-shared-governance-adoption`
- product baseline: `171a1879416e6454a837c12fd465eb3eab111c35`
- product baseline tree: `f9f91d1d7cf40d78f401ee3791eb5544b0b30514`
- local root: `C:\Users\owner\Development\personal\Personal-Finance-Planner`
- shared local root: `C:\Users\owner\Development\_shared\ai-development-governance`

指定local root以外を変更しない。既存フォルダが空でなければ、内容とGit状態を確認し、想定外差分があれば破壊的操作をせず`BLOCKED`とする。

## 3. shared固定値

- repository: `Osato-Gasu/shared`
- branch: `main`
- version: `0.12.20`
- commit: `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`

floating `main`の内容をそのまま採用せず、上記commitへcheckoutして検証する。shared worktreeはstaged、unstaged、untrackedを含めcleanでなければならない。

## 4. 対象

1. project repositoryのcloneまたは既存cloneの安全な確認。
2. 指定branchのcheckout。
3. shared repositoryのcloneまたは既存clone確認と固定commit checkout。
4. shared validator実行。
5. `sync-project.ps1`によるgenerated snapshotとlock生成。
6. Personal-Finance-Planner用project adapterとoverlayの作成。
7. `AGENTS.md`、CURRENT_STATE、BACKLOG、DECISIONS、WORKFLOW、SESSION_START、NEXT_ACTION、permanent PROJECT_REQUIREMENTS handoffの初期化。
8. project validator、Progress generator wrapper、governance CIの導入。
9. shared `-Check`、project validator、CI相当コマンドの実行。
10. commitとremote branchへのpush。

## 5. project固有設定

### 5.1 role

- ChatGPT: `ORCHESTRATOR_AND_REVIEWER`
- Codex: `IMPLEMENTER`
- Claude: `INDEPENDENT_REVIEWER`
- user: `USER`

### 5.2 TaskHistory

新規projectのため次を採用する。

```powershell
TaskHistory = @{
    CompletedTaskFilePolicy = 'git_only'
    RetainedTaskStates = @()
}
```

### 5.3 model routing

最低限次をassignmentとして許可する。

```text
Codex|IMPLEMENTER|5.6 Sol|medium
Codex|IMPLEMENTER|5.6 Sol|high
ChatGPT|ORCHESTRATOR_AND_REVIEWER|5.6 Sol-Pro|Pro
ChatGPT|INDEPENDENT_REVIEWER|5.6 Sol-Pro|Pro
USER|USER|none|none
```

Claudeはsharedの独立review executorとして優先し、利用不能時だけshared契約上許可されたChatGPT fallbackを使う。

### 5.4 BACKLOG列

次の順序で定義する。

| Key | Header | Type |
|---|---|---|
| id | ID | id |
| priority | 優先度 | map |
| status | 状態 | map |
| risk | リスク | map |
| phase | フェーズ | map |
| title | タイトル | text |
| dependency | 依存 | text |
| next_step | 次の作業 | text |

初期BACKLOGには`docs/product/DELIVERY_PLAN.md`のTASK-002以降を候補として登録するが、製品実装へ着手しない。

### 5.5 project overlay

少なくとも次をproject固有条件として維持する。

- `docs/product/`が製品要件・設計正本。
- 金額計算、rule期間、二重計上防止、データ保全は緩和不可。
- 実装reviewは最大3回。
- 2回不通過後の第3回だけ非必須UI・文言・任意最適化を限定緩和可能。
- 第3回不通過時はreviewを打ち切り`NEEDS_USER_DECISION`へ移す。
- product code、rule data、packageをTASK-001では変更しない。
- generated shared snapshotは直接編集禁止。

## 6. 許可変更範囲

- `.github/workflows/ci.yml`
- `AGENTS.md`
- `board/PROGRESS.html`
- `docs/ai/**`
- `tools/**`
- `docs/bootstrap/**`は必要なTASK状態更新だけ

次をbaselineから変更しない。

- `README.md`
- `.gitattributes`
- `.gitignore`
- `docs/product/**`

## 7. 対象外

- `package.json`、Vite、TypeScript、src、testsの作成
- 家計、手取り、NISA、iDeCoの実装
- 税率・保険料率・制度上限データの追加
- design v0.2の変更
- deployment
- main merge
- tag、release
- shared repository自体の変更
- reset、stash、clean、restoreによるユーザー差分の消去
- force push

## 8. 受入条件

1. local rootが指定repositoryのcloneであり、remoteがexact一致する。
2. branchが`codex/task-001-shared-governance-adoption`である。
3. product baseline commit・treeがbranchのancestorとして確認できる。
4. shared version・commitが指定値とexact一致する。
5. shared sourceがcleanで`validate-shared.ps1`に成功する。
6. `docs/ai/generated/shared/`と`SHARED_RULES.lock.yml`がsync toolから生成される。
7. lockのrepository、version、commit、manifest SHAが生成元と一致する。
8. generated snapshotを直接編集していない。
9. `AGENTS.md`がgenerated `START.md`を入口として参照する。
10. `PROJECT_ADAPTER.psd1`がrepository identity、role、model、BACKLOG、TaskHistory、review方針を表現する。
11. zero-active時もpermanent PROJECT_REQUIREMENTS handoffへrouteできる。
12. project validatorがshared snapshot checkとoverlay checkを両方実行する。
13. CIが少なくともgovernance validationを実行する。
14. `docs/product/**`、README、gitattributes、gitignoreがbaselineからbyte-exact不変である。
15. product source、package、rule dataを追加していない。
16. validationが成功する。
17. worktreeがcleanになるよう意図した変更だけをcommitする。
18. commitを指定remote branchへpushする。
19. main、tag、releaseを変更しない。
20. 最終報告にbranch、baseline、commit、tree、shared lock identity、変更ファイル、検証結果、残課題を含める。

## 9. 失敗時

以下は推測で進めず`BLOCKED`とする。

- local rootに想定外ファイル・差分がある。
- remoteまたはbaselineが一致しない。
- shared固定commitを取得できない。
- shared sourceがcleanでない。
- syncまたはvalidatorが失敗する。
- generated契約とproject overlayが両立しない。

`reset`、`stash`、`clean`、`restore`、force pushは行わない。
