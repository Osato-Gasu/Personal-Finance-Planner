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

async function uploadAsset({ token, uploadUrl, path }) {
  const bytes = await readFile(path);
  const name = basename(path);
  const url = `${uploadUrl.replace("{?name,label}", "")}?name=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
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
}

const command = process.argv[2];
if (command !== "stage" && command !== "publish")
  throw new Error("command must be stage or publish");
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required");
const api = new GitHubDistributionApi({ token });
const repository = option("--repository");
const version = option("--version");
const target = option("--target-sha");
const tag = `v${version}`;
const base = `https://api.github.com/repos/${repository}`;
const audit = JSON.parse(await readFile(resolve(option("--audit")), "utf8"));
const expected = audit.expected_state;
if (
  expected.tag.name !== tag ||
  expected.tag.targetCommit !== target ||
  expected.release.targetCommit !== target
)
  throw new Error("audit expected identity mismatch");

if (command === "stage") {
  const allowed = new Set([
    "fresh",
    "exact_tag_only",
    "exact_draft_release",
    "exact_release_assets",
    "exact_pages_deployed",
    "exact_published",
  ]);
  if (!allowed.has(audit.preflight.classification.state))
    throw new Error("preflight state does not permit release staging");
  let tagRef = await optionalGet(
    api,
    `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
  );
  if (tagRef === null) {
    await api.post(`${base}/git/refs`, {
      ref: `refs/tags/${tag}`,
      sha: target,
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
    const notesTemplate = await readFile(
      resolve(option("--release-notes")),
      "utf8",
    );
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
    release = await api.post(`${base}/releases`, {
      tag_name: tag,
      target_commitish: target,
      name: `Personal Finance Planner v${version}`,
      body: notes,
      draft: true,
      prerelease: true,
      generate_release_notes: false,
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
  const staging = resolve(option("--staging"));
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
    await uploadAsset({
      token,
      uploadUrl: release.upload_url,
      path: resolve(staging, expectedAsset.path),
    });
  }
  console.log(JSON.stringify({ ok: true, state: "exact_release_assets" }));
} else {
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
  console.log(JSON.stringify({ ok: true, state: "exact_published" }));
}
