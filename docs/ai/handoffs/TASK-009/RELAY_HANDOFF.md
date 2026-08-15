# RELAY HANDOFF — TASK-009

- relay_schema: 2
- task_id: TASK-009
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-009-distribution
- reviewed_candidate: bdf59b25e1f32866a9539af4c1918210440b0d8e
- candidate_commit: bdf59b25e1f32866a9539af4c1918210440b0d8e
- reviewed_handoff_head: f79a89e3bb2136bc5716a2c08dc17f1ebc3e518d
- shared_candidate: 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb
- spec_revision_reset: false
- review_stage: implementation
- changes_requested_cycles: 2
- implementation_review_attempt: 3
- implementation_review_profile: terminal
- implementation_review_final: true
- implementation_review_terminated: false
- attempt_4_forbidden: true
- original_formal_review_handoff: 502d5ec0bf25a1f05ec49762c8e7d562830725a7
- import_binding_head: f79a89e3bb2136bc5716a2c08dc17f1ebc3e518d
- user_confirmation_required: false
- user_confirmation_prompt: none
- review_termination_reason: none
- implementation_review_open_finding_ids: FINDING-009-R2-01, FINDING-009-R2-02
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-009-distribution
- resolved_commit: f79a89e3bb2136bc5716a2c08dc17f1ebc3e518d
- next_action_blob: 4261e9edc3eef988d91f03ec2ab5f1c3a512edca
- handoff_blob: 7c976bed438fb7743f1a6aaeb9367fa8973cac62
- adapter_blob: 1feb586cdac2c612ca02fee3dc1b0addf6cfab94
- implementation_candidate: bdf59b25e1f32866a9539af4c1918210440b0d8e

## Purpose

TASK-009 implementation review attempt 2／narrowedの既決CHANGES_REQUESTED判定を、shared v0.12.24のreview-convergence契約とgovernance recovery／five-source normalization正本へ結合し、FINDING-009-R2-01／R2-02を非緩和MAJOR findingとして維持したままimplementation review attempt 3／terminal／finalのexact candidateを作成する。

## Scope

- review対象はcandidate bdf59b25e1f32866a9539af4c1918210440b0d8e／tree 8ab3ef5c71f156b2fcafa1aad4691be64e8c601c／Governance CI 31789154016 attempt 1 SUCCESS、original review handoff 502d5ec0bf25a1f05ec49762c8e7d562830725a7／tree 87c8e88aa16e5870ddf2a1c78f0c671b1e1919f0／Governance CI 31790374136 attempt 1 SUCCESSに固定し、review attempt 2を再実施しない。
- relay routeはgovernance recovery／normalization head f79a89e3bb2136bc5716a2c08dc17f1ebc3e518d／tree d871837fd97ae980bfed16c2a90ac56586220a67へ固定する。直系親はe6b0563402448c8408480db3d7ace215cc45df3f、origin/mainは0dbc4fb102c92a6df12331540c6cc11010258f54である。
- shared正本はv0.12.24／commit 34d9727fbc3ed8fe7dfa39c91ca6683b11dc04fb／tree 1cbd973d590896d57aa0eb4777ecd0aef775132a／manifest SHA-256 2B7CF6EE56A5BBDBBE674E5E42A4F04D24FFEEFD57B66A66667A4913A6061DB9とし、v0.12.21／ad764bb219c629f1e6f0ddad059710abf0548085および旧FAD bundleを再利用しない。
- five-source preflightはTASK、CURRENT_STATE、NEXT_ACTION、IMPLEMENTATION_REVIEW_HANDOFF、RELAY_IMPORTでreview_stage=implementation、changes_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=narrowed、implementation_review_terminated=falseへexact一致していることをImport前に再確認する。
- governance recovery CI 31807878297はattempt 1／job 94791074779 FAILUREを監査履歴として保持し、同一runのattempt 2／job 94799343402 exact SUCCESSだけをrecovery成功として扱う。normalization CI 31832936043 attempt 1／job 94872680561はhead f79a89e3bb2136bc5716a2c08dc17f1ebc3e518dでexact SUCCESSである。
- このCHANGES_REQUESTED Importでshared canonical stateをchanges_requested_cycles=2、implementation_review_attempt=3、implementation_review_profile=terminal、implementation_review_terminated=falseへ遷移させ、project-specific audit fieldをimplementation_review_final=true、attempt_4_forbidden=trueへ同一未commit stateで同期する。
- FINDING-009-R2-01はMAJOR／release_gate、FINDING-009-R2-02はMAJOR／required_testとして内容、severity、scopeを変更・緩和せずaccepted findingとしてTASK、relay、report、handoffへ保存する。
- FINDING-009-R1-03の5-file live raw-byte検証はresolvedのまま維持し、.nojekyllを含む5 path、0 bytes、SHA-256、runtime request／console／page error 0を回帰させない。
- 修正後はattempt 3／terminal／final、changes_requested_cycles=2、terminated=falseとして新candidateを作り、exact candidate Governance CI SUCCESS後だけ直系子のhandoff-only commitを作成する。attempt 4は作成しない。
- origin/main、repository visibility、tag、Release、asset、Pages、deployment、Distribution workflow dispatchを変更せず、candidate／handoff工程のpublic side effectを0に維持する。

