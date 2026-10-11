---
schema: 1
commands: {"build": "", "test": "", "lint": ""}
ci_recommend_paths: []
ci_skip_paths: []
ci_workflow: ""
risk_paths: []
strict_when: []
verify_capabilities: {"cloud": [], "local": [], "user_only": []}
roles: {"orchestrator": {"model": "", "effort": ""}, "implement": {"model": "", "effort": ""}, "verify": {"model": ""}, "review": {"model": "", "effort": ""}}
profiles: {"saving": {"roles": {}, "loop_on": ""}, "normal": {"roles": {}, "loop_on": ""}, "rich": {"roles": {}, "loop_on": ""}}
---
# PROJECT — 恒久条件

このファイルはProject固有の恒久事実だけを持つ。共通の規則・権限・手順は Shared の `RULES.md`・`ROLES.md`・skills で、ここに繰り返さない。

## front matter の読み方
- 1行に1項目、値は文字列か**1行のJSON**（道具・アプリ・人が同じ書き方で読める）。行末にコメントを付けない。
- `ci_recommend_paths` に触れる変更は、完了時にCIを推奨（skill `ci`）。`ci_skip_paths` だけの変更は不要。`risk_paths` に触れたら標準モード以上、`strict_when` は厳格にする条件（RULES §4）。
- `verify_capabilities` は環境ごとに検証できること／できないこと。`roles` は具体モデルと負荷（検証は負荷を書かない: 式で決まる、ROLES）。`profiles` は予算プロファイル（ユーザーが宣言、既定normal、下限は下げない）。

## 目的

## 技術構成

## 製品不変条件

## TASKで必ず埋める項目（Project固有の契約）

## 実機確認が必要な範囲（USER）

## Sharedより厳しくする点（あれば）

## 決定（日付つき）
