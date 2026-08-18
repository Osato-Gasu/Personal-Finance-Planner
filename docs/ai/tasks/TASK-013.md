---
task_id: TASK-013
title: TASK-009公開監査stable ID修復
status: ready
route: TWO_SESSION_FAST
priority: high
spec_revision: 2
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: existing
handoff_file: docs/ai/handoffs/TASK-013/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: optional
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: 30cc57b05ac49dc6afa587f9d70ade571e526d9c
base_tree: 2b3039cdd499b37f7ed2f8bace9bec7d43195a60
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#delivery_plan_*
accepted_product_sha256: 98DC0649BB6232B61432EDDAEAC204CEAC763C6E530AF33272E3A3080FBC994B

review_stage: implementation
changes_requested_cycles: 0
implementation_review_attempt: 1
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
attempt_4_forbidden: true
spec_revision_reset: true
implementation_review_open_finding_ids: none
user_confirmation_required: false
user_confirmation_prompt: none
review_termination_reason: none
implementation_candidate: none
review_kind: none
review_role: none
execution_mode: existing_session
repository_access: true
review_status: not_requested
request_review_status: none
review_model: none
review_effort: none
reviewed_candidate: none
reviewed_spec_revision: none
review_request_id: none
review_started_at: none
review_completed_at: none
review_result: none
review_findings_count: 0
review_finding_ids: none
actual_executor: Codex
provider_substitution: none

shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
updated_at: 2026-08-18
---

# TASK-013 — TASK-009公開監査stable ID修復

## Purpose

TASK-009の未承認・未release product candidateをbaselineとして継承しつつ、public exposure auditのActions run／job／artifact inventoryでcanonical stable IDとmutable metadataを分離する。同一stable IDのduplicate／metadata conflict、pagination overlap、inventory／retrieval／scan／report countまたはset-hash不整合をfail-closedで拒否し、TASK-013の新candidate・新handoff・implementation review attempt 1／standardを経てのみ承認可能にする。

Spec Revision 2は、revision 1で回収不能と確認された既知のActions job 1件だけに対し、immutableな承認済みhistorical policy evidenceと、例外を利用する各auditでのfresh mandatory runtime direct-log observationを同時に要求する。回収不能なhistorical log bytesをscan済みとは扱わず、その他の欠落・失敗は引き続きfail-closedとする。

## Spec Revision 2 adoption authority

- User approval: `USER-APPROVAL-TASK-013-SPEC-REV2-20260818-151500`／option 3／`2026-08-18 15:15:00 JST`。
- Accepted design: `TASK-013_SPEC_REVISION_2_EVIDENCE_POLICY_DESIGN_REVISION_3.md`／19101 bytes／SHA-256 `C9E3FE09CA12A111967BA8809EC1DC2BE99ADFDB1CDDE43638AC0A75039CA117`。
- User approval source: `TASK-013_SPEC_REVISION_2_USER_APPROVAL.json`／497 bytes／SHA-256 `C1B3ACA192636115CCF2E7D58FE57D498DCF15D844CE4E4ED5544BC323B8347A`。
- Final disposition: `TASK-013_SPEC_REVISION_2_FINAL_DESIGN_DISPOSITION.json`／1697 bytes／SHA-256 `383F104934386DB48378C53A1BF6BC0174AB863915E60EC0BE93D5D4F78EB3D5`。
- Independent Design Revision 3 re-review: `PASS`、blocking findings 0。Prior findings `FINDING-013-R2-IDR-01`、`FINDING-013-R2-IDR-02`、`FINDING-013-R2-IDR-03` は全てresolved。
- Scope of approval: known irretrievable jobへのexact historical Actions evidence exceptionだけであり、generic missing-evidence risk acceptanceではない。
- Implementation authority: true。Release authority: false。
- Revision 1のcycles 3／attempt 3／terminal／final／terminatedとopen findings、USER_DECISION_HANDOFF、relay/import historyは監査履歴として保持する。Revision 1 attempt 4は引き続き禁止し、revision 2 attempt 1とは別物とする。

## Spec Revision 2 evidence-policy contract

