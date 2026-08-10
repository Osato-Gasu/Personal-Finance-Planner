# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# GO protocol

## Authorized ChatGPT docs-only write bridge

When a ChatGPT-approved handoff explicitly sets `write_bridge_sync_authorized: true`,
the normal local Codex IMPLEMENTER GO entrypoint automatically checks for a clean,
strictly fast-forwardable remote transition. The remote `NEXT_ACTION.yml` resolves
the active TASK-ID and handoff path; that handoff must bind `bridge_task_id`,
`bridge_handoff_file`, `bridge_report_file`, `previous_handoff_head`, and the
structured `bridge_allowed_paths` allowlist. Every allowed and changed path must be
under `docs/ai/`; the allowlist must include NEXT_ACTION, CURRENT_STATE, the active
handoff, and its report. Product paths are never eligible. The router fetches,
checks authority and the remote race, runs `git merge --ff-only`, then re-reads and
validates NEXT_ACTION and handoff identity before continuing. Dirty, diverged,
unapproved, unknown-authority, allowlist, product-path, and race cases are BLOCKED.
`-ApplyChatGPTDocsBridge -ExpectedRemoteTip <40-hex SHA>` remains the explicit
equivalent. All other write-unavailable cases remain `USER_RELAY_REQUIRED`.

正式順序は`START.md`の「GOの正式順序」と同一です。

1. `SESSION_START`は新規sessionだけでrepository／actorを特定する。
2. `AGENTS`を1回、`START`を1回読む。
3. PROJECT_ADAPTER、CURRENT_STATE、NEXT_ACTION、指定handoff identityをsilent readする。
4. 現在地点復元直後に実行開始時刻を固定する。
5. 現在地点4項目だけを表示する。
6. 残りのTASK、report、scope、停止条件を読む。
7. active TASK 0/1、session bindingのactor／role／session mode、executor policy、handoff identityを検証する。
8. local executable actorは`tools/route-go.ps1 -RoutingMode local_script`を使う。connector-only actorはremote branch/tagをexact commitへ1回だけresolveし、PROJECT_ADAPTER、NEXT_ACTION、handoffをすべてcommit SHAで読み、repository、requested ref、resolved commit、3 blobを含む宣言的な`connector_read_only` resultを返す。active handoffのtask、phase、actor、role、model、effort、candidate、shared candidateもexact照合する。両modeは同じresult schemaとactor／role／session判定を使う。`INDEPENDENT_REVIEWER`は`separate_session` bindingも必須にし、同じChatGPT providerでも`ORCHESTRATOR_AND_REVIEWER` sessionを独立review sessionとして扱わない。
9. 通常actor/role mismatchはrepositoryを変更せず停止する。ただし、ユーザー添付の`USER_RELAY_REQUIRED` bundle/pointer identityがname、SHA-256、bytes、format、schemaまで検証され、`relay_recipient`と`relay_recipient_role`が現在session bindingへexact一致する場合だけ、検証済みrelay importを優先する。この例外は全7 decisionで共通とし、任意messageでは起動しない。
10. ChatGPTのstate transition前に一意な一時probeの作成、読取、削除または同等のwrite bridgeを実測し、`repository_write_access: available / unavailable`を記録する。
11. write可能ならresult/evidenceとTASK、report、CURRENT_STATE、NEXT_ACTION、Progressを同じstateへ同期する。
12. write不能なら正本を更新済みと記録せず、`RELAY_BUNDLE.json`の完全情報をrepository外artifactへ保存し、`USER_RELAY_REQUIRED.yml`のbundle identityだけを返す。
13. CodexはGO router経由でbundle name、SHA-256、bytes、format、recipient actor/role、reviewed candidate、handoff HEADを検証してからreview report、TASK、CURRENT_STATE、NEXT_ACTION、Progress、次handoffを正本化する。
14. artifactも作成不能な場合だけ完全なbundle内容をchat fallbackとして返す。1行summaryへの圧縮は禁止する。
15. 終了時刻をJST秒単位でreportと依頼先情報へ記録する。

schema 2 bundleは`relay_recipient`と`result_return_to`を分離し、repository、branch、spec、shared candidate、phase、actor/role、model/effortを明示します。`REQUIREMENTS_DEFINED`はtitle、base commit/tree、priority、product identity reference、browser evidence、Claude review契約、build、rollback、handoff modeを完全に含めます。`CHANGES_REQUESTED`は全finding、severity、evidence、impact、required changeと修正完了条件を含めます。`APPROVED`、`BLOCKED`、`NEEDS_USER_DECISION`もstate tableに従う完全bundleで渡します。

独立review requestはcandidate、spec revision、開始時刻と正規化`request_id`を含めます。`request_id`はrequest-time identityを`key=value`とLFへ正規化し、末尾LFを含むUTF-8 bytesのSHA-256を大文字64桁で表します。独立reviewerは通常chatだけで完了を主張せず、`INDEPENDENT_REVIEW_COMPLETED` portable result artifactでrequest identity、完了時刻、result、finding件数／IDを返します。Codex importがTASK、NEXT_ACTION、request handoff、canonical request bundleからIDを再計算してresultとexact比較し、ChatGPTへ戻します。ChatGPTは`review_stage`付きの正式判定を行い、design／implementationのcandidateと遷移先はproject adapterで別々に解決します。

request identityの正規化順序は`review_kind`、candidate、spec revision、preferred／actual executor、provider substitution、executor policy、review role、execution mode、repository access、request時review status、reviewer model、reviewer effort、started atです。resultはpreferred executor、review role、request review status、reviewer model／effortを反復します。Codexは保存済みTASK、NEXT_ACTION、request handoff、canonical request bundleからrequest IDを個別に再計算し、resultとexact比較します。

review object presenceはdecisionとcurrent review stateで一意です。`INDEPENDENT_REVIEW_REQUESTED`はrequest required／result null、`INDEPENDENT_REVIEW_COMPLETED`はrequest null／result required、completed review後の4判定はrequest null／result required、review未実施の4判定と`REQUIREMENTS_DEFINED`は両方nullです。post-review判定前はcurrent canonical result bundleのschema、identity、request/result audit、finding全文をproperty順序非依存・array順序維持のcanonical JSONで検証します。元findingはimmutable auditとして保持し、ChatGPTは各IDへ`accepted / rejected / deferred / needs_user_decision`と理由をexact 1件記録します。Codex向けRequired changesにはaccepted findingだけを出し、他はdisposition auditへ残します。

Codex importはclean worktreeで全preflightを終えてから適用し、生成または共通validatorの失敗時はbyte-exact rollbackします。validated bundle全文を`docs/ai/reports/<TASK-ID>/RELAY_BUNDLE.json`へ保存してsemantic round-tripを検査します。

開始・終了時刻へGit時刻、commit時刻、file更新時刻を代用しません。完全なGO-only state transitionはwrite bridge利用時だけ成立します。`reset`、`stash`、`clean`、`restore`、force push、user-owned差分の上書きは明示承認なしに行いません。
