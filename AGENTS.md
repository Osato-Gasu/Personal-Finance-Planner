# Project bootstrap

1. Load the exact Shared commit selected by `docs/ai/SHARED_RULES.lock.yml`.
2. Read Shared `AGENTS.md`.
3. Read `docs/ai/PROJECT.md` when present.
4. During migration, if `PROJECT.md` is absent, read legacy
   `PROJECT_RULES.md` + `WORKFLOW.md`.
5. Read `PROJECT_ADAPTER.psd1` only when exact commands / paths are needed.
6. Read only the TASK explicitly assigned to the session.
7. Do not infer active TASK state from generated view files.
