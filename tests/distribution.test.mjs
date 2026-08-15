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
import { basename, join } from "node:path";
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
import {
  DISTRIBUTION_RELEASE_IMPORT_PATHS,
  evaluateCanonicalApproval,
} from "../tools/distribution-approval.mjs";
import { GitHubApiError } from "../tools/github-distribution-api.mjs";
import {
  publishRelease,
  stageRelease,
} from "../tools/distribution-release.mjs";
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
    commitMetadata: {
      target: { sha: target, parents: [approvedHandoff] },
      reviewedHandoff: {
        sha: approvedHandoff,
        parents: [approvedCandidate],
      },
      diff: {
        base: approvedHandoff,
        target,
        changedPaths: [...DISTRIBUTION_RELEASE_IMPORT_PATHS],
      },
    },
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
    expect(settingsSource).toContain(
      "repository ${productMetadata.repositoryVisibility}",
    );
    expect(settingsSource).toContain("runtime external requests");
    expect(settingsSource).toContain("別origin・別storage");
    expect(settingsSource).not.toContain('type: "set-product-metadata"');
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
        sha256: "1".repeat(64),
        bytes: 1,
      },
      manifest: {
        path: "release-manifest.json",
        sha256: "2".repeat(64),
        bytes: 2,
      },
      checksums: {
        path: "SHA256SUMS.txt",
        sha256: "3".repeat(64),
        bytes: 3,
      },
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
    repositoryPrivate: false,
    repositoryVisibility: "public",
    publicAudit: { ok: true, errors: [], side_effects: 0 },
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
    ["repositoryPrivate", true],
    ["repositoryVisibility", "private"],
    ["publicAudit", { ok: false, errors: ["finding"], side_effects: 0 }],
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
  it("accepts only the exact single-parent governance release-import head", () => {
    const proof = approvedCanonicalProof();
    expect(evaluateCanonicalApproval(proof)).toMatchObject({
      ok: true,
      release_import_paths: DISTRIBUTION_RELEASE_IMPORT_PATHS,
    });

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
    [
      "unreviewed descendant",
      (proof) => {
        proof.commitMetadata.target.parents = ["d".repeat(40)];
      },
    ],
    [
      "wrong parent",
      (proof) => {
        proof.commitMetadata.target.parents = [approvedCandidate];
      },
    ],
    [
      "merge commit",
      (proof) => {
        proof.commitMetadata.target.parents = [approvedHandoff, "d".repeat(40)];
      },
    ],
    [
      "production-mixed release import",
      (proof) => {
        proof.commitMetadata.diff.changedPaths.push("src/main.ts");
      },
    ],
    [
      "wrong candidate parent",
      (proof) => {
        proof.commitMetadata.reviewedHandoff.parents = ["d".repeat(40)];
      },
    ],
    [
      "missing commit metadata",
      (proof) => {
        proof.commitMetadata = undefined;
      },
    ],
  ])("rejects %s with side-effect-free preflight", (_label, mutate) => {
    const proof = approvedCanonicalProof();
    mutate(proof);
    expect(evaluateCanonicalApproval(proof).ok).toBe(false);
    expect(
      evaluateDistributionPreflight({
        ...validPreflight(),
        canonicalApproval: proof,
      }),
    ).toMatchObject({ ok: false, side_effects: 0 });
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

  function releaseWithAssets({ draft = true, assets } = {}) {
    const expected = identities();
    return {
      tag_name: expected.release.tag,
      name: expected.release.title,
      draft,
      prerelease: true,
      id: 10,
      upload_url:
        "https://uploads.github.com/repos/owner/repo/releases/10/assets{?name,label}",
      assets: (assets ?? expected.release.assets).map((asset) => ({
        name: asset.path,
        size: asset.bytes,
        digest: `sha256:${asset.sha256}`,
      })),
    };
  }

  function stagingFixture({ tagExists, releaseExists, assets = [] }) {
    const events = [];
    const tagUrl =
      "https://api.github.com/repos/owner/repo/git/ref/tags/v0.1.0";
    const releaseUrl =
      "https://api.github.com/repos/owner/repo/releases/tags/v0.1.0";
    let hasTag = tagExists;
    let hasRelease = releaseExists;
    const api = {
      get: vi.fn(async (url) => {
        events.push({ method: "GET", url });
        if (url === tagUrl) {
          if (!hasTag) throw new GitHubApiError(404, "not found");
          return { object: { type: "commit", sha: targetCommit } };
        }
        if (url === releaseUrl) {
          if (!hasRelease) throw new GitHubApiError(404, "not found");
          return releaseWithAssets({ assets });
        }
        throw new Error(`unexpected GET: ${url}`);
      }),
      post: vi.fn(async (url, body) => {
        events.push({ method: "POST", url, body });
        if (url.endsWith("/git/refs")) {
          hasTag = true;
          return { object: { type: "commit", sha: targetCommit } };
        }
        if (url.endsWith("/releases")) {
          hasRelease = true;
          return releaseWithAssets({ assets: [] });
        }
        throw new Error(`unexpected POST: ${url}`);
      }),
      patch: vi.fn(async (url, body) => {
        events.push({ method: "PATCH", url, body });
        throw new Error(`unexpected PATCH: ${url}`);
      }),
    };
    const uploadAssetImpl = vi.fn(async (input) => {
      events.push({
        method: "UPLOAD",
        url: `${input.uploadUrl.replace("{?name,label}", "")}?name=${encodeURIComponent(basename(input.path))}`,
        path: basename(input.path),
      });
    });
    return { api, events, uploadAssetImpl };
  }

  it.each([
    {
      label: "fresh",
      state: "fresh",
      tagExists: false,
      releaseExists: false,
      assets: [],
      writes: 5,
      operations: [
        "create_tag",
        "create_draft_release",
        "upload_asset",
        "upload_asset",
        "upload_asset",
      ],
      methods: [
        "GET",
        "GET",
        "POST",
        "GET",
        "POST",
        "UPLOAD",
        "UPLOAD",
        "UPLOAD",
      ],
    },
    {
      label: "exact_tag_only",
      state: "exact_tag_only",
      tagExists: true,
      releaseExists: false,
      assets: [],
      writes: 4,
      operations: [
        "create_draft_release",
        "upload_asset",
        "upload_asset",
        "upload_asset",
      ],
      methods: ["GET", "GET", "POST", "UPLOAD", "UPLOAD", "UPLOAD"],
    },
    {
      label: "exact_draft_release",
      state: "exact_draft_release",
      tagExists: true,
      releaseExists: true,
      assets: [],
      writes: 3,
      operations: ["upload_asset", "upload_asset", "upload_asset"],
      methods: ["GET", "GET", "UPLOAD", "UPLOAD", "UPLOAD"],
    },
    {
      label: "exact_asset_subset",
      state: "exact_draft_release",
      tagExists: true,
      releaseExists: true,
      assets: identities().release.assets.slice(0, 1),
      writes: 2,
      operations: ["upload_asset", "upload_asset"],
      methods: ["GET", "GET", "UPLOAD", "UPLOAD"],
    },
    {
      label: "exact_release_assets",
      state: "exact_release_assets",
      tagExists: true,
      releaseExists: true,
      assets: identities().release.assets,
      writes: 0,
      operations: [],
      methods: ["GET", "GET"],
    },
    {
      label: "exact_pages_deployed",
      state: "exact_pages_deployed",
      tagExists: true,
      releaseExists: true,
      assets: identities().release.assets,
      writes: 0,
      operations: [],
      methods: ["GET", "GET"],
    },
  ])("stages $label through its state-specific API path", async (testCase) => {
    const fixture = stagingFixture(testCase);
    const result = await stageRelease({
      api: fixture.api,
      token: "test",
      repository: "owner/repo",
      version: "0.1.0",
      target: targetCommit,
      audit: stageAudit(testCase.state),
      staging: ".",
      releaseNotesPath: "package.json",
      uploadAssetImpl: fixture.uploadAssetImpl,
    });
    expect(result).toMatchObject({
      ok: true,
      state: "exact_release_assets",
      side_effects: testCase.writes,
      no_op: false,
    });
    expect(result.operations.map((entry) => entry.operation)).toEqual(
      testCase.operations,
    );
    expect(fixture.events.map((entry) => entry.method)).toEqual(
      testCase.methods,
    );
    expect(fixture.api.patch).not.toHaveBeenCalled();
    expect(fixture.uploadAssetImpl).toHaveBeenCalledTimes(
      testCase.operations.filter((operation) => operation === "upload_asset")
        .length,
    );
    for (const operation of result.operations) {
      expect(operation.url).toMatch(
        /^https:\/\/(?:api|uploads)\.github\.com\//u,
      );
      if (operation.operation === "upload_asset") {
        const expected = identities().release.assets.find(
          (asset) => asset.path === operation.path,
        );
        expect(operation).toMatchObject(expected);
      }
    }
    if (testCase.operations.includes("create_tag"))
      expect(fixture.api.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/repo/git/refs",
        { ref: "refs/tags/v0.1.0", sha: targetCommit },
      );
    if (testCase.operations.includes("create_draft_release"))
      expect(fixture.api.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/owner/repo/releases",
        expect.objectContaining({
          tag_name: "v0.1.0",
          target_commitish: targetCommit,
          name: "Personal Finance Planner v0.1.0",
          draft: true,
          prerelease: true,
        }),
      );
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
      operations: [],
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/owner/repo/git/ref/tags/v0.1.0",
    );
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/owner/repo/releases/tags/v0.1.0",
    );
  });

  it("publishes only the exact Pages-deployed draft with one audited PATCH", async () => {
    const expected = identities();
    const tagUrl =
      "https://api.github.com/repos/owner/repo/git/ref/tags/v0.1.0";
    const releaseUrl =
      "https://api.github.com/repos/owner/repo/releases/tags/v0.1.0";
    const patchUrl = "https://api.github.com/repos/owner/repo/releases/10";
    const events = [];
    const api = {
      get: vi.fn(async (url) => {
        events.push({ method: "GET", url });
        if (url === tagUrl)
          return { object: { type: "commit", sha: targetCommit } };
        if (url === releaseUrl) return releaseWithAssets();
        throw new Error(`unexpected GET: ${url}`);
      }),
      post: vi.fn(),
      patch: vi.fn(async (url, body) => {
        events.push({ method: "PATCH", url, body });
        return { draft: false, prerelease: true };
      }),
    };
    const result = await publishRelease({
      api,
      repository: "owner/repo",
      version: "0.1.0",
      target: targetCommit,
      audit: {
        expected_state: expected,
        preflight: { classification: { state: "exact_pages_deployed" } },
      },
    });
    expect(events).toEqual([
      { method: "GET", url: tagUrl },
      { method: "GET", url: releaseUrl },
      {
        method: "PATCH",
        url: patchUrl,
        body: { draft: false, prerelease: true },
      },
    ]);
    expect(api.post).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      state: "exact_published",
      side_effects: 1,
      no_op: false,
      operations: [
        {
          operation: "publish_release",
          url: patchUrl,
          release_id: 10,
          tag: "v0.1.0",
          target_commit: targetCommit,
        },
      ],
    });
  });

  it.each([
    [
      "extra asset",
      (release) =>
        release.assets.push({
          name: "extra.txt",
          size: 1,
          digest: `sha256:${"a".repeat(64)}`,
        }),
    ],
    [
      "duplicate asset",
      (release) => release.assets.push({ ...release.assets[0] }),
    ],
    [
      "wrong digest",
      (release) => {
        release.assets[0].digest = `sha256:${"f".repeat(64)}`;
      },
    ],
    [
      "wrong bytes",
      (release) => {
        release.assets[0].size += 1;
      },
    ],
    [
      "malformed digest",
      (release) => {
        release.assets[0].digest = "sha256:missing";
      },
    ],
    [
      "malformed bytes",
      (release) => {
        release.assets[0].size = "1";
      },
    ],
    [
      "release title change",
      (release) => {
        release.name = "changed";
      },
    ],
    [
      "release draft change",
      (release) => {
        release.draft = false;
      },
    ],
  ])("stops stage before every write on %s", async (_label, mutate) => {
    const release = releaseWithAssets({
      assets: identities().release.assets.slice(0, 1),
    });
    mutate(release);
    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          object: { type: "commit", sha: targetCommit },
        })
        .mockResolvedValueOnce(release),
      post: vi.fn(),
      patch: vi.fn(),
    };
    const uploadAssetImpl = vi.fn();
    await expect(
      stageRelease({
        api,
        token: "test",
        repository: "owner/repo",
        version: "0.1.0",
        target: targetCommit,
        audit: stageAudit("exact_draft_release"),
        staging: ".",
        releaseNotesPath: "package.json",
        uploadAssetImpl,
      }),
    ).rejects.toThrow();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(uploadAssetImpl).not.toHaveBeenCalled();
  });

  it.each([
    [
      "fresh tag appeared",
      "fresh",
      { object: { type: "commit", sha: targetCommit } },
      null,
    ],
    [
      "fresh release appeared",
      "fresh",
      null,
      releaseWithAssets({ assets: [] }),
    ],
    [
      "tag target changed",
      "exact_draft_release",
      { object: { type: "commit", sha: "d".repeat(40) } },
      releaseWithAssets({ assets: [] }),
    ],
    [
      "stale full subset",
      "exact_draft_release",
      { object: { type: "commit", sha: targetCommit } },
      releaseWithAssets(),
    ],
  ])(
    "rejects stale preflight state: %s",
    async (_label, state, tagValue, releaseValue) => {
      const api = {
        get: vi
          .fn()
          .mockResolvedValueOnce(tagValue)
          .mockResolvedValueOnce(releaseValue),
        post: vi.fn(),
        patch: vi.fn(),
      };
      const uploadAssetImpl = vi.fn();
      await expect(
        stageRelease({
          api,
          token: "test",
          repository: "owner/repo",
          version: "0.1.0",
          target: targetCommit,
          audit: stageAudit(state),
          staging: ".",
          releaseNotesPath: "package.json",
          uploadAssetImpl,
        }),
      ).rejects.toThrow();
      expect(api.post).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
      expect(uploadAssetImpl).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "missing asset",
      (release) => {
        release.assets.pop();
      },
    ],
    [
      "extra asset",
      (release) =>
        release.assets.push({
          name: "extra.txt",
          size: 1,
          digest: `sha256:${"a".repeat(64)}`,
        }),
    ],
    [
      "duplicate asset",
      (release) => release.assets.push({ ...release.assets[0] }),
    ],
    [
      "wrong digest",
      (release) => {
        release.assets[0].digest = `sha256:${"f".repeat(64)}`;
      },
    ],
    [
      "wrong bytes",
      (release) => {
        release.assets[0].size += 1;
      },
    ],
    [
      "release title",
      (release) => {
        release.name = "changed";
      },
    ],
    [
      "draft",
      (release) => {
        release.draft = false;
      },
    ],
    [
      "prerelease",
      (release) => {
        release.prerelease = false;
      },
    ],
  ])("stops publish with PATCH 0 on %s", async (_label, mutate) => {
    const release = releaseWithAssets();
    mutate(release);
    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          object: { type: "commit", sha: targetCommit },
        })
        .mockResolvedValueOnce(release),
      post: vi.fn(),
      patch: vi.fn(),
    };
    await expect(
      publishRelease({
        api,
        repository: "owner/repo",
        version: "0.1.0",
        target: targetCommit,
        audit: {
          expected_state: identities(),
          preflight: { classification: { state: "exact_pages_deployed" } },
        },
      }),
    ).rejects.toThrow();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("stops publish when the tag target changes before PATCH", async () => {
    const api = {
      get: vi.fn().mockResolvedValueOnce({
        object: { type: "commit", sha: "d".repeat(40) },
      }),
      post: vi.fn(),
      patch: vi.fn(),
    };
    await expect(
      publishRelease({
        api,
        repository: "owner/repo",
        version: "0.1.0",
        target: targetCommit,
        audit: {
          expected_state: identities(),
          preflight: { classification: { state: "exact_pages_deployed" } },
        },
      }),
    ).rejects.toThrow("tag target changed");
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("rejects conflicting state before every API write", async () => {
    const fixture = stagingFixture({
      tagExists: true,
      releaseExists: true,
      assets: identities().release.assets,
    });
    await expect(
      stageRelease({
        api: fixture.api,
        token: "test",
        repository: "owner/repo",
        version: "0.1.0",
        target: targetCommit,
        audit: stageAudit("conflicting"),
        staging: ".",
        releaseNotesPath: "package.json",
        uploadAssetImpl: fixture.uploadAssetImpl,
      }),
    ).rejects.toThrow("preflight state does not permit release staging");
    expect(fixture.events).toEqual([]);
    expect(fixture.api.post).not.toHaveBeenCalled();
    expect(fixture.api.patch).not.toHaveBeenCalled();
    expect(fixture.uploadAssetImpl).not.toHaveBeenCalled();
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
      .mockResolvedValueOnce({ private: false, visibility: "public" })
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
      publicAudit: { ok: true, errors: [], side_effects: 0 },
    });
    expect(dryRun).toMatchObject({ ok: true, applied: false, side_effects: 0 });
    expect(post).not.toHaveBeenCalled();

    get.mockReset();
    get
      .mockResolvedValueOnce({ private: false, visibility: "public" })
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
      publicAudit: { ok: true, errors: [], side_effects: 0 },
      apply: true,
    });
    expect(applied).toMatchObject({ ok: true, applied: true, side_effects: 1 });
    expect(post).toHaveBeenCalledOnce();
  });

  it("does not apply when main or CI identity differs", async () => {
    const post = vi.fn();
    const get = vi
      .fn()
      .mockResolvedValueOnce({ private: false, visibility: "public" })
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
      publicAudit: { ok: true, errors: [], side_effects: 0 },
      apply: true,
    });
    expect(result.ok).toBe(false);
    expect(result.side_effects).toBe(0);
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    [
      "private repository",
      { private: true, visibility: "private" },
      { ok: true, errors: [] },
    ],
    ["missing audit", { private: false, visibility: "public" }, undefined],
    [
      "failed audit",
      { private: false, visibility: "public" },
      { ok: false, errors: ["finding"] },
    ],
  ])(
    "rejects %s with no Pages write",
    async (_label, repositoryState, publicAudit) => {
      const post = vi.fn();
      const get = vi
        .fn()
        .mockResolvedValueOnce(repositoryState)
        .mockResolvedValueOnce({ commit: { sha: targetCommit } })
        .mockResolvedValueOnce({
          head_sha: targetCommit,
          head_branch: "main",
          event: "push",
          name: "Governance CI",
          conclusion: "success",
        })
        .mockResolvedValueOnce(null);
      const result = await configurePages({
        api: { get, post },
        repository: "owner/repo",
        targetSha: targetCommit,
        mainCiRunId: 123,
        approvedReleaseHead: targetCommit,
        canonicalApproval: approvedCanonicalProof(),
        publicAudit,
        apply: true,
      });
      expect(result).toMatchObject({ ok: false, side_effects: 0 });
      expect(post).not.toHaveBeenCalled();
    },
  );

  it("rejects the same production-mixed canonical proof before Pages writes", async () => {
    const proof = approvedCanonicalProof();
    proof.commitMetadata.diff.changedPaths.push("tools/unreviewed.mjs");
    const post = vi.fn();
    const get = vi
      .fn()
      .mockResolvedValueOnce({ private: false, visibility: "public" })
      .mockResolvedValueOnce({ commit: { sha: targetCommit } })
      .mockResolvedValueOnce({
        head_sha: targetCommit,
        head_branch: "main",
        event: "push",
        name: "Governance CI",
        conclusion: "success",
      })
      .mockResolvedValueOnce(null);
    const result = await configurePages({
      api: { get, post },
      repository: "owner/repo",
      targetSha: targetCommit,
      mainCiRunId: 123,
      approvedReleaseHead: targetCommit,
      canonicalApproval: proof,
      publicAudit: { ok: true, errors: [], side_effects: 0 },
      apply: true,
    });
    expect(result).toMatchObject({ ok: false, side_effects: 0 });
    expect(post).not.toHaveBeenCalled();
  });
});
