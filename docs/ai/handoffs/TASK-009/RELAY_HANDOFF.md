# RELAY HANDOFF — TASK-009

- relay_schema: 2
- task_id: TASK-009
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-009-distribution
- reviewed_candidate: b169407cafcdf51627b0a51b43637411dbf6b3c7
- candidate_commit: b169407cafcdf51627b0a51b43637411dbf6b3c7
- reviewed_handoff_head: 1025b9ba7610616a59eef9ec54d1afc61b3f039e
- shared_candidate: f07571d3e8745b9a49a28b1ac77e211c210146a3
- spec_revision_reset: false
- review_stage: implementation
- changes_requested_cycles: 2
- implementation_review_attempt: 3
- implementation_review_profile: terminal
- implementation_review_final: true
- implementation_review_terminated: false
- attempt_4_forbidden: true
- user_confirmation_required: false
- user_confirmation_prompt: none
- review_termination_reason: none
- implementation_review_open_finding_ids: FINDING-009-V2-R1-02
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-009-distribution
- resolved_commit: 1025b9ba7610616a59eef9ec54d1afc61b3f039e
- next_action_blob: a9e0891a9ed5a8944084b39e033697b8bb070d6f
- handoff_blob: 6eda29a04f3619c519446894a35d32f04e35dd81
- adapter_blob: 1feb586cdac2c612ca02fee3dc1b0addf6cfab94
- implementation_candidate: b169407cafcdf51627b0a51b43637411dbf6b3c7

## Purpose

TASK-009 spec revision 2 implementation review attempt 2／narrowedでcandidate b169407cafcdf51627b0a51b43637411dbf6b3c7をexact reviewし、Actions job log／artifact取得不能を黙殺してpublic exposure auditを完了扱いできる残存security findingを非緩和CHANGES_REQUESTEDとしてCodexへ返す。review attempt 3／terminal／finalではFINDING-009-V2-R1-02を完全修正した新candidateとproduction diff 0のreview handoffを作成し、attempt 4を作成しない。

## Scope

- review対象はcandidate b169407cafcdf51627b0a51b43637411dbf6b3c7／tree 2f99289bbc88e510ad4f877e14814b36d4cc2b3c／direct parent CHANGES_REQUESTED Import d44910cdcd409e8e7666d6238a06b81522ae790f、formal review handoff 1025b9ba7610616a59eef9ec54d1afc61b3f039e／tree 830339a5f8cfa0b37ed45ce6cf141cc56d02c841／direct parent candidateへ固定する。
- attempt 1 replacement relayはTASK-009_CHANGES_REQUESTED_V2_R1_RELAY_A713B0D07B80.json／15346 bytes／SHA-256 A713B0D07B80147CE40A80AD466753C42EF71B03A9287260DB4C22C5A2B00D4C、Import commit d44910cdcd409e8e7666d6238a06b81522ae790f／tree 38a5292937f2c71b5866763ccb465694ccb67fc6／Governance CI 31915260229 attempt 1／job 95086041438 SUCCESSとして監査保持する。
- candidate Governance CI 31916564833 attempt 1／job 95089202279とhandoff Governance CI 31917453165 attempt 1／job 95091637044は、各head SHA、branch、push event、workflow名、conclusion SUCCESSへexact一致する。
- candidate→handoff差分はboard/PROGRESS.html、docs/ai/CURRENT_STATE.md、docs/ai/NEXT_ACTION.yml、docs/ai/handoffs/TASK-009/IMPLEMENTATION_REVIEW_HANDOFF.md、docs/ai/reports/TASK-009/IMPLEMENTATION_REPORT.md、docs/ai/tasks/TASK-009.mdの6 pathだけでproduction diff 0である。
- current convergenceはspec revision 2、review_stage implementation、changes_requested_cycles 1、implementation_review_attempt 2、implementation_review_profile narrowed、implementation_review_final false、implementation_review_terminated false、attempt_4_forbidden falseである。
- FINDING-009-V2-R1-01のcross-job public audit proof transferは解消済みとして回帰防止し、preflight artifactのproof path、SHA-256／bytes binding、missing／wrong identity拒否、post-live repository-native validationを維持する。
- FINDING-009-V2-R1-02は同じID、MAJOR、review_scope security、prior_finding_id nullのまま未解消findingとして扱う。githubBytesとscanGithubはActions job log／artifact ZIPのHTTP 404／410その他の取得不能を黙殺せず、監査全体をBLOCKEDにしなければならない。
- raw commit object／message／metadata、全tree entry、全commit,path,blob association、path-sensitive alias、ref、working／staged bytes、Actions logs／artifacts、release staging、unsafe archive entry、secret redaction、phase-specific provenance、zero-count rejectionを回帰させない。
- CHANGES_REQUESTED Import後はcycles 2／attempt 3／terminal／terminated falseへ遷移し、TASK frontmatterのproject-specific audit fieldをimplementation_review_final true／attempt_4_forbidden trueへ同期する。NEXT_ACTIONへunsupported fieldを手追加しない。
- Import governance-only commitの新規exact branch Governance CI SUCCESS後だけfinding修正へ進み、attempt 3 candidate exact CI SUCCESS後だけ直系子のhandoff-only commitを作成する。
- repository visibility public、origin/main、tag、Release、asset、Pages、deployment、Distribution workflow_dispatch、PRを変更せず、implementation／handoff工程のdistribution public side effectを0に維持する。

