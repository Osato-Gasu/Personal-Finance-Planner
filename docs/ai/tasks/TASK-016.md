---
task_id: TASK-016
title: 給与→手取り→家計→NISA+iDeCo自動連携・6タブUI再設計
status: ready
route: TWO_SESSION_FAST
priority: high
spec_revision: 4
spec_status: accepted
current_phase: implementation
current_role_id: IMPLEMENTER
next_actor: Codex
next_role: IMPLEMENTER
assigned_model: 5.6 Sol
assigned_effort: high
session_mode: new
handoff_file: docs/ai/handoffs/TASK-016/CODEX_HANDOFF.md
preferred_executor: Claude
allowed_executors: Claude, ChatGPT
executor_policy: preferred_fallback
return_to: ChatGPT
browser_evidence_required: true
claude_design_review_recommendation: not_needed
claude_implementation_review_recommendation: optional
claude_design_review_required: false
claude_implementation_review_required: false
claude_design_review_status: not_requested
claude_implementation_review_status: not_requested
base_commit: 2c99809634e613963574fea63383889da8ece025
base_tree: cf199677778a9bc612c26d6a6b866a9685f04f54
accepted_product_identity_reference: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*
accepted_product_sha256: D6BF0CC2C99D65EC46DC5154F079D7C3CBD1A36661E9E4A7AC668B7EF5BB1173
shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
updated_at: 2026-08-21
---

# TASK-016 — 給与→手取り→家計→NISA+iDeCo自動連携・6タブUI再設計

## Purpose

現行6画面を、`総合サマリ / 給与計算 / 手取り計算 / 家計簿 / NISA + iDeCo / 設定` のexact 6タブへ再編する。給与計算で算出した月収・年収を手取り計算へ、手取り結果を家計簿へ、家計簿後の残額をNISA+iDeCoの投資可能額へ、派生値を重複保存せず正本参照で自動連携する。給与・手取り・家計簿・NISA+iDeCoの4タブは同一画面内に入力と結果を持ち、全画面を共通のモダンな金融ダッシュボードUIへ統一する。

## Canonical design authority

- final task design revision: 4
- external implementation set: `TASK-016_CODEX_MAIN_IMPLEMENTATION_UPLOAD_SET.zip`
- external set SHA-256: `5D77707CB4917151268721201033DFBC54995FBD0260BB454826C8B712CC70BB`
- independent design review rounds: 2
- Revision 2 findings: 5 MAJOR, all accepted and closed
- Revision 3 finding: `DR3-MAJ-01`, accepted and closed in Revision 4
- final orchestration design disposition: `DESIGN_APPROVED_FOR_IMPLEMENTATION`
- final in-session review: PASS / findings 0

The external package is supporting immutable design evidence. This TASK file is the repository lifecycle/rule owner for TASK-016.

## Baseline and branch

- product/governance parent baseline is exact `2c99809634e613963574fea63383889da8ece025` / tree `cf199677778a9bc612c26d6a6b866a9685f04f54`.
- dedicated branch: `codex/task-016-linked-finance-workflow`.
- the TASK activation commit is governance-only and must contain no product/source/test/generated-launcher change.
- implementation begins only from the exact canonical TASK-016 branch head after this activation materialization.
- TASK-013 branch/worktree and shared recovery are out of scope and must not be changed, closed, synchronized, removed, rebased, or reused.

## Shared governance authority

TASK-016 remains on the exact baseline shared snapshot:

- version: `0.12.20`
- source commit: `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`
- source tree: `7619e4ff66deed30bc5b3d292df1abeddb678f59`
- manifest SHA-256: `94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE`

Do not adopt TASK-013 branch shared v1.0.1 or ambient shared v1.2.0. For source-present shared checks, use a clean disposable checkout pinned exactly to the lock commit above and pass it explicitly with `-SharedRoot`; do not rely on ambient `AI_DEVELOPMENT_GOVERNANCE_ROOT`.

## Scope

### Routes / UI

- canonical visible routes exact order: overview, payroll, take-home, budget, investments, settings.
- labels exact order: 総合サマリ, 給与計算, 手取り計算, 家計簿, NISA + iDeCo, 設定.
- legacy `#/life-plan` resolves safely to overview; no seventh canonical route.
- current TASK-014/TASK-015 life-plan settings, events, results, warnings and financial-assets timeline remain available under Overview as `将来資産シミュレーション`.
- payroll/take-home/budget/investments each contain input + result in the same page.
- shared modern light finance-dashboard system across all six tabs; 360px+, keyboard/focus/labels/contrast, no external UI framework/CDN/runtime network.

