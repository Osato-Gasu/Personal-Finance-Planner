# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Artifacts and state

This file is the canonical `global` / `ARTIFACTS` owner. Artifact roles and
STATE roles are classifications outside the normative layer hierarchy. Each
artifact or mutable value has one role and one owner; an artifact cannot gain
normative ownership through free-form prose.

## Normative owners

The canonical owner kinds are exactly:

| Layer | Owner kinds |
| --- | --- |
| `global` | `GLOBAL_AGENTS`, `POLICY`, `CONSTITUTION`, `OUTPUT`, `LIFECYCLE`, `ARTIFACTS`, `EXECUTION` |
| `project` | `PROJECT_RULES`, `WORKFLOW`, `PROJECT_ADAPTER` |
| `task` | `TASK_BODY` |

`GLOBAL`, `PROJECT`, and `TASK` are display labels only. `SHARED` is not a
layer ID or alias. The one-time legacy migration is the exact `LegacyIdMap`
in `core/POLICY.psd1`; unknown, repeated, duplicate-destination, or retained
legacy aliases fail. The mapping is not a permanent compatibility registry.

## Artifact roles

The exact ordered artifact roles are:

```text
managed_loader
identity_lock
product_identity
handoff_payload
report_evidence
review_request
review_result
disposition_audit
generated_next_action
generated_progress
generated_entrypoint
```

Their canonical meanings are:

- `managed_loader`: downstream root `AGENTS.md` installation payload;
- `identity_lock`: `SHARED_RULES.lock.yml` pinned source identity;
- `product_identity`: the project-owned product identity source;
- `handoff_payload`: assignment and return handoff;
- `report_evidence`: observed command, test, browser, and result evidence;
- `review_request`, `review_result`, `disposition_audit`: immutable review
  request/result/finding disposition evidence;
- `generated_next_action`, `generated_progress`,
  `generated_entrypoint`: derived router, human view, and session entrypoint.

None of these roles owns a rule. In particular, a lock, handoff, report,
loader, generated file, or review artifact cannot introduce a rule outside the
closed declaration syntax and its allowed placement.

## STATE roles

The exact STATE roles are:

```text
active_task_frontmatter
current_state_index
derived_next_action
derived_progress
```

`active_task_frontmatter` is the sole mutable lifecycle owner. `CURRENT_STATE`
is an index of current task identity and accepted baseline; `NEXT_ACTION` and
progress are derived views. Immutable requests, results, and audits are
evidence, not mutable STATE.

## TASK_BODY

The only TASK normative owner is `TASK_BODY`. Its exact section IDs are:

```text
objective
scope
out_of_scope
requirements
accepted_required_changes
acceptance_criteria
required_tests_evidence
user_approved_conditions_exceptions
rule_relations
```

Current baseline, candidate, phase, route, risk, model, worker, VERIFY,
review, and progress values belong only to frontmatter. Body rationale may
refer to a frontmatter key but cannot restate its current value. A TASK
relation block is placed only after `rule_relations`; frontmatter never carries
a declaration block.

## Canonical owner map

| Owner | Canonical path | Sole responsibility |
| --- | --- | --- |
| `GLOBAL_AGENTS` | root `AGENTS.md` | bootstrap, source precedence, generated protection |
| `POLICY` | `core/POLICY.psd1` | finite enums, schemas, tables, output grammar |
| `CONSTITUTION` | `core/CONSTITUTION.md` | authority, actors, writer and safety principles |
| `OUTPUT` | `core/OUTPUT.md` | human-readable output behavior |
| `LIFECYCLE` | `core/LIFECYCLE.md` | phases, state, review convergence, routing |
| `ARTIFACTS` | `core/ARTIFACTS.md` | roles, STATE, TASK body ownership |
| `EXECUTION` | `core/EXECUTION.md` | Git, build, workers, verify, tests, rollback |
| `PROJECT_RULES` | materialized `docs/ai/PROJECT_RULES.md` | permanent project safety/product rules |
| `WORKFLOW` | materialized `docs/ai/WORKFLOW.md` | project procedure |
| `PROJECT_ADAPTER` | materialized `docs/ai/PROJECT_ADAPTER.psd1` | bounded machine variation and relations |
| `TASK_BODY` | active `docs/ai/tasks/TASK-*.md` body | bounded task requirements |

Templates describe materialization shape; they do not create another owner.
