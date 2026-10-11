---
schema: 1
id: TASK-022
title: TASK一覧HTML（docs/ai/TASKS.html）の退役（参照を先に外してから消す）
kind: chore
status: READY
mode: standard
risk: normal
owner:
branch:
touches_paths: [".github/workflows/ci.yml", "AGENTS.md", "docs/ai/PROJECT.md", "docs/ai/PROJECT_ADAPTER.psd1", "docs/ai/TASKS.html", "tools/update-task-html.ps1", "tools/test-task-html-contract.ps1", "tools/test-governance-contract.ps1", "tools/test-shared-sync-contract.ps1", "tools/test-shared2-bootstrap-smoke.ps1", "tools/validate-ai-governance.ps1"]
verification: NOT_RUN
runtime: NOT_REQUIRED
ci: NOT_NEEDED
next_action: Codex Cloud が `docs/ai/tasks/TASK-022.md` を読み、AGENTS.md の手順（作業の準備を最初に実行）に従って TASK-022 を始める。実装後は別の実行で検証する（標準）。厳格への昇格はユーザー判断（下の「ユーザー判断」）
shared:
---
## Requirements

背景（ユーザー承認済み 2026-10-11）: Shared 2.x 由来の「TASK一覧HTML」（`docs/ai/TASKS.html`）を、それを参照する CI・テスト・生成ツールを先に外してから、HTML 自体を消す。現在状態の正本は TASK ファイルで、HTML は生成物（RULES §7）。CI は既定でしない方針（RULES §6）。`docs/ai/PROJECT.md` は「`TASKS.html`生成は退役」と書いているが、実態（CI・tools・adapter が現役で参照）と食い違っている。この TASK で実態を PROJECT.md に合わせる。

事前調査の事実（`origin/main` a5e717b。Linux の pwsh 7 で各 tool を単体実行して確認）:
- HTML の参照元（`docs/ai/evidence`・`handoffs`・`shared` を除く）: `ci.yml:47,62`（`tools/test-task-html-contract.ps1`、PowerShell 7／5.1 の 2 回）／`tools/update-task-html.ps1`（生成器）／`tools/test-task-html-contract.ps1`（その試験）／`tools/test-governance-contract.ps1`（`-Check` 呼出し・fixture・CI 断片の検査）／`tools/test-shared-sync-contract.ps1:32,39,114-118`（fixture に HTML を複製し、古い HTML を拒否する試験）／`tools/test-shared2-bootstrap-smoke.ps1:108-119`／`tools/validate-ai-governance.ps1:55,81-83`／`docs/ai/PROJECT_ADAPTER.psd1`（`Paths.TaskHtml`・`Commands.TaskHtmlUpdate/TaskHtmlCheck`・`CI.ExtendedPathGlobs` の 1 行）／`AGENTS.md:8` の言及。`.prettierignore` と `tools/task-dashboard*` はこの repository には無い。`package.json` に HTML 関連の script は無い（**`package.json` は触らない**）。
- 現状の結果（main）: `test-task-html-contract.ps1` は PASS。`test-governance-contract.ps1` は `Generated TASK HTML is stale` で FAIL。`validate-ai-governance.ps1`（TASK-021 が 4.x 形式のため）・`test-shared2-bootstrap-smoke.ps1`（lock が `4.0.0-rc.1`）・`test-shared-sync-contract.ps1`・`test-task020-boundary.ps1`・`validate-audit-identities.ps1` も FAIL（浅い clone 由来のものを含む。HTML とは別の理由）。つまり main の CI は governance 系 step で既に赤い。**これらの 2.x governance 全体の整理は別TASK**（この TASK は HTML に関わる記述だけを外す）。

実施内容（**この順序でコミットを分ける**）:

1. **検査側から HTML 前提を外す**（コミット1）: `tools/validate-ai-governance.ps1`（`update-task-html.ps1` の存在要求、`Paths.TaskHtml` と `Commands.TaskHtml*` の要求）、`tools/test-shared2-bootstrap-smoke.ps1`（HTML の存在・網羅・生成器・adapter コマンドの検査）、`tools/test-shared-sync-contract.ps1`（fixture への HTML／生成器の複製と、"smoke rejects stale TASK HTML" の試験）、`tools/test-governance-contract.ps1`（生成器の呼出し、fixture への生成器複製、adapter fixture の `TaskHtml*`、CI 断片 `tools/test-task-html-contract.ps1`、および起動条件の断片 `branches-ignore:`／`no-ci/**`）から、HTML に関する記述・assertion だけを削除する。それ以外の assertion は変えない。
2. **adapter の行を外す**（コミット2）: `docs/ai/PROJECT_ADAPTER.psd1` の `Paths.TaskHtml`、`Commands.TaskHtmlUpdate`／`TaskHtmlCheck`、`CI.ExtendedPathGlobs` の `docs/ai/TASKS.html` を削除（adapter 全体の退役は別TASK）。
3. **CI を外す**（コミット3）: `.github/workflows/ci.yml` の "Test TASK HTML contract (PowerShell 7)"・"(PowerShell 5.1)" の 2 step を削除し、起動条件を `workflow_dispatch`（`candidate_sha` 入力はそのまま）のみにする（`push`／`pull_request`／`branches-ignore` を外す）。他の step は変えない。`npm run format:check` が `ci.yml` を対象にするため、編集後に Prettier の書式で通ること。
4. **生成器と試験を消す**（コミット4）: `git rm tools/update-task-html.ps1 tools/test-task-html-contract.ps1`。
5. **文書を実態に合わせる**（コミット5）: `AGENTS.md` の「`docs/ai/TASKS.html` など」からファイル名を外す（「生成物や古い表示は止まる理由にならない」の趣旨は残す）。`docs/ai/PROJECT.md` の棚卸し欄の「`TASKS.html`生成」は退役済みの履歴として残し、CI の起動条件が `workflow_dispatch` のみであること、HTML を消した日付を「決定（日付つき）」に 1 行足す。
6. **HTML を消す**（コミット6・最後）: `git rm docs/ai/TASKS.html`。

## Acceptance

- 決定表の全項目に結果（実施した／しなかった＋理由）が「判断した点」か履歴にある。
- `git grep -nIE 'TASKS\.html|update-task-html|task-html|TaskHtml' -- . ':!docs/ai/evidence' ':!docs/ai/handoffs' ':!docs/ai/shared' ':!docs/ai/tasks'` が、`docs/ai/PROJECT.md` の「退役した」旨の履歴的記述以外を返さない（返ったものは全て列挙して理由を書く）。
- `docs/ai/TASKS.html`・`tools/update-task-html.ps1`・`tools/test-task-html-contract.ps1` が存在しない。
- `.github/workflows/ci.yml` の `on:` が `workflow_dispatch`（`candidate_sha`）のみ。YAML として解釈できる。
- 前後比較（各 tool を `origin/main` と変更後で同じ Linux pwsh 7 で実行し、結果表に並べる）: `validate-ai-governance`／`test-governance-contract`／`test-shared2-bootstrap-smoke`／`test-shared-sync-contract`／`test-task020-boundary`／`validate-audit-identities`／`validate-project-overlay`／`test-complete-task-local`／`test-audit-identity-normalization`。**変更後の失敗メッセージに `TASKS.html`／`TaskHtml`／`task-html` が現れない**こと。変更前に PASS だったものは PASS のまま。HTML 起因でなく main で元から失敗するものは「main でも失敗（別理由）」と分けて書き、直さない。全 tool が PowerShell として parse できる。
- 製品の cloud 検証（`npm ci`／`typecheck`／`lint`／`format:check`／`test`／`test:rules`／`test:nisa`／`test:ideco`／`test:overview`／`verify:launcher`）の結果が TASK の前後で同じ。
- 凍結履歴・製品が不変: `git diff --name-only origin/main...HEAD` に `docs/ai/evidence/`・`docs/ai/handoffs/`・旧 `docs/ai/tasks/TASK-020.md`・`docs/product/`・`docs/bootstrap/`・`src/`・`tests/`・`package.json`・`package-lock.json`・`Personal-Finance-Planner.html`・`index.html`・`docs/ai/PRODUCT_IDENTITIES.yml`・`AUDIT_IDENTITIES.json`・`LEGACY_TASK_INVENTORY.json`・`tools/validate-audit-identities.ps1`・`tools/test-audit-identity-normalization.ps1`・`tools/validate-task-001-boundary.ps1` が**含まれない**（出力を報告に貼る）。変更は `tools/test-task020-boundary.ps1` の許可範囲（`AGENTS.md`・`.github/workflows/ci.yml`・`docs/ai/**`・`tools/*.ps1`）に収まる。
- `shared.ps1 check -Root .` がエラー0。`git diff --check` が通る。
- **CI は未実行**（`ci: NOT_NEEDED`）。報告に「CI 未実行」と明記する。
- ユーザー操作は不要。

