# HANDOFF — TASK-016 Codex implementation

## Identity

- task_id: TASK-016
- feature: 給与→手取り→家計→NISA+iDeCo自動連携・6タブUI再設計
- phase: implementation
- status: ready
- actor: Codex
- role: IMPLEMENTER
- model: 5.6 Sol
- effort: high
- repository: Osato-Gasu/Personal-Finance-Planner
- branch: codex/task-016-linked-finance-workflow
- baseline_commit: 2c99809634e613963574fea63383889da8ece025
- candidate_commit: none
- shared_candidate: 10cd1466b10f814f1bd2aab2c5f6ba6465c5899e
- canonical_candidate_field: TASK-016 implementation_candidate after commit
- product_identity: docs/ai/PRODUCT_IDENTITIES.yml#requirements_*

## Assignment / result

- purpose: Implement accepted TASK-016 spec revision 4, preserving existing calculators/data and adding the six-tab linked financial workflow and modern UI.
- scope: Payroll domain/tab; payroll-to-take-home runtime binding; deterministic BudgetIncomePolicy; cycle-free Budget-to-Investments funding context; Overview life-plan embedding; schema v8/migrations; shared modern UI; complete tests/build/portable evidence.
- out_of_scope: TASK-013/shared recovery changes, shared governance migration, main integration, merge, tag, Release, Distribution, Pages, deployment, TASK-009, automatic investment allocation, exact payroll-slip/legal overtime engine, unrelated refactors.
- acceptance_criteria: All requirements and tests in `docs/ai/tasks/TASK-016.md` and the immutable Revision 4 design package must pass; candidate must be an exact committed descendant of the canonical activation head with separate high-risk VERIFY.
- forbidden_changes: No TASK-013/shared recovery mutation; no generated shared direct edits; no destructive Git operations; no main/release/distribution actions; no unavailable-to-zero financial fallback; no double counting; no data-loss relaxation.
- tests_and_build: Full repository gates plus TASK-016 focused payroll/link/funding/schema/UI tests, TASK-014/TASK-015 regressions, build/launcher/portable Edge file:// evidence.
- browser_evidence: required; Edge file://, six routes, network 0, console/page errors 0, localStorage preservation and responsive navigation/work-tab smoke.
- commit_policy: Main is sole integration writer. Forward commits only. Exact committed candidate; VERIFY FAIL requires new candidate and new VERIFY. No amend/squash/rebase/force push.
- stop_conditions: origin/main or activation identity mismatch; dirty/ambiguous TASK worktree; user-owned diff risk; incorrect shared root/lock; governance route mismatch; required financial/data-preservation/portable gate failure.
- return_to: ChatGPT
- relay_recipient: Codex
- relay_recipient_role: IMPLEMENTER
- result_return_to: ChatGPT
- actual_executor: Codex
- provider_substitution: none
- independent_review_kind: none
- review_role: none
- execution_mode: existing_session
- repository_access: local_write_on_dedicated_task_worktree
- review_status: not_requested
- request_review_status: none
- review_model: none
- review_effort: none
- reviewed_candidate: none
- reviewed_spec_revision: 4
- review_request_id: none
- review_started_at: none
- review_completed_at: none
- review_result: none
- review_findings_count: 0
- review_finding_ids: none
- relay_schema: not_applicable
- canonical_relay_bundle: not_applicable

## Required changes

Implement TASK-016 spec revision 4 exactly. Treat the external design/review files as immutable evidence, while this repository TASK is the canonical lifecycle owner.

## Shared-source preflight

The TASK-016 baseline lock is NOT the TASK-013 branch lock.

Required lock:

- version `0.12.20`
- commit `10cd1466b10f814f1bd2aab2c5f6ba6465c5899e`
- tree `7619e4ff66deed30bc5b3d292df1abeddb678f59`
- manifest SHA-256 `94A0527669659CDBEB263773C25F85E48CED696DCC1F0F35DD62473A4FB200FE`

Create/use a disposable clean checkout of `Osato-Gasu/shared` pinned exactly to that commit and run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/sync-shared-governance.ps1 -Check -SharedRoot <EXACT_0_12_20_SHARED_ROOT>
```

Do not use the ambient `AI_DEVELOPMENT_GOVERNANCE_ROOT` if it resolves to another version. Do not modify the user's shared 1.2.0 checkout or TASK-013 v1.0.1 recovery checkout.

## Model boundary

Repository v0.12.20 `PROJECT_ADAPTER.psd1` allows `Codex|IMPLEMENTER|5.6 Sol|medium/high`; therefore canonical effort is `high`. Do not change the adapter merely to request xhigh.
