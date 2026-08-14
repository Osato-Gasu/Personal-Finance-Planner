# Personal Finance Planner v0.1.0

prereleaseとして提供する初回配布候補です。本アプリは家計・手取り・NISA・iDeCoの概算確認用であり、金融・税務・投資助言ではありません。

## 配布identity

- version: `0.1.0`
- tag: `v0.1.0`
- target commit: `{{TARGET_COMMIT}}`
- `Personal-Finance-Planner.html` SHA-256: `{{PRIMARY_SHA256}}`
- `Personal-Finance-Planner.html` bytes: `{{PRIMARY_BYTES}}`
- 手取り制度確認日: `2026-08-12`
- NISA制度確認日: `2026-08-12`
- iDeCo制度確認日: `2026-08-13`

workflowはこのtemplateの3個のidentity placeholderをexact candidate値へ置換してdraftを作り、未置換placeholderがあれば停止します。download後は`SHA256SUMS.txt`でchecksumを照合してください。同fileは自己参照だけを除外し、`.nojekyll`、download HTML、Pages `index.html`、`release-manifest.json`を一意に記録します。

## 利用とデータ保全

- standalone／offline／no backendで、runtime external requestは0です。
- 更新前に設定画面からJSONバックアップを保存してください。
- 通常は同じpathのHTMLを置き換えてください。file名・folder・pathを変更すると保存領域が変わる場合があります。
- `file://`版とGitHub Pages版は別originであり、localStorageを共有しません。移行はJSON export/importで行ってください。
- importはpreviewを確認してから実行してください。取消・検証失敗では現行dataを変更しません。

## 既知の制約

Windows 10／11上のChromium系browserを初期対象とします。複数端末同期、cloud保存、金融機関連携、金融商品の推奨、NISA売却後の枠再利用、iDeCo受取時課税は対象外です。制度改正や個別条件により実額と異なるため、公式情報や専門家へ確認してください。
