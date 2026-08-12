---
task_id: TASK-005
title: NISAベータ
status: review_requested
route: TWO_SESSION_FAST
priority: normal
spec_revision: 1
spec_status: accepted
current_phase: implementation_review
current_role_id: ORCHESTRATOR_AND_REVIEWER
next_actor: ChatGPT
next_role: ORCHESTRATOR_AND_REVIEWER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-005/IMPLEMENTATION_REVIEW_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: recommended
claude_implementation_review_recommendation: recommended
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: 74599efd2afedfa8c1fba196aaab51459571913e
base_tree: 25a0d8acd4910e562a816814affa61de92d4fdbf
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29
implementation_candidate: d127f26a78342ab3d7674ee99e6f50d87532e891
review_stage: implementation
changes_requested_cycles: 2
implementation_review_attempt: 3
implementation_review_profile: relaxed
implementation_review_final: true
implementation_review_terminated: false
review_kind: implementation
review_role: ORCHESTRATOR_AND_REVIEWER
execution_mode: separate_session
repository_access: true
review_status: requested
request_review_status: requested
review_model: 5.6 Sol
review_effort: high
reviewed_candidate: d127f26a78342ab3d7674ee99e6f50d87532e891
reviewed_spec_revision: 1
review_request_id: none
review_started_at: none
review_completed_at: none
review_result: none
review_findings_count: 0
review_finding_ids: none
actual_executor: ChatGPT
provider_substitution: none
shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e

updated_at: 2026-08-12
---

# TASK-005 — NISAベータ

## Purpose

日本国内の成人利用者向けNISAベータとして、2024年以降のNISA制度の年間投資枠・非課税保有限度額を公式一次資料に基づくruleで検証し、人物別の積立・一括拠出計画、元本・運用益・将来残高・残枠を安全に試算できるようにする。制度値や将来利回りを推測せず、売却枠再利用・商品適格性・未成年向け2027年拡充等の対象外条件を成人ruleへ混在させない。

## Scope

