# PROJECT REQUIREMENTS HANDOFF

- actor: ChatGPT
- role: ORCHESTRATOR_AND_REVIEWER
- source: `docs/ai/CURRENT_STATE.md`, `docs/ai/BACKLOG.md`, `docs/product/`, user request
- purpose: active TASKがない状態から次TASKの目的、scope、受入条件、禁止変更、test/build、review、model/effortを確定する
- repository: Osato-Gasu/Personal-Finance-Planner
- branch_policy: 原則mainの固定baselineから専用branchを作る。TASK-011はユーザー承認済みcarry-forwardのためtransition exact commitをbaseとする
- product_source: docs/product/
- next_candidate: TASK-011
- resolved_carry_forward_TASK_002: TASK-002のactive link整合性問題はTASK-003で検証を実装済み
- accepted_unresolved_issue: TASK-003でユーザー受容済みのschema v1改行表示名の単一行input保存互換性問題を、TASK-008の要件と受入条件へ引き継ぐ
- blocked_predecessor: TASK-004はattempt 3最終レビューで打ち切り、candidate 0f7ae95e296caa741ab3fdde03b9180c3bea122eは未承認・main未反映のまま維持する
- resolved_carry_forward_TASK_004: FINDING-004-R2-09-REMAINDERはTASK-010 approved candidate aa3d7275de00ce3bfe900741750e642c780904adで解消し、main baseline 74599efd2afedfa8c1fba196aaab51459571913eへ統合済み
- completed_successor: TASK-010はTASK-004 attempt 4ではなく独立TASKとしてattempt 2／standardでAPPROVEDとなり、main統合・git_only completion sync済み
- blocked_predecessor_TASK_005: TASK-005はattempt 3／relaxed／finalで打ち切り、candidate d127f26a78342ab3d7674ee99e6f50d87532e891（tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443）は未承認・main未反映、attempt 4禁止のまま維持する
- required_carry_forward_TASK_005: FINDING-005-R3-01（attempt 3開始承認artifactの宣言SHA-256／bytesとcommit済みLF bytesのidentity不一致）をTASK-011の唯一の修復対象として要件・受入条件・testへ含める
- successor_policy_TASK_011: TASK-011はTASK-005 attempt 4ではなく独立TASKとしてreview attempt 1／standard／cycles 0から開始し、TASK-005をretroactive APPROVEDにしない
- carry_forward_candidate_TASK_011: TASK-005 product candidate d127f26a78342ab3d7674ee99e6f50d87532e891／tree fa83cf0bc4f7de19adc1dff92b8fd538dba3d443を製品source無変更で継承し、TASK-011の新しい承認・release経路とする
- transition_artifact_TASK_011: project-user-decision-separate-task-transition-v1／BBB9C4FC832FF3BAB7A99D39EAB25E051C8CF01FE7727ED40370F110485E22C8／11691 bytes
- implementation_gate: TASK、handoff、CURRENT_STATE、NEXT_ACTION、Progressを同じstateへ更新するまで製品実装を開始しない
- write_capability: state transition前にrepository write accessを実測する
- write_available: project正本一式を更新してvalidatorを実行する
- write_unavailable: 正本更新を主張せずUSER_RELAY_REQUIRED portable bundleを返す
- review_policy: implementation review最大3回、第3回のみ限定緩和、第3回不通過でNEEDS_USER_DECISION
- return_to: user or Codex through verified relay

## TASK-011 requirements draft (lossless user-decision carry-forward)

### Purpose

- Repair TASK-005 attempt-3 approval raw-byte audit identity without changing the carried-forward NISA product implementation, and add a reproducible guard against declared-vs-committed identity drift.

### Scope

- Use the post-transition commit as TASK-011 exact base, not origin/main.
- Carry forward TASK-005 product candidate d127f26a78342ab3d7674ee99e6f50d87532e891 unchanged at product-source level.
- Compute actual SHA-256/bytes from exact committed LF bytes and make all current references match.
- Record Git blob identity together with SHA-256/bytes.
- Add deterministic governance validation for EOL-normalization identity drift.
- Preserve original mismatch as historical evidence; never retroactively approve TASK-005.
- TASK-011 review starts attempt 1 / standard / cycles 0.
- TASK-011 approval, not TASK-005 retroactive approval, becomes the new release path carrying the unchanged NISA product.

### Out of scope

- TASK-005 attempt 4 or any further TASK-005 review.
- NISA calculation/UI/AppState/migration/rule/product-test changes.
- TASK-004/TASK-010 reopening.
- iDeCo, integrated summary, TASK-008 display-name work, distribution.
- main merge/tag/release during implementation.
- history rewrite/force push/reset/stash/clean/restore.

### Acceptance criteria

- No src/** or product-test behavior diff from TASK-005 candidate d127f26a78342ab3d7674ee99e6f50d87532e891.
- Actual committed approval artifact SHA-256/bytes are recomputed from exact LF bytes and recorded with Git blob.
- All current references match actual committed identity; stale 34723-byte identity is not retained as a current claim.
- Historical mismatch remains traceable as FINDING-005-R3-01 cause.
- Negative test fails for pre-normalized/CRLF identity when committed LF bytes differ.
- Positive test passes for exact committed identity.
- All shared/project/PowerShell 7/5.1 gates pass.
- Existing 315 Vitest, 69 take-home focused, 68 NISA focused, 168 portable checks are not reduced; runtime/console/page errors remain 0.
- Candidate exact GitHub Actions SUCCESS precedes review handoff.
- TASK-011 implementation review starts attempt 1 standard, cycles 0, final false.
- No main merge/tag/release or TASK-005 attempt 4.
