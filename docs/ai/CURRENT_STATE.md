---
updated_at: 2026-08-21
active_tasks:
  - TASK-016
next_action: Codex implements TASK-016 from the canonical activation branch
---

# Current state

TASK-016 spec revision 4「給与→手取り→家計→NISA+iDeCo自動連携・6タブUI再設計」をexact parent baseline `2c99809634e613963574fea63383889da8ece025`（tree `cf199677778a9bc612c26d6a6b866a9685f04f54`）からcanonical implementation routeとしてactive化する。専用branchは `codex/task-016-linked-finance-workflow`、actor/roleは `Codex | IMPLEMENTER`。shared governanceはmain baseline lockのversion `0.12.20` / commit `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`を維持する。

TASK-013は `codex/task-013-public-audit-stable-id` の別branch/worktreeに残る独立recovery lineageであり、TASK-016はそのworktree、lock v1.0.1、shared checkout、state、handoff、branchを再利用・変更・完了しない。TASK-016のsource-present shared checkはambient shared rootではなく、0.12.20 lock commitのclean disposable source rootを明示指定する。

Main integration、tag、Release、Distribution、Pages、deployment、TASK-009開始は未承認。TASK-016はcandidate + separate high-risk VERIFY + candidate CI evidenceをChatGPTへ返してimplementation reviewを受ける。
