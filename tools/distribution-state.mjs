function canonical(value) {
  return JSON.stringify(value);
}

function exact(actual, expected) {
  return canonical(actual) === canonical(expected);
}

export function classifyDistributionState(actual, expected) {
  const audit = structuredClone(actual);
  const result = (state, resumeFrom, reason = "exact") => ({
    state,
    resume_from: resumeFrom,
    reason,
    audit,
  });
  if ((actual.otherTags ?? 0) !== 0 || (actual.otherReleases ?? 0) !== 0)
    return result("conflicting", "stop", "unexpected tag or release exists");
  if (actual.tag === null && actual.release === null && actual.pages === null)
    return result("fresh", "tag", "all distribution objects are absent");
  if (!exact(actual.tag, expected.tag))
    return result("conflicting", "stop", "tag identity mismatch");
  if (actual.release === null && actual.pages === null)
    return result("exact_tag_only", "draft_release");
  if (actual.release === null)
    return result("conflicting", "stop", "Pages exists without a release");

  const releaseIdentity = {
    tag: actual.release.tag,
    targetCommit: actual.release.targetCommit,
    title: actual.release.title,
    draft: actual.release.draft,
    prerelease: actual.release.prerelease,
  };
  const expectedDraft = {
    tag: expected.release.tag,
    targetCommit: expected.release.targetCommit,
    title: expected.release.title,
    draft: true,
    prerelease: true,
  };
  const expectedPublished = { ...expectedDraft, draft: false };
  if (
    !exact(releaseIdentity, expectedDraft) &&
    !exact(releaseIdentity, expectedPublished)
  )
    return result("conflicting", "stop", "release identity mismatch");

  const assets = actual.release.assets ?? [];
  if (assets.length === 0 && actual.release.draft && actual.pages === null)
    return result("exact_draft_release", "release_assets");
  const expectedAssets = new Map(
    expected.release.assets.map((asset) => [asset.path, asset]),
  );
  const assetsAreExactSubset =
    new Set(assets.map((asset) => asset.path)).size === assets.length &&
    assets.every((asset) => exact(asset, expectedAssets.get(asset.path)));
  if (!assetsAreExactSubset)
    return result("conflicting", "stop", "release asset identity mismatch");
  if (
    assets.length < expected.release.assets.length &&
    actual.release.draft &&
    actual.pages === null
  )
    return result(
      "exact_draft_release",
      "release_assets",
      "exact asset subset",
    );
  if (!exact(assets, expected.release.assets))
    return result("conflicting", "stop", "release assets are incomplete");
  if (actual.pages === null && actual.release.draft)
    return result("exact_release_assets", "pages_deploy");
  if (!exact(actual.pages, expected.pages))
    return result("conflicting", "stop", "Pages identity mismatch");
  if (actual.release.draft)
    return result("exact_pages_deployed", "live_verification");
  if (actual.release.prerelease) return result("exact_published", "complete");
  return result("conflicting", "stop", "published release is not prerelease");
}

export function expectedDistributionIdentity({
  version,
  targetCommit,
  artifacts,
}) {
  const tag = `v${version}`;
  const assets = [
    artifacts.launcher,
    artifacts.manifest,
    artifacts.checksums,
  ].sort((left, right) => left.path.localeCompare(right.path));
  return {
    tag: { name: tag, targetCommit },
    release: {
      tag,
      targetCommit,
      title: `Personal Finance Planner v${version}`,
      assets,
    },
    pages: {
      targetCommit,
      primaryAssetSha256: artifacts.launcher.sha256,
      primaryAssetBytes: artifacts.launcher.bytes,
      manifestSha256: artifacts.manifest.sha256,
    },
  };
}
