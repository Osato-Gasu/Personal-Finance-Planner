---
task_id: TASK-018
title: 車通勤ON/OFF・日額通勤手当自動計算
status: ready
route: TWO_SESSION_FAST
priority: high
spec_revision: 2
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-018/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: not_needed
claude_implementation_review_recommendation: not_needed
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_applicable
claude_implementation_review_status: not_applicable
base_commit: d326aa15db358d46e955a5ffed21da8a2ec79bfe
base_tree: 353e8d333076ceddde8f394d9299a3452dd21154
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: 585BEE35CB2D1D5EEEB7BD2344B66E1344974B8B380886935007A087E58DF5AB

updated_at: 2026-08-24
---

# TASK-018 — 車通勤ON/OFF・日額通勤手当自動計算

## Purpose

Activate and implement TASK-018 car commuting ON/OFF and daily non-tax commuting allowance calculation using approved Design Revision 2.

## Scope

- Add schema v10 narrow commuting allowance mode and per-workday allowance fields
- Preserve v9 Payroll and Take-home results through legacy-monthly compatibility migration
- Add one effective monthly non-tax commuting allowance domain authority
- Add compact car checkbox and daily commuting allowance under Payroll details
- Car-daily derives allowance from workdays times daily rate using BigInt half-up
- Car none short-circuits commuting allowance, gasoline estimate, and commuting balance to exact zero
- Preserve car detail values while OFF
- Keep gasoline expense isolated from statutory Payroll and Take-home authority
- Add focused migration, calculation, accessibility, mobile, launcher, and portable tests

## Out of scope

- Parking cost or reimbursement
- Train or bus commuter-pass costs
- General transport-mode architecture
- Tolls, maintenance, tires, depreciation, or vehicle ownership costs
- Route or distance API and gasoline-price lookup
- Statutory distance/date tax-free ceiling engine or taxable-excess split
- Other-tab redesign or Settings consolidation
- 2027 or later Take-home rule implementation
- Shared governance update or TASK-013 mutation
- Tag, GitHub Release, Distribution, Pages, deployment, or main integration

## Acceptance criteria

- v9 to v10 migration preserves exact existing Payroll, practical-income, and linked Take-home outputs until explicit user adoption
- Migrated plans use legacy-monthly mode and preserve existing monthly commuting allowance and fuel detail bytes
- New plans default to car OFF with daily non-tax commuting allowance 800 yen and zero compatibility monthly amount
- Car-daily monthly allowance uses BigInt half-up workdaysTenths times dailyYen divided by 10
- Car OFF makes effective commuting allowance, gasoline estimate, and commuting balance exactly zero without clearing saved values
- monthlyNonTaxableCommutingYen is authoritative only in legacy-monthly and never competes with derived car-daily authority
- Payroll to Take-home uses only calculatePayroll effective commuting compensation and never gasoline expense
- Legacy UI is truthful mixed state; unrelated edits do not silently adopt the new model
- Old editable monthly commuting field is removed from normal editing; daily rate is in Details
- Tax help discloses that the daily amount is treated as non-taxable by the current model and statutory caps/excess are not automatically calculated
- All focused tests, repository gates, launcher freshness, standalone file browser, runtime network 0, console/page errors 0 pass

## Tests

- Focused schema v9 to v10 lossless migration and fail-closed storage tests
- Focused legacy-monthly exact-result preservation tests
- Focused daily allowance rounding and stale monthly authority isolation tests
- Focused car OFF exact-zero and saved-value preservation tests
- Focused Payroll-to-Take-home authority firewall tests
- Focused mixed-state checkbox adoption and accessibility tests
- 320px and 375px layout tests
- TASK-017 regression tests
- Full governance/typecheck/lint/format/unit/build/launcher/portable file tests

## Build

- Run focused TASK-018 migration/domain/UI tests
- Run full repository dependency, typecheck, lint, format, tests, and build gates
- Regenerate and verify the root standalone launcher
- Run standalone file browser verification with runtime network requests 0

## Rollback

Do not integrate the TASK-018 candidate; preserve evidence and remove only the clean dedicated TASK-018 worktree when later authorized.

## Forbidden changes

- Do not overwrite user-owned or dirty diffs
- Do not use reset, clean, restore, stash, rebase, amend, squash, force push, or history rewrite
- Do not change or sync shared governance in TASK-018
- Do not alter TASK-013, retired TASK-009, or historical TASK-004/TASK-005 state
- Do not add statutory commuting tax-cap logic beyond the approved disclosure
- Do not make gasoline expense part of statutory Payroll or Take-home compensation
- Do not silently convert migrated legacy plans to car-daily or none
- Do not clear saved car inputs when car is OFF
- Do not integrate main, tag, release, distribute, publish Pages, or deploy
