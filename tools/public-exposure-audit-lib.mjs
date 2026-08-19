import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, parse, relative, resolve, sep } from "node:path";

export const PUBLIC_AUDIT_SCHEMA_VERSION = 2;
export const PUBLIC_AUDIT_ACTIONS_TOPOLOGY_VERSION =
  "exact-auditor-self-exclusion-v1";
export const PUBLIC_AUDIT_REQUIRED_SCANS = Object.freeze([
  "reachable_commits",
  "commit_objects",
  "reachable_trees",
  "reachable_blobs",
  "tree_entries",
  "historical_path_associations",
  "refs",
  "tags",
  "lfs_pointers",
  "submodules",
  "working_tree",
  "staged_bytes",
  "actions_run_logs",
  "actions_artifacts",
  "release_staging",
]);
export const PUBLIC_AUDIT_SCAN_METHOD =
  "git-rev-list-all+cat-file-commit+ls-tree-rz-v1";
export const PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES = Object.freeze([
  "ref_set_sha256",
  "reachable_commit_set_sha256",
  "reachable_tree_set_sha256",
  "reachable_blob_set_sha256",
  "commit_path_blob_associations_sha256",
  "actions_run_set_sha256",
  "actions_job_set_sha256",
  "actions_artifact_set_sha256",
  "actions_run_record_set_sha256",
  "actions_job_record_set_sha256",
  "actions_artifact_record_set_sha256",
  "actions_historical_unavailable_set_sha256",
  "actions_historical_runtime_observation_set_sha256",
  "actions_auditor_self_excluded_run_set_sha256",
  "actions_auditor_self_excluded_job_set_sha256",
  "actions_auditee_run_set_sha256",
  "actions_auditee_job_set_sha256",
]);
export const PUBLIC_AUDIT_ACTIONS_INVENTORY_IDENTITY_VERSION = "stable-id-v1";
export const PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS = Object.freeze([
  "actions_run_inventory_count",
  "actions_job_inventory_count",
  "actions_required_job_log_count",
  "actions_job_log_retrieval_count",
  "actions_job_log_scan_count",
  "actions_artifact_inventory_count",
  "actions_artifact_retrieval_count",
  "actions_artifact_scan_count",
  "actions_historical_unavailable_count",
  "actions_historical_runtime_observation_count",
  "actions_auditor_self_excluded_run_count",
  "actions_auditor_self_excluded_job_count",
  "actions_auditee_run_count",
  "actions_auditee_job_count",
]);
export const PUBLIC_AUDIT_CATEGORIES = Object.freeze([
  "high_confidence_credential",
  "github_oauth_cloud_token",
  "private_key",
  "password_secret_assignment",
  "database_connection_credential",
  "live_session_cookie_secret",
  "pii",
  "bank_card_account_identity",
  "private_financial_export",
  "unintended_user_owned_file",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

export const PUBLIC_AUDIT_EMPTY_SET_SHA256 = sha256(Buffer.alloc(0));
export const ACTIONS_HISTORICAL_POLICY_ID = "task-013-spec-rev2-exact-v1";

export const ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD = Object.freeze({
  policy_id: ACTIONS_HISTORICAL_POLICY_ID,
  repository: "Osato-Gasu/Personal-Finance-Planner",
  run_id: "31887544173",
  run_attempt: "1",
  job_id: "95018938492",
  run_head_sha: "25be0b48699ef350bd72a60e3b564b7dd8c1d2a4",
  job_status: "completed",
  job_conclusion: "failure",
  direct_log_initial_status: "302",
  direct_log_final_status: "404",
  direct_log_final_content_type: "application/xml",
  direct_log_response_sha256:
    "1CCCE68DDD68C8BD055419F893169F9C311D4F242CC957F9DC9F2CB1447C9C21",
  direct_log_response_bytes: "215",
  attempt_jobs_status: "200",
  attempt_jobs_response_sha256:
    "F4AEBF5D31E457DF360008FB0384B104524D98B9859390A2D668F38BBB0ABABE",
  attempt_jobs_response_bytes: "952",
  attempt_jobs_total_count: "1",
  attempt_jobs_length: "1",
  attempt_jobs_sole_job_id: "95018938492",
  attempt_archive_initial_status: "302",
  attempt_archive_final_status: "200",
  attempt_archive_content_type: "application/zip",
  attempt_archive_sha256:
    "8739C76E681F900923B900C9DF0EF75CF421D39CABB54650C4B9AD19B6A76D85",
  attempt_archive_bytes: "22",
  attempt_archive_zip_entries: "0",
  attempt_archive_regular_entry_count: "0",
});

export const ACTIONS_HISTORICAL_STATIC_FIELDS = Object.freeze([
  "policy_id",
  "repository",
  "run_id",
  "run_attempt",
  "job_id",
  "run_head_sha",
  "job_status",
  "job_conclusion",
  "direct_log_initial_status",
  "direct_log_final_status",
  "direct_log_final_content_type",
  "direct_log_response_sha256",
  "direct_log_response_bytes",
  "attempt_jobs_status",
  "attempt_jobs_response_sha256",
  "attempt_jobs_response_bytes",
  "attempt_jobs_total_count",
  "attempt_jobs_length",
  "attempt_jobs_sole_job_id",
  "attempt_archive_initial_status",
  "attempt_archive_final_status",
  "attempt_archive_content_type",
  "attempt_archive_sha256",
  "attempt_archive_bytes",
  "attempt_archive_zip_entries",
  "attempt_archive_regular_entry_count",
]);

export const ACTIONS_HISTORICAL_RUNTIME_FIELDS = Object.freeze([
  "policy_id",
  "repository",
  "run_id",
  "run_attempt",
  "job_id",
  "run_head_sha",
  "runtime_observation_performed",
  "observed_direct_log_initial_status",
  "observed_direct_log_final_status",
  "observed_direct_log_final_content_type",
  "observed_direct_log_error_code",
  "observed_direct_log_response_sha256",
  "observed_direct_log_response_bytes",
]);

const HISTORICAL_UNSIGNED_FIELDS = new Set([
  "run_id",
  "run_attempt",
  "job_id",
  "direct_log_initial_status",
  "direct_log_final_status",
  "direct_log_response_bytes",
  "attempt_jobs_status",
  "attempt_jobs_response_bytes",
  "attempt_jobs_total_count",
  "attempt_jobs_length",
  "attempt_jobs_sole_job_id",
  "attempt_archive_initial_status",
  "attempt_archive_final_status",
  "attempt_archive_bytes",
  "attempt_archive_zip_entries",
  "attempt_archive_regular_entry_count",
  "observed_direct_log_initial_status",
  "observed_direct_log_final_status",
  "observed_direct_log_response_bytes",
]);
const HISTORICAL_SHA256_FIELDS = new Set([
  "direct_log_response_sha256",
  "attempt_jobs_response_sha256",
  "attempt_archive_sha256",
  "observed_direct_log_response_sha256",
]);
const HISTORICAL_BOOLEAN_FIELDS = new Set(["runtime_observation_performed"]);
const HISTORICAL_MIME_FIELDS = new Set([
  "direct_log_final_content_type",
  "attempt_archive_content_type",
  "observed_direct_log_final_content_type",
]);

function canonicalHistoricalValue(name, value, label) {
  if (HISTORICAL_UNSIGNED_FIELDS.has(name)) {
    const text = typeof value === "number" ? String(value) : value;
    if (
      typeof text !== "string" ||
      !/^(?:0|[1-9][0-9]*)$/u.test(text) ||
      (typeof value === "number" && !Number.isSafeInteger(value))
    )
      throw new Error(`invalid ${label} canonical integer: ${name}`);
    return text;
  }
  if (HISTORICAL_SHA256_FIELDS.has(name)) {
    if (typeof value !== "string" || !/^[0-9A-F]{64}$/u.test(value))
      throw new Error(`invalid ${label} canonical SHA-256: ${name}`);
    return value;
  }
  if (HISTORICAL_BOOLEAN_FIELDS.has(name)) {
    if (typeof value !== "boolean")
      throw new Error(`invalid ${label} canonical boolean: ${name}`);
    return value ? "true" : "false";
  }
  if (HISTORICAL_MIME_FIELDS.has(name)) {
    if (
      typeof value !== "string" ||
      !/^[a-z0-9][a-z0-9!#$&^_.+\x2F-]*$/u.test(value)
    )
      throw new Error(`invalid ${label} canonical MIME: ${name}`);
    return value;
  }
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    /[^\x20-\x7E]/u.test(value) ||
    /[\r\n]/u.test(value)
  )
    throw new Error(`invalid ${label} canonical string: ${name}`);
  return value;
}

export function serializeActionsHistoricalRecord(record, kind) {
  const fields =
    kind === "static"
      ? ACTIONS_HISTORICAL_STATIC_FIELDS
      : kind === "runtime"
        ? ACTIONS_HISTORICAL_RUNTIME_FIELDS
        : null;
  if (!fields || !record || typeof record !== "object" || Array.isArray(record))
    throw new Error(`invalid Actions historical ${String(kind)} record`);
  const keys = Object.keys(record);
  if (
    keys.length !== fields.length ||
    fields.some((field, index) => keys[index] !== field)
  )
    throw new Error(`invalid Actions historical ${kind} record schema`);
  const text = fields
    .map(
      (field) =>
        `${field}=${canonicalHistoricalValue(field, record[field], `${kind} record`)}`,
    )
    .join("\n");
  return Buffer.from(`${text}\n`, "utf8");
}

function historicalRecordSort(left, right) {
  const repository = Buffer.from(left.repository, "utf8").compare(
    Buffer.from(right.repository, "utf8"),
  );
  if (repository !== 0) return repository;
  for (const name of ["run_id", "run_attempt", "job_id"]) {
    const difference = BigInt(left[name]) - BigInt(right[name]);
    if (difference < 0n) return -1;
    if (difference > 0n) return 1;
  }
  return 0;
}

export function actionsHistoricalSetSha256(records, kind) {
  if (!Array.isArray(records))
    throw new Error(`invalid Actions historical ${kind} set`);
  const sorted = [...records].sort(historicalRecordSort);
  return sha256(
    Buffer.concat(
      sorted.map((record) => serializeActionsHistoricalRecord(record, kind)),
    ),
  );
}

function exactApprovedStaticRecord(record) {
  return ACTIONS_HISTORICAL_STATIC_FIELDS.every(
    (field) =>
      record[field] === ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD[field],
  );
}

function exactRuntimeIdentity(record) {
  const approved = ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD;
  return (
    record.policy_id === approved.policy_id &&
    record.repository === approved.repository &&
    record.run_id === approved.run_id &&
    record.run_attempt === approved.run_attempt &&
    record.job_id === approved.job_id &&
    record.run_head_sha === approved.run_head_sha
  );
}

export function buildActionsHistoricalEvidence(runtimeObservation = null) {
  const staticRecords = runtimeObservation
    ? [{ ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD }]
    : [];
  const runtimeRecords = runtimeObservation ? [{ ...runtimeObservation }] : [];
  if (runtimeObservation) {
    serializeActionsHistoricalRecord(runtimeObservation, "runtime");
    if (
      !exactRuntimeIdentity(runtimeObservation) ||
      runtimeObservation.runtime_observation_performed !== true ||
      runtimeObservation.observed_direct_log_initial_status !== "302" ||
      runtimeObservation.observed_direct_log_final_status !== "404" ||
      runtimeObservation.observed_direct_log_final_content_type !==
        "application/xml" ||
      runtimeObservation.observed_direct_log_error_code !== "BlobNotFound" ||
      BigInt(runtimeObservation.observed_direct_log_response_bytes) <= 0n
    )
      throw new Error("BLOCKED: invalid historical runtime observation");
  }
  return {
    actions_historical_unavailable_count: staticRecords.length,
    actions_historical_unavailable_set_sha256: actionsHistoricalSetSha256(
      staticRecords,
      "static",
    ),
    actions_historical_unavailable_policy: runtimeObservation
      ? ACTIONS_HISTORICAL_POLICY_ID
      : "none",
    actions_historical_unavailable_records: staticRecords,
    actions_historical_runtime_observation_count: runtimeRecords.length,
    actions_historical_runtime_observation_set_sha256:
      actionsHistoricalSetSha256(runtimeRecords, "runtime"),
    actions_historical_runtime_observations: runtimeRecords,
    actions_scan_complete: !runtimeObservation,
    actions_evidence_gate_pass: true,
  };
}

export function validateActionsHistoricalEvidence(provenance) {
  const errors = [];
  if (
    !provenance ||
    typeof provenance !== "object" ||
    Array.isArray(provenance)
  )
    return ["public audit Actions historical proof is missing"];
  if (Object.hasOwn(provenance, "historical_unavailable_count"))
    errors.push(
      "public audit legacy historical unavailable alias is forbidden",
    );
  const staticCount = provenance.actions_historical_unavailable_count;
  const runtimeCount = provenance.actions_historical_runtime_observation_count;
  const staticRecords = provenance.actions_historical_unavailable_records;
  const runtimeRecords = provenance.actions_historical_runtime_observations;
  if (!Number.isSafeInteger(staticCount) || staticCount < 0)
    errors.push("public audit historical unavailable count is invalid");
  if (!Number.isSafeInteger(runtimeCount) || runtimeCount < 0)
    errors.push("public audit historical runtime observation count is invalid");
  if (!Array.isArray(staticRecords))
    errors.push("public audit historical unavailable records are missing");
  if (!Array.isArray(runtimeRecords))
    errors.push("public audit historical runtime observations are missing");
  if (Array.isArray(staticRecords) && staticRecords.length !== staticCount)
    errors.push("public audit historical unavailable record count mismatch");
  if (Array.isArray(runtimeRecords) && runtimeRecords.length !== runtimeCount)
    errors.push("public audit historical runtime record count mismatch");
  if (staticCount !== runtimeCount)
    errors.push("public audit historical runtime observation count mismatch");
  if (staticCount > 1)
    errors.push("public audit historical unavailable count exceeds policy");
  try {
    if (
      Array.isArray(staticRecords) &&
      provenance.actions_historical_unavailable_set_sha256 !==
        actionsHistoricalSetSha256(staticRecords, "static")
    )
      errors.push("public audit historical unavailable set hash mismatch");
  } catch {
    errors.push("public audit historical unavailable canonical record invalid");
  }
  try {
    if (
      Array.isArray(runtimeRecords) &&
      provenance.actions_historical_runtime_observation_set_sha256 !==
        actionsHistoricalSetSha256(runtimeRecords, "runtime")
    )
      errors.push(
        "public audit historical runtime observation set hash mismatch",
      );
  } catch {
    errors.push("public audit historical runtime canonical record invalid");
  }
  if (staticCount === 0) {
    if (provenance.actions_historical_unavailable_policy !== "none")
      errors.push("public audit historical unavailable policy mismatch");
    if (
      provenance.actions_scan_complete !==
      (provenance.actions_auditor_self_excluded_run_count === 0)
    )
      errors.push("public audit Actions scan completeness mismatch");
  } else if (staticCount === 1) {
    if (
      provenance.actions_historical_unavailable_policy !==
      ACTIONS_HISTORICAL_POLICY_ID
    )
      errors.push("public audit historical unavailable policy mismatch");
    if (
      !Array.isArray(staticRecords) ||
      !exactApprovedStaticRecord(staticRecords[0])
    )
      errors.push("public audit approved historical policy record mismatch");
    const runtime = Array.isArray(runtimeRecords) ? runtimeRecords[0] : null;
    if (
      !runtime ||
      !exactRuntimeIdentity(runtime) ||
      runtime.runtime_observation_performed !== true ||
      runtime.observed_direct_log_initial_status !== "302" ||
      runtime.observed_direct_log_final_status !== "404" ||
      runtime.observed_direct_log_final_content_type !== "application/xml" ||
      runtime.observed_direct_log_error_code !== "BlobNotFound" ||
      !/^[0-9A-F]{64}$/u.test(
        runtime.observed_direct_log_response_sha256 ?? "",
      ) ||
      !/^[1-9][0-9]*$/u.test(runtime.observed_direct_log_response_bytes ?? "")
    )
      errors.push("public audit historical runtime observation mismatch");
    if (provenance.actions_scan_complete !== false)
      errors.push("public audit Actions scan completeness mismatch");
  }
  if (provenance.actions_evidence_gate_pass !== true)
    errors.push("public audit Actions evidence gate did not pass");
  return errors;
}

export function validateActionsHistoricalRuntimeBytes(provenance, bytes) {
  const errors = validateActionsHistoricalEvidence(provenance);
  const records = provenance?.actions_historical_runtime_observations;
  if (!Buffer.isBuffer(bytes))
    errors.push("public audit historical runtime raw bytes are missing");
  else if (Array.isArray(records) && records.length === 1) {
    if (records[0].observed_direct_log_response_sha256 !== sha256(bytes))
      errors.push("public audit historical runtime raw SHA-256 mismatch");
    if (records[0].observed_direct_log_response_bytes !== String(bytes.length))
      errors.push("public audit historical runtime raw byte count mismatch");
  } else {
    errors.push("public audit historical runtime proof is not singular");
  }
  return { ok: errors.length === 0, errors, side_effects: 0 };
}

export function canonicalPositiveIntegerId(value, label) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    return String(value);
  if (
    typeof value === "string" &&
    /^[1-9][0-9]*$/u.test(value) &&
    BigInt(value) > 0n &&
    BigInt(value).toString() === value
  )
    return value;
  throw new Error(`BLOCKED: invalid ${label} stable ID`);
}

function canonicalMetadataScalar(value, label) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `boolean:${String(value)}`;
  if (typeof value === "number" && Number.isFinite(value))
    return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
  throw new Error(`BLOCKED: invalid ${label} metadata`);
}

