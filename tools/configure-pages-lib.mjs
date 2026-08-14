import { GitHubApiError, optionalGet } from "./github-distribution-api.mjs";

export async function configurePages({
  api,
  repository,
  targetSha,
  mainCiRunId,
  approvedReleaseHead,
  apply = false,
}) {
  if (!/^[0-9a-f]{40}$/.test(targetSha))
    throw new Error("target SHA must be full lowercase 40-hex");
  if (approvedReleaseHead !== targetSha)
    throw new Error("APPROVED release head must equal target SHA");
  if (!Number.isSafeInteger(mainCiRunId) || mainCiRunId <= 0)
    throw new Error("exact main CI run ID is required");
  const base = `https://api.github.com/repos/${repository}`;
  const repo = await api.get(base);
  const main = await api.get(`${base}/branches/main`);
  const ci = await api.get(`${base}/actions/runs/${String(mainCiRunId)}`);
  const errors = [];
  if (repo.private !== true) errors.push("repository must remain private");
  if (main.commit?.sha !== targetSha)
    errors.push("APPROVED release head is not current origin/main");
  if (
    ci.head_sha !== targetSha ||
    ci.head_branch !== "main" ||
    ci.event !== "push" ||
    ci.name !== "Governance CI" ||
    ci.conclusion !== "success"
  )
    errors.push("exact main Governance CI is not SUCCESS");
  let pages;
  try {
    pages = await optionalGet(api, `${base}/pages`);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 403)
      throw new Error(
        "Pages state is not observable with current permissions",
        {
          cause: error,
        },
      );
    throw error;
  }
  if (pages !== null && pages.build_type !== "workflow")
    errors.push("existing Pages source is not GitHub Actions");
  if (pages?.cname) errors.push("custom domain must remain unset");
  if (errors.length > 0)
    return { ok: false, applied: false, side_effects: 0, errors };
  if (!apply)
    return {
      ok: true,
      applied: false,
      side_effects: 0,
      action: pages === null ? "create_actions_pages_site" : "already_exact",
    };
  if (pages !== null)
    return {
      ok: true,
      applied: false,
      side_effects: 0,
      action: "already_exact",
    };
  const created = await api.post(`${base}/pages`, { build_type: "workflow" });
  if (created.build_type !== "workflow" || created.cname)
    throw new Error("created Pages configuration is not exact");
  return {
    ok: true,
    applied: true,
    side_effects: 1,
    action: "created_actions_pages_site",
  };
}
