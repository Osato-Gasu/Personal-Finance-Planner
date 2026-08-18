import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_AUDIT_CATEGORIES,
  PUBLIC_AUDIT_ACTIONS_INVENTORY_IDENTITY_VERSION,
  PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS,
  PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES,
  PUBLIC_AUDIT_REQUIRED_SCANS,
  PUBLIC_AUDIT_SCAN_METHOD,
  ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
  ACTIONS_HISTORICAL_POLICY_ID,
  PUBLIC_AUDIT_EMPTY_SET_SHA256,
  actionsHistoricalSetSha256,
  buildActionsHistoricalEvidence,
  buildStableInventory,
  buildPublicAuditReport,
  canonicalMetadataRecord,
  canonicalPositiveIntegerId,
  readAuditProof,
  readActionsHistoricalRuntimeEvidence,
  scanPublicBytes,
  serializeActionsHistoricalRecord,
  serializePublicAuditReport,
  sha256,
  validatePublicExposureAudit,
  validateActionsHistoricalRuntimeBytes,
} from "../tools/public-exposure-audit-lib.mjs";
import {
  historicalRuntimeEvidencePath,
  runPublicExposureAudit,
  scanArtifactArchive,
} from "../tools/public-exposure-audit.mjs";

const repository = "owner/repo";
const targetCommit = "a".repeat(40);
const provenance = {
  target_commit: targetCommit,
  scan_method: PUBLIC_AUDIT_SCAN_METHOD,
  ref_set_sha256: "A".repeat(64),
  reachable_commit_set_sha256: "B".repeat(64),
  reachable_tree_set_sha256: "C".repeat(64),
  reachable_blob_set_sha256: "D".repeat(64),
  commit_path_blob_associations_sha256: "E".repeat(64),
  actions_run_set_sha256: "F".repeat(64),
  actions_job_set_sha256: "1".repeat(64),
  actions_artifact_set_sha256: "2".repeat(64),
  actions_run_record_set_sha256: "3".repeat(64),
  actions_job_record_set_sha256: "4".repeat(64),
  actions_artifact_record_set_sha256: "5".repeat(64),
  actions_inventory_identity_version:
    PUBLIC_AUDIT_ACTIONS_INVENTORY_IDENTITY_VERSION,
  actions_run_inventory_count: 1,
  actions_job_inventory_count: 1,
  actions_required_job_log_count: 1,
  actions_job_log_retrieval_count: 1,
  actions_job_log_scan_count: 1,
  actions_artifact_inventory_count: 1,
  actions_artifact_retrieval_count: 1,
  actions_artifact_scan_count: 1,
  ...buildActionsHistoricalEvidence(),
  repository_scan_complete: true,
};

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}

function responseHeaders(values = {}) {
  const entries = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return { get: (name) => entries[String(name).toLowerCase()] ?? null };
}

function bytesResponse(value, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders(headers),
    arrayBuffer: async () => Buffer.from(value),
  };
}

const historicalRuntimeBody = Buffer.from(
  '<?xml version="1.0" encoding="utf-8"?><Error><Code>BlobNotFound</Code><Message>The specified blob does not exist.</Message></Error>',
  "utf8",
);

function historicalRuntimeRecord(body = historicalRuntimeBody) {
  const approved = ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD;
  return {
    policy_id: approved.policy_id,
    repository: approved.repository,
    run_id: approved.run_id,
    run_attempt: approved.run_attempt,
    job_id: approved.job_id,
    run_head_sha: approved.run_head_sha,
    runtime_observation_performed: true,
    observed_direct_log_initial_status: "302",
    observed_direct_log_final_status: "404",
    observed_direct_log_final_content_type: "application/xml",
    observed_direct_log_error_code: "BlobNotFound",
    observed_direct_log_response_sha256: sha256(body),
    observed_direct_log_response_bytes: String(body.length),
  };
}

function exceptionProvenance(body = historicalRuntimeBody) {
  return {
    ...provenance,
    actions_job_inventory_count: 1,
    actions_required_job_log_count: 1,
    actions_job_log_retrieval_count: 0,
    actions_job_log_scan_count: 0,
    ...buildActionsHistoricalEvidence(historicalRuntimeRecord(body)),
  };
}

async function createAuditRepository(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const repo = resolve(root, "repo");
  await mkdir(repo);
  execFileSync("git", ["init", "-b", "main"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Audit Test"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "audit@example.invalid"], {
    cwd: repo,
  });
  await writeFile(resolve(repo, "safe.txt"), "safe\n");
  execFileSync("git", ["add", "safe.txt"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "safe"], { cwd: repo });
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
  return { root, repo, head, output: resolve(root, "audit.json") };
}

function report(overrides = {}) {
  return buildPublicAuditReport({
    repository,
    targetCommit,
    repositoryVisibility: "public",
    phase: "release_preflight",
    scans: {
      ...Object.fromEntries(
        PUBLIC_AUDIT_REQUIRED_SCANS.map((name) => [name, 1]),
      ),
      release_staging: 5,
    },
    findings: [],
    provenance,
    startedAt: "2026-08-16T00:00:00.000Z",
    completedAt: "2026-08-16T00:00:01.000Z",
    ...overrides,
  });
}

function exceptionReport(provenanceOverride = exceptionProvenance()) {
  const base = report();
  return report({
    provenance: provenanceOverride,
    scans: { ...base.scans, actions_run_logs: 0 },
  });
}

function validateReport(value) {
  const bytes = serializePublicAuditReport(value);
  return validatePublicExposureAudit(value, {
    repository,
    targetCommit,
    phase: "release_preflight",
    reportBytes: bytes,
    expectedSha256: sha256(bytes),
  });
}

