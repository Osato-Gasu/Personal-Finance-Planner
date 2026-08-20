# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Lifecycle

This file is the canonical `global` / `LIFECYCLE` owner. It defines phases,
TASK state separation, review convergence, and user routing. Finite values and
schemas are in `POLICY`; execution mechanics are in `EXECUTION`.

## Phases

The required phase IDs are:

```text
requirements
design
design_review
implementation
implementation_review
browser_evidence
release
completion_sync
user_decision
blocked
```

The canonical completed phase ID is `completed`; `done` is not a phase. A
project may add a project-specific phase only through its bounded adapter. It
cannot remove, rename, or reinterpret a shared phase.

## State ownership

Mutable current baseline, candidate, phase, route, risk class, model, worker
plan, VERIFY plan, review state, and progress are owned only by
`active_task_frontmatter`. `CURRENT_STATE.md` is an index of accepted identity,
`NEXT_ACTION.yml` is a derived route, and `board/PROGRESS.html` is a generated
view. TASK body sections contain normative task requirements only and must not
repeat current frontmatter values.

Every state transition synchronizes TASK, CURRENT_STATE, NEXT_ACTION, current
handoff/report, and progress to the same candidate, phase, and actor. A stale
identity in any one artifact fails the transition. Historical identity is
retained by path reference to immutable evidence, not rewritten into current
state.

## Review convergence

Implementation review has at most three attempts:

| Attempt | Profile | Admissible scope |
| --- | --- | --- |
| 1 | `standard` | bounded candidate review, at most two actionable findings |
| 2 | `narrowed` | accepted unresolved finding, repair regression, requirement or major safety/test/compatibility failure, or release gate |
| 3 | `terminal` | only BLOCKER/MAJOR release blockers in those categories |

After a third non-pass, materialize `NEEDS_USER_DECISION`, preserve every
finding and disposition, set termination, and create no fourth review. The
user chooses whether to repair or redefine scope. An approved new spec or
TASK resets convergence to attempt 1; an implementation `FAIL` still requires
a new committed candidate and a new request.

The independent design review result is evidence, not final approval. The
orchestrator owns the formal `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED`, or
`NEEDS_USER_DECISION` disposition, with stage-specific candidate and next
actor. `CHANGES_REQUESTED` cannot widen scope or rewrite prior findings.

## Routing and blocked states

Evidence validation and unknown handling occur before class selection. An
unresolved assignment, unknown route availability needed for the decision,
zero valid route, invalid project constraint, missing evidence, or identity
mismatch returns `BLOCKED` with a resume condition. A blocked state never
advances to release. User questions are asked only for indispensable missing
decisions after immutable evidence is recorded.