## Out of scope

- TASK-009 spec revision 2のPurpose、R01～R15、Out of scope、AC01～AC10、T01～T08、F01～F08の削除、要約、緩和またはrevision変更。
- FINDING-009-V2-R1-02のID、severity、review_scope、prior_finding_idの変更、deferred化、accepted-risk化、optional化、documentation-only化。
- FINDING-009-V2-R1-01の再設計、public audit proof transfer、full-history scan、asset mutation safety、canonical APPROVED proofの弱体化。
- repository visibility変更、tag、GitHub Release、asset、Pages設定／deployment、Distribution workflow dispatch、origin/main統合、release、completion。
- AppState、migration、storage、backup/import/export、金融計算、rule値、verifiedAt、user data bytesの目的外変更。
- review attempt 2の再実施、attempt 4、generated shared直接編集、CI軽量化のTASK-009への混在。

## Required changes

- FINDING-009-V2-R1-02 [MAJOR] tools/public-exposure-audit.mjs; tools/public-exposure-audit-lib.mjs; tests/public-exposure-audit.test.mjs; docs/ai/reports/TASK-009/IMPLEMENTATION_REPORT.md: public exposure auditの`githubBytes`はActions job log／artifact ZIP取得時のHTTP 404／410を`null`として返し、`scanGithub`は未取得log／artifactを黙ってskipできる。その結果、列挙済みActions dataを実際には取得・scanしていなくても`actions_scan_complete: true`のprovenanceとfinding 0のPASS reportを生成できる。 Evidence: candidate b169407cafcdf51627b0a51b43637411dbf6b3c7の`tools/public-exposure-audit.mjs`では、`githubBytes`が404／410をnon-fatal absenceとして扱い、caller側の`scanGithub`がnull responseを継続可能である。403や一部API failureのnegative testはあるが、job log 404／410とartifact download 404／410をそれぞれfail-closedで証明するtestがない。Actions run／job／artifact inventoryをprovenanceへ結合していても、列挙後のcontent取得欠落をcomplete=falseまたはBLOCKEDへ反映しないため、scan completenessを偽装できる。 Impact: 公開済みActions logまたはartifactが削除、期限切れ、取得不能、API不整合の状態でも全履歴public exposure auditがPASSし、未scan bytesにcredential、PII、private financial export等が存在する可能性をrelease／Pages preflightが見逃す。R08、AC04、AC05、T05、F02、F06のsecurityおよびrelease gateを迂回できるためnarrowed profileでも緩和できない。 Required: `githubBytes`は403だけでなく404／410を含む全non-success response、redirect／body取得不能、API read failureをfail-closed errorとして扱い、job log／artifact ZIPを取得できなければpublic audit全体をBLOCKEDにする。`scanGithub`は列挙した全required job log／artifactの取得・scan完了を追跡し、1件でも未取得なら`actions_scan_complete: true`やPASS reportを生成しない。job log 404、job log 410、artifact download 404、artifact download 410を独立negative testで固定し、403／5xx／content read failureも維持する。成功pathでは全inventory count、set SHA、scan countが一致することを検証し、raw commit／tree／association／path alias／ref／unsafe archive／secret redaction／FINDING-009-V2-R1-01 proof transferを回帰させない。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- relay Validate／Import前にbranch tip、tree、routing blobs、shared lock、candidate／handoff／CI、public stateをexact確認し、不一致時はrepositoryを変更しない。
- Import後、TASK-009はimplementation／changes_requested、Codex／IMPLEMENTER、cycles 2／attempt 3／terminal／terminated falseへrepository-nativeに同期し、TASK frontmatterでfinal true／attempt 4 forbidden trueを監査可能に保持する。
- Actions job logのHTTP 404と410をそれぞれBLOCKEDとし、null skip、PASS report、actions_scan_complete trueを許可しない。
- Actions artifact ZIP downloadのHTTP 404と410をそれぞれBLOCKEDとし、未取得artifactをscan済みcount／provenanceへ含めない。
- 列挙済みActions job／artifactの取得・scan completenessがinventory identity、count、set SHAへ一致し、1件でも欠落すればfinding 0のPASS reportを生成しない。
- raw commit object、全tree/path association、path-sensitive alias、ref、working／staged bytes、unsafe archive entry、secret redaction、phase-specific proof、release staging exact 5を維持する。
- FINDING-009-V2-R1-01のproof cross-job transfer、FINDING-009-R3-01のasset gates、public visibility、npm publish guard、AppState／financial non-regressionを維持する。
- 全local gateと新規exact candidate Governance CI SUCCESS後だけ直系子handoffを作り、candidate→handoff production diffを0にする。
- attempt 3／terminal／finalのhandoff exact CI SUCCESS後にSTOPし、attempt 4、release、main統合、公開操作、completionへ進まない。

