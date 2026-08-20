---
artifact_role: active_task_frontmatter
task_id: TASK-013
title: TASK-009公開監査stable ID修復／shared v1.0.1 recovery
feature: TASK-009公開監査stable ID修復／shared v1.0.1 recovery
status: active
current_phase: implementation
implementation_mode: revision
baseline_commit: d96ebe1bcfe258185956fd0db3acf1ca15050af6
baseline_tree: 90f97b3e16aa3d0ce36cd872d1b59b9b8d49908a
candidate_commit: 1285f6745062545bb4e73a937cde141f6ab620d4
candidate_tree: 3fb36efc2fd13b9321baf11a63e798d54fe48a12
route_id: none
assignment_id: CHATGPT_ORCHESTRATOR
risk_class: high_risk
assigned_model: 5.6 Sol
assigned_effort: high
worker_plan: MAIN_SEQUENTIAL
verify_plan: AUTHORITATIVE_VERIFY
review_state: none
review_request_id: none
review_result: none
progress_state: recovery_phase_a_semantic_review
spec_revision: 3
route: none
priority: high
spec_status: accepted
current_role_id: ORCHESTRATOR_AND_REVIEWER
next_actor: ChatGPT
next_role: ORCHESTRATOR_AND_REVIEWER
session_mode: existing_or_new
handoff_file: docs/ai/handoffs/TASK-013/IMPLEMENTATION_REVIEW_HANDOFF.md
preferred_executor: ChatGPT
allowed_executors: ChatGPT
executor_policy: strict
return_to: Codex
browser_evidence_required: true
base_commit: d96ebe1bcfe258185956fd0db3acf1ca15050af6
base_tree: 90f97b3e16aa3d0ce36cd872d1b59b9b8d49908a
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#delivery_plan_*
accepted_product_sha256: 98DC0649BB6232B61432EDDAEAC204CEAC763C6E530AF33272E3A3080FBC994B
review_stage: none
changes_requested_cycles: 0
implementation_review_attempt: 1
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
attempt_4_forbidden: true
spec_revision_reset: false
implementation_review_open_finding_ids: none
user_confirmation_required: false
user_confirmation_prompt: none
review_termination_reason: none
implementation_candidate: 1285f6745062545bb4e73a937cde141f6ab620d4
review_kind: none
review_role: none
execution_mode: separate_session
repository_access: true
review_status: not_requested
request_review_status: none
review_model: none
review_effort: none
reviewed_candidate: none
reviewed_spec_revision: none
review_started_at: none
review_completed_at: none
review_findings_count: 0
review_finding_ids: none
actual_executor: Codex
provider_substitution: none
shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
updated_at: 2026-08-20
---

# TASK-013 — TASK-009公開監査stable ID修復／shared v1.0.1 recovery

## objective

TASK-009 の未承認・未release product lineageを継承し、public exposure audit の canonical stable ID、exact current auditor self-exclusion、historical evidence、count/hash closureをfail-closedで維持する。承認済み Recovery Design Revision 4 に従い、元のproduct implementation reviewを不変provenanceとして保存したまま、PFPをexact shared v1.0.1へ安全に移行し、別セッションのrecovery implementation reviewを経るまでrelease authorityを付与しない。

## scope

- `docs/ai` のproject-owned owners、active TASK、handoff/state、sync wrapper、overlay/provenance validator、限定されたTASK-013 report evidenceをshared v1契約へ移行する。
- 旧root `AGENTS.md` の全UTF-8バイトを分類し、common loader内容はmanaged loaderへ、PFP固有のproduct source authorityはPROJECT_RULESへ移す。
- original product candidate `1285f6745062545bb4e73a937cde141f6ab620d4`／tree `3fb36efc2fd13b9321baf11a63e798d54fe48a12`、original reviewed handoff `d96ebe1bcfe258185956fd0db3acf1ca15050af6`／tree `90f97b3e16aa3d0ce36cd872d1b59b9b8d49908a`、Attempt 1／standard／APPROVED／findings 0をbyte-exact evidenceとして保存する。
- shared source `Osato-Gasu/shared` version `1.0.1`、commit `4aa53fbe67edcbe2d7b6a147144b7b07022e5951`、tree `366ed1ed65cf9481b37759a9caf9a1aac38e97f2`、manifest SHA-256 `B85F3B6730FB242C81359DB25BA498259DA52C961F8259682862E5C0246D9114`だけをmigration authorityとする。
- Recovery Phase Aはlocal Commit Aとsemantic adoption evidence作成までとし、shared sync、push、Commit B、AUTHORITATIVE_VERIFY、C0以降は別の明示authorityまで行わない。

## out_of_scope

