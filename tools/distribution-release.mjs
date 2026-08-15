import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  GitHubDistributionApi,
  optionalGet,
} from "./github-distribution-api.mjs";
import { sha256 } from "./distribution-lib.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

async function uploadAsset({
  token,
  uploadUrl,
  path,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
}) {
  const bytes = await readFileImpl(path);
  const name = basename(path);
  const url = `${uploadUrl.replace("{?name,label}", "")}?name=${encodeURIComponent(name)}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "personal-finance-planner-distribution",
    },
    body: bytes,
  });
  if (!response.ok)
    throw new Error(
      `release asset upload failed: ${name} (${String(response.status)})`,
    );
  const asset = await response.json();
  if (
    asset.name !== name ||
    asset.size !== bytes.byteLength ||
    asset.digest !== `sha256:${sha256(bytes)}`
  )
    throw new Error(`uploaded release asset identity mismatch: ${name}`);
  return {
    url,
    path: name,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
  };
}

function assetIdentity(asset) {
  if (
    typeof asset?.name !== "string" ||
    !Number.isSafeInteger(asset.size) ||
    typeof asset.digest !== "string" ||
    !asset.digest.startsWith("sha256:")
  )
    throw new Error(
      `release asset identity is unavailable: ${asset?.name ?? "unknown"}`,
    );
  return {
    path: asset.name,
    sha256: asset.digest.slice("sha256:".length),
    bytes: asset.size,
  };
}

function canonical(value) {
  return JSON.stringify(value);
}

function expectedAssetIdentity(release) {
  return release.assets
    .map(assetIdentity)
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function verifyPublishedNoOp({ api, base, tag, expected, target }) {
  const tagRef = await optionalGet(
    api,
    `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
  );
  if (tagRef?.object?.type !== "commit" || tagRef.object.sha !== target)
    throw new Error("published tag target mismatch; no-op was not exact");
  const release = await api.get(
    `${base}/releases/tags/${encodeURIComponent(tag)}`,
  );
  if (
    release.tag_name !== tag ||
    release.name !== expected.release.title ||
    release.draft !== false ||
    release.prerelease !== true
  )
    throw new Error("published release identity is not exact; no-op stopped");
  if (
    canonical(expectedAssetIdentity(release)) !==
    canonical(expected.release.assets)
  )
    throw new Error("published release assets are not exact; no-op stopped");
  return {
    ok: true,
    state: "exact_published",
    side_effects: 0,
    no_op: true,
    operations: [],
  };
}

/**
 * Stage the tag, draft prerelease, and missing assets. The exact_published
 * state is a complete, side-effect-free verification path for safe reruns.
 */
