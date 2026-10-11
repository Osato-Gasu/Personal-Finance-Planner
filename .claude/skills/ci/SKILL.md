---
name: ci
description: Decide whether CI is recommended for a finished change, propose it to the user, and run it on request (workflow_dispatch on the exact commit). Use at completion of a TASK. Runbook only.
---
# CI

CIは**既定でしない**（RULES §6）。品質の門はローカルの試験と別実行の検証。Actionsの失敗・利用上限・課金は、通常のTASKを止めない。

## 完了時の判断（1行）
機械部分は `pwsh tools/shared.ps1 ci-recommend -Base origin/main`（推奨／不要／判断が要る）。「判断が要る」だけAIが決める。
`CI: 推奨（理由）` または `CI: 不要（理由）`。
- 機械判定: `PROJECT.md` の `ci_recommend_paths` に触れた／依存・ビルド・スクリプト・workflow・設定の変更／配布・release・他Projectへの共有契約／変更が広い。`ci_skip_paths`（と既定の文書・TASK・報告）だけなら不要。
- 人の判断: ローカルで再現できない環境差（Windows／Linux）、ローカル検証が不能だった部分。迷ったら推奨。
- Shared自身: `tools/` の変更でWindows上の動作確認が要るときだけ推奨。手段はユーザーのローカルで `pwsh tests/run-all.ps1`（第一候補）か、ActionsのWindowsランナー。

## 提案と実行
推奨なら完了報告に**提案**として載せる（理由・実行方法・想定コスト）。実行はユーザーが「やって」と言ったときだけ。`workflow_dispatch` で `candidate_sha` を渡し、実行のheadと一致することを確かめる（一致しなければ失敗）。結果の語はPASSと混ぜない:

| 状態 | 意味 | 完了を止めるか |
| --- | --- | --- |
| `CI不要` | 判断済み・実行しない | 止めない |
| `CI未依頼` | 推奨したが依頼されていない | 止めない（報告に残す） |
| `CI PASS／FAIL` | 依頼して実行、候補SHAと一致 | FAILは通常の失敗として直す |
| `PENDING_REMOTE_CI` | 依頼したがActionsが使えない | これだけでは止めない。戻ったら一度だけ閉じる |

## 費用の節約
失敗後に自動で再dispatchしない／Linux優先／timeoutを置く／早期失敗／不要なmatrixや重複jobを避ける／skip-ci・workflow無効化・履歴書換えで節約しない。ローカルのPASSでCI失敗を置き換えない。CIに製品と無関係な検査（外部APIの形、リンク切れ、base鮮度）を必須として同居させない。
