# RELAY HANDOFF — TASK-007

- relay_schema: 2
- task_id: TASK-007
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-007-integrated-summary
- reviewed_candidate: 4f8d0898e62a8efa1bf463c48030d46e8c1e204d
- candidate_commit: 4f8d0898e62a8efa1bf463c48030d46e8c1e204d
- reviewed_handoff_head: 9b061d6d835acca9ab4320bbe2cea677e25e5479
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-007-integrated-summary
- resolved_commit: 9b061d6d835acca9ab4320bbe2cea677e25e5479
- next_action_blob: 45ea0b3167eb6a6b9e5fa5b609746b9a4f23e2d3
- handoff_blob: 438ae8857145cec31453d27ddf7b32fcdece15a0
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- implementation_candidate: 4f8d0898e62a8efa1bf463c48030d46e8c1e204d

## Purpose

TASK-007 implementation review attempt 1／standardをCHANGES_REQUESTEDとし、3件の非緩和findingを修正してimplementation review attempt 2／standardのexact candidateを作成する。

## Scope

- review対象はcandidate 4f8d0898e62a8efa1bf463c48030d46e8c1e204d／tree 8f42ef4d3dc290d8c1844aad0bb6ef8c17f78e4b／workflow 31681374641 SUCCESS、handoff HEAD 9b061d6d835acca9ab4320bbe2cea677e25e5479／tree 15f6bfa608decf85b8f0c23b5d8390da3b38ad90／workflow 31682173244 SUCCESSに固定する。
- FINDING-007-R1-01を修正し、iDeCo計画の基準年月が開始前または終了後である場合に、0円を返しながらcompleteと表示するfalse-complete経路を除去する。
- FINDING-007-R1-02を修正し、世帯サマリーでNISA拠出額とiDeCo掛金を別々に表示し、既存の月間投資額合計と3段階残額を検証可能にする。
- FINDING-007-R1-03を修正し、TASK-007の明示的なfocused／DOM／portable test契約を不足なく実装して、今回のfalse-completeを含む回帰をCIで検出する。
- 修正後はchanges_requested_cycles=1、implementation_review_attempt=2、implementation_review_profile=standard、final=false、terminated=falseとして新しいimplementation candidateとreview handoffを作成する。
- 既存の手取り、家計、NISA、iDeCoのDomain計算、AppState schemaVersion 5、migration/import/storage、TASK-011 audit identity、standalone file://動作を維持する。

## Out of scope

- TASK-004またはTASK-005のattempt 4、再レビュー、retroactive approval、active化。
- TASK-006またはTASK-011の再active化、再レビュー、監査identity変更。
- 税・社会保険・NISA・iDeCoの制度値、rule期間、法定計算、端数処理の変更。
- AppState schemaVersion、migration、import/export、StorageRepository、localStorage keyまたは保存bytesの変更。
- TASK-008のbackup reminder、表示名migration、データ保全機能、TASK-009の配布。
- main merge、tag、GitHub Release、distribution、history rewrite、force push。

## Required changes

