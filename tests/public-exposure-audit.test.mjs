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
  buildStableInventory,
  buildPublicAuditReport,
  canonicalMetadataRecord,
  canonicalPositiveIntegerId,
  readAuditProof,
  scanPublicBytes,
  serializePublicAuditReport,
  sha256,
  validatePublicExposureAudit,
} from "../tools/public-exposure-audit-lib.mjs";
import {
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
  repository_scan_complete: true,
  actions_scan_complete: true,
};

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}

function bytesResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => Buffer.from(value),
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
              workflow_runs: Array.from({ length: 100 }, (_item, index) =>
                run(index + 1),
              ),
            });
          return jsonResponse({
            workflow_runs: [
              { ...run(1), status: conflict ? secret : "completed" },
            ],
          });
        }
        if (value.includes("/actions/runs?"))
          return jsonResponse({
            workflow_runs: kind === "job" ? [run(11)] : [],
          });
        if (value.includes("/actions/runs/11/jobs")) {
          if (!pageTwo)
            return jsonResponse({
              jobs: Array.from({ length: 100 }, (_item, index) =>
                job(index + 1),
              ),
            });
          return jsonResponse({
            jobs: [{ ...job(1), status: conflict ? secret : "completed" }],
          });
        }
        if (value.includes("/actions/artifacts?")) {
          if (kind !== "artifact") return jsonResponse({ artifacts: [] });
          if (!pageTwo)
            return jsonResponse({
              artifacts: Array.from({ length: 100 }, (_item, index) =>
                artifact(index + 1),
              ),
            });
          return jsonResponse({
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
        return jsonResponse({ workflow_runs: [] });
      if (String(url).includes("/actions/artifacts"))
        return jsonResponse({ artifacts: [] });
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
          return jsonResponse({ workflow_runs: [] });
        if (value.includes("/actions/runs/11/jobs"))
          return jsonResponse({
            jobs: [{ id: 21, status: "completed", conclusion: "success" }],
          });
        if (value.includes("/actions/jobs/21/logs"))
          return bytesResponse("", status);
        if (value.includes("/actions/artifacts?") && kind === "artifact")
          return jsonResponse({
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
          return jsonResponse({ artifacts: [] });
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
            jobs: [{ id: 21, status: "completed", conclusion: "success" }],
          });
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
          jobs: [{ id: 21, status: "completed", conclusion: "success" }],
        });
      if (value.includes("/actions/jobs/21/logs"))
        return bytesResponse("safe log\n");
      if (value.includes("/actions/artifacts?"))
        return jsonResponse({
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
