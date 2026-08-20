# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Generated entrypoint compatibility note

`START.md` is the `generated_entrypoint` artifact. It is retained as a stable
materialization path for existing loaders and does not own governance rules.
The canonical bootstrap and precedence contract is the root `AGENTS.md`;
finite machine policy is `core/POLICY.psd1`; actor, output, lifecycle,
artifact, and execution responsibilities are respectively in
`core/CONSTITUTION.md`, `core/OUTPUT.md`, `core/LIFECYCLE.md`,
`core/ARTIFACTS.md`, and `core/EXECUTION.md`.

At session start, read the root loader once, resolve the project lock to one
immutable commit/tree, silently read the project adapter, current state,
next-action route, and handoff identity, then validate evidence before
classification. This generated entrypoint never carries frontmatter,
normative declarations, current route values, or temporary execution policy.
