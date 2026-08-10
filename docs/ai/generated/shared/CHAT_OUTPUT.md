# GENERATED FILE: DO NOT EDIT.
# source version: 0.12.20
# source commit: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
# 直接編集禁止

# Chat output contract

## 通常chat固定形式

Normal chat displays the project adapter's Japanese phase, role, and effort labels.
Internal phase/role IDs and exact model/effort identifiers remain machine-readable handoff data and must not be printed as normal-chat labels.
do not add explanatory fields.

通常chatでは次の3 sectionだけを使用します。

```text
## 現在地点

- TASK-ID：
- 機能：
- フェーズ：
- 判定／状態：

## 依頼先情報

- 依頼先：
- 実施内容：
- 渡すセッション：

## コピペ用プロンプト

- 次担当が復帰に必要な commit / tree / hash
- 実行コマンド
- 追加 findings の要点（あれば）
- STOP条件
```

`APPROVED`、`CHANGES_REQUESTED`、`BLOCKED`、`NEEDS_USER_DECISION`、`USER_HOST_ACTION_REQUIRED`、`USER_RELAY_REQUIRED`、`PRODUCT_FAILURE`、`USER 操作`、`release`、`completion sync`、`GO`、`handoff`に対しても、上記3 section形式を維持します。

通常chatでは次を説明本文として出力しません。

- candidate identity表
- actual diff の長い説明
- hash 一覧
- test 証跡一覧
- changed path 一覧
- review 根拠の章立て
- finding の長文再掲
- 最小payload

userがこの応答で明示的に詳細説明を要求した場合だけ、上記以外の情報を追加します。

portable relay artifactが作成可能な場合は、`コピペ用プロンプト`内へ次を必ず保持します。

- bundle name
- bundle SHA-256
- bytes
- format

portable relay artifactを作成不能な例外時のみ、情報喪失を防ぐために
bundleの完全内容を省略せずそのままchatへ出します。
「必要最小限」に縮めるの禁止を維持します。
USER_RELAY_REQUIREDの必須bundle identityを失わないことを担保します。

次作業がない場合の通常chatは、次の値をexactに保持します。

- 依頼先：なし
- 実施内容：なし
- 渡すセッション：なし
- コピペ用プロンプト：なし

`コピペ用プロンプト`には次の情報を必ず保持してください。

- candidate identity（commit / tree / hash）
- 実行コマンド
- 現時点 findings
- Stop 条件

通常chatでは実行開始時刻/実行終了時刻を表示しません。実行開始時刻と実行終了時刻はrepositoryの`report`および`handoff`へ保存し、監査証跡として保持します。

# Japanese label profile

`PROJECT_ADAPTER.psd1` defaults `DefaultLabelLocale` to `ja-JP`. Projects using that profile
display the Japanese labels defined by their adapter.
