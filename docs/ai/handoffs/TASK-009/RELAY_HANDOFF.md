# RELAY HANDOFF — TASK-009

- relay_schema: 2
- task_id: TASK-009
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-009-distribution
- reviewed_candidate: a50635882ccd48b91a79234977b1bb436f826877
- candidate_commit: a50635882ccd48b91a79234977b1bb436f826877
- reviewed_handoff_head: 356b41520bf376e4e5e661ef9871d33845837807
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-009-distribution
- resolved_commit: 356b41520bf376e4e5e661ef9871d33845837807
- next_action_blob: 448dd41f3182b5b1adb721013f18b54226a44e8d
- handoff_blob: 6601367b00b1a4f516c9212416fe5b1fda18ba02
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- implementation_candidate: a50635882ccd48b91a79234977b1bb436f826877

## Purpose

TASK-009 implementation review attempt 1／standardをCHANGES_REQUESTEDとし、配布前APPROVED証明、exact published再実行、live 5-file検証の3件を非緩和MAJOR findingとして正式に引き継ぎ、要件を緩和せずimplementation review attempt 2／standardのexact candidateを作成する。

## Scope

- review対象はcandidate a50635882ccd48b91a79234977b1bb436f826877／tree ce9d102f21c497c9b2d1e9d57a2c6cd7014fb5bf／Governance CI 31769779453 attempt 1 SUCCESS、handoff HEAD 356b41520bf376e4e5e661ef9871d33845837807／tree 82fc4595805193bf22bedd73c303bfa1e81dc0d1／Governance CI 31770893516 attempt 1 SUCCESSに固定する。
- relay import前にbranch tipがhandoff HEADとexact一致し、handoffの直系親がcandidateであり、candidate→handoff差分がboard/PROGRESS.html、docs/ai/CURRENT_STATE.md、docs/ai/NEXT_ACTION.yml、docs/ai/handoffs/TASK-009/IMPLEMENTATION_REVIEW_HANDOFF.md、docs/ai/reports/TASK-009/IMPLEMENTATION_REPORT.md、docs/ai/tasks/TASK-009.mdの6 pathだけでproduction diff 0であることを再確認する。
- このCHANGES_REQUESTED importでphase=implementation、status=changes_requested、next_actor=Codex、next_role=IMPLEMENTER、changes_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=standard、final=false、terminated=falseへ正本を同期する。
- FINDING-009-R1-01～03をaccepted findingとしてTASK、relay、reportへ保存し、deferred、optional、accepted risk、relaxableとして扱わない。
- FINDING-009-R1-01を修正し、Pages setupとdistribution preflightの双方で、current mainとexact main CIだけでなく、target commitに保存されたcanonical implementation-review APPROVED relay／reviewed candidate／review handoff／release stateを機械的に照合し、callerが同じSHAをapproved_release_headとして渡すだけでは通過できないようにする。
- FINDING-009-R1-02を修正し、exact_published状態の再dispatchを安全な成功no-opまたは完全なexact再検証として扱い、draft release必須checkへ落ちて失敗しないようworkflowとrelease stageを整合させる。
- FINDING-009-R1-03を修正し、live Pages検証でallowlist 5 fileすべてを確認し、.nojekyllもHTTP成功、0 bytes、stagingとのraw-byte exact一致を証明する。
- 修正後はimplementation review attempt 2／standard、changes_requested_cycles=1、final=false、terminated=falseとして新candidateを作成し、exact candidate CI SUCCESS後だけ直系子のhandoff-only commitを作成する。
- 既に合格しているversion／metadata正本、AppState／migration／storage／backup／import/export、金融計算・制度rule、deterministic staging、5-file allowlist生成、HTML byte identity、manifest/checksum encoding、official action full-SHA pin、least privilege、file://／staged HTTP browser evidenceはfinding修正に必要な範囲を除き変更しない。
- origin/mainは0dbc4fb102c92a6df12331540c6cc11010258f54のまま維持し、attempt 2中にtag、Release、asset、Pages設定、deployment、distribution dispatch、main統合、release、completionを行わない。

## Out of scope

