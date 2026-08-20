# Project rules

This file is the sole `project` / `PROJECT_RULES` normative owner. Shared
lifecycle, review, routing, output, and execution rules remain global owners.

## Product identity

- Repository: `Osato-Gasu/Personal-Finance-Planner`.
- `docs/product/` is the source of truth for product requirements and design.
- `docs/ai/PRODUCT_IDENTITIES.yml` pins the exact accepted product-document bytes before task classification.
- `docs/ai/PROJECT_ADAPTER.psd1` contains only bounded machine variation and relation instances.

## Permanent safety rules

- Monetary calculations, effective rule periods, prevention of double counting, and preservation of existing user data must remain exact.
- AppState schema and migration, local storage, backup/import/export, financial calculations, rule data, package compatibility, and the portable launcher must not change outside an explicitly accepted task scope.
- Product requirements, required acceptance criteria, build/test/lint evidence, security gates, and baseline/candidate identities are non-relaxable.
- Raw secrets, tokens, credentials, and PII must not be copied into console output, reports, artifacts, or relay payloads.

## Completion safety

- A task is not complete merely because remote main moved. PFP completion additionally requires exact main CI success, the unique clean local main checkout named `Personal-Finance-Planner`, fetch plus fast-forward-only synchronization, a fresh root launcher, and portable `file://` smoke evidence.
- A completed task worktree may be removed only when clean, operation-free, free of untracked user files, reachable from origin/main, and after local main and launcher gates pass.
- Dirty or ambiguous main/task worktrees, non-fast-forward state, unreachable commits, and failed CI or launcher gates are `BLOCKED`; preserve all user-owned bytes.
