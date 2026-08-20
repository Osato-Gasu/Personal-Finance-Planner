# Managed shared-governance loader

This file is installed at the downstream project root as the
`managed_loader` artifact. It is not a project rule owner and must not be
edited to add product, workflow, or task rules.

```yaml
shared_source:
  repository: <owner/repository>
  version: 1.0.1
  commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
  tree: 366ed1ed65cf9481b37759a9caf9a1aac38e97f2
  manifest_sha256: B85F3B6730FB242C81359DB25BA498259DA52C961F8259682862E5C0246D9114
lock_file: docs/ai/SHARED_RULES.lock.yml
entrypoint: docs/ai/generated/shared/core/START.md
```

At session start, read this loader once, resolve the lock's requested ref once,
and read the shared source only from the pinned commit/tree/blob identities.
Read the generated entrypoint once, then the project adapter, current state,
next-action route, and handoff identity. Validate immutable evidence before
classification or dispatch. Dirty content, moving refs, mismatched identity,
missing evidence, and unknown values are `BLOCKED`.

Precedence is the fixed hierarchy `global -> project -> task`. The project
rules, workflow, and adapter are materialized at their canonical paths and may
only use closed declarations. Handoffs, reports, locks, generated views, and
TASK frontmatter are artifact or STATE inputs; none is a normative owner.