### Payroll

- add first-class PayrollPlan with stable id, memberId, targetYear, active, base monthly salary, taxable monthly allowance, average monthly overtime minutes, scheduled monthly minutes, overtime rate basis points, monthly non-taxable commuting, and dated bonus records.
- one active PayrollPlan maximum per member + targetYear; historical years may coexist; bonus date must belong to targetYear.
- normal visible payroll inputs are basic salary, average overtime hours and fixed taxable allowance; bonus is optional; scheduled hours, multiplier, commuting and bonus eligibility are advanced/collapsed.
- default scheduled time 160h and multiplier 1.25 are editable convenience defaults, not legal guarantees.
- overtime result uses deterministic checked integer rational half-up arithmetic; no 12-month overtime schedule, deep-night/holiday/60h statutory engine, or exact payroll-slip claim.
- recurring monthly taxable salary excludes bonuses; annual taxable salary is recurring monthly ×12 plus payroll bonuses once.

### Payroll → Take-home

- do not change the required persisted shape of existing TakeHomePlan.
- add top-level TakeHomeCompensationBinding with takeHomePlanId/payrollPlanId/active.
- zero or one active binding per calculated TakeHomePlan; same member and targetYear required; invalid active binding fails closed and never silently falls back to direct.
- absence of active binding preserves exact baseline direct compensation behavior.
- payroll-linked mode constructs a transient effective monthly-mode take-home plan only; persisted direct data is not rewritten.
- effective monthly/annual taxable/non-taxable salary is supplied from PayrollResult, `annualOtherTaxableSalaryYen = 0`, payroll bonuses are exposed exactly once, `monthlyEmploymentInsuranceWagesYen = null`, `employmentInsuranceWageOverrideYen = null`.
- employment/social-insurance/resident-tax/deduction settings remain owned by existing take-home plan; existing calculator remains sole tax/social-insurance authority.
- if baseline monthly-mode fallback cannot establish a required basis, propagate incomplete/unsupported; do not invent a statutory wage-base formula.

### Existing linked iDeCo edge

- preserve existing iDeCoPlan -> TakeHomeResult linked tax-deduction behavior.
- do not remove or bypass it to simplify the UI pipeline.

### Take-home → Budget

- do not change required IncomeTarget/LinkDefinition persisted shapes.
- add top-level BudgetIncomePolicy `{ targetId, mode: auto-take-home | legacy }`.
- `targetId` is the unique persisted key: zero or one policy per IncomeTarget.
- every policy must reference an existing IncomeTarget; duplicate same-mode, conflicting-mode, orphan, malformed or invalid-mode policy is rejected by v8 parser and validateAppState; no first/last selection, silent dedupe, reorder resolution or legacy fallback.
- no policy or legacy mode uses exact existing LinkDefinition/manual behavior.
- auto mode dynamically resolves exactly one active calculated TakeHomePlan for target member + reference year and uses authoritative averageMonthlyTakeHomeYen; zero/multiple/incomplete is unavailable, never manual fallback or 0.
- policy switching is atomic/idempotent per target and preserves manualYen and all LinkDefinition records; persistence failure publishes no partial state.
- migration creates no policy; migrated v7 remains exact legacy behavior.

### Budget → Investments

- add pure InvestmentFundingContext based on authoritative BudgetSummary plus direct current-month NISA and iDeCo cash-contribution observations.
- funding context must not call NISA/iDeCo future evaluators and must not feed back into take-home or mutate contribution plans.
- iDeCo account fee is not household cash contribution.
- unavailable current contribution makes funding unavailable, never 0.
- show household/member investment-available amount, current NISA/iDeCo contribution, remaining after investment, and oversubscription/shortfall.
- never automatically invest all budget remainder and never silently reduce contributions.

### Overview / Life Plan

- Overview is composition only, not a second calculator.
- show pipeline status and KPI cards from authoritative selectors.
- retain TASK-014/TASK-015 calculations without rewriting them to use InvestmentFundingContext.

### Schema / storage

- bump current schema to 8.
- v8 adds only top-level `payrollPlans`, `takeHomeCompensationBindings`, `budgetIncomePolicies` plus canonical route-set change.
- do not add v8-required fields to TakeHomePlan, IncomeTarget, LinkDefinition, NisaPlan, IdecoPlan or LifePlanState.
- freeze exact top-level schema-v7 representation with old life-plan route.
- v7→v8 maps life-plan active route to overview and adds three empty arrays; all existing financial/user data deep-preserved.
- v8 parser strictly requires v8 arrays/route; missing/malformed v8 is rejected rather than interpreted as legacy.
- new storage key `personal-finance-planner:state:v8`; if v8 exists and is corrupt, do not fall back to v7; only when v8 is absent may valid v7/older migrate in memory and atomically write v8; legacy bytes remain unchanged.
- preserve v1→v8 deterministic/idempotent/lossless migration/import/export/backup and CR/LF legacy display names.