export function canonicalMetadataRecord(fields, label) {
  if (!Array.isArray(fields))
    throw new Error(`BLOCKED: invalid ${label} metadata`);
  const names = new Set();
  return fields
    .map((field) => {
      if (
        !Array.isArray(field) ||
        field.length !== 2 ||
        typeof field[0] !== "string" ||
        !/^[a-z][a-z0-9_]*$/u.test(field[0]) ||
        names.has(field[0])
      )
        throw new Error(`BLOCKED: invalid ${label} metadata`);
      names.add(field[0]);
      return `${field[0]}=${canonicalMetadataScalar(field[1], label)}`;
    })
    .join("\t");
}

function hashCanonicalSet(values) {
  const sorted = [...values].sort();
  return sha256(
    sorted.length === 0
      ? Buffer.alloc(0)
      : Buffer.from(`${sorted.join("\n")}\n`, "utf8"),
  );
}

export function actionsAuditeeSetSha256(values) {
  if (
    !Array.isArray(values) ||
    values.some(
      (value) =>
        typeof value !== "string" ||
        value.length === 0 ||
        /[\r\n]/u.test(value),
    )
  )
    throw new Error("BLOCKED: invalid Actions auditee stable-ID set");
  if (new Set(values).size !== values.length)
    throw new Error("BLOCKED: duplicate Actions auditee stable ID");
  return hashCanonicalSet(values);
}