- FINDING-007-R1-01 [MAJOR] src/domain/overview.ts; tests/overview.test.ts; tools/test-portable-build.mjs: iDeCo計画のreferenceMonthがplan.startMonthより前でも、currentIdecoContributionが0円を返し、calculateIdecoPlanがcompleteならoverviewのiDeCo statusもcompleteのままになる。 Evidence: currentIdecoContributionは`referenceMonth < plan.startMonth || referenceMonth > target`で0を返す一方、overview statusは`amount === null && result.status === complete`の場合しか上書きしない。したがって、startMonth=2026-08、targetMonth=2026-12、referenceDate=2026-07-01の有効なmonthly-fixed planでは、投影・税年計算がcompleteになり得るため、現行月掛金0円かつstatus=completeとなる。既存focused testはreceipt-age目標後の金額0円だけを確認し、開始前・終了後のstatusを確認していない。 Impact: まだ拠出開始していないiDeCo計画を現行月の計算済みsourceとして表示し、投資後手残りへ0円を採用するため、正本要件の「対象外期間を0円completeへ変換しない」に違反する。利用者は計画未開始と制度計算済み0円を区別できず、blocking warningも失われる。 Required: 投影statusとreferenceMonth掛金の可用statusを分離し、開始前・終了後はOverviewInvestmentResultをcompleteにしない。対象外期間の金額を0円として表示する場合もstatusは`not-configured`等の明示的な非complete状態とし、人物・世帯集計とwarningへ同じ状態を伝播する。開始前、開始月一致、終了月一致、終了後について、金額・status・warning・人物集計・世帯集計をfocused testとportable testで固定する。
- FINDING-007-R1-02 [MAJOR] src/modules/overview/overview-view.ts; tests/overview.test.ts; tools/test-portable-build.mjs: 世帯サマリーがNISA拠出額とiDeCo掛金を別々に表示せず、両者を合算した「月間投資額」だけを表示している。 Evidence: OverviewHouseholdResultにはnisaContributionYenとidecoContributionYenが存在しselectorも人物別合計を算出するが、renderOverviewの世帯summary gridはgross、take-home、living、after-living、investmentContribution、after-investmentと資産値だけをcard化している。人物別tableにはNISAとiDeCoの列がある一方、世帯欄には対応する2値がない。 Impact: 正式要件が人物別・世帯別に要求するNISA拠出額とiDeCo掛金を利用者が世帯単位で確認できず、`投資後手残り = 生活費後手残り - NISA拠出 - iDeCo掛金`の内訳と二重計上の有無を画面上で検証できない。 Required: 世帯サマリーへ`household.nisaContributionYen`と`household.idecoContributionYen`を別cardまたは同等の明示的な項目として追加し、既存の月間投資額合計も維持する。null、0円、正数、人物合計との一致をfocused／DOM／portable testで確認し、3値を混同しない日本語labelを使用する。
- FINDING-007-R1-03 [MAJOR] tests/overview.test.ts; tools/test-portable-build.mjs; package.json; .github/workflows/ci.yml: TASK-007で必須とされたoverview test matrixが未充足で、要件違反をcandidate exact CIが検出できない。 Evidence: 23件のoverview focused testには、iDeCo開始前・終了後のstatus、加入context不足、missing-rule、out-of-range、NISA missing-rule／out-of-range、negative projected gain、DOMでの悪意ある人物名等のsafe text描画、負の残額表示の確認がない。portable suiteもoverviewのheading、read-only、HTTPS evidence、360px、reload時bytes不変は確認するが、これらの境界を実操作で確認しない。実際にFINDING-007-R1-01のfalse-completeが424 Vitest／236 portable checksを通過している。 Impact: 正本選択、status/null伝播、overflow、負の資産損益、安全描画という非緩和要件の回帰がCI SUCCESSのまま残り、attempt 2以降でも同種の欠陥を再発させる。 Required: docs/ai/tasks/TASK-007.mdのTests節を実行可能なtestへ対応付ける。少なくともiDeCoの開始前／開始月／終了月／終了後、context不足、missing-rule、out-of-range、NISA missing-rule／out-of-range、negative gain、safe textContent、負数表示を追加する。現行rule package上でmissing-ruleを直接生成できない場合は、production制度値を変更せず、純粋selectorへ注入可能なfixtureまたは限定test seamで分岐を検証する。test名と実装reportで各必須境界の対応を明示する。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- relay import前にbranch tipがhandoff HEAD 9b061d6d835acca9ab4320bbe2cea677e25e5479とexact一致し、candidateがその直系親であり、candidate→handoff差分がreview正本・進捗正本だけで製品source差分0件であることを再確認する。
- 有効なiDeCo planについて、referenceMonthがstartMonthより前ならcurrentMonthContributionYen=0でもstatusはcompleteではなく、対象外期間を示す非complete状態とblocking warningを返す。
- referenceMonthがstartMonthと一致する場合は、必要contextがcompleteならentered monthlyContributionYenを使用し、statusと人物・世帯集計が正しくなる。
- referenceMonthが解決済みtargetMonthと一致する場合はentered monthlyContributionYenを使用し、targetMonth後は0円completeへ変換しない。
- 世帯サマリーにNISA拠出額、iDeCo掛金、月間投資額合計が別々に表示され、NISA+iDeCo=合計、人物別合計=世帯値を円単位で確認できる。
- iDeCo context不足、missing-rule、out-of-range、NISA missing-rule、out-of-range、negative gain、safe text描画、負数表示について明示的なfocusedまたはDOM testがPASSする。
- overview selectorと描画はAppState、StorageRepository、localStorage bytes、writer callを変更せず、legacy/manual/fixture sourceを正本へ昇格せず、NISA/iDeCoを生活費と二重計上しない。
- 424 Vitest、69 take-home focused、68 NISA focused、86 iDeCo focused、23 overview focused、236 portableの現行baselineを下回らず、追加後の最終countをreportする。
- PowerShell 7/5.1 governance、product identity smoke、audit validator、21-check normalization、npm ci/typecheck/lint/format/test/test:rules/test:nisa/test:ideco/test:overview/build/test:portableがすべてPASSする。
- 修正candidate exact GitHub Actions SUCCESS後だけattempt 2／standardのreview handoff-only commitを作成し、そのexact workflowもSUCCESSとする。origin/main、tag、releaseは変更しない。

