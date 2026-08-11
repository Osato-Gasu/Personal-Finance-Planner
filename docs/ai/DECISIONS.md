# Governance decisions

## GOV-001 Shared governance pin

- Shared repository: `Osato-Gasu/shared`
- Version: `0.12.20`
- Commit: `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`
- Snapshot updates are performed only by the shared sync tool.

## GOV-002 Completed TASK history

- Completed TASK files use `git_only`; inactive TASK artifacts are not retained in the current tree.
- TASK-001 remains documented in `docs/bootstrap/` as bootstrap provenance, not as an active governance TASK.

## GOV-003 Zero-active routing

- With no active TASK, `NEXT_ACTION.yml` routes ChatGPT to `docs/ai/handoffs/PROJECT_REQUIREMENTS.md`.
- Product implementation begins only after a new TASK and its handoff are defined and validated.

## GOV-004 Review limit

- Implementation review is limited to three attempts.
- Only the third attempt, after two failures, may defer limited non-required presentation or optional optimization findings.
- A third failure routes to `NEEDS_USER_DECISION` and ends review.

## GOV-005 TASK-002 completion and carry-forward

- TASK-002 spec revision 2 is approved and completed with implementation candidate `0443acc4289c1f134fe3c42ee1b41d6ad10a52f4` (tree `d28414370618267d0be4bf5b12947d1f020b7219`).
- Candidate workflow `31485104093` and review handoff workflow `31485440279` completed successfully.
- The active link integrity issue accepted by the user in spec revision 1 remains unresolved by decision and must be included in the requirements and acceptance criteria of the next applicable product TASK, beginning with TASK-003.

## GOV-006 TASK-003 review termination, user acceptance, and completion

- TASK-003 implementation review attempt 3 used the relaxed final profile and returned `CHANGES_REQUESTED`. This consumed cycle 3, set review termination, and prohibits attempt 4.
- The user explicitly accepts implementation candidate `42f61931139922569e6761a553fd01bf637731f8` (tree `59d6f75d3176bb3cdfff69966a3e7784b3cd0d6d`) for completion and main integration despite the unresolved issue below. Candidate workflow `31506155390` completed successfully.
- Accepted unresolved issue: a baseline-valid schema v1 display name containing a newline may lose that newline or prevent an unrelated household-settings save after being represented by the single-line budget input.
- The accepted unresolved issue is not fixed in TASK-003 and must be included in the requirements and acceptance criteria of TASK-008, データ保全・UX完成.
- The TASK-002 active-link carry-forward was addressed by TASK-003 active-link validation and is no longer an unresolved carry-forward.
- The active TASK-003 task, handoff, and report packet is preserved in Git through handoff HEAD `7d11cc20964732b3dd04c74632e41173728160a5`; canonical `git_only` completion sync removes it from the current tree.

## GOV-007 TASK-004 review termination and option C transition

- TASK-004 spec revision 2 implementation review attempt 3 used the relaxed final profile for candidate `0f7ae95e296caa741ab3fdde03b9180c3bea122e` (tree `e139244d9cd538e3177dc35c176fa161910f12ee`) and handoff HEAD `fc2f8d274e9ec76356bb122124fbf12ea8bc73dd` (tree `159e46fd363c41ffc0ab7edcbaf1aacd27d8550c`). Candidate workflow `31536781347` and handoff workflow `31537172662` succeeded.
- Final review result is `NEEDS_USER_DECISION`; implementation review is terminated, attempt 4 is forbidden, the candidate is not user-accepted, and main integration is not approved.
- The user selected option C: TASK-004 remains blocked and unmerged, and completion responsibility moves to the new TASK-010. TASK-010 is a separate TASK beginning with review attempt 1, not TASK-004 attempt 4.
- Unresolved `FINDING-004-R2-09-REMAINDER`: a plan already age 65 through 74 at the start of 2026 can complete without calculating or requiring manual input for the first-category care-insurance premium.
- The unresolved finding and candidate are carried forward to TASK-010, `65～74歳介護保険未計算安全化`; the candidate is a historical carry-forward base and is not approved.
- User-decision transition artifact: schema `project-user-decision-separate-task-transition-v1`, SHA-256 `E464A16F48C9798411717A73BB0C18936B25C93CC925C50C9A3A1AB9818BF4E6`, 8349 bytes.
- Final-review source artifact: SHA-256 `D8ABA8BBEB8A62FC7F1E7B963E538EE364C4FB215890A04EFD84A13B156CD153`, 16611 bytes.
- The TASK-004 task, handoff, and report packet remains traceable through Git history at handoff HEAD `fc2f8d274e9ec76356bb122124fbf12ea8bc73dd`; canonical `git_only` transition removes it from the current tree.