function exactRecordKeys(record, fields, label) {
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new Error(`BLOCKED: invalid ${label}`);
  const keys = Object.keys(record);
  if (
    keys.length !== fields.length ||
    fields.some((field, index) => keys[index] !== field)
  )
    throw new Error(`BLOCKED: invalid ${label} schema`);
}

function auditeeRunInventoryEntry(record) {
  const fields = ["id", "head_sha", "status", "conclusion", "run_attempt"];
  exactRecordKeys(record, fields, "auditee Actions run record");
  const id = canonicalPositiveIntegerId(record.id, "auditee Actions run");
  const runAttempt = canonicalPositiveIntegerId(
    record.run_attempt,
    "auditee Actions run attempt",
  );
  return {
    stableKey: id,
    metadataRecord: canonicalMetadataRecord(
      [
        ["id", id],
        ["head_sha", record.head_sha],
        ["status", record.status],
        ["conclusion", record.conclusion],
        ["run_attempt", runAttempt],
      ],
      "auditee Actions run",
    ),
  };
}

function auditeeJobInventoryEntry(record) {
  const fields = ["run_id", "id", "run_attempt", "status", "conclusion"];
  exactRecordKeys(record, fields, "auditee Actions job record");
  const runId = canonicalPositiveIntegerId(
    record.run_id,
    "auditee Actions job run",
  );
  const id = canonicalPositiveIntegerId(record.id, "auditee Actions job");
  const runAttempt = canonicalPositiveIntegerId(
    record.run_attempt,
    "auditee Actions job run attempt",
  );
  return {
    stableKey: `${runId}\t${id}`,
    metadataRecord: canonicalMetadataRecord(
      [
        ["run_id", runId],
        ["id", id],
        ["run_attempt", runAttempt],
        ["status", record.status],
        ["conclusion", record.conclusion],
      ],
      "auditee Actions job",
    ),
  };
}

