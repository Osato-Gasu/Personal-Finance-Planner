# RELAY HANDOFF — TASK-013

- relay_schema: 2
- task_id: TASK-013
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-013-public-audit-stable-id
- reviewed_candidate: none
- candidate_commit: none
- reviewed_handoff_head: none
- shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
- spec_revision_reset: false
- review_stage: implementation
- changes_requested_cycles: 0
- implementation_review_attempt: 1
- implementation_review_profile: standard
- implementation_review_terminated: false
- user_confirmation_required: false
- user_confirmation_prompt: none
- review_termination_reason: none
- implementation_review_open_finding_ids: none
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-013-public-audit-stable-id
- resolved_commit: 30cc57b05ac49dc6afa587f9d70ade571e526d9c
- next_action_blob: ee093e017a4dac9eb909a8a60493fb6da9948ccc
- handoff_blob: 90ab1659ab7ceff47f266ca27a3b404673c22c30
- adapter_blob: 1feb586cdac2c612ca02fee3dc1b0addf6cfab94

## Purpose

TASK-009の未承認・未release product candidateをbaselineとして継承しつつ、public exposure auditのActions run／job／artifact inventoryでcanonical stable IDとmutable metadataを分離する。同一stable IDのduplicate／metadata conflict、pagination overlap、inventory／retrieval／scan／report countまたはset-hash不整合をfail-closedで拒否し、TASK-013の新candidate・新handoff・implementation review attempt 1／standardを経てのみ承認可能にする。

## Scope

