# BACKLOG

`docs/product/DELIVERY_PLAN.md` is the product delivery source. These entries are candidates only; TASK-001 does not start product implementation.

<!-- PROGRESS:START -->
| ID | 優先度 | 状態 | リスク | フェーズ | タイトル | 依存 | 次の作業 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TASK-004 | high | blocked | high | implementation_review | 手取り計算ベータ | TASK-002 | 最終レビュー打ち切り。未解消事項はTASK-010で解消、candidateは未承認・main未反映 |
| TASK-005 | normal | blocked | high | user_decision | NISAベータ | TASK-002 | 最終レビュー打ち切り。FINDING-005-R3-01をGPT経由のユーザー判断へ返し、attempt 4を作成しない |
| TASK-006 | normal | queued | high | requirements | iDeCoベータ | TASK-002 | 対象年月別rule要件を定義する |
| TASK-007 | normal | queued | high | requirements | 統合サマリー | TASK-003,TASK-005,TASK-006,TASK-010 | upstream正本の統合条件を定義する |
| TASK-008 | normal | queued | high | requirements | データ保全・UX完成 | TASK-003,TASK-005,TASK-006,TASK-007,TASK-010 | schema v1改行表示名の保存互換性を含むmigration・import安全条件を定義する |
| TASK-009 | low | queued | medium | requirements | 配布 | TASK-008 | release条件を定義する |
<!-- PROGRESS:END -->
