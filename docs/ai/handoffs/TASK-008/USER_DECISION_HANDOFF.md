# RELAY HANDOFF — TASK-008

- relay_schema: 2
- task_id: TASK-008
- decision: NEEDS_USER_DECISION
- source_decision: CHANGES_REQUESTED
- changes_requested_cycles: 2
- relay_recipient: USER
- relay_recipient_role: USER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-008-data-preservation-ux
- reviewed_candidate: 0a51924331669ba5a76b4d698d3e9c4d7dd1f4de
- candidate_commit: 0a51924331669ba5a76b4d698d3e9c4d7dd1f4de
- reviewed_handoff_head: 79fdf6b7b341eb572b13cae61f9b74eb14932ab8
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: user_decision
- next_actor: USER
- next_role: USER
- model: none
- effort: none
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-008-data-preservation-ux
- resolved_commit: 79fdf6b7b341eb572b13cae61f9b74eb14932ab8
- next_action_blob: 366a396cd4dfc498dcbf013191f33fc073947adb
- handoff_blob: 7e74ec4f9390bd6f4f9c9540897b6b2abb2541a1
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- implementation_candidate: 0a51924331669ba5a76b4d698d3e9c4d7dd1f4de

## Purpose

TASK-008 implementation review attempt 2／standardをCHANGES_REQUESTEDとし、attempt 1のFINDING-008-R1-01～03は解消済みのまま維持しつつ、新規の非緩和completion-safety finding FINDING-008-R2-01だけを修正して、implementation review attempt 3／relaxed／finalのexact candidateを作成する。

## Scope

- review対象はcandidate 0a51924331669ba5a76b4d698d3e9c4d7dd1f4de／tree 68d9831f0a15d99dd0453f1f1d8e1898c503a01b／workflow 31721539641 SUCCESS、handoff HEAD 79fdf6b7b341eb572b13cae61f9b74eb14932ab8／tree 55a6634fe3c0785493e37352801313a88d26f198／workflow 31722697830 SUCCESSに固定する。
- candidate→handoff差分はboard/CURRENT_STATE/NEXT_ACTION/TASK-008/IMPLEMENTATION_REVIEW_HANDOFF/IMPLEMENTATION_REPORTだけで、製品source/test/package/workflow/tool/launcher差分0件である。
- FINDING-008-R1-01～03は解消済み。displayName lossless explicit edit、completion public skip parameter除去、PS7/PS5.1共通22-case rollback matrixを再差し戻し理由にしない。attempt 3修正で回帰させない。
- 新規FINDING-008-R2-01だけを非緩和必須修正とする。
- CHANGES_REQUESTED import後はchanges_requested_cycles=2、implementation_review_attempt=3、implementation_review_profile=relaxed、final=true、terminated=falseへ同期する。
- attempt 3はrelaxed/finalだが、FINDING-008-R2-01はcompletion safety／required CI identityに属するため一切緩和しない。
- 修正candidate exact GitHub Actions SUCCESS後だけattempt 3／relaxed／final review handoff-only commitを作成する。
- attempt 3 reviewが不合格の場合はレビューを打ち切り、attempt 4を作成しない。Codexは依頼先GPTとして返す。

## Out of scope