- Exact static policy identityは `policy_id=task-013-spec-rev2-exact-v1`、repository `Osato-Gasu/Personal-Finance-Planner`、run `31887544173`、attempt `1`、job `95018938492`、head `25be0b48699ef350bd72a60e3b564b7dd8c1d2a4`、job status `completed`、conclusion `failure` に固定する。
- Preserved direct-log evidenceは initial `302`、final `404`、content type `application/xml`、215 bytes、SHA-256 `1CCCE68DDD68C8BD055419F893169F9C311D4F242CC957F9DC9F2CB1447C9C21` に固定する。
- Attempt jobs evidenceは status `200`、952 bytes、SHA-256 `F4AEBF5D31E457DF360008FB0384B104524D98B9859390A2D668F38BBB0ABABE`、total/count `1`、sole job `95018938492` に固定する。
- Attempt archive evidenceは `302 -> 200`、`application/zip`、22 bytes、SHA-256 `8739C76E681F900923B900C9DF0EF75CF421D39CABB54650C4B9AD19B6A76D85`、ZIP entries `0`、regular entries `0` に固定する。
- `APPROVED_HISTORICAL_UNAVAILABLE` は上記static recordが完全一致し、`filter=all` inventoryにexactly once存在し、かつそのaudit中にfresh direct-log requestを実行した場合だけ許可する。
- Runtime observationは必須であり、`runtime_observation_performed=true`、initial `302`、final `404`、content type `application/xml`、parsed error code `BlobNotFound`、body bytes `> 0`、そのexact response bytesのuppercase SHA-256を要求する。
- Fresh runtime bodyのSHA-256は2026-08-18のpreserved body SHAと一致する必要はない。Static proofとruntime proofは別々に検証・hash bindingする。
- Runtime final `410`、`403`、`5xx`、request／redirect／body read failure、empty body、MIME mismatch、error-code mismatch、hash計算不能は常にBLOCKED。Static allowlistはruntime failureを上書きしない。
- 別job、別run/attempt/head、2件目のunavailable job、non-completed job、missing artifact、unsafe archive、current/post-adoption unavailable jobには例外を適用しない。
- Canonical public fieldsは `actions_scan_complete`、`actions_evidence_gate_pass`、`actions_historical_unavailable_count`、`actions_historical_unavailable_set_sha256`、`actions_historical_unavailable_policy`、`actions_historical_runtime_observation_count`、`actions_historical_runtime_observation_set_sha256` とする。独立alias `historical_unavailable_count` はstrict proofで拒否する。
- 例外なしでは両count `0`、両set hashはempty SHA-256 `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855`、`actions_scan_complete=true`、`actions_evidence_gate_pass=true` とする。
- 例外利用時はunavailable count `1`、runtime observation count `1`、`actions_scan_complete=false` とし、全static/runtime/count/proof gateが成立した場合だけ `actions_evidence_gate_pass=true` とする。
- Inventory countはrequired job log countと一致し、retrieval count + unavailable countはrequired countと一致し、scan countはretrieval countと一致し、runtime observation countはunavailable countと一致しなければならない。
- Static/runtime canonical recordはUTF-8 no BOM、LF only、exact field order、`<field>=<value>\n`、mandatory final LF、blank/extra/omitted fieldなし、canonical unsigned integer／lowercase boolean／uppercase 64-hex SHA／exact lowercase MIMEでserializeする。
- Set bytesはcanonical sort後のrecord bytesのdirect concatenationとし、hash-of-hashesを禁止する。Static recordとruntime recordはDesign Revision 3 section 10/11のexact field orderを使用する。
- Proof consumerはstatic record/set hashとruntime record/set hashを再構成・検証し、count equality、fixed runtime values、body SHA/bytes shape、scan/evidence-gate semanticsを検証する。
- Candidate audit producerだけがfresh runtime responseを取得する。Raw runtime final-response bytesはrepository外部evidenceへ保存し、repository reportへXML bodyを複製しない。
- Release/preflight consumerはexact candidate audit proof identityを利用し、別のfresh observationでcandidate-bound proofを置換しない。別auditを実行する場合はそのaudit固有のfresh observationとproofを作る。
- High-risk read-only VERIFYはcandidate proofのruntime response SHA/bytesをrepository-external raw responseと照合し、static/runtime proof、stable IDs、`filter=all`、non-completed fail-closed、artifact/archive/history/redaction/proof-transfer/asset gateを確認する。
- Reportはhistorical logをscanしたと表現せず、1件がpolicyによりunavailableとして受理され、`actions_scan_complete=false` であることを明示する。

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
- AC11 Exact exception: exact approved run/attempt/job/headだけをhistorical unavailableとして許可し、static direct-log／attempt-jobs／attempt-archive identityの任意のmutation、2件目、別job、post-adoption missing jobをBLOCKEDにする。
- AC12 Mandatory runtime proof: exception利用auditごとにfresh `302 -> 404`／`application/xml`／`BlobNotFound`／non-empty body observationを必須化し、そのactual response SHA-256／bytesとruntime canonical record/set hashをproofへbindingする。
- AC13 Truthful completeness: exception利用時は `actions_scan_complete=false`、unavailable/runtime counts `1/1` とし、全static/runtime/count gate成立時だけ `actions_evidence_gate_pass=true` とする。Historical unavailable logをscan済みと表現しない。
- AC14 Deterministic proof: static/runtime canonical recordsをexact field order、UTF-8 no BOM、LF、final LF、canonical scalarでserializeし、sorted direct-concatenation set hashをproof consumerが再構成できる。Unknown legacy alias、field omission/addition/order/EOL/scalar mutationを拒否する。
- AC15 Verification boundary: raw runtime responseはrepository外部evidenceにのみ保持し、high-risk read-only VERIFYがcandidate proof SHA/bytesとexact照合する。Candidate exact CIとhandoff exact CI成功後もrelease authorityは付与されず、ChatGPT implementation reviewへ返す。

