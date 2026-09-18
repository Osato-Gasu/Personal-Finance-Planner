---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: GPT_ORCHESTRATOR
next_actor: CODEX_MAIN
return_to: GPT_ORCHESTRATOR
authority: GPT_APPROVED
approved_by: GPT_ORCHESTRATOR
decision: SHARED_READER_BLOCKER_RESOLVED_RESUME_AUTHORIZED
resolved_issue_id: SHARED-207-HISTORICAL-EVENT-CLASSIFICATION
released_shared_version: 2.0.8
released_shared_sha: a306ba59f33b156c1e801618bdfa892c411ce7d0
implementation_authorized: true
main_integration_authorized: false
---

# TASK-020 GPT統括 — Shared 2.0.8で同じMainを再開

Shared TASK-184のreader互換hotfixをGPT統括が受入し、Shared 2.0.8をrelease identityとして確定した。

- repository: `Osato-Gasu/shared`
- version: `2.0.8`
- exact main SHA: `a306ba59f33b156c1e801618bdfa892c411ce7d0`

TASK-020のShared 2.0.7 reader blockerは解消済み。
同じCodex Mainで継続する。別Mainを作らない。

## 解消確認

Shared 2.0.8のexact regressionでは、TASK-020の実E0011
`actions_availability_observation` をordinary eventとして受理し、
同じcurrent historyからE0040を一意に解決できることを確認済み。

履歴の削除・書換え、E0011 field変更、minimal CIへのevent envelope追加、
reader bypassは不要かつ禁止。

## 再開scope

1. `docs/ai/SHARED_RULES.lock.yml` をschema2の
   Shared 2.0.8 / `a306ba59f33b156c1e801618bdfa892c411ce7d0` へ更新。
2. released 2.0.8 contractでadapter/bootstrap/SharedSync/TASK HTML/CI policyを再確認。
3. product source、financial rules、data、dependencies、`docs/product/**`、root launcher内容は変更しない。
4. 既存2.0.6 candidate `e019f737f52e8e499126478ae46dba4e7cf82166` の有効なhistorical evidenceは保持するが、
   2.0.8 lock変更後のcandidate PASSへ流用しない。
5. 2.0.8 target changeに影響するlocal testsを実行し、unaffected evidenceはidentity不変を確認して再利用してよい。
6. source changeなので新exact candidateをfreeze/pushし、separated read-only Luna Max VERIFYを実行。
7. required extended formal CIを新candidate exact SHAで実行。
8. real test FAILは同じMainで修正→新candidate→再VERIFY/CI。
   confirmed infrastructure outageだけPENDING_REMOTE_CI。
9. main統合は新candidateに対するGPT統括の明示承認後のみ。
10. approved integration後、released Shared real downstream Planで
    CURRENT / Enrolled=true / Lock VALID / Adapter VALIDを確認。
11. canonical local main、launcher/portable completion safety、cleanupは既存Project条件を維持。

## 禁止

- 過去e019f7のformal CI SUCCESSを新2.0.8 candidateのPASSとして扱わない。
- historical EVENTS rewriteやreader bypassを行わない。
- product変更、financial semantics変更、dependency upgrade、新製品TASK開始を行わない。
- rebase/amend/squash/force push、reset/clean/restore/stashでuser差分を消さない。
- GPT承認前のmain/release/tag変更を行わない。

完了したらGitHub-nativeでGPT_ORCHESTRATORへ正式返却する。
