# GENERATED FILE: DO NOT EDIT.
# source version: 1.0.1
# source commit: 4aa53fbe67edcbe2d7b6a147144b7b07022e5951
# 直接編集禁止

# Report evidence

This file is the `report_evidence` artifact. It records observed evidence for
an exact candidate and does not own rules or mutable lifecycle state. Keep
immutable review results and finding dispositions in their dedicated artifact
roles.

- artifact_role: `report_evidence`
- task_id:
- feature:
- phase:
- status:
- baseline_commit:
- candidate_commit:
- candidate_tree:
- changed_files:
- source_version:
- source_manifest_sha256:
- source_manifest_bytes:
- source_match:
- tests_passed:
- tests_failed:
- build_result:
- browser_evidence:
- network:
- unresolved:
- risks:
- worktree:
- branch:
- actual_executor:
- execution_started_at: `YYYY-MM-DD HH:mm:ss JST`
- execution_finished_at: `YYYY-MM-DD HH:mm:ss JST`

## Review evidence

- independent_review_kind:
- review_role:
- execution_mode:
- repository_access:
- review_status:
- request_review_status:
- review_model:
- review_effort:
- reviewed_candidate:
- reviewed_spec_revision:
- review_request_id:
- review_started_at:
- review_completed_at:
- review_result:
- review_findings_count:
- review_finding_ids:
- review_stage:
- changes_requested_cycles:
- implementation_review_attempt:
- implementation_review_profile:
- implementation_review_terminated:
- user_confirmation_required: `true | false`
- user_confirmation_prompt:
- review_termination_reason:

## Relay evidence

- repository_write_access: `available | unavailable | not_applicable`
- write_probe_method:
- user_relay_required: `true | false`
- relay_bundle_name:
- relay_bundle_sha256:
- relay_bundle_bytes:
- relay_bundle_format:
- relay_identity_verified: `true | false | not_applicable`
- relay_import_result:
- relay_recipient:
- relay_recipient_role:
- result_return_to:
- canonical_relay_bundle:
- routing_mode: `local_script | connector_read_only | legacy_unspecified`
- requested_ref:
- resolved_commit:
- next_action_blob:
- handoff_blob:
- adapter_blob:
- accepted_findings:
- finding_dispositions:
- relay_semantic_round_trip: `verified | failed | not_applicable`
- relay_transaction_rollback: `verified | failed | not_applicable`
