# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.25
# source commit: f07571d3e8745b9a49a28b1ac77e211c210146a3
# 直接編集禁止

# Roles

## Delegation boundary

The assigned executor owns the bounded task. Subagents are default-deny: they
may be used only when the user explicitly requests them, or when fully
independent work materially shortens the task. At most two may be active; they
must not overlap on a file or topic. The report records the reason, bounded
scope, and integration method. An implementation subagent is never an
independent reviewer. A separately assigned independent reviewer is read-only
and may only return findings to `ORCHESTRATOR_AND_REVIEWER`.

- `ORCHESTRATOR_AND_REVIEWER`: ChatGPT。要件、設計、assignment、actual diff review、承認、次TASK判断。
- `IMPLEMENTER`: Codex。調査、実装、test、debug、build、commit、handoff。
- `INDEPENDENT_REVIEWER`: Claudeを優先するread-only reviewer。許可時のみrepository参照可能な別ChatGPT sessionで代替。
- `USER`: ユーザーだけが実行できる認証、権限、host操作、仕様判断。
- `NONE`: active TASKなし。

同時writerは1つです。independent reviewerはfindingを`ORCHESTRATOR_AND_REVIEWER`へ返し、Codexへ直接handoffしません。

## Independent reviewer executor policy

- 通常のoptional reviewは`preferred_fallback`。`preferred_executor: Claude`、`allowed_executors: Claude, ChatGPT`。
- ユーザーがClaude必須を明示した場合は`strict`。Claude以外へ代替しません。
- ChatGPT代替は別session、repository accessありの場合だけ許可します。
- 代替時は`review_role: INDEPENDENT_REVIEWER`、`preferred_executor: Claude`、`actual_executor: ChatGPT`、`execution_mode: separate_session`、`provider_substitution: Claude_to_ChatGPT`、`repository_access: true`を記録します。
- write bridge unavailable時も`INDEPENDENT_REVIEW_REQUESTED` relayでdesign／implementation checkpointを開始し、結果は常にChatGPTへ返します。
- reviewerは`INDEPENDENT_REVIEW_COMPLETED` result artifactを返します。GO routerがbundle identityと`relay_recipient: Codex`／`relay_recipient_role: IMPLEMENTER`を検証した場合だけ通常actor mismatchを越え、Codexがrequest identityとexecutor contextを検証して正本化し、`next_actor: ChatGPT`へ遷移させます。任意messageはoverrideになりません。
- session bindingはactorとroleを分離します。同じChatGPT providerでも既存`ORCHESTRATOR_AND_REVIEWER` sessionは`separate_session`の`INDEPENDENT_REVIEWER` assignmentを実行できません。
- ChatGPT代替を`Claude review completed`と記録しません。
- connector-only reviewerはremote refをexact commitへ固定した`connector_read_only`でrepository、ref、commit、3 blobとhandoff assignment identityを検証し、local shell、clean worktree、writer競合、state writeを確認済みと記録しません。read-only findingとimmutable route identityを含むportable result bundleだけを返します。