## Tests

- public audit negative: Actions job log endpointが404を返す場合にBLOCKED／nonzeroとなり、report PASS／actions_scan_complete trueを生成しない。
- public audit negative: Actions job log endpointが410を返す場合にBLOCKED／nonzeroとなり、未取得logを黙殺しない。
- public audit negative: Actions artifact ZIP downloadが404を返す場合にBLOCKED／nonzeroとなり、artifact scan countを完了扱いしない。
- public audit negative: Actions artifact ZIP downloadが410を返す場合にBLOCKED／nonzeroとなり、artifact set provenanceをcomplete扱いしない。
- public audit regression: 403、5xx、redirect／body read failure、unsafe symlink／hardlink／device／traversal／duplicate normalized pathをfail-closedにする。
- public audit success:列挙した全run／job／artifactが取得・scanされ、inventory count／set SHA／scan countが一致した場合だけactions_scan_complete trueとなる。
- history regression: historical commit message secret、removed bytes、same blob multi-path、sensitive ref、zero-count forged proof、release staging 4／6、secret raw-value redactionを維持する。
- workflow regression: public audit proofのartifact transfer、SHA-256／bytes検証、post-live preflight、publication order、least privilegeを維持する。
- PowerShell 7／5.1 governance、normalization各21、completion各34、Vitest 557以上、focused 69／68／86／28、distribution contract 77以上、public audit tests 18以上＋新規test、portable 284、staged HTTP 5 files／5 routesをPASSする。
- candidate／handoffの新規exact Governance CIでruntime external requests、console errors、page errorsを0にする。

## Forbidden changes

- HTTP 404／410をoptional absence、warning、null、skip、best-effortとして扱うこと。
- 列挙済みjob log／artifactが未取得のままactions_scan_complete=true、finding 0、result PASSを生成すること。
- API権限不足、expired artifact、content read failureをscan count 0またはprovenance hashだけで補完すること。
- secret／PII／tokenのmatched raw valueをconsole、report、artifact、relayへ複製すること。
- FINDING-009-V2-R1-02をterminal profileを理由に緩和、deferred、accepted risk、optional、documentation-onlyとして扱うこと。
- FINDING-009-V2-R1-01、full-history/path-sensitive scan、unsafe archive rejection、release asset gates、canonical approval proofの弱体化。
- existing test削除、skip、assertion弱体化、count低下、fixed sleep／blind retryによる回避。
- CI軽量化、workflow job削減、path filter追加をTASK-009へ混在させること。
- tag、Release、asset、Pages、deployment、Distribution dispatch、origin/main統合、release、completion、attempt 4。
- reset --hard、reset、restore、stash、git clean、checkoutによる差分破棄、rebase、amend、squash、history rewrite、force push、filesystem force削除。

Validated full bundle: docs/ai/reports/TASK-009/RELAY_BUNDLE.json
