import {
  mkdtemp,
  link,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildDistribution,
  DISTRIBUTION_ALLOWLIST,
  verifyDistribution,
} from "../tools/distribution-lib.mjs";
import {
  classifyDistributionState,
  expectedDistributionIdentity,
} from "../tools/distribution-state.mjs";
import { evaluateDistributionPreflight } from "../tools/distribution-preflight-lib.mjs";
import { configurePages } from "../tools/configure-pages-lib.mjs";
import { evaluateCanonicalApproval } from "../tools/distribution-approval.mjs";
import { stageRelease } from "../tools/distribution-release.mjs";
import { verifyLiveRawBytes } from "../tools/verify-live-distribution.mjs";

const targetCommit = "a".repeat(40);
const ruleVerifiedAt = {
  takeHome: "2026-08-12",
  nisa: "2026-08-12",
  ideco: "2026-08-13",
};

const approvedCandidate = "b".repeat(40);
const approvedHandoff = "c".repeat(40);

function approvedCanonicalProof(target = targetCommit) {
  return {
    sourceCommit: target,
    relayBundle: {
      schema_version: 2,
      task_id: "TASK-009",
      branch: "codex/task-009-distribution",
      decision: "APPROVED",
      review_stage: "implementation",
      reviewed_candidate: approvedCandidate,
      reviewed_handoff_head: approvedHandoff,
      next_phase: "release",
      next_actor: "Codex",
      next_role: "IMPLEMENTER",
      route_result: {
        requested_ref: "refs/heads/codex/task-009-distribution",
        resolved_commit: approvedHandoff,
      },
    },
    taskText: `---\ntask_id: TASK-009\nstatus: approved\ncurrent_phase: release\ncurrent_role_id: IMPLEMENTER\nnext_actor: Codex\nnext_role: IMPLEMENTER\nhandoff_file: docs/ai/handoffs/TASK-009/RELEASE_HANDOFF.md\nimplementation_candidate: ${approvedCandidate}\nreviewed_candidate: ${approvedCandidate}\n---\n`,
    releaseHandoffText: `# RELAY HANDOFF — TASK-009\n\n- relay_schema: 2\n- task_id: TASK-009\n- decision: APPROVED\n- reviewed_candidate: ${approvedCandidate}\n- candidate_commit: ${approvedCandidate}\n- reviewed_handoff_head: ${approvedHandoff}\n- resolved_commit: ${approvedHandoff}\n- next_phase: release\n- next_actor: Codex\n- next_role: IMPLEMENTER\n`,
  };
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "配布 contract space "));
  const launcher = join(root, "Personal-Finance-Planner.html");
  await writeFile(launcher, Buffer.from("<!doctype html>\n<p>配布</p>\n"));
  return { root, launcher };
}

async function build(root, launcher, name) {
  return buildDistribution({
    version: "0.1.0",
    tag: "v0.1.0",
    targetCommit,
    rootLauncherPath: launcher,
    outputDirectory: join(root, name),
    ruleVerifiedAt,
  });
}

