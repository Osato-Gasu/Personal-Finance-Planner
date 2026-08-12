---
task_id: TASK-006
title: iDeCoベータ
status: ready
route: TWO_SESSION_FAST
priority: normal
spec_revision: 1
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-006/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: not_needed
claude_implementation_review_recommendation: not_needed
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_applicable
claude_implementation_review_status: not_applicable
base_commit: b8f4c27544534c8ed00a92493307ac37ed7649d3
base_tree: 900ba8cff38ed6969f7bef8d79dacdfab05a67ca
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
review_stage: implementation
changes_requested_cycles: 0
implementation_review_attempt: 1
implementation_review_profile: standard
implementation_review_final: false
implementation_review_terminated: false
attempt_4_forbidden: false

updated_at: 2026-08-13
---

# TASK-006 — iDeCoベータ

## Purpose

日本国内の本人と同棲相手または配偶者について、加入区分、企業年金条件、対象年月別制度上限、本人掛金、残高・拠出元本、固定手数料、既存InvestmentScenarioによる将来資産、実際の納付月に基づく所得税控除効果、手取り計算との参照連携、受取時税引前表示を安全に扱うiDeCoベータを実装する。制度区分・上限・将来改正、商品・金融機関・期待利回りを推測せず、NISAと同じscenario正本を再利用する。

## Scope

