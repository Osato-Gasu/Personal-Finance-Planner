---
schema: 1
id: TASK-000
title: Shared 4.x 整合（2.x 由来の道具・文書の付き合わせと取捨選択）
kind: chore
status: DRAFT
mode: standard           # .github/** や削除が多いときは strict（RULES §4の11）
risk: high
owner:
branch:
touches_paths: []        # 撤去・変更する道具、文書、workflow を具体的に列挙
verification: NOT_RUN
runtime: NOT_REQUIRED
ci: NOT_REQUESTED
next_action:
shared:
---
## Requirements

ProjectのルールとShared 4.xを付き合わせ、衝突・重複する2.x由来のものを、維持／撤去／4.x化／Shared候補に分ける。製品コード、製品の検証道具、凍結履歴は対象外。CIは実行しない（推奨の判断まで）。

## 決定表

| 項目 | 区分（維持／撤去／4.x化／Shared候補） | 推奨 | 根拠（実際に読んだ内容） | リスク | 戻し方 |
| --- | --- | --- | --- | --- | --- |
| D01 | | | | | |

- 参照を`git grep`で確認する（workflow、tests、README、AGENTS、PROJECT.md、他のスクリプト。凍結履歴は除く）。生きた参照があるものは「撤去」にしない。
- 撤去は参照を外してから、最後のコミットで消す（コミット単位で順序を指定）。

## Acceptance

- 決定表の全項目に結果（実施済み／実施せず＋理由／該当なし）がある。
- `shared.ps1 check`がエラー0。製品の検証コマンドが前後で同じ結果。
- 凍結履歴・製品コードが不変（`git diff --name-only`で確認）。
- CIは実行していない（`CI: 未依頼`と明記）。
- 独立レビューは基準に当たれば完了前に実施済み（RULES §4の11）。

## 対象外

## ユーザーの最終判断（必要なときだけ）

ユーザー操作は不要（`ユーザー対応不要`）。

## Project固有の契約

## 設計 / 決定

## 判断した点

(実装担当が記入。決定表の結果、推奨と違う判断とその理由、所見。Shared候補は所見として残すだけで、Sharedへは書かない。)

## 履歴
