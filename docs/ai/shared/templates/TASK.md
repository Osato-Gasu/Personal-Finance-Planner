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
runtime: PENDING         # NOT_REQUIRED/PENDING(実機・E2E確認待ち。AIが行う分とユーザーの最終判断はTASK・PROJECT.mdが決める)/PASS/FAIL
ci: NOT_NEEDED           # NOT_NEEDED/NOT_REQUESTED/PASS/FAIL/PENDING_REMOTE_CI
next_action:
shared:
---
## Requirements

(何が真になれば完了か。)

## Acceptance

(観測できる確認。AIが確かめるものと、ユーザーの最終判断に残すものを分けて書く。RULES §5の13の2。)

## 対象外

## AIによるE2E・ローカル確認
(ローカルCodexが自律して行う確認と、残す証跡。RULES §5の13の2。)

## 実働への指示（定型）
(Git経由で起動するとき、実働が従う定型。起動の一言には書き写さない。RULES §8の19の2。)
- 独立レビューの基準（risk_paths に触れた、解釈を選んだ箇所がある等）に当たる場合は、ユーザーに聞かずに、別の実行で独立レビューを実施し、結果と採否を報告に含める。
- CIは実行せず、推奨の判断だけを出す。
- 完了・失敗・返却時に、報告を `docs/ai/reports/TASK-NNN/REPORT.md` としてこのbranchへpushする。最終メッセージは、Project／TASK／branch／対象SHA／結論／報告ファイルのパスだけの短い1ブロック。実行表（役割｜モデル｜負荷｜対象｜所要時間｜状態・結果）と渡し先は、毎回ブロックの外に書く（人が見る情報はブロックに入れない。ROLES「表示」）。
- 報告・TASKに、秘密・個人情報・個人パスを書かない。

## ユーザーの最終判断（必要なときだけ）
(AIの確認が済み、AIが起動した状態で、見た目・使い勝手の最終判断だけ。見る場所・見る点・合否の見方を書き、コマンドは書かない（RULES §5の13の4）。PROJECT.md・TASKでAIに委任済みなら「不要」。)

1.

## Project固有の契約

(PROJECT.md が列挙する項目をここに書く。)

## 設計 / 決定

(境界・制約・高リスク部分だけ。日付つきのユーザー決定とトレードオフ。)

## 判断した点

(実装担当が記入。結果に影響する分岐は実装前に聞く。)

## 履歴

(時刻つき・短く。フェーズ移行、サブの呼出しと結果。)
