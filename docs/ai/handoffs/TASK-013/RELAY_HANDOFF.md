# RELAY HANDOFF — TASK-013

- relay_schema: 2
- task_id: TASK-013
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-013-public-audit-stable-id
- reviewed_candidate: bf70d55f6e7649c4b80a64e3138f2d0385df34b2
- candidate_commit: bf70d55f6e7649c4b80a64e3138f2d0385df34b2
- reviewed_handoff_head: 8a10bde5859d24e35d32e119d0ba668a29f5c4ea
- shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
- spec_revision_reset: false
- review_stage: implementation
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: narrowed
- implementation_review_terminated: false
- user_confirmation_required: false
- user_confirmation_prompt: none
- review_termination_reason: none
- implementation_review_open_finding_ids: FINDING-013-R1-01
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-013-public-audit-stable-id
- resolved_commit: 8a10bde5859d24e35d32e119d0ba668a29f5c4ea
- next_action_blob: 0315cdebee708cc3e68e85cdf6fb37c61e223bc6
- handoff_blob: 5b3ab183e643fe8ad4001d3482d1aee8d02407ec
- adapter_blob: 1feb586cdac2c612ca02fee3dc1b0addf6cfab94
- implementation_candidate: bf70d55f6e7649c4b80a64e3138f2d0385df34b2

## Purpose

TASK-013 spec revision 1 implementation review attempt 1／standardでcandidate bf70d55f6e7649c4b80a64e3138f2d0385df34b2をexact reviewし、canonical stable-ID inventory修復は成立している一方、Actions list APIのtotal_countをpagination completenessへ結合していない残存MAJOR security／release-gate違反をCHANGES_REQUESTEDとしてCodexへ返す。attempt 2／narrowedではaccepted findingを非緩和で修正し、新candidateとproduction diff 0のreview handoffを作成する。

## Scope

- review対象はactivation 184d4da3f79443416f0570aec2b029d4c2c72202／tree 86b0f2d9e9ded5618c80d2062ae1602b0f907e1cからcandidate bf70d55f6e7649c4b80a64e3138f2d0385df34b2／tree 521da3403ab9b603e8ff6bf1b198542a9ffc817bまでの4-path実装diffへ固定する。candidateはactivationの直系子である。
- formal review handoffは8a10bde5859d24e35d32e119d0ba668a29f5c4ea／tree 8300019f0a04cbcdbf8cb9d5dc6f9ce5920b5c58／direct parent candidateで、candidate→handoffはrepository-native 6 governance／review pathsだけ、production diff 0である。
- activation CI 31947743040／attempt 1／job 95166339042、candidate CI 31951414720／attempt 1／job 95175329629、handoff CI 31952103640／attempt 1／job 95177057677は各exact SHA、branch、push event、Governance CI、SUCCESSへ一致する。
- canonical positive integer ID、run ID／run+job ID／artifact ID stable key、fixed-order typed metadata record、duplicate／conflict拒否、stable-key／record-set hashは要件へ整合する。
- page 1の100件とpage 2のsame stable-ID overlap、HTTP 403／404／410／5xx、request／redirect／body failure、unsafe archive、full-history／path-sensitive scan、secret redactionは動的testでPASSしている。
- Vitest 604、focused 69／68／86／28、distribution contract 77、public audit 65、normalization各21、completion各34、portable 284、staged HTTP 5 files／5 routes、runtime／console／page errors 0を確認する。
- working-tree audit 2990 bytes／F75A78251CD440E318FB8E9B2BB402A3DB40C141AED769BAB962D8A4972B8B8E、candidate audit 2990 bytes／F38F632FF33EA27DD618C6336A8B93762FDC914E70F040D2E430CEC5AAC7EC84はfindings 0／PASSとして監査保持する。
- TASK-009はcycles 3／attempt 3／terminal／final／terminated、attempt 4 forbidden、candidate未承認・未releaseのまま保持され、TASK-013 approval／release identityへ流用されていない。
- repositoryはpublic、origin/mainは0dbc4fb102c92a6df12331540c6cc11010258f54のまま、tag／Release／deployment／workflow_dispatch／PRは0、Pagesは未構成である。
- CHANGES_REQUESTED Import後はcycles 1／attempt 2／narrowed／final false／terminated falseへ進み、FINDING-013-R1-01を唯一のopen findingとして保存する。

## Out of scope

- TASK-013 spec revision 1のPurpose、R02～R15、AC02～AC10、T02～T08、F01～F08の変更、削除、要約、緩和。
- FINDING-013-R1-01のID、本文、severity、review_scope、prior_finding_idの変更、deferred／accepted-risk／optional化。
- 既に合格したstable-ID duplicate／conflict、hash provenance、HTTP／archive／history／proof／asset gateの再設計または弱体化。
- AppState、migration、storage、backup/import/export、金融計算、rule値、package version、launcher等の目的外変更。
- origin/main統合、tag、Release、asset、Pages、deployment、Distribution dispatch、completion、TASK-009のreopen／attempt 4。
- CI軽量化、required gate削減、test削除／skip／弱体化。

## Required changes

