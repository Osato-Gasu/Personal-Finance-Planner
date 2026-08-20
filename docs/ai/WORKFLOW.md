# Project workflow

This file is the sole `project` / `WORKFLOW` normative owner. It records only
repository-specific procedure; shared lifecycle and review behavior remains
owned by the pinned global governance source.

## Validation procedure

- shared/project governance: `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/sync-shared-governance.ps1 -Check` and `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-ai-governance.ps1`
- project overlay: `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/validate-project-overlay.ps1`
- typecheck: `npm run typecheck`
- lint/format: `npm run lint` and `npm run format:check`
- unit and contract tests: `npm run test`, focused rule suites, `npm run test:distribution:contract`, and `npm run test:public-exposure-audit`
- build and launcher: `npm run build`, `npm run verify:launcher`, `npm run test:portable`, and `npm run test:distribution`
- completion: `pwsh -NoProfile -ExecutionPolicy Bypass -File tools/test-complete-task-local.ps1`

## Task procedure

1. Read product requirements from `docs/product/` and resolve their exact identities through `docs/ai/PRODUCT_IDENTITIES.yml`.
2. Keep one active TASK and derive current routing from that TASK's v1 frontmatter.
3. Pin exact project baseline/candidate commit and tree plus exact shared version/commit/tree/manifest before classification or mutation.
4. Run the project-local commands above and the active TASK's required tests before each committed transition.
5. Record exact commands, exit codes, runtimes, candidate identities, and raw evidence hashes. Unknown or mismatched evidence is `BLOCKED`.
6. After separately authorized release and exact main CI success, locate the unique clean local main checkout named `Personal-Finance-Planner`, fetch, and fast-forward only.
7. Rebuild and verify the root `Personal-Finance-Planner.html` launcher, including portable `file://` smoke, before local completion.
8. Remove only a clean, reachable, operation-free TASK worktree after all main, CI, completion, and launcher gates pass; otherwise stop without destructive recovery.

## Generated governance

- Do not edit `docs/ai/generated/shared/` directly.
- Use `tools/sync-shared-governance.ps1` with the exact pinned shared source. A managed root loader requires the separately approved, baseline-bound managed-adoption plan.
