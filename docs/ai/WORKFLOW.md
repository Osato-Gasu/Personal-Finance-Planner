# Project workflow overlay

1. Start from `AGENTS.md` and the generated shared `START.md` entrypoint.
2. Use `docs/product/` as the product requirements and design source of truth.
3. Define one active TASK at a time from the permanent requirements handoff.
4. Pin baseline, candidate, shared candidate, actor, role, model, and effort in each active handoff.
5. Run shared snapshot check, project validation, generated artifact checks, and TASK-specific tests before transition.
6. Apply the three-attempt implementation review policy in `PROJECT_RULES.md`.
7. On completion, remove inactive TASK/handoff/report artifacts under the `git_only` policy and route zero-active state to permanent requirements.

TASK-001 must not create product code, package metadata, tests, or rule data.