- FINDING-013-R1-01 [MAJOR] tools/public-exposure-audit.mjs; tools/public-exposure-audit-lib.mjs; tests/public-exposure-audit.test.mjs; docs/ai/reports/TASK-013/IMPLEMENTATION_REPORT.md: GitHub Actions list応答のAPI total_countがpagination／inventory completenessへ結合されていない。githubPagesは対象配列だけをpage順に連結し、page lengthが100未満になった時点で返すため、APIが宣言したtotal_countと実際の取得件数が不一致でも、取得済みsubsetを完全なcanonical inventoryとしてstable-key hash、record-set hash、retrieval／scan count、actions_scan_complete=trueへ進められる。 Evidence: candidate bf70d55f6e7649c4b80a64e3138f2d0385df34b2のtools/public-exposure-audit.mjs::githubPagesは、`const current = response[key] ?? response; values.push(...current); if (current.length < 100) return values;`だけで、workflow runs、各runのjobs、artifactsが返す`total_count`の存在、型、page間一致、累積取得件数とのexact一致を確認しない。tests/public-exposure-audit.test.mjsはstable-ID page overlapを検証するが、total_count欠落／malformed／過大／過小／page間変更の動的negative testを持たない。 Impact: GitHub APIのpagination欠落、partial response、stale page、proxy／mock不整合等でActions run、job、artifactの一部が取得されなくても、取得済みsubsetについてcountとhashが整合したPASS proofを生成できる。未取得log／artifactにcredential、PII、private financial exportが存在してもcandidate_ci／release_preflightが見逃し得るため、R07、AC04、T04、F03／F04に反する非緩和security／release gate違反である。 Required: Actions list response専用のfail-closed pagination helperを実装し、各pageがobject、対象array、nonnegative safe integer total_countを持つこと、page間でtotal_countが不変であること、累積件数がtotal_countを超えないこと、終了時の累積件数がtotal_countへexact一致することを検証する。runs／artifactsはglobal total_count、jobsはrunごとのtotal_countを検証し、mismatch、missing、malformed、page間変更をjob log／artifact content retrievalおよびreport write前にBLOCKEDとする。run／job／artifactそれぞれについてtotal_count欠落、malformed、過大、過小、page間変更の動的negative testを追加し、既存のstable-ID duplicate／conflict、record-set hash、HTTP／archive／history／redaction／proof-transfer／asset gateを回帰させない。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- CHANGES_REQUESTED Import後、TASK-013はimplementation／changes_requested、Codex／IMPLEMENTER、cycles 1／attempt 2／narrowed／terminated false、open finding FINDING-013-R1-01へrepository-nativeに同期する。
- runs、各runのjobs、artifactsのlist responseでtotal_countを必須のnonnegative safe integerとして検証し、page間で不変とする。
- 累積page record数がtotal_countを超えた時点、または最終page後にtotal_countへ一致しない場合、content retrieval／report write前にBLOCKEDとする。
- validated API total count、inventory count、retrieval count、scan count、report count、stable-key set hash、record-set hashが同じcanonical inventoryへ結合される。
- total_count missing、malformed、過大、過小、page間変更の各caseでactions_scan_complete true／finding 0／PASS reportを生成しない。
- 既存のstable-ID duplicate／conflict、pagination overlap、HTTP／archive／history／redaction、proof transfer、asset mutation、canonical approval proofを維持する。
- 全local gateと新規attempt 2 candidate exact Governance CI SUCCESS後だけ直系子handoffを作り、candidate→handoff production diffを0にする。
- 実装／handoff中もrepository visibility、origin/main、tag、Release、Pages、deployment、Distribution dispatchを変更しない。

## Tests

- run list: total_count missing／negative／non-integer／unsafe、actual recordsより大きい／小さい、page 1とpage 2で変更するresponseをそれぞれBLOCKEDにする。
- job list: runごとのtotal_countと取得jobs件数の過大／過小／page間変更をBLOCKEDにし、job log request数0、report file不存在を確認する。
- artifact list: total_count mismatch／missing／page間変更をBLOCKEDにし、artifact ZIP request数0、report file不存在を確認する。
- pagination overlap: same stable ID identical metadata／conflicting metadataのrun／job／artifact caseを引き続きcontent retrieval前に拒否する。
- proof validation: API total provenance fieldを追加する場合、missing／wrong countをside_effects 0で拒否する。
- hash／ID regression: canonical ID matrix、stable-key／record-set hash determinism、metadata conflict時のraw secret非出力を維持する。
- full regression: Vitest 604以上＋新規test、focused 69／68／86／28、distribution 77以上、public audit 65以上＋新規test、normalization各21、completion各34、portable 284、staged HTTP 5／5、runtime／console／page errors 0。
- candidate／handoffの新規exact Governance CIで全required stepsをSUCCESSにする。

## Forbidden changes

- total_countを無視、optional、warning、best-effortとして扱うこと。
- page lengthだけでpagination completeと判定し、API totalと最終inventory countを比較しないこと。
- total_count mismatch時にjob log／artifact ZIPを取得、actions_scan_complete true、finding 0、PASS reportを生成すること。
- duplicate recordsを黙ってdeduplicate／merge／last-write-winsすること。
- raw secret／PII／token、unbounded mutable metadataをerror、report、artifact、relayへ複製すること。
- 既存のstable-ID、HTTP／archive／history／proof／asset／approval gateを弱体化すること。
- existing test削除／skip／assertion弱体化／count低下、CI軽量化の混在。
- TASK-009 attempt 4／reopen／retroactive approval／release、origin/main統合、tag、Release、Pages、deployment、Distribution dispatch、completion。
- reset、restore、stash、git clean、rebase、amend、squash、history rewrite、force push、filesystem force削除。

Validated full bundle: docs/ai/reports/TASK-013/RELAY_BUNDLE.json
