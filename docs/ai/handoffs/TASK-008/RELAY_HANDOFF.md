# RELAY HANDOFF — TASK-008

- relay_schema: 2
- task_id: TASK-008
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-008-data-preservation-ux
- reviewed_candidate: 5da12c38b280251d6d37df00aa37b0b015f7a504
- candidate_commit: 5da12c38b280251d6d37df00aa37b0b015f7a504
- reviewed_handoff_head: c7ced134c5349d185db983755d2a4a9a00a8fbd2
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-008-data-preservation-ux
- resolved_commit: c7ced134c5349d185db983755d2a4a9a00a8fbd2
- next_action_blob: afc3380a6c1d8bac2d67a1af56f712aab7a16db7
- handoff_blob: 84c7a99b784e2ed2c7717a3ab8e147485aeeeb00
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- implementation_candidate: 5da12c38b280251d6d37df00aa37b0b015f7a504
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false

## Purpose

TASK-008 implementation review attempt 1／standardをCHANGES_REQUESTEDとし、FINDING-008-R1-01～03の3件の非緩和MAJOR findingをaccepted findingとして正式に引き継ぎ、要件緩和なしで修正したimplementation review attempt 2／standardのexact candidateを作成する。

## Scope

- review対象はcandidate 5da12c38b280251d6d37df00aa37b0b015f7a504／tree d8244741c257f2dc2ef29861d023b32782f269c1／workflow 31705042741 SUCCESS、handoff HEAD c7ced134c5349d185db983755d2a4a9a00a8fbd2／tree f0564f48f86a8f3bc5b2b13f31a174d58688bbc0／workflow 31706036608 SUCCESSに固定する。
- relay import前にbranch tipがhandoff HEAD c7ced134c5349d185db983755d2a4a9a00a8fbd2とexact一致し、candidate 5da12c38b280251d6d37df00aa37b0b015f7a504がその直系親であり、candidate→handoff差分がreview/governance正本だけで製品source/test/package/workflow/tool/launcher差分0件であることを再確認する。
- このCHANGES_REQUESTED importでphase=implementation、status=changes_requested、next_actor=Codex、next_role=IMPLEMENTER、changes_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=standard、final=false、implementation_review_terminated=falseへ正本を同期する。
- FINDING-008-R1-01、FINDING-008-R1-02、FINDING-008-R1-03をaccepted findingとしてTASK-008正本・review relay/reportへ保存し、deferred、accepted risk、optional、relaxableとして扱わない。
- FINDING-008-R1-01を修正し、schema v1由来CR/LF/CRLF・前後空白・50文字超displayNameについて、未編集時だけでなく最初の明示編集時にもsingle-line DOM正規化やtrimによるsilent mutationを発生させず、validな明示編集値をexact保存し、invalid編集を副作用0で拒否する。
- FINDING-008-R1-02を修正し、production completion toolからfetch、exact origin/main CI、launcher freshness／portable、TASK branch identity等の必須gateを迂回できる経路を除去し、意図した完了TASK worktreeだけを全precondition通過後にremove/pruneできるようにする。
- FINDING-008-R1-03を修正し、TASK-008正本のcompletion safety required test matrixをPowerShell 7／Windows PowerShell 5.1の双方で実行可能なtestへ1対1で対応付け、主要failure pathと成功path、worktree残存、tracked/untracked user bytes保全、prune結果をCIで固定する。
- 修正後はchanges_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=standard、final=false、terminated=falseとして新しいimplementation candidateとreview handoffを作成する。attempt 2では要件緩和を行わない。
- 既に通過しているschema v6 migration/import atomicity、backup success-only lastExportedAt、backup reminder semantics、root launcher deterministic generation、file:// portability、既存金融計算、tax/social-insurance/NISA/iDeCo rule、overview formula/source selection/double-count prevention、TASK-004/TASK-005 blocked state、TASK-006/TASK-007/TASK-011 audit historyは、finding修正に必要な場合を除き変更しない。
- baseline c3cf916048d59867e016b2979e6d0875fb563c82／tree cf40250e338056abdb486408a32c7fda560d2039、requirements activation 73ac6e0011562b5bf7ca67def8baede128148c9c／tree 00051c28ca97c3e6cd46422a53eb45bad78b9d22／workflow 31699596062 SUCCESS、shared v0.12.20 identity、accepted docs/product requirements identityを維持する。
- origin/mainはc3cf916048d59867e016b2979e6d0875fb563c82のまま維持し、attempt 2修正・review handoff中にmain merge、tag、GitHub Release、distribution、実TASK worktree cleanupを行わない。

