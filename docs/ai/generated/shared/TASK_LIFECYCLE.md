# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.24
# source commit: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
# 直接編集禁止

# TASK lifecycle

## Bounded implementation-review convergence

An implementation review records `changes_requested_cycles` and the exact
`implementation_review_attempt`, `implementation_review_profile`, and
`implementation_review_terminated` state. The first attempt is `standard`.
After the first non-pass, attempt 2 is `narrowed` and checks only the accepted
prior finding, a repair regression, a requirement violation, a major
functional/security/data-integrity/test or compatibility failure, or an
explicit release gate. After the second non-pass, attempt 3 is `terminal` and
accepts only BLOCKER/MAJOR release blockers in those categories. Minor,
question, optional, UI, scope-expansion, and ideal-design findings are
rejected on narrowed and terminal attempts.

The terminal safety boundary remains non-relaxable for `calculation_accuracy`,
`decision_accuracy`, `data_preservation`, `data_integrity`, `rollback`,
`raw_byte_portability`, `validator`, `required_test`, `release_gate`,
`security`, and `backward_compatibility`.

After a third `CHANGES_REQUESTED`, the relay materializes
`NEEDS_USER_DECISION` in `user_decision`, sets
`implementation_review_terminated: true`, preserves all findings and
dispositions, and creates no fourth implementation review. Termination routes
to `ChatGPT` / `ORCHESTRATOR_AND_REVIEWER` with
`user_confirmation_required: true` and a prompt retaining blockers, reasons,
and choices. Termination is never auto-approved or released. `APPROVED`
resets the cycle to attempt 1 / `standard`.
Design-stage `CHANGES_REQUESTED`, independent-review states, and external
`BLOCKED` do not increment implementation cycles. A user-approved spec
revision or a newly identified TASK resets the same state to attempt 1 /
`standard`.

The allowed combinations are exact: cycles 0 -> attempt 1 / `standard` /
false; cycles 1 -> attempt 2 / `narrowed` / false; cycles 2 -> attempt 3 /
`terminal` / false; cycles 3 -> attempt 3 / `terminal` / true and
`user_decision`.

Inconsistent combinations (such as cycles and attempt/profile disagreeing,
termination without three cycles, or termination with `APPROVED`) are
invalid and must be rejected before writing state.

Every formal implementation-review decision is checked against the current
profile before any write. Attempts 1 and 2 reject more than two actionable
findings. Attempt 3 requires every actionable finding to carry a
machine-readable non-relaxable `review_scope` and BLOCKER/MAJOR severity.
Changing `CHANGES_REQUESTED` to another decision does not bypass these rules.
At attempt 2 or later, a supplied `prior_finding_id` is resolved by exact ID
against the canonical open-finding registry produced only from previously
accepted, still-unresolved findings; substring or arbitrary text matches are
invalid.

A changed spec revision resets a terminated convergence state only when the
relay includes `spec_revision_reset` with explicit `USER` approval, matching
from/to revisions, approval id, and JST timestamp. Unapproved revision changes
are rejected; the reset materializes cycle 0 / attempt 1 / `standard` / false,
after which the next implementation `CHANGES_REQUESTED` is attempt 2.

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
