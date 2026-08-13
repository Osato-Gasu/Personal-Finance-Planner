# Personal Finance Planner

**暮らしと資産プランナー**は、家計・手取り・NISA・iDeCoを同じブラウザ内で試算するローカルファーストWebアプリです。

## 現在の状態

- 設計基準: v0.2
- 実装状態: M1横断アーキテクチャスパイク
- 対象: 日本国内の個人利用
- 保存方式: 初期版はブラウザ内保存とJSONバックアップ
- 計算結果: 税務・社会保険・投資判断を代替しない概算

## 主要画面

- 総合サマリー
- 家計・生活費
- 手取り計算
- NISA・iDeCo
- 設定

## 開発と利用

開発時はsource moduleを分離したままViteを使用する。

```text
npm install
npm run dev
```

配布用HTMLは`npm run build`でrepository rootの`Personal-Finance-Planner.html`へ生成・同期する。end userはこのHTMLをダブルクリックするだけで起動でき、利用時にHTTP server、Node.js、npmは不要である。JavaScriptとCSSはHTMLへinlineされるため、このHTMLだけを別folderへコピーしても利用でき、runtimeの外部通信も行わない。

`npm run test:portable`はbuild後のHTMLだけを別folderへコピーし、system EdgeまたはChromeの`file://`でroute、browser history、reload、保存、runtime通信なしを検証する。

Stateは同じfile pathのlocalStorageへ保存される。HTMLの移動・folder名変更・file名変更によりbrowser上の保存領域が変わり、以前のStateが見えなくなる可能性があるため、移動前に設定画面の「JSONバックアップを保存」を実行する。復元時は設定画面でJSONを選び、検証結果を確認してから「確認して復元」を押す。取消または検証失敗では既存データを変更しない。

## 技術方針

- Vite
- TypeScript
- HTML / CSS
- Vanilla DOM API
- Vitest
- ESLint / Prettier
- 初期版はバックエンドなし
- 配布物はstandalone single HTML

## 設計正本

- [要件定義](docs/product/REQUIREMENTS.md)
- [全体設計](docs/product/ARCHITECTURE.md)
- [データモデル](docs/product/DATA_MODEL.md)
- [計算仕様](docs/product/CALCULATIONS.md)
- [制度ルール運用](docs/product/RULE_GOVERNANCE.md)
- [実装レビュー方針](docs/product/REVIEW_POLICY.md)
- [段階リリース計画](docs/product/DELIVERY_PLAN.md)
- [設計判断](docs/product/DECISIONS.md)

実装前に共通AI開発基盤を導入し、その後はTASK単位のbranch、candidate固定、テスト、実装レビューを経てmainへ反映します。
