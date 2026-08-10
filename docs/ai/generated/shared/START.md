# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# START

このファイルは`AGENTS.md`から1回だけ読むGO entrypointです。`AGENTS.md`やこのファイルを再読込しません。

```entrypoint-graph
SESSION_START -> AGENTS
AGENTS -> START
START -> PROJECT_ADAPTER,CURRENT_STATE,NEXT_ACTION,HANDOFF_IDENTITY
PROJECT_ADAPTER,CURRENT_STATE,NEXT_ACTION,HANDOFF_IDENTITY -> START_CLOCK
START_CLOCK -> CURRENT_POSITION_OUTPUT
CURRENT_POSITION_OUTPUT -> PROJECT_RULES,WORKFLOW,TASK,REPORT,SCOPE
PROJECT_RULES,WORKFLOW,TASK,REPORT,SCOPE -> GO_ROUTER
GO_ROUTER -> NORMAL_WORK,RELAY_IMPORT,READ_ONLY_STOP
```

## GOの正式順序

1. 新規sessionでは`SESSION_START.md`からrepositoryとactorを特定する。接続済みsessionではこの工程を省略する。
2. projectの`AGENTS.md`を1回読む。
3. `docs/ai/generated/shared/START.md`を1回読む。
4. 表示前に次の最小正本だけをsilent readする。
   - `docs/ai/PROJECT_ADAPTER.psd1`
   - `docs/ai/CURRENT_STATE.md`
   - `docs/ai/NEXT_ACTION.yml`
   - `NEXT_ACTION.yml`が指定するhandoffのidentity部分
5. 現在地点を復元した直後に、`YYYY-MM-DD HH:mm:ss JST` 形式の実行開始時刻を1回だけsilent取得し、固定する。

6. チャットへ次の3 sectionだけを表示する。

```text
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

- コピペ用プロンプト本体：
```

7. 表示後にproject rules、workflow overlay、active TASK、report、handoffの残り、scopeと停止条件を読む。処理終了時には実行終了時刻を`YYYY-MM-DD HH:mm:ss JST`で1回だけ取得し、固定してreport／handoffへ保存する。

8. actor能力に応じてrouting modeを選ぶ。local shellを持つCodex／Claude Code等は`tools/route-go.ps1 -RoutingMode local_script`を実行する。GitHub connectorだけを持つChatGPT／Claudeは、requested branch/tagを最初にexact commitへ1回だけresolveし、以後のPROJECT_ADAPTER、NEXT_ACTION、指定handoffをそのcommit SHAでread-only取得して、宣言的な`connector_read_only`を適用する。branch名をfileごとに再解決しない。通常routeはactorとroleの両方が一致した場合だけ処理する。
9. actor/role mismatchはread-only停止する。唯一の例外は、ユーザーが添付した`USER_RELAY_REQUIRED` bundleまたはpointerのname／SHA-256／bytes／formatとschemaを検証し、`relay_recipient`と`relay_recipient_role`が現在session bindingへexact一致した場合である。この検証済みrelay routeは通常mismatchより優先してCodex importを許可する。任意chat本文やdecision名だけではoverrideしない。

実行開始時刻と実行終了時刻はrepositoryのreport／handoffへ保存し、通常chatでは表示しません。実行開始時刻は処理中に変更しません。
actor mismatch、`BLOCKED`、`USER_HOST_ACTION_REQUIRED`、`PRODUCT_FAILURE`でも記録します。通常の処理中は逐次進捗をチャットへ出しません。

active TASKがなくても`NEXT_ACTION.yml`はpermanent project requirements handoffを指し、ChatGPTがCURRENT_STATE、BACKLOG、ユーザー要望から次TASKを設計します。

ChatGPTがstate transitionを担当する場合はrepository write accessを実測します。write bridgeが利用できる場合だけ完全なGO-only state transitionが成立します。利用不能ならschema 2 portable relay bundleをrepository外artifactとして作り、そのidentityだけを最小chat payloadでユーザーへ渡します。artifactも作成不能な場合だけ、bundle全内容をchatへ省略せず出します。user relay後はGO routerがsession bindingとrelay identityを検証し、Codexが7 decision state tableに従ってtransactionalに正本一式を更新します。

## Actor capability routing

両modeは`schema_version`、`routing_mode`、`route`、`outcome`、`reason_code`、actor、role、session mode、TASK、phase、handoff、repository、requested ref、resolved commit、PROJECT_ADAPTER／NEXT_ACTION／handoff blob、repository access、local script／worktree／writerの観測状態、write／relay import可否、repository changedを持つ同一result schemaを使います。active TASK handoffは`task_id`、phase、actor、role、model、effort、`candidate_commit`、`shared_candidate`をNEXT_ACTIONとexact照合します。`connector_read_only`はremote正本上のimmutable snapshotだけを判定し、`local_script_executed: false`、local worktree／writerは`not_observable`、state write／relay importはfalseとします。PowerShell実行、local clean、writer競合なし、state更新済みを主張しません。許可される処理はread-only判定・reviewとportable bundle作成だけです。