function approvedHistoricalFetch(fixture, mode = "happy") {
  const approved = ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD;
  const seen = [];
  const redirectUrl = "https://runtime.example.invalid/job-log.xml";
  const fetchImpl = async (url, options = {}) => {
    const value = String(url);
    seen.push({ url: value, redirect: options.redirect ?? null });
    if (value.endsWith(`/${approved.repository}`))
      return jsonResponse({ private: false, visibility: "public" });
    if (value.includes("/actions/runs?")) {
      const postAdoption = mode === "post_adoption_missing";
      return jsonResponse({
        total_count: 1,
        workflow_runs: [
          {
            id: postAdoption ? 31887544174 : Number(approved.run_id),
            head_sha: postAdoption ? fixture.head : approved.run_head_sha,
            status: "completed",
            conclusion: "failure",
            run_attempt: 1,
          },
        ],
      });
    }
    if (value.includes("/jobs?")) {
      const second = mode === "second_unavailable";
      const nonAllowlisted =
        mode === "non_allowlisted_missing" || mode === "post_adoption_missing";
      const wrongIdentity = mode === "wrong_static_identity";
      return jsonResponse({
        total_count: second ? 2 : 1,
        jobs: [
          {
            id: nonAllowlisted ? 95018938493 : Number(approved.job_id),
            status: mode === "non_completed" ? "in_progress" : "completed",
            conclusion: "failure",
          },
          ...(second
            ? [{ id: 95018938493, status: "completed", conclusion: "failure" }]
            : []),
        ].map((job) =>
          wrongIdentity
            ? { ...job, id: Number(approved.job_id), conclusion: "success" }
            : job,
        ),
      });
    }
    if (value.includes("/actions/artifacts?"))
      return jsonResponse({ total_count: 0, artifacts: [] });
    if (value === redirectUrl) {
      if (mode === "redirect_failure") throw new Error("redirect failed");
      const status =
        mode === "final_410"
          ? 410
          : mode === "final_403"
            ? 403
            : mode === "final_500"
              ? 500
              : mode === "final_200"
                ? 200
                : 404;
      const contentType =
        mode === "content_type" ? "text/xml" : "application/xml";
      const body =
        mode === "empty_body"
          ? Buffer.alloc(0)
          : mode === "error_code"
            ? Buffer.from("<Error><Code>ContainerNotFound</Code></Error>")
            : historicalRuntimeBody;
      if (mode === "body_failure")
        return {
          status,
          headers: responseHeaders({ "content-type": contentType }),
          arrayBuffer: async () => {
            throw new Error("body failed");
          },
        };
      return bytesResponse(body, status, { "content-type": contentType });
    }
    if (value.includes("/logs")) {
      const exact = value.endsWith(`/actions/jobs/${approved.job_id}/logs`);
      if (
        mode === "second_unavailable" &&
        value.endsWith("/actions/jobs/95018938493/logs")
      )
        return bytesResponse("missing", 404);
      if (
        [
          "non_allowlisted_missing",
          "post_adoption_missing",
          "wrong_static_identity",
        ].includes(mode)
      )
        return bytesResponse("missing", 404);
      if (!exact) return bytesResponse("safe log");
      if (mode === "request_failure") throw new Error("request failed");
      if (mode === "initial_status") return bytesResponse("", 301);
      const location =
        mode === "redirect_missing" ? {} : { location: redirectUrl };
      return bytesResponse("", 302, location);
    }
    throw new Error(`unexpected test URL: ${value}`);
  };
  return { fetchImpl, seen };
}