## Out of scope

- TASK-009 spec revision、R01～R15、AC01～AC10、T01～T08、F01～F08またはFINDING-009-R2-01／R2-02の緩和、削除、deferred化、accepted-risk化。
- 税・社会保険・手取り・NISA・iDeCo・overviewの計算、rule値／期間／verifiedAt／source selection、AppState schema、migration、storage key、backup/import/export semantics、既存user bytesの目的外変更。
- FINDING-009-R1-03の再設計、5-file allowlistまたはlive verificationから.nojekyllを除外すること。
- repository visibility変更、別public repository、custom domain、第三者host、runtime dependency、analytics、telemetry、backend、secret／PAT保存。
- tag、draft／published Release、asset、Pages設定／deployment、Distribution workflow dispatch、origin/main統合、release、local completion、canonical completion sync。
- review attempt 2の再実施、attempt 4、完了TASKの再active化／再レビュー、docs/ai/generated/shared/**直接編集。
- reset --hard、reset、stash、git clean、restoreによる差分破棄、rebase、amend、squash、history rewrite、force push、filesystem force削除。

## Required changes

- FINDING-009-R2-01 [MAJOR] tools/distribution-approval.mjs; tools/configure-pages.mjs; tools/configure-pages-lib.mjs; tools/distribution-preflight.mjs; tools/distribution-preflight-lib.mjs; tests/distribution.test.mjs: canonical approval validatorはtarget SHAのtreeからAPPROVED relay、TASK release state、RELEASE_HANDOFFを読むが、target commitがreviewed_handoff_headの直系子であるformal release headか、reviewed handoffからtargetへのproduction diffが0かを確認していない。そのため正規APPROVED release headの後に未レビューのproduction commitを追加してmainへpushしCIを成功させても、承認3正本が残る限り同じproofが通過する。 Evidence: readCanonicalApprovalAtCommitはgit show <target>:<path>で3 fileを読みsourceCommit=targetShaを返すだけで、target commit parent、reviewed handoffとのancestry、target commit changed pathsを取得しない。evaluateCanonicalApprovalもsourceCommit==targetShaと3 file内のcandidate／handoff自己整合だけを確認する。したがってapproved release head Rのchild Uが製品codeだけを変更して3 fileを維持した場合、Uをcurrent mainとするexact Governance CI SUCCESSがあればpreflight／Pages guardを通過できる。現行testはsourceCommit欠落やtask candidate不一致を確認するが、approved release headのunreviewed descendantを拒否するcaseがない。 Impact: 配布targetがimplementation reviewで承認されたexact artifactではなくなり、R08、R12、AC05、F03のAPPROVED exact main preflightを迂回できる。tag、Release、Pagesへ未レビューcodeを公開し得るrelease-safety違反であり緩和できない。 Required: target commit metadataをimmutable git objectから取得し、少なくともtargetのparentがbundle.reviewed_handoff_headとexact一致することを必須化する。加えてreviewed handoff→targetのchanged pathをrepository-native release-import allowlistへ限定し、src、tests、tools、package、workflow、launcher、README、docs/product、identity registry等のproduction diffを0にする。reviewed candidateがreviewed handoffのexpected parentであることも可能な範囲で検証する。正式release headはPASSし、その未レビューdescendant、wrong parent、merge commit、production混入release commit、missing commit metadataをside effect 0で拒否するtestを追加し、Pages setupとdistribution preflightの双方で同じproofを必須化する。
- FINDING-009-R2-02 [MAJOR] tests/distribution.test.mjs; tests/distribution-workflow.test.mjs; tools/distribution-release.mjs; docs/ai/reports/TASK-009/IMPLEMENTATION_REPORT.md: partial-state regression testはstate名だけをit.eachで差し替える一方、mock APIは全caseで既存exact tagと全asset付きdraft Releaseを返すため、fresh tag作成、tag-only Release作成、空draftへのasset upload、exact asset subsetの不足asset uploadを実際には通っていない。IMPLEMENTATION_REPORTの「fresh/tag-only/draft/asset-subset/Pages/published stage paths are contract-tested」という記録と実testが一致しない。 Evidence: release staging reruns testはfresh、exact_tag_only、exact_draft_release、exact_release_assets、exact_pages_deployedを列挙するが、各caseでapi.getの1回目がexact tag、2回目が全asset付きdraft Releaseを返し、api.postとuploadAssetImplのcall countを検証しない。exact asset subset固有fixtureもなく、conflicting stateのstage write 0も検証しない。さらにstageReleaseはtag／Release／assetを作成し得る通常pathでもresult.side_effects=0を返し、testはresult.okだけを確認するため監査値の誤表示も検出できない。 Impact: R10、AC06、T06で必須の「各exact partial stateから不足工程だけ再開し、既存objectを上書きせず、conflictingではwrite 0」というrelease safetyをtest gateで証明できない。将来の回帰や誤監査をCIが検出できず、required testとauditabilityの非緩和要件に違反する。 Required: stateごとにAPI fixtureを分離し、freshではtag／Release作成と全asset upload、tag-onlyではRelease作成だけ、empty draftでは全asset upload、exact asset subsetでは不足assetだけ、exact_release_assets／exact_pages_deployedではwrite 0、exact_publishedでは再検証後write 0、conflictingではstage未実行またはwrite 0拒否をassertする。GET／POST／PATCH／uploadのcall sequence、対象URL、asset identity、最終stateを確認する。通常write pathがside_effects=0と偽らないよう、actual write countまたは明示的operation listを返し、exact_publishedだけがside_effects=0 no-opであることを固定する。workflow job条件のstatic testも維持し、reportを実測結果へ一致させる。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- relay Validate／Import前にbranch tip、tree、routing blobs、shared lock、five-source convergence、normalization CIをexact確認し、identity不一致ではrepositoryを変更しない。
- Import後、TASK-009はimplementation／changes_requested、Codex／IMPLEMENTER、cycles 2／attempt 3／terminal／terminated falseへ同期し、project-specific final true／attempt 4 forbidden trueと2 findingを監査可能に保持する。
- FINDING-009-R2-01はformal release headのsingle parent、reviewed handoff／candidate ancestry、release-import-only path、production diff 0を機械検証し、approved release headの未レビューdescendant、wrong parent、merge、production混入をside effect 0で拒否する。
- FINDING-009-R2-02はfresh、tag-only、draft、asset subset、release-assets、Pages、published、conflictingをstate-specific API fixtureとactual call sequenceで検証し、不足工程だけを実行する。
- stage resultのside-effect auditはactual writesと一致し、exact_publishedだけがno_op=true／side_effects=0／POST・PATCH・upload 0となる。
- FINDING-009-R1-03、version／metadata、AppState／保存、金融計算、5-file deterministic artifact、workflow_dispatch only、official action full-SHA、least privilege、release order、runtime request 0を回帰させない。
- candidate exact Governance CI SUCCESS後だけ直系子handoffを作り、candidate→handoff production diffを0にする。
- attempt 3中もtag、Release、asset、Pages、deployment、workflow_dispatch、repository visibility変更を0のまま維持し、attempt 4を作成しない。

## Tests

- PowerShell 7／Windows PowerShell 5.1のgovernance、REQUIREMENTS_DEFINED smoke、audit identity/normalization、overlay、completion各34 cases以上をPASSする。
- Vitest 500以上、take-home 69、NISA 68、iDeCo 86、overview 28、distribution contract 38以上、portable 284 checks以上、staged HTTP 5-file raw/browserを削減せずPASSする。
- canonical approval testでexact release head parent／release-import path allowlistをPASSさせ、unreviewed descendant／wrong parent／merge／production diff／missing metadataをside effect 0で拒否する。
- release staging testでfresh、exact_tag_only、exact_draft_release、exact asset subset、exact_release_assets、exact_pages_deployed、exact_published、conflictingを別fixtureで実行し、GET／POST／PATCH／upload call sequenceとactual write countを固定する。
- exact_publishedはtag／Release／assets再検証後no_op=true、side_effects=0、POST／PATCH／upload 0とする。
- 5-file live raw verificationは.nojekyll HTTP success／0 bytes／raw exact、missing／non-zero negative testを維持する。
- file://とstaged HTTPで5 routes、reload、360px、keyboard/focus、metadata、storage、backup/import、runtime requests 0、console errors 0、page errors 0を維持する。
- attempt 3 candidateとhandoffの新規exact branch Governance CIをそれぞれSUCCESSで確認し、旧runを流用しない。

## Forbidden changes

- FINDING-009-R2-01／R2-02をterminal profileを理由に緩和、deferred、accepted risk、optional、documentation-onlyとして扱うこと。
- sourceCommit==targetShaと3 fileの自己整合だけをformal release head証明として維持し、approved release headの任意descendantを許可すること。
- state名だけを差し替え、実API object／write pathを共通mockで代用するtestを維持すること、または通常write pathでside_effects=0と記録すること。
- .nojekyllをallowlistまたはlive verificationから除外すること。
- existing test削除、skip、assertion弱体化、count低下、browser/network/error evidence省略。
- AppState、migration、storage、backup/import/export、金融計算、rule dataの目的外変更。
- old FAD bundle、v0.12.21、旧routing identityの再利用、bundle手修正、validator迂回。
- attempt 4、tag、Release、asset、Pages、deployment、Distribution dispatch、main統合、release、completion。
- reset --hard、reset、stash、git clean、restore、checkoutによる差分破棄、rebase、amend、squash、history rewrite、force push、filesystem force削除、unrelated worktree操作。

Validated full bundle: docs/ai/reports/TASK-009/RELAY_BUNDLE.json
