# RELAY HANDOFF — TASK-017

- relay_schema: 2
- task_id: TASK-017
- decision: REQUIREMENTS_DEFINED
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-017-payroll-ui-simplification
- reviewed_candidate: none
- candidate_commit: none
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

Activate TASK-017 from zero-active governance and implement the approved Payroll UI simplification and commuting-fuel estimate design.

## Scope

- Activate TASK-017 governance on a dedicated branch/worktree from the exact main baseline
- Implement Payroll self/current-year resolution and remove editable person/year controls
- Implement annual-bonus aggregate UI while preserving existing bonus metadata unless explicitly replaced
- Add narrow additive schema v9 persistence for commuting-fuel estimate inputs
- Implement deterministic commuting-fuel estimate and exactly three primary Payroll result cards
- Keep practical-income metrics isolated from statutory Payroll and Take-home calculation authority
- Apply only the low-risk common checkbox/radio compact sizing fix outside Payroll
- Add focused migration, data-preservation, accessibility, layout, build, launcher, and portable-browser tests

## Out of scope

- Redesign of other tabs beyond the shared checkbox/radio fix
- Global text or number input redesign
- Common-profile or Settings consolidation
- 2027 or later Take-home rule implementation
- Partner or past-year Payroll management UI
- Parking, tolls, maintenance, tires, depreciation, debt, net-worth, or charts
- TASK-013 or shared-governance mutation
- Tag, GitHub Release, Distribution, Pages, deployment, main integration, or TASK completion

## Required changes

- none

## User decisions required

- none

## Independent review disposition audit

- not_applicable

## Acceptance criteria

- Editable person/year controls are removed and Payroll resolves only the self/current-reference-year plan without modifying partner or past-year records
- Annual bonus displays the exact sum of existing bonus records and unrelated edits preserve the full bonus array deep-equal
- Changing one existing bonus record preserves its id, payment date, and eligibility flags; changing multiple records requires explicit confirmation before flattening
- Schema v8 to v9 adds only the commuting-fuel estimate object to PayrollPlan and preserves all other existing state
- Fuel inputs persist through normal AppState backup/export/import with no sidecar storage
- Fuel estimate uses fixed-point integer authority and final half-up rounding; invalid or incomplete inputs never become implicit zero, NaN, or Infinity
- Primary Payroll result cards are exactly 月収, 実質月収, 年収 and match Design Revision 2 definitions
- Fuel-only changes do not alter statutory PayrollResult, Payroll-to-Take-home effective compensation, tax, social insurance, employment insurance, or binding authority
- Short labels have accessible hover/focus/keyboard/touch explanations and the practical-income caution remains always visible
- Checkbox/radio controls are compact across tabs while Payroll-only input/layout changes do not create horizontal overflow or disclosure-driven resizing
- All repository tests, build, launcher freshness, standalone file:// portable tests, runtime network 0, console errors 0, and page errors 0 pass

## Tests

- Full repository governance, typecheck, lint, format, unit/integration, build, launcher, and portable-browser gates
- Focused TASK-017 self/current-year and partner/past-year preservation tests
- Focused bonus zero/one/multiple record preservation and confirmation tests
- Focused v8-to-v9 migration and v9 backup/export/import roundtrip tests
- Focused commuting-fuel fixed-point, half-up, missing-input, invalid-input, and negative-balance tests
- Focused statutory-authority firewall tests proving fuel-only edits do not change Payroll or linked Take-home results
- Focused accessibility and 320px/375px layout/disclosure stability tests
- Cross-tab checkbox/radio smoke tests

## Forbidden changes

- Do not overwrite user-owned or dirty diffs
- Do not use reset, clean, restore, stash, rebase, amend, squash, force push, or history rewrite
- Do not alter TASK-013, shared governance, retired TASK-009, or historical TASK-004/TASK-005 state
- Do not add unsupported Take-home rule years
- Do not change main, create tags/releases, distribute, publish Pages, or deploy
- Do not subtract gasoline cost from statutory payroll compensation or Take-home inputs
- Do not reconstruct existing bonus metadata on unrelated Payroll edits

Validated full bundle: docs/ai/reports/TASK-017/RELAY_BUNDLE.json
