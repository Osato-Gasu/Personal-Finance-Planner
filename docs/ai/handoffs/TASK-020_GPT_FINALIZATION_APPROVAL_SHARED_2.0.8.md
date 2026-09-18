---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: GPT_ORCHESTRATOR
next_actor: CODEX_MAIN
return_to: GPT_ORCHESTRATOR
authority: GPT_APPROVED
approved_by: GPT_ORCHESTRATOR
decision: FINALIZATION_AUTHORIZED
approved_candidate: 2853db2763d8f339d606a3c9664f350cafd878cc
approved_tree: 534f84c4d41b42ef10b6430413f3f6dfbe961eed
observed_main: e7de34d7b36b7f6ec514d321a0b66381cc810fa2
released_shared_version: 2.0.8
released_shared_sha: a306ba59f33b156c1e801618bdfa892c411ce7d0
candidate_formal_ci_state: PASS
candidate_formal_ci_run_id: 35341533054
main_integration_authorized: true
completion_authorized_if_all_remaining_gates_pass: true
---

# TASK-020 GPT統括 — Shared 2.0.8最終化承認

中央AI開発GPT統括は、exact candidate
`2853db2763d8f339d606a3c9664f350cafd878cc`
(tree `534f84c4d41b42ef10b6430413f3f6dfbe961eed`) を最終受入し、
同じCodex Mainによるmain統合からCompletionまでの最終化を承認する。

## 承認根拠

- remote main observed: `e7de34d7b36b7f6ec514d321a0b66381cc810fa2`
- candidate relation: mainに対して ahead 23 / behind 0
- released Shared: 2.0.8 / `a306ba59f33b156c1e801618bdfa892c411ce7d0`
- required affected local checks: PASS
- separated read-only Luna Max VERIFY I12: PASS on exact candidate
- formal exact-candidate extended CI run `35341533054`: completed / success
- CI head_sha == candidate_sha
- governance/product/financial/build/launcher/completion/portable gates: PASS
- effective repository rulesets observed: none
- main branch observation: protected=false
- open blocking source finding: none
- no runtime verification is required for this governance-only migration source candidate

独立実装レビューは追加しない。既にexact VERIFYと正式CIがPASSしており、
今回の残作業は既存Project finalization contractに沿うauthority-sensitive integration/completionである。

## 同じMainへ許可する最終化

1. 実行直前にremote mainが上記observed mainから動いていないこと、approved candidate/ref/tree、
   released Shared identity、branch protection/effective rulesをreadbackする。
2. mainが想定baseから動いていたら書き込まずGPTへ返す。
3. approved exact candidateだけを通常fast-forwardでmainへ統合する。
4. rebase/amend/squash/force pushは禁止。repository settings、tag、GitHub Release、deploymentを変更しない。
5. source candidate bytesを変更しない。最終TASK/EVENTS/TASKS.html/return等は、
   Project completion contractに必要なmetadata-only finalizationとして扱う。
6. main統合後、released Shared 2.0.8を使ったreal downstream Planを実行し、
   `CURRENT / Enrolled=true / Lock VALID / Adapter VALID` を確認する。
7. Project contractが要求するpost-integration/main CIをexact integrated/final main subjectで実行する。
   candidate CI成功を別SHAのPASSとして流用しない。
8. post-integration CIがreal test FAILなら、main上で勝手にsource修正を続けずGPTへ返す。
   confirmed infrastructure outageならexact debtとして保持し、PASSを捏造しない。
9. canonical local mainはfast-forward-onlyで同期し、user-owned diffを消さない。
10. launcher/portable/completion safetyの必要な最終gateを実行する。
11. Completion条件がすべて満たされた場合のみTASKをCOMPLETEDへ遷移し、
    正本/TASKS.html/EVENTSを同期する。
12. cleanupはCompletion成立後のみ、non-forceかつ安全に行う。
    TASK worktree/branchが未統合Evidenceや必要参照を失う場合は削除しない。
13. TASK-001〜019の歴史、financial/product semantics、data、dependencies、docs/product、user dataを変更しない。
14. PFP以外のProject、Shared TASK-178〜184 debt、Shared TASK-182設計を変更しない。

## 完了条件

- approved candidateのmain統合readback PASS
- released Shared 2.0.8 real downstream Plan: CURRENT / Enrolled=true / Lock VALID / Adapter VALID
- required post-integration/final-main CI: PASS
- canonical local main fast-forward-only sync: PASS
- required launcher/portable/completion gates: PASS
- TASK/EVENTS/TASKS.html/current coordination pointer整合: PASS
- mainから正常利用可能
- safe cleanup可能なら完了、不可なら具体的理由を正本へ残す
- GitHub-native final returnをGPT_ORCHESTRATORへ返す

通常の修正可能なmetadata/automation失敗は同じMain内で有限に修正する。
source変更が必要になった場合だけ新candidate・再VERIFY・再承認が必要なのでGPTへ返す。
