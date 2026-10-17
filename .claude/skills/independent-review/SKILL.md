---
name: independent-review
description: Decide whether an independent review (or a design review) is needed, request it from a separate session, and record findings with accept/reject reasons. Use at completion of a strict-mode TASK, or when a design needs review before implementation. Runbook only.
---
# 独立レビュー

## 呼ぶ基準
必須（一つでも）: 認証・権限・秘密・支払い／元に戻せないデータ変更／外部公開・配布・他Projectへの共有契約／影響範囲が広い／実装担当が、承認済みの仕様・外部挙動・重要な契約に影響する解釈を選んだ箇所がある／`PROJECT.md` の `strict_when`。
呼ばない（すべて該当）: 上記に当たらず、変更が小さく、検証と起動確認が通っている。迷ったら呼ぶ（理由を1行残す）。**呼ぶ基準に当たったら、ユーザーに聞かずに呼ぶ**（RULES §4の11）。完了報告にはレビュー結果と採否を含め、「実施するか」を最後に問い返さない。TASKに「レビュー必須」とあれば従う。
同じ指摘が続くときはRULES §5の14（2回で再点検、5回で止めて返す）。通常の検証と同じ問いの重複レビューは足さない。追加するのは別の問い（専門の観点・高リスク・Projectの必須）があるときだけ。厳格のレビューは、守るべき重大な境界について、必要な検証と直接の根拠があるかも確かめ、足りなければ未完了とする（検証がPASSでも、根拠が無ければ代わりにならない）。厳格では、検証と独立レビューを別の実行で行う。呼べなかったら「未実施」と明記し、代行しない。

## 依頼と返却
- 依頼: `templates/REVIEW_REQUEST.md`。リポジトリ・TASK・exact候補・要件・受入条件・必要な検証・返却先を渡す。Chat名や過去の記憶で開始可否を決めない。
- 返却: `docs/ai/reports/TASK-NNN/REVIEW_Rn.md`。結果は NO_BLOCKING_FINDINGS／CHANGES_RECOMMENDED／BLOCKED／FAILED（BLOCKEDは権限不成立・identity不一致・artifact欠落・返却経路不成立・監査不能な証拠不足だけ。reviewer側のtool・環境障害はFAILED）。
- レビューは助言。**指摘ごとの採否と理由の表**を末尾に足す（RULES §1）。採用した修正は新しい候補＋影響する検証。

## 別系統に頼む手順
実装と別のセッション、可能なら別系統（Codexが書いたらClaude、逆も）。読み取り専用で呼ぶ（例: `codex exec --sandbox read-only -o <一時ファイル> "<依頼文>"`。サンドボックス解除の指定は使わない）。レビュー中は作業フォルダの編集・Git操作をしない。トークン残量などで難しければ無理にせず「未実施」。

## 設計レビュー（実装前・一回・高リスクのみ）
ファイルを見られないチャット（ChatGPT Pro等）に頼める。推奨する目安: 認証・権限・秘密・支払い／元に戻せないデータ変更／外部公開・共有契約／設計の裁量が大きく後から変えにくい／同種の失敗の繰り返し後。
依頼文は `templates/DESIGN_REVIEW_REQUEST.md`。事実は全部依頼文に書き、「書かれていない事実は推測せず『確認が必要』と書く」と明記。結果は原文のまま `DESIGN_REVIEW.md` に保存し、採否を末尾に。「確認が必要」な事実は、ファイルを読める側が調べる。