export function buildStableInventory(entries, label) {
  if (!Array.isArray(entries))
    throw new Error(`BLOCKED: invalid ${label} inventory`);
  const seen = new Map();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.stableKey !== "string" ||
      entry.stableKey.length === 0 ||
      typeof entry.metadataRecord !== "string" ||
      entry.metadataRecord.length === 0
    )
      throw new Error(`BLOCKED: invalid ${label} inventory`);
    if (seen.has(entry.stableKey)) {
      if (seen.get(entry.stableKey) === entry.metadataRecord)
        throw new Error(`BLOCKED: duplicate ${label} stable ID`);
      throw new Error(`BLOCKED: conflicting ${label} stable ID metadata`);
    }
    seen.set(entry.stableKey, entry.metadataRecord);
  }
  return {
    count: entries.length,
    stableKeySetSha256: hashCanonicalSet(seen.keys()),
    recordSetSha256: hashCanonicalSet(seen.values()),
  };
}

const ACTIONS_AUDITOR_RUN_FIELDS = Object.freeze([
  "topology_version",
  "repository",
  "phase",
  "auditor_run_id",
  "auditor_run_attempt",
  "workflow_id",
  "workflow_path",
  "workflow_blob_sha",
  "event",
  "head_branch",
  "head_sha",
  "run_status",
  "run_conclusion",
  "auditor_job_count",
  "auditor_job_set_sha256",
]);
const ACTIONS_AUDITOR_JOB_FIELDS = Object.freeze([
  "run_id",
  "run_attempt",
  "job_id",
  "status",
  "conclusion",
]);

function canonicalTopologyString(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    /[^\x20-\x7E]/u.test(value) ||
    /[\r\n=]/u.test(value)
  )
    throw new Error(`BLOCKED: invalid ${label}`);
  return value;
}

function serializeTopologyRecord(record, fields, label) {
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new Error(`BLOCKED: invalid ${label}`);
  const keys = Object.keys(record);
  if (
    keys.length !== fields.length ||
    fields.some((field, index) => keys[index] !== field)
  )
    throw new Error(`BLOCKED: invalid ${label} schema`);
  return Buffer.from(
    `${fields
      .map(
        (field) =>
          `${field}=${canonicalTopologyString(record[field], `${label} ${field}`)}`,
      )
      .join("\n")}\n`,
    "utf8",
  );
}

export function serializeActionsAuditorRunRecord(record) {
  return serializeTopologyRecord(
    record,
    ACTIONS_AUDITOR_RUN_FIELDS,
    "Actions auditor run record",
  );
}

export function serializeActionsAuditorJobRecord(record) {
  return serializeTopologyRecord(
    record,
    ACTIONS_AUDITOR_JOB_FIELDS,
    "Actions auditor job record",
  );
}

function numericAuditorJobSort(left, right) {
  for (const field of ["run_id", "run_attempt", "job_id"]) {
    const difference = BigInt(left[field]) - BigInt(right[field]);
    if (difference < 0n) return -1;
    if (difference > 0n) return 1;
  }
  return 0;
}

export function actionsAuditorRunSetSha256(records) {
  if (!Array.isArray(records))
    throw new Error("BLOCKED: invalid Actions auditor run set");
  return sha256(
    Buffer.concat(
      records.map((record) => serializeActionsAuditorRunRecord(record)),
    ),
  );
}

export function actionsAuditorJobSetSha256(records) {
  if (!Array.isArray(records))
    throw new Error("BLOCKED: invalid Actions auditor job set");
  return sha256(
    Buffer.concat(
      [...records]
        .sort(numericAuditorJobSort)
        .map((record) => serializeActionsAuditorJobRecord(record)),
    ),
  );
}

export function buildOfflineActionsAuditTopology() {
  return {
    actions_audit_topology_version: PUBLIC_AUDIT_ACTIONS_TOPOLOGY_VERSION,
    actions_auditor_self_excluded_run_count: 0,
    actions_auditor_self_excluded_run_set_sha256: PUBLIC_AUDIT_EMPTY_SET_SHA256,
    actions_auditor_self_excluded_run_records: [],
    actions_auditor_self_excluded_job_count: 0,
    actions_auditor_self_excluded_job_set_sha256: PUBLIC_AUDIT_EMPTY_SET_SHA256,
    actions_auditor_self_excluded_job_records: [],
  };
}

function expectedAuditorWorkflow(phase) {
  if (phase === "candidate_ci")
    return { path: ".github/workflows/ci.yml", event: "push" };
  if (phase === "release_preflight")
    return {
      path: ".github/workflows/distribution.yml",
      event: "workflow_dispatch",
    };
  return null;
}