export async function stageRelease({
  api,
  token,
  repository,
  version,
  target,
  audit,
  staging,
  releaseNotesPath,
  readFileImpl = readFile,
  uploadAssetImpl = uploadAsset,
}) {
  const tag = `v${version}`;
  const base = `https://api.github.com/repos/${repository}`;
  const expected = audit.expected_state;
  if (
    expected.tag.name !== tag ||
    expected.tag.targetCommit !== target ||
    expected.release.targetCommit !== target
  )
    throw new Error("audit expected identity mismatch");

  const state = audit.preflight.classification.state;
  const operations = [];
  const allowed = new Set([
    "fresh",
    "exact_tag_only",
    "exact_draft_release",
    "exact_release_assets",
    "exact_pages_deployed",
    "exact_published",
  ]);
  if (!allowed.has(state))
    throw new Error("preflight state does not permit release staging");
  if (state === "exact_published")
    return verifyPublishedNoOp({ api, base, tag, expected, target });

  let tagRef = await optionalGet(
    api,
    `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
  );
  if (tagRef === null) {
    const url = `${base}/git/refs`;
    await api.post(url, {
      ref: `refs/tags/${tag}`,
      sha: target,
    });
    operations.push({
      operation: "create_tag",
      url,
      ref: `refs/tags/${tag}`,
      target_commit: target,
    });
    tagRef = await api.get(`${base}/git/ref/tags/${encodeURIComponent(tag)}`);
  }
  if (tagRef.object?.type !== "commit" || tagRef.object.sha !== target)
    throw new Error("tag target mismatch; existing tag is never moved");

  let release = await optionalGet(
    api,
    `${base}/releases/tags/${encodeURIComponent(tag)}`,
  );
  if (release === null) {
    const notesTemplate = await readFileImpl(resolve(releaseNotesPath), "utf8");
    const notes = notesTemplate
      .replaceAll("{{TARGET_COMMIT}}", target)
      .replaceAll("{{PRIMARY_SHA256}}", expected.pages.primaryAssetSha256)
      .replaceAll(
        "{{PRIMARY_BYTES}}",
        String(expected.pages.primaryAssetBytes),
      );
    if (/\{\{[A-Z0-9_]+\}\}/u.test(notes))
      throw new Error(
        "release notes contain an unresolved identity placeholder",
      );
    const url = `${base}/releases`;
    release = await api.post(url, {
      tag_name: tag,
      target_commitish: target,
      name: `Personal Finance Planner v${version}`,
      body: notes,
      draft: true,
      prerelease: true,
      generate_release_notes: false,
    });
    operations.push({
      operation: "create_draft_release",
      url,
      tag,
      target_commit: target,
      title: `Personal Finance Planner v${version}`,
    });
  }
  if (
    release.tag_name !== tag ||
    release.name !== `Personal Finance Planner v${version}` ||
    release.draft !== true ||
    release.prerelease !== true
  )
    throw new Error("draft prerelease identity mismatch");
  const existing = new Map(release.assets.map((asset) => [asset.name, asset]));
  const stagingPath = resolve(staging);
  for (const expectedAsset of expected.release.assets) {
    const current = existing.get(expectedAsset.path);
    if (current) {
      if (
        current.size !== expectedAsset.bytes ||
        current.digest !== `sha256:${expectedAsset.sha256}`
      )
        throw new Error(
          `existing asset mismatch; never overwrite: ${expectedAsset.path}`,
        );
      continue;
    }
    await uploadAssetImpl({
      token,
      uploadUrl: release.upload_url,
      path: resolve(stagingPath, expectedAsset.path),
    });
    operations.push({
      operation: "upload_asset",
      url: `${release.upload_url.replace("{?name,label}", "")}?name=${encodeURIComponent(expectedAsset.path)}`,
      path: expectedAsset.path,
      sha256: expectedAsset.sha256,
      bytes: expectedAsset.bytes,
    });
  }
  return {
    ok: true,
    state: "exact_release_assets",
    side_effects: operations.length,
    no_op: false,
    operations,
  };
}

export async function publishRelease({
  api,
  repository,
  version,
  target,
  audit,
}) {
  const tag = `v${version}`;
  const base = `https://api.github.com/repos/${repository}`;
  const expected = audit.expected_state;
  if (audit.preflight.classification.state !== "exact_pages_deployed")
    throw new Error("Release publication requires exact_pages_deployed state");
  const tagRef = await api.get(
    `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
  );
  if (tagRef.object?.type !== "commit" || tagRef.object.sha !== target)
    throw new Error("tag target changed before publication");
  const release = await api.get(
    `${base}/releases/tags/${encodeURIComponent(tag)}`,
  );
  if (
    release.tag_name !== tag ||
    release.name !== expected.release.title ||
    release.draft !== true ||
    release.prerelease !== true
  )
    throw new Error("draft release changed before publication");
  const published = await api.patch(`${base}/releases/${String(release.id)}`, {
    draft: false,
    prerelease: true,
  });
  if (published.draft !== false || published.prerelease !== true)
    throw new Error("Release publication identity mismatch");
  return {
    ok: true,
    state: "exact_published",
    side_effects: 1,
    no_op: false,
    operations: [
      {
        operation: "publish_release",
        url: `${base}/releases/${String(release.id)}`,
        release_id: release.id,
        tag,
        target_commit: target,
      },
    ],
  };
}

async function main() {
  const command = process.argv[2];
  if (command !== "stage" && command !== "publish")
    throw new Error("command must be stage or publish");
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  const repository = option("--repository");
  const version = option("--version");
  const target = option("--target-sha");
  const audit = JSON.parse(await readFile(resolve(option("--audit")), "utf8"));
  const api = new GitHubDistributionApi({ token });
  const result =
    command === "stage"
      ? await stageRelease({
          api,
          token,
          repository,
          version,
          target,
          audit,
          staging: option("--staging"),
          releaseNotesPath: option("--release-notes"),
        })
      : await publishRelease({ api, repository, version, target, audit });
  console.log(JSON.stringify(result));
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
