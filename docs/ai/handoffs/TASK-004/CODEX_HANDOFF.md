# RELAY HANDOFF — TASK-004

- relay_schema: 2
- task_id: TASK-004
- spec_revision: 2
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-004-take-home-beta
- reviewed_candidate: none
- candidate_commit: none
- reviewed_handoff_head: none
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- session_mode: existing
- routing_mode: user_approved_spec_revision
- review_stage: implementation
- changes_requested_cycles: 0
- implementation_review_attempt: 1
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

- spec revision 2の全要件とspec revision 1実装を項目単位で照合し、不足・相違だけを実装する
- revision 2用の新candidate identity、全test、candidate exact CIを作成する

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

## Build

- pwsh -NoProfile -File tools/validate-ai-governance.ps1
- pwsh -NoProfile -File tools/test-requirements-defined-smoke.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1
- powershell -NoProfile -ExecutionPolicy Bypass -File tools/test-requirements-defined-smoke.ps1
- npm ci
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run build
- npm run test:portable
- rule validator
- rule golden tests
- migration tests
- candidate exact GitHub Actions success

## Rollback

relay importまたはvalidator失敗時は全変更をbyte-exact rollbackする。実装を破棄する場合はisolated TASK-004 branch/worktreeだけを廃棄し、mainを固定baselineに維持する

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

Validated source bundle: docs/ai/reports/TASK-004/SPEC_REVISION_2_SOURCE.json
Validated revision 2 bundle: docs/ai/reports/TASK-004/SPEC_REVISION_2_REQUIREMENTS.json