export function validateActionsAuditTopology(
  provenance,
  { repository, targetCommit, phase, requireGithubSelfExclusion = false },
) {
  const errors = [];
  if (
    provenance?.actions_audit_topology_version !==
    PUBLIC_AUDIT_ACTIONS_TOPOLOGY_VERSION
  )
    errors.push("public audit Actions topology version mismatch");
  const runCount = provenance?.actions_auditor_self_excluded_run_count;
  const jobCount = provenance?.actions_auditor_self_excluded_job_count;
  const auditeeRunCount = provenance?.actions_auditee_run_count;
  const auditeeJobCount = provenance?.actions_auditee_job_count;
  const runRecords = provenance?.actions_auditor_self_excluded_run_records;
  const jobRecords = provenance?.actions_auditor_self_excluded_job_records;
  const auditeeRunIds = provenance?.actions_auditee_run_stable_ids;
  const auditeeJobIds = provenance?.actions_auditee_job_stable_ids;
  const auditeeRunRecords = provenance?.actions_auditee_run_records;
  const auditeeJobRecords = provenance?.actions_auditee_job_records;
  if (!Array.isArray(runRecords))
    errors.push("public audit auditor run records are missing");
  if (!Array.isArray(jobRecords))
    errors.push("public audit auditor job records are missing");
  if (!Array.isArray(auditeeRunIds))
    errors.push("public audit auditee run stable IDs are missing");
  if (!Array.isArray(auditeeJobIds))
    errors.push("public audit auditee job stable IDs are missing");
  if (!Array.isArray(auditeeRunRecords))
    errors.push("public audit auditee run records are missing");
  if (!Array.isArray(auditeeJobRecords))
    errors.push("public audit auditee job records are missing");
  if (Array.isArray(runRecords) && runRecords.length !== runCount)
    errors.push("public audit auditor run record count mismatch");
  if (Array.isArray(jobRecords) && jobRecords.length !== jobCount)
    errors.push("public audit auditor job record count mismatch");
  if (Array.isArray(auditeeRunIds) && auditeeRunIds.length !== auditeeRunCount)
    errors.push("public audit auditee run stable-ID count mismatch");
  if (Array.isArray(auditeeJobIds) && auditeeJobIds.length !== auditeeJobCount)
    errors.push("public audit auditee job stable-ID count mismatch");
  if (
    Array.isArray(auditeeRunRecords) &&
    auditeeRunRecords.length !== auditeeRunCount
  )
    errors.push("public audit auditee run record count mismatch");
  if (
    Array.isArray(auditeeJobRecords) &&
    auditeeJobRecords.length !== auditeeJobCount
  )
    errors.push("public audit auditee job record count mismatch");
  try {
    if (
      Array.isArray(runRecords) &&
      provenance.actions_auditor_self_excluded_run_set_sha256 !==
        actionsAuditorRunSetSha256(runRecords)
    )
      errors.push("public audit auditor run set hash mismatch");
  } catch {
    errors.push("public audit auditor run canonical record invalid");
  }
  try {
    if (
      Array.isArray(jobRecords) &&
      provenance.actions_auditor_self_excluded_job_set_sha256 !==
        actionsAuditorJobSetSha256(jobRecords)
    )
      errors.push("public audit auditor job set hash mismatch");
  } catch {
    errors.push("public audit auditor job canonical record invalid");
  }
  try {
    if (
      Array.isArray(auditeeRunIds) &&
      provenance.actions_auditee_run_set_sha256 !==
        actionsAuditeeSetSha256(auditeeRunIds)
    )
      errors.push("public audit auditee run set hash mismatch");
  } catch {
    errors.push("public audit auditee run stable-ID set invalid");
  }
  try {
    if (
      Array.isArray(auditeeJobIds) &&
      provenance.actions_auditee_job_set_sha256 !==
        actionsAuditeeSetSha256(auditeeJobIds)
    )
      errors.push("public audit auditee job set hash mismatch");
  } catch {
    errors.push("public audit auditee job stable-ID set invalid");
  }
  if (Array.isArray(auditeeRunIds)) {
    for (const runId of auditeeRunIds) {
      try {
        canonicalPositiveIntegerId(runId, "auditee run");
      } catch {
        errors.push("public audit auditee run stable ID is non-canonical");
      }
    }
  }
  if (Array.isArray(auditeeJobIds)) {
    for (const stableId of auditeeJobIds) {
      const [runId, jobId, extra] = stableId.split("\t");
      try {
        canonicalPositiveIntegerId(runId, "auditee job run");
        canonicalPositiveIntegerId(jobId, "auditee job");
      } catch {
        errors.push("public audit auditee job stable ID is non-canonical");
      }
      if (extra !== undefined || !auditeeRunIds?.includes(runId))
        errors.push("public audit auditee job membership mismatch");
    }
  }
  let canonicalAuditeeRunEntries = null;
  let canonicalAuditeeJobEntries = null;
  try {
    if (Array.isArray(auditeeRunRecords)) {
      canonicalAuditeeRunEntries = auditeeRunRecords.map(
        auditeeRunInventoryEntry,
      );
      const inventory = buildStableInventory(
        canonicalAuditeeRunEntries,
        "proof auditee Actions run",
      );
      if (
        inventory.stableKeySetSha256 !==
        provenance.actions_auditee_run_set_sha256
      )
        errors.push("public audit auditee run record membership mismatch");
    }
  } catch {
    errors.push("public audit auditee run canonical records are invalid");
  }
  try {
    if (Array.isArray(auditeeJobRecords)) {
      canonicalAuditeeJobEntries = auditeeJobRecords.map(
        auditeeJobInventoryEntry,
      );
      if (auditeeJobRecords.some((record) => record.status !== "completed"))
        errors.push("public audit auditee job is not completed");
      const inventory = buildStableInventory(
        canonicalAuditeeJobEntries,
        "proof auditee Actions job",
      );
      if (
        inventory.stableKeySetSha256 !==
        provenance.actions_auditee_job_set_sha256
      )
        errors.push("public audit auditee job record membership mismatch");
    }
  } catch {
    errors.push("public audit auditee job canonical records are invalid");
  }
  try {
    if (
      Array.isArray(auditeeRunIds) &&
      Array.isArray(runRecords) &&
      provenance.actions_run_set_sha256 !==
        actionsAuditeeSetSha256([
          ...auditeeRunIds,
          ...runRecords.map((record) => record.auditor_run_id),
        ])
    )
      errors.push("public audit complete Actions run membership hash mismatch");
  } catch {
    errors.push("public audit complete Actions run membership is invalid");
  }
  try {
    if (
      Array.isArray(auditeeJobIds) &&
      Array.isArray(jobRecords) &&
      provenance.actions_job_set_sha256 !==
        actionsAuditeeSetSha256([
          ...auditeeJobIds,
          ...jobRecords.map((record) => `${record.run_id}\t${record.job_id}`),
        ])
    )
      errors.push("public audit complete Actions job membership hash mismatch");
  } catch {
    errors.push("public audit complete Actions job membership is invalid");
  }
  try {
    if (
      canonicalAuditeeRunEntries &&
      Array.isArray(runRecords) &&
      provenance.actions_run_record_set_sha256 !==
        buildStableInventory(
          [
            ...canonicalAuditeeRunEntries,
            ...runRecords.map((record) => ({
              stableKey: record.auditor_run_id,
              metadataRecord: canonicalMetadataRecord(
                [
                  ["id", record.auditor_run_id],
                  ["head_sha", record.head_sha],
                  ["status", record.run_status],
                  [
                    "conclusion",
                    record.run_conclusion === "none"
                      ? null
                      : record.run_conclusion,
                  ],
                  ["run_attempt", record.auditor_run_attempt],
                ],
                "proof auditor Actions run",
              ),
            })),
          ],
          "proof complete Actions run",
        ).recordSetSha256
    )
      errors.push("public audit complete Actions run record hash mismatch");
  } catch {
    errors.push("public audit complete Actions run records are invalid");
  }
  try {
    if (
      canonicalAuditeeJobEntries &&
      Array.isArray(jobRecords) &&
      provenance.actions_job_record_set_sha256 !==
        buildStableInventory(
          [
            ...canonicalAuditeeJobEntries,
            ...jobRecords.map((record) => ({
              stableKey: `${record.run_id}\t${record.job_id}`,
              metadataRecord: canonicalMetadataRecord(
                [
                  ["run_id", record.run_id],
                  ["id", record.job_id],
                  ["run_attempt", record.run_attempt],
                  ["status", record.status],
                  [
                    "conclusion",
                    record.conclusion === "none" ? null : record.conclusion,
                  ],
                ],
                "proof auditor Actions job",
              ),
            })),
          ],
          "proof complete Actions job",
        ).recordSetSha256
    )
      errors.push("public audit complete Actions job record hash mismatch");
  } catch {
    errors.push("public audit complete Actions job records are invalid");
  }
  if (provenance?.actions_run_inventory_count !== auditeeRunCount + runCount)
    errors.push("public audit Actions run partition count mismatch");
  if (provenance?.actions_job_inventory_count !== auditeeJobCount + jobCount)
    errors.push("public audit Actions job partition count mismatch");
  if (provenance?.actions_required_job_log_count !== auditeeJobCount)
    errors.push("public audit Actions auditee job log count mismatch");
  if (requireGithubSelfExclusion && runCount !== 1)
    errors.push("public audit GitHub proof lacks exact auditor self-exclusion");
  if (runCount === 0) {
    if (jobCount !== 0)
      errors.push("public audit offline auditor job exclusion is forbidden");
  } else if (runCount === 1) {
    const expected = expectedAuditorWorkflow(phase);
    if (!expected)
      errors.push("public audit phase does not allow auditor self-exclusion");
    if (!Number.isSafeInteger(jobCount) || jobCount < 1)
      errors.push("public audit auditor job set is empty");
    const record = Array.isArray(runRecords) ? runRecords[0] : null;
    if (record) {
      try {
        canonicalPositiveIntegerId(record.auditor_run_id, "auditor run");
        canonicalPositiveIntegerId(
          record.auditor_run_attempt,
          "auditor run attempt",
        );
        canonicalPositiveIntegerId(record.workflow_id, "auditor workflow");
      } catch {
        errors.push("public audit auditor identity is non-canonical");
      }
      if (record.topology_version !== PUBLIC_AUDIT_ACTIONS_TOPOLOGY_VERSION)
        errors.push("public audit auditor record topology mismatch");
      if (record.repository !== repository)
        errors.push("public audit auditor repository mismatch");
      if (record.phase !== phase)
        errors.push("public audit auditor phase mismatch");
      if (expected && record.workflow_path !== expected.path)
        errors.push("public audit auditor workflow path mismatch");
      if (expected && record.event !== expected.event)
        errors.push("public audit auditor event mismatch");
      if (!/^[0-9a-f]{40}$/u.test(record.workflow_blob_sha ?? ""))
        errors.push("public audit auditor workflow blob SHA is invalid");
      if (record.head_sha !== targetCommit)
        errors.push("public audit auditor target SHA mismatch");
      if (record.run_status !== "in_progress")
        errors.push("public audit auditor run status mismatch");
      if (record.run_conclusion !== "none")
        errors.push("public audit auditor run conclusion mismatch");
      if (record.auditor_job_count !== String(jobCount))
        errors.push("public audit auditor record job count mismatch");
      if (
        record.auditor_job_set_sha256 !==
        provenance.actions_auditor_self_excluded_job_set_sha256
      )
        errors.push("public audit auditor record job hash mismatch");
      if (
        typeof record.head_branch !== "string" ||
        record.head_branch.length === 0
      )
        errors.push("public audit auditor head branch is missing");
      if (Array.isArray(jobRecords)) {
        const seen = new Set();
        let nonCompleted = false;
        for (const job of jobRecords) {
          try {
            canonicalPositiveIntegerId(job.run_id, "auditor job run");
            canonicalPositiveIntegerId(
              job.run_attempt,
              "auditor job run attempt",
            );
            canonicalPositiveIntegerId(job.job_id, "auditor job");
          } catch {
            errors.push("public audit auditor job identity is non-canonical");
          }
          if (
            job.run_id !== record.auditor_run_id ||
            job.run_attempt !== record.auditor_run_attempt
          )
            errors.push("public audit auditor job membership mismatch");
          if (seen.has(job.job_id))
            errors.push("public audit auditor job duplicate stable ID");
          seen.add(job.job_id);
          if (job.status !== "completed") nonCompleted = true;
        }
        if (!nonCompleted)
          errors.push("public audit auditor job set has no executing job");
      }
    }
    if (provenance?.actions_scan_complete !== false)
      errors.push(
        "public audit self-excluded Actions scan completeness mismatch",
      );
  } else {
    errors.push("public audit auditor self-excluded run count is not exact");
  }
  return errors;
}

