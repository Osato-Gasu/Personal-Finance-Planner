# TASK-009 revision 2 implementation handoff

- relay_schema: 2
- task_id: TASK-009
- decision: REQUIREMENTS_DEFINED
- spec_revision: 2
- spec_revision_reset: true
- phase: implementation
- actor: Codex
- role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- session_mode: existing_session
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- repository_visibility: public
- branch: codex/task-009-distribution
- candidate_commit: none
- base_commit: df5b53d3608dc59b74f34ea4cd9ed85ece6265d2
- base_tree: eefa6dbb315753c625ebb65ee6e9fc82d637a48b
- reset_ci_run: 31902724613
- reset_ci_attempt: 1
- reset_ci_job: 95055833945
- shared_version: 0.12.25
- shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
- shared_commit: f07571d3e8745b9a49a28b1ac77e211c210146a3
- shared_tree: 4e0ba4dbea24cba9a9816eb1486e63e7e583c4fc
- shared_manifest_sha256: ADA91C21DF52BA7DF2B61D0CBCA5EC990E718A22339FF924A24B85D3B7016FBE
- approval_id: USER-APPROVAL-TASK-009-PUBLIC-20260816-022215
- approval_evidence_sha256: 781A6207DC4031E36A6771048386981D13120CF35C6CDC421819ABFA697089D5
- changes_requested_cycles: 0
- implementation_review_attempt: 1
- implementation_review_profile: standard
- implementation_review_terminated: false
- implementation_review_open_finding_ids: none
- implementation_candidate: none
- review_status: not_requested
- public_side_effects_added_by_reset_or_activation: 0

## Objective

`docs/ai/tasks/TASK-009.md`のspec revision 2要件を、reset baseから新規に実装する。revision 1 candidateを再利用せず、新しいrevision 2 candidate、candidate exact Governance CI、production diff 0の別handoff-only commitを作る。candidate exact CI SUCCESS後だけimplementation review attempt 1／standardを依頼し、release以降へは進まない。

## Public visibility and audit boundary

- repository visibilityはPublicのまま維持する。privateへ戻さない。
- USER approvalは`USER-APPROVAL-TASK-009-PUBLIC-20260816-022215`、approval evidence SHA-256は`781A6207DC4031E36A6771048386981D13120CF35C6CDC421819ABFA697089D5`。
- Public化前auditは全reachable object／refsと取得可能なActions logを対象にPASSし、high-confidence credential、private key、live token、private financial export、unintended user-owned fileはいずれも0だった。
- audit evidenceは`C:\Users\owner\Development\personal\audit\TASK-009-public-visibility-20260816-022215`にありimmutableとして扱う。
- commit history、branch metadata、公開対象Actions run／log、Release metadata／assetはPublicとなり、第三者forkは作成・存続し得る。

## Revision 1 immutable audit

- candidate commit: `49a70b1500420320c566501505d6e70be044ef7c`
- candidate tree: `6a731ff862d4844ab218404c1891a95e538dca68`
- candidate parent: `00667a01fbf769fc583c1f6b129b5f8b012f7c43`
- candidate Governance CI: `31877048549` SUCCESS
- handoff commit: `95562d46da80eddb04985a934fe0dd6c5ad4384f`
- handoff tree: `815fed97ee5c23bd9ea16545481f30942129414b`
- handoff Governance CI: `31877767077` SUCCESS
- terminal substantive review: non-pass
- `FINDING-009-R3-01`はrevision 2のR10／AC06／T06／F04へ非緩和release gateとして取り込む。stage前asset exact-subset検証とpublish前full-set再検証を実装し、extra／missing／duplicate／digest／bytes mismatchではupload／PATCHを0にする。
- revision 1 candidate／handoff／findingを削除、rewrite、revision 2 candidateとして再利用しない。

## Required implementation contract

- purpose、R01～R15、out-of-scope、AC01～AC10、T01～T08、F01～F08は`docs/ai/tasks/TASK-009.md`の全文を正本とし、省略・要約・緩和しない。
- source／test／tool／workflow／docsの実装はrevision 2要件の範囲に限定する。
- product implementation中もtag、Release、Pages設定／deployment、Distribution workflow dispatchを行わず、public side effectを0に保つ。
- 全local gate成功後にrevision 2 candidateを通常commit／pushする。
- candidate exact Governance CI SUCCESS後だけ、その直系子としてhandoff-only commitを作成する。candidate→handoff production diffは0とする。
- handoff exact Governance CI SUCCESS後にSTOPし、review判定、release、origin/main統合、実配布、completionを行わない。

## Required validation

- PowerShell 7／Windows PowerShell 5.1のgovernance、REQUIREMENTS_DEFINED smoke、audit identity／normalization、overlay、completion。
- `npm ci`、typecheck、lint、format:check、Vitest 510以上、focused 69／68／86／28以上、distribution contract 48以上、build、launcher freshness、portable 284以上、staged HTTP 5 files／5 routes。
- runtime requests、console errors、page errorsは0。
- candidate exact CIはhead SHA／branch／push event／workflow name／conclusionを固定する。

## Stop boundary

このhandoffはrevision 2 product implementationからcandidate／handoff exact CIまでのみを許可する。implementation review、判定、release、origin/main統合、tag、GitHub Release、asset、Pages、deployment、Distribution dispatch、completionは別の正式指示まで禁止する。