- TASK-006はTASK-005またはTASK-011の継続・再レビューではない独立TASKとし、spec revision 1、implementation review attempt 1、standard、changes_requested_cycles 0、final false、terminated false、attempt_4_forbidden falseから開始する
- exact baseはmain commit b8f4c27544534c8ed00a92493307ac37ed7649d3、tree 900ba8cff38ed6969f7bef8d79dacdfab05a67ca、workflow 31634237954 SUCCESSとし、専用branch codex/task-006-ideco-betaだけで実装する
- REQUIREMENTS_DEFINED importでTASK-006、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG、Progress、canonical RELAY_BUNDLE、RELAY_IMPORTを同一transactionへ同期し、activation/import-only commitには製品source変更を含めない
- activation/import-only commitを先にpushし、そのexact GitHub Actions SUCCESSを確認してから製品実装を開始する
- shared v0.12.20、commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、manifest SHA-256 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FEを固定する
- docs/ai/PRODUCT_IDENTITIES.ymlのrequirements、architecture、data model、calculations、rule governance、review policy、delivery planの全accepted SHA-256を固定し、docs/product/**を変更しない
- 厚生労省iDeCo、厚生労省2025年制度改正、厚生労省国民年金基金令等改正通知、iDeCo公式加入資格、iDeCo公式年単位拠出library、国税庁No.1135を2026-08-13に再取得し、制度値は公式一次資料だけを根拠にする
- src/rules/jp/ideco/へmetadata付き有効期間rule packageを追加し、2024-12-01から2026-11-30のcurrent ruleと2026-12-01以降のscheduled ruleを持たせる
- 2024-12 current ruleはcategory1/category4の共通枠68000円から国民年金基金掛金と付加保険料を控除し、category2企業年金なし23000円、企業年金ありmin(20000,55000-employerDcContributionYen-otherPensionEquivalentYen)、category3 23000円、category5 unsupportedとする
- 2026-12 scheduled ruleはcategory1/category4の共通枠75000円から国民年金基金掛金と付加保険料を控除し、category2企業年金なし62000円、企業年金あり62000円から企業年金相当額を控除し、category3 23000円、category5は確認済み加入区分として企業年金なし62000円または企業年金相当額控除後上限を扱う
- rule contextはparticipantCategory、participantCategoryConfirmed、employerPensionType、employerDcContributionYen、otherPensionEquivalentYen、nationalPensionFundContributionYen、nationalPensionAdditionalPremiumYen、matchingContributionActive、idecoPlusActiveをstable keyで保持し、必要なnullと明示0円を区別する
- participantCategoryConfirmed=falseまたは必要context nullはincomplete、matching contribution実施中の非加入条件、iDeCo+ active、年単位拠出利用はunsupportedとし、加入区分を年齢・職業名から推測しない
- 掛金方式はmonthly-fixedだけを自動計算し、monthlyContributionYen nullはincomplete、0は明示停止、正数は5000円以上・1000円単位・allowedContribution以下を必須とし、clamp・切捨て・0円化・silent deleteをしない
- 月別指定の年単位拠出をgeneric one-off contributionへ簡略化せず、『月別指定（年単位）拠出は今回のベータでは未対応』と表示してunsupportedにする
- AppStateをschemaVersion 5へ更新し、人物ごとに最大1件のactive IdecoPlanを保持する。IdecoPlanはID、member、加入context、startMonth、monthly-fixed掛金、残高、拠出元本、固定手数料、union projectionTarget、拠出タイミング、既存scenario参照、active、税年払込snapshotを正本にする
- projectionTargetはmonthまたはreceipt-ageのunionとし二重正本を作らず、receipt-ageは試算目標であり法定受給資格を保証しない。inactive partnerのplanを削除しない
- activeScenarioIdは既存InvestmentScenarioを参照しmemberId一致を必須とし、iDeCo専用scenario collectionを作らない
- taxContributionSnapshotsはtaxYear、実際の納付月paidThroughMonth、本人掛金paidYenを保持し、掛金対象月と納付月を区別する。確定snapshotと同税年の未来納付分を重複させず、必要な過去払込情報欠落を0円推測しない
- v4からv5 migrationはidecoPlans=[]を追加し、既存CalculatedTakeHomePlanのannualIdecoContributionYenをbusiness value上不変のmanual値として保持し、idecoContributionMode=manual、linkedIdecoPlanId=nullを設定する
- v1/v2/v3/v4 importをv5へ決定的に維持し、previewだけではState/storage bytesを変更せず、commit失敗時も旧bytesを維持する
- linked modeではTakeHomePlanへiDeCo金額copyを保存せずlinkedIdecoPlanIdから毎回導出し、same memberを必須とする。linked更新を即時再計算し、unlinkでlinked値をmanualへ自動copyしない
- linked iDeCoがinvalid、incomplete、unsupported、missing-rule、out-of-rangeの場合にmanual値や0円へfallbackせず、take-home resultも対応する未計算状態へ遷移する
- 所得税軽減額は既存income-tax engineによるiDeCo控除なし税額－控除あり税額で計算し、実際の税年払込本人掛金を控除正本にする。固定税率を掛けない
- 住民税軽減額はTASK-006で自動engineを新設せずnull/uncomputedと表示し、residentTaxBenefitFromIdecoYen、totalTaxBenefitYen、effectiveAnnualIdecoCostYenを未計算住民税0円扱いで完成値にしない
- take-home対象ruleは既存2026年だけを維持し、iDeCo ruleが存在しても2027年以降の税・社会保険ruleを推測追加しない
- 将来資産は既存scenarioのannualReturnBasisPoints、annualFeeBasisPoints、annualInflationBasisPointsを使用し、monthlyReturn=(1+annualReturn)^(1/12)-1、monthlyFee=(1+annualFee)^(1/12)-1、netMonthlyFactor=(1+monthlyReturn)/(1+monthlyFee)で月次反復する
- contributionTiming beginning/endを反映し、currentBalanceYenを時価、currentContributionTotalYenを本人拠出元本として分離し、futurePrincipalとprojectedGainを二重計上なく算出する
- monthlyFeeYenは明示入力としnullはincomplete、0は明示0円、金融機関固有値を推測しない。固定手数料はsimulation assumptionとして各月の掛金・運用処理後の月末に1回控除し、残高を0円未満にしない
- realValueはnominal/(1+annualInflation)^(months/12)とし、月次利回り・費用・net factor・inflation factor・残高・実質価値のNaN/Infinity/non-finite/safe integer overflowをout-of-rangeとし0円completeへ変換しない
- State pre-write validationでduplicate plan ID、missing member、人物別active重複、scenario member mismatch、broken linked ref、take-home member mismatch、不正enum、必要null、unsafe/negative money、不正YearMonth/target、snapshot重複・不正月・overflow、不合理なpaidYen、rule missing、projection overflow、prototype pollution、unknown malformed structureを拒否する
- 拒否時はStore State、storage bytes、writer call、listener通知、既存保存を完全不変にしpartial writeを発生させない
- rule metadataはid、domain、jurisdiction、effective期間、status、publishedAt、verifiedAt、verifiedBy、sourceTitle、sourceUrls、sourcePublisher、sourceRetrievedAt、notesを保持し、ID、real ISO date、期間順序、overlap/gap、scheduled早期適用、context coverage、absolute HTTPS URL、hostname、duplicate source、安全整数、法定値整合をvalidatorで検証する
- iDeCo resultはcomplete、invalid、incomplete、unsupported、missing-rule、out-of-rangeを分離し、制度上限超過等のinvalid入力を保存値のまま示して0円補正しない
- #/investmentsの既存NISA UIを維持してiDeCo sectionを追加し、人物、加入context、開始月、掛金、残高・元本、固定手数料、目標、タイミング、bear/standard/bull scenario、active、税年snapshotを操作可能にする
- UI結果へ選択rule ID・期間・公式source・確認日、allowed/entered/exceeded/affected month、税年払込掛金、元本、想定残高、損益、実質価値、固定手数料前提、所得税軽減、住民税未計算、総軽減/実質負担未計算、unsupported等理由、受取時税引前警告を表示する
- 既存NISA statutory behaviorとsrc/domain/nisa.ts、src/rules/jp/nisa/rules-2024.tsの制度ロジックを変更せず、既存InvestmentScenario共有に必要な最小型整理だけを許可する
- iDeCo planをliving expenseへ保存・自動copyせず、TASK-006のcross-module linkはiDeCo planからtake-home deductionだけとし、TASK-007統合サマリーを完成させない
- TASK-011のAUDIT_IDENTITIES.json、audit validator、normalization test、project overlay gateとcurrent/historical identityを変更・削除・弱体化しない
- npm run test:idecoを追加してCIへ接続し、rule、掛金、context、metadata、tax link、projection、migration/import、portable browserの全境界を検証する
- 実装candidateを固定してbranchへpushしcandidate exact GitHub Actions SUCCESS後だけattempt 1/standardのimplementation review handoff-only commitを作成・pushし、そのexact CI SUCCESSを確認する

## Out of scope

- iDeCo受取開始資格の自動認定、受取税額、退職所得控除、公的年金等控除の計算
- 月別指定（年単位）拠出の実装またはgeneric一括拠出への簡略化
- iDeCo+の自動計算、事業主掛金と本人掛金の混在
- 2027年以降の所得税・住民税・社会保険rule推測追加
- 住民税自動計算engineまたは固定10%推測
- 商品、投資信託、金融機関、provider手数料、期待利回りの推奨・推測
- TASK-005 attempt 4、TASK-005再レビュー・retroactive approval・active化
- TASK-011再active化・再レビュー
- 既存NISA制度ロジック・validation behavior変更
- TASK-007統合サマリー完成、TASK-008作業
- backend、cloud sync、runtime CDN、外部API、distribution
- main直接実装、main merge、tag、GitHub Release
- docs/product/**変更、docs/ai/generated/shared/**直接編集、audit identity変更
- test削除、skip、assertion弱体化、TASK外refactor
- reset、stash、clean、restore、history rewrite、force push

## Acceptance criteria

- activation/import前にorigin/main exact commit/tree、base workflow SUCCESS、active_tasks=[]、next_candidate TASK-006、TASK-005 terminated/unapproved/attempt4 forbidden、TASK-011 completed、shared/product identities、clean/untrackedなし、target branch未使用をexact確認する
- canonical REQUIREMENTS_DEFINED bundleのschema、repository、branch、recipient、route_result blobs、base commit/tree、shared candidateをwrite前に検証し、import失敗時はbyte-exact rollbackする
- activation/import-only commitにはTASK-006 governance stateとgenerated Progress以外の製品source変更を含めず、push後のexact workflow SUCCESSを確認する
- 公式sourceの再取得でcurrent ruleと2026-12 scheduled ruleの制度値・加入不可条件・年単位拠出条件を確認し、source title/publisher/URL/publishedAt/retrievedAt/verifiedAtを実装reportへ記録する
- 2024-12 ruleでcategory1 68000 residual、category2 none 23000、category2 pension min(20000,55000 residual)、category3 23000、category4 68000 residual、category5 unsupportedを返す
- 2026-12 ruleでcategory1/category4 75000 residual、category2 none 62000、category2 pension 62000 residual、category3 23000、category5 none 62000/pension residualを返す
- 2026-11-30は旧rule、2026-12-01は新ruleを選び、scheduled ruleを2026-11へ早期適用しない。期間overlapと意図しないgapをvalidatorが拒否する
- participant category blank/confirmed false、企業年金context blank、明示0、matching contribution、iDeCo+、年単位拠出をincomplete/unsupportedへ正確に分類する
- monthly contribution null、0、4999、5000、5001、6000、allowed-1、allowed exact、allowed+1、residual 5000未満を検証し、invalid入力をclampせず保持する
- AppState v5でIdecoPlan、taxContributionSnapshots、take-home manual/linked fieldsを保存し、人物別active最大1件、scenario/member、link/member整合をpre-writeで強制する
- v4からv5でidecoPlans=[]、manual mode、linkedIdecoPlanId=nullを決定的に追加し、既存annualIdecoContributionYenを変更しない。v1/v2/v3/v4 importを維持する
- linked planを正本参照し、TakeHomePlanへannual linked copyを保存せず、update即時再計算、unlink時copyなし、invalid/incomplete/unsupported/missing-rule/out-of-range時fallbackなしを検証する
- 税年控除額はpaid snapshotとsnapshot後の同税年実納付future contributionから算出し、掛金対象月と翌月納付を混同せず、snapshot overlapと過去情報欠落を拒否・incompleteとする
- 所得税軽減額を既存before/after税額差で算出し、resident-tax benefit、total benefit、effective costはuncomputedを保持してfalse completeにしない
- 将来資産で0%、負利回り、正利回り、annual fee、fixed fee 0/正数、月末控除、beginning/end、inflation、残高/元本分離、gain/loss、長期、scenario blankを決定的に検証する
- non-finite inflation/net factor、NaN/Infinity、unsafe integer overflowをout-of-rangeまたはpre-write拒否とし、balanceを0未満またはfalse completeにしない
- rule metadata validatorがinvalid URL、http、relative URL、empty hostname、duplicate URL、invalid ISO date、duplicate ID、overlap、gap、missing context、premature scheduled application、unsafe statutory valueを拒否する
- Store/import拒否時にStateとstorage bytesがbyte-equivalent不変、writer/listener 0、partial writeなしであることを検証する
- #/investmentsでiDeCo plan作成、self/partner分離、inactive partner保持、rule境界、exact/1円over、null/0、unsupported、scenario、projection、fee、税引前警告、take-home link、reload/localStorage、360px、keyboard/focus/labelを実browserで検証する
- runtime requests 0、console errors 0、page errors 0を維持し、standalone file:// HTMLを保持する
- 既存315 Vitest、69 take-home focused、68 NISA focused、168 portable checksを下回らず、既存testを削除・skip・弱体化しない
- docs/product/**、generated shared、AUDIT_IDENTITIES.json、audit validator/test、NISA statutory source/testをcandidateで変更しない
- current audit identity F56B8FE68C7CBEF3768CF492476DE1E9C17FFF04A719A305D5C760FF487AF5A3/34370/blob d42192e7534ca5e2dced23955743a5815fec6c38とhistorical identity 0143D33D69C56705FFA74B5E73265A4594681FA7E8440B743EF7658F6829731E/34723/blob 0f60e90764e81d4e7b02efa62c8a8900305d025bを維持する
- PowerShell 7/5.1 governance、product identity smoke、audit validator、21-check normalization testと全npm gateをPASSする
- candidate exact CI SUCCESS前にreview handoffを作らず、SUCCESS後だけattempt 1/standard/cycles 0/final false/terminated falseのhandoff-only commitを作成する
- handoff exact CI SUCCESS後にbase、activation、candidate、handoff commit/tree/workflow、rules/source、schema/migration、全test counts、portable、audit、main不変、tag/releaseなし、unresolved事項をChatGPTへ返す

## Tests

- PowerShell 7: tools/validate-ai-governance.ps1、tools/test-requirements-defined-smoke.ps1、tools/validate-audit-identities.ps1、tools/test-audit-identity-normalization.ps1
- Windows PowerShell 5.1: tools/validate-ai-governance.ps1、tools/test-requirements-defined-smoke.ps1、tools/validate-audit-identities.ps1、tools/test-audit-identity-normalization.ps1
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test: baseline 315を下回らずiDeCo追加testを含む総数を報告
- npm run test:rules: 69 take-home focusedを維持
- npm run test:nisa: 68 NISA focusedを維持しNISA behavior不変
- npm run test:ideco: current/scheduled category matrix、2026-11/12境界、掛金5000/1000、context、metadata、unsupportedを検証
- tax link tests: manual migration、reference source、same member、immediate recalc、unlink、no fallback、snapshot/payment month、income-tax difference、resident-tax uncomputed
- projection tests: return/fee/timing/inflation/principal/gain/long horizon/non-finite/overflow/no recommendation
- migration/import tests: v1-v4 to v5、NISA exact behavior、duplicate/broken refs/snapshot/overflow/prototype pollution、preview/rollback/side-effect zero
- npm run build
- npm run test:portable: existing 168を維持しiDeCo UI、reload、360px、keyboard、runtime/console/page error 0を追加検証
- activation/import-only commit exact GitHub Actions SUCCESS
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff-only commit exact GitHub Actions SUCCESS

## Build

- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/validate-audit-identities.ps1
- powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/test-audit-identity-normalization.ps1
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run test:rules
- npm run test:nisa
- npm run test:ideco
- npm run build
- npm run test:portable
- activation/import-only commit exact GitHub Actions SUCCESS
- implementation candidate exact GitHub Actions SUCCESS
- implementation review handoff-only commit exact GitHub Actions SUCCESS

## Rollback

relay import、generator、validator、実装またはtest失敗時はtransactional byte-exact rollbackまたは意図した新規TASK-006変更だけの通常修正commitを用いる。reset、stash、clean、restore、history rewrite、force pushは使わず、origin/main、他TASK branch、ユーザー所有差分を変更しない。

## Forbidden changes

- TASK-005 implementation review attempt 4、TASK-005再レビュー・retroactive approval・active化
- TASK-011再active化・再レビュー
- docs/product/**変更
- docs/ai/generated/shared/**直接編集
- docs/ai/AUDIT_IDENTITIES.jsonまたはaudit validator/testの変更・削除・弱体化
- NISA statutory behavior、src/domain/nisa.ts、src/rules/jp/nisa/rules-2024.tsの制度ロジック変更
- iDeCo法定上限のUI/domain重複ハードコード
- source URL prefixだけのvalidation、blankの0円扱い、invalid掛金clamp
- iDeCo+の事業主掛金無視、年単位拠出のgeneric一括拠出化
- resident tax固定率、未登録take-home年度rule、商品・利回り・provider手数料の推測
- linked値copy保存、NISA/iDeCoの生活費二重計上
- TASK-007統合サマリー完成、TASK-008作業、backend、cloud sync、runtime CDN、runtime外部API
- test削除、skip、assertion弱体化、TASK外refactor
- main直接実装、main merge、tag、release、distribution
- reset、stash、clean、restore、history rewrite、force push
