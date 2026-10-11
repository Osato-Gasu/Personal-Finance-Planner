---
name: task-authoring
description: Write a TASK file (requirements, acceptance criteria, scope, confirmation steps) that can be verified and finished. Use when turning a decided request into docs/ai/tasks/TASK-NNN.md. Runbook only.
---
# TASK化

ひな形は `templates/TASK.md`（Projectでは `docs/ai/shared/templates/TASK.md`）。現在状態の正本はTASKファイル。

## 書き方
- **受入条件は観測できる形**（画面・出力・数値）。確認手順（起動→操作→期待結果）と対象外を書く。自動で確かめるものと人が見るものを分ける。
- **設計は境界だけ決める**: 外部境界（API・データ形式・契約・スキーマ）、変えにくい制約、高リスク部分、ユーザーの好みが出る部分。内部構造・命名・既存パターン内の実装は実装に任せる。好みは文章より例（画面・入力と期待出力）で示す。
- ユーザーの決定は「設計 / 決定」節に日付つきで書く（トレードオフと互換性の注意も添える）。
- Project固有の契約（`PROJECT.md` が列挙する項目）は必ず埋める。
- `risk`（low/normal/high/critical）と、実施するモード（direct/standard/strict）の見込みを書く。リスクが`risk_paths`に触れるなら標準以上。
- 基準が観測できる形でないTASKは、実装前にユーザーへ戻してよい。
- 実装担当が解釈を選んだ点は、完了報告の「判断した点」に残させる。結果に影響する分岐は実装前に聞く。

## 依頼はTASKファイルで
TASKファイルを `main` に置き、実働への依頼は一文だけにする: 「`docs/ai/tasks/TASK-NNN.md` を読んで、AGENTS.md の手順（作業の準備を最初に実行）に従って、TASK-NNN を始めてください」。長い依頼文を貼らない。TASKファイルが唯一の正本。
