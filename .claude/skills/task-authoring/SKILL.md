---
name: task-authoring
description: Write a TASK file (requirements, acceptance criteria, scope, confirmation steps) that can be verified and finished. Use when turning a decided request into docs/ai/tasks/TASK-NNN.md. Runbook only.
---
# TASK化

ひな形は `templates/TASK.md`（Projectでは `docs/ai/shared/templates/TASK.md`）。現在状態の正本はTASKファイル。

## 書き方
- **受入条件は観測できる形**（画面・出力・数値）。結果を左右する重要な例は、入力と期待出力で書く（テストの期待値の根拠になる）。対象外を書く。AIの確認（E2E・証跡）と、ユーザーの最終判断（見る場所・見る点・合否の見方。コマンドは書かない）を分けて書く。
- **設計は境界だけ決める**: 外部境界（API・データ形式・契約・スキーマ）、変えにくい制約、高リスク部分、ユーザーの好みが出る部分。内部構造・命名・既存パターン内の実装は実装に任せる。好みは文章より例（画面・入力と期待出力）で示す。
- ユーザーの決定は「設計 / 決定」節に日付つきで書く（トレードオフと互換性の注意も添える）。
- Project固有の契約（`PROJECT.md` が列挙する項目）は必ず埋める。
- **実装の場所**: 実機・Windowsなどでしか確かめられないTASK（長いパス、シェルの版差、プロセス、実機のメタデータ）は、TASKに「実機必須」と書き、最初から実機側（ローカルCodex）が実装する。それ以外はCloudを既定にする（RULES §5の14で再点検した結果、移すこともある）。
- `risk`（low/normal/high/critical）と、実施するモード（direct/standard/strict）の見込みを書く。リスクが`risk_paths`に触れるなら標準以上。
- 基準が観測できる形でないTASKは、実装前にユーザーへ戻してよい。
- 実装担当が解釈を選んだ点は、完了報告の「判断した点」に残させる。結果に影響する分岐は実装前に聞く。

## 依頼はTASKファイルで
TASKファイルは作業branchに置く（`task start` でclaimしたbranchへcommit・push。mainへ直接書かない）。実働への依頼は起動の一言だけ（`templates/CODEX_LAUNCH.md`。branchと先頭の40桁SHAを含む）で、実働は `task start -Id TASK-NNN -Resume -ExpectSha <SHA>` で引き継ぐ（RULES §8の19の2）。長い依頼文を貼らない。TASKファイルが唯一の正本。GitHubに置けないProjectは `templates/LOCAL_CODEX_REQUEST.md` の貼付形式。
