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
