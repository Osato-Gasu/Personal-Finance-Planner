import { spawnSync } from "node:child_process";
import { mkdir, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPublicAuditReport,
  assertNoLinkedPath,
  isPathInside,
  scanPublicBytes,
  serializePublicAuditReport,
  sha256,
  validatePublicExposureAudit,
} from "./public-exposure-audit-lib.mjs";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  if (!process.argv[index + 1]) throw new Error(`missing value: ${name}`);
  return process.argv[index + 1];
}

function git(cwd, args, input) {
  const result = spawnSync("git", args, {
    cwd,
    input,
    encoding: input === undefined ? "utf8" : undefined,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr)}`);
  return result.stdout;
}

function batchBlobs(cwd, identities) {
  if (identities.length === 0) return new Map();
  const input = Buffer.from(`${identities.join("\n")}\n`);
  const check = String(
    git(
      cwd,
      ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
      input,
    ),
  )
    .trim()
    .split("\n")
    .map((line) => line.split(" "));
  const blobIds = check
    .filter((line) => line[1] === "blob")
    .map((line) => line[0]);
  const raw = Buffer.from(
    git(cwd, ["cat-file", "--batch"], Buffer.from(`${blobIds.join("\n")}\n`)),
  );
  const values = new Map();
  let offset = 0;
  for (const id of blobIds) {
    const end = raw.indexOf(0x0a, offset);
    const [sha, type, sizeText] = raw
      .subarray(offset, end)
      .toString("utf8")
      .split(" ");
    if (sha !== id || type !== "blob")
      throw new Error("git batch identity mismatch");
    const size = Number(sizeText);
    const start = end + 1;
    values.set(id, raw.subarray(start, start + size));
    offset = start + size + 1;
  }
  return values;
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "personal-finance-planner-public-audit",
    },
  });
  if (!response.ok)
    throw new Error(
      `BLOCKED: GitHub API permission/read failure ${String(response.status)} at ${url}`,
    );
  return response.json();
}

async function githubBytes(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "personal-finance-planner-public-audit",
    },
    redirect: "follow",
  });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok)
    throw new Error(
      `BLOCKED: GitHub log/artifact read failure ${String(response.status)} at ${url}`,
    );
  return Buffer.from(await response.arrayBuffer());
}

async function githubPages(url, token, key) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await githubJson(
      `${url}${separator}per_page=100&page=${String(page)}`,
      token,
    );
    const current = response[key] ?? response;
    values.push(...current);
    if (current.length < 100) return values;
  }
}

async function mapLimit(values, limit, callback) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await callback(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

function scanArtifactArchive(bytes, path) {
  const list = spawnSync("tar", ["-tf", "-"], {
    input: bytes,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (list.status !== 0)
    throw new Error(
      `BLOCKED: Actions artifact content is unavailable: ${path}`,
    );
  const names = list.stdout.split(/\r?\n/u).filter(Boolean);
  const findings = [];
  for (const name of names) {
    if (
      name.startsWith("/") ||
      /^[A-Za-z]:/u.test(name) ||
      name.split(/[\\/]/u).includes("..")
    )
      throw new Error(
        `BLOCKED: Actions artifact contains unsafe path: ${path}`,
      );
    const content = spawnSync("tar", ["-xOf", "-", name], {
      input: bytes,
      maxBuffer: 128 * 1024 * 1024,
    });
    if (content.status !== 0)
      throw new Error(
        `BLOCKED: Actions artifact entry is unavailable: ${path}`,
      );
    findings.push(
      ...scanPublicBytes({
        bytes: content.stdout,
        path: `${path}/${name}`,
      }),
    );
  }
  return findings;
}

async function scanGithub({ repository, token, findings, scans }) {
  if (!token)
    throw new Error("BLOCKED: GITHUB_TOKEN is required for Actions audit");
  const base = `https://api.github.com/repos/${repository}`;
  const repo = await githubJson(base, token);
  if (repo.private !== false || repo.visibility !== "public")
    throw new Error("BLOCKED: repository is not exactly public");
  const runs = await githubPages(
    `${base}/actions/runs`,
    token,
    "workflow_runs",
  );
  scans.actions_run_logs = 0;
  const runJobs = await mapLimit(runs, 12, async (run) => ({
    run,
    jobs: await githubPages(
      `${base}/actions/runs/${String(run.id)}/jobs`,
      token,
      "jobs",
    ),
  }));
  const completedJobs = runJobs.flatMap(({ run, jobs }) =>
    jobs
      .filter((job) => job.status === "completed")
      .map((job) => ({ run, job })),
  );
  const logFindings = await mapLimit(completedJobs, 8, async ({ run, job }) => {
    const bytes = await githubBytes(
      `${base}/actions/jobs/${String(job.id)}/logs`,
      token,
    );
    if (bytes === null) return null;
    return scanPublicBytes({
      bytes,
      path: `actions/run-${String(run.id)}/job-${String(job.id)}.log`,
      commit: run.head_sha ?? null,
    });
  });
  for (const current of logFindings) {
    if (current === null) continue;
    findings.push(...current);
    scans.actions_run_logs += 1;
  }
  const artifacts = await githubPages(
    `${base}/actions/artifacts`,
    token,
    "artifacts",
  );
  scans.actions_artifacts = 0;
  for (const artifact of artifacts) {
    if (artifact.expired) continue;
    const bytes = await githubBytes(
      `${base}/actions/artifacts/${String(artifact.id)}/zip`,
      token,
    );
    if (bytes === null) continue;
    const path = `actions/artifact-${String(artifact.id)}-${artifact.name}.zip`;
    findings.push(...scanArtifactArchive(bytes, path));
    scans.actions_artifacts += 1;
  }
  return repo.visibility;
}

