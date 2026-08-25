# RELAY HANDOFF — TASK-019

- relay_schema: 2
- task_id: TASK-019
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-019-take-home-simplification
- reviewed_candidate: none
- candidate_commit: none
- implementation_candidate: ab694bbf2a236b38fc8b52b09b3f9f368ba93f8c
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

Activate and implement TASK-019 Take-home UI simplification, Payroll-linked transient preview, safe estimate fallbacks, and current-year cash-flow resident-tax approximation using the final approved design.

## Scope

- Simplify Take-home normal UI to self/current-year Payroll-driven estimated Take-home workflow
- Preserve existing direct/unbound/manual/disabled/stale-binding source authority on view/re-render
- Implement non-persisted brand-new Payroll preview with explicit atomic first persistence
- Implement visible non-persisted employment/prefecture assumptions without falsifying confirmed facts
- Implement bounded current-year cash-flow resident-tax estimate with assessment-year-safe manual precedence
- Keep Payroll gas-adjusted practical income outside statutory Take-home authority
- Move expert/legacy controls to collapsed details while preserving stored bytes
- Add compact Take-home form and checkbox styling with desktop/mobile layout stability
- Add focused source-authority, atomicity, year-identity, estimate provenance, compatibility, and UI tests
- Produce browser evidence and separated high-risk VERIFY for the exact committed candidate

## Out of scope

- Spouse/dependent deduction rules or dependent schema
- Exact municipality resident-tax engine
- New Take-home rule years
- Payroll statutory-calculation redesign
- Gas-adjusted practical income as a statutory base
- Exact pay-period withholding simulation
- Exact month-by-month resident-tax collection timing
- Broad Settings/common-profile redesign
- Unrelated module refactor
- Shared governance update
- Tag, GitHub Release, Distribution, Pages, deployment, or main integration

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- Normal Take-home UI has no person selector and no editable target-year field.
- Current year is derived from referenceDate; unsupported years do not fall back to 2026 and do not write plan/binding state.
- Brand-new current-year context previews from the unique active Payroll plan without persistence; existing source authority remains authoritative until explicitly changed.
- Statutory Take-home uses Payroll statutory compensation only; gas-adjusted practical income never enters tax/social-insurance calculation.
- Missing/multiple Payroll sources produce actionable/integrity messaging rather than arbitrary selection.
- Duplicate plan/member birth-date and residence input blocks are removed from normal view.
- Age is displayed from member birth date; missing birth date exposes only a compact correction action and no fake DOB.
- Employer prefecture is the only normal editable insurance-location field when needed; residence fallback is non-persisted and visibly identified.
- Spouse/child controls are not shown; results disclose that spouse/dependent deductions are not modeled.
- New-context employment conditions and general employment-insurance category may be assumed only non-persistently with visible warning and are never silently persisted.
- Resident tax is current-year cash-flow; manual override applies only when assessmentYear matches currentYear; mismatched-year data is preserved but not applied; estimate provenance/omissions are visible.
- Existing explicit false/manual/unsupported, unbound, stale-binding, and disabled-plan states are not silently overwritten, rebound, repaired, reactivated, or replaced.
- Unsafe unresolved birth date, prefecture, supported year, or effective source yields one actionable blocking reason rather than invented data.
- Default visible data is limited to current context, salary source summary, employer prefecture when needed, age/profile status, and concise provenance.
- Technical fields are collapsed under Details by default.
- Take-home checkboxes are compact and scoped without global input CSS changes.
- Take-home text/number/select controls use compact Payroll-consistent dimensions.
- Expanding details does not change outer card/grid column widths; desktop remains two-column and mobile stacks cleanly.
- Normal results show average monthly take-home estimate, annual take-home estimate, and tax/social-insurance total; average monthly equals floor(annualTakeHomeYen/12) even with bonuses and is not presented as actual paycheck.
- Visible disclosures explain annual/12 semantics and estimate provenance strongly enough to avoid false precision.
- Viewing/re-rendering/revisiting Take-home does not create/bind/rebind/reactivate/replace/delete/rewrite persisted plan/source data; first explicit new-context persistence confirms assumptions and atomically creates plan+binding.
- Existing backups/current schema round-trip without lossy migration; legacy/manual/direct/bonus and year-mismatched resident-tax data are preserved.
- Focused TASK-019 tests cover the complete AC-23 source-intent, fallback, year-identity, atomicity, UI, and compatibility matrix.
- Repository checks pass: npm test, typecheck, lint, format:check, build, verify:launcher, governance/completion-required checks.

## Tests

- Focused current-year and unsupported-year zero-write tests
- Focused unique/missing/multiple Payroll source tests
- Focused statutory-vs-practical Payroll firewall tests
- Focused unbound/stale-binding/disabled-plan preservation tests
- Focused transient-preview no-write/no-multiplication tests
- Focused atomic first plan+binding persistence and partial-failure tests
- Focused preview-assumption provenance and existing-false preservation tests
- Focused employer-prefecture fallback non-persistence tests
- Focused resident-tax current-year/manual-year/proxy/omission tests
- Focused average-month bonus-case label/disclosure tests
- Focused compact checkbox/details/layout and mobile tests
- Focused legacy-data preservation tests
- npm test
- npm run typecheck
- npm run lint
- npm run format:check
- npm run build
- npm run verify:launcher
- Repository governance/project-overlay checks
- Required browser/runtime evidence for desktop and narrow mobile

## Forbidden changes

- Do not overwrite user-owned or dirty diffs
- Do not use reset, clean, restore, stash, rebase, amend, squash, force push, or history rewrite
- Do not edit docs/ai/generated/shared directly or update shared governance for TASK-019
- Do not silently mutate existing unbound/manual/disabled/stale-binding source authority
- Do not persist transient employment assumptions without explicit first-persistence confirmation
- Do not apply a resident-tax manual value from a mismatched assessment year to current-year take-home
- Do not make gas-adjusted Payroll practical income a statutory Take-home base
- Do not add spouse/dependent tax rules or unsupported take-home years
- Do not perform unrelated Payroll/Budget/Investment refactors
- Do not integrate main, tag, release, distribute, publish Pages, or deploy before ChatGPT final authorization
- Do not delete unrelated worktrees/branches or user-owned data

Validated full bundle: docs/ai/reports/TASK-019/RELAY_BUNDLE.json
