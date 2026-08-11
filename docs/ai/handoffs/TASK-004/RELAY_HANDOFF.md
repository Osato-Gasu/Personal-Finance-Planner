# RELAY HANDOFF — TASK-004

- relay_schema: 2
- task_id: TASK-004
- decision: CHANGES_REQUESTED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-004-take-home-beta
- reviewed_candidate: 6c02e510de16a9ce0c3ce5bc0ef52ffc9e206819
- candidate_commit: 6c02e510de16a9ce0c3ce5bc0ef52ffc9e206819
- reviewed_handoff_head: b99d48cf8ffabe4062ff5b70be723c0c1b33bdb0
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: connector_read_only
- route_repository: Osato-Gasu/Personal-Finance-Planner
- requested_ref: refs/heads/codex/task-004-take-home-beta
- resolved_commit: b99d48cf8ffabe4062ff5b70be723c0c1b33bdb0
- next_action_blob: 615dd972812f143c1475965098aaa2c101ea97c2
- handoff_blob: 9d6da2bf62fc53883225c06ccc5e5ada5182793b
- adapter_blob: 3f9dd1a4e2e981fc58ddfd476c45e2f3d1748054
- review_stage: implementation
- implementation_candidate: 6c02e510de16a9ce0c3ce5bc0ef52ffc9e206819
- changes_requested_cycles: 1
- implementation_review_attempt: 2
- implementation_review_profile: standard
- implementation_review_final: false
- implementation_review_terminated: false

## Purpose

2026年の日本国内給与所得者について、本人とactiveな相手を人物別に、公式一次資料と有効期間付きrule packageに基づいて年間の法定控除後手取りを安全に概算する。住民税はmanual-annualまたはunsupported-uncomputedに限定し、iDeCo掛金控除あり・なしの所得税差額、計算状態、適用rule、公式source、家計への参照連携を提供する。

## Scope

- 日本国内の給与所得者、本人とactiveな相手の人物別計算、1人につき1事業所、原則1年間継続勤務、給与所得のみ、給与収入2,000万円以下、targetYear 2026
- 年収入力または月給・賞与入力。年収modeで社会保険自動計算に必要な月別・賞与別根拠が不足する場合は、追加入力を要求するかincompleteとし、根拠のない年平均・固定率・月給推測で補完しない
- 所得税、復興特別所得税、給与所得控除、基礎控除、課税所得の法定端数、累進税率、社会保険料控除、iDeCo掛金控除
- 協会けんぽ健康保険、介護保険、2026年に適用される追加保険料、厚生年金、雇用保険、標準報酬月額、標準賞与額
- 社会保険料の自動、手入力、未計算。manual modeは保険料項目を個別入力し、unsupported-uncomputedを0円として扱わない
- 住民税はmanual-annualとunsupported-uncomputedの2 modeだけを提供し、自動推測しない
- 結果状態complete、incomplete、unsupported、missing-rule、out-of-rangeを区別し、対象外・入力不足・rule不足を0円や固定率で補完しない
- AppStateをschema version 3へ更新し、storage key personal-finance-planner:state:v3を使用する。v1/v2から非破壊migrationし、v3存在時は旧keyへfallbackしない
- v1/v2の永続bytesを変更・削除しない。migration失敗時は全bytesと現在Stateを維持する。JSON importはv1/v2/v3を受理し、previewだけではStateを変更しない
- v2 TakeHomeInputをLegacyManualTakeHomePlanへ変換し、plan ID、memberId、既存LinkDefinition.sourceId、既存budget linkの月額解決結果を維持する。fixtureMonthlyTakeHomeYenはmanualAverageMonthlyTakeHomeYenへ移す
- legacy manual planを制度計算済みと表示しない
- CalculatedTakeHomePlanにplan ID、member ID、targetYear、annual/monthly入力mode、給与・賞与、生年月日、居住都道府県、事業所所在都道府県、社会保険設定、住民税設定、所得控除設定、active状態を保持する
- TakeHomeResultは純粋な派生値とし、永続Stateへコピー保存しない
- 2026年所得税rule packageと対象年月別社会保険rule packageを公式一次資料から実装し、各ruleに完全なmetadataとsource identityを持たせる
- 健康保険は居住地ではなく事業所所在都道府県を使い、必要期間の47都道府県を網羅する。年度途中の料率変更、給与分と賞与分、本人負担と事業主負担を分離する
- Rule validatorでID一意、metadata、公式publisher、HTTPS URL、ISO日付、期間順序・重複・空白、47都道府県coverage、標準報酬等級、所得税階層、雇用保険事業区分、missing/overlap、2027年明示失敗を検証する
- iDeCo所得税軽減額は控除なしと控除ありを完全に別計算した所得税差額とする。住民税のiDeCo軽減額は未計算と明示する
- 既存LinkDefinition構造を使いsourceType take-home-result、sourceId plan ID、field averageMonthlyTakeHomeYenで家計へ参照連携する
- linked valueを連携先へコピー保存せず、plan更新時に即時反映する。人物一致、同一targetのactive link最大1件、incomplete等を0円へ変換しない
- link解除時はその時点の解決済み月額をmanual値として確定する。legacy manual link互換を維持し、linked planを黙って削除しない
- #/take-home placeholderを人物・plan選択、対象年、給与・賞与、社会保険、住民税、所得控除、結果、控除内訳、iDeCo比較、rule/source、warning、家計連携を備えた実用画面へ置換する
- 画面と結果に常に「概算」を表示し、不完全な結果を完成値として強調しない。360px、keyboard、label、focus、文字によるerror表示へ対応する
- ユーザー入力をinnerHTMLへ連結せず、source URLは利用者が明示的にクリックした場合だけ開く
- 既存の家計・生活費MVP、v1/v2 migration、CRUD、平準化、負担割合、active link整合性、import transaction、prototype pollution拒否、overflow未計算表示、standalone file起動、runtime request 0を維持する

