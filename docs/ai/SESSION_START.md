# Session start

```text
repository path: C:\Users\owner\Development\personal\Personal-Finance-Planner
GitHub repository: Osato-Gasu/Personal-Finance-Planner
entrypoint: AGENTS.md, then docs/ai/generated/shared/START.md
actor: <ChatGPT | Codex | Claude>
role: <role ID>
session_mode: <existing_session | separate_session>
routing_mode: <local_script | connector_read_only>
NEXT_ACTION: docs/ai/NEXT_ACTION.yml

新規sessionではこのpromptからrepository、actor、role、session mode、routing modeを固定してください。

1. GO後は`AGENTS.md`を1回、`docs/ai/generated/shared/START.md`を1回読み、STARTのentrypoint graphと正式順序で最小正本をsilent readして現在地点を復元する。
2. 現在地点復元後に、`YYYY-MM-DD HH:mm:ss JST`形式の実行開始時刻を1回だけsilent取得し、固定する。
3. 3 section（現在地点、依頼先情報、コピペ用プロンプト）を表示し、時刻fieldを表示しない。

## 3 section template（表示内容）
## 現在地点

- TASK-ID：
- 機能：
- フェーズ：
- 判定／状態：

## 依頼先情報

- 依頼先：
- 実施内容：
- 渡すセッション：

## コピペ用プロンプト

- 次担当が復帰に必要な commit / tree / hash
- 実行コマンド
- blocker理由
- 再開条件
- 追加 findings の要点（あれば）
- STOP条件

4. 画面表示後に残りの要件を読む。active TASKがなくてもproject-level requirements handoffから次TASK設計を開始する。
5. active TASK handoffが未着手、BLOCKED、actor／role mismatchなどで作業を開始できない場合も通常chatは3 sectionを維持する。`USER_RELAY_REQUIRED`は検証済みなら`local_script`の正式relay overrideとして扱う。ChatGPTはstate transition前にrepository write capabilityを実測する。write不能なら正本を更新済みと記録せずportable relay bundleをrepository外fileへ保存し、bundle identityだけを返す。artifact不能時だけ完全bundleをchat fallbackする。
6. 依頼完了時に実行終了時刻を`YYYY-MM-DD HH:mm:ss JST`で1回だけ取得し、`report`と`handoff`に保存する。

`実行開始時刻`と`実行終了時刻`はreport／handoffに保存し、通常chatには表示しない。

local shell actorは`tools/route-go.ps1 -RoutingMode local_script`を実行する。connector-only actorは同一commit SHAのPROJECT_ADAPTER、NEXT_ACTION、handoffを読み、`connector_read_only` resultを宣言する。完全なGO-only state transitionはwrite bridge利用時だけ成立する。identity不一致、writer競合、dirty worktreeでは変更せずBLOCKEDで返す。
```