## 対象外

- 製品（`src/`・`tests/`・`index.html`・`Personal-Finance-Planner.html`・`package.json`・ルール／データ）。**`Personal-Finance-Planner.html` と `index.html` は絶対に触らない**（`docs/ai/TASKS.html` とは別物）。
- `docs/bootstrap/`・`docs/product/`（`tools/test-task020-boundary.ps1` の保護対象）。凍結履歴（`docs/ai/evidence/`・`handoffs/`・`tasks/TASK-020.md`・`CURRENT_STATE.md`・`BACKLOG.md`・`DECISIONS.md`）。
- HTML と無関係な検証 tool（`validate-audit-identities.ps1`・`test-audit-identity-normalization.ps1`・`validate-project-overlay.ps1`・`validate-task-001-boundary.ps1`・`test-task020-boundary.ps1`・`complete-task-local.ps1`・`test-complete-task-local.ps1`）と、それが読む `PRODUCT_IDENTITIES.yml`・`AUDIT_IDENTITIES.json`・`LEGACY_TASK_INVENTORY.json`。
- 2.x governance 全体の整理（`PROJECT_ADAPTER.psd1` 本体、`update-shared-reference.ps1`、SharedSync 系、`validate-ai-governance.ps1` 本体、CI の governance step の存廃）。別TASK。
- CI の実行。`main` の変更、release・tag、force、既存ブランチの削除。
- TASK-021（Cloud 動作確認）の内容。両 TASK は `docs/ai/PROJECT.md` を触るため**直列**で統合する。

## 確認手順（ユーザーが起動して確かめる）

ユーザーの確認操作は不要。完了報告の (1) 決定表の結果、(2) tool 別の前後結果表と製品 cloud 検証の前後表、(3) 凍結履歴・製品が不変であることを示す `git diff --name-only` の出力、を読む。

## Project固有の契約

- `risk_paths` に触れる: `.github/**`（`ci.yml`）。`package.json`・`docs/product/**`・`Personal-Finance-Planner.html` には触れない。
- このrepositoryは公開。個人情報・実データ・ローカルの絶対パスを新規に書かない（既存の `PROJECT_ADAPTER.psd1` の `Paths.CanonicalLocalMain` にある絶対パスはこの TASK では触らない。ユーザー判断 3）。
- 製品不変条件（PROJECT.md）と製品の検査を弱めない。

## 設計 / 決定

2026-10-11 ユーザー承認: TASKS.html は CI・テスト・生成ツールの参照を先に外してから消す。CI は既定でしない（起動条件は `workflow_dispatch` のみ）。

決定表（頭脳の推奨。ユーザーが覆さない限り推奨で実装する）:

| 項目 | 区分 | 推奨 | 根拠 | リスク | 戻し方 |
| --- | --- | --- | --- | --- | --- |
| `ci.yml` の起動条件（`push`／`pull_request`／`branches-ignore`） | 4.x化 | `workflow_dispatch`（`candidate_sha`）のみ | RULES §6。candidate guard は dispatch 前提のまま使える | PR で自動実行されなくなる（意図どおり）。`test-governance-contract` が `branches-ignore:`／`no-ci/**` を要求しているので同時に外す | `on:` を戻す（コミット1・3） |
| `ci.yml` step "Test TASK HTML contract"（PS7／PS5.1 の 2 つ） | 撤去 | 2 step 削除 | HTML 退役 | なし | git revert（コミット3） |
| `tools/update-task-html.ps1`（生成器）・`tools/test-task-html-contract.ps1`（その試験） | 撤去 | `git rm`（検査側の参照を外した後） | 4.x の正本は TASK ファイル。生成器は不要と承認済み | HTML を再生成できない（承認済み） | git revert（コミット4） |
| `tools/validate-ai-governance.ps1`・`test-shared2-bootstrap-smoke.ps1`・`test-shared-sync-contract.ps1`・`test-governance-contract.ps1` の HTML 記述 | 4.x化 | HTML に関する assertion／fixture だけ削除。tool 自体は維持 | これらは HTML 以外の 2.x governance も検査しており、整理は別TASK。HTML が消えると FAIL 原因が増えるので先に外す | main で元から失敗するものは失敗のまま（HTML 起因の失敗は無くなる）。編集で別の assertion を壊さないこと | git revert（コミット1） |
| `docs/ai/PROJECT_ADAPTER.psd1` の `Paths.TaskHtml`・`Commands.TaskHtmlUpdate/Check`・`CI.ExtendedPathGlobs` の HTML 行 | 撤去 | 該当行だけ削除 | 参照先が消える。adapter 全体は別TASK | 検査側（コミット1）が要求しない状態になっていること（順序で担保） | git revert（コミット2） |
| `AGENTS.md:8`・`docs/ai/PROJECT.md` の言及 | 4.x化 | ファイル名を外す／実態に合わせて 1 行追記 | 一つの事実は一か所。PROJECT.md の「退役」記述を実態と一致させる | TASK-021 と同一ファイル（直列で統合） | revert（コミット5） |
| `docs/ai/TASKS.html` | 撤去 | 最後のコミットで `git rm` | 生成物。参照を全て外した後 | 過去の一覧は git 履歴に残る | git revert（コミット6） |
| `validate-audit-identities.ps1`・`test-audit-identity-normalization.ps1`・`validate-project-overlay.ps1`・`validate-task-001-boundary.ps1`・`test-task020-boundary.ps1`・`complete-task-local.ps1`・`test-complete-task-local.ps1` と `PRODUCT_IDENTITIES.yml`・`AUDIT_IDENTITIES.json`・`LEGACY_TASK_INVENTORY.json` | 維持 | 触らない | HTML と無関係（grep で参照ゼロ）。製品の同一性・監査・完了補助 | — | — |
| `docs/bootstrap/`・`docs/product/`・`Personal-Finance-Planner.html`・`index.html`・`src/`・`tests/` | 維持 | 絶対に触らない | 製品／保護対象 | — | — |
| `update-shared-reference.ps1`・`PROJECT_ADAPTER.psd1` 本体・SharedSync・CI の governance step の存廃 | 維持（別TASK） | 触らない | 2.x governance 全体の整理は別判断 | — | — |

ユーザー判断（頭脳への返却点）:
1. **厳格への昇格**: `risk_paths`（`.github/**`）に触れるため RULES §4(11) により厳格を提案する。標準（実装と別の検証）で足りるか、独立レビューまで要るかはユーザーが決める。この TASK は `mode: standard`。
2. **2.x governance の残り**: main の governance 系 step／tool は HTML 以外の理由でも既に赤い（上記）。この TASK では直さない。撤去か 4.x 化かを決める別TASKを推奨する。
3. **公開repositoryに残る個人環境の絶対パス**: `docs/ai/PROJECT_ADAPTER.psd1` の `Paths.CanonicalLocalMain` に個人のローカル絶対パスが既にコミットされている（履歴にも残る）。この TASK では触らない（adapter 全体の別TASKで削除を推奨）。履歴の書換えは行わない。

## 判断した点

(実装担当が記入。決定表の各行の結果もここに書く。)

## 履歴

- 2026-10-11 Claude（頭脳の補助）が作成。status READY。