- FINDING-008-R1-01～03の再設計または既に解消済み事項の再差し戻し。
- docs/product/**、PRODUCT_IDENTITIES、AUDIT_IDENTITIES、generated shared snapshotの変更。
- 税・社会保険・NISA・iDeCo制度値、money calculation、overview formula/source selection/double-counting behaviorの変更。
- main merge、tag、GitHub Release、distribution、active TASK worktreeの実cleanup。
- reset --hard、stash、git clean、restore、rebase、amend、squash、history rewrite、force push。

## Required changes

- FINDING-008-R2-01 [MAJOR] tools/complete-task-local.ps1; tools/test-complete-task-local.ps1; docs/ai/reports/TASK-008/IMPLEMENTATION_REPORT.md: completion toolのexact CI gateはWorkflowRunIdのheadShaとconclusionしか検証しておらず、その成功runがmainブランチのCIであることを確認していない。そのためTASK branch上で成功済みのcandidate workflowを、同じcommitがmainへfast-forwardされた後にWorkflowRunIdとして渡すと、main push CIが未実行・失敗でもgateを通過できる。 Evidence: tools/complete-task-local.ps1は`gh run view $WorkflowRunId --repo $remoteUrl --json headSha,conclusion`だけを取得し、`$ci.headSha -cne $originMain`または`$ci.conclusion -cne 'success'`のみを拒否条件としている。branch/eventは検証していない。実際のreviewed candidate workflow 31721539641はhead_sha=0a51924331669ba5a76b4d698d3e9c4d7dd1f4de、conclusion=successだがhead_branchはcodex/task-008-data-preservation-ux、event=pushである。将来このcandidateがorigin/mainへfast-forwardされた場合、origin/mainのSHAとcandidate runのheadShaが一致するため、現在のtoolは31721539641のようなTASK branch runもexact main CIとして受理できる。PROJECT_RULESはcompletionに`exact main CI success`を要求し、WORKFLOWもrelease stateがorigin/mainへ到達した後のexact CI成功を要求している。 Impact: origin/main統合後に新しく実行されるmain CIが失敗または未完了でも、過去のTASK branch成功runを流用してlocal main同期・TASK worktree削除まで進められる。completion safetyとrequired CI gateを迂回するため非緩和要件違反である。 Required: WorkflowRunIdが現在のorigin/main HEADに対する成功runであるだけでなく、mainブランチ上のrequired CI runであることを検証する。最低限run metadataのhead branchがmainであることを必須化し、現行workflow契約に合わせてmain push runであることも確認する。可能ならrequired workflow identityも固定して別workflowの成功runを代用できないようにする。TASK branch／PR等の同一SHA成功runは拒否する。test shimをbranch/event metadata対応へ拡張し、same SHA + successでもwrong branchを拒否、same SHA + success + main branchでもwrong eventを拒否、正しいmain push successだけ通過するcaseをPS7/PS5.1共通matrixへ追加する。各failure pathでmain/TASK worktreeとtracked/untracked user bytes不変を維持する。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- relay import前にbranch tipがhandoff HEAD 79fdf6b7b341eb572b13cae61f9b74eb14932ab8とexact一致し、reviewed candidateがその直系親であることを確認する。
- FINDING-008-R1-01～03はresolvedのまま維持され、displayName lossless explicit edit、production gate public skip不能、既存22-case rollback matrixに回帰がない。
- completion toolはsame SHA／successであってもTASK branchのworkflow runをexact main CIとして受理しない。
- completion toolは現行workflow契約上、main以外のhead branchおよびmain push以外の不適切なeventを拒否する。
- 正しいorigin/main HEAD、main branch、required main CI成功runだけがCI gateを通過する。
- CI identity failure時はmain/TASK worktreeを削除・同期せず、tracked/untracked user bytesを変更しない。
- PS7／PS5.1双方のcompletion matrixにwrong CI branch、wrong CI event、valid main push CI successを追加し、case名と最終countをIMPLEMENTATION_REPORTへ記録する。
- 462 Vitest、69 take-home、68 NISA、86 iDeCo、28 overview、284 portableを下回らず、runtime requests 0、console errors 0、page errors 0を維持する。
- 全governance/requirements/audit/overlay/generated artifact、npm、launcher、completion matrix、portable gateがPASSする。
- 修正candidate exact CI SUCCESS後だけattempt 3／relaxed／final handoffを作成し、そのhandoff exact CIもSUCCESSとする。
- attempt 3不合格時はレビュー終了。attempt 4を作成しない。

## Tests

- completion CI identity: same SHA + success + TASK branchを拒否する。
- completion CI identity: same SHA + success + main branch + wrong eventを拒否する。
- completion CI identity: current origin/main SHA + main branch + push + successを受理する。
- 上記failure caseでmain/TASK worktree残存、tracked bytes不変、untracked user-owned bytes不変。
- 既存22 completion casesを維持し、新規CI identity casesをPS7／PS5.1双方で実行する。
- npm run testは462件を下回らない。test:rules 69、test:nisa 68、test:ideco 86、test:overview 28を維持する。
- npm run build、launcher freshness、npm run test:portableを実行し284 checks以上、runtime/console/page error 0を維持する。
- PowerShell 7／Windows PowerShell 5.1 governance、requirements smoke、audit/normalization、project overlay/generated artifact gateをPASSする。
- 修正candidate exact GitHub Actions SUCCESS、attempt 3 handoff exact GitHub Actions SUCCESSを確認する。

## Forbidden changes

- FINDING-008-R2-01をrelaxed/deferred/accepted risk/optional扱いすること。
- headShaとconclusionだけの検証を維持し、branch identityを確認しないこと。
- TASK branchの成功runをmain CI successとして許可すること。
- test削除、skip、assertion弱体化、既存22-caseの削減。
- FINDING-008-R1-01～03の解消済み挙動を回帰させること。
- docs/product/**、既存金融計算、制度rule、origin/main、tag、release、distributionの変更。
- active TASK worktreeの実cleanup。
- reset --hard、stash、git clean、restore、rebase、amend、squash、history rewrite、force push。
- attempt 4を作成すること。

Validated full bundle: docs/ai/reports/TASK-008/RELAY_BUNDLE.json