## Tests

- T01 Activation／governance: PowerShell 7／5.1のshared sync check、governance、REQUIREMENTS_DEFINED smoke、audit identity／normalization、overlay、completionをPASSし、startup context <=65536 bytes（目標<=61440）を確認する。
- T02 Stable-ID unit matrix: valid integer number／canonical decimal stringを受理し、null、boolean、空、0、負数、小数、指数、leading zero、whitespace、unsafe integerを拒否する。
- T03 Duplicate／conflict integration: duplicate run.id、run.id＋job.id、artifact.idを、同一metadata／異なるmetadataの双方でBLOCKEDにする。
- T04 Pagination／completeness: page跨ぎoverlap、inventory／retrieval／scan／report count mismatch、stable-key set hash／record-set hash mismatchを拒否する。
- T05 API／archive fail-closed: job log／artifactの403／404／410／5xx、request／redirect／body failure、expired artifact、symlink／hardlink／device／traversal／duplicate normalized pathを拒否する。
- T06 History／redaction regression: historical commit message、removed blob、same-blob multi-path、sensitive ref／pathをscanし、raw matched secretを出力しない。
- T07 Distribution regression: public audit proof transfer、release staging exact 5、stage／publish mutation matrix、exact_published no-op、canonical APPROVED proof、portable 284、staged HTTP 5 files／5 routesを維持する。
- T08 Full gates: Vitest 567以上、focused 69／68／86／28以上、distribution contract 77以上、public exposure audit 28以上＋新規test、normalization各21、completion各34、runtime requests／console errors／page errors 0をcandidate／handoff exact CIで確認する。
- T09 Spec Revision 2 matrix: Design Revision 3 section 18の44カテゴリを全てcoverする。Exact happy path、runtime omission/performed false、initial/final status、410/403/5xx、MIME/error code、empty body、request/redirect/read failure、runtime SHA/bytes/set hash mutation、missing runtime fields、count mismatch、wrong static/runtime stable identity、static direct/attempt-jobs/attempt-archive mutation、second/non-allowlisted/post-adoption missing job、non-completed job、count equations、empty/one-record hashes、field order/separator/CRLF/final-LF/scalar/extra/omitted field、scan/evidence gate contradiction、legacy alias、raw-runtime VERIFY binding、既存全regressionを独立caseで検証する。

## Build

- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/sync-shared-governance.ps1 -Check
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-project-overlay.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-complete-task-local.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/sync-shared-governance.ps1 -Check
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-project-overlay.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-complete-task-local.ps1
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run test:rules
- npm run test:nisa
- npm run test:ideco
- npm run test:overview
- npm run test:distribution:contract
- npm run test:public-exposure-audit
- npm run build
- npm run verify:launcher
- npm run test:portable
- npm run test:distribution
- repository-native public exposure audit CLI for working tree and exact candidate

## Rollback

Import／materialization／generator／validator failureではrepository-native transactional byte-exact rollbackを確認し、部分適用、bundle手修正、reset、restore、stash、git clean、rebase、amend、squash、history rewrite、force pushを行わない。実装failureは通常descendant commitで修正し、public objectを自動削除／rollbackしない。

## Forbidden changes

- F01 stable IDへmutable metadataを連結した複合文字列だけをduplicate identityとして使用すること。
- F02 duplicate recordを黙ってdeduplicate／merge／last-write-winsし、pagination／API不整合をPASS扱いすること。
- F03 incomplete／conflicting Actions inventoryでactions_scan_complete=true、finding 0、result PASSを生成すること。
- F04 HTTP／API／archive／history／secret／proof／asset gateをwarning、optional、best-effortへ緩和すること。
- F05 raw secret／PII／token値をconsole、report、artifact、relayへ複製すること。
- F06 AppState、migration、storage、backup、金融計算、rule、package version、launcher等の目的外変更。
- F07 existing test削除／skip／assertion弱体化／count低下、CI軽量化の混在、CI起動目的のempty commit／途中push。
- F08 tag、Release、asset、Pages、deployment、Distribution dispatch、origin/main統合、completion、reset／restore／stash／git clean／rebase／amend／squash／history rewrite／force push／filesystem force削除。
