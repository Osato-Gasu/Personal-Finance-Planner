---
task_id: TASK-020
repository: Osato-Gasu/Personal-Finance-Planner
from_actor: CODEX_MAIN
next_actor: GPT_ORCHESTRATOR
return_state: SPEC_CHANGE_REQUIRED
formal_state: BLOCKED
issue_id: SPEC-020-CI-EVENT-ENVELOPE
---

# TASK-020 Codex Main — SPEC_CHANGE_REQUIRED

Shared 2.0.6移行のProject実装・独立VERIFY・exact candidate正式CIはPASS。旧承認candidateを再返却した
ものではない。現行canonical handoffは2.0.6移行の実装のみを許可しており、
main統合・Release・Completionには新しいGPT統括の明示承認が必要。
本返却はTASK完成を主張しない。TASKがcurrent-state owner、EVENTSが履歴owner。

## Exact identities / protected history

- Current implementation candidate: `e019f737f52e8e499126478ae46dba4e7cf82166`.
- Tree: `b758c285d9776c9507bea557b5437eb0cda0880a`.
- Frozen ref: `no-ci/task-020-rc-e019f737f52e`.
- TASK branch: `no-ci/task-020-shared-2.0.6-migration` (later commits are tracking,
  generated HTML and return/raw evidence only; candidate implementation bytes unchanged).
- Released Shared: `Osato-Gasu/shared` 2.0.6,
  `e384d21a43fcda1195556d4ef6fa382bede48da8`.
- Remote main and clean canonical local main remain
  `e7de34d7b36b7f6ec514d321a0b66381cc810fa2`.
- Prior approved 2.0.0 candidate and its `codex/task-020-shared2-migration` ref
  remain `9fbd3e467dbd72d298afbe9eae46a12629d3306d`, unchanged and unmerged.
- Canonical local main:
  `C:/Users/satoshi-sugaya.dh/Development/personal/Personal-Finance-Planner`.
- Release/completion commits, main integration/CI, local-main synchronization,
  real post-integration downstream Plan and TASK worktree/branch cleanup: NOT_RUN.
  No destructive workaround, force push, tag, release, deployment, setting change,
  product/user-data operation or other Project mutation was performed.

## Implementation / finite AC / tests

Lock schema2 exact2.0.6, small bootstrap, sole permanent Project owner,
schema2 adapter, strict opt-in SharedSync, fail-closed apply/smoke, deterministic
TASK001–020 HTML and legacy retirement/semantic inventory are implemented.
Financial/non-relaxable conditions, product-document identities, audit identities,
historical approvals/retirements/backlog0, product source/financial data/dependencies,
launcher bytes and completion safety are preserved. Product bytes are unchanged.
See [semantic inventory](../evidence/TASK-020/artifacts/SEMANTIC_INVENTORY.md).

Required focused local checks PASS under PowerShell 7 and Windows PowerShell 5.1:
governance35, SharedSync23, TASK HTML28, completion37 (original34 retained),
audit normalization21, seven product-document hashes, exact released Shared
consumer7, bootstrap/HTML freshness, protected boundary, AST and diff checks.
The exact upstream consumer test is offline; it does not claim the real
post-integration downstream Plan. That Plan remains an approved-integration gate.

Separated read-only Luna Max VERIFY I09 PASS on the exact current candidate.
Its impacted checks were rerun in both shells; unaffected valid I07 evidence
was reused. See [I09 result](../evidence/TASK-020/artifacts/VERIFY_RESULT_I09.md).
The routine hosted PS5.1 fixture failure was repaired inside this same Main
using a bounded Luna Low BUILD, a new frozen candidate and a new required VERIFY.

## Formal CI / actual platform records

Current exact-SHA run:
[35314250383](https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/35314250383),
workflow `.github/workflows/ci.yml`, ci_mode `extended`, workflow_dispatch,
head `e019f737f52e8e499126478ae46dba4e7cf82166`, ref
`no-ci/task-020-rc-e019f737f52e`. Final platform readback: completed / success,
with `head_sha == candidate_sha`. Windows hosted job `105502413648` succeeded.
Exact-SHA guard, both-shell governance/contracts/smoke/sync, typecheck, lint,
formatting, product tests, all four financial-rule/overview gates, build,
launcher freshness, both-shell completion automation and portable build passed.
See [platform readback](../evidence/TASK-020/artifacts/CI_PLATFORM_RESULT.md).

