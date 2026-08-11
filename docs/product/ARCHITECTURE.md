# 全体設計 v0.2

## 1. 設計原則

1. UI、ドメイン計算、制度ルール、保存を分離する。
2. 連携値を複製せず、正本への参照から導出する。
3. 制度値をコードへ散在させず、有効期間付きルールとして管理する。
4. 計算できない条件を推測で補完しない。
5. インポートとマイグレーションは検証後に一括反映する。
6. 各マイルストーンを単独で実行・テスト可能にする。

## 2. 技術構成

| 項目          | 採用                            |
| ------------- | ------------------------------- |
| Build         | Vite                            |
| Language      | TypeScript                      |
| UI            | HTML、CSS、Vanilla DOM API      |
| Routing       | hash route                      |
| Test          | Vitest                          |
| Lint / Format | ESLint、Prettier                |
| Storage       | localStorage behind repository  |
| Chart         | MVPでは表・数値表示、後続で選定 |
| Backend       | なし                            |
| Build output  | standalone `dist/index.html`    |

UIフレームワークを導入しない。状態管理・ルーティングも必要最小限のプロジェクト内実装とする。ただし独自フレームワーク化はしない。

### 2.1 開発sourceとstandalone build

開発sourceは`index.html`、`src/**/*.ts`、`src/**/*.css`と必要なmoduleへ分離し、手作業で1枚HTMLへ統合しない。`npm run dev`は開発用Vite serverを使用する。

`npm run build`はsingle-file build処理により、application JavaScript、CSS、必要な静的assetを`dist/index.html`へinlineする。build outputには`<script src>`、外部stylesheet、modulepreload、実行時dynamic import、絶対pathを残さず、複数chunkや外部assetを実行に要求しない。end userはHTMLをダブルクリックして`file://`で起動でき、HTTP server、Node.js、npm、runtime CDN、外部networkを必要としない。

portable browser testは生成HTMLだけを空白・日本語を含む一時folderへコピーし、system Chromium browserで5 route、hash正規化、navigation、history、reload、console／page error、runtime request、same-path localStorageを動的に検証する。

## 3. モジュール境界

```text
app
├─ router
├─ store
├─ actions
├─ selectors
└─ calculation-pipeline

modules
├─ overview
├─ budget
├─ take-home
├─ investments
└─ settings

domain
├─ money
├─ household
├─ budget
├─ income-tax
├─ resident-tax
├─ social-insurance
├─ nisa
├─ ideco
└─ investment-projection

rules/jp
data
ui
```

`modules`は画面とユースケースの組み立てを担当する。計算式を置かない。`domain`はDOM、localStorage、現在時刻、ネットワークへ依存しない純粋関数を基本とする。

## 4. ルーティング

```text
#/overview
#/budget
#/take-home
#/investments
#/settings
```

未知routeは`#/overview`へ置換する。route変更はブラウザ履歴へ反映し、描画前に必要なState selectorを実行する。

## 5. 状態管理

単一`AppState`をStoreで保持する。

- `getState()`
- `dispatch(action)`
- `subscribe(listener)`
- `select(selector)`

Reducerまたは同等の一方向更新を使う。UIからStateオブジェクトを直接変更しない。保存は有効なState遷移後にRepositoryへ委譲する。

## 6. 計算パイプライン

循環参照を防ぐため順序を固定する。

```text
1. 対象人物・対象年月を解決
2. 制度ルールを解決
3. iDeCo掛金上限を検証
4. iDeCo控除を含む税・社会保険を計算
5. 法定控除後手取りを計算
6. 生活費と個人別負担額を計算
7. NISA・iDeCo拠出を差し引く
8. 3段階の手残りを計算
9. 将来資産を計算
10. 警告・未対応項目を集約
```

総合サマリーは他画面の表示済み文字列を参照せず、同じDomain selectorから再計算する。

## 7. 値の連携

連携先へ金額をコピーしない。

```text
LinkedValue
- sourceType
- sourceId
- field
```

例:

```text
budget.incomeSource
  -> sourceType: takeHomeResult
  -> sourceId: income-plan-self-2026
  -> field: averageMonthlyTakeHomeYen
```

リンク元更新時はStore再計算で即時反映する。リンク切れは0円へ黙って変換せず、`broken-link`警告として計算を不完全状態にする。

## 8. 二重計上防止

`ExpenseItem.kind`を次に分離する。

- `living-expense`
- `asset-contribution`

NISA・iDeCoから生成する拠出は`asset-contribution`であり、生活費集計へ入れない。連携項目には一意な`sourceType + sourceId`を付け、同一sourceの重複生成を拒否する。

名称・金額・カテゴリの類似判定は正本の重複防止には使わない。手入力で似た項目がある場合は補助警告に限る。

## 9. 制度ルール解決

`RuleResolver`はdomainと対象日を受け、有効期間が一意に一致するruleを返す。

```text
resolve(domain, targetDate, context)
```

- 一致0件: `missing-rule`
- 一致2件以上: `overlapping-rule`
- 一致1件: 計算へ渡す

登録済み最新ルールの将来継続は既定で行わない。利用者が明示的に仮定モードを有効にした場合だけ、警告付きで実行する。

## 10. 保存

`StorageRepository`だけがlocalStorageへアクセスする。

```text
load()
save(validState)
export()
validateImport()
commitImport()
```

保存単位はAppState全体とし、書込前にserialize可能性・schema version・invariantを検証する。保存失敗時はメモリ上の操作を維持してエラーを表示し、成功したと誤表示しない。

`file://`利用時は同一file pathでlocalStorageを再利用する。HTMLの移動・folder名変更・file名変更ではbrowser origin相当の保存領域が変わる可能性があるため、移動前のJSON backupを案内する。

### インポート

```text
read bytes
-> JSON parse
-> schema validation
-> migration in memory
-> invariant validation
-> preview
-> user confirmation
-> atomic replacement
```

途中失敗時に現行データを変更しない。

## 11. セキュリティ・プライバシー

- 初期版は外部送信しない。
- ユーザー入力は`textContent`等で描画する。
- JSONインポートにサイズ上限を設ける。
- prototype pollutionを避け、未知キーをそのままmergeしない。
- 制度source URLは許可された`https`文字列として表示する。
- CSPは静的配信環境と整合する範囲で導入する。

## 12. 推奨ディレクトリ

```text
src/
├─ main.ts
├─ app/
│  ├─ app.ts
│  ├─ router.ts
│  ├─ store.ts
│  ├─ actions.ts
│  ├─ selectors.ts
│  └─ calculation-pipeline.ts
├─ modules/
│  ├─ overview/
│  ├─ budget/
│  ├─ take-home/
│  ├─ investments/
│  └─ settings/
├─ domain/
│  ├─ money/
│  ├─ household/
│  ├─ budget/
│  ├─ income-tax/
│  ├─ resident-tax/
│  ├─ social-insurance/
│  ├─ nisa/
│  ├─ ideco/
│  └─ investment-projection/
├─ rules/jp/
├─ data/
├─ ui/
└─ styles/

tests/
├─ unit/
├─ integration/
├─ rules/
└─ fixtures/
```

## 13. M1アーキテクチャスパイク

本機能を大量実装する前に次だけを縦断実装する。

1. 2人物の最小State
2. hash route
3. StoreとlocalStorage Repository
4. 有効期間付きfixture RuleResolver
5. 手取り結果のfixtureを家計へリンク
6. iDeCo fixtureを手取り計算へ参照
7. NISA・iDeCo拠出を生活費と分離
8. リンク元更新による自動再計算
9. リンク解除によるmanual切替
10. export/importの検証後置換
11. standalone single HTML buildと`file://`実browser検証

実税率や完成UIはスパイクに含めない。以下を自動テストで証明する。

- 循環参照しない。
- stale copyを保持しない。
- 同一sourceを二重計上しない。
- rule境界日で選択が変わる。
- import失敗で現行Stateが変わらない。
- HTML単体を別folderへコピーしても5 routeとsame-path保存が動作し、runtime network requestが発生しない。