## Dependency DAG

Permitted:

```text
PayrollPlan ----------------------> TakeHomeResult
                                         ^
iDeCoPlan -- linked tax deduction ------|
                                         |
                                         v
                                   BudgetSummary
                                         |
                                         v
                              InvestmentFundingContext

NISA/iDeCo current contribution observations -> InvestmentFundingContext
NISA Plan -> existing NISA future evaluation
iDeCo Plan -> existing iDeCo future evaluation
all authoritative selectors -> Overview -> existing TASK-014/TASK-015 selectors
```

Forbidden:

```text
InvestmentFundingContext -> TakeHomeResult
InvestmentFundingContext -> future investment evaluator input
InvestmentFundingContext -> mutate contribution
BudgetSummary -> mutate contribution
```

## Required tests / evidence

At minimum:

- exact baseline direct annual/monthly take-home characterization and parity.
- payroll BigInt/checked rounding, target-year and bonus date/uniqueness, overflow/invalid input.
- payroll-linked transient compensation, stale direct masking, bonus exactly once, commuting separation, remuneration and employment-insurance fallback characterization, missing/wrong-year/ambiguous source failure.
- linked iDeCo tax benefit regression, no selector recursion, funding context never invoking future evaluators, no contribution mutation, unavailable contribution propagation, negative/overflow funding cases.
- BudgetIncomePolicy duplicates/conflicts/orphans/invalid mode rejection, import/backup atomic rejection, auto/legacy resolution, migrated manual zero/nonzero and active link preservation, auto↔legacy switch preservation/idempotence, persistence failure atomicity, deterministic reload.
- v1-v7 fixtures → v8, v7 life-plan route → overview, malformed v8 rejection, corrupt v8 no fallback, v7 bytes unchanged, import/export/backup, CR/LF names.
- exact six routes/labels/order, legacy life-plan hash, four input+result pages, 360px, keyboard/focus/labels/contrast, no unsafe user HTML.
- all existing take-home, budget/link, NISA/iDeCo, overview, TASK-014/TASK-015, storage/migration/backup tests.
- typecheck, lint, format, full tests, governance/project validators, build, launcher freshness, portable Edge `file://`, runtime network 0, console/page errors 0, localStorage preservation, `git diff --check`.

## Candidate / VERIFY contract

- Main is the integration writer.
- Build worker default 0, max 2 only for clean non-overlapping scopes.
- produce one exact committed implementation candidate and keep exact commit/tree/parent identity.
- after candidate, run separate read-only high-risk VERIFY against that exact candidate.
- VERIFY result PASS/FAIL/BLOCKED. FAIL requires Main fix -> new committed candidate -> new VERIFY.
- actual model/effort must be recorded if observable; otherwise `未確認`.
- after VERIFY PASS, publish exact candidate to TASK branch with normal non-force push and observe candidate CI for ChatGPT review.

## Out of scope / forbidden

- TASK-013 branch/worktree/shared-recovery modification or completion.
- shared governance update/migration or generated shared direct edit.
- main integration, PR merge, tag, GitHub Release, Distribution, Pages, deployment, TASK-009.
- remote TASK branch deletion or completion cleanup.
- force push, reset, clean, restore, stash, rebase, amend, squash/history rewrite.
- full payroll-slip/statutory overtime engine, automatic investment allocation, new tax/social-insurance law engine, unrelated refactor.

## Stop conditions

- origin/main is not exact parent baseline before TASK activation/worktree creation.
- TASK branch does not resolve to the canonical activation head supplied by orchestration.
- current TASK worktree is dirty/ambiguous or has unfinished operation.
- user-owned diff would be overwritten or deleted.
- shared source check is not run against exact lock 0.12.20 / 10cd1466 using a clean explicit source root.
- TASK/CURRENT_STATE/NEXT_ACTION/handoff/report/Progress identity mismatch.
- any required financial/data-preservation/portable gate cannot be satisfied.

## Completion boundary

Return exact candidate + VERIFY + CI evidence to `ChatGPT | ORCHESTRATOR_AND_REVIEWER`. Do not declare TASK complete and do not integrate main.