## Tests

- iDeCo current-month period matrix: referenceMonthが開始前、開始月一致、終了月一致、終了後の各caseでamount、status、warning、person/household totalを検証する。
- iDeCo status matrix: context不足、annual-unit unsupported、invalid、incomplete、missing-rule、out-of-rangeを0円completeへfallbackせず検証する。
- NISA status matrix: null、invalid、missing scenario、missing-rule、out-of-rangeを既知amountとstatusへ分離して検証する。
- asset aggregation: negative projected gainを保持し、component nullで人物・世帯assetをpartial completeにしない。
- overview DOM: 世帯NISA、世帯iDeCo、投資合計を別表示し、負の残額、null、0円、悪意ある人物名・warningをtextContentで安全に描画する。
- portable file://: overview direct-open、source更新後の即時反映、reload、history、360px、keyboard focus、separate household contribution labels、runtime/console/page error 0、localStorage bytes不変を検証する。
- npm run test、npm run test:rules、npm run test:nisa、npm run test:ideco、npm run test:overview、npm run build、npm run test:portable。
- PowerShell 7/5.1のvalidate-ai-governance、test-requirements-defined-smoke、validate-audit-identities、test-audit-identity-normalization。

## Forbidden changes

- FINDING-007-R1-01、FINDING-007-R1-02、FINDING-007-R1-03をdeferred、accepted risk、optional、relaxableとして扱うこと。
- iDeCo開始前・終了後を0円completeのまま維持すること、またはwarningだけ追加してstatusをcompleteのままにすること。
- 世帯NISA・iDeCo内訳を合算値だけで代替すること、または人物別表示だけを理由に世帯表示を省略すること。
- 必須境界testの削除、skip、assertion弱体化、単なるtest名やreport記載だけで実検証を代替すること。
- docs/product/**、docs/ai/generated/shared/**、PRODUCT_IDENTITIES、AUDIT_IDENTITIES、既存tax/social-insurance/NISA/iDeCo ruleまたはDomain calculation behaviorの変更。
- AppState schemaVersion、migration、import/export、StorageRepository、localStorage key/bytes、overview resultの永続化。
- legacy-manual、budget manual income、fixture take-home、ContributionSourceをoverviewの法定手取りまたはNISA/iDeCo正本へ使用すること。
- main直接実装・merge、tag、GitHub Release、distribution、reset、stash、clean、restore、rebase、history rewrite、force push。

Validated full bundle: docs/ai/reports/TASK-007/RELAY_BUNDLE.json