export async function runPublicExposureAudit({
  cwd,
  repository,
  targetCommit,
  phase,
  output,
  staging,
  token,
}) {
  const root = String(git(cwd, ["rev-parse", "--show-toplevel"])).trim();
  const resolvedTarget = String(
    git(root, ["rev-parse", "--verify", `${targetCommit}^{commit}`]),
  ).trim();
  const head = String(git(root, ["rev-parse", "HEAD"])).trim();
  if (resolvedTarget !== targetCommit || head !== targetCommit)
    throw new Error("audit target must be the exact checked-out HEAD commit");
  const outputPath = resolve(output);
  if (isPathInside(root, outputPath) || outputPath === root)
    throw new Error("audit output must be outside the repository");
  await mkdir(dirname(outputPath), { recursive: true });
  await assertNoLinkedPath(dirname(outputPath));
  const startedAt = new Date().toISOString();
  const findings = [];
  const scans = {};
  const objectLines = String(git(root, ["rev-list", "--objects", "--all"]))
    .trim()
    .split("\n")
    .filter(Boolean);
  const paths = new Map();
  for (const line of objectLines) {
    const separator = line.indexOf(" ");
    paths.set(
      separator < 0 ? line : line.slice(0, separator),
      separator < 0 ? "" : line.slice(separator + 1),
    );
  }
  const objects = batchBlobs(root, [...paths.keys()]);
  scans.reachable_commits = String(git(root, ["rev-list", "--all"]))
    .trim()
    .split("\n")
    .filter(Boolean).length;
  const types = String(
    git(
      root,
      ["cat-file", "--batch-check=%(objecttype)"],
      Buffer.from(`${[...paths.keys()].join("\n")}\n`),
    ),
  )
    .trim()
    .split("\n");
  scans.reachable_trees = types.filter((type) => type === "tree").length;
  scans.reachable_blobs = objects.size;
  for (const [blob, bytes] of objects)
    findings.push(
      ...scanPublicBytes({
        bytes,
        path: paths.get(blob) || "(unpathed reachable blob)",
        commit: "reachable",
        blob,
      }),
    );
  const refs = String(
    git(root, ["for-each-ref", "--format=%(refname) %(objectname)"]),
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  scans.refs = refs.length;
  scans.tags = refs.filter((line) => line.startsWith("refs/tags/")).length;
  scans.lfs_pointers = [...objects.values()].filter((bytes) =>
    bytes
      .subarray(0, 100)
      .toString("utf8")
      .includes("https://git-lfs.github.com/spec/v1"),
  ).length;
  scans.submodules =
    types.filter((type) => type === "commit").length - scans.reachable_commits;
  const workPaths = String(git(root, ["ls-files", "-co", "--exclude-standard"]))
    .trim()
    .split("\n")
    .filter(Boolean);
  scans.working_tree = 0;
  for (const path of workPaths) {
    const full = resolve(root, path);
    const stat = await lstat(full);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error(`working path is not a regular file: ${path}`);
    findings.push(
      ...scanPublicBytes({
        bytes: await readFile(full),
        path: `working/${path}`,
      }),
    );
    scans.working_tree += 1;
  }
  const stagedLines = String(git(root, ["ls-files", "-s"]))
    .trim()
    .split("\n")
    .filter(Boolean);
  const stagedIds = [
    ...new Set(stagedLines.map((line) => line.split(/\s+/u)[1])),
  ];
  const staged = batchBlobs(root, stagedIds);
  scans.staged_bytes = staged.size;
  for (const line of stagedLines) {
    const [metadata, path] = line.split("\t");
    const blob = metadata.split(/\s+/u)[1];
    findings.push(
      ...scanPublicBytes({
        bytes: staged.get(blob),
        path: `staged/${path}`,
        blob,
      }),
    );
  }
  scans.release_staging = 0;
  if (staging) {
    const stagingRoot = resolve(staging);
    const files = [
      "Personal-Finance-Planner.html",
      "index.html",
      "release-manifest.json",
      "SHA256SUMS.txt",
      ".nojekyll",
    ];
    for (const name of files) {
      const full = resolve(stagingRoot, name);
      const stat = await lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error(`staging path is not a regular file: ${name}`);
      findings.push(
        ...scanPublicBytes({
          bytes: await readFile(full),
          path: `staging/${name}`,
        }),
      );
      scans.release_staging += 1;
    }
  }
  const visibility = await scanGithub({ repository, token, findings, scans });
  const report = buildPublicAuditReport({
    repository,
    targetCommit,
    repositoryVisibility: visibility,
    phase,
    scans,
    findings,
    startedAt,
    completedAt: new Date().toISOString(),
  });
  const bytes = serializePublicAuditReport(report);
  const validation = validatePublicExposureAudit(report, {
    repository,
    targetCommit,
    phase,
    reportBytes: bytes,
    expectedSha256: sha256(bytes),
  });
  if (!validation.ok)
    throw new Error(
      `public audit report self-validation failed: ${validation.errors.join("; ")}`,
    );
  await writeFile(outputPath, bytes, { flag: "wx" });
  process.stdout.write(
    `${JSON.stringify({ result: report.result, findings: report.findings_count, output: outputPath, bytes: bytes.byteLength })}\n`,
  );
  if (report.findings_count > 0) process.exitCode = 1;
  return report;
}

async function main() {
  await runPublicExposureAudit({
    cwd: process.cwd(),
    repository: option("--repository"),
    targetCommit: option("--target-sha"),
    phase: option("--phase"),
    output: option("--output"),
    staging: option("--staging", undefined),
    token: process.env.GITHUB_TOKEN,
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
