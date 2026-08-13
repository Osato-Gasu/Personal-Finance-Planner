# Project rules

## Sources of truth

- `docs/product/` is the source of truth for product requirements and design.
- `docs/ai/generated/shared/` is a generated snapshot and must not be edited directly.
- `docs/ai/PROJECT_ADAPTER.psd1` defines project-specific governance mappings.

## Non-relaxable safety

- Monetary calculations, effective rule periods, prevention of double counting, and data preservation are never relaxable.
- Product requirements, required acceptance criteria, build/test/lint, security, and baseline/candidate identity are never relaxable.

## Implementation review

- An implementation review has at most three attempts for the same TASK and implementation purpose.
- After two failed attempts, only the third attempt may relax non-required UI, wording, or optional optimization findings.
- A failed third attempt ends review and routes the TASK to `NEEDS_USER_DECISION`; it must not start a fourth review.
- Any relaxation is recorded as deferred and never represented as approved.

## TASK-001 boundary

- TASK-001 changes governance files only.
- Product code, rule data, packages, `README.md`, `.gitattributes`, `.gitignore`, and `docs/product/**` remain unchanged from baseline `171a1879416e6454a837c12fd465eb3eab111c35`.

## Completion safety

- A TASK is not complete merely because remote main was updated. Completion also requires exact main CI success, a uniquely identified clean local main checkout named `Personal-Finance-Planner`, fetch plus fast-forward-only synchronization, a fresh and portable root launcher, and canonical completion sync.
- A completed TASK worktree may be removed only after it is clean, has no untracked user files or unfinished Git operation, its completion commit is reachable from origin/main, local main is synchronized, and launcher gates pass.
- Dirty or ambiguous main/TASK worktrees, non-fast-forward state, unreachable commits, or failed CI/launcher gates are `BLOCKED`. Never discard user data with reset, stash, clean, restore, history rewriting, or forced filesystem deletion.
