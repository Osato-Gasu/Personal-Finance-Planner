# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Constitution

This file is the canonical `global` / `CONSTITUTION` owner. It defines
authority, actors, writer boundaries, and non-relaxable safety principles. It
does not define finite schemas (see `POLICY`), output text (see `OUTPUT`),
lifecycle state (see `LIFECYCLE`), artifact roles (see `ARTIFACTS`), or
execution procedure (see `EXECUTION`).

## Authority and actors

The user is the authority for authentication, host actions, product safety
decisions, and explicit scope exceptions. `ChatGPT|ORCHESTRATOR_AND_REVIEWER`
owns requirements/design decisions, routing, formal review dispositions, and
the next-task decision. `Codex|IMPLEMENTER` owns bounded investigation,
implementation, tests, candidate commits, and return reports. A separate
`INDEPENDENT_REVIEWER` is read-only and returns findings to the orchestrator;
it never becomes the implementation writer. `NONE` means no active TASK.

Assignment IDs and route purposes are machine-owned by `POLICY`; actor names
in this document do not create an alternate assignment mapping.

## Single writer and ownership

There is one integration writer for a candidate. Every candidate is committed
before review or verification. A worker may prepare an independently
committable bounded scope, but cannot integrate another scope, replace the
writer, or act as authoritative verifier for its own candidate. User-owned
working-tree changes are preserved and never silently staged, overwritten,
discarded, or normalized.

One normative constraint has one canonical owner. Lower layers can only use a
closed declaration with `reference`, `strengthen`, or `specialize`; no copied
or paraphrased shadow is an owner. Artifact and STATE roles are not layers and
cannot become owners by containing prose. Unknown, missing, duplicated, or
conflicting identity is a stop condition, not an implicit default.

## Non-relaxable principles

- Resolve immutable commit/tree/blob identity before classification or plan
  selection; moving refs and dirty content are not authority.
- Validate all essential evidence and unknown values before choosing a risk
  class or route.
- Preserve data, calculation and decision accuracy, security, rollback,
  raw-byte portability, required tests, compatibility, and release gates.
- Keep design/build self-checks separate from read-only
  `AUTHORITATIVE_VERIFY` and from `RELEASE_GATE`.
- A verify `FAIL` requires a new candidate identity; `BLOCKED` forbids
  release. No self-check can satisfy a required verify.
- Shared release is separate from downstream adoption or migration. This
  source never authorizes downstream repository changes or synchronization.
- A review cannot silently widen an active TASK. After the bounded review
  attempts are exhausted, route to the user; do not create a fourth attempt.

## Stop conditions

Stop before mutation for dirty or user-owned changes, unfinished Git
operations, writer conflict, unresolved authority, unknown evidence,
identity mismatch, invalid project constraints, missing required tool/runtime,
or an unavailable safety gate. Record the blocker and resume condition for
the orchestrator. Do not invent a temporary execution rule to proceed.
