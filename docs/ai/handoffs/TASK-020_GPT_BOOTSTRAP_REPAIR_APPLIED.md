---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: GPT_ORCHESTRATOR
next_actor: CODEX_MAIN
authority: GPT_APPROVED
approved_by: GPT_ORCHESTRATOR
decision: BOOTSTRAP_COMPATIBILITY_REPAIR_APPLIED
formal_state: ACTIVE
---

# TASK-020 GPT統括 — legacy BOM bootstrap互換修復

中央AI開発GPT統括は、Shared 2.0.6 orchestration bootstrapが
legacy `docs/ai/PROJECT_ADAPTER.psd1` の先頭UTF-8 BOMだけを理由に
raw-text validationでfail closedしたことを確認した。

TASK-020 migrationを開始可能にするため、GPT統括権限で以下の**pre-bootstrap最小修復だけ**を実施した。

- 対象: `docs/ai/PROJECT_ADAPTER.psd1`
- 変更: 先頭BOM U+FEFF / bytes EF BB BF の除去のみ
- adapter本文・意味・schema 1データは変更しない
- mainは変更しない
- prior candidate / prior branchは変更しない
- product source / financial rules / data / product docsは変更しない
- Shared側parserやguardは変更・迂回しない

この修復はTASK-020の本実装ではなく、既存legacy adapterをShared 2.0.6の
bootstrap入力として読み取れるようにするencoding compatibility repairである。

同じCodex Mainでcanonical pointer/taskを再読し、通常bootstrapを最初から再実行すること。
bootstrap PASS後にclaimを取得し、既存のTASK-020正式scope/ACの範囲だけでmigrationを続行する。

別Mainを作らない。旧candidateをreplayしない。