function isFixturePath(path) {
  return /(?:^|[\\/])(?:test|tests|fixtures?)(?:[\\/]|$)/iu.test(path);
}

function isAuditPolicyPath(path) {
  return /(?:^|[\\/])tools[\\/]public-exposure-audit(?:-lib)?\.mjs$/iu.test(
    path,
  );
}

function looksPlaceholder(value) {
  return /(?:example\.invalid|example\.com|placeholder|dummy|redacted|replace[_ -]?me|your[_ -]?(?:token|secret|password)|x{6,}|\*{6,}|<[^>]+>|\{\{[^}]+\}\})/iu.test(
    value,
  );
}

function fingerprint(value) {
  return `sha256:${sha256(Buffer.from(value, "utf8")).slice(0, 16)}`;
}

function luhn(value) {
  const digits = value.replace(/[^0-9]/gu, "");
  if (digits.length < 13 || digits.length > 19) return false;
  if (!/^(?:4|5[1-5]|3[47]|6(?:011|5))/u.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function scanPublicBytes({
  bytes,
  path,
  evidencePath = path,
  commit = null,
  blob = null,
}) {
  const text = Buffer.from(bytes).toString("utf8");
  const matches = [];
  const add = (category, value) => {
    if (looksPlaceholder(value)) return;
    matches.push({
      path: evidencePath,
      commit,
      blob,
      category,
      count: 1,
      redacted_fingerprint: fingerprint(value),
    });
  };
  const patterns = [
    ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gu],
    [
      "github_oauth_cloud_token",
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35})\b/gu,
    ],
    [
      "database_connection_credential",
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]{8,}@[^\s/]+/giu,
    ],
    [
      "live_session_cookie_secret",
      /\b(?:session|cookie)[_-]?(?:secret|token)\s*[:=]\s*["']?([A-Za-z0-9+/_=-]{24,})/giu,
    ],
    [
      "password_secret_assignment",
      /\b(?:password|passwd|client_secret|api_secret)\s*[:=]\s*["']?([^\s"']{12,})/giu,
    ],
  ];
  for (const [category, pattern] of patterns) {
    for (const match of text.matchAll(pattern))
      add(category, match[1] ?? match[0]);
  }
  for (const match of text.matchAll(
    /(?:card|credit|クレジット|カード)[^\n\r\d]{0,24}((?:\d[ -]?){13,19})(?!\d)/giu,
  )) {
    if (luhn(match[1])) add("bank_card_account_identity", match[1]);
  }
  if (
    /(?:^|[\\/])(?:\.env|id_(?:rsa|ed25519)|credentials?\.json|cookies?\.txt|bank[-_ ]?export|financial[-_ ]?export)(?:$|[.\\/])/iu.test(
      path,
    ) &&
    !isFixturePath(path) &&
    !isAuditPolicyPath(path)
  )
    add("unintended_user_owned_file", path);
  if (
    /(?:account_number|routing_number|card_number|口座番号|支店番号)/iu.test(
      text,
    ) &&
    /(?:transactions?|balances?|取引|残高)/iu.test(text) &&
    !isFixturePath(path) &&
    !isAuditPolicyPath(path)
  )
    add("private_financial_export", `${path}:financial-export-shape`);
  if (
    /(?:マイナンバー|個人番号)\D{0,8}\d{12}/u.test(text) &&
    !isFixturePath(path)
  )
    add("pii", `${path}:my-number`);
  return matches;
}