- R01 Exact activation base: transition commit 30cc57b05ac49dc6afa587f9d70ade571e526d9c／tree 2b3039cdd499b37f7ed2f8bace9bec7d43195a60／Governance CI 31945392516 attempt 1／job 95160466560 SUCCESSをexact確認し、専用branch codex/task-013-public-audit-stable-idを同commitから作成する。REQUIREMENTS_DEFINED Importはactivation-onlyとし、exact branch CI SUCCESS前に製品実装を開始しない。
- R02 Successor boundary: TASK-013はTASK-009 attempt 4ではない。TASK-009はcycles 3／attempt 3／terminal／final／terminated、attempt 4 forbidden、candidate未承認・未releaseのままGit履歴で保持する。carry-forward candidate 03825e58f61f95d2364f09246f202744e4617ba5／tree 934892b96eff8e5b66ddf67e71eefd29353a86a0は未承認product baselineであり、TASK-013のAPPROVED identity、release target、完成identityとして流用しない。
- R03 Canonical stable keys: Actions runはrun.id、jobはrun.id＋job.id（またはrepository-wideで一意であることを実証したjob.id）、artifactはartifact.idをcanonical stable keyとする。IDは正のcanonical decimal integerとして検証し、null、boolean、空、0、負数、小数、指数表記、前後空白、非canonical leading zero、unsafe integerを拒否する。
- R04 Duplicate／conflict: 同一stable keyが2回以上現れた場合、metadataが完全一致していてもpagination overlap／duplicate recordとしてBLOCKEDにする。metadataが異なる場合はduplicateに加えてexplicit conflictとしてBLOCKEDにし、黙ったdeduplicate、last-write-wins、record mergeを行わない。
- R05 Metadata separation／hashing: mutable metadataはstable keyから分離し、許可fieldをcanonical順序・canonical scalar表現でrecord化する。run／job／artifactごとにstable-key set SHA-256とcanonical-record set SHA-256をdeterministic UTF-8／LFで生成する。既存actions_*_set_sha256の意味を曖昧にせず、必要な追加provenance fieldをvalidatorとreportへ同時導入する。
- R06 Completeness binding: inventory count、retrieval count、scan count、report count、stable-key set SHA、canonical-record set SHAは同じcanonical unique object setから導出する。required job log setはcanonical job set、artifact retrieval／scan setはcanonical artifact setへexact結合し、1件でもduplicate、conflict、missing、unretrieved、unscannedがあればactions_scan_complete=trueまたはPASS reportを生成しない。
- R07 Pagination／API fail-closed: pagination overlap、同一stable keyのpage跨ぎ重複、page order差、API count不整合を拒否する。HTTP 403／404／410／5xx、request／redirect／body read failure、expired artifact、取得不能log／artifactをoptional absenceにせずBLOCKEDとする。
- R08 Proof contract: public exposure audit report schema_version 1を維持し、stable-key setとcanonical-record setのprovenanceを必須化する。candidate_ci／release_preflightのtarget、phase、ref／commit／tree／blob／association／Actions provenance、release staging exact 5、finding 0をstrict検証し、missing field、zero count、stale target、wrong phase／SHA／bytesをside_effects 0で拒否する。
- R09 Required regression tests: same run.id、same run.id＋job.id、same artifact.idについて、同一metadata duplicateと異なるmetadata conflictを独立caseで拒否する。pagination overlap、count／hash mismatch、malformed IDも独立caseで固定し、PASS report／actions_scan_complete trueを生成しないことを確認する。
- R10 Security regression preservation: raw reachable commit object／message／metadata、全tree entry、全commit,path,blob association、same-blob path alias、ref、working／staged bytes、Actions logs／artifacts、unsafe symlink／hardlink／device／traversal／duplicate normalized path、secret／PII redactionを弱体化しない。
- R11 Distribution regression preservation: FINDING-009-V2-R1-01のcross-job audit proof transfer、raw SHA-256／bytes binding、FINDING-009-R3-01のstage前asset exact-subset／publish前full-set、canonical APPROVED release-head proof、5-file allowlist、exact_published no-opを維持する。
- R12 Product non-regression: AppState、schema、migration、localStorage、backup/import/export、税・社会保険・NISA・iDeCo・overview計算、rule値／期間／verifiedAt、package version、launcher、既存user bytesを変更しない。目的外product diffは0とする。
- R13 Lifecycle／review: activation後はcycles 0／attempt 1／standard／final false／terminated false、open finding noneから開始する。実装後はtransition commitのdescendantとなる新TASK-013 candidateを作成し、candidate exact Governance CI SUCCESS後だけ直系子の6-path handoff-only commitを作成する。candidate→handoff production diff 0でimplementation review attempt 1／standardを依頼する。
- R14 Release boundary: TASK-013 candidateがAPPROVEDとなるまでtag、GitHub Release、asset、Pages設定／deployment、Distribution workflow dispatch、origin/main統合、completionを行わない。APPROVED後もrepository-native release順序とexact main CIを維持し、TASK-009 candidateをrelease targetにしない。
- R15 Push／CI policy: formal boundaryごとにlocal gate完了後の1pushを原則とし、CI起動用empty commitや途中pushを行わない。決定的source／test failureはrerunせず修正する。明確なexternal transient failureだけ同一runのfailed jobsをexact 1回rerunでき、rerun-all、再々rerun、再pushを禁止する。CI軽量化は別TASKとする。

## Out of scope

