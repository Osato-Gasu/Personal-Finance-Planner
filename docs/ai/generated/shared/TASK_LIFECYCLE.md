# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# TASK lifecycle

## Bounded changes-requested gate

A TASK records `changes_requested_cycles`. The first `CHANGES_REQUESTED`
increments it and follows the normal review-stage route. A second consecutive
`CHANGES_REQUESTED` for the same TASK is materialized as
`NEEDS_USER_DECISION` in `user_decision`. The user must choose a bounded scope
or acceptance change, or request a separately identified TASK split, before
further implementation. This prevents silent review-scope expansion.

shared必須phaseは`requirements`、`design`、`design_review`、`implementation`、`implementation_review`、`browser_evidence`、`release`、`completion_sync`、`user_decision`、`blocked`です。完了済み表示のcanonical phaseは`completed`です。project adapterは必須phaseをすべて定義し、project固有phaseを追加できます。`done`は使用しません。

- active TASKは0件または1件です。2件以上はFAILです。
- active TASK 0件ではpermanent project-level requirements handoffを使用し、`handoff_file: none`にしません。
- canonical defaultの`git_only`では、active TASKだけを`docs/ai/tasks/TASK-*.md`、`docs/ai/handoffs/TASK-*/`、`docs/ai/reports/TASK-*/`へ保持します。
- completion syncでactive artifactを現行treeから削除し、履歴はGitへ残します。project adapterが`TaskHistory.CompletedTaskFilePolicy = 'retain_validated'`へ明示的にopt-inした場合だけ、`RetainedTaskStates`のexact status／phase pairと一致する検証済みcompleted TASK fileを`docs/ai/tasks/`へ保持できます。canonical completed phaseは変更しません。project固有phase aliasは`RetainedTaskStates`でexact指定し、`PhaseLabels`に存在させます。
- retained completed TASK fileはactive TASKではありません。inactive handoff／report directoryはopt-in対象外で、Git-only projectの従来挙動も維持します。
- state遷移ごとにTASK、CURRENT_STATE、NEXT_ACTION、current handoff／report、Progressを同じcandidate、phase、actorへ同期します。古いcandidateやactorを一箇所でも残した遷移はFAILです。
- portable relayは`REQUIREMENTS_DEFINED → implementation/Codex`、`INDEPENDENT_REVIEW_REQUESTED → design_reviewまたはimplementation_review/INDEPENDENT_REVIEWER`、`INDEPENDENT_REVIEW_COMPLETED → 同じreview phase/ChatGPT`のstate tableに従います。ChatGPT判定は`review_stage`で分岐し、designの`APPROVED → implementation/Codex`、`CHANGES_REQUESTED → design/ChatGPT`、implementationの`APPROVED → release/Codex`、`CHANGES_REQUESTED → implementation/Codex`とします。`BLOCKED`と`NEEDS_USER_DECISION`もstage固有candidateを保持します。relayを受け取る`relay_recipient`と作業結果の`result_return_to`を混同しません。
- `REQUIREMENTS_DEFINED`のbase commitは原則としてimport時の現在HEADとexact一致させます。project固有TASK metadataはadapter mappingでmaterializeし、共通validatorとproject overlayの両方を成功条件にします。
- independent reviewはClaude優先です。`preferred_fallback`だけが別ChatGPTを許可し、actual executorと`Claude_to_ChatGPT` substitutionを記録します。`strict`は代替を拒否します。
- independent review requestはkind、candidate、spec revision、preferred／actual executor、review role／status、reviewer model／effort、execution mode、repository access、provider substitution、executor policy、開始時刻からcanonical `request_id`を生成し、request handoff、TASK、NEXT_ACTION、canonical request bundleへ同時に保存します。完了bundleは4正本からIDを再計算してresultとexact一致させます。result、完了時刻、finding件数／IDを監査項目として保存し、ChatGPTへ戻した後の正式判定でも削除せず再検証します。
- independent review request/result objectはdecision/current review stateのpresence matrixへ従い、unexpected objectをwrite前に拒否します。post-review decisionはcurrent canonical resultのidentity、audit、finding全文をproperty順序非依存で検証し、全findingへ採否statusと理由を付けてから上書きします。元findingはimmutable audit、accepted findingだけが次担当のRequired changesです。
- resultはallowed review kind、non-negative integerの`findings_count`、一意なfinding ID、result/finding severity整合を必須にします。`NO_BLOCKING_FINDINGS`はBLOCKER／MAJORを含めず、`CHANGES_RECOMMENDED`はfindingを1件以上、`BLOCKED`／`FAILED`はBLOCKERを1件以上必要とします。
- relay importはrepository、branch、clean worktree、spec、candidate、handoff HEAD、shared candidate、phase、actor/role、model/effortを全てpreflightし、生成またはvalidator失敗時はbyte-exact rollbackします。
- candidate固定後の変更は新identity、再test、再reviewを必要とします。
- project-level handoffはactive TASK artifactではなく、inactive TASK artifact検査の対象外です。