export function buildPublicAuditReport(input) {
  const findings = [...input.findings].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  const findingsByCategory = Object.fromEntries(
    PUBLIC_AUDIT_CATEGORIES.map((category) => [
      category,
      findings.filter((finding) => finding.category === category).length,
    ]),
  );
  return {
    schema_version: PUBLIC_AUDIT_SCHEMA_VERSION,
    repository: input.repository,
    target_commit: input.targetCommit,
    repository_visibility: input.repositoryVisibility,
    phase: input.phase,
    result: findings.length === 0 ? "PASS" : "FAIL",
    fixture_policy: {
      explicit_fixture_paths_only: true,
      live_looking_values_never_ignored: true,
    },
    provenance: input.provenance,
    scans: Object.fromEntries(
      PUBLIC_AUDIT_REQUIRED_SCANS.map((name) => [name, input.scans[name] ?? 0]),
    ),
    findings_count: findings.length,
    findings_by_category: findingsByCategory,
    findings,
    started_at: input.startedAt,
    completed_at: input.completedAt,
  };
}

export function serializePublicAuditReport(report) {
  return Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function validatePublicExposureAudit(
  report,
  {
    repository,
    targetCommit,
    phase,
    reportBytes,
    expectedSha256,
    requireGithubSelfExclusion = false,
  },
) {
  const errors = [];
  if (report?.schema_version !== PUBLIC_AUDIT_SCHEMA_VERSION)
    errors.push("public audit schema mismatch");
  if (report?.repository !== repository)
    errors.push("public audit repository mismatch");
  if (report?.target_commit !== targetCommit)
    errors.push("public audit target commit mismatch");
  if (report?.repository_visibility !== "public")
    errors.push("public audit did not verify public repository visibility");
  if (report?.phase !== phase) errors.push("public audit phase mismatch");
  if (phase !== "candidate_ci" && phase !== "release_preflight")
    errors.push("public audit phase is unsupported");
  if (report?.result !== "PASS" || report?.findings_count !== 0)
    errors.push("public audit has findings or did not pass");
  if (!Array.isArray(report?.findings))
    errors.push("public audit findings are missing");
  else if (report.findings.length !== report.findings_count)
    errors.push("public audit finding count mismatch");
  for (const category of PUBLIC_AUDIT_CATEGORIES) {
    if (
      !Number.isSafeInteger(report?.findings_by_category?.[category]) ||
      report.findings_by_category[category] < 0
    )
      errors.push(`public audit category is missing: ${category}`);
    else if (
      Array.isArray(report?.findings) &&
      report.findings_by_category[category] !==
        report.findings.filter((finding) => finding?.category === category)
          .length
    )
      errors.push(`public audit category count mismatch: ${category}`);
  }
  for (const scan of PUBLIC_AUDIT_REQUIRED_SCANS) {
    if (!Number.isSafeInteger(report?.scans?.[scan]) || report.scans[scan] < 0)
      errors.push(`public audit scan is incomplete: ${scan}`);
  }
  for (const scan of [
    "reachable_commits",
    "commit_objects",
    "reachable_trees",
    "reachable_blobs",
    "tree_entries",
    "historical_path_associations",
    "refs",
    "working_tree",
    "staged_bytes",
  ]) {
    if (!Number.isSafeInteger(report?.scans?.[scan]) || report.scans[scan] <= 0)
      errors.push(`public audit scan has impossible zero count: ${scan}`);
  }
  if (report?.scans?.commit_objects !== report?.scans?.reachable_commits)
    errors.push("public audit commit object scan count mismatch");
  if (
    report?.scans?.historical_path_associations !== report?.scans?.tree_entries
  )
    errors.push("public audit historical path association count mismatch");
  if (phase === "release_preflight" && report?.scans?.release_staging !== 5)
    errors.push(
      "public audit release staging scan must contain exactly 5 files",
    );
  if (phase === "candidate_ci" && report?.scans?.release_staging !== 0)
    errors.push("public audit candidate scan must not claim release staging");
  if (report?.provenance?.target_commit !== targetCommit)
    errors.push("public audit provenance target mismatch");
  if (report?.provenance?.scan_method !== PUBLIC_AUDIT_SCAN_METHOD)
    errors.push("public audit provenance scan method mismatch");
  if (
    report?.provenance?.actions_inventory_identity_version !==
    PUBLIC_AUDIT_ACTIONS_INVENTORY_IDENTITY_VERSION
  )
    errors.push("public audit Actions inventory identity version mismatch");
  for (const name of PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES) {
    const hash = report?.provenance?.[name] ?? "";
    if (!/^[0-9A-F]{64}$/u.test(hash) || /^0{64}$/u.test(hash))
      errors.push(`public audit provenance is missing: ${name}`);
  }
  for (const name of PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS) {
    const count = report?.provenance?.[name];
    if (!Number.isSafeInteger(count) || count < 0)
      errors.push(`public audit Actions provenance count is missing: ${name}`);
  }
  errors.push(
    ...validateActionsAuditTopology(report?.provenance, {
      repository,
      targetCommit,
      phase,
      requireGithubSelfExclusion,
    }),
  );
  if (
    report?.provenance?.actions_job_log_retrieval_count +
      report?.provenance?.actions_historical_unavailable_count !==
      report?.provenance?.actions_required_job_log_count ||
    report?.provenance?.actions_job_log_retrieval_count !==
      report?.provenance?.actions_job_log_scan_count ||
    report?.provenance?.actions_job_log_scan_count !==
      report?.scans?.actions_run_logs
  )
    errors.push("public audit Actions job log completeness mismatch");
  if (
    report?.provenance?.actions_artifact_inventory_count !==
      report?.provenance?.actions_artifact_retrieval_count ||
    report?.provenance?.actions_artifact_retrieval_count !==
      report?.provenance?.actions_artifact_scan_count ||
    report?.provenance?.actions_artifact_scan_count !==
      report?.scans?.actions_artifacts
  )
    errors.push("public audit Actions artifact completeness mismatch");
  if (report?.provenance?.repository_scan_complete !== true)
    errors.push("public audit repository scan is incomplete");
  errors.push(...validateActionsHistoricalEvidence(report?.provenance));
  if (
    report?.fixture_policy?.explicit_fixture_paths_only !== true ||
    report?.fixture_policy?.live_looking_values_never_ignored !== true
  )
    errors.push("public audit fixture policy mismatch");
  if (!Buffer.isBuffer(reportBytes))
    errors.push("public audit raw bytes missing");
  else {
    if (reportBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])))
      errors.push("public audit must not contain a UTF-8 BOM");
    const raw = reportBytes.toString("utf8");
    if (raw.includes("\r") || !raw.endsWith("\n") || raw.endsWith("\n\n"))
      errors.push("public audit must use LF with exactly one trailing LF");
    if (expectedSha256 !== sha256(reportBytes))
      errors.push("public audit report SHA-256 mismatch");
  }
  return { ok: errors.length === 0, errors, side_effects: 0 };
}