- TASK-009 attempt 4、TASK-009 convergenceの再open／reset、TASK-009 candidateのretroactive APPROVED／release。
- stable-ID修復に不要なUI、金融計算、保存data、distribution設計、workflow構成、docs/productの変更。
- HTTP／history／archive／secret／proof／asset gateの緩和、warning-only化、best-effort化。
- Governance CI軽量化、job削減、path filter追加、required gate／test count削減。
- APPROVED前のorigin/main統合、tag、GitHub Release、asset、Pages、deployment、Distribution dispatch、completion。

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- AC01 Activation: schema 2 REQUIREMENTS_DEFINED Import後、TASK-013だけがactiveとなり、phase implementation／Codex／IMPLEMENTER、spec revision 1、cycles 0／attempt 1／standard／terminated false／open finding noneへTASK、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG、Progress、canonical relayが同期する。activation exact CI SUCCESS後にSTOPする。
- AC02 Stable IDs: run、job、artifactのcanonical stable keyをstrict検証し、同一stable keyの同一metadata duplicateと異なるmetadata conflictをどちらもBLOCKEDにする。
- AC03 Hash provenance: stable-key set SHA-256とcanonical-record set SHA-256がdeterministicで、順序差では同一、metadata差ではrecord-set hashが変化し、duplicate／conflict時はreportを生成しない。
- AC04 Completeness: inventory／retrieval／scan／report countとset hashesが同一canonical setへexact一致し、pagination overlap、missing log／artifact、count／hash mismatchではactions_scan_complete true、finding 0、PASSを生成しない。
- AC05 Fail-closed: HTTP 403／404／410／5xx、request／redirect／body failure、expired artifact、unsafe archive、API permission不足をside_effects 0でBLOCKEDにする。
- AC06 Security evidence: raw secret／PII値をconsole、report、artifact、relayへ出力せず、redacted category／path／commit／blob／fingerprintだけを保持する。
- AC07 Regression: full-history／path-sensitive scan、cross-job proof transfer、asset mutation gate、canonical approval proof、public repository contract、npm publish guardを維持する。
- AC08 Non-regression: AppState、migration、storage、backup/import/export、financial results、rule data、package-lock、launcher、generated sharedの目的外diffが0で、既存test countを下げない。
- AC09 Candidate／review: TASK-013の新candidateと新handoffを作成し、candidate exact CI SUCCESS、candidate→handoff production diff 0、handoff exact CI SUCCESS後にattempt 1／standard reviewを依頼する。
- AC10 Public side effects: implementation／review中はtag、Release、asset、Pages、deployment、Distribution dispatch、origin/main、repository visibilityを変更せず、public distribution side effect 0を維持する。

## Tests

- T01 Activation／governance: PowerShell 7／5.1のshared sync check、governance、REQUIREMENTS_DEFINED smoke、audit identity／normalization、overlay、completionをPASSし、startup context <=65536 bytes（目標<=61440）を確認する。
- T02 Stable-ID unit matrix: valid integer number／canonical decimal stringを受理し、null、boolean、空、0、負数、小数、指数、leading zero、whitespace、unsafe integerを拒否する。
- T03 Duplicate／conflict integration: duplicate run.id、run.id＋job.id、artifact.idを、同一metadata／異なるmetadataの双方でBLOCKEDにする。
- T04 Pagination／completeness: page跨ぎoverlap、inventory／retrieval／scan／report count mismatch、stable-key set hash／record-set hash mismatchを拒否する。
- T05 API／archive fail-closed: job log／artifactの403／404／410／5xx、request／redirect／body failure、expired artifact、symlink／hardlink／device／traversal／duplicate normalized pathを拒否する。
- T06 History／redaction regression: historical commit message、removed blob、same-blob multi-path、sensitive ref／pathをscanし、raw matched secretを出力しない。
- T07 Distribution regression: public audit proof transfer、release staging exact 5、stage／publish mutation matrix、exact_published no-op、canonical APPROVED proof、portable 284、staged HTTP 5 files／5 routesを維持する。
- T08 Full gates: Vitest 567以上、focused 69／68／86／28以上、distribution contract 77以上、public exposure audit 28以上＋新規test、normalization各21、completion各34、runtime requests／console errors／page errors 0をcandidate／handoff exact CIで確認する。

## Forbidden changes

- F01 stable IDへmutable metadataを連結した複合文字列だけをduplicate identityとして使用すること。
- F02 duplicate recordを黙ってdeduplicate／merge／last-write-winsし、pagination／API不整合をPASS扱いすること。
- F03 incomplete／conflicting Actions inventoryでactions_scan_complete=true、finding 0、result PASSを生成すること。
- F04 HTTP／API／archive／history／secret／proof／asset gateをwarning、optional、best-effortへ緩和すること。
- F05 raw secret／PII／token値をconsole、report、artifact、relayへ複製すること。
- F06 AppState、migration、storage、backup、金融計算、rule、package version、launcher等の目的外変更。
- F07 existing test削除／skip／assertion弱体化／count低下、CI軽量化の混在、CI起動目的のempty commit／途中push。
- F08 tag、Release、asset、Pages、deployment、Distribution dispatch、origin/main統合、completion、reset／restore／stash／git clean／rebase／amend／squash／history rewrite／force push／filesystem force削除。

Validated full bundle: docs/ai/reports/TASK-013/RELAY_BUNDLE.json
