---
name: orchestrate
description: Run a TASK end to end as the orchestrator or as a direct single agent: preparation, the mode (direct/standard/strict), calling sub-runs, handling failures, integration and the completion report. Use when starting or resuming a TASK. Runbook only.
---
# オーケストレーター

権限は RULES.md。モードの定義も RULES §4。ここは手順。

## 作業の準備（TASK開始時。ユーザーに確認せず最初に実行）
`pwsh tools/shared.ps1 task start -Id TASK-NNN -Title "…" -Kind fix`（Projectでは複製した `docs/ai/shared/tools/`）。mainをfast-forwardで最新にして作業ブランチを切り、未コミットの変更・fast-forward不可・同名ブランチなら何も変更せず止まる。環境変数が要るTASKは設定と存在を確認する（パスは文書・ファイルに書かない）。ブランチ名とmainのSHAを1〜2行で報告してから本文へ。
作業中・完了後もしない: mainへのpush・マージ、force、`reset --hard`、履歴の書換え、TASK範囲外のファイル変更。

## 進め方
1. TASKを読み、受入条件が観測できる形か確認（曖昧なら実装前にユーザーへ）。
2. 変更を分類する: 読み取りのみ／通常／複雑／高リスク／権限が要る／禁止。禁止は止める。権限が要る操作は聞く（1変更束につき1回）。
3. **モードを決める**（既定は直行）。`risk_paths`・共通の必須条件に当たるなら標準以上。予算プロファイル（saving/normal/rich）はユーザーが宣言する。宣言が無ければnormal。
4. 標準以上: 実装サブに強度を明示して依頼し、依頼値を記録（ROLES）。候補コミットを固定し、別のread-only検証サブを呼ぶ（強度は式）。必要なら独立レビュー（`independent-review`）。
5. 指摘を採否（RULES §1）。採用したら修正→新しい候補→影響する検証。
6. 完了時に **CI推奨判断**（`ci`）と、**モード昇格の推奨**を理由つきで出す。ユーザーが起動確認できる状態にして、完了報告（`templates/REPORT.md`）。

## 失敗したら（原因で次の手を決める）
単純な実装ミス→自分で直す／情報不足→失敗ログ・差分・再現手順の証拠パックを渡して再実行／環境・不安定→再現と環境確認／文脈のずれ→新しい継続セッションで再開／推論不足→強い構成へ／仕様の穴・矛盾→ユーザーへ戻す。
同じ入力の再試行、モデルを替えてPASSを得る、期待値を緩めてPASSにする、はしない（RULES §5）。

## 統合（mainへ）
実働はブランチをpushして終了する。窓口が差分を確認し（範囲、報告の主張と実際の差、`PROJECT.md` の確認項目）、試しにマージして試験を通し、**ユーザーの「統合して」を受けて**`--no-ff`でmainへ入れる。

## 聞く時／止める時
本当の未決・矛盾する要件・未指定の新挙動・破壊的操作・ユーザー専用の認証や支払いだけ。質問は 状況・選択肢・推奨・止まる影響 を短く。サブが止まった理由は 環境・ツール不足／ユーザー判断／要件が曖昧 で受ける。