function exactWorkflowBlobSha(cwd, targetCommit, workflowPath) {
  const object = `${targetCommit}:${workflowPath}`;
  const typeResult = spawnSync("git", ["cat-file", "-t", object], {
    cwd,
    encoding: "utf8",
  });
  if (typeResult.status !== 0 || typeResult.stdout.trim() !== "blob")
    throw new Error("authoritative workflow object is not an exact Git blob");
  const shaResult = spawnSync("git", ["rev-parse", "--verify", object], {
    cwd,
    encoding: "utf8",
  });
  const value = shaResult.status === 0 ? shaResult.stdout.trim() : "";
  if (!/^[0-9a-f]{40}$/u.test(value))
    throw new Error("authoritative workflow blob SHA is unavailable");
  return value;
}

async function validateAuthoritativeAuditorIdentity(
  report,
  { cwd, token, fetchImpl, githubEnvironment },
) {
  const errors = [];
  const record =
    report?.provenance?.actions_auditor_self_excluded_run_records?.[0];
  if (!record) return ["public audit authoritative auditor record is missing"];
  if (!token) return ["public audit authoritative GitHub token is missing"];
  const envChecks = [
    ["GITHUB_RUN_ID", record.auditor_run_id],
    ["GITHUB_RUN_ATTEMPT", record.auditor_run_attempt],
    ["GITHUB_REPOSITORY", record.repository],
    ["GITHUB_EVENT_NAME", record.event],
  ];
  for (const [name, expected] of envChecks) {
    if (githubEnvironment?.[name] !== expected)
      errors.push(`public audit authoritative ${name} mismatch`);
  }
  let authoritative = null;
  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${record.repository}/actions/runs/${record.auditor_run_id}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    authoritative = await response.json();
  } catch {
    errors.push("public audit authoritative auditor run fetch failed");
  }
  if (authoritative) {
    let runId = null;
    let attempt = null;
    let workflowId = null;
    try {
      runId = canonicalPositiveIntegerId(
        authoritative.id,
        "authoritative auditor run",
      );
      attempt = canonicalPositiveIntegerId(
        authoritative.run_attempt,
        "authoritative auditor run attempt",
      );
      workflowId = canonicalPositiveIntegerId(
        authoritative.workflow_id,
        "authoritative auditor workflow",
      );
    } catch {
      errors.push("public audit authoritative auditor identity is malformed");
    }
    if (runId !== record.auditor_run_id)
      errors.push("public audit authoritative auditor run ID mismatch");
    if (attempt !== record.auditor_run_attempt)
      errors.push("public audit authoritative auditor attempt mismatch");
    if (workflowId !== record.workflow_id)
      errors.push("public audit authoritative workflow ID mismatch");
    if (authoritative.repository?.full_name !== record.repository)
      errors.push("public audit authoritative repository mismatch");
    if (authoritative.head_sha !== record.head_sha)
      errors.push("public audit authoritative target SHA mismatch");
    if (authoritative.path !== record.workflow_path)
      errors.push("public audit authoritative workflow path mismatch");
    if (authoritative.event !== record.event)
      errors.push("public audit authoritative event mismatch");
    if (authoritative.head_branch !== record.head_branch)
      errors.push("public audit authoritative head branch mismatch");
    if (authoritative.status !== record.run_status)
      errors.push("public audit authoritative run status mismatch");
    if ((authoritative.conclusion ?? "none") !== record.run_conclusion)
      errors.push("public audit authoritative run conclusion mismatch");
  }
  try {
    if (
      exactWorkflowBlobSha(cwd, report.target_commit, record.workflow_path) !==
      record.workflow_blob_sha
    )
      errors.push("public audit authoritative workflow blob SHA mismatch");
  } catch {
    errors.push("public audit authoritative workflow blob resolution failed");
  }
  return errors;
}

export async function readAuditProof({
  path,
  expectedSha256,
  cwd = process.cwd(),
  token = process.env.GITHUB_TOKEN,
  fetchImpl = fetch,
  githubEnvironment = process.env,
  ...identity
}) {
  if (!isAbsolute(path)) throw new Error("public audit path must be absolute");
  const resolved = resolve(path);
  await assertNoLinkedPath(resolved);
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("public audit path must be a regular non-link file");
  const bytes = await readFile(resolved);
  const report = JSON.parse(bytes.toString("utf8"));
  const validation = validatePublicExposureAudit(report, {
    ...identity,
    reportBytes: bytes,
    expectedSha256,
    requireGithubSelfExclusion: true,
  });
  const authoritativeErrors = validation.errors.includes(
    "public audit GitHub proof lacks exact auditor self-exclusion",
  )
    ? []
    : await validateAuthoritativeAuditorIdentity(report, {
        cwd,
        token,
        fetchImpl,
        githubEnvironment,
      });
  const errors = [...validation.errors, ...authoritativeErrors];
  return {
    report,
    bytes,
    validation: { ok: errors.length === 0, errors, side_effects: 0 },
  };
}

export async function readActionsHistoricalRuntimeEvidence({ path, report }) {
  if (!isAbsolute(path))
    throw new Error("historical runtime evidence path must be absolute");
  const resolved = resolve(path);
  await assertNoLinkedPath(resolved);
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(
      "historical runtime evidence path must be a regular non-link file",
    );
  const bytes = await readFile(resolved);
  return {
    bytes,
    validation: validateActionsHistoricalRuntimeBytes(
      report?.provenance,
      bytes,
    ),
  };
}

export function isPathInside(parent, candidate) {
  const value = relative(resolve(parent), resolve(candidate));
  return value !== "" && value !== ".." && !value.startsWith(`..${sep}`);
}

export async function assertNoLinkedPath(path) {
  const resolved = resolve(path);
  const root = parse(resolved).root;
  let current = root;
  for (const part of resolved
    .slice(root.length)
    .split(/[\\/]/u)
    .filter(Boolean)) {
    current = resolve(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink())
      throw new Error("public audit path must not traverse a link");
  }
}
