---
schema: 1
id: TASK-021
title: Cloud動作確認（Codex Cloud で開発再開できる状態にする）
kind: chore
status: READY
mode: direct
risk: low
owner:
branch:
touches_paths: ["docs/ai/reports/TASK-021/**", "docs/ai/PROJECT.md"]
verification: NOT_RUN
runtime: NOT_REQUIRED
ci: NOT_NEEDED
next_action: Codex Cloud が `docs/ai/tasks/TASK-021.md` を読み、AGENTS.md の手順（作業の準備を最初に実行）に従って TASK-021 を始める
shared:
---
## Requirements

目的: このリポジトリを Codex Cloud で開発再開できる状態にする（機能変更はしない）。

Codex Cloud 環境の前提（2026-10-11 に確認済みの事実）: GitHub の fetch／`work/*` の push は可。`pwsh` は PATH に無い（PowerShell 7.4.6 linux-x64 の tarball を導入し、起動するプロセスの PATH にだけ足す）。ネットワークは allowlist 制。リポジトリ外への書込みは不可（導入物もリポジトリ内か一時領域に置けるか確かめ、駄目なら「未検証」と書く）。ローカルブランチ名 `work` が `work/TASK-021` と衝突するため、先に `git branch -m work cloud-work-saved`（削除しない）。

1. **環境セットアップスクリプト案**: pwsh 導入＋このプロジェクトの依存導入の手順（実際に動いた順序のスクリプト）と、必要な許可ホストの一覧を `docs/ai/reports/TASK-021/CLOUD_SETUP.md` に書く。試して動いたものと、動かず推測のものを分けて書く。
2. `pwsh docs/ai/shared/tools/shared.ps1 check -Root .` を実行し、結果を報告に書く（浅い clone の `HISTORY_INCOMPLETE` は想定内。2.x 由来の警告も想定内だが、一覧にして残す）。
3. `docs/ai/PROJECT.md` の front matter `verify_capabilities.cloud` に書かれた検証コマンドを**実際に実行**し、結果表（コマンド｜結果｜所要｜備考）を `CLOUD_SETUP.md` に作る。実行できないものは「未検証」、失敗は「FAIL」と書く（未実行を成功と書かない）。`main` で既に失敗するものは、`main`（本TASKの変更前）でも失敗することを確認して、本TASK起因の失敗と分けて書く。
4. 発見を `docs/ai/PROJECT.md` の「Codex Cloud の注意」へ反映する（導入手順・許可ホスト・所要時間・動かないコマンド。詳細は `CLOUD_SETUP.md` へのリンクにして重複させない）。

このリポジトリ固有:
- パッケージマネージャは **npm**（`npm ci`。`.nvmrc` は 24）。Cloud の Node の版を確認して書く。
- 検証対象は PROJECT.md の cloud 欄どおり: `npm ci`、`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm test`、`npm run test:rules`、`npm run test:nisa`、`npm run test:ideco`、`npm run test:overview`、`npm run verify:launcher`、`git diff --check`。
- `npm run verify:launcher` は `npm run build:app` を走らせ root launcher との一致を見る。これが Cloud で動くか、**`Personal-Finance-Planner.html` を書き換えないか**を確認する。書き換わった場合は差分を戻して（`git checkout -- Personal-Finance-Planner.html`）報告する（コミットしない）。PROJECT.md には「verify:launcher はCodex Cloudでは行えない」という記述と、cloud 検証欄に載っているという記述が併存するため、実測の結果で矛盾を解消する。
- `npm run test:portable`（Windows + Edge/Chrome）と画面操作・JSONバックアップの実操作は対象外（local／user_only）。結果表に「対象外」と書く。

## Acceptance

- `docs/ai/reports/TASK-021/CLOUD_SETUP.md` がある（セットアップ案・許可ホスト・結果表を含む）。
- `CLOUD_SETUP.md` に結果表（コマンド｜結果｜所要｜備考）がある。`shared.ps1 check` の結果（エラー有無と警告の一覧）も載っている。
- `CLOUD_SETUP.md` に、Node／npm のセットアップ案と許可ホスト一覧（npm レジストリ等）がある。
- 結果表に cloud の全コマンドが載り、`verify:launcher` の可否と root launcher が書き換わらなかったこと（または戻したこと）が明記されている。
- 公開リポジトリのため、追加・変更したファイルに個人情報・個人パス・秘密を書いていない。
- `docs/ai/PROJECT.md` の「Codex Cloud の注意」に発見が反映されている（詳細は `CLOUD_SETUP.md` へのリンク）。
- 実行したコマンドは全て結果表にある。未実行・実行不能は「未検証」、失敗は「FAIL」と書かれ、PASS と混ざっていない。
- `git diff --check` が通る。
- ユーザー操作は不要（`ユーザー操作：ユーザー対応不要`）。

## 対象外

- 機能変更（製品コード・製品の挙動）。
- 2.x 時代の CI／ツールの撤去・整理（別TASK）。
- CI の実行（ユーザーが依頼したときだけ）。
- `main` の変更、release・tag、既存ブランチの削除・force。
- `npm run test:portable`、ブラウザでの画面操作、JSONバックアップの保存と復元。
- 製品コード（`src/**`）、制度ルール、`Personal-Finance-Planner.html` の変更。
- `docs/ai/PROJECT_ADAPTER.psd1` の変更（下記「所見」参照。別TASK候補）。

## 確認手順（ユーザーが起動して確かめる）

ユーザーの確認操作は不要。完了報告の結果表（と `CLOUD_SETUP.md`）を読んで、Cloud で何が検証でき、何ができないかを把握する。

## Project固有の契約

- 公開リポジトリ: 新規・変更ファイルに個人情報・実データ・ローカルの絶対パス・秘密を一切書かない（CLOUD_SETUP.md のログ引用でもパスを `<repo>` 等に置換する）。
- 製品不変条件（金額計算・制度ルール・データ保全）に触れない。`risk_paths` の `package.json`・`package-lock.json`・`.github/**`・`Personal-Finance-Planner.html` を変更しない。`npm ci` で lockfile が変わった場合は戻して報告。

## 設計 / 決定

- 2026-10-11: Cloud 動作確認 TASK の共通仕様（頭脳が決定）。モードは直行（リスク低）で、実装は Codex Cloud。報告に「自己確認のみ（独立検証なし）」と書く。
- 成果物（`CLOUD_SETUP.md`）はリポジトリ内に置く（Cloud はリポジトリ外へ書けない）。

### 所見（このTASKでは変更しない・別TASK候補）

- `docs/ai/PROJECT_ADAPTER.psd1`（旧運用の履歴ファイル）に `CanonicalLocalMain` としてローカルの絶対パスが入っている。公開リポジトリなので、除去（または履歴として扱う方針の決定）を**別TASK**で検討する。本TASKでは変更しない。実装担当は、この所見の存在の確認結果（該当キーが残っているか）だけを完了報告に書く。値そのものは報告・TASK・レポートに転記しない。

## 判断した点

(実装担当が記入。)

## 履歴

- 2026-10-11 Claude（頭脳の補助）が作成。status READY。
