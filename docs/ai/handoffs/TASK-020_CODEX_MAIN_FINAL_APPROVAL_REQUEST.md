---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: CODEX_MAIN
next_actor: GPT_ORCHESTRATOR
formal_state: DRAFT
authority_condition: GPT_APPROVAL_PENDING
decision: FINAL_APPROVAL_REQUEST
main_integration_authorized: false
---

# TASK-020 — Shared 2.0.8最終承認依頼

Draft only: separated VERIFY/formal CI must finish and this artifact must be
finalized before pointer publication. No approval or TASK completion is claimed.
TASK is the current-state owner; EVENTS owns history; this request is a projection.

## Exact identities / bounded scope

- New candidate: `2853db2763d8f339d606a3c9664f350cafd878cc`.
- Tree: `534f84c4d41b42ef10b6430413f3f6dfbe961eed`.
- Immutable ref: `no-ci/task-020-rc-2853db2763d8`.
- Released Shared: Osato-Gasu/shared 2.0.8,
  `a306ba59f33b156c1e801618bdfa892c411ce7d0`.
- TASK branch: `no-ci/task-020-shared-2.0.6-migration`; tracking/evidence commits
  after the source candidate do not change its implementation bytes.
- Incoming GPT-authorized base: `32c87c6be0fff233d84b8ce05aaed9ae0ae61736`, E0045.
- Remote main / clean canonical local main:
  `e7de34d7b36b7f6ec514d321a0b66381cc810fa2`.
- Canonical local main:
  `C:/Users/satoshi-sugaya.dh/Development/personal/Personal-Finance-Planner`.
- Prior tested 2.0.6 candidate `e019f737f52e8e499126478ae46dba4e7cf82166`
  remains historical; its CI SUCCESS is not the new candidate's CI PASS.
- Prior approved 2.0.0 candidate/ref remains
  `9fbd3e467dbd72d298afbe9eae46a12629d3306d` /
  `codex/task-020-shared2-migration`, unchanged and unmerged.

The implementation delta since e019f7 is only the schema2 Shared lock's
source_version/source_commit. Product, financial semantics/data, dependency and
quality commands, docs/product, audit/identity records, launcher, adapter,
bootstrap/hooks/validators and workflow implementation remain byte-identical.
Other changes are canonical tracking, generated HTML, handoffs and raw evidence.
No product TASK, distribution, tag/release/deploy, repository setting or other
Project operation was introduced. No history rewrite or user-diff deletion.

## AC / tests / independent VERIFY / formal CI

The existing migration implements small bootstrap, sole permanent PROJECT owner,
schema2 adapter/lock, explicit SharedSync opt-in, bounded lock-only apply/smoke,
CI policy and exact-SHA dispatch, semantic-preserving legacy retirement and
deterministic TASK001–020 HTML. Finance non-relaxable conditions, original
completion safety, historical approvals/retirements and backlog0 are retained.
See [semantic inventory](../evidence/TASK-020/artifacts/SEMANTIC_INVENTORY.md).

Affected local checks passed in PowerShell7 and5.1: mandatory public governance
with product/audit overlay, governance35, SharedSync23, TASK HTML28, protected
boundary, actual released2.0.8 consumer7, exact-target bootstrap and freshness.
AST/source and implementation contracts not changed by this two-field edit reuse
valid unaffected prior VERIFY evidence; completion37/audit normalization21 remain
preserved. See [bounded revalidation](../evidence/TASK-020/artifacts/SHARED208_REVALIDATION.md).

Separated read-only Luna Max VERIFY I12: PASS on the exact new candidate;
both-shell affected checks and reader compatibility passed, isolated clone was
clean and precisely removed, and no Main/source/ref/CI/pointer writes occurred.
See [I12 result](../evidence/TASK-020/artifacts/VERIFY_RESULT_I12.md).
Formal exact-candidate extended CI: NOT_RUN, awaiting dispatch.
No pending CI is claimed PASS. The candidate workflow runs all original
required product/financial/build/launcher/portable/completion checks unchanged.

The released2.0.8 reader accepts E0011 as ordinary history and the prior minimal
CI record as historical-only, and uniquely resolves E0045. Both previous Shared
owner/parser blockers are resolved without Project history mutation or reader bypass.

## Remaining authority / operations — not executed

GPT final Acceptance/Release/Completion and main integration approval remain
required for this new exact candidate. No new main SHA, release/completion commit,
main CI, local-main synchronization, real post-integration downstream Plan or
TASK worktree/branch removal is claimed. Runtime is NOT_REQUIRED for the current
governance-only source preparation, not proof of future local completion gates.

After exact VERIFY/CI PASS, GPT統括 should make the explicit final decision and
issue a GitHub-native finalization handoff to the same Main. Preserve candidate
implementation bytes and exact main baseline, and specify Release/main and
Completion/final-main tracking commits and required exact main CI; after approved
integration check released-Shared real downstream Plan CURRENT/Enrolled=true/
Lock VALID/Adapter VALID, then canonical local main fast-forward-only sync,
launcher/portable gates and non-forced clean/reachable TASK worktree/branch cleanup.
No new Main is needed. Approval pending is an authority phase, not USER_DECISION_REQUIRED,
an implementation blocker or COMPLETED. No authority is inferred from successful CI.

## Complete invocation ledger (EVENTS projection)

01 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=BLOCKED | initial legacy BOM bootstrap; zero remote writes
02 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=SPEC_CHANGE_REQUIRED | Shared2.0.6 migration/exact CI and owner conflict return
03 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=CHANGES_REQUIRED | initial contracts/hooks
04 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=CHANGES_REQUIRED | validation/HTML/CI contribution
05 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=PASS | bounded contracts correction
06 | BUILD | req=Luna/Medium | actual=未確認/未確認 | result=PASS | validator/negative tests; unrequested counter excluded by Main
07 | VERIFY | req=Luna/Max | actual=未確認/未確認 | result=PASS | exact 5f5252 readonly verification
08 | BUILD | req=Luna/Low | actual=未確認/未確認 | result=PASS | locale-safe test fixture
09 | VERIFY | req=Luna/Max | actual=未確認/未確認 | result=PASS | exact e019f7 readonly verification
10 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=BLOCKED | Shared2.0.7 rejected historical E0011; zero remote writes
11 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=RUNNING | same Main bounded2.0.8 retarget and new exact gates
12 | VERIFY | req=Luna/Max | actual=未確認/未確認 | result=PASS | exact 2853db2 separated readonly verification

## Phase entries (EVENTS projection; draft snapshot)

Discovery1 / Requirements1 / Design1 / IndependentReview0 (skipped) / SpecGate2 /
Implementation1 / BuildVerifyFix3 / RCFreeze3 (current) / Acceptance0 / GoNoGo0 /
Release0 / Completion0. Final publication must use the finalized event projection.