- TASK-005を独立TASKとして開始し、implementation reviewはattempt 1／standard、changes_requested_cycles 0から開始する。TASK-004のreviewを再開せず、TASK-004 candidate 0f7ae95e296caa741ab3fdde03b9180c3bea122eは未承認・exact commitとしてmain未反映の履歴を維持する
- 実装baseはmain exact commit 74599efd2afedfa8c1fba196aaab51459571913e、tree 25a0d8acd4910e562a816814affa61de92d4fdbfとし、専用branch codex/task-005-nisa-betaをこのcommitから作成する。mainへ直接実装しない
- TASK-010は完了して上記mainへ統合済みとして扱い、CURRENT_STATE／PROJECT_REQUIREMENTSに残る『main integration pending』等の古い表現は現在のmain exact stateを優先して同期修正する
- #/investmentsのうちNISA機能だけを実装し、iDeCoはTASK-006まで未実装表示を維持する。NISAとiDeCoを同時に完成させない
- 人物別NISA計画を実装し、対象人物、開始年月、目標年月、現在残高、現在簿価、2024年以降NISAの非課税保有限度額使用額、成長投資枠使用額、毎月つみたて投資枠額、毎月成長投資枠額、臨時拠出、拠出タイミングを管理する
- NISA制度値はsrc/rules/jp/nisa配下の有効期間付きruleとmetadataで管理し、UIやdomain計算へ2026年の数値を直書きしない。成人ruleは2024年以降の現行制度を対象とし、利用年1月1日時点18歳以上の国内居住者を対象にする
- 成人NISAのrule値は、つみたて投資枠年間1,200,000円、成長投資枠年間2,400,000円、年間合計3,600,000円、非課税保有限度額総額18,000,000円、うち成長投資枠12,000,000円とする。年間枠・総枠は取得価額／簿価ベースで扱う
- 2023年までの一般NISA・つみたてNISA保有額は2024年以降NISAの18,000,000円総枠の外枠であるため、usedLimitYen／usedGrowthLimitYenへ自動加算しない
- 売却による翌年以降の非課税保有限度額再利用はproduct sourceどおりTASK-005対象外とする。売却イベントや復活枠を自動計算せず、現在の使用額は利用者が金融機関等で確認した2024年以降NISAの使用額を入力する
- 令和8年度税制改正で2027-01-01以後に0～17歳のつみたて投資枠が拡充されることは最新一次資料として認識するが、本製品の本人／同棲相手・配偶者向け成人NISAベータでは未成年ruleを実装しない。対象年1月1日時点18歳未満はadult ruleを適用せずunsupportedとして明示する
- 2026-04-01施行のつみたて投資枠対象商品要件改正を含め、個別商品のNISA適格性・商品リスト・銘柄推奨はTASK-005で判定しない。アプリは金額計画だけを扱い、商品推奨や商品適格性の推測をしない
- 年間枠は暦年単位で、月次積立と臨時拠出を枠種別ごとに集計する。各枠の上限一致はvalid、1円超過からinvalidとし、入力をclamp・削除せず超過額と該当枠を表示する
- 非課税保有限度額は入力済みusedLimitYen／usedGrowthLimitYenと将来の新規取得額から計算し、総枠18,000,000円および成長投資枠内数12,000,000円の一致をvalid、1円超過をinvalidとする。市場時価currentBalanceYenを枠使用額として代用しない
- 将来資産はproduct CALCULATIONSの月次シミュレーションを正本とし、monthlyReturn=(1+annualReturn)^(1/12)-1、monthlyFee=(1+annualFee)^(1/12)-1、netMonthlyFactor=(1+monthlyReturn)/(1+monthlyFee)を使用する。月初拠出は拠出後に月次運用、月末拠出は月次運用後に拠出する
- 将来元本は開始時currentBookValueYen＋将来拠出額、将来運用益は想定残高－将来元本として算出する。currentBalanceYenとcurrentBookValueYenの差を開始時点の含み損益として保持する
- 実質価値はtargetMonthまでの月数をyears=months/12としてnominalValue/(1+annualInflation)^yearsで算出する。年利は-100%未満を拒否し負利回りを許容、結果残高は0円未満にしない。非有限値・safe integer範囲超過は推測せずout-of-range／未計算として扱う
- 弱気・標準・強気の保存可能なscenarioを実装するが、アプリ側で期待リターンの推奨値を自動設定しない。利回り・費用率・インフレ率は利用者の明示入力とし、結果へ仮定値を併記する
- NISA planとscenarioは正本入力だけを永続化し、計算結果をstale copyとして保存しない。人物更新・plan更新・scenario更新後はselector/domainから再計算する
- 永続データ追加に伴いAppState schemaをv4へ更新し、v3→v4 migrationでNISA関連collectionを空状態として決定的に追加する。既存v1/v2→v3経路を維持し、v1/v2/v3 import、preview/commit transaction、prototype pollution拒否、overflow pre-write拒否、失敗時storage bytes不変を維持する
- NISA拠出をliving-expenseとして保存しない。TASK-007の統合サマリー前段階としてNISA計画を拠出の正本にし、既存fixture contribution／家計／手取りの挙動を壊さない。新しいcross-module自動linkや総合サマリー完成はTASK-007へ残す
- standalone single HTML、file://起動、5 route、same-path localStorage、360px、keyboard、focus、label、runtime request 0、console error 0、page error 0を維持する

## Out of scope

