# Personal Finance Planner

**暮らしと資産プランナー**は、家計・手取り・NISA・iDeCoを同じブラウザ内で試算するローカルファーストWebアプリです。

## 現在の状態

- 設計基準: v0.2
- 実装状態: 未着手
- 対象: 日本国内の個人利用
- 保存方式: 初期版はブラウザ内保存とJSONバックアップ
- 計算結果: 税務・社会保険・投資判断を代替しない概算

## 主要画面

- 総合サマリー
- 家計・生活費
- 手取り計算
- NISA・iDeCo
- 設定

## 技術方針

- Vite
- TypeScript
- HTML / CSS
- Vanilla DOM API
- Vitest
- ESLint / Prettier
- 初期版はバックエンドなし

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