## Out of scope

- TASK-008正式要件の緩和、spec revision変更、docs/product/**のsilent変更。
- 税・社会保険・NISA・iDeCo制度値、rule期間、金額計算式、既存overview formula/source selection/double-counting behaviorの目的外変更。
- schema v6 backup/migration/importの既に合格している意味をfindingと無関係に再設計すること。
- TASK-004またはTASK-005のattempt 4、再レビュー、retroactive approval、active化。
- TASK-006、TASK-007、TASK-011の再active化、再レビュー、承認・監査identityの変更。
- TASK-009のGitHub Release、static deployment、distribution automation、release checklist、配布version管理。
- origin/main merge、tag、GitHub Release、distribution、active TASK worktreeの実cleanup。
- reset、stash、clean、restore、rebase、amend、squash、history rewrite、force push、ユーザー所有差分の破棄。

## Required changes

- FINDING-008-R1-01 [MAJOR] src/domain/state.ts; src/modules/settings/settings-view.ts; src/modules/budget/budget-view.ts; tests/migration-repository.test.ts; tools/test-portable-build.mjs: schema v1由来displayNameの未編集時保護は実装されているが、利用者が明示的に編集した経路ではsingle-line inputの正規化済みvalueとreducerのtrim()を保存値へ使用するため、CR/LF/CRLFや前後空白をsilentに失い得る。TASK-003から引き継いだ非緩和要件は、既存legacy値を画面表示だけで保護するだけでなく、明示編集時にもDOM都合のsilent normalize／trim／truncate／newline除去を禁止している。 Evidence: src/modules/settings/settings-view.tsはmember.displayNameをtype=text inputへ設定し、input eventでtouchedになった後はinput.valueをrename-memberへ渡す。src/modules/budget/budget-view.tsもselfNameTouched／partnerNameTouched後はsingle-line input.valueをupdate-householdへ渡す。src/domain/state.tsのreduceStateはrename-memberでaction.displayName.trim()を保存し、update-householdでも変更されたselfName／partnerNameへtrim()を適用する。assertActionApplicableもaction.displayName.trim()を検証するため、前後空白はvalidation errorではなくsilent removalされる。single-line text inputはCR/LF/CRLFをlosslessな編集bufferとして保持できず、legacy newline値を一文字編集しただけでもDOM value側の正規化とreducer trimにより、ユーザーが明示していない文字まで失う経路が残る。現行testはCR/LF/CRLFのmigration・unrelated save・未編集保持や通常のintentional renameは確認するが、legacy newline／前後空白／50+文字の最初の明示編集をsettings DOMおよびbudget/household DOM経路で検証していない。 Impact: schema v1 CR/LF/CRLF・前後空白等のlegacy表示名を利用者が編集しようとした際、意図した変更以外の文字が不可逆に失われ、新しいv6 storageへその正規化済み値が保存される可能性がある。これはTASK-008の最優先非緩和条件であるdata preservationと「silent trim、truncate、newline除去を行わない」「legacy compatibility valueとUI edit bufferを分離する」に違反するため、attempt 1では承認できない。 Required: persisted raw legacy displayNameとUI edit bufferを明確に分離する。CR/LF/CRLFや50文字超legacy値を編集可能にする場合はtextarea等のlossless editor、または既存値全体を明示置換することが分かる専用flowを使用し、single-line DOMの正規化値をraw値の代替にしない。rename-memberとupdate-householdからsilent trimを除去し、submitted valueが正式仕様上validならexact文字列を保存する。新規single-line制約を課す場合はsilent修正せずvalidation errorで拒否する。invalid intentional editではState、storage bytes、writer call、listener通知を一切変更しない。settingsとbudget/household双方について、CR、LF、CRLF、前後空白、50+ legacy値の未編集保持と最初の明示編集/save、invalid editの副作用0をfocused/DOM/portable testで固定する。
- FINDING-008-R1-02 [MAJOR] tools/complete-task-local.ps1; tools/test-complete-task-local.ps1: production completion toolがSkipFetch、SkipLauncherGate、SkipCiGateを公開parameterとして受け取り、TASK completionの必須gateを無効化したままgit worktree remove／pruneまで到達できる。また、削除対象worktreeが意図した完了TASK branchであることをexact検証していない。 Evidence: tools/complete-task-local.ps1はparamに[Switch]$SkipFetch、$SkipLauncherGate、$SkipCiGateを持ち、SkipFetch指定時はorigin/main fetchを行わず、SkipCiGate指定時はWorkflowRunIdとgh run viewによるorigin/main exact CI検証を行わず、SkipLauncherGate指定時はnpm run verify:launcherとnpm run test:portableを行わない。それでも後段のShouldProcess(task, remove completed TASK worktree)でgit worktree removeとpruneへ進める。TaskWorktreeについてmainでない、registered exactly once、HEAD==CompletionCommitは確認するが、TaskIdまたはexpected task branchを必須入力としてbranch exact一致を検証していない。現行test-complete-task-local.ps1はfixture実行の大半で-SkipLauncherGate -SkipCiGateを使用し、production必須gateの正常・異常経路を通していない。 Impact: completion時の非緩和必須条件であるorigin/main exact CI SUCCESS、launcher freshness、launcher portable、最新origin/main取得、意図したTASK identityを迂回できる。cleanかつHEADが指定commitと一致するだけの別non-main worktreeを誤って削除する余地もある。データ損失・誤worktree削除に直結するcompletion safety違反であり、要件緩和対象ではない。 Required: normal production completion pathから必須gate bypassを除去する。test用dependency injectionが必要ならtemporary fixtureだけで有効でreal repositoryには使用できないinternal/test-only seamへ隔離する。TaskId、expected branch、または同等のstable TASK identityを必須入力にし、remove対象worktree branchがexpected completed TASK branchとexact一致することを確認する。normal executionでは必ずfetch、exact origin/main CI、launcher freshness、launcher portable、completion commitのorigin/main reachability、local mainのff-only可能性、TASK branch identityを通過してからremoveする。全destructive operation前にpreconditionを完了し、いずれか失敗時はworktreeとuser-owned bytesを一切変更せずnon-zero/BLOCKEDで終了する。
- FINDING-008-R1-03 [MAJOR] tools/test-complete-task-local.ps1; .github/workflows/ci.yml; docs/ai/reports/TASK-008/IMPLEMENTATION_REPORT.md: completion simulationがPowerShell 7／5.1それぞれ6 checksに留まり、TASK-008正本のRequired testsに列挙されたcompletion safety matrixを満たしていない。さらにR1-02のskip parameterを利用しているため、normal completion pathのexact CI／launcher gateが実際にはtestされていない。 Evidence: tools/test-complete-task-local.ps1の明示caseはmain removal rejection、untracked/dirty TASK、unfinished operation、unreachable completion、untracked main、safe completionの6件である。正本が必須とするmain worktree identification、wrong main folder、ambiguous main、tracked dirty main、tracked dirty TASK、non-fast-forward main、explicit ff-only success、wrong TASK branch、exact CI wrong SHA／unsuccessful conclusion、launcher freshness failure、launcher portable failure、explicit prune result等の主要境界が個別に検証されていない。CIはPowerShell 7／5.1でこの6-check simulationを実行してSUCCESSだが、Required tests matrixの不足を検出できない。IMPLEMENTATION_REPORTもcompletion simulation各6 checksとだけ記録し、必須caseとのmappingを示していない。 Impact: completion safetyは非緩和要件であるにもかかわらず、main同期やworktree削除の主要failure pathがCIで固定されていない。R1-02のような必須gate bypassやbranch誤認、non-ff、CI/launcher failureが将来回帰してもcandidate exact CIがSUCCESSになり得るため、TASK completion時のユーザーデータ保護を保証できない。 Required: TASK-008 Tests節のcompletion matrixをPowerShell 7／Windows PowerShell 5.1で1対1に実行可能test化する。最低限unique main worktree detection、wrong main folder、ambiguous main、tracked dirty main、untracked main、tracked dirty TASK、untracked TASK、unfinished merge/rebase/cherry-pick、main worktree removal、unreachable commit、wrong TASK branch、non-ff main、exact CI wrong SHA、exact CI unsuccessful conclusion、launcher freshness failure、launcher portable failure、ff-only success、safe task remove、worktree prune resultを検証する。各failure pathで対象worktreeが残ること、tracked bytes不変、untracked user-owned bytes不変を確認する。IMPLEMENTATION_REPORTへ実行case名と最終countを記録し、CI上のPS7/5.1実行が同じmatrixを通ることを証明する。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- relay import前にbranch tipがhandoff HEAD c7ced134c5349d185db983755d2a4a9a00a8fbd2とexact一致し、candidate 5da12c38b280251d6d37df00aa37b0b015f7a504がその直系親であり、candidate→handoff差分がreview/governance正本だけで製品source/test/package/workflow/tool/launcher差分0件である。
- CHANGES_REQUESTED import後、TASK-008、CURRENT_STATE、NEXT_ACTION、Progress、review relay/reportがphase=implementation、status=changes_requested、next_actor=Codex、changes_requested_cycles=1、implementation_review_attempt=2、profile=standard、final=false、terminated=falseへ同期する。
- FINDING-008-R1-01～03がaccepted findingとして正本に保持され、attempt 2／standardで1件もdeferred、accepted risk、optional、relaxable扱いされない。
- legacy CR/LF/CRLF、前後空白、50文字超displayNameが未編集・無関係保存・reload・export/importでlosslessに維持され、最初の明示編集でもsingle-line DOM正規化やsilent trim/truncate/newline除去を発生させない。
- legacy displayNameのvalidな明示編集は仕様どおりexact保存され、invalid intentional editではState、storage bytes、writer call、listener通知が変化しない。settingsとbudget/household双方のDOM経路をtestする。
- production completion toolではfetch、exact origin/main CI、launcher freshness、launcher portable、completion commit reachability、main ff-only、expected TASK branch identityの必須gateを迂回できず、全precondition通過後だけtask worktree remove/pruneを実行する。
- wrong TASK branch、wrong/ambiguous main、dirty/untracked worktree、unfinished Git operation、unreachable commit、non-ff main、CI mismatch/failure、launcher failureではworktreeを削除せずuser-owned bytesを変更しない。
- completion safety required test matrixがPowerShell 7／Windows PowerShell 5.1の双方で実行され、各case名・check count・failure-path preservation・safe remove・prune結果がIMPLEMENTATION_REPORTに対応付けられる。
- 既存のmigration/import atomicity、backup success-only lastExportedAt、backup reminder、schema v6、root launcher deterministic build、file:// runtime requests 0、console errors 0、page errors 0を維持する。
- 現candidateの444 Vitest、69 take-home focused、68 NISA focused、86 iDeCo focused、28 overview focused、276 portable browser checksを下回らず、追加後の最終countをreportする。
- PowerShell 7/5.1 governance、requirements smoke、audit validator/normalization、project overlay、generated artifact、npm ci/typecheck/lint/format/test/focused/build、launcher freshness、completion matrix、portableがすべてPASSする。
- 修正candidate exact GitHub Actions SUCCESS後だけimplementation review attempt 2／standardのhandoff-only commitを作成し、そのexact workflowもSUCCESSとする。handoff-only commitで製品source/test/package/workflow/tool/launcherを変更しない。
- origin/mainはc3cf916048d59867e016b2979e6d0875fb563c82のまま、main merge、tag、GitHub Release、distribution、実TASK worktree cleanupを行わない。

## Tests

- displayName focused: CR/LF/CRLF、前後空白、50+ legacy nameのmigration、unrelated save、reload、export/import lossless preservation。
- displayName explicit edit: settingsとbudget/householdの双方でCR、LF、CRLF、前後空白、50+ legacy値の最初の明示編集/saveを検証し、silent trim/truncate/newline removalがないことを確認する。
- displayName invalid edit: invalid intentional editでState、storage byte、writer call、listener通知が完全不変であることを確認する。
- completion matrix PS7/PS5.1: unique main worktree detection、wrong main folder、ambiguous main、tracked dirty main、untracked main、tracked dirty TASK、untracked TASK、unfinished merge/rebase/cherry-pick、main worktree removal、unreachable commit、wrong TASK branch、non-ff main、exact CI wrong SHA、exact CI unsuccessful conclusion、launcher freshness failure、launcher portable failure、ff-only success、safe task remove、worktree prune result。
- completion failure preservation: 各failure pathでTASK/main worktreeが残り、tracked bytesとuntracked user-owned bytesが変更されないことを確認する。
- completion production path: normal executionでfetch、exact origin/main CI、launcher freshness、launcher portable、reachability、ff-only、expected TASK branch identityが必須でありskip不能であることを検証する。
- npm run testは444件を下回らずTASK-008追加後の総数をreportする。
- npm run test:rulesは69 take-home focusedを維持する。
- npm run test:nisaは68 NISA focusedを維持する。
- npm run test:idecoは86 iDeCo focusedを維持する。
- npm run test:overviewは28 overview focusedを維持する。
- npm run build／launcher freshness／npm run test:portableを実行し、portableは276 checksを下回らず空白・日本語path、5 routes、history、reload、same-path localStorage、360px、keyboard focus、runtime requests 0、console errors 0、page errors 0を維持する。
- PowerShell 7／Windows PowerShell 5.1のvalidate-ai-governance、test-requirements-defined-smoke、validate-audit-identities、test-audit-identity-normalization、project overlay/generated artifact gateをPASSする。
- 修正candidate exact GitHub Actions SUCCESSおよびattempt 2 review handoff exact GitHub Actions SUCCESSを確認する。

## Forbidden changes

- FINDING-008-R1-01、FINDING-008-R1-02、FINDING-008-R1-03をdeferred、accepted risk、optional、relaxableとして扱うこと。
- attempt 2／standardで非必須UI・文言・optional optimizationを含め要件緩和すること。attempt 2では緩和なし。
- legacy CR/LF/CRLF、前後空白等をsingle-line DOM value、trim、truncate、newline除去でsilentに正規化して保存すること。
- production completion toolでfetch、exact CI、launcher freshness／portable、TASK identity、reachability、ff-only等の必須gateをskipできる公開経路を残すこと。
- completion required testを単なるcheck数やreport文言だけで代替し、実行可能testを追加しないこと。
- existing testsの削除、skip、assertion弱体化、baseline count低下。
- docs/product/**、PRODUCT_IDENTITIES、AUDIT_IDENTITIES、docs/ai/generated/shared/**をfinding修正の都合でsilent変更すること。
- tax、social-insurance、NISA、iDeCo rule metadata/value/period、既存money calculation、overview formula/source selection/double-counting behaviorの目的外変更。
- TASK-004／TASK-005のattempt 4、retroactive approval、TASK-006／TASK-007／TASK-011の再レビュー・再active化。
- main直接実装・merge、tag、GitHub Release、distribution、active TASK worktreeの実cleanup。
- reset --hard、stash、git clean、restoreによるユーザー差分破棄、rebase、amend、squash、history rewrite、force push。
- branch tip、candidate/handoff ancestor、bundle SHA/bytes、validator、exact CIの不一致や失敗を無視して継続すること。
- attempt 3をattempt 2結果前に作成すること、attempt 4を作成すること。

Validated full bundle: docs/ai/reports/TASK-008/RELAY_BUNDLE.json
