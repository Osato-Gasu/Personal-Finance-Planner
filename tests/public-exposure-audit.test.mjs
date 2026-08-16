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
  PUBLIC_AUDIT_REQUIRED_SCANS,
  PUBLIC_AUDIT_SCAN_METHOD,
  buildPublicAuditReport,
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