## Out of scope

- 2か所以上からの給与
- 年途中の就職・退職
- 給与以外の所得
- 確定申告全体
- 月次源泉徴収額の再現
- 住宅ローン控除等の税額控除
- 組合健保・共済等の自動計算
- 全国自治体の住民税自動計算
- iDeCo掛金上限判定
- 2027年以降の制度計算
- 未登録期間へのrule自動延長または最新rule継続仮定
- TASK-003でユーザー受容済みのschema v1改行表示名問題の修正。TASK-008へ引継ぎ済みであり、本TASKで表示名を自動修正、trim、置換、削除しない
- backend、cloud同期、runtime CDN、runtime外部API
- main merge、tag、release、配布

## Required changes

- FINDING-004-R2-01 [MAJOR] src/domain/take-home-calculator.ts::automaticSocial: 健康保険と厚生年金の年齢資格を月別に判定していない。介護保険の40歳・65歳だけを判定し、健康保険料・追加保険料・厚生年金保険料を全年齢へ12か月無条件加算するため、70歳以上へ厚生年金、75歳以上へ協会けんぽを控除したcomplete結果を返し得る。 Evidence: careEligibilityMonthsは40歳・65歳だけを扱い、月次loopはhealth、additional、pensionを年齢条件なしで加算している。日本年金機構の公式案内では厚生年金保険料は70歳到達前まで、健康保険料は75歳到達前までである。 Impact: 制度対象者・対象月と社会保険料が誤り、年間手取りを過少表示する。税・社会保険計算および対象年月・対象者は緩和禁止領域である。 Required: 健康保険・追加保険料・厚生年金・介護保険の年齢資格を公式一次資料付きruleとして実装し、誕生日到達月を含む月別境界を正しく適用する。高齢任意加入等を自動対応しない場合は推測控除せずunsupportedとする。39→40、64→65、69→70、74→75、既に70歳・75歳以上の給与・賞与golden testを追加する。
- FINDING-004-R2-02 [MAJOR] src/domain/take-home-calculator.ts::automaticSocial / CompensationInput: 年収入力modeの雇用保険料を、年間賃金額または単一annual overrideを12等分した推定月額から計算している。spec revision 2が禁止する、根拠のない月給推測である。 Evidence: annualEmploymentBaseを算出後、Math.floor(base / 12)と余りを各月へ配分し、2026年1～3月と4～12月の異なる料率を適用している。公式案内は被保険者負担額を毎月の賃金総額にその月の料率を乗じて控除する。 Impact: 月ごとの賃金が均等でない利用者では、年度途中の料率変更を誤った賃金配分へ適用し、雇用保険料と手取りが誤る。annualOtherTaxableSalaryYenも雇用保険算定基礎から脱落する。 Required: 年収modeでauto雇用保険を行うには、少なくとも各月または料率期間別の実賃金根拠を入力させる。不足時はincomplete、または雇用保険だけmanualへ誘導する。単一annual overrideの12等分は禁止する。1～3月と4～12月の賃金が異なる境界test、賞与eligible、その他課税給与の算定基礎testを追加する。
- FINDING-004-R2-03 [MAJOR] src/domain/take-home-calculator.ts::taxableAndTax / iDeCo comparison: iDeCo控除なし側では基準所得税だけを計算し、復興特別所得税と100円未満切捨てを再計算していない。incomeTaxBenefitFromIdecoYenは基準所得税同士の差だけで、控除なし／ありの完全な別計算になっていない。 Evidence: combinedTaxはafterIdeco.taxに対して1回だけ算出され、benefitはbeforeIdeco.tax-afterIdeco.taxである。既存goldenの年収600万円・iDeCo24万円では基準所得税差26,000円を期待するが、所得税及び復興特別所得税の別計算後総額は241,400円と214,900円で差額26,500円となる。 Impact: 表示するiDeCo税軽減額が実際に手取りへ反映される国税減少額と一致せず、法定端数境界でも誤る。 Required: 控除なし／ありの両方について、課税所得、基準所得税、復興特別所得税、最終100円切捨て後総額を独立計算する。比較UIで基準所得税・復興特別所得税・合計差を明確化し、住民税分未計算を維持する。上記26,500円例と100円境界golden testを追加する。
- FINDING-004-R2-04 [MAJOR] src/domain/state.ts::validateCurrentMembersAndIncome / src/domain/linked-value.ts: active link元planをcompleteからincomplete・unsupported・missing-ruleへ更新すると、AppState validationが保存前に拒否する。plan更新を家計へ即時反映し、未計算を0円化せずunresolvedとして表示する必須経路が成立しない。 Evidence: active link validationがcalculateTakeHome(...).status === completeを常時要求する一方、resolveIncomeTargetにはuncomputed-linkを返す実装がある。Store経由の有効Stateでは後者が到達不能である。 Impact: 住民税を未計算へ戻す、rule対象外へ変更する等の正当なplan更新が保存できず、linked valueの即時反映要件を満たさない。 Required: link作成時はcompleteを要求してよいが、作成後のplan更新ではsource存在・人物一致・一意性を維持したまま未計算状態を保存可能にする。家計selectorはnull/unresolved warningを返し0円化しない。complete→incomplete/unsupported/missing-rule更新、writer/listener、budget summary、reloadのtestを追加する。
- FINDING-004-R2-05 [MAJOR] src/domain/take-home-calculator.ts::calculateTakeHome status mapping: socialInsurance.modeが文字どおりunsupported-uncomputedでもresult.statusをincompleteとして返し、unsupportedConditionsも空になる。入力不足と製品非対応を区別できていない。 Evidence: unsupported-uncomputed分岐がemptyResult(plan, incomplete, ...)を呼び、emptyResultはstatusがunsupportedのときだけunsupportedConditionsへ理由を入れる。 Impact: 組合健保・共済等の非対応状態を単なる未入力として表示し、結果状態・warning・未対応条件の必須区別に違反する。 Required: 社会保険のunsupported-uncomputedはunsupportedとし、具体的なunsupportedConditionsを保持・表示する。manual項目欠落はincomplete、rule欠落はmissing-ruleへ分離する。各状態のUI・link・import testを追加する。
- FINDING-004-R2-06 [MAJOR] src/rules/jp/take-home/validator.ts::validateTakeHomeRulePackage: 標準報酬等級validatorが配列同士の同数性と昇順だけを確認し、健康保険50等級・厚生年金32等級、各境界値・標準額の公式表一致を検証しない。両配列から同じ等級を1件削除してもvalidatorが通る。 Evidence: validatorはlowerBoundsYen.length === standardMonthlyValuesYen.lengthとvalidateAscendingのみで、期待等級数や公式境界fixtureを持たない。negative testにも等級欠落・境界改変がない。 Impact: rule packageの等級欠落・誤値をCIが検出できず、多数の利用者の健康保険・厚生年金額が誤る。 Required: 健康保険50等級、厚生年金32等級を明示検証し、公式表の全lower boundとstandard valueをgolden fixtureまたは固定identityで照合する。等級削除、境界値変更、上下限変更のnegative testを追加する。
- FINDING-004-R2-07 [MAJOR] src/domain/take-home-plan.ts::CalculatedTakeHomePlan / schema v3: accepted spec revision 2がCalculatedTakeHomePlanの最低保持項目とした生年月日・居住都道府県を、planではなくHouseholdMemberだけに保存している。planのsave/load/import invariantとして検証されない。 Evidence: CalculatedTakeHomePlan interfaceにはbirthDateとresidencePrefectureがなく、calculateTakeHomeは外部のHouseholdMember.birthDateを参照する。 Impact: plan単体の制度入力identityが成立せず、人物プロフィール変更が既存planの年齢条件を遡及変更する。accepted data modelとmigration/import受入条件に不一致となる。 Required: birthDateとresidencePrefectureをCalculatedTakeHomePlanへ保持し、作成時の初期値、UI編集、save/load/import invariantを実装する。既存revision 2 candidate内v3データの移行方針を定め、plan別保持と人物プロフィール変更非干渉のtestを追加する。正式に別モデルへ変更する場合は実装で独自解釈せず新spec revisionのユーザー承認を得る。

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- REQUIREMENTS_DEFINED relayのname、SHA-256、bytes、schema、route_result、recipient identityを検証し、TASK-004、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG/Progressをimplementation/Codex/5.6 Sol/highへtransactionalに同期する
- main baseline commit bfb64e6cc6edf5e2e6a1fd43bff670db2e3de054、tree c375ef6c3b817fa1b733ebb7010ff03e365dbdfc、shared v0.12.20 commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、manifest 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FEをexact確認する
- accepted product identity docs/ai/PRODUCT_IDENTITIES.yml#requirements_*がSHA-256 E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29へ一致する
- AppState v3、storage key v3、v3優先、v1/v2 bytes不変、migration/import atomicity、preview無変更を自動テストで証明する
- LegacyManualTakeHomePlan変換でplan ID、memberId、sourceId、manualAverageMonthlyTakeHomeYen、既存budget linkの解決月額を維持し、制度計算済み表示をしない
- CalculatedTakeHomePlanの人物、targetYear、入力mode、給与・賞与、生年月日、居住地、事業所所在地、社会保険、住民税、控除、activeのinvariantを保存・load・import・migration前に検証する
- TakeHomeResultを永続Stateへ保存せず、同じStateとrule identityから決定的に再計算する
- 2026年所得税を単一固定率や月次源泉徴収表で代用せず、給与所得控除、基礎控除、課税所得端数、累進税率、復興特別所得税、社会保険料控除、iDeCo掛金控除を公式ruleで計算する
- 法定端数処理をbinary floating point任せにせず、整数または明示的decimal/rational表現と制度別丸め規則で再現する
- iDeCo所得税軽減額を控除なし/ありの別計算差額で求め、住民税分は未計算と明示する
- 協会けんぽ健康保険、介護保険、2026年追加保険料、厚生年金、雇用保険について対象年月ごとの公式ruleを使用し、必要期間の47都道府県coverageを満たす
- 事業所所在都道府県、月ごとの適用期間、年齢条件、給与/賞与別標準額、本人負担だけを正しく適用し、年平均率・居住地率・employer負担・組合健保代用を禁止する
- manual社会保険料は項目別入力し、未入力/unsupported/rule不足を0円へ変換しない
- 住民税はmanual-annualまたはunsupported-uncomputedだけとし、未入力時に所得税部分を表示しても年間/平均月間手取りをcompleteにしない
- complete、incomplete、unsupported、missing-rule、out-of-rangeの状態遷移とUI表示を区別する
- 各ruleにID、domain、jurisdiction、context key、effectiveFrom/To、effective basis、status、publishedAt、verifiedAt/By、source title、official HTTPS URL、publisher、retrievedAt、notesを保持する
- rule validatorがID、metadata、publisher/URL、日付、期間重複/空白、47都道府県、標準報酬等級、税階層、雇用保険区分、missing/overlap、2027年失敗を拒否する
- 結果へrule ID、対象期間、都道府県、標準報酬/標準賞与、確認日、公式source、warningを表示する
- 家計linkは参照解決で即時反映し、金額コピー保存、人物不一致、同一target複数active link、incomplete→0円、linked planのsilent deleteを拒否する
- link解除時は現在の有効な解決済み月額だけをmanual値として確定し、解決不能時に0円で確定しない
- #/take-homeが実用可能で、概算表示、入力、結果、控除内訳、iDeCo比較、rule/source、warning、link操作を提供する
- 360px幅、keyboard操作、label、focus、文字error、reload、file:// portable、console error 0、page error 0、runtime request 0を実browserで証明する
- Storeの無効actionとoverflow pre-write拒否でState、永続bytes、writer、listener、副作用を変更しない
- 既存TASK-003機能と全既存testを維持し、test削除・skip・弱体化を行わない
- PowerShell 7/5.1 governanceとproduct identity smoke、npm ci/typecheck/lint/format:check/test/build/portable、rule validator、rule golden、migration testが成功する
- 製品candidateを固定した後にcandidate exact GitHub ActionsがSUCCESSであることを確認してからimplementation review handoffを作成する
- implementation reportとreview handoffにbaseline/candidate/tree、spec revision、rule/source identity、local/CI tests、browser evidence、workflow run ID、runtime request、未解消事項を記録する
- main merge、tag、releaseを行わず、ChatGPTへcandidate exact reviewを返す

