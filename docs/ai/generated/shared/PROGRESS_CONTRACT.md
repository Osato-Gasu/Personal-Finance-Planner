# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

# Progress contract

`board/PROGRESS.html`はCURRENT_STATE、active TASK、BACKLOG、NEXT_ACTIONから決定的に生成する正式生成物です。直接編集しません。

BACKLOG列、status/risk label、phase/role label、product identity表示はproject adapterで解決します。共通generatorは列数、FF14固有label、単一product file、SHA、bytesを固定しません。adapterにないstatus、risk、phase、roleは空表示せずFAILします。

active TASKは0件または1件です。0件なら次を日本語で表示します。

- 現在の機能：なし
- 現在の工程：なし
- 現在の担当：なし
- モデル／負荷：なし
- 現在着手中の機能はありません
- 次の作業
- BACKLOG

completion syncでは、履歴TASKを1件ずつ `docs/ai/COMPLETED_TASKS.md` へ確定します。
記録する時刻は、そのcompletion syncで固定した`execution_finished_at`のみとし、`YYYY-MM-DD HH:mm:ss JST`で保存します。
同一TASK-IDは同一台帳内で一意です。既存履歴を無関係に書き換える修正は許可されず、履歴訂正は証跡と意図説明を付けて明示的に行います。
