import { spawnSync } from "node:child_process";
import { mkdir, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPublicAuditReport,
  PUBLIC_AUDIT_SCAN_METHOD,
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

function git(cwd, args, input, spawnImpl = spawnSync) {
  const result = spawnImpl("git", args, {
    cwd,
    input,
    encoding: input === undefined ? "utf8" : undefined,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr)}`);
  return result.stdout;
}

function batchBlobs(cwd, identities, spawnImpl = spawnSync) {
  if (identities.length === 0) return new Map();
  const input = Buffer.from(`${identities.join("\n")}\n`);
  const check = String(
    git(
      cwd,
      ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
      input,
      spawnImpl,
    ),
  )
    .trim()
    .split("\n")
    .map((line) => line.split(" "));
  const blobIds = check
    .filter((line) => line[1] === "blob")
    .map((line) => line[0]);
  const raw = Buffer.from(
    git(
      cwd,
      ["cat-file", "--batch"],
      Buffer.from(`${blobIds.join("\n")}\n`),
      spawnImpl,
    ),
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

async function githubJson(url, token, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
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

async function githubBytes(url, token, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
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

async function githubPages(url, token, key, fetchImpl = fetch) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await githubJson(
      `${url}${separator}per_page=100&page=${String(page)}`,
      token,
      fetchImpl,
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

function evidencePath(kind, value) {
  return `${kind}/sha256-${sha256(Buffer.from(value, "utf8")).slice(0, 16)}`;
}

function splitLines(value) {
  return String(value).trim().split("\n").filter(Boolean);
}

function hashSet(values) {
  return sha256(Buffer.from(`${[...new Set(values)].sort().join("\n")}\n`));
}

function parseTreeEntries(bytes, commit) {
  const entries = [];
  for (const raw of Buffer.from(bytes).toString("utf8").split("\0")) {
    if (!raw) continue;
    const tab = raw.indexOf("\t");
    const metadata = raw.slice(0, tab).split(" ");
    if (tab < 0 || metadata.length !== 3)
      throw new Error("BLOCKED: malformed git tree entry");
    entries.push({
      commit,
      mode: metadata[0],
      type: metadata[1],
      object: metadata[2],
      path: raw.slice(tab + 1),
    });
  }
  return entries;
}

export function scanArtifactArchive(
  bytes,
  path,
  { spawnImpl = spawnSync } = {},
) {
  const options = {
    input: bytes,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  };
  const list = spawnImpl("tar", ["-tf", "-"], options);
  if (list.status !== 0)
    throw new Error(
      `BLOCKED: Actions artifact content is unavailable: ${path}`,
    );
  const verbose = spawnImpl("tar", ["-tvf", "-"], options);
  if (verbose.status !== 0)
    throw new Error(
      `BLOCKED: Actions artifact metadata is unavailable: ${path}`,
    );
  const names = String(list.stdout).split(/\r?\n/u).filter(Boolean);
  const metadata = String(verbose.stdout).split(/\r?\n/u).filter(Boolean);
  if (names.length !== metadata.length)
    throw new Error(`BLOCKED: Actions artifact inventory mismatch: ${path}`);
  const findings = [];
  const normalizedNames = new Set();
  for (const [index, name] of names.entries()) {
    const portable = name.replaceAll("\\", "/");
    const normalized = posix.normalize(portable).replace(/\/$/u, "");
    if (
      !normalized ||
      normalized === "." ||
      portable.startsWith("/") ||
      /^[A-Za-z]:/u.test(portable) ||
      portable.split("/").includes("..") ||
      normalized.startsWith("../")
    )
      throw new Error(
        `BLOCKED: Actions artifact contains unsafe path: ${path}`,
      );
    if (normalizedNames.has(normalized))
      throw new Error(
        `BLOCKED: Actions artifact contains duplicate normalized path: ${path}`,
      );
    normalizedNames.add(normalized);
    const type = metadata[index][0];
    if (type === "d") continue;
    if (type !== "-")
      throw new Error(
        `BLOCKED: Actions artifact contains link or special entry: ${path}`,
      );
    const content = spawnImpl("tar", ["-xOf", "-", "--", name], {
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
        path: normalized,
        evidencePath: `${path}/${evidencePath("entry", normalized)}`,
      }),
    );
  }
  return findings;
}

async function scanGithub({
  repository,
  token,
  findings,
  scans,
  fetchImpl,
  spawnImpl,
}) {
  if (!token)
    throw new Error("BLOCKED: GITHUB_TOKEN is required for Actions audit");
  const base = `https://api.github.com/repos/${repository}`;
  const repo = await githubJson(base, token, fetchImpl);
  if (repo.private !== false || repo.visibility !== "public")
    throw new Error("BLOCKED: repository is not exactly public");
  const runs = await githubPages(
    `${base}/actions/runs`,
    token,
    "workflow_runs",
    fetchImpl,
  );
  scans.actions_run_logs = 0;
  const runJobs = await mapLimit(runs, 12, async (run) => ({
    run,
    jobs: await githubPages(
      `${base}/actions/runs/${String(run.id)}/jobs`,
      token,
      "jobs",
      fetchImpl,
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
      fetchImpl,
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
    fetchImpl,
  );
  scans.actions_artifacts = 0;
  for (const artifact of artifacts) {
    if (artifact.expired) continue;
    const bytes = await githubBytes(
      `${base}/actions/artifacts/${String(artifact.id)}/zip`,
      token,
      fetchImpl,
    );
    if (bytes === null) continue;
    const path = `actions/artifact-${String(artifact.id)}-${artifact.name}.zip`;
    findings.push(...scanArtifactArchive(bytes, path, { spawnImpl }));
    scans.actions_artifacts += 1;
  }
  return {
    visibility: repo.visibility,
    runSetSha256: hashSet(
      runs.map(
        (run) =>
          `${String(run.id)}\t${run.head_sha ?? ""}\t${run.status ?? ""}\t${run.conclusion ?? ""}\t${String(run.run_attempt ?? "")}`,
      ),
    ),
    jobSetSha256: hashSet(
      runJobs.flatMap(({ run, jobs }) =>
        jobs.map(
          (job) =>
            `${String(run.id)}\t${String(job.id)}\t${job.status ?? ""}\t${job.conclusion ?? ""}`,
        ),
      ),
    ),
    artifactSetSha256: hashSet(
      artifacts.map(
        (artifact) =>
          `${String(artifact.id)}\t${artifact.name ?? ""}\t${String(artifact.expired === true)}\t${artifact.workflow_run?.head_sha ?? ""}`,
      ),
    ),
  };
}

export async function runPublicExposureAudit({
  cwd,
  repository,
  targetCommit,
  phase,
  output,
  staging,
  token,
  fetchImpl = fetch,
  spawnImpl = spawnSync,
}) {
  const root = String(
    git(cwd, ["rev-parse", "--show-toplevel"], undefined, spawnImpl),
  ).trim();
  const resolvedTarget = String(
    git(
      root,
      ["rev-parse", "--verify", `${targetCommit}^{commit}`],
      undefined,
      spawnImpl,
    ),
  ).trim();
  const head = String(
    git(root, ["rev-parse", "HEAD"], undefined, spawnImpl),
  ).trim();
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
  const reachableCommits = splitLines(
    git(root, ["rev-list", "--all"], undefined, spawnImpl),
  );
  if (reachableCommits.length === 0)
    throw new Error("BLOCKED: reachable commit inventory is empty");
  scans.reachable_commits = reachableCommits.length;
  scans.commit_objects = 0;
  for (const commit of reachableCommits) {
    const bytes = git(
      root,
      ["cat-file", "commit", commit],
      undefined,
      spawnImpl,
    );
    findings.push(
      ...scanPublicBytes({
        bytes,
        path: `git/commit/${commit}`,
        commit,
      }),
    );
    scans.commit_objects += 1;
  }

  const objectLines = splitLines(
    git(root, ["rev-list", "--objects", "--all"], undefined, spawnImpl),
  );
  const objectIds = [
    ...new Set(objectLines.map((line) => line.split(" ", 1)[0])),
  ];
  const types = String(
    git(
      root,
      ["cat-file", "--batch-check=%(objecttype)"],
      Buffer.from(`${objectIds.join("\n")}\n`),
      spawnImpl,
    ),
  )
    .trim()
    .split("\n");
  const treeIds = objectIds.filter((_id, index) => types[index] === "tree");
  const blobIds = objectIds.filter((_id, index) => types[index] === "blob");
  const objects = batchBlobs(root, blobIds, spawnImpl);
  scans.reachable_trees = treeIds.length;
  scans.reachable_blobs = blobIds.length;

  const associations = [];
  for (const commit of reachableCommits) {
    associations.push(
      ...parseTreeEntries(
        git(
          root,
          ["ls-tree", "-rz", "--full-tree", "-r", commit],
          undefined,
          spawnImpl,
        ),
        commit,
      ),
    );
  }
  if (associations.length === 0)
    throw new Error("BLOCKED: historical tree/path inventory is empty");
  scans.tree_entries = associations.length;
  scans.historical_path_associations = associations.length;
  const scannedBlobPaths = new Set();
  for (const association of associations) {
    const associationIdentity = `${association.commit}\t${association.mode}\t${association.type}\t${association.object}\t${association.path}`;
    findings.push(
      ...scanPublicBytes({
        bytes: association.path,
        path: association.path,
        evidencePath: evidencePath("git/tree-entry", associationIdentity),
        commit: association.commit,
        blob: association.type === "blob" ? association.object : null,
      }),
    );
    if (association.type !== "blob") continue;
    const scanIdentity = `${association.object}\0${association.path}`;
    if (scannedBlobPaths.has(scanIdentity)) continue;
    scannedBlobPaths.add(scanIdentity);
    const bytes = objects.get(association.object);
    if (!bytes)
      throw new Error("BLOCKED: historical blob content is unavailable");
    findings.push(
      ...scanPublicBytes({
        bytes,
        path: association.path,
        evidencePath: evidencePath("git/blob-path", scanIdentity),
        commit: association.commit,
        blob: association.object,
      }),
    );
  }

  const refs = String(
    git(
      root,
      ["for-each-ref", "--format=%(refname)%09%(objectname)"],
      undefined,
      spawnImpl,
    ),
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  scans.refs = refs.length;
  scans.tags = refs.filter((line) => line.startsWith("refs/tags/")).length;
  for (const line of refs) {
    const [ref] = line.split("\t");
    findings.push(
      ...scanPublicBytes({
        bytes: ref,
        path: ref,
        evidencePath: evidencePath("git/ref", ref),
      }),
    );
  }
  scans.lfs_pointers = [...objects.values()].filter((bytes) =>
    bytes
      .subarray(0, 100)
      .toString("utf8")
      .includes("https://git-lfs.github.com/spec/v1"),
  ).length;
  scans.submodules = associations.filter(
    (entry) => entry.mode === "160000" || entry.type === "commit",
  ).length;
  const workPaths = String(
    git(root, ["ls-files", "-co", "--exclude-standard"], undefined, spawnImpl),
  )
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
        path,
        evidencePath: evidencePath("working", path),
      }),
    );
    scans.working_tree += 1;
  }
  const stagedLines = String(
    git(root, ["ls-files", "-s"], undefined, spawnImpl),
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const stagedIds = [
    ...new Set(stagedLines.map((line) => line.split(/\s+/u)[1])),
  ];
  const staged = batchBlobs(root, stagedIds, spawnImpl);
  scans.staged_bytes = staged.size;
  for (const line of stagedLines) {
    const [metadata, path] = line.split("\t");
    const blob = metadata.split(/\s+/u)[1];
    findings.push(
      ...scanPublicBytes({
        bytes: staged.get(blob),
        path,
        evidencePath: evidencePath("staged", `${blob}\0${path}`),
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
          path: name,
          evidencePath: `staging/${name}`,
        }),
      );
      scans.release_staging += 1;
    }
  }
  const github = await scanGithub({
    repository,
    token,
    findings,
    scans,
    fetchImpl,
    spawnImpl,
  });
  const provenance = {
    target_commit: targetCommit,
    scan_method: PUBLIC_AUDIT_SCAN_METHOD,
    ref_set_sha256: hashSet(refs),
    reachable_commit_set_sha256: hashSet(reachableCommits),
    reachable_tree_set_sha256: hashSet(treeIds),
    reachable_blob_set_sha256: hashSet(blobIds),
    commit_path_blob_associations_sha256: hashSet(
      associations.map(
        (entry) =>
          `${entry.commit}\t${entry.mode}\t${entry.type}\t${entry.object}\t${entry.path}`,
      ),
    ),
    actions_run_set_sha256: github.runSetSha256,
    actions_job_set_sha256: github.jobSetSha256,
    actions_artifact_set_sha256: github.artifactSetSha256,
    repository_scan_complete: true,
    actions_scan_complete: true,
  };
  const report = buildPublicAuditReport({
    repository,
    targetCommit,
    repositoryVisibility: github.visibility,
    phase,
    scans,
    findings,
    provenance,
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
  const structuralErrors = validation.errors.filter(
    (error) => error !== "public audit has findings or did not pass",
  );
  if (structuralErrors.length > 0)
    throw new Error(
      `public audit report self-validation failed: ${structuralErrors.join("; ")}`,
    );
  await writeFile(outputPath, bytes, { flag: "wx" });
  process.stdout.write(
    `${JSON.stringify({ result: report.result, findings: report.findings_count, output: outputPath, bytes: bytes.byteLength })}\n`,
  );
  return report;
}

async function main() {
  const report = await runPublicExposureAudit({
    cwd: process.cwd(),
    repository: option("--repository"),
    targetCommit: option("--target-sha"),
    phase: option("--phase"),
    output: option("--output"),
    staging: option("--staging", undefined),
    token: process.env.GITHUB_TOKEN,
  });
  if (report.findings_count > 0) process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
