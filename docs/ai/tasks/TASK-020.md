---
task_id: TASK-020
status: ACTIVE
phase: Acceptance
risk: high
current_candidate: this_commit
---

# TASK-020 — Shared 2.0 migration and Project governance simplification

## Goal

Migrate this repository from its Shared 0.12.20 snapshot/relay layout to the
exact Shared 2.0.0 model without changing product behavior.

## Requirements

- Baseline commit: `e7de34d7b36b7f6ec514d321a0b66381cc810fa2`.
- Baseline tree: `1653fbcc89c029da3546145ed54b500e9e0a8266`.
- Shared repository/version/commit: `Osato-Gasu/shared`, `2.0.0`,
  `a528200ffdd71747e320abaad1da807e27ba14e3`.
- Branch: `codex/task-020-shared2-migration`.
- GPT統括 froze this specification. Product behavior changes are prohibited.
- The same Codex Main owns implementation, tests, candidate freeze and the
  repair/re-candidate loop. Exact-candidate VERIFY is a separate read-only
  Terra XHigh execution.

## Scope

- Install the Shared 2.0 bootstrap, Project owner, schema-2 adapter and lock.
- Make this file the only canonical owner of current TASK state.
- Keep durable TASK execution events in `docs/ai/evidence/TASK-020/EVENTS.jsonl`.
- Remove legacy duplicated state, generated snapshot, handoff and wrapper files
  listed in the frozen TASK-020 keep/delete matrix after reference audit.
- Replace the Project governance validator and explicit TASK-start/resume smoke.
- Preserve all application, financial, launcher and completion gates in
  `Governance CI`.
- Keep `board/PROGRESS.html` only as a generated non-normative human view.

## Out of Scope

- Changes to `Osato-Gasu/shared`, its historical TASK-175/F10 work, or its history.
- Product behavior, calculations, rule periods, schemas, UI, routes, packages or
  product documentation.
- Rewriting or backfilling pre-2.0 Evidence.
- Reconstructing completed TASK packets removed by the historical `git_only` policy.
- Main integration, tag, GitHub Release, Distribution, Pages or deployment.
- Unrelated refactoring or destructive Git recovery.

## Protected Product Paths

The candidate must have zero diff from the baseline for `src/**`, `tests/**`,
`docs/product/**`, `Personal-Finance-Planner.html`, `index.html`, `package.json`,
`package-lock.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`,
`tools/sync-root-launcher.mjs`, `tools/test-portable-build.mjs`,
`tools/complete-task-local.ps1`, and `tools/test-complete-task-local.ps1`.

## Acceptance Criteria

- The schema-2 lock pins the exact Shared source identity.
- Root `AGENTS.md` is the Shared 2.0 bootstrap pointer with no legacy route.
- `PROJECT.md` is the sole permanent human-readable Project-rule owner.
- `PROJECT_ADAPTER.psd1` imports as schema 2 and owns the frozen paths/commands.
- This TASK file is the sole current TASK-state owner; current state is not
  duplicated into legacy state, backlog, handoff, report, relay or session files.
- Durable execution events are valid JSONL and do not infer runtime identity.
- `docs/ai/AUDIT_IDENTITIES.json` remains byte-identical historical Evidence.
- Every frozen DELETE path is absent after live-reference audit; no retained
  operational bootstrap, CI or wrapper depends on it.
- Shared 2.0 structural/reference validation and explicit TASK-start/resume smoke
  pass in PowerShell 7 and Windows PowerShell 5.1.
- Workflow name remains `Governance CI`; all application, financial, build,
  launcher, completion and portable gates remain present.
- All required local commands and exact-candidate `Governance CI` pass.
- Protected product-path diff against baseline is empty.
- The progress page is clearly non-normative and derives only from TASK files.
- One exact committed candidate receives separated read-only Terra XHigh VERIFY
  PASS; relevant changes after a PASS require a new candidate and VERIFY.
- Project `main` is not modified during this pass.

## Design / Decisions

- The frozen `PROJECT_MD_TARGET.md` and `PROJECT_ADAPTER_TARGET.psd1` content are
  used as the Project canonical owners.
- `docs/bootstrap/**` remains unchanged as historical bootstrap provenance.
- The protected `eslint.config.js` retains its baseline no-op ignore glob for the
  removed generated tree. It is not an operational dependency and protected-path
  zero-diff takes precedence over altering that configuration.
- Candidate identity is supplied externally as the exact Git commit/tree; a
  commit cannot contain its own SHA without becoming a different commit.
- BUILD worker count is zero because the migration is a cohesive governance
  edit and this Main is the sole integration writer.

## Current State

- Current candidate: the exact Git commit containing this file (`this_commit`);
  its immutable SHA/tree are supplied to CI and VERIFY after commit creation.
- VERIFY: pending exact-candidate CI and separated read-only VERIFY.
- Open blocking findings: none.
- Next action: commit and push the exact candidate, obtain exact-candidate CI success, then run separated read-only Terra XHigh VERIFY.

## Completion

This Codex pass ends at exact candidate + required tests/CI + VERIFY PASS. GPT統括
retains final approval and any later main integration/completion authority.
