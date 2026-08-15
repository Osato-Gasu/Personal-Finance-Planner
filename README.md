# Personal Finance Planner

**暮らしと資産プランナー**は、家計・手取り・NISA・iDeCoを同じブラウザ内で試算するローカルファーストWebアプリです。

## 現在の状態

- 設計基準: v0.2
- 初回配布version: 0.1.0（prerelease、tag `v0.1.0`）
- 対象: 日本国内の個人利用
- 保存方式: 初期版はブラウザ内保存とJSONバックアップ
- 計算結果: 税務・社会保険・投資判断を代替しない概算
- 制度確認日: 手取り 2026-08-12／NISA 2026-08-12／iDeCo 2026-08-13

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

0.1.0の配布物は、同じroot launcher bytesから作るpublic GitHub Releaseの`Personal-Finance-Planner.html`とGitHub Pagesの`index.html`／download HTMLである。repositoryはpublicで、commit history、branch metadata、公開Actions run・log、Release assetを第三者が閲覧できる。第三者のforkは作成後も存続し得るため、secretやprivateな金融exportをcommitしない。credential／PII等の公開事故が疑われる場合は配布を停止し、履歴を含むincident対応を優先する。backend、analytics、telemetry、runtime external requestは0である。配布物のtarget commit、SHA-256、bytesは`release-manifest.json`と`SHA256SUMS.txt`で確認できる。`SHA256SUMS.txt`は自己参照できないため自身だけを除外し、allowlist内の他4fileを記録する。

利用前にchecksumを照合し、更新前にはJSONバックアップを保存する。同じpathのHTMLを置き換えると同じ保存領域を継続利用できるが、file名・folder・pathを移動すると別の保存領域として見える場合がある。また、`file://`版とGitHub Pages版は別origin・別storageであり、localStorageも共有されないため、移行はJSON export/importで行う。本アプリは概算確認用であり、金融・税務・投資助言ではない。

`npm run test:portable`はbuild後のHTMLだけを別folderへコピーし、system EdgeまたはChromeの`file://`でroute、browser history、reload、保存、runtime通信なしを検証する。

Stateは同じfile pathのlocalStorageへ保存される。HTMLの移動・folder名変更・file名変更によりbrowser上の保存領域が変わり、以前のStateが見えなくなる可能性があるため、移動前に設定画面の「JSONバックアップを保存」を実行する。復元時は設定画面でJSONを選び、検証結果を確認してから「確認して復元」を押す。取消または検証失敗では既存データを変更しない。

## 配布手順

実配布はimplementation review APPROVED後、approved release headが`origin/main`へ統合され、そのexact main push `Governance CI`がSUCCESSになった後だけ行う。repository-native public exposure auditをrepository外へ生成し、そのabsolute pathとSHA-256を`tools/configure-pages.mjs`へ`--public-audit`／`--public-audit-sha256`として渡して既定dry-runを確認する。必要な場合だけexact target SHA・main CI run ID・approved release headと`--apply`を明示してGitHub Actions source（custom domainなし）を設定する。その後、GitHub Actionsの`Distribution` workflowへversion `0.1.0`、full target SHA、exact main CI run ID、確認値`PUBLISH_v0.1.0`を入力する。

workflowはpreflight、tag、draft prerelease、asset、Pages、live raw-byte/browser verification、Release publicationの順で進む。partial failureでは作成済みtag／Release／asset／Pagesを自動削除・移動・上書きしない。監査artifactのactual identityがexpected exactな場合だけ不足工程を再実行し、1項目でも異なる場合は停止する。詳細は[release checklist](docs/product/RELEASE_CHECKLIST.md)を参照する。

既知の制約として、0.1.0はWindows 10／11のChromium系browserを初期対象とし、複数端末同期、cloud保存、金融機関連携、投資商品の推奨、NISA売却枠再利用、iDeCo受取時課税を提供しない。

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
