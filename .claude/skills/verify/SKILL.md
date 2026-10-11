---
name: verify
description: Verify a candidate commit read-only, report PASS/FAIL/INCONCLUSIVE correctly, and write static-analysis and on-device confirmation results without overclaiming. Use when verifying a TASK candidate or writing verification results. Runbook only.
---
# 検証

- 対象は**特定の候補コミット**。read-only。実装した実行は検証しない（標準・厳格）。
- 結果は PASS／FAIL／INCONCLUSIVE。INCONCLUSIVEは理由コード必須（EVIDENCE_INSUFFICIENT／ENVIRONMENT_UNAVAILABLE／ORACLE_INSUFFICIENT／VERIFIER_TOOL_FAILURE）で、PASSにも失敗にもしない。
- 再検証は重要な変更があったときだけ。前回の検証IDと理由を残す。PASS後はソースが変わらない限り足さない。
- 基準を強める例: dry run、不変条件の試験、rollback・冪等性、ブラウザ／UI確認。

## 静的解析の結果の書き方
「全て当たる」「そのまま動く」は**静的な範囲で成立**という意味で、動作保証ではない。報告に静的解析の限界（実際のロード順、条件の評価、乱数、実際に通る経路）を必ず書く。実機で1回出なかった（出た）ことは保証にならない。複数回の観察を記録する。

## 起動確認（実機）の記録
ユーザーが行う（TASKで自動化が明記されていれば実働が行ってよい）。必要な場合は「実機確認待ち」とし、手順をTASKに書く。記録には次を残す（不明は「未確認」）:
- 対象のbuild・版、構成が開発用であること。
- **使ったログの更新時刻が、確認した起動の時刻と合っていること**（古いログを読んでいないか）。
- ログの読込行と、エラー。
- 状態（新規か既存か等）、観察の回数、結果、未確認の項目。
- ユーザーの報告は**二次報告**と明記する。実ログの実物を取得していなければそう書く。

固有の項目（ログの場所、検証項目）は `PROJECT.md`。環境で検証できること・できないことも `PROJECT.md`（`verify_capabilities`）。