## Tests

- 所得税ruleの給与所得控除、基礎控除、課税所得端数、税率階層、復興特別所得税、iDeCo控除あり/なしの境界golden test
- 社会保険ruleの標準報酬月額、標準賞与額、健康/介護/追加保険料/年金/雇用保険、年齢・年月・給与/賞与・上限/下限境界golden test
- 必要期間の47都道府県coverage、年度途中料率変更、missing-rule、overlapping-rule、future 2027明示失敗
- v1/v2からv3へのmigration、v3優先、旧bytes不変、失敗rollback、JSON v1/v2/v3 import preview/commit transaction
- legacy manual planと既存budget link互換、sourceId/person/target active uniqueness、link即時反映、unlink freeze
- plan、bonus、member、social insurance、resident tax、deduction、active状態のinvariantとinvalid action副作用なし
- complete/incomplete/unsupported/missing-rule/out-of-range、未計算項目、overflow pre-write拒否
- UIの人物/plan、年、給与/賞与、保険、住民税、控除、結果、rule/source、warning、link、reload
- EdgeまたはChromeのfile:// portable test、360px、keyboard、focus、console/page error 0、runtime request 0
- PowerShell 7 governance、PowerShell 7 product identity smoke、PowerShell 5.1 governance、PowerShell 5.1 product identity smoke
- npm ci、npm run typecheck、npm run lint、npm run format:check、npm run test、npm run build、npm run test:portable
- 追加するrule validator、rule golden tests、migration testsをローカルとGitHub Actionsの両方で実行する
- 70歳・75歳の健康保険／厚生年金資格境界と給与・賞与控除golden tests
- 年収modeの1～3月／4～12月別雇用保険賃金根拠、欠落時incomplete、月別端数tests
- iDeCo控除なし／あり双方の所得税・復興特別所得税・100円切捨て比較tests
- linked plan complete→uncomputed更新の保存、即時反映、0円化拒否、reload tests
- unsupported／incomplete／missing-ruleの状態・unsupportedConditions分離tests
- 標準報酬50／32等級の欠落・境界改変negative validator tests
- CalculatedTakeHomePlanのbirthDate／residencePrefecture save/load/import invariant tests

## Forbidden changes

- main merge、tag、release、force push
- reset、stash、clean、restore
- docs/ai/generated/shared/**の直接編集
- docs/product/**の変更
- dist/**のcommit
- runtime CDN、runtime外部API、backend
- 公式source不明または確認不能なruleの推測実装
- 住民税の全国一律固定率・今年所得からの推測
- 組合健保・共済等への協会けんぽ料率代用
- 単一固定税率、月次源泉徴収表の年間税額代用、iDeCo掛金×固定率
- 2026年ruleの2027年以降への自動延長
- unsupported/incomplete/missing-ruleを0円として扱うこと
- employer負担を手取りから控除すること
- user inputのinnerHTML連結、明示clickなしのsource URL自動open
- test削除、skip、成功条件弱体化
- TASK外refactor
- TASK-003から引き継いだschema v1改行表示名を本TASKで自動修正、trim、置換、削除すること
- linked planのsilent deleteまたはlinked amountのコピー保存

Validated full bundle: docs/ai/reports/TASK-004/RELAY_BUNDLE.json
