# PROJECT REQUIREMENTS HANDOFF

- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- source: `docs/ai/CURRENT_STATE.md`, `docs/ai/BACKLOG.md`, `docs/product/`, user request
- purpose: active TASKがない状態から次TASKの目的、scope、受入条件、禁止変更、test/build、review、model/effortを確定する
- repository: Osato-Gasu/Personal-Finance-Planner
- branch_policy: mainの固定baselineから専用branchを作る
- product_source: docs/product/
- next_candidate: TASK-003
- accepted_unresolved_issue: TASK-002 spec revision 1でユーザー受容済みのactive link整合性問題を、TASK-003の要件と受入条件へ引き継ぐ
- implementation_gate: TASK、handoff、CURRENT_STATE、NEXT_ACTION、Progressを同じstateへ更新するまで製品実装を開始しない
- write_capability: state transition前にrepository write accessを実測する
- write_available: project正本一式を更新してvalidatorを実行する
- write_unavailable: 正本更新を主張せずUSER_RELAY_REQUIRED portable bundleを返す
- review_policy: implementation review最大3回、第3回のみ限定緩和、第3回不通過でNEEDS_USER_DECISION
- return_to: user or Codex through verified relay
