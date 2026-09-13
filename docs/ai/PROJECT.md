# PROJECT

Canonical owner for Personal Finance Planner repository-specific permanent
human-readable rules. Shared rules are not copied here.

## Product / Repository Identity

- Product: Personal Finance Planner
- Repository: `Osato-Gasu/Personal-Finance-Planner`
- Purpose: personal-use financial planning for payroll, take-home pay, household
  budget, NISA/iDeCo and future-asset planning.
- Product requirements / design / calculation source of truth: `docs/product/**`

## Permanent Rules

- Monetary calculations, effective rule periods, prevention of double counting,
  and data preservation are non-relaxable in this Project.
- This product is for personal use. Distribution/deployment is not part of
  normal Project completion. A future need to distribute or deploy requires a
  new explicit user request/TASK.
- Historical pre-Shared-2.0 Evidence is preserved under the Shared identity and
  Git history that created it; do not rewrite or backfill it solely for schema
  symmetry.
- `docs/ai/AUDIT_IDENTITIES.json` is legacy historical evidence only. Preserve
  its bytes; it is not a current rule or TASK-state owner.
- `board/PROGRESS.html`, when present, is a non-normative human view only. TASK
  state is owned by the assigned `docs/ai/tasks/TASK-xxx.md`.

## Project-specific Safety

- Final local completion is not accepted until the canonical local main
  worktree is clean on branch `main` and `HEAD == origin/main`.
- Canonical local main:
  `C:\Users\satoshi-sugaya.dh\Development\personal\Personal-Finance-Planner`
- Root launcher:
  `Personal-Finance-Planner.html`
- Exact `main` CI success, launcher freshness and portable `file://` smoke are
  required before local completion/cleanup.

## Build

Exact commands and paths are owned by `PROJECT_ADAPTER.psd1`.

- Node.js 24 is the repository runtime baseline.
- The root standalone launcher is generated/verified from the application build.

## Test

Exact commands and paths are owned by `PROJECT_ADAPTER.psd1`.

- Financial source changes require the relevant focused financial suites plus
  the full repository test set.
- The standalone `file://` smoke must remain portable with no runtime network
  requests or material console/page errors.

## Release

Exact commands and paths are owned by `PROJECT_ADAPTER.psd1`.

- Keep the workflow name `Governance CI`; Project completion safety tooling
  verifies that exact workflow identity.
- Normal Project completion does not create a tag, GitHub Release,
  Distribution, Pages publication or deployment.

## Environment Constraints

- Primary local completion environment is Windows.
- TASK worktrees may live outside the canonical main path, but only the
  canonical main path is accepted as the final local application checkout.
