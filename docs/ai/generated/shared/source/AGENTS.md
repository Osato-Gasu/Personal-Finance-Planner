# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Shared governance loader

This file is the shared root `GLOBAL_AGENTS` owner and the only repository
bootstrap owner. It is not a PROJECT owner. A downstream root `AGENTS.md` is
materialized separately from `templates/AGENTS.md` and has only the
`managed_loader` artifact role. Read this shared owner once at session start,
then read the generated entrypoint selected by the project lock.

## First authoritative source

The first authoritative source is the committed shared source selected by the
project's `SHARED_RULES.lock.yml`. Resolve the requested ref once to a commit
and tree, confirm the worktree and writer preconditions, and read all rules
from blobs at that pinned commit. Moving refs and dirty files are never rule
inputs. The lock's repository, version, commit, tree, manifest, and source
blob identities are authoritative together; an identity mismatch is
`BLOCKED`.

## Precedence

Precedence is finite and downward only:

```text
global -> project -> task
```

The exact layer IDs are `global`, `project`, and `task`. `GLOBAL`, `PROJECT`,
and `TASK` are display labels; `SHARED` is descriptive prose only. A lower
layer may use only an explicit `reference`, `strengthen`, or `specialize`
relation. It may not copy, weaken, shadow, alias, or silently override an
upper constraint. A constraint has exactly one canonical owner.

Canonical owners are the root `AGENTS.md`, the six files under `core/`, the
project templates materialized under `docs/ai/`, and the bounded active TASK
body described by `core/ARTIFACTS.md`. Artifact files, state views, handoffs,
reports, locks, loaders, and generated views never become normative owners.

## Read order

1. Read this file once.
2. Read `core/START.md` once as the generated entrypoint compatibility
   document, if it is present in a source checkout.
3. Resolve the project lock and read `PROJECT_RULES`, `WORKFLOW`, and
   `PROJECT_ADAPTER` from the pinned project commit.
4. Read the active TASK frontmatter and body only after immutable source and
   evidence validation succeeds.

The project adapter supplies only the bounded project variation, restrictions,
extensions, and relation carriers declared by `POLICY`; project procedure is
owned by `WORKFLOW`. The adapter cannot add a layer, owner, route, purpose, or
constraint class. The source `POLICY` file supplies the closed finite machine
contract and shared display values. Human-readable behavior is owned by
`core/OUTPUT.md`; execution and evidence boundaries are owned by
`core/EXECUTION.md`.

## Generated-file protection

`SHARED_RULES.lock.yml`, `NEXT_ACTION.yml`, `board/PROGRESS.html`, session
entrypoints, handoffs, reports, and relay bundles are artifact or STATE
outputs. They are generated or transactionally imported from their canonical
owners. Do not edit a generated view to change a rule, and do not infer a
normative rule from free-form prose in an artifact.

## Safety boundary

One writer integrates committed candidates. Preserve user-owned changes and
stop before mutation when authority, evidence, ownership, or identity is
missing or unknown. `DESIGN_SELF_CHECK`, `BUILD_SELF_CHECK`,
`AUTHORITATIVE_VERIFY`, and `RELEASE_GATE` are distinct decisions. A
self-check cannot satisfy an authoritative verify or release gate. Shared
release is separate from downstream migration and no downstream repository
is changed by this source.
