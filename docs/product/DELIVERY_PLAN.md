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

- JSON backup
- backup reminder
- schema migration
- responsive
- keyboard・focus・label
- error states
- documentation

## TASK-009 配布

- GitHub Actions
- standalone HTML配布と必要に応じたstatic deployment
- release checklist
- 制度確認日とversion表示

## 実装順序の制約

- TASK-002のspikeを通過するまで本格的な制度計算を実装しない。
- link、RuleResolver、import transactionを各moduleで独自実装しない。
- 各TASKはmainの固定baselineから専用branchで行う。
- 実装レビューは最大3回で、非緩和条件は`REVIEW_POLICY.md`に従う。
