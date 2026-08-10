# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# Session start

```text
repository: <absolute repository path>
GitHub repository: <owner/name>
entrypoint: AGENTS.md, then docs/ai/generated/shared/START.md
actor: <ChatGPT | Codex | Claude>
role: <role ID>
session_mode: <existing_session | separate_session>
routing_mode: <local_script | connector_read_only>
NEXT_ACTION: docs/ai/NEXT_ACTION.yml

新規sessionではこのpromptからrepository、actor、role、session mode、routing modeを固定してください。

1. GO後は`AGENTS.md`を1回、`docs/ai/generated/shared/START.md`を1回読み、STARTの正式順序で最小正本をsilent readして現在地点を復元する。
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

4. 画面表示後に残りの要件を読む（active TASKがなくてもproject-level requirements handoffから次TASK設計を開始）。
5. active TASK handoffが未着手、BLOCKED、actor／role mismatchなどで作業を開始できない場合でも、通常chatは常に3 section（現在地点、依頼先情報、コピペ用プロンプト）を維持して返します。作業できない場合はrepositoryを変更しません。`USER_RELAY_REQUIRED`は検証済みなら`local_script`における正式relay overrideとして扱います。ChatGPTはstate transition前にrepository write capabilityを実測します。write不能なら正本を更新済みと記録せずportable relay bundleをrepository外fileへ保存し、`USER_RELAY_REQUIRED`ではbundle identityだけを返します。artifact不能時は完全なbundleをchat fallbackします。
6. 依頼完了時に、実行終了時刻を`YYYY-MM-DD HH:mm:ss JST`で1回だけ取得し、`report`と`handoff`に保存する。

`実行開始時刻`と`実行終了時刻`は`report`／`handoff`に保存し、通常chatには表示しない。

active TASKがなくてもproject-level requirements handoffから次TASK設計を開始します。local shell actorは`tools/route-go.ps1 -RoutingMode local_script`を実行します。GitHub connector-only actorはremote branch/tagをexact commitへ一度だけresolveし、PROJECT_ADAPTER、NEXT_ACTION、handoffを同じcommit SHAで読み、repository／requested ref／resolved commit／3 blobを含む`connector_read_only` resultを宣言します。PowerShell、local clean、writer競合確認、state writeを主張しません。通常mismatch時も3 sectionを維持し、作業停止の理由と再開条件をコピペ用プロンプトへ保持してBLOCKEDで返します。connector routeはread-only review／判定とimmutable route identity入りportable bundle作成だけを許可し、relay importを行いません。reset、stash、clean、restore、force push、user-owned差分の上書き、無断merge/releaseは禁止です。local modeでrepositoryへ接続できない、identity不一致、writer競合、dirty worktreeの場合は変更せずBLOCKEDで返してください。一度接続後は以後GOだけで開始してください。完全GO-only state transitionはwrite bridge利用時だけ成立します。
```
