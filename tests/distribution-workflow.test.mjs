import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflow = await readFile(".github/workflows/distribution.yml", "utf8");
const triggerBlock = workflow.slice(
  workflow.indexOf("on:"),
  workflow.indexOf("permissions:"),
);
const officialActions = new Set([
  "actions/checkout",
  "actions/setup-node",
  "actions/upload-artifact",
  "actions/download-artifact",
  "actions/upload-pages-artifact",
  "actions/deploy-pages",
]);

describe("manual distribution workflow", () => {
  it("uses workflow_dispatch only with version concurrency", () => {
    expect(triggerBlock).toContain("workflow_dispatch:");
    for (const forbidden of [
      "push:",
      "pull_request:",
      "schedule:",
      "release:",
      "workflow_run:",
    ])
      expect(triggerBlock).not.toContain(forbidden);
    expect(workflow).toContain("group: distribution-${{ inputs.version }}");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("PUBLISH_v0.1.0");
  });

  it("pins every use to an official immutable full commit SHA", () => {
    const uses = [
      ...workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#\s*(v\d+))?$/gmu),
    ];
    expect(uses.length).toBeGreaterThan(10);
    for (const match of uses) {
      const identity = match[1];
      const [repository, sha] = identity.split("@");
      expect(officialActions.has(repository)).toBe(true);
      expect(sha).toMatch(/^[0-9a-f]{40}$/u);
    }
    expect(workflow).toContain(
      "actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
    );
    expect(workflow).toContain(
      "actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4",
    );
  });

  it("separates least-privilege jobs in the required order", () => {
    expect(workflow).toContain("permissions: {}\n");
    expect(workflow).toMatch(
      /preflight:[\s\S]*?actions: read[\s\S]*?contents: read/u,
    );
    expect(workflow).toMatch(
      /draft_release:\n\s+needs: preflight[\s\S]*?contents: write/u,
    );
    expect(workflow).toMatch(
      /pages:\n\s+needs: \[preflight, draft_release\][\s\S]*?id-token: write[\s\S]*?pages: write/u,
    );
    expect(workflow).toMatch(/environment:\n\s+name: github-pages/u);
    expect(workflow).toMatch(
      /live_verification:\n\s+needs: \[preflight, draft_release, pages\]/u,
    );
    expect(workflow).toMatch(
      /publish_release:\n\s+needs: live_verification[\s\S]*?contents: write/u,
    );
    expect(workflow.match(/if: always\(\)/gu)?.length).toBeGreaterThanOrEqual(
      6,
    );
  });

  it("documents the non-destructive publication order in executable needs", () => {
    const order = [
      "preflight:",
      "draft_release:",
      "pages:",
      "live_verification:",
      "publish_release:",
    ];
    const positions = order.map(
      (label) => new RegExp(`^  ${label}$`, "mu").exec(workflow)?.index ?? -1,
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(
      positions,
    );
    for (const forbidden of [
      "delete release",
      "delete tag",
      "unpublish",
      "--force",
      "force push",
    ])
      expect(workflow.toLowerCase()).not.toContain(forbidden);
  });
});
