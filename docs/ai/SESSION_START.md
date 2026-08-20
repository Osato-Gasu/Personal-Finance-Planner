# Session start entrypoint

This file is the `generated_entrypoint` artifact. It is generated from the
shared loader and project lock and does not own rules or current state.

```text
artifact_role: generated_entrypoint
repository: <absolute repository path>
repository_name: <owner/repository>
entrypoint: AGENTS.md
actor: <ChatGPT | Codex | Claude>
role: <role ID>
session_mode: <existing_session | separate_session>
routing_mode: <local_script | connector_read_only>
lock_file: docs/ai/SHARED_RULES.lock.yml
```

Read the root `AGENTS.md` once. Resolve the lock once to a commit/tree and
silently read the project adapter, current state, next-action route, and
handoff identity from that commit. Validate all immutable evidence before
classification. Record execution timestamps in report/handoff artifacts, not
normal chat. A mismatch or unknown evidence is `BLOCKED`; this entrypoint
cannot authorize a write, release, or downstream migration.