- product source、public-audit source/test、security behavior、workflow YAML、package/lock、launcher、`docs/product/**`、generated shared bytesのPhase-A変更。
- TASK-009 attempt 4、product implementation review Attempt 2、元APPROVED relayの再importまたはcurrent authority化。
- permanent failed runs `32119217442 / 95655572235` と `32209639232 / 95939580378` のrerun、relabel、delete、success扱い。
- origin/main integration、Distribution dispatch、tag、Release、asset、Pages、deployment、completion、repository visibility変更。
- Recovery Design Revision 4の非acceptable review後のB2、CHANGES_REQUESTED、追加reviewまたは追加write。

## requirements

- R02 Successor boundary: TASK-013はTASK-009 attempt 4ではない。TASK-009はcycles 3／attempt 3／terminal／final／terminated、attempt 4 forbidden、candidate未承認・未releaseのまま保持し、そのcandidateをTASK-013 approval/release identityへ流用しない。
- R03 Canonical stable keys: Actions runはrun.id、jobはrun.id＋job.idまたは実証済みrepository-wide job.id、artifactはartifact.idをcanonical positive decimal safe integerとして検証し、null、boolean、空、0、負数、小数、指数、空白、leading zero、unsafe integerを拒否する。
- R04 Duplicate/conflict: 同一stable keyの再出現はmetadata一致でもpagination duplicateとしてBLOCKED、metadata差はexplicit conflictとしてBLOCKEDとし、deduplicate、merge、last-write-winsを禁止する。
- R05 Metadata/hash: mutable metadataをstable keyから分離し、canonical field order/scalar/UTF-8 LFでstable-key set SHA-256とcanonical-record set SHA-256を導出する。
- R06 Completeness: inventory、retrieval、scan、reportのcountと両set hashは同一canonical unique object setへexact結合し、duplicate、conflict、missing、unretrieved、unscanned時にcomplete/PASSを生成しない。
- R07 API fail-closed: pagination overlap、API count不整合、HTTP 403/404/410/5xx、request/redirect/body failure、expired artifact、取得不能log/artifactをBLOCKEDとする。ただし承認済みexact historical exceptionだけはfresh runtime proofと全static/count/hash gateを必須とする。
- R08 Proof contract: report schema version 1のtarget、phase、commit/tree/blob/association、Actions provenance、release staging exact 5、finding 0をstrict検証し、missing/stale/wrong bytesをside effects 0で拒否する。
- R09 Regression matrix: run/job/artifact duplicateとconflict、pagination overlap、count/hash mismatch、malformed IDを独立caseで拒否し、false PASSを生成しない。
- R10 Security: raw reachable commit/message/metadata、tree/association、same-blob aliases、refs、working/staged bytes、Actions logs/artifacts、unsafe archive/path/link/device、secret/PII redactionの既存契約を弱めない。
- R11 Distribution: cross-job proof transfer、raw SHA-256/bytes binding、stage前exact subset、publish前full set、canonical approval proof、5-file allowlist、exact-published no-opを維持する。
- R12 Product non-regression: AppState、migration、storage、backup/import/export、金融計算、rule data/period/verifiedAt、package version、launcher、既存user bytesを変更しない。
- R13 Lifecycle: recovery current candidateへの切替はCommit Bのlocal gates、separate VERIFY、A+B publication、exact B CI SUCCESS後のC0だけで行う。元product candidateは以後provenanceにだけ残す。
- R14 Release boundary: exact recovery reviewとfinal relay/importが完了するまでrelease authorityはfalseとし、public distribution side effectsを0に保つ。
- R15 Push/CI: formal boundaryごとにlocal gates後のone pushを原則とし、empty/intermediate pushやdeterministic failure rerunを禁止する。明白なexternal transientだけrepository policyの範囲で扱う。
- R16 Auditor self-exclusion: complete `filter=all` inventoryからcaller runtime、authoritative run metadata、exact target workflow ID/path/blobに結合したcurrent auditor run 1件だけをpartitionする。second/unrelated/offline/malformed exclusion、identity substitution、unrelated non-completed jobはBLOCKED。
- R17 Recovery provenance: original review result/relayのraw bytes、SHA、candidate/tree、handoff/tree、decision/findings/attempt/profileとshared 1.0.1 source identityをproject validatorでfail-closed検証する。
- R18 Recovery review: exact recovery candidate Bは元product reviewのcoverageと表現せず、shared built-in independent review request/completion semanticsを使う別セッションreviewの対象とする。non-acceptable resultはC2でcanonicalizeしてSTOPし、Revision 4ではB2もCHANGES_REQUESTEDも作らない。

## accepted_required_changes

