import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import packageMetadata from "../package.json" with { type: "json" };
import { verifyDistribution, sha256 } from "./distribution-lib.mjs";
import { evaluateDistributionPreflight } from "./distribution-preflight-lib.mjs";
import { expectedDistributionIdentity } from "./distribution-state.mjs";
import { readCanonicalApprovalAtCommit } from "./distribution-approval.mjs";
import {
  GitHubDistributionApi,
  optionalGet,
} from "./github-distribution-api.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

async function peelTag(api, base, reference) {
  if (reference === null) return null;
  let object = reference.object;
  if (object.type === "tag") {
    const annotated = await api.get(`${base}/git/tags/${object.sha}`);
    object = annotated.object;
  }
  if (object.type !== "commit") throw new Error("tag target is not a commit");
  return object.sha;
}

function assetIdentity(asset) {
  if (typeof asset.digest !== "string" || !asset.digest.startsWith("sha256:"))
    throw new Error(`release asset digest is unavailable: ${asset.name}`);
  return {
    path: asset.name,
    sha256: asset.digest.slice("sha256:".length),
    bytes: asset.size,
  };
}

async function collectPages(api, base, targetCommit) {
  const deployments = await api.get(
    `${base}/deployments?environment=github-pages&per_page=100`,
  );
  const observations = [];
  for (const deployment of deployments) {
    const statuses = await api.get(
      `${base}/deployments/${deployment.id}/statuses`,
    );
    observations.push({
      id: deployment.id,
      targetCommit: deployment.sha,
      statuses: statuses.map((status) => ({
        state: status.state,
        environmentUrl: status.environment_url ?? null,
      })),
    });
  }
  const conflicting = observations.find(
    (deployment) => deployment.targetCommit !== targetCommit,
  );
  if (conflicting)
    return {
      identity: {
        targetCommit: conflicting.targetCommit,
        primaryAssetSha256: null,
        primaryAssetBytes: null,
        manifestSha256: null,
      },
      url: null,
      audit: observations,
    };
  const successful = observations
    .flatMap((deployment) =>
      deployment.statuses.map((status) => ({ deployment, status })),
    )
    .find(
      ({ status }) =>
        status.state === "success" && status.environmentUrl !== null,
    );
  if (!successful) return { identity: null, url: null, audit: observations };
  const manifestUrl = new URL(
    "release-manifest.json",
    successful.status.environmentUrl.endsWith("/")
      ? successful.status.environmentUrl
      : `${successful.status.environmentUrl}/`,
  );
  const response = await fetch(manifestUrl);
  if (!response.ok)
    return {
      identity: {
        targetCommit,
        primaryAssetSha256: null,
        primaryAssetBytes: null,
        manifestSha256: null,
      },
      url: successful.status.environmentUrl,
      audit: observations,
    };
  const manifestBytes = Buffer.from(await response.arrayBuffer());
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  return {
    identity: {
      targetCommit,
      primaryAssetSha256: manifest.primary_asset_sha256,
      primaryAssetBytes: manifest.primary_asset_bytes,
      manifestSha256: sha256(manifestBytes),
    },
    url: successful.status.environmentUrl,
    audit: observations,
  };
}

const repository = option("--repository");
const version = option("--version");
const tag = option("--tag");
const targetCommit = option("--target-sha");
const mainCiRunId = Number(option("--main-ci-run-id"));
const staging = resolve(option("--staging"));
const launcher = resolve(option("--root-launcher"));
const auditOutput = resolve(option("--audit-output"));
const artifacts = await verifyDistribution({
  version,
  tag,
  targetCommit,
  rootLauncherPath: launcher,
  outputDirectory: staging,
});
const canonicalApproval = await readCanonicalApprovalAtCommit({
  cwd: process.cwd(),
  targetSha: targetCommit,
});
const expectedState = expectedDistributionIdentity({
  version,
  targetCommit,
  artifacts,
});
const api = new GitHubDistributionApi({ token: process.env.GITHUB_TOKEN });
const base = `https://api.github.com/repos/${repository}`;
const [repo, main, ci, tags, releases, pages] = await Promise.all([
  api.get(base),
  api.get(`${base}/branches/main`),
  api.get(`${base}/actions/runs/${String(mainCiRunId)}`),
  api.get(`${base}/tags?per_page=100`),
  api.get(`${base}/releases?per_page=100`),
  optionalGet(api, `${base}/pages`),
]);
const tagReference = await optionalGet(
  api,
  `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
);
const tagTarget = await peelTag(api, base, tagReference);
const release = await optionalGet(
  api,
  `${base}/releases/tags/${encodeURIComponent(tag)}`,
);
const pagesState = await collectPages(api, base, targetCommit);
const actualState = {
  tag: tagTarget === null ? null : { name: tag, targetCommit: tagTarget },
  release:
    release === null
      ? null
      : {
          tag: release.tag_name,
          targetCommit: tagTarget,
          title: release.name,
          draft: release.draft,
          prerelease: release.prerelease,
          assets: release.assets
            .map(assetIdentity)
            .sort((left, right) => left.path.localeCompare(right.path)),
        },
  pages: pagesState.identity,
  otherTags: tags.filter((value) => value.name !== tag).length,
  otherReleases: releases.filter((value) => value.tag_name !== tag).length,
};
const result = evaluateDistributionPreflight({
  version,
  packageVersion: packageMetadata.version,
  tag,
  releaseTitle: option("--release-title"),
  targetCommit,
  originMain: main.commit.sha,
  mainCi: {
    headSha: ci.head_sha,
    headBranch: ci.head_branch,
    event: ci.event,
    name: ci.name,
    conclusion: ci.conclusion,
  },
  launcherFresh: process.argv.includes("--launcher-fresh"),
  requiredResults: process.argv.includes("--required-results"),
  stagingValid: true,
  manifestValid: true,
  repositoryPrivate: repo.private,
  pagesConfigured: pages !== null,
  pagesSource: pages?.build_type,
  pagesInputValid: true,
  canonicalApproval,
  actualState,
  expectedState,
});
const audit = {
  schema_version: 1,
  preflight: result,
  expected_state: expectedState,
  actual_state: actualState,
  pages_url: pagesState.url,
  pages_deployments: pagesState.audit,
  canonical_approval_source: canonicalApproval.sourceCommit,
};
await mkdir(dirname(auditOutput), { recursive: true });
await writeFile(auditOutput, `${JSON.stringify(audit, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
console.log(JSON.stringify(result));
if (!result.ok) process.exitCode = 1;