- TASK-009 spec revision、R01～R15、AC01～AC10、T01～T08、F01～F08の緩和または削除。
- 税・社会保険・手取り・NISA・iDeCo・overviewの計算、rule値／期間／verifiedAt／source selection、AppState schema、migration、storage key、backup/import/export semantics、既存user bytesの目的外変更。
- repository visibility変更、別public repository、custom domain、第三者host、runtime dependency、analytics、telemetry、backend、secret／PAT保存。
- tag、draft／published Release、asset、Pages設定／deployment、distribution workflow dispatch、origin/main統合、local completion、canonical completion sync。
- 完了TASKの再active化／再レビュー、TASK-004／TASK-005 attempt 4、docs/ai/generated/shared/**直接編集。
- reset --hard、stash、git clean、restoreによる差分破棄、rebase、amend、squash、history rewrite、force push、filesystem force削除。

## Required changes

- FINDING-009-R1-01 [MAJOR] .github/workflows/distribution.yml; tools/distribution-preflight.mjs; tools/distribution-preflight-lib.mjs; tools/configure-pages.mjs; tools/configure-pages-lib.mjs; tests/distribution.test.mjs; tests/distribution-workflow.test.mjs: 公開side effect前のgateがcurrent origin/mainとexact main Governance CIは検証する一方、target commitがformal implementation review APPROVEDをimportした正規release headであることをrepository正本から証明していない。configure-pagesのapprovedReleaseHeadもcaller入力とtarget SHAの自己一致確認に留まり、approval証拠ではない。 Evidence: distribution.ymlのworkflow_dispatch inputはversion、target_sha、main_ci_run_id、publish_confirmationだけで、preflightはpackage version、current main、CI identity、artifact、Pages stateを検証するが、canonical APPROVED relay、reviewed candidate、review handoff、release phase／stateを読まない。configurePagesはapprovedReleaseHead !== targetShaを拒否するだけで、そのSHAがdocs/ai/reports/TASK-009/RELAY_BUNDLE.jsonのAPPROVED decisionやTASK/release stateを含むか確認しない。したがって未承認のcommitでもcurrent mainへ存在しGovernance CIがSUCCESSならPages setupとdistribution preflightを通過できる。 Impact: implementation review APPROVED前またはAPPROVEDとは異なるmain commitからtag、draft Release、asset、Pages deploymentを開始でき、R08、R12、AC05、F03およびhandoffの非緩和APPROVED exact main CI preflightに違反する。公開順序の最上流gate欠落であり承認できない。 Required: target commit自身のrepository正本からcanonical APPROVED relayとrelease stateを検証するpure validatorを追加し、Pages setupとdistribution preflightの両方で必須化する。少なくともdecision=APPROVED、review_stage=implementation、reviewed_candidate／reviewed_handoff_headのexact identity、TASK-009のrelease phase／approved state、target commitとの結合を確認し、単なるcaller-supplied同一SHAをapproval証拠にしない。未承認main、forged approvedReleaseHead、wrong candidate／handoff、missing relay、wrong phaseをside effect 0で拒否するtestを追加する。
- FINDING-009-R1-02 [MAJOR] .github/workflows/distribution.yml; tools/distribution-release.mjs; tools/distribution-state.mjs; tests/distribution.test.mjs; tests/distribution-workflow.test.mjs: state classifierはexact_publishedを正常な再開可能状態として返すが、workflowはその状態でもdraft_release jobを必ず実行し、stage commandは既存Releaseへdraft=trueを要求するため、exact published状態の再dispatchが必ず失敗する。 Evidence: classifyDistributionStateはexactなpublished prereleaseをstate=exact_published／resume_from=completeとして返す。distribution-release.mjs stageのallowed setにもexact_publishedが含まれる一方、既存release取得後のidentity checkはrelease.draft !== trueをエラーにする。distribution.ymlのdraft_release jobにはexact_publishedをskipするifがなく、preflight成功後に常時stageを呼ぶ。現行testはpure classifierでexact_publishedを確認するだけで、実stage／workflow再実行を検証していない。 Impact: 公開が完全成功した後の同一version再実行がidempotentな成功no-opにならず失敗する。R10、AC06、T06の「expected exactなら不足工程だけ再開」「exact publishedはcomplete」に違反し、正常な公開状態を失敗として扱うため監査と運用が不安定になる。 Required: exact_publishedでは全objectを再検証してside effect 0の成功no-opで終了するか、draft_release以降を整合してskipしworkflow全体をSUCCESSにする。exact_pages_deployed等の既存partial stateも壊さない。pure classifierだけでなく実stage／job条件を含むtestを追加し、fresh、tag-only、draft、asset subset、Pages deployed、publishedの各exact状態が期待工程から成功し、mismatchだけがBLOCKEDとなることを固定する。
- FINDING-009-R1-03 [MAJOR] tools/verify-live-distribution.mjs; tools/distribution-lib.mjs; tools/test-distribution-browser.mjs; tests/distribution.test.mjs; docs/product/RELEASE_CHECKLIST.md: live Pages raw-byte verificationがDISTRIBUTION_ALLOWLISTから.nojekyllを明示的に除外しており、正式な5-file公開allowlistの全file exact検証になっていない。 Evidence: verify-live-distribution.mjsはDISTRIBUTION_ALLOWLIST.filter(candidate => candidate !== '.nojekyll')だけをfetchしてstaging bytesと比較する。builderは.nojekyllを0-byte regular fileとして生成し、release checklistはindex.html、download HTML、manifest、checksums、.nojekyllの全5 fileがstaging bytesとexact一致することをlive evidenceの必須項目としている。現行contract/browser testにlive .nojekyll HTTP／0-byte確認はない。 Impact: Pages artifactの5-file allowlistに含まれるcontrol fileが欠落・非公開・改変されてもlive verificationが成功し、R05、R11、AC07、T07およびrelease checklistの必須evidenceを満たしたと誤判定する。 Required: live verificationで.nojekyllも取得し、成功status、content length 0、stagingの0-byte fileとのraw-byte exact一致を確認する。全5 pathを一意に検証したことをauditへ残し、.nojekyll欠落、non-zero、unexpected responseを失敗にするtestを追加する。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- CHANGES_REQUESTED import後、TASK-009はimplementation／changes_requested、Codex／IMPLEMENTER、attempt 2／standard、changes_requested_cycles=1、final=false、terminated=falseへ同期し、3 findingがacceptedとして監査可能になる。
- attempt 2 candidateはcanonical APPROVED証明をPages setupとdistribution preflightへ結合し、未承認mainまたはforged inputを公開side effect 0で拒否する。
- exact_published再dispatchは全identity exact確認後にside effect 0のSUCCESSとなり、freshからpublishedまでの各partial stateは不足工程だけを再開する。
- live verificationはallowlist 5 fileすべてを検証し、.nojekyllのHTTP成功、0 bytes、raw-byte exactを含む。
- R01～R15、AC01～AC10、T01～T08、F01～F08を維持し、AppState／保存／金融計算／rule data／existing test count／runtime request 0を退行させない。
- candidate exact Governance CI SUCCESS後だけ、直系子のhandoff-only commitを作り、candidate→handoff production diffを0にする。
- attempt 2中のtag、Release、asset、Pages、deployment、workflow_dispatch、repository visibility変更は0のまま維持する。

## Tests

- PowerShell 7／Windows PowerShell 5.1のgovernance、REQUIREMENTS_DEFINED smoke、audit identity/normalization、overlay、completion 34 casesを維持してPASSする。
- npm ci、typecheck、lint、format、485以上のVitest、focused take-home 69／NISA 68／iDeCo 86／overview 28、launcher、portable 284以上を削減せずPASSする。
- distribution contractへ未承認main、missing／wrong APPROVED relay、forged approvedReleaseHead、wrong reviewed candidate／handoff／release phaseのnegative testを追加し、全件side effect 0を確認する。
- actual stage／workflow条件を対象にexact_published成功no-opと全partial-state再開testを追加し、existing objectの上書き・移動・削除0を確認する。
- live verifierへ.nojekyll exact／missing／non-zero negative testを追加し、全5-file raw-byte evidenceを確認する。
- file://とstaged HTTPで5 route、reload、360px、keyboard/focus、metadata、storage、backup/import、runtime requests 0、console errors 0、page errors 0を維持する。
- candidateとhandoffの新規exact branch Governance CIをそれぞれSUCCESSで確認し、古いrunを流用しない。

## Forbidden changes

- findingを文言、optional、deferred、manual checklistだけへ格下げし、機械的gateを追加しないこと。
- APPROVED証明をcaller入力、publish_confirmation、current main、CI SUCCESSだけで代用すること。
- exact_publishedをconflicting扱いに変更してidempotency要件を避けること、または既存published Releaseをdraftへ戻す／削除すること。
- .nojekyllを正式allowlistやrelease checklistから削除してlive verification欠落を回避すること。
- existing test削除、skip、assertion弱体化、count低下、browser/network/error evidence省略。
- AppState schema、migration、storage、backup/import/export、金融計算、rule dataの目的外変更。
- tag、Release、asset、Pages、deployment、distribution dispatch、main統合、release、completion。
- reset --hard、stash、git clean、restore、rebase、amend、squash、history rewrite、force push、filesystem force削除、unrelated worktree操作。

Validated full bundle: docs/ai/reports/TASK-009/RELAY_BUNDLE.json
