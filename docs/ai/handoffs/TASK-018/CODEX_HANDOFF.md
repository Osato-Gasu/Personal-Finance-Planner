# RELAY HANDOFF — TASK-018

- relay_schema: 2
- task_id: TASK-018
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-018-car-commute-daily-allowance
- reviewed_candidate: none
- candidate_commit: none
- implementation_candidate: 4816f7c153931bcc4a754cf5d238546873c99a6c
- reviewed_handoff_head: none
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- next_phase: implementation
- next_actor: Codex
- next_role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- routing_mode: legacy_unspecified
- review_stage: implementation

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

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

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

Validated full bundle: docs/ai/reports/TASK-018/RELAY_BUNDLE.json