- Recovery Design Revision 4 bytes `30341`／SHA-256 `6F07EF8E74C0787F6A91B746ED3CD45CD7EC868FF18674FEE423CCBFAB65ED95`を実装authorityとする。
- USER approval `TASK-013_SHARED_V1_0_1_RECOVERY_USER_APPROVAL_REVISION_4.json`とIndependent Design Re-review PASS／findings 0／SHA-256 `1D4B10AAD0491A936B2D2B66B32848D9AC30AC7F7803655D302C66DF8EF99102`、final disposition `APPROVED_FOR_RECOVERY_IMPLEMENTATION_PHASE_A`に従う。
- Commit AはSchemaVersion 2 owner split、v1 TASK body structure、bootstrap wrapper、overlay/provenance validation、raw original-review evidence、managed-AGENTS classificationだけを含むlocal pre-candidate bridgeとする。
- Commit A/Bはself-referenceしないためC0までcurrent lifecycle candidateを元product candidateに維持する。Commit A単独をpush/reviewed recovery candidateとして表現しない。
- Commit A semantic reviewで承認されたexact baseline-bound planなしにmanaged AGENTS adoptionを実行しない。semantic review不合格時はforward correctionと新baseline reviewだけを許し、history rewriteしない。

## acceptance_criteria

- AC02〜AC08: stable ID、duplicate/conflict、canonical hashes、completeness、HTTP/archive fail-closed、redaction、history/distribution regression、product non-regressionが維持される。
- AC09〜AC10: recovery B/C0/review identityが段階どおりmaterializeされ、各境界のexact CIとproduction/security/workflow diff 0を確認し、public side effects 0を保つ。
- AC11〜AC15: exact historical jobだけにfresh `302 -> 404`／`application/xml`／`BlobNotFound`／non-empty body proofを認め、runtime SHA/bytes/set hashesへ結合し、利用時もscan complete falseとtruthfulに表現する。
- AC16: exact current auditor 1件だけをauthoritative workflow ID/blobと結合してpartitionし、auditee closureとconsumer revalidationを満たす。
- AC17: original product resultとrelayのrepository copiesが外部original bytes/SHAとexact一致し、全identity substitutionがBLOCKEDになる。
- AC18: Commit Aのold AGENTS classificationが全バイトをgap/overlapなく覆い、各destination anchorとcandidate blob/SHAがexactである。
- AC19: adapterにはPFP-owned variationだけが残り、PROJECT_RULES/WORKFLOWはそれぞれPFP safety/product authorityとrepository procedureだけを所有し、global proseを複製しない。
- AC20: Phase A完了時にpush 0、shared sync 0、Commit B 0、authoritative VERIFY 0、worker 0でSTOPし、exact Commit A evidenceをChatGPT semantic adoption reviewへ返す。
- AC21: Recovery Revision 4のnon-acceptable reviewはC2後にAPPROVED/CHANGES_REQUESTED/B2/追加writeなしでSTOPし、cycles 0／attempt 1を維持する。

## required_tests_evidence

- T02〜T06: stable-ID scalar matrix、duplicate/conflict、pagination/count/hash、API/archive failure、history/redaction regression。
- T07〜T10: distribution proof、full gates、approved historical evidence 44-category matrix、auditor self-exclusion 38-category matrix。
- Phase A: PS7/PS5.1 adapter parse、v1 lexical owner checks、TASK body contract、product identities、audit identity/normalization、recovery provenance repository-state/substitution tests、wrapper fail-closed bootstrap tests、`git diff --check`。
- Phase B以降: full v1 source-present/source-less sync/check、transactional tracked/untracked rollback、managed loader identity、full npm gates、portable/browser/distribution gates、exact B CI、separate high-risk AUTHORITATIVE_VERIFY。
- Evidence must record exact command, exit code, runtime, commit/tree/blob/SHA identity, worktree/index/unfinished-operation state, changed paths, and public side effects.

## user_approved_conditions_exceptions

- Exact Spec Revision 2 historical exception applies only to approved job `95018938492` with immutable static identity and fresh runtime direct-log observation on every consuming audit. It does not generalize to another job, 403/410/5xx, network failure, missing artifact, or post-adoption loss.
- Recovery Design Revision 4 authorizes only the bounded recovery chain and keeps product implementation review at cycles 0／attempt 1. A non-acceptable recovery review requires a newly user-approved Recovery Design before any repair write.
- User process preference may cap ordinary formal reviews at two, but it never weakens canonical security, data integrity, rollback, validator, required-test, release-gate, product/financial, raw-byte, or compatibility rules.
- No exception authorizes destructive Git operations, public distribution side effects, or modification of permanent failed-run history.

## rule_relations