describe("deterministic distribution staging", () => {
  it("keeps package, lockfile, and UI metadata source-bound to 0.1.0", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
    const settingsSource = await readFile(
      "src/modules/settings/settings-view.ts",
      "utf8",
    );
    expect(packageJson.version).toBe("0.1.0");
    expect(packageLock.version).toBe("0.1.0");
    expect(packageLock.packages[""].version).toBe("0.1.0");
    expect(settingsSource).toContain("productMetadata");
    expect(settingsSource).not.toContain("2026-08-12");
    expect(settingsSource).not.toContain("2026-08-13");
  });

  it("generates the exact allowlist and byte-identical HTML twice", async () => {
    const { root, launcher } = await fixture();
    try {
      const first = await build(root, launcher, "first");
      const second = await build(root, launcher, "second");
      expect(first).toEqual(second);
      expect(first.paths).toEqual(DISTRIBUTION_ALLOWLIST);
      for (const path of DISTRIBUTION_ALLOWLIST) {
        expect(await readFile(join(root, "first", path))).toEqual(
          await readFile(join(root, "second", path)),
        );
      }
      expect(await readFile(join(root, "first", "index.html"))).toEqual(
        await readFile(launcher),
      );
      expect(
        await readFile(join(root, "first", "Personal-Finance-Planner.html")),
      ).toEqual(await readFile(launcher));
      expect(await readFile(join(root, "first", ".nojekyll"))).toHaveLength(0);
      const manifest = await readFile(
        join(root, "first", "release-manifest.json"),
      );
      const checksums = await readFile(join(root, "first", "SHA256SUMS.txt"));
      for (const bytes of [manifest, checksums]) {
        expect([...bytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
        expect(bytes.toString("utf8")).not.toContain("\r");
        expect(bytes.toString("utf8")).toMatch(/[^\n]\n$/);
      }
      const parsed = JSON.parse(manifest.toString("utf8"));
      expect(parsed).toMatchObject({
        version: "0.1.0",
        tag: "v0.1.0",
        target_commit: targetCommit,
        rule_verified_at: {
          take_home: "2026-08-12",
          nisa: "2026-08-12",
          ideco: "2026-08-13",
        },
        standalone: true,
        offline: true,
        no_backend: true,
        runtime_external_requests: 0,
        checksums: { self_reference_excluded: true },
      });
      expect(checksums.toString("utf8")).not.toContain("SHA256SUMS.txt");
      expect(checksums.toString("utf8")).toContain("index.html");
      expect(checksums.toString("utf8")).toContain(
        "Personal-Finance-Planner.html",
      );
    } finally {
      await rm(root, { recursive: true });
    }
  });

  it("rejects extra files, links, hard links, and output traversal", async () => {
    const { root, launcher } = await fixture();
    try {
      await build(root, launcher, "stage");
      await writeFile(join(root, "stage", "secret.env"), "secret");
      await expect(
        verifyDistribution({
          version: "0.1.0",
          tag: "v0.1.0",
          targetCommit,
          rootLauncherPath: launcher,
          outputDirectory: join(root, "stage"),
        }),
      ).rejects.toThrow("allowlist mismatch");

      const hardLinked = join(root, "hard", "Personal-Finance-Planner.html");
      await mkdir(join(root, "hard"));
      await link(launcher, hardLinked);
      await expect(build(root, hardLinked, "hard-stage")).rejects.toThrow(
        "hard-linked",
      );
      await rm(hardLinked);

      const realOutput = join(root, "real-output");
      await mkdir(realOutput);
      const junctionOutput = join(root, "junction-output");
      await symlink(realOutput, junctionOutput, "junction");
      await expect(build(root, launcher, "junction-output")).rejects.toThrow(
        "symlink or junction",
      );

      const launcherDirectory = join(root, "launcher-directory");
      await mkdir(launcherDirectory);
      await writeFile(
        join(launcherDirectory, "Personal-Finance-Planner.html"),
        "linked launcher",
      );
      const launcherJunction = join(root, "launcher-junction");
      await symlink(launcherDirectory, launcherJunction, "junction");
      await expect(
        build(
          root,
          join(launcherJunction, "Personal-Finance-Planner.html"),
          "linked-launcher-stage",
        ),
      ).rejects.toThrow("symlink or junction");

      const nested = join(root, "nested");
      await mkdir(nested);
      const nestedLauncher = join(nested, "Personal-Finance-Planner.html");
      await writeFile(nestedLauncher, "unsafe");
      await expect(
        buildDistribution({
          version: "0.1.0",
          tag: "v0.1.0",
          targetCommit,
          rootLauncherPath: nestedLauncher,
          outputDirectory: nested,
          ruleVerifiedAt,
        }),
      ).rejects.toThrow("inside the output directory");
    } finally {
      await rm(root, { recursive: true });
    }
  });
});

function identities() {
  return expectedDistributionIdentity({
    version: "0.1.0",
    targetCommit,
    artifacts: {
      launcher: {
        path: "Personal-Finance-Planner.html",
        sha256: "1",
        bytes: 1,
      },
      manifest: { path: "release-manifest.json", sha256: "2", bytes: 2 },
      checksums: { path: "SHA256SUMS.txt", sha256: "3", bytes: 3 },
    },
  });
}

describe("distribution state classification", () => {
  it("classifies every exact resumable state", () => {
    const expected = identities();
    const fresh = {
      tag: null,
      release: null,
      pages: null,
      otherTags: 0,
      otherReleases: 0,
    };
    expect(classifyDistributionState(fresh, expected).state).toBe("fresh");
    const tagOnly = { ...fresh, tag: expected.tag };
    expect(classifyDistributionState(tagOnly, expected).state).toBe(
      "exact_tag_only",
    );
    const draft = {
      ...tagOnly,
      release: {
        tag: expected.release.tag,
        targetCommit,
        title: expected.release.title,
        draft: true,
        prerelease: true,
        assets: [],
      },
    };
    expect(classifyDistributionState(draft, expected).state).toBe(
      "exact_draft_release",
    );
    const assets = {
      ...draft,
      release: { ...draft.release, assets: expected.release.assets },
    };
    expect(classifyDistributionState(assets, expected).state).toBe(
      "exact_release_assets",
    );
    const pages = { ...assets, pages: expected.pages };
    expect(classifyDistributionState(pages, expected).state).toBe(
      "exact_pages_deployed",
    );
    const published = { ...pages, release: { ...pages.release, draft: false } };
    expect(classifyDistributionState(published, expected).state).toBe(
      "exact_published",
    );
    const subset = {
      ...draft,
      release: {
        ...draft.release,
        assets: expected.release.assets.slice(0, 1),
      },
    };
    expect(classifyDistributionState(subset, expected)).toMatchObject({
      state: "exact_draft_release",
      resume_from: "release_assets",
      reason: "exact asset subset",
    });
  });

  it("stops on any mismatched or unexpected object without mutation", () => {
    const expected = identities();
    const actual = {
      tag: { ...expected.tag, targetCommit: "b".repeat(40) },
      release: null,
      pages: null,
      otherTags: 0,
      otherReleases: 0,
    };
    const before = structuredClone(actual);
    expect(classifyDistributionState(actual, expected)).toMatchObject({
      state: "conflicting",
      resume_from: "stop",
    });
    expect(actual).toEqual(before);
  });
});

function validPreflight() {
  const expectedState = identities();
  return {
    version: "0.1.0",
    packageVersion: "0.1.0",
    tag: "v0.1.0",
    releaseTitle: "Personal Finance Planner v0.1.0",
    targetCommit,
    originMain: targetCommit,
    mainCi: {
      headSha: targetCommit,
      headBranch: "main",
      event: "push",
      name: "Governance CI",
      conclusion: "success",
    },
    launcherFresh: true,
    requiredResults: true,
    stagingValid: true,
    manifestValid: true,
    repositoryPrivate: true,
    pagesConfigured: true,
    pagesSource: "workflow",
    pagesInputValid: true,
    canonicalApproval: approvedCanonicalProof(),
    actualState: {
      tag: null,
      release: null,
      pages: null,
      otherTags: 0,
      otherReleases: 0,
    },
    expectedState,
  };
}

describe("side-effect-free preflight", () => {
  it("accepts the exact fresh state", () => {
    expect(evaluateDistributionPreflight(validPreflight())).toMatchObject({
      ok: true,
      side_effects: 0,
      classification: { state: "fresh", resume_from: "tag" },
    });
  });

  it.each([
    ["version", "0.2.0"],
    ["targetCommit", "b".repeat(40)],
    ["originMain", "b".repeat(40)],
    ["launcherFresh", false],
    ["stagingValid", false],
    ["repositoryPrivate", false],
    ["pagesConfigured", false],
    ["pagesInputValid", false],
  ])("rejects wrong %s with zero side effects", (key, value) => {
    const input = validPreflight();
    input[key] = value;
    const result = evaluateDistributionPreflight(input);
    expect(result.ok).toBe(false);
    expect(result.side_effects).toBe(0);
  });

  it("rejects wrong CI and conflicting partial state with zero side effects", () => {
    const wrongCi = validPreflight();
    wrongCi.mainCi = { ...wrongCi.mainCi, conclusion: "failure" };
    expect(evaluateDistributionPreflight(wrongCi)).toMatchObject({
      ok: false,
      side_effects: 0,
    });
    const conflicting = validPreflight();
    conflicting.actualState = {
      ...conflicting.actualState,
      tag: { name: "v0.1.0", targetCommit: "b".repeat(40) },
    };
    expect(evaluateDistributionPreflight(conflicting)).toMatchObject({
      ok: false,
      side_effects: 0,
      classification: { state: "conflicting", resume_from: "stop" },
    });
  });
});

describe("canonical APPROVED release proof", () => {
  it("requires target-tree proof instead of caller SHA self-attestation", () => {
    const proof = approvedCanonicalProof();
    expect(evaluateCanonicalApproval(proof)).toMatchObject({ ok: true });

    const forged = {
      ...proof,
      sourceCommit: undefined,
    };
    expect(evaluateCanonicalApproval(forged)).toMatchObject({ ok: false });

    const wrongCandidate = approvedCanonicalProof();
    wrongCandidate.taskText = wrongCandidate.taskText.replace(
      approvedCandidate,
      "d".repeat(40),
    );
    expect(evaluateCanonicalApproval(wrongCandidate)).toMatchObject({
      ok: false,
    });
  });

  it.each([
    ["missing relay", { relayBundle: null }],
    [
      "changes requested decision",
      { relayBundle: { decision: "CHANGES_REQUESTED" } },
    ],
    [
      "wrong phase",
      {
        taskText:
          "---\ntask_id: TASK-009\nstatus: approved\ncurrent_phase: implementation\n---\n",
      },
    ],
    ["missing release handoff", { releaseHandoffText: null }],
  ])("rejects %s with no publication allowance", (_label, override) => {
    const proof = { ...approvedCanonicalProof(), ...override };
    expect(
      evaluateDistributionPreflight({
        ...validPreflight(),
        canonicalApproval: proof,
      }),
    ).toMatchObject({ ok: false, side_effects: 0 });
  });
});

describe("release staging reruns", () => {
  function stageAudit(state) {
    const expectedState = identities();
    return {
      expected_state: expectedState,
      preflight: { classification: { state } },
    };
  }

  function releaseWithAssets({ draft = true } = {}) {
    const expected = identities();
    return {
      tag_name: expected.release.tag,
      name: expected.release.title,
      draft,
      prerelease: true,
      id: 10,
      upload_url: "https://uploads.invalid/releases/10/assets{?name,label}",
      assets: expected.release.assets.map((asset) => ({
        name: asset.path,
        size: asset.bytes,
        digest: `sha256:${asset.sha256}`,
      })),
    };
  }

  it.each([
    "fresh",
    "exact_tag_only",
    "exact_draft_release",
    "exact_release_assets",
    "exact_pages_deployed",
  ])("stages %s through the existing resumable path", async (state) => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ object: { type: "commit", sha: targetCommit } })
      .mockResolvedValueOnce(releaseWithAssets());
    const api = {
      get,
      post: vi.fn().mockResolvedValue({
        object: { type: "commit", sha: targetCommit },
        ...releaseWithAssets(),
      }),
    };
    const result = await stageRelease({
      api,
      token: "test",
      repository: "owner/repo",
      version: "0.1.0",
      target: targetCommit,
      audit: stageAudit(state),
      staging: ".",
      releaseNotesPath: "package.json",
      uploadAssetImpl: vi.fn(),
    });
    expect(result.ok).toBe(true);
  });

  it("makes exact_published a fully revalidated side-effect-free no-op", async () => {
    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          object: { type: "commit", sha: targetCommit },
        })
        .mockResolvedValueOnce(releaseWithAssets({ draft: false })),
      post: vi.fn(),
      patch: vi.fn(),
    };
    const result = await stageRelease({
      api,
      token: "test",
      repository: "owner/repo",
      version: "0.1.0",
      target: targetCommit,
      audit: stageAudit("exact_published"),
      staging: ".",
      releaseNotesPath: "package.json",
    });
    expect(result).toEqual({
      ok: true,
      state: "exact_published",
      side_effects: 0,
      no_op: true,
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("live raw distribution evidence", () => {
  function liveFixture() {
    const files = new Map(
      DISTRIBUTION_ALLOWLIST.map((path) => [
        path,
        path === ".nojekyll" ? Buffer.alloc(0) : Buffer.from(`${path}\n`),
      ]),
    );
    const fetchImpl = vi.fn(async (url) => {
      const path = new URL(url).pathname.split("/").pop();
      const bytes = files.get(path);
      return {
        ok: bytes !== undefined,
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      };
    });
    const readFileImpl = vi.fn(async (path) => {
      const name = String(path).split(/[\\/]/u).pop();
      return files.get(name);
    });
    return { files, fetchImpl, readFileImpl };
  }

  it("verifies all five allowlisted paths including empty .nojekyll", async () => {
    const fixture = liveFixture();
    const evidence = await verifyLiveRawBytes({
      baseUrl: "https://pages.invalid/site",
      staging: "staging",
      fetchImpl: fixture.fetchImpl,
      readFileImpl: fixture.readFileImpl,
    });
    expect(evidence.map((entry) => entry.path)).toEqual(DISTRIBUTION_ALLOWLIST);
    expect(evidence.find((entry) => entry.path === ".nojekyll")).toMatchObject({
      bytes: 0,
    });
    expect(fixture.fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("rejects missing or non-empty .nojekyll", async () => {
    const missing = liveFixture();
    missing.files.delete(".nojekyll");
    await expect(
      verifyLiveRawBytes({
        baseUrl: "https://pages.invalid/site",
        staging: "staging",
        fetchImpl: missing.fetchImpl,
        readFileImpl: missing.readFileImpl,
      }),
    ).rejects.toThrow("live file is unavailable: .nojekyll");

    const nonEmpty = liveFixture();
    nonEmpty.files.set(".nojekyll", Buffer.from("jekyll"));
    await expect(
      verifyLiveRawBytes({
        baseUrl: "https://pages.invalid/site",
        staging: "staging",
        fetchImpl: nonEmpty.fetchImpl,
        readFileImpl: nonEmpty.readFileImpl,
      }),
    ).rejects.toThrow("live .nojekyll must be an empty file");
  });
});

describe("guarded Pages setup", () => {
  it("is dry-run by default and applies only after all exact reads", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ private: true })
      .mockResolvedValueOnce({ commit: { sha: targetCommit } })
      .mockResolvedValueOnce({
        head_sha: targetCommit,
        head_branch: "main",
        event: "push",
        name: "Governance CI",
        conclusion: "success",
      })
      .mockResolvedValueOnce(null);
    const post = vi.fn();
    const dryRun = await configurePages({
      api: { get, post },
      repository: "owner/repo",
      targetSha: targetCommit,
      mainCiRunId: 123,
      approvedReleaseHead: targetCommit,
      canonicalApproval: approvedCanonicalProof(),
    });
    expect(dryRun).toMatchObject({ ok: true, applied: false, side_effects: 0 });
    expect(post).not.toHaveBeenCalled();

    get.mockReset();
    get
      .mockResolvedValueOnce({ private: true })
      .mockResolvedValueOnce({ commit: { sha: targetCommit } })
      .mockResolvedValueOnce({
        head_sha: targetCommit,
        head_branch: "main",
        event: "push",
        name: "Governance CI",
        conclusion: "success",
      })
      .mockResolvedValueOnce(null);
    post.mockResolvedValue({ build_type: "workflow", cname: null });
    const applied = await configurePages({
      api: { get, post },
      repository: "owner/repo",
      targetSha: targetCommit,
      mainCiRunId: 123,
      approvedReleaseHead: targetCommit,
      canonicalApproval: approvedCanonicalProof(),
      apply: true,
    });
    expect(applied).toMatchObject({ ok: true, applied: true, side_effects: 1 });
    expect(post).toHaveBeenCalledOnce();
  });

  it("does not apply when main or CI identity differs", async () => {
    const post = vi.fn();
    const get = vi
      .fn()
      .mockResolvedValueOnce({ private: true })
      .mockResolvedValueOnce({ commit: { sha: "b".repeat(40) } })
      .mockResolvedValueOnce({ conclusion: "failure" })
      .mockResolvedValueOnce(null);
    const result = await configurePages({
      api: { get, post },
      repository: "owner/repo",
      targetSha: targetCommit,
      mainCiRunId: 123,
      approvedReleaseHead: targetCommit,
      canonicalApproval: approvedCanonicalProof(),
      apply: true,
    });
    expect(result.ok).toBe(false);
    expect(result.side_effects).toBe(0);
    expect(post).not.toHaveBeenCalled();
  });
});
