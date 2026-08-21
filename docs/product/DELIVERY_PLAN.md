# 段階リリース計画 v0.2

## TASK-001 共通AI開発基盤導入

- `Osato-Gasu/shared`の固定version・commitから同期
- project adapter作成
- role、TASK lifecycle、review、handoff、validation導入
- 製品コードは変更しない

## TASK-002 基盤・横断アーキテクチャスパイク

- Vite、TypeScript、Vitest、ESLint、Prettier
- route、Store、Repository
- fixture RuleResolver
- 2人物State
- linked value
- link解除
- asset contribution分離
- export/import transaction
- source module分離を維持したstandalone single HTML build
- Windows Chromium系browserでの`file://` portable test
- same-path localStorage reloadとruntime network request 0の検証
- stale copy、二重計上、rule境界の自動テスト

完了条件: 実制度値や完成UIなしで横断データフローの安全性を証明し、ビルド済み`dist/index.html`単体をダブルクリックして利用できる。

## TASK-003 家計・生活費MVP

- カテゴリ・費目CRUD
- 日・週・月・年の平準化
- 詳細・簡易モード
- 共同・本人・相手費
- 3階層負担割合
- 月額サマリー

## TASK-004 手取り計算ベータ

- 給与・賞与入力
- rule framework上の所得税・住民税・社会保険
- 協会けんぽと手入力保険料
- 未対応条件
- iDeCo控除あり・なし比較
- 適用rule表示

制度値は公式一次資料と境界テストを伴う小分けTASKに分割してもよい。

## TASK-005 NISAベータ

- 人物別計画
- 積立・一括拠出
- rule上限
- 将来資産
- 元本・運用益・残枠
- 売却枠再利用は対象外

## TASK-006 iDeCoベータ

- 加入区分・企業年金条件
- 対象年月別上限
- 掛金、手数料、将来資産
- 手取り計算との控除連携
- 受取税引前表示

## TASK-007 統合サマリー

- 法定控除後手取り
- 生活費後手残り
- 投資後手残り
- 人物別・世帯別集計
- 正本参照による即時更新
- warning集約

## TASK-008 データ保全・UX完成

- v1～currentのlossless・deterministic・idempotent migrationと失敗時byte preservation
- schema v1 CR/LF/CRLF表示名のsingle-line input保存互換性
- 検証・preview・確認後だけatomic replacementするJSON backup/export/import
- BackupMetadataに基づくbackup reminder
- settings、responsive 360px、keyboard・focus・label、error states
- root `Personal-Finance-Planner.html`の決定的生成、freshness gate、`file://` portable verification
- cleanな常設mainのff-only同期とclean/reachable TASK worktreeの安全cleanup automation
- data preservation、migration、import atomicity、launcher freshness、main/worktree safetyはレビューで緩和しない

## TASK-009 配布

- GitHub Release
- static deployment
- distribution automation
- release checklist
- 配布version管理、制度確認日表示

## TASK-014 ライフプラン年間キャッシュフローMVP

- schema v7と決定的なv6→v7 migration
- 保存した基準日・開始年・開始時現預金残高・1～60年の投影設定
- 収入／支出ライフイベントの安定ID CRUDと暦年inclusive適用
- 総合サマリーの投資後手残りを固定年間キャッシュフローとして参照
- signed safe integer検証、入力不足・範囲外・最初の負残高警告
- 6 routeのstandalone `file://`、v6 byte preservation、再読み込み、runtime network 0
- TASK-013/shared recovery、制度rule変更、将来制度予測、main統合、releaseは対象外

## TASK-015 ライフプラン総資産時系列

- TASK-014年末現預金を変更せず、同じ暦年12月末のNISA・iDeCo名目残高を表示
- active人物・domain・source・endpoint・statusを持つruntime-only年次投資結果
- 保存済みライフプラン基準日に固定したiDeCo税診断context
- 固定キャッシュフローと実投資拠出の月次整合性検出、最初の不一致以降の合計非表示
- 失敗したactive投資、負の現預金、安全整数範囲外を0円または通常合計にしない
- schema v7、既存migration・calculator public結果、6 route、standalone `file://`を維持

## TASK-016 給与から投資までの連携ワークフロー

- top-levelを総合サマリ、給与計算、手取り計算、家計簿、NISA + iDeCo、設定の6 routeへ再編
- schema v8でPayrollPlan、TakeHomeCompensationBinding、BudgetIncomePolicyをtop-level追加
- 給与→手取り→家計→投資資金の一方向DAGとfail-closed authority
- 新規v8通常フローでunique給与計画を手取りplan作成時にatomic auto-bindし、既定家計policyをauto-take-homeにする（migrationは空binding/policyを維持）
- TASK-014/TASK-015を総合サマリ内「将来資産シミュレーション」に保持
- responsiveな共有dashboard UI、standalone `file://`、runtime network 0を維持
- 負債・純資産、dynamic cashflow再計算、chart、TASK-013/shared、Release、Distribution、Pagesは対象外

## 実装順序の制約

- TASK-002のspikeを通過するまで本格的な制度計算を実装しない。
- link、RuleResolver、import transactionを各moduleで独自実装しない。
- 各TASKはmainの固定baselineから専用branchで行う。
- 実装レビューは最大3回で、非緩和条件は`REVIEW_POLICY.md`に従う。
