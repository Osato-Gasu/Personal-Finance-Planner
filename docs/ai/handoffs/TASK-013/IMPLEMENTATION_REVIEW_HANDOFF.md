# TASK-013 Recovery Phase A semantic-review handoff

This file is a `handoff_payload`. It carries the next assignment and does not
own lifecycle state or normative rules.

## Identity

- artifact_role: `handoff_payload`
- task_id: `TASK-013`
- feature: `shared v1.0.1 blocker recovery`
- phase: `implementation`
- status: `PHASE_A_SEMANTIC_REVIEW_PENDING`
- actor: `ChatGPT`
- role: `ORCHESTRATOR_AND_REVIEWER`
- model: `5.6 Sol`
- effort: `high`
- repository: `Osato-Gasu/Personal-Finance-Planner`
- branch: `codex/task-013-public-audit-stable-id`
- baseline_commit: `d96ebe1bcfe258185956fd0db3acf1ca15050af6`
- baseline_tree: `90f97b3e16aa3d0ce36cd872d1b59b9b8d49908a`
- candidate_commit: `1285f6745062545bb4e73a937cde141f6ab620d4`
- candidate_tree: `3fb36efc2fd13b9321baf11a63e798d54fe48a12`
- shared_candidate: `f07571d3e8745b9a49a28b1ac77e211c210146a3`
- target_shared_candidate: `4aa53fbe67edcbe2d7b6a147144b7b07022e5951`
- canonical_candidate_field: `active TASK candidate_commit/candidate_tree`
- product_identity: `docs/ai/PRODUCT_IDENTITIES.yml#delivery_plan_*`
- spec_revision: `3`
- recovery_design_revision: `4`

## Assignment / result

- assignment_id: `CHATGPT_MANAGED_AGENTS_SEMANTIC_REVIEW_OF_EXACT_COMMIT_A`
- purpose: Review the exact externally supplied Commit A/tree and its byte-complete old-AGENTS classification; approve only if all project-owned normative meaning is preserved in canonical destinations.
- scope: Exact Commit A changed paths, old AGENTS raw bytes/blob/SHA, every classification range, rendered managed-loader identity, migrated PROJECT_RULES/WORKFLOW destinations, and recovery provenance evidence.
- out_of_scope: Shared sync, source or product changes, Commit B, VERIFY, push, C0/C1/C2/C3, relay import, release, and completion.
- acceptance_criteria: Every old AGENTS byte is classified once; destination anchors occur exactly once; project product authority is retained; global loader prose is replaced only by the exact shared v1.0.1 managed template; evidence binds the exact Commit A lineage.
- forbidden_changes: Do not mutate the repository, approve a different commit/tree, reuse the old APPROVED relay, or authorize shared sync without an exact baseline-bound adoption plan and Phase B instruction.
- tests_and_build: Use the Phase-A evidence bundle and independently recompute all raw byte/blob/SHA/range/destination identities.
- browser_evidence: `not_applicable`
- commit_policy: Commit A remains local and unpushed; any correction is a forward descendant commit.
- stop_conditions: Identity mismatch, unclassified bytes, lost project rule, destination mismatch, source mismatch, or any required shared schema/tool modification.
- return_to: `Codex`
- relay_recipient: `Codex`
- relay_recipient_role: `IMPLEMENTER`
- result_return_to: `Codex`
- actual_executor: `ChatGPT`
- provider_substitution: `none`
- independent_review_kind: `managed_adoption_semantic_review`
- review_role: `ORCHESTRATOR_AND_REVIEWER`
- execution_mode: `separate_session`
- repository_access: `portable_exact_bundle`
- review_status: `not_started`
- request_review_status: `pending_commit_a_identity`
- review_model: `5.6 Sol`
- review_effort: `high`
- reviewed_candidate: `none`
- reviewed_spec_revision: `3`
- review_request_id: `none`
- review_started_at: `none`
- review_completed_at: `none`
- review_result: `none`
- review_findings_count: `0`
- review_finding_ids: `none`
- review_stage: `managed_adoption`
- changes_requested_cycles: `0`
- implementation_review_attempt: `1`
- implementation_review_profile: `standard`
- implementation_review_terminated: `false`
- user_confirmation_required: `false`
- user_confirmation_prompt: `none`
- review_termination_reason: `none`
- relay_schema: `none`
- canonical_relay_bundle: `none`

## Required changes

None are accepted at handoff creation. If semantic review does not approve the
exact Commit A evidence, return findings without writing or syncing.

## Evidence boundary

The exact Commit A commit/tree cannot self-reference from inside Commit A and
is supplied in the external semantic-review bundle after local commit. The
repository classification artifact is a Phase-A proposal bound to the old
AGENTS baseline bytes; the semantic reviewer must issue exact Commit-A-bound
managed-adoption evidence for Phase B. Original product review bytes and the
old relay remain immutable historical evidence, never current review coverage
for the recovery candidate.