describe("public exposure audit contract", () => {
  it.each([
    [1, "1"],
    [Number.MAX_SAFE_INTEGER, String(Number.MAX_SAFE_INTEGER)],
    ["1", "1"],
    ["90071992547409931234567890", "90071992547409931234567890"],
  ])("canonicalizes a positive Actions stable ID: %j", (value, expected) => {
    expect(canonicalPositiveIntegerId(value, "Actions run")).toBe(expected);
  });

  it.each([
    null,
    undefined,
    true,
    false,
    {},
    [],
    "",
    0,
    -1,
    1.5,
    1e21,
    Number.MAX_SAFE_INTEGER + 1,
    NaN,
    Infinity,
    "0",
    "-1",
    "1.5",
    "1e3",
    "+1",
    " 1",
    "1 ",
    "01",
  ])("rejects a non-canonical Actions stable ID: %j", (value) => {
    expect(() => canonicalPositiveIntegerId(value, "Actions run")).toThrow(
      "BLOCKED: invalid Actions run stable ID",
    );
  });

  it("hashes stable keys and fixed-order records deterministically", () => {
    const entry = (id, status) => ({
      stableKey: id,
      metadataRecord: canonicalMetadataRecord(
        [
          ["id", id],
          ["status", status],
          ["conclusion", null],
          ["run_attempt", undefined],
        ],
        "Actions run",
      ),
    });
    const first = buildStableInventory(
      [entry("1", "completed"), entry("2", "queued")],
      "Actions run",
    );
    const reordered = buildStableInventory(
      [entry("2", "queued"), entry("1", "completed")],
      "Actions run",
    );
    const metadataChanged = buildStableInventory(
      [entry("1", "completed"), entry("2", "in_progress")],
      "Actions run",
    );
    expect(reordered).toEqual(first);
    expect(metadataChanged.stableKeySetSha256).toBe(first.stableKeySetSha256);
    expect(metadataChanged.recordSetSha256).not.toBe(first.recordSetSha256);
  });

  it("serializes the exact approved static policy record canonically", () => {
    const bytes = serializeActionsHistoricalRecord(
      ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
      "static",
    );
    const text = bytes.toString("utf8");
    expect(bytes.subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(text).not.toContain("\r");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(
      text
        .split("\n")
        .slice(0, -1)
        .map((line) => line.split("=")[0]),
    ).toEqual([
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
  });

  it("uses the exact empty-set hash and direct record concatenation", () => {
    expect(PUBLIC_AUDIT_EMPTY_SET_SHA256).toBe(
      "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    );
    expect(actionsHistoricalSetSha256([], "static")).toBe(
      PUBLIC_AUDIT_EMPTY_SET_SHA256,
    );
    expect(actionsHistoricalSetSha256([], "runtime")).toBe(
      PUBLIC_AUDIT_EMPTY_SET_SHA256,
    );
    const staticBytes = serializeActionsHistoricalRecord(
      ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
      "static",
    );
    expect(
      actionsHistoricalSetSha256(
        [{ ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD }],
        "static",
      ),
    ).toBe(sha256(staticBytes));
    expect(sha256(Buffer.from(sha256(staticBytes), "utf8"))).not.toBe(
      sha256(staticBytes),
    );
  });

  it("builds a strict valid exception proof with truthful completeness", () => {
    const value = exceptionReport();
    expect(validateReport(value)).toEqual({
      ok: true,
      errors: [],
      side_effects: 0,
    });
    expect(value.provenance).toMatchObject({
      actions_historical_unavailable_count: 1,
      actions_historical_runtime_observation_count: 1,
      actions_historical_unavailable_policy: ACTIONS_HISTORICAL_POLICY_ID,
      actions_scan_complete: false,
      actions_evidence_gate_pass: true,
    });
  });

  it.each([
    [
      "field order",
      () => {
        const source = ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD;
        return {
          repository: source.repository,
          policy_id: source.policy_id,
          ...source,
        };
      },
    ],
    [
      "omitted field",
      () => {
        const value = { ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD };
        delete value.attempt_archive_regular_entry_count;
        return value;
      },
    ],
    [
      "extra field",
      () => ({
        ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
        extra: "forbidden",
      }),
    ],
  ])(
    "rejects a static canonical record schema mutation: %s",
    (_label, mutate) => {
      expect(() =>
        serializeActionsHistoricalRecord(mutate(), "static"),
      ).toThrow(/record schema/u);
    },
  );

  it.each([
    ["leading-zero integer", "run_attempt", "01"],
    ["lowercase SHA", "direct_log_response_sha256", "a".repeat(64)],
    ["uppercase MIME", "direct_log_final_content_type", "Application/XML"],
    ["non-ASCII string", "job_status", "完了"],
  ])("rejects a non-canonical static scalar: %s", (_label, field, value) => {
    expect(() =>
      serializeActionsHistoricalRecord(
        { ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD, [field]: value },
        "static",
      ),
    ).toThrow(/canonical/u);
  });

  it("rejects a non-boolean runtime performed value", () => {
    expect(() =>
      serializeActionsHistoricalRecord(
        {
          ...historicalRuntimeRecord(),
          runtime_observation_performed: "true",
        },
        "runtime",
      ),
    ).toThrow(/canonical boolean/u);
  });

  it.each([
    [
      "CRLF",
      (bytes) => Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n")),
    ],
    ["missing final LF", (bytes) => bytes.subarray(0, bytes.length - 1)],
    [
      "wrong separator",
      (bytes) =>
        Buffer.from(
          bytes.toString("utf8").replace("policy_id=", "policy_id: "),
        ),
    ],
  ])(
    "rejects a non-canonical static set hash derived from %s bytes",
    (_label, mutate) => {
      const canonical = serializeActionsHistoricalRecord(
        ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
        "static",
      );
      const changed = exceptionProvenance();
      changed.actions_historical_unavailable_set_sha256 = sha256(
        mutate(canonical),
      );
      expect(validateReport(exceptionReport(changed)).errors).toContain(
        "public audit historical unavailable set hash mismatch",
      );
    },
  );

  it.each([
    "actions_historical_runtime_observation_count",
    "actions_historical_runtime_observation_set_sha256",
    "actions_historical_runtime_observations",
  ])("rejects a missing runtime proof field: %s", (field) => {
    const changed = exceptionProvenance();
    const withoutField = Object.fromEntries(
      Object.entries(changed).filter(([name]) => name !== field),
    );
    expect(validateReport(exceptionReport(withoutField)).ok).toBe(false);
  });

  it.each([
    ["performed false", "runtime_observation_performed", false],
    ["initial status", "observed_direct_log_initial_status", "301"],
    ["final 410", "observed_direct_log_final_status", "410"],
    ["final 403", "observed_direct_log_final_status", "403"],
    ["final 500", "observed_direct_log_final_status", "500"],
    ["content type", "observed_direct_log_final_content_type", "text/xml"],
    ["error code", "observed_direct_log_error_code", "ContainerNotFound"],
    ["response SHA", "observed_direct_log_response_sha256", "A".repeat(64)],
    ["response bytes", "observed_direct_log_response_bytes", "1"],
    ["wrong run", "run_id", "31887544174"],
    ["wrong attempt", "run_attempt", "2"],
    ["wrong job", "job_id", "95018938493"],
    ["wrong head", "run_head_sha", "f".repeat(40)],
  ])("rejects a mutated runtime proof: %s", (_label, field, value) => {
    const record = { ...historicalRuntimeRecord(), [field]: value };
    const changed = exceptionProvenance();
    changed.actions_historical_runtime_observations = [record];
    changed.actions_historical_runtime_observation_set_sha256 =
      actionsHistoricalSetSha256([record], "runtime");
    const validation = validateReport(exceptionReport(changed));
    if (
      field === "observed_direct_log_response_sha256" ||
      field === "observed_direct_log_response_bytes"
    ) {
      expect(validation.ok).toBe(true);
      expect(
        validateActionsHistoricalRuntimeBytes(changed, historicalRuntimeBody)
          .ok,
      ).toBe(false);
    } else {
      expect(validation.ok).toBe(false);
    }
  });

  it("rejects a mutated runtime observation set hash", () => {
    const changed = exceptionProvenance();
    changed.actions_historical_runtime_observation_set_sha256 = "A".repeat(64);
    expect(validateReport(exceptionReport(changed)).errors).toContain(
      "public audit historical runtime observation set hash mismatch",
    );
  });

  it.each([
    ["repository", "repository", "other/repo"],
    ["run", "run_id", "31887544174"],
    ["attempt", "run_attempt", "2"],
    ["job", "job_id", "95018938493"],
    ["head", "run_head_sha", "f".repeat(40)],
    ["static 410", "direct_log_final_status", "410"],
    ["direct SHA", "direct_log_response_sha256", "A".repeat(64)],
    ["direct bytes", "direct_log_response_bytes", "216"],
    ["attempt jobs SHA", "attempt_jobs_response_sha256", "A".repeat(64)],
    ["attempt jobs total", "attempt_jobs_total_count", "2"],
    ["attempt jobs length", "attempt_jobs_length", "2"],
    ["attempt jobs sole ID", "attempt_jobs_sole_job_id", "95018938493"],
    ["archive status", "attempt_archive_final_status", "404"],
    ["archive SHA", "attempt_archive_sha256", "A".repeat(64)],
    ["archive bytes", "attempt_archive_bytes", "23"],
    ["archive entries", "attempt_archive_zip_entries", "1"],
    ["archive regular entries", "attempt_archive_regular_entry_count", "1"],
  ])(
    "rejects a mutated static approved policy field: %s",
    (_label, field, value) => {
      const record = {
        ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD,
        [field]: value,
      };
      const changed = exceptionProvenance();
      changed.actions_historical_unavailable_records = [record];
      changed.actions_historical_unavailable_set_sha256 =
        actionsHistoricalSetSha256([record], "static");
      expect(validateReport(exceptionReport(changed)).errors).toContain(
        "public audit approved historical policy record mismatch",
      );
    },
  );

  it("rejects count inequality, a second exception, and contradictory truth fields", () => {
    const countMismatch = exceptionProvenance();
    countMismatch.actions_historical_runtime_observation_count = 0;
    expect(validateReport(exceptionReport(countMismatch)).errors).toContain(
      "public audit historical runtime observation count mismatch",
    );

    const second = exceptionProvenance();
    second.actions_historical_unavailable_count = 2;
    second.actions_historical_unavailable_records = [
      { ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD },
      { ...ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD },
    ];
    second.actions_historical_unavailable_set_sha256 =
      actionsHistoricalSetSha256(
        second.actions_historical_unavailable_records,
        "static",
      );
    second.actions_historical_runtime_observation_count = 2;
    second.actions_historical_runtime_observations = [
      { ...historicalRuntimeRecord() },
      { ...historicalRuntimeRecord() },
    ];
    second.actions_historical_runtime_observation_set_sha256 =
      actionsHistoricalSetSha256(
        second.actions_historical_runtime_observations,
        "runtime",
      );
    expect(validateReport(exceptionReport(second)).errors).toContain(
      "public audit historical unavailable count exceeds policy",
    );

    const complete = exceptionProvenance();
    complete.actions_scan_complete = true;
    expect(validateReport(exceptionReport(complete)).errors).toContain(
      "public audit Actions scan completeness mismatch",
    );
  });

  it.each([
    ["inventory", "actions_job_inventory_count", 2],
    ["required", "actions_required_job_log_count", 2],
    ["retrieval", "actions_job_log_retrieval_count", 1],
    ["scan", "actions_job_log_scan_count", 1],
  ])(
    "enforces an exception job-count equation mutation: %s",
    (_label, field, value) => {
      const changed = exceptionProvenance();
      changed[field] = value;
      expect(validateReport(exceptionReport(changed)).ok).toBe(false);
    },
  );

  it("hashes one runtime record as its exact canonical bytes", () => {
    const record = historicalRuntimeRecord();
    expect(actionsHistoricalSetSha256([record], "runtime")).toBe(
      sha256(serializeActionsHistoricalRecord(record, "runtime")),
    );
    expect(record.observed_direct_log_response_sha256).not.toBe(
      ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD.direct_log_response_sha256,
    );
  });

  it.each([
    [
      "omitted runtime field",
      () => {
        const value = { ...historicalRuntimeRecord() };
        delete value.observed_direct_log_error_code;
        return value;
      },
    ],
    [
      "extra runtime field",
      () => ({
        ...historicalRuntimeRecord(),
        extra: "forbidden",
      }),
    ],
    [
      "runtime field order",
      () => {
        const source = historicalRuntimeRecord();
        return {
          repository: source.repository,
          policy_id: source.policy_id,
          ...source,
        };
      },
    ],
  ])(
    "rejects a runtime canonical record schema mutation: %s",
    (_label, mutate) => {
      expect(() =>
        serializeActionsHistoricalRecord(mutate(), "runtime"),
      ).toThrow(/record schema/u);
    },
  );

  it("rejects a legacy independent count alias and a false evidence gate", () => {
    const alias = { ...provenance, historical_unavailable_count: 0 };
    expect(validateReport(report({ provenance: alias })).errors).toContain(
      "public audit legacy historical unavailable alias is forbidden",
    );
    const gate = { ...provenance, actions_evidence_gate_pass: false };
    expect(validateReport(report({ provenance: gate })).errors).toContain(
      "public audit Actions evidence gate did not pass",
    );
  });

  it.each([
    ["Actions run", "11"],
    ["Actions job", "11\t21"],
    ["Actions artifact", "31"],
  ])("rejects duplicate and conflicting %s stable IDs", (label, stableKey) => {
    const secret = ["gh", "p_", "duplicate", "S".repeat(30)].join("");
    const base = { stableKey, metadataRecord: 'status=string:"completed"' };
    expect(() => buildStableInventory([base, { ...base }], label)).toThrow(
      new RegExp(`BLOCKED: duplicate ${label} stable ID`, "u"),
    );
    let error;
    try {
      buildStableInventory(
        [base, { stableKey, metadataRecord: `status=string:${secret}` }],
        label,
      );
    } catch (value) {
      error = value;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      `BLOCKED: conflicting ${label} stable ID metadata`,
    );
    expect(error.message).not.toContain(secret);
  });

  it("serializes a deterministic strict PASS proof without BOM or secret values", () => {
    const value = report();
    const bytes = serializePublicAuditReport(value);
    expect(bytes.subarray(0, 3)).not.toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(bytes.toString("utf8")).not.toContain("\r");
    expect(bytes.toString("utf8")).toMatch(/[^\n]\n$/u);
    expect(
      validatePublicExposureAudit(value, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: bytes,
        expectedSha256: sha256(bytes),
      }),
    ).toEqual({ ok: true, errors: [], side_effects: 0 });
    expect(Object.keys(value.findings_by_category)).toEqual(
      PUBLIC_AUDIT_CATEGORIES,
    );
  });

  it.each([
    ["private repository", { repositoryVisibility: "private" }],
    ["wrong target", { targetCommit: "b".repeat(40) }],
    ["wrong phase", { phase: "candidate" }],
    [
      "finding",
      {
        findings: scanPublicBytes({
          bytes: ["gh", "p_", "abcdefghijklmnopqrstuvwxyz", "1234567890"].join(
            "",
          ),
          path: "source.txt",
        }),
      },
    ],
  ])("rejects %s with side_effects 0", (_label, override) => {
    const value = report(override);
    const bytes = serializePublicAuditReport(value);
    expect(
      validatePublicExposureAudit(value, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: bytes,
        expectedSha256: sha256(bytes),
      }),
    ).toMatchObject({ ok: false, side_effects: 0 });
  });

  it("reports fingerprints only and never copies matched credential bytes", () => {
    const secret = [
      "gh",
      "p_",
      "abcdefghijklmnopqrstuvwxyz",
      "1234567890",
    ].join("");
    const findings = scanPublicBytes({
      bytes: `TOKEN=${secret}`,
      path: "config.txt",
      commit: targetCommit,
      blob: "b".repeat(40),
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      path: "config.txt",
      commit: targetCommit,
      blob: "b".repeat(40),
      category: "github_oauth_cloud_token",
      count: 1,
    });
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("allows explicit placeholder fixtures but not live-looking fixture values", () => {
    expect(
      scanPublicBytes({
        bytes: "password=YOUR_PASSWORD",
        path: "tests/fixtures/example.env",
      }),
    ).toEqual([]);
    expect(
      scanPublicBytes({
        bytes: ["password=correct", "-horse-battery-staple"].join(""),
        path: "tests/fixtures/live.env",
      }),
    ).toHaveLength(1);
  });

  it("requires card context and excludes only the scanner policy source shape", () => {
    const card = ["4111", "1111", "1111", "1111"].join(" ");
    expect(
      scanPublicBytes({ bytes: `card number ${card}`, path: "notes.txt" }),
    ).toMatchObject([{ category: "bank_card_account_identity" }]);
    expect(scanPublicBytes({ bytes: card, path: "manifest.yml" })).toEqual([]);
    const policyShape = "account_number transactions";
    expect(
      scanPublicBytes({
        bytes: policyShape,
        path: "tools/public-exposure-audit-lib.mjs",
      }),
    ).toEqual([]);
    expect(
      scanPublicBytes({ bytes: policyShape, path: "private/export.json" }),
    ).toMatchObject([{ category: "private_financial_export" }]);
  });

  it("rejects stale hashes, malformed line endings, and missing scan categories", () => {
    const value = report();
    const bytes = serializePublicAuditReport(value);
    expect(
      validatePublicExposureAudit(value, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: bytes,
        expectedSha256: "0".repeat(64),
      }).ok,
    ).toBe(false);
    expect(
      validatePublicExposureAudit(value, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: Buffer.from(
          bytes.toString("utf8").replaceAll("\n", "\r\n"),
        ),
        expectedSha256: sha256(
          Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n")),
        ),
      }).ok,
    ).toBe(false);
    delete value.scans.refs;
    const missing = serializePublicAuditReport(value);
    expect(
      validatePublicExposureAudit(value, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: missing,
        expectedSha256: sha256(missing),
      }).ok,
    ).toBe(false);
  });

  it("rejects impossible zero scans, forged provenance, and non-exact release staging", () => {
    for (const value of [
      report({
        scans: Object.fromEntries(
          PUBLIC_AUDIT_REQUIRED_SCANS.map((name) => [name, 0]),
        ),
      }),
      report({ provenance: { ...provenance, target_commit: "b".repeat(40) } }),
      report({
        provenance: { ...provenance, ref_set_sha256: "0".repeat(64) },
      }),
      report({ provenance: undefined }),
      report({
        scans: { ...report().scans, release_staging: 4 },
      }),
      report({
        scans: { ...report().scans, release_staging: 6 },
      }),
    ]) {
      const bytes = serializePublicAuditReport(value);
      expect(
        validatePublicExposureAudit(value, {
          repository,
          targetCommit,
          phase: "release_preflight",
          reportBytes: bytes,
          expectedSha256: sha256(bytes),
        }).ok,
      ).toBe(false);
    }
  });

  it("rejects mismatched Actions inventory, retrieval, and scan counts", () => {
    for (const name of PUBLIC_AUDIT_REQUIRED_ACTION_COUNTS) {
      const value = report({
        provenance: { ...provenance, [name]: undefined },
      });
      const bytes = serializePublicAuditReport(value);
      expect(
        validatePublicExposureAudit(value, {
          repository,
          targetCommit,
          phase: "release_preflight",
          reportBytes: bytes,
          expectedSha256: sha256(bytes),
        }).ok,
      ).toBe(false);
    }
    const mismatched = report({
      provenance: {
        ...provenance,
        actions_job_log_retrieval_count: 0,
        actions_artifact_scan_count: 0,
      },
    });
    const bytes = serializePublicAuditReport(mismatched);
    expect(
      validatePublicExposureAudit(mismatched, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: bytes,
        expectedSha256: sha256(bytes),
      }).errors,
    ).toEqual(
      expect.arrayContaining([
        "public audit Actions job log completeness mismatch",
        "public audit Actions artifact completeness mismatch",
      ]),
    );
  });

  it("requires stable-ID inventory version and all record-set hashes", () => {
    for (const name of PUBLIC_AUDIT_REQUIRED_PROVENANCE_HASHES.filter((name) =>
      name.includes("record_set"),
    )) {
      const value = report({
        provenance: { ...provenance, [name]: undefined },
      });
      const bytes = serializePublicAuditReport(value);
      expect(
        validatePublicExposureAudit(value, {
          repository,
          targetCommit,
          phase: "release_preflight",
          reportBytes: bytes,
          expectedSha256: sha256(bytes),
        }).ok,
      ).toBe(false);
    }
    const wrongVersion = report({
      provenance: {
        ...provenance,
        actions_inventory_identity_version: "metadata-key-v0",
      },
    });
    const bytes = serializePublicAuditReport(wrongVersion);
    expect(
      validatePublicExposureAudit(wrongVersion, {
        repository,
        targetCommit,
        phase: "release_preflight",
        reportBytes: bytes,
        expectedSha256: sha256(bytes),
      }).errors,
    ).toContain("public audit Actions inventory identity version mismatch");
  });

  it.each([
    ["run", false],
    ["run", true],
    ["job", false],
    ["job", true],
    ["artifact", false],
    ["artifact", true],
  ])(
    "rejects %s pagination overlap before report creation (conflict=%s)",
    async (kind, conflict) => {
      const fixture = await createAuditRepository("public-audit-overlap-");
      const secret = ["gh", "p_", "overlap", "Z".repeat(30)].join("");
      let contentRequests = 0;
      const run = (id) => ({
        id,
        head_sha: fixture.head,
        status: "completed",
        conclusion: "success",
        run_attempt: 1,
      });
      const job = (id) => ({
        id,
        status: "completed",
        conclusion: "success",
      });
      const artifact = (id) => ({
        id,
        name: "proof",
        expired: false,
        workflow_run: { head_sha: fixture.head },
      });
      const fetchImpl = async (url) => {
        const value = String(url);
        if (value.endsWith(`/${repository}`))
          return jsonResponse({ private: false, visibility: "public" });
        const pageTwo = value.includes("page=2");
        if (value.includes("/actions/runs?") && kind === "run") {
          if (!pageTwo)
            return jsonResponse({
              total_count: 101,
              workflow_runs: Array.from({ length: 100 }, (_item, index) =>
                run(index + 1),
              ),
            });
          return jsonResponse({
            total_count: 101,
            workflow_runs: [
              { ...run(1), status: conflict ? secret : "completed" },
            ],
          });
        }
        if (value.includes("/actions/runs?"))
          return jsonResponse({
            total_count: kind === "job" ? 1 : 0,
            workflow_runs: kind === "job" ? [run(11)] : [],
          });
        if (value.includes("/actions/runs/11/jobs")) {
          if (!pageTwo)
            return jsonResponse({
              total_count: 101,
              jobs: Array.from({ length: 100 }, (_item, index) =>
                job(index + 1),
              ),
            });
          return jsonResponse({
            total_count: 101,
            jobs: [{ ...job(1), status: conflict ? secret : "completed" }],
          });
        }
        if (value.includes("/actions/artifacts?")) {
          if (kind !== "artifact")
            return jsonResponse({ total_count: 0, artifacts: [] });
          if (!pageTwo)
            return jsonResponse({
              total_count: 101,
              artifacts: Array.from({ length: 100 }, (_item, index) =>
                artifact(index + 1),
              ),
            });
          return jsonResponse({
            total_count: 101,
            artifacts: [{ ...artifact(1), name: conflict ? secret : "proof" }],
          });
        }
        if (value.includes("/logs") || value.includes("/zip")) {
          contentRequests += 1;
          return bytesResponse("safe");
        }
        throw new Error(`unexpected test URL: ${value}`);
      };
      try {
        let error;
        try {
          await runPublicExposureAudit({
            cwd: fixture.repo,
            repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          });
        } catch (value) {
          error = value;
        }
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(
          conflict
            ? /conflicting .* stable ID metadata/u
            : /duplicate .* stable ID/u,
        );
        expect(error.message).not.toContain(secret);
        expect(contentRequests).toBe(0);
        await expect(readFile(fixture.output)).rejects.toThrow();
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it.each([
    ["run response is not an object", "run", "response_array"],
    ["run records are missing", "run", "records_missing"],
    ["run total is missing", "run", "missing"],
    ["run total is malformed", "run", "malformed"],
    ["run total is negative", "run", "negative"],
    ["run total is non-integer", "run", "non_integer"],
    ["run total is unsafe", "run", "unsafe"],
    ["run total is too large", "run", "too_large"],
    ["run total is too small", "run", "too_small"],
    ["run total changes between pages", "run", "page_change"],
    ["job total is too large", "job", "too_large"],
    ["job total is too small", "job", "too_small"],
    ["job total changes between pages", "job", "page_change"],
    ["artifact total is missing", "artifact", "missing"],
    ["artifact total is too large", "artifact", "too_large"],
    ["artifact total is too small", "artifact", "too_small"],
    ["artifact total changes between pages", "artifact", "page_change"],
  ])(
    "rejects incomplete Actions pagination before content retrieval: %s",
    async (_label, kind, mode) => {
      const fixture = await createAuditRepository("public-audit-total-");
      let contentRequests = 0;
      const run = (id) => ({
        id,
        head_sha: fixture.head,
        status: "completed",
        conclusion: "success",
        run_attempt: 1,
      });
      const job = (id) => ({
        id,
        status: "completed",
        conclusion: "success",
      });
      const artifact = (id) => ({
        id,
        name: "proof",
        expired: false,
        workflow_run: { head_sha: fixture.head },
      });
      const invalidListResponse = (key, createRecord, pageTwo) => {
        if (mode === "response_array") return jsonResponse([]);
        if (mode === "records_missing") return jsonResponse({ total_count: 0 });
        const records =
          mode === "page_change"
            ? pageTwo
              ? [createRecord(101)]
              : Array.from({ length: 100 }, (_item, index) =>
                  createRecord(index + 1),
                )
            : [createRecord(1)];
        const response = { [key]: records };
        if (mode === "malformed") response.total_count = "1";
        else if (mode === "negative") response.total_count = -1;
        else if (mode === "non_integer") response.total_count = 1.5;
        else if (mode === "unsafe")
          response.total_count = Number.MAX_SAFE_INTEGER + 1;
        else if (mode === "too_large") response.total_count = 2;
        else if (mode === "too_small") response.total_count = 0;
        else if (mode === "page_change")
          response.total_count = pageTwo ? 102 : 101;
        return jsonResponse(response);
      };
      const fetchImpl = async (url) => {
        const value = String(url);
        const pageTwo = value.includes("page=2");
        if (value.endsWith(`/${repository}`))
          return jsonResponse({ private: false, visibility: "public" });
        if (value.includes("/actions/runs?")) {
          if (kind === "run")
            return invalidListResponse("workflow_runs", run, pageTwo);
          return jsonResponse({
            total_count: kind === "job" ? 1 : 0,
            workflow_runs: kind === "job" ? [run(11)] : [],
          });
        }
        if (value.includes("/actions/runs/11/jobs"))
          return invalidListResponse("jobs", job, pageTwo);
        if (value.includes("/actions/artifacts?"))
          return invalidListResponse("artifacts", artifact, pageTwo);
        if (value.includes("/logs") || value.includes("/zip")) {
          contentRequests += 1;
          return bytesResponse("safe");
        }
        throw new Error(`unexpected test URL: ${value}`);
      };
      try {
        await expect(
          runPublicExposureAudit({
            cwd: fixture.repo,
            repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          }),
        ).rejects.toThrow(/BLOCKED:.*pagination/u);
        expect(contentRequests).toBe(0);
        await expect(readFile(fixture.output)).rejects.toThrow();
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it("accepts only the exact approved historical job with fresh bound runtime evidence", async () => {
    const fixture = await createAuditRepository(
      "public-audit-historical-happy-",
    );
    const { fetchImpl, seen } = approvedHistoricalFetch(fixture);
    try {
      const value = await runPublicExposureAudit({
        cwd: fixture.repo,
        repository: ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD.repository,
        targetCommit: fixture.head,
        phase: "candidate_ci",
        output: fixture.output,
        token: "test-token",
        fetchImpl,
      });
      expect(value.result).toBe("PASS");
      expect(value.scans.actions_run_logs).toBe(0);
      expect(value.provenance).toMatchObject({
        actions_job_inventory_count: 1,
        actions_required_job_log_count: 1,
        actions_job_log_retrieval_count: 0,
        actions_job_log_scan_count: 0,
        actions_historical_unavailable_count: 1,
        actions_historical_runtime_observation_count: 1,
        actions_scan_complete: false,
        actions_evidence_gate_pass: true,
      });
      expect(
        seen.some(
          (entry) =>
            entry.url.includes("/jobs?filter=all&per_page=100&page=1") &&
            entry.redirect === null,
        ),
      ).toBe(true);
      expect(
        seen.some(
          (entry) => entry.url.endsWith("/logs") && entry.redirect === "manual",
        ),
      ).toBe(true);
      expect(
        seen.some(
          (entry) =>
            entry.url.includes("runtime.example.invalid") &&
            entry.redirect === "manual",
        ),
      ).toBe(true);
      const rawPath = historicalRuntimeEvidencePath(fixture.output);
      expect(await readFile(rawPath)).toEqual(historicalRuntimeBody);
      const rawProof = await readActionsHistoricalRuntimeEvidence({
        path: rawPath,
        report: value,
      });
      expect(rawProof.validation).toEqual({
        ok: true,
        errors: [],
        side_effects: 0,
      });
      await writeFile(rawPath, Buffer.from("mutated raw response"));
      const mutated = await readActionsHistoricalRuntimeEvidence({
        path: rawPath,
        report: value,
      });
      expect(mutated.validation.ok).toBe(false);
      expect(mutated.validation.errors).toEqual(
        expect.arrayContaining([
          "public audit historical runtime raw SHA-256 mismatch",
          "public audit historical runtime raw byte count mismatch",
        ]),
      );
    } finally {
      await rm(fixture.root, { recursive: true });
    }
  });

  it.each([
    ["initial status mutation", "initial_status", /initial status/u],
    ["initial request failure", "request_failure", /request failure/u],
    ["missing redirect", "redirect_missing", /redirect failure/u],
    ["redirect request failure", "redirect_failure", /redirect failure/u],
    ["final 410", "final_410", /final status 410/u],
    ["final 403", "final_403", /final status 403/u],
    ["final 5xx", "final_500", /final status 500/u],
    ["final success instead of 404", "final_200", /final status 200/u],
    ["content type mutation", "content_type", /content type mismatch/u],
    ["BlobNotFound mutation", "error_code", /error code mismatch/u],
    ["empty response body", "empty_body", /response is empty/u],
    ["response body read failure", "body_failure", /response body failure/u],
  ])(
    "blocks an invalid mandatory runtime observation: %s",
    async (_label, mode, expected) => {
      const fixture = await createAuditRepository(
        "public-audit-historical-runtime-",
      );
      const { fetchImpl } = approvedHistoricalFetch(fixture, mode);
      try {
        await expect(
          runPublicExposureAudit({
            cwd: fixture.repo,
            repository: ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD.repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          }),
        ).rejects.toThrow(expected);
        await expect(readFile(fixture.output)).rejects.toThrow();
        await expect(
          readFile(historicalRuntimeEvidencePath(fixture.output)),
        ).rejects.toThrow();
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it.each([
    ["second unavailable job", "second_unavailable", /read failure 404/u],
    [
      "non-allowlisted historical job",
      "non_allowlisted_missing",
      /read failure 404/u,
    ],
    ["post-adoption missing job", "post_adoption_missing", /read failure 404/u],
    ["wrong static identity", "wrong_static_identity", /read failure 404/u],
    ["non-completed job", "non_completed", /job is not completed/u],
  ])(
    "keeps all non-approved unavailable evidence fail-closed: %s",
    async (_label, mode, expected) => {
      const fixture = await createAuditRepository(
        "public-audit-historical-closed-",
      );
      const { fetchImpl } = approvedHistoricalFetch(fixture, mode);
      try {
        await expect(
          runPublicExposureAudit({
            cwd: fixture.repo,
            repository: ACTIONS_HISTORICAL_APPROVED_POLICY_RECORD.repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          }),
        ).rejects.toThrow(expected);
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it.each([
    ["parent traversal", ["../secret.txt"], ["-rw-r--r-- entry"]],
    ["symlink", ["linked.txt"], ["lrwxrwxrwx entry"]],
    ["hardlink", ["linked.txt"], ["hrw-r--r-- entry"]],
    ["device", ["device"], ["brw-r--r-- entry"]],
    ["duplicate normalized path", ["a\\b", "a/b"], ["- entry", "- entry"]],
  ])(
    "rejects unsafe Actions archive entries: %s",
    (_label, names, metadata) => {
      const spawnImpl = (_command, args) => {
        if (args[0] === "-tf")
          return { status: 0, stdout: `${names.join("\n")}\n`, stderr: "" };
        if (args[0] === "-tvf")
          return {
            status: 0,
            stdout: `${metadata.join("\n")}\n`,
            stderr: "",
          };
        return { status: 0, stdout: Buffer.from("safe"), stderr: "" };
      };
      expect(() =>
        scanArtifactArchive(Buffer.from("archive"), "artifact.zip", {
          spawnImpl,
        }),
      ).toThrow(/BLOCKED/u);
    },
  );

  it("scans raw commit messages, removed history, every blob path, and ref names without leaking raw secrets", async () => {
    const root = await mkdtemp(join(tmpdir(), "public-audit-history-"));
    const repo = resolve(root, "repo");
    const output = resolve(root, "audit.json");
    const oldSecret = ["gh", "p_", "oldcommit", "A".repeat(30)].join("");
    const removedSecret = ["gh", "p_", "removed", "B".repeat(30)].join("");
    const refSecret = ["gh", "p_", "refname", "C".repeat(30)].join("");
    const runGit = (...args) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
    const fetchImpl = async (url) => {
      if (String(url).includes("/actions/runs"))
        return jsonResponse({ total_count: 0, workflow_runs: [] });
      if (String(url).includes("/actions/artifacts"))
        return jsonResponse({ total_count: 0, artifacts: [] });
      return jsonResponse({ private: false, visibility: "public" });
    };
    try {
      await mkdir(repo);
      runGit("init", "-b", "main");
      runGit("config", "user.name", "Audit Test");
      runGit("config", "user.email", "audit@example.invalid");
      await writeFile(resolve(repo, "credentials.json"), '{"safe":true}\n');
      runGit("add", "credentials.json");
      runGit("commit", "-m", `historical ${oldSecret}`);
      await rename(
        resolve(repo, "credentials.json"),
        resolve(repo, "safe.txt"),
      );
      await writeFile(resolve(repo, "removed.txt"), `${removedSecret}\n`);
      runGit("add", "-A");
      runGit("commit", "-m", "add historical bytes");
      await unlink(resolve(repo, "removed.txt"));
      runGit("add", "-A");
      runGit("commit", "-m", "remove historical bytes");
      const head = runGit("rev-parse", "HEAD");
      runGit("update-ref", `refs/heads/audit-${refSecret}`, head);

      const value = await runPublicExposureAudit({
        cwd: repo,
        repository,
        targetCommit: head,
        phase: "candidate_ci",
        output,
        token: "test-token",
        fetchImpl,
      });
      expect(value.result).toBe("FAIL");
      expect(value.scans.commit_objects).toBe(value.scans.reachable_commits);
      expect(value.scans.historical_path_associations).toBe(
        value.scans.tree_entries,
      );
      expect(
        value.findings_by_category.github_oauth_cloud_token,
      ).toBeGreaterThan(2);
      expect(
        value.findings_by_category.unintended_user_owned_file,
      ).toBeGreaterThan(0);
      const raw = await readFile(output, "utf8");
      expect(raw).not.toContain(oldSecret);
      expect(raw).not.toContain(removedSecret);
      expect(raw).not.toContain(refSecret);
    } finally {
      await rm(root, { recursive: true });
    }
  });

  it("fails closed when the Actions API cannot be read", async () => {
    const root = await mkdtemp(join(tmpdir(), "public-audit-api-"));
    const repo = resolve(root, "repo");
    try {
      await mkdir(repo);
      execFileSync("git", ["init", "-b", "main"], { cwd: repo });
      execFileSync("git", ["config", "user.name", "Audit Test"], {
        cwd: repo,
      });
      execFileSync("git", ["config", "user.email", "audit@example.invalid"], {
        cwd: repo,
      });
      await writeFile(resolve(repo, "safe.txt"), "safe\n");
      execFileSync("git", ["add", "safe.txt"], { cwd: repo });
      execFileSync("git", ["commit", "-m", "safe"], { cwd: repo });
      const head = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repo,
        encoding: "utf8",
      }).trim();
      await expect(
        runPublicExposureAudit({
          cwd: repo,
          repository,
          targetCommit: head,
          phase: "candidate_ci",
          output: resolve(root, "audit.json"),
          token: "test-token",
          fetchImpl: async () => jsonResponse({}, 403),
        }),
      ).rejects.toThrow("BLOCKED: GitHub API permission/read failure");
    } finally {
      await rm(root, { recursive: true });
    }
  });

  it.each([
    ["job log HTTP 404", "log", 404],
    ["job log HTTP 410", "log", 410],
    ["artifact ZIP HTTP 404", "artifact", 404],
    ["artifact ZIP HTTP 410", "artifact", 410],
  ])(
    "fails closed without a PASS report for %s",
    async (_label, kind, status) => {
      const fixture = await createAuditRepository("public-audit-missing-");
      const fetchImpl = async (url) => {
        const value = String(url);
        if (value.endsWith(`/${repository}`))
          return jsonResponse({ private: false, visibility: "public" });
        if (value.includes("/actions/runs?") && kind === "log")
          return jsonResponse({
            total_count: 1,
            workflow_runs: [
              {
                id: 11,
                head_sha: fixture.head,
                status: "completed",
                conclusion: "success",
                run_attempt: 1,
              },
            ],
          });
        if (value.includes("/actions/runs?") && kind === "artifact")
          return jsonResponse({ total_count: 0, workflow_runs: [] });
        if (value.includes("/actions/runs/11/jobs"))
          return jsonResponse({
            total_count: 1,
            jobs: [{ id: 21, status: "completed", conclusion: "success" }],
          });
        if (value.includes("/actions/jobs/21/logs"))
          return bytesResponse("", status);
        if (value.includes("/actions/artifacts?") && kind === "artifact")
          return jsonResponse({
            total_count: 1,
            artifacts: [
              {
                id: 31,
                name: "proof",
                expired: false,
                workflow_run: { head_sha: fixture.head },
              },
            ],
          });
        if (value.includes("/actions/artifacts?") && kind === "log")
          return jsonResponse({ total_count: 0, artifacts: [] });
        if (value.includes("/actions/artifacts/31/zip"))
          return bytesResponse("", status);
        throw new Error(`unexpected test URL: ${value}`);
      };
      try {
        await expect(
          runPublicExposureAudit({
            cwd: fixture.repo,
            repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          }),
        ).rejects.toThrow(new RegExp(`BLOCKED:.*${String(status)}`, "u"));
        await expect(readFile(fixture.output)).rejects.toThrow();
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it.each([
    ["HTTP 403", async () => bytesResponse("", 403), /read failure 403/u],
    ["HTTP 5xx", async () => bytesResponse("", 503), /read failure 503/u],
    [
      "redirect or request failure",
      async () => {
        throw new Error("redirect");
      },
      /request or redirect failure/u,
    ],
    [
      "response body failure",
      async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => {
          throw new Error("body");
        },
      }),
      /response body failure/u,
    ],
  ])(
    "fails closed for Actions content %s",
    async (_label, contentResponse, expected) => {
      const fixture = await createAuditRepository("public-audit-content-");
      const fetchImpl = async (url) => {
        const value = String(url);
        if (value.endsWith(`/${repository}`))
          return jsonResponse({ private: false, visibility: "public" });
        if (value.includes("/actions/runs?"))
          return jsonResponse({
            total_count: 1,
            workflow_runs: [
              {
                id: 11,
                head_sha: fixture.head,
                status: "completed",
                conclusion: "success",
                run_attempt: 1,
              },
            ],
          });
        if (value.includes("/actions/runs/11/jobs"))
          return jsonResponse({
            total_count: 1,
            jobs: [{ id: 21, status: "completed", conclusion: "success" }],
          });
        if (value.includes("/actions/artifacts?"))
          return jsonResponse({ total_count: 0, artifacts: [] });
        if (value.includes("/actions/jobs/21/logs")) return contentResponse();
        throw new Error(`unexpected test URL: ${value}`);
      };
      try {
        await expect(
          runPublicExposureAudit({
            cwd: fixture.repo,
            repository,
            targetCommit: fixture.head,
            phase: "candidate_ci",
            output: fixture.output,
            token: "test-token",
            fetchImpl,
          }),
        ).rejects.toThrow(expected);
        await expect(readFile(fixture.output)).rejects.toThrow();
      } finally {
        await rm(fixture.root, { recursive: true });
      }
    },
  );

  it("binds successful Actions inventory, retrieval, set hashes, and scan counts", async () => {
    const fixture = await createAuditRepository("public-audit-complete-");
    let artifactScans = 0;
    const fetchImpl = async (url) => {
      const value = String(url);
      if (value.endsWith(`/${repository}`))
        return jsonResponse({ private: false, visibility: "public" });
      if (value.includes("/actions/runs?"))
        return jsonResponse({
          total_count: 1,
          workflow_runs: [
            {
              id: 11,
              head_sha: fixture.head,
              status: "completed",
              conclusion: "success",
              run_attempt: 1,
            },
          ],
        });
      if (value.includes("/actions/runs/11/jobs"))
        return jsonResponse({
          total_count: 1,
          jobs: [{ id: 21, status: "completed", conclusion: "success" }],
        });
      if (value.includes("/actions/jobs/21/logs"))
        return bytesResponse("safe log\n");
      if (value.includes("/actions/artifacts?"))
        return jsonResponse({
          total_count: 1,
          artifacts: [
            {
              id: 31,
              name: "proof",
              expired: false,
              workflow_run: { head_sha: fixture.head },
            },
          ],
        });
      if (value.includes("/actions/artifacts/31/zip"))
        return bytesResponse("safe archive");
      throw new Error(`unexpected test URL: ${value}`);
    };
    try {
      const value = await runPublicExposureAudit({
        cwd: fixture.repo,
        repository,
        targetCommit: fixture.head,
        phase: "candidate_ci",
        output: fixture.output,
        token: "test-token",
        fetchImpl,
        scanArtifactImpl: () => {
          artifactScans += 1;
          return [];
        },
      });
      expect(value.result).toBe("PASS");
      expect(value.scans.actions_run_logs).toBe(1);
      expect(value.scans.actions_artifacts).toBe(1);
      expect(artifactScans).toBe(1);
      expect(value.provenance).toMatchObject({
        actions_inventory_identity_version:
          PUBLIC_AUDIT_ACTIONS_INVENTORY_IDENTITY_VERSION,
        actions_run_record_set_sha256: expect.stringMatching(/^[0-9A-F]{64}$/u),
        actions_job_record_set_sha256: expect.stringMatching(/^[0-9A-F]{64}$/u),
        actions_artifact_record_set_sha256:
          expect.stringMatching(/^[0-9A-F]{64}$/u),
        actions_run_inventory_count: 1,
        actions_job_inventory_count: 1,
        actions_required_job_log_count: 1,
        actions_job_log_retrieval_count: 1,
        actions_job_log_scan_count: 1,
        actions_artifact_inventory_count: 1,
        actions_artifact_retrieval_count: 1,
        actions_artifact_scan_count: 1,
        actions_scan_complete: true,
      });
      expect(
        validatePublicExposureAudit(value, {
          repository,
          targetCommit: fixture.head,
          phase: "candidate_ci",
          reportBytes: await readFile(fixture.output),
          expectedSha256: sha256(await readFile(fixture.output)),
        }).ok,
      ).toBe(true);
    } finally {
      await rm(fixture.root, { recursive: true });
    }
  });

  it("reads only an absolute regular non-link proof", async () => {
    const root = await mkdtemp(join(tmpdir(), "public-audit-proof-"));
    try {
      const path = resolve(root, "audit.json");
      const bytes = serializePublicAuditReport(report());
      await writeFile(path, bytes);
      const proof = await readAuditProof({
        path,
        expectedSha256: sha256(bytes),
        repository,
        targetCommit,
        phase: "release_preflight",
      });
      expect(proof.validation.ok).toBe(true);
      const targetDirectory = resolve(root, "target");
      await mkdir(targetDirectory);
      const target = resolve(targetDirectory, "linked.json");
      await writeFile(target, bytes);
      const linkedDirectory = resolve(root, "linked-directory");
      await symlink(targetDirectory, linkedDirectory, "junction");
      const linked = resolve(linkedDirectory, "linked.json");
      await expect(
        readAuditProof({
          path: linked,
          expectedSha256: sha256(bytes),
          repository,
          targetCommit,
          phase: "release_preflight",
        }),
      ).rejects.toThrow("must not traverse a link");
      expect(await readFile(path)).toEqual(bytes);
    } finally {
      await rm(root, { recursive: true });
    }
  });
});
