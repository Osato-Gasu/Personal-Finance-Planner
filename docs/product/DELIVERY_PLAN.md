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

- 初回配布version `0.1.0`を`package.json`を唯一の正本として管理し、package-lock、表示、manifest、tag、Release titleへ決定的に反映する。settingsには既存rule metadataから導出した手取り確認日`2026-08-12`、NISA確認日`2026-08-12`、iDeCo確認日`2026-08-13`をread-only表示し、AppState、localStorage、backup/import/exportへ保存しない。
- root `Personal-Finance-Planner.html`を唯一のstandalone配布HTML正本とし、GitHub Release asset、Pagesの`index.html`、ダウンロードHTMLをtarget commitのroot launcherとbyte-exactに一致させる。manifest／checksumはUTF-8 no BOM、LF、末尾LF 1個の決定的形式でversion、tag、target commit、SHA-256、bytes、制度確認日を記録する。
- Pages stagingは`index.html`、`Personal-Finance-Planner.html`、`release-manifest.json`、`SHA256SUMS.txt`、`.nojekyll`だけを許可し、source、test、docs、TASK packet、user data、secret、linkを含めない。repository visibilityはprivateのまま、custom domain、第三者host、CDN、analytics、telemetry、backend、runtime external fetchを追加しない。
- 配布workflowはmanual `workflow_dispatch`専用で、push／pull_request／schedule／releaseをtriggerにせず、同一versionのconcurrency、GitHub公式actionのimmutable full-SHA pin、job-level least privilege、Pages environment／needsを備える。side effect前にversion、target SHA、exact main Governance CI、launcher、test、artifact allowlist、manifest／checksum、既存tag／Release、Pages入力を検証する。
- 公開順序は、全preflight成功後のtag作成、draft prereleaseとasset準備、Pages deploy、live raw-byte／browser検証、Release publishとする。既存objectを上書きせず、partial failureは自動rollback／unpublishせずactual identityと停止工程を監査記録する。APPROVED release headのmain統合とexact main CI成功までは公開side effectを作成しない。
- release checklistとsettings／release notesにはversion、commit/hash、制度確認日、concept-only、offline／no-backend、backupと同一path置換、file://版とPages版のorigin／storage分離、既知制約、失敗時手順を記録し、主要route、reload、360px、keyboard/focus、storage、backup/export/import、network／console／page error 0のbrowser evidenceを必須とする。
- activationではTASK-009のrequirements/state/report、必要なproduct要件正本とPRODUCT_IDENTITIESだけを同期し、金融計算、制度rule、保存data、製品実装、workflow、launcher、README、tag、Release、Pages、distributionは変更しない。TASK-012の残存空directoryはnon-blockingとし、force削除を行わない。

## 実装順序の制約

- TASK-002のspikeを通過するまで本格的な制度計算を実装しない。
- link、RuleResolver、import transactionを各moduleで独自実装しない。
- 各TASKはmainの固定baselineから専用branchで行う。
- 実装レビューは最大3回で、非緩和条件は`REVIEW_POLICY.md`に従う。
