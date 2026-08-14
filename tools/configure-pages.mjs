import { configurePages } from "./configure-pages-lib.mjs";
import { GitHubDistributionApi } from "./github-distribution-api.mjs";
import { readCanonicalApprovalAtCommit } from "./distribution-approval.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

const result = await configurePages({
  api: new GitHubDistributionApi({ token: process.env.GITHUB_TOKEN }),
  repository: option("--repository"),
  targetSha: option("--target-sha"),
  mainCiRunId: Number(option("--main-ci-run-id")),
  approvedReleaseHead: option("--approved-release-head"),
  canonicalApproval: await readCanonicalApprovalAtCommit({
    cwd: process.cwd(),
    targetSha: option("--target-sha"),
  }),
  apply: process.argv.includes("--apply"),
});
console.log(JSON.stringify(result));
if (!result.ok) process.exitCode = 1;
