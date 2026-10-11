---
schema: 1
id: TASK-000
title:
kind: fix                # chore/fix/feature/spec/risk（tools が参照する。gate道具を使うときは段階の下限になる）
status: DRAFT            # DRAFT/READY/ACTIVE/REVIEW/DONE/BLOCKED/CANCELLED
mode: direct             # 実施したモード: direct/standard/strict（RULES §4）
risk: normal             # low/normal/high/critical
owner:
branch:
touches_paths: []
verification: NOT_RUN    # NOT_RUN/PASS/FAIL/INCONCLUSIVE/SELF_ONLY(直行の自己確認のみ)/NOT_REQUIRED
runtime: PENDING         # NOT_REQUIRED/PENDING(ユーザーの起動確認待ち)/PASS/FAIL
ci: NOT_NEEDED           # NOT_NEEDED/NOT_REQUESTED/PASS/FAIL/PENDING_REMOTE_CI
next_action:
shared:
---
## Requirements

(何が真になれば完了か。)

## Acceptance

(観測できる確認。実機確認はUSER確認として明記する。)

## 対象外

## 確認手順（ユーザーが起動して確かめる）

1.

## Project固有の契約

(PROJECT.md が列挙する項目をここに書く。)

## 設計 / 決定

(境界・制約・高リスク部分だけ。日付つきのユーザー決定とトレードオフ。)

## 判断した点

(実装担当が記入。結果に影響する分岐は実装前に聞く。)

## 履歴

(時刻つき・短く。フェーズ移行、サブの呼出しと結果。)