- iDeCoベータ、iDeCo上限・控除・手数料・受取計算
- NISA売却イベント、売却翌年の非課税保有限度額復活・再利用の自動計算
- 2027年以降の0～17歳向けつみたて投資枠60万円／非課税保有限度額600万円の実装
- 個別銘柄・投資信託・ETFのNISA対象商品判定、金融庁商品一覧のruntime取得
- 投資商品の推奨、期待利回りの推奨、リスク診断、リバランス提案
- 旧一般NISA・旧つみたてNISA・ジュニアNISAの新規購入、ロールオーバー、旧制度非課税期限の管理
- NISA口座の金融機関変更、口座開設手続、マイナンバー、配当受取方式、損益通算・繰越控除の税務処理
- 課税口座との比較、売却税、配当課税、受渡・約定・手数料の証券会社固有計算
- TASK-007の統合サマリー、NISA拠出後の世帯手残り統合完成
- TASK-008へ引き継いだschema v1改行表示名問題の修正・trim・置換・削除
- docs/product/**変更、backend、cloud同期、runtime CDN、runtime外部API、main merge、tag、release

## Acceptance criteria

- Codexがmain exact commit 74599efd2afedfa8c1fba196aaab51459571913e／tree 25a0d8acd4910e562a816814affa61de92d4fdbfを再確認し、専用branch codex/task-005-nisa-betaをexact baseから作成した後にREQUIREMENTS_DEFINED relayをimportする。origin/mainを変更しない
- REQUIREMENTS_DEFINED bundleのname、SHA-256、bytes、format、schema、repository、branch、recipient actor/role、base commit/tree、shared candidateをwrite前にexact検証し、TASK-005、CODEX_HANDOFF、CURRENT_STATE、NEXT_ACTION、BACKLOG/Progress、canonical relayを同一transactionでimplementation/Codex/5.6 Sol/highへ同期する
- shared v0.12.20 commit 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e、manifest SHA-256 94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FEをexact確認する
- accepted product identity docs/ai/PRODUCT_IDENTITIES.yml#requirements_*がSHA-256 E78C27CECFB360161B918F3990804B41137CE71A7B7FD1CD385EF117BE2A1A29へ一致する
- TASK-010はmain統合済みの完了TASKとして扱い、active化・再レビューしない。TASK-004 exact candidateは未承認履歴を維持し、attempt 4を作らない
- TASK-005 implementation_review_attempt=1、profile=standard、final=false、changes_requested_cycles=0として開始する
- 金融庁『NISAを知る』および国税庁No.1535を実装時に再取得し、成人現行NISAの年間枠120万円／240万円、合計360万円、総枠1,800万円、成長投資枠内数1,200万円、18歳要件、簿価ベースを確認してrule metadataへsource title/url/publisher/retrievedAt/verifiedAtを保存する
- 金融庁の令和8年度税制改正説明で2027年から0～17歳のつみたて投資枠拡充が成立済みであることを確認し、18歳未満へ成人NISA ruleを誤適用しない。未成年planはunsupported理由を表示する
- 成人NISA ruleはUI/domainへ数値を重複直書きせず、rule resolverから一意に選択する。metadata schema、ID一意性、effective period、source URLをvalidatorで検証する
- つみたて投資枠で年間1,200,000円、成長投資枠で2,400,000円、合計3,600,000円のそれぞれ上限-1円／一致／+1円をtestし、+1円だけinvalidになる
- usedLimitYen＋新規取得額について18,000,000円、usedGrowthLimitYen＋成長取得額について12,000,000円の上限-1円／一致／+1円をtestし、市場時価の増減で枠使用額を変えない
- 2023年までの旧NISA保有額を2024年以降の18,000,000円枠へ自動加算しない。売却枠復活を自動計算しない
- 各暦年の月次積立と臨時拠出をbucket別に集計し、開始月・目標月・年跨ぎで年間枠が正しくresetされる。対象期間外の臨時拠出はstructural validationで拒否する
- 上限超過時は利用者入力をclamp・削除・0円化せず、status=invalid、超過枠、超過額を表示し、State保存・reload・JSON export/import後も入力が保持される
- 必須入力欠落は0円や既定利回りで補完せずincomplete、18歳未満はunsupported、rule不在はmissing-rule、数値overflow/non-finiteはout-of-rangeとして区別する
- 月初拠出と月末拠出でproduct CALCULATIONSの順序どおり異なる決定的結果を返す。0%利回り、負利回り、費用率、インフレ率、長期積立をtestする
- 将来元本=currentBookValueYen＋将来拠出、運用益=想定残高－将来元本、実質価値=nominal/(1+inflation)^(months/12)を検証し、currentBalance/currentBookValueの既存含み損益を失わない
- scenarioは弱気・標準・強気を保存・切替できるが、未入力の利回りを推奨値で自動補完しない。scenario更新後の結果はderived再計算され、stale computed resultを永続化しない
- 同一memberに複数のactive NISA正本を作らず、本人とpartnerのNISA枠・使用額・scenarioを混同しない。inactive partnerのplanを勝手に削除しない
- AppState v4 migrationはv3 stateへNISA関連空collectionを追加するだけで既存budget、member、take-home、link値を変更しない。v1/v2/v3からのmigrationは決定的・冪等で、旧保存bytesをimport previewだけで変更しない
- invalid JSON、prototype pollution、overflow、重複ID、壊れたmember参照等はwriter/listener/storage変更前に拒否し、State・storage bytes・副作用を不変にする
- #/investmentsで人物選択、NISA入力、臨時拠出CRUD、scenario入力・切替、年間枠・総枠・元本・運用益・想定残高・実質価値・status・rule sourceを文字で確認できる。iDeCoは未実装であることを明示する
- NISA入力をliving-expenseへ作成せず、既存家計集計・手取り計算・fixture contributionの値を変えない。TASK-003／TASK-010の全回帰testを維持する
- baselineの247 Vitest tests、69 focused take-home rule tests、128 portable browser checksを削除・skip・弱体化せず、新規NISA testを追加して全件成功する
- EdgeまたはChromeのfile:// portable testでNISA plan作成、上限一致、1円超過表示、scenario切替、reload、360px、keyboard、focus、localStorage保持、runtime request 0、console error 0、page error 0を確認する
- PowerShell 7/5.1 governance・product identity smoke、npm ci、typecheck、lint、format:check、test、既存test:rules、NISA focused rule tests、build、test:portableが成功する
- candidateを固定してpushした後、candidate exact GitHub Actions SUCCESSを確認してからimplementation review attempt 1／standard handoffを作成する。handoff-only commitのCIもSUCCESSを確認する
- implementation report／review handoffにbase commit/tree、candidate commit/tree、spec revision、NISA official sources、rule metadata、schema migration、全test数、portable evidence、workflow run ID、runtime request/console/page error件数、未解決事項を記録する
- main merge、tag、releaseを行わずChatGPTへcandidate exact reviewを返す

## Tests

- 成人NISA annual tsumitate 1,199,999／1,200,000／1,200,001円境界
- 成人NISA annual growth 2,399,999／2,400,000／2,400,001円境界
- 成人NISA annual combined 3,599,999／3,600,000／3,600,001円境界
- 非課税保有限度額 total 17,999,999／18,000,000／18,000,001円境界
- 成長投資枠 lifetime 11,999,999／12,000,000／12,000,001円境界
- 暦年跨ぎでannual limitがresetされ、lifetime limitは累積する
- 利用年1月1日時点18歳以上がadult rule対象、18歳未満はunsupportedでadult limitを適用しない
- 旧NISA外枠をnew NISA usedLimitへ自動加算しない、売却による翌年枠復活を自動計算しない
- currentBalance変動でusedLimitが変わらず、currentBookValueとusedLimitを時価で上書きしない
- 月初拠出／月末拠出の順序差、0%・負利回り・費用率・インフレ率・長期projection
- currentBookValue＋future contributionsの元本、projected balanceとの差による運用益、実質価値
- 上限超過入力の保存・reload・export/import保持とinvalid表示
- scenarioの保存・切替、blank assumptionsのincomplete、推奨利回り自動設定なし
- self／partner枠分離、inactive partner保持、duplicate active NISA plan拒否
- v3→v4 migration、v1/v2/v3 import、preview bytes不変、invalid import rollback、prototype pollution拒否、overflow pre-write拒否
- NISA計画がliving expenseへ混入しないことと既存budget/take-home/contribution回帰
- file:// investments UI、臨時拠出CRUD、上限・残枠・projection、reload、360px、keyboard、focus、runtime request 0、console/page error 0

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
- npm run test:rules
- NISA focused rule tests (new dedicated command or direct Vitest target, recorded in package/CI)
- npm run build
- npm run test:portable
- candidate exact GitHub Actions success
- handoff-only exact GitHub Actions success

## Rollback

relay import、schema migration、validator、test、portable evidenceのいずれかが失敗した場合はTASK-005 branch内の当該transactionをbyte-exact rollbackし、origin/mainと既存v1/v2/v3保存データを変更しない。

## Forbidden changes

- origin/mainへの直接実装、main merge、tag、release、force push
- reset、stash、clean、restore、user-owned差分の上書き
- docs/ai/generated/shared/**の直接編集、docs/product/**変更
- TASK-004の再active化、attempt 4、旧candidate承認としての記録
- TASK-010の再active化・再レビュー・製品ロジック再変更
- NISA年間枠・総枠・対象年齢をUI/domainへハードコードしてruleを迂回すること
- 市場時価currentBalanceYenを簿価ベースの非課税保有限度額使用額として代用すること
- 上限超過入力をclamp、切捨て、0円化、silent deleteしてvalid化すること
- 売却枠再利用を推測実装すること、未成年向け2027年ruleへ成人ruleを代用すること
- 金融庁対象商品一覧のruntime取得、商品適格性の推測、投資商品・利回りの推奨
- NISA拠出をliving-expenseとして保存すること、linked amountのコピー保存、同一人物のactive NISA正本重複
- 計算結果を永続化してstale resultを作ること
- iDeCo完成実装、TASK-007統合サマリー完成、TASK-008 schema v1表示名問題修正
- runtime CDN、runtime外部API、backend、cloud同期
- ユーザー入力のinnerHTML連結、明示操作なしの外部source自動open
- 既存test削除・skip・assertion弱体化・baseline件数減少、TASK外refactor