Prior run
[35313195554](https://github.com/Osato-Gasu/Personal-Finance-Planner/actions/runs/35313195554)
was a real test FAILURE on candidate `5f5252db3eb99357638400de3706bd267a43aa60`.
This was not billing/quota pending: hosted PS5.1 decoded a non-ASCII test literal
incorrectly. The locale-independent fixture retains the meaningful assertions and
adds ASCII/no-BOM protection. The previous failed result is not erased or made PASS.
See [scoped diagnosis](../evidence/TASK-020/artifacts/CI_FAILURE_DIAGNOSIS.md).

## Blocking finding requiring Shared-owner disposition

`SPEC-020-CI-EVENT-ENVELOPE`: released Shared `core/EVIDENCE.md` restricts the
durable completed-CI record to its six payload fields plus optional runner_kind,
without event_id/type. The same released orchestration parser rejects every
JSONL history line lacking event_id/type. Literal compliance with the event owner
would break publish/resume; adding fields would violate its explicit restriction.
An in-memory synthetic fixture reproduced rejection with zero remote writes.
See [exact reproduction](../evidence/TASK-020/artifacts/CI_EVENT_SCHEMA_CONFLICT.md).

No Shared parser/guard was changed or bypassed and no incompatible minimal CI
record was appended. Actual platform records are retained, but normative
completed-run history emission is explicitly pending owner clarification.
This is not a Project source-test failure, optional improvement, or USER decision.

## Requested next action / remaining work

GPT統括: reconcile the completed-CI payload and universal orchestration envelope,
or release a compatible parser under Shared authority; give exact continuation
instructions to the same Main. Promote the already-observed actual run results
to the clarified canonical history without inventing results or changing tested
Project implementation bytes. Preserve current candidates, refs and evidence.

Then make the explicit final Acceptance/Release/Completion decision and authorize
any main fast-forward. After that approval, the same Main must execute required
live guards, Release/main and Completion/final-main state changes and required
exact main CI, real released-Shared downstream Plan, canonical local-main sync,
launcher/portable gates and non-forced TASK cleanup. Until then these remain
unexecuted and TASK-020 is not COMPLETED. No new Main or new product TASK is needed.

## Complete chronological invocation ledger (EVENTS projection)

01 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=BLOCKED | initial bootstrap BOM; zero remote writes
02 | Main | req=existing USER-selected session/未指定 | actual=未確認/未確認 | result=SPEC_CHANGE_REQUIRED | same Main migration, exact CI, Shared owner conflict return
03 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=CHANGES_REQUIRED | initial Project contracts/hooks contribution
04 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=CHANGES_REQUIRED | validation/HTML/CI contribution; bounded gate corrections required
05 | BUILD | req=Luna/XHigh | actual=未確認/未確認 | result=PASS | contracts/smoke/null-SHA/review precedence correction
06 | BUILD | req=Luna/Medium | actual=未確認/未確認 | result=PASS | validator and diagnostic negative tests; unrequested debt counter change excluded by Main
07 | VERIFY | req=Luna/Max | actual=未確認/未確認 | result=PASS | exact 5f5252 candidate, separated readonly
08 | BUILD | req=Luna/Low | actual=未確認/未確認 | result=PASS | one-file hosted PS5.1 fixture encoding fix
09 | VERIFY | req=Luna/Max | actual=未確認/未確認 | result=PASS | exact e019f7 replacement candidate, separated readonly

## Phase entries (EVENTS projection)

Discovery1 / Requirements1 / Design1 / IndependentReview0 (skipped) / SpecGate1 /
Implementation1 / BuildVerifyFix2 / RCFreeze2 (current) / Acceptance0 / GoNoGo0 /
Release0 / Completion0. Same-phase shell commands were not counted as new entries.
