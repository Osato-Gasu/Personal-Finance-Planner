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
