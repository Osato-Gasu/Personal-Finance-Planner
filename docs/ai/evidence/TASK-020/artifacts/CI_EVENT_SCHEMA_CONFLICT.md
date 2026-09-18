# SPEC-020-CI-EVENT-ENVELOPE — read-only reproduction

Released Shared identity: `Osato-Gasu/shared`, version `2.0.6`, commit
`e384d21a43fcda1195556d4ef6fa382bede48da8`.

`core/EVIDENCE.md`, Formal CI event, explicitly restricts the durable
completed-run event to six required payload fields plus optional runner kind:
candidate_sha, ci_mode, workflow, run_id, head_sha, conclusion, runner_kind.
Its example has neither event_id nor type.

The same released commit's `tools/orchestration.ps1`,
`Get-OrchestrationEventCandidates` (lines 534 onward), rejects every nonempty
EVENTS.jsonl record lacking event_id or type before selecting transitions.
`Invoke-OrchestrationPublish` invokes that parser before its pointer CAS;
normal resume also depends on parsing the history.

Main passed an in-memory synthetic, seven-field example to that exact unchanged
released function. The SHA was forty `a` characters, run_id was `fixture-only`,
and conclusion `success` was synthetic: none represents an actual CI result.

```text
orchestration event lacks event_id/type: read-only EVIDENCE minimal-event reproduction:1
fixture_only=true; remote_writes=0
```

Thus appending the owner's literal minimal example would break subsequent
orchestration; adding event_id/type would violate its explicit "contains only"
restriction. Project implementation authority does not include changing the
Shared owner or bypassing the released parser. No incompatible completed-CI
record was appended, no actual failure was converted to PASS, and no Shared
source was changed. Platform run links/raw results remain available while
normative completed-run history emission awaits GPT disposition.

Requested disposition: reconcile the minimum payload with the universal event
envelope, or release a compatible parser under Shared authority. Preserve the
exact tested Project source candidate and real run identities; do not repeat
unaffected implementation or tests merely for schema symmetry.
