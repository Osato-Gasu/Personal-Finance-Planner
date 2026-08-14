import { classifyDistributionState } from "./distribution-state.mjs";
import { evaluateCanonicalApproval } from "./distribution-approval.mjs";

export function evaluateDistributionPreflight(input) {
  const errors = [];
  const requireValue = (condition, message) => {
    if (!condition) errors.push(message);
  };
  requireValue(input.version === "0.1.0", "version must be 0.1.0");
  requireValue(
    input.version === input.packageVersion,
    "version must equal package.json version",
  );
  requireValue(input.tag === `v${input.version}`, "tag identity mismatch");
  requireValue(
    input.releaseTitle === `Personal Finance Planner v${input.version}`,
    "release title identity mismatch",
  );
  requireValue(
    /^[0-9a-f]{40}$/.test(input.targetCommit),
    "target SHA must be full lowercase 40-hex",
  );
  requireValue(
    input.targetCommit === input.originMain,
    "target SHA must equal current origin/main",
  );
  requireValue(
    input.mainCi?.headSha === input.targetCommit &&
      input.mainCi?.headBranch === "main" &&
      input.mainCi?.event === "push" &&
      input.mainCi?.name === "Governance CI" &&
      input.mainCi?.conclusion === "success",
    "supplied main Governance CI identity is not exact SUCCESS",
  );
  requireValue(input.launcherFresh === true, "root launcher is stale");
  requireValue(
    input.requiredResults === true,
    "required build/test gate failed",
  );
  requireValue(input.stagingValid === true, "staging allowlist is invalid");
  requireValue(input.manifestValid === true, "manifest/checksum is invalid");
  requireValue(
    input.repositoryPrivate === true,
    "repository must remain private",
  );
  requireValue(
    input.pagesConfigured === true && input.pagesSource === "workflow",
    "Pages must be configured with GitHub Actions source",
  );
  requireValue(input.pagesInputValid === true, "Pages input identity mismatch");

  const canonicalApproval = evaluateCanonicalApproval({
    ...(input.canonicalApproval ?? {}),
    targetSha: input.targetCommit,
  });
  requireValue(
    canonicalApproval.ok,
    `canonical TASK-009 APPROVED release proof is invalid: ${canonicalApproval.errors.join("; ")}`,
  );

  const classification = classifyDistributionState(
    input.actualState,
    input.expectedState,
  );
  requireValue(
    classification.state !== "conflicting",
    `distribution state is conflicting: ${classification.reason}`,
  );
  return {
    ok: errors.length === 0,
    errors,
    classification,
    canonical_approval: canonicalApproval,
    side_effects: 0,
  };
}
