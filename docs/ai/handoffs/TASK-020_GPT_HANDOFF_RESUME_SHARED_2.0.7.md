---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: GPT_ORCHESTRATOR
next_actor: CODEX_MAIN
return_to: GPT_ORCHESTRATOR
authority: GPT_APPROVED
approved_by: GPT_ORCHESTRATOR
decision: SPEC_CHANGE_RESOLVED_RESUME_AUTHORIZED
resolved_issue_id: SPEC-020-CI-EVENT-ENVELOPE
released_shared_version: 2.0.7
released_shared_sha: ba478e518e895e89aaa56156d5d713f5ebb11fe6
implementation_authorized: true
main_integration_authorized: false
---

# TASK-020 GPT統括 — Shared 2.0.7で同じMainを再開

Shared TASK-183のhotfixをGPT統括が受入し、Shared 2.0.7をrelease identityとして確定した。
released identityは以下。

- repository: `Osato-Gasu/shared`
- version: `2.0.7`
- exact main SHA: `ba478e518e895e89aaa56156d5d713f5ebb11fe6`

TASK-020のSPEC_CHANGE_REQUIREDは解消済み。同じCodex Mainで継続する。別Mainを作らない。

## 既存証拠の扱い

旧2.0.6 candidate `e019f737f52e8e499126478ae46dba4e7cf82166` は、
required local checks、separated Luna Max VERIFY、formal exact-SHA CI run
`35314250383` SUCCESSまで到達している。

そのcompleted CI resultはShared 2.0.7のcanonical minimal schema
（required 6 fields + optional runner_kind、event_id/typeなし）でEVENTSへ記録する。
この過去runを、新しい2.0.7 lock candidateのCI PASSとして流用しない。

## 再開scope

変更はShared target identityの2.0.7 rebaseと、それに必要な最小tracking/生成物に限定する。

1. `docs/ai/SHARED_RULES.lock.yml` をschema2の
   Shared 2.0.7 / `ba478e518e895e89aaa56156d5d713f5ebb11fe6` へ更新。
2. 2.0.7 released contractでadapter/bootstrap/SharedSync/TASK HTML/CI policyを再確認。
3. product source、financial rules、data、dependencies、`docs/product/**`、root launcher内容は変更しない。
4. 既存e019 candidateから2.0.7 target changeに影響するlocal testsだけ再実行し、
   unaffected valid evidenceはidentity不変を確認して再利用してよい。
5. source changeなので新しいexact candidateをfreeze/pushし、separated read-only Luna Max VERIFYを実行。
6. required extended formal CIを新candidate exact SHAで実行。
7. real test FAILは同じMainで修正→新candidate→再VERIFY/CI。confirmed infrastructure outageだけPENDING_REMOTE_CI。
8. main統合は新candidateに対するGPT統括の明示承認後のみ。
9. approved integration後にreleased Shared real downstream Planで
   CURRENT / Enrolled=true / Lock VALID / Adapter VALIDを確認。
10. canonical local main、launcher/portable completion safety、cleanupは既存Project条件を維持する。

## 禁止

- 旧e019 candidateのformal CI SUCCESSを新candidateのPASSとして扱わない。
- Shared2.0.6 parser回避、event_id/typeのminimal CI recordへの追加、historical rewriteをしない。
- product変更、financial semantics変更、dependency upgrade、新製品TASK開始をしない。
- rebase/amend/squash/force push、reset/clean/restore/stashでuser差分を消さない。
- GPT承認前のmain/release/tag変更をしない。

完了したらGitHub-nativeでGPT_ORCHESTRATORへ正式返却する。
