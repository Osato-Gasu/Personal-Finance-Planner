# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Execution

This file is the canonical `global` / `EXECUTION` owner. It defines immutable
startup, Git/worktree safety, class/routing execution, workers, tests,
verification, release gating, rollback, and connector evidence. The finite
machine values used here are in `core/POLICY.psd1`.

## Immutable-first startup

1. Resolve the requested local ref or connector ref once to an exact commit
   and tree.
2. In local mode, require clean staged, unstaged, and untracked state, one
   writer, and no unfinished Git operation. Preserve user-owned differences.
3. Read `PROJECT_RULES`, `WORKFLOW`, `PROJECT_ADAPTER`, and
   `SHARED_RULES.lock.yml` only as blobs from the pinned project commit.
4. Derive shared repository/version/commit/tree/manifest identity only from
   the pinned lock blob, then resolve shared source and its manifest/blob set
   exactly.
5. Record every project/shared path, commit, tree, manifest, and blob identity
   before classification. Validate evidence completeness and trigger values;
   missing or unknown evidence routes to a user question and `BLOCKED` first.
6. Ask only indispensable user questions; derive TASK/handoff and dispatch
   only after evidence validation. Later branch movement never changes the
   pinned authority.

Connector-only operation is read-only: it may resolve and inspect immutable
blobs and create a portable result bundle, but it cannot claim local clean,
writer, shell, or state-write evidence.

## Class and route execution

The exact evidence fields, triggers, classes, route IDs, assignment-purpose
mapping, global minimum matrix, and availability values are machine-owned by
`POLICY`. Execute in this order:

1. Validate evidence fields, trigger fields, types, and applicability.
2. If required evidence or a trigger is missing/unknown, return `BLOCKED`
   before classification.
3. Select base class `high_risk`, then `small`, otherwise `normal`.
4. Validate the exact project `ProjectConstraints` record.
5. Apply its upward-only `ReviewClassFloor`.
6. Resolve the assignment to exactly one `Purpose`.
7. Read the global minimum for the effective class and reject
   `not_applicable`.
8. Apply only an upward project minimum; reject downgrade, wrong-purpose,
   route-addition, or newly applicable values.
9. Remove ordered unique prohibited routes.
10. Scan the purpose order from the effective minimum upward.
11. If decision-relevant availability is `unknown`, return `BLOCKED`.
12. Select the first available remaining route.
13. If no route remains, return `BLOCKED`.

`Sol-Ultra` is consumed once by the policy migration as `Sol-max`; it is not a
runtime route or permanent alias. A project cannot add a route, alter purpose,
lower class, or lower a minimum.

## Deterministic BUILD workers

Worker planning consumes only the finite scope record fields in `POLICY`:
`ScopeId`, `Paths`, `DependencyScopeIds`, `MutableOutputPaths`,
`IndependentlyCommittable`, `EffortClass`, `WorkerAllowed`, `OwnershipStatus`,
`EvidenceStatus`, and optional `IndependentExecution`.

Reject duplicate IDs, missing dependencies, cycles, unknown ownership, or
unknown evidence. Eligible scopes are independently committable, worker
allowed, exact ownership, bounded evidence, and normal/large effort. Sort by
`large > normal > small`, then ordinal `ScopeId`. Walk once, append only when
expanded paths and expanded dependency-scope sets are disjoint from selected
scopes, permanently skip conflicts, and stop at the policy maximum of two.
There is no pair optimization, backtracking, or maximum-cardinality search.

Two selected scopes may fan out only when fanout is available; unavailable
fanout is executed sequentially by the Main writer, and unknown fanout blocks.
Zero or one selected scope means Main executes the work sequentially. A
required independent scope that cannot execute independently blocks. Main
remains the integration writer.

## Checks, VERIFY, and release

`DESIGN_SELF_CHECK`, `BUILD_SELF_CHECK`, `AUTHORITATIVE_VERIFY`, and
`RELEASE_GATE` are separate tokens. Self-checks are optional supplementary
evidence and never satisfy VERIFY or release. Every class requires a separate,
read-only `AUTHORITATIVE_VERIFY` against the exact committed candidate.

VERIFY returns exactly `PASS`, `FAIL`, or `BLOCKED`. `PASS` permits separate
release-gate evaluation; `FAIL` requires a new committed candidate and a new
request; `BLOCKED` forbids release and returns to the orchestrator. The exact
candidate writer cannot be the sole verifier.

Required implementation evidence includes validator/generator/relay/sync
behavior where those tools are part of the source set, PowerShell 5.1 and 7
adapter parsing, declaration carriers and byte round trips, source-present
and source-less operation, fresh-clone/raw-byte/UTF-8/LF/NFC/BOM/terminal-LF
checks, `core.autocrlf=true`, managed adoption, transactional tracked and
untracked rollback, loader identity, and three-attempt/no-fourth convergence.
Tests may assert only machine guarantees; prose ownership, weakening,
paraphrase, shadow, alias, and substantive strengthening remain semantic
review decisions over immutable evidence.

## Rollback and release boundary

Before mutation, capture the exact tracked and untracked state needed for a
transaction. Any validator, generator, overlay, byte classification, or
semantic round-trip failure rolls back tracked and untracked outputs byte for
byte and reports the new failure. Do not use reset, restore, stash, clean,
rebase, amend, squash, or force push as an implicit recovery step.

Release is a separate gate after VERIFY. It does not authorize tag, main merge,
branch deletion, downstream migration, or synchronization into an active
downstream TASK. Those actions require explicit later authority.
