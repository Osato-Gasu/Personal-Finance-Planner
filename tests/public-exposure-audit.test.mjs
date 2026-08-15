import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_AUDIT_CATEGORIES,
  PUBLIC_AUDIT_REQUIRED_SCANS,
  buildPublicAuditReport,
  readAuditProof,
  scanPublicBytes,
  serializePublicAuditReport,
  sha256,
  validatePublicExposureAudit,
} from "../tools/public-exposure-audit-lib.mjs";

const repository = "owner/repo";
const targetCommit = "a".repeat(40);

function report(overrides = {}) {
  return buildPublicAuditReport({
    repository,
    targetCommit,
    repositoryVisibility: "public",
    phase: "release_preflight",
    scans: Object.fromEntries(
      PUBLIC_AUDIT_REQUIRED_SCANS.map((name) => [name, 1]),
    ),
    findings: [],
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
