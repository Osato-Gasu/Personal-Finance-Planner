---
name: shared-maintenance
description: Maintain the Shared repository and its users: recover from a stopped tool (exit 2/3/4), move a Project's Shared pin, release a version, change Shared itself, and the restart inventory of a Project's own rules. Use when a shared.ps1 command stops, or when releasing, pinning or restarting a Project. Runbook only.
---
# Shared の保守

## 停止したとき（exit code）
| exit | まずやること |
| --- | --- |
| 3 `OUTCOME_UNKNOWN` | **再送しない。** `pwsh tools/shared.ps1 recover`。`APPLIED`なら完了、`NOT_APPLIED`なら元のコマンドを再実行、`UNKNOWN`はremote到達後にもう一度。journalが無い（コンテナ破棄・別clone）のは「送っていない」ではない: `recover -Branch <name> -Sha <公開しようとしたcommit> [-Expect <期待値>]` でremoteを読み戻す |
| 4 `REMOTE_MOVED` / `TASK_CLAIMED` | `git fetch`、remoteを読んで調停（mergeで取り込む）。上書き・force・claim二重化はしない。頭脳がclaim済みのTASKを引き継ぐなら `task start -Id TASK-n -Resume -ExpectSha <起動の一言のSHA>`（迂回しない） |
| 2 `TREE_DIRTY` | 未コミット変更はユーザーのもの。コミット/退避するか別の作業ツリーで。勝手に捨てない |
| 2 `GIT_FORBIDDEN` | 別の方法を取る（履歴を書き換えない）。追加コミットで直す |
| 2 `GATE_NOT_INSTALLED` | gate道具（`tools/gate/`）が無い checkout。gateを使う repository でだけ必要 |
| 2 `MIGRATION_REQUIRED` | Projectの起動文書をSharedに合わせ、同じ変更でlockを更新（`pin apply -AcknowledgeMigration`） |

## pin（Project側で実行）
`pin check|plan|apply -Root . -SharedRoot <shared> -To <sha|tag>`。`pin apply` が変えるのはlockの `source_version`/`source_commit` の2行だけ。続けて `sync` を実行すると、`docs/ai/shared/` 配下・`.claude/skills/` のSharedのskill・manifestも更新される。pin更新TASKの許可範囲には、lock、この2つの配下、manifest、TASKファイルの状態更新を含める（許可から漏れると `sync` が止まる）。進行中TASKは自分のpinを保つ。2.xのpinは有効なまま（自動追従しない）。`MIGRATION_REQUIRED`/`PIN_INCOMPATIBLE_CONSUMERS` は、majorが変わる／起動文書が参照を失う／旧前提が残る印。それらを直す移行TASKを先に完了してから `-AcknowledgeMigration`（と必要なら `-AcknowledgeConsumers`）。

## Releaseと Shared 自身の変更
`VERSION` が唯一のバージョン。Releaseは `v<VERSION>` タグ（作成のみ、既存タグは動かさない）で、ユーザーが決める。Sharedの変更は、文書・RULES・skills・templatesはCI不要、`tools/` の変更でWindows確認が要るときだけCIを推奨（`ci`）。別identityが無い間、Shared自身の統合はユーザーが行う。

## Projectの再始動時の棚卸し（1 TASK）
Projectの既存ルールを1項目ずつ振り分ける。常時はやらない。旧pinのProjectは再始動まで止めない。
| 振り分け | 条件 | 行き先 |
| --- | --- | --- |
| 削除（Sharedを参照） | Sharedに同じ内容がある | Project側から消す。コピーを持たない |
| Sharedに昇格を提案 | 一般的で、2つ以上のProjectで必要、または明らかに一般的 | Shared自身の変更として、ユーザーが決める。自動昇格しない |
| Skillに外出し | 手順・判断基準・ひな形で毎回は読まない | 一般化できればSharedのSkill、固有ならProject内 |
| `PROJECT.md` の値 | 事実・コマンド・リスクパス・モデル割当 | front matter／本文 |
| `RELEASE.md` へ別置 | 公開時だけ要る | Project内 |
| 履歴へ | 経緯・古い記述 | TASK報告に集約し本体から消す |
守ること: 重複を残さない／緩める方向の差分は昇格しない。

## 付き合わせ（2.x由来の整理）
Projectの旧規則・旧道具をShared 4.xと付き合わせるTASKは `templates/ALIGNMENT_TASK.md`（決定表つき）で書く。Codex Cloudで進めるProjectは `templates/CLOUD_SETUP.md` の型で環境を作る。
