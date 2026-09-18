# PROJECT

Canonical owner for Personal Finance Planner repository-specific permanent
human-readable rules. Shared rules and TASK state are not copied here.

## Product and repository identity

- Product: Personal Finance Planner
- Repository: `Osato-Gasu/Personal-Finance-Planner`
- Purpose: personal-use financial planning for payroll, take-home pay,
  household budget, NISA/iDeCo and future-asset planning.
- Product requirements, design, calculations, and rule data are owned by
  `docs/product/**`, which remains the product source of truth.

## Permanent financial safety

The following requirements are non-relaxable for every TASK, including
governance-only migration:

- monetary calculations and rounding semantics;
- effective rule periods and their source identity;
- prevention of double counting;
- data preservation and lossless migration/import/export behavior;
- product requirements and required acceptance criteria;
- baseline/candidate identity, security, and preservation of user-owned data.

The protected product source `docs/product/REVIEW_POLICY.md` remains
authoritative for product safety. For TASK-020 and later, only its legacy
same-TASK implementation-review attempt limit and associated role/routing
mechanism are superseded by the exact Shared 2 Main -> BUILD -> VERIFY loop.
This changes orchestration only: every mandatory condition in that policy
remains required, including unsupported-condition disclosure, rounding and
total consistency, canonical linked-value ownership, stale-data prevention,
double-count prevention, storage/migration/import preservation, XSS/basic
security, build/test/lint, required acceptance criteria, user-owned changes,
and branch/baseline/candidate identity. No historical TASK is retroactively
approved and no fourth review is created for a historical TASK.

Do not change product semantics, financial rules, package versions, storage,
or user data as part of governance synchronization. Product source changes
require the relevant focused financial suites and the full repository suite.

## Product and completion safety

- This is a personal-use product. Distribution, deployment, Pages publication,
  and release are not normal completion actions; a future need requires a new
  explicit user request and TASK.
- Final local completion requires the canonical local main worktree to be
  uniquely identified by the name `Personal-Finance-Planner`, clean on
  `main`, and at `HEAD == origin/main` after fetch plus fast-forward-only
  synchronization.
- Exact main CI success, root launcher freshness, and portable `file://` smoke
  are required before local completion or worktree cleanup.
- A TASK worktree may be removed only after it is clean, has no untracked user
  files or unfinished Git operation, its completion commit is reachable from
  `origin/main`, and all launcher/CI gates pass. Removal and worktree prune
  are non-forced operations; dirty or ambiguous worktrees, non-fast-forward
  state, unreachable commits, and failed CI or launcher gates are BLOCKED and
  must never be handled with reset, stash, clean, restore, history rewrite,
  or forced deletion.
- Preserve the root launcher `Personal-Finance-Planner.html` and the
  local-main completion safety contract.

## Historical and tracking safety

- Historical Shared/pre-2.0 evidence remains under the identity and Git
  history that created it. Do not rewrite or backfill it for schema symmetry.
- `docs/ai/CURRENT_STATE.md`, `docs/ai/BACKLOG.md`,
  `docs/ai/PRODUCT_IDENTITIES.yml`, and historical decision/evidence files
  retain their documented historical meaning; generated views are not TASK
  state owners.
- The canonical current TASK owner is the assigned
  `docs/ai/tasks/TASK-xxx.md`. Do not infer current state from HTML or board
  views, and do not automatically revive retired or blocked historical TASKs.
- TASK-020 and later retain their canonical TASK files in the current tree;
  the legacy `git_only` deletion policy is not used for new TASK tracking.
  Missing TASK-001 through TASK-019 files are historical and must not be
  recreated or guessed. Runtime `PENDING` for a USER/local environment and
  formal remote-CI `PENDING_REMOTE_CI` are separate states; neither is a PASS.

## Runtime and environment

- Node.js 24 is the repository runtime baseline.
- Primary local completion is Windows; PowerShell hooks and focused tests must
  remain compatible with PowerShell 7 and Windows PowerShell 5.1.
- Exact Project paths and commands are owned by
  `docs/ai/PROJECT_ADAPTER.psd1`.

The Shared downstream orchestrator authenticates the released Shared
repository/version/commit before invoking this Project's offline sync hooks.
The hooks validate their untrusted identity inputs and never perform a private
fetch or require credentials.
