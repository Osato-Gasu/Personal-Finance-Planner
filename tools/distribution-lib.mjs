import { createHash } from "node:crypto";
import {
  mkdir,
  lstat,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, join, parse, relative, resolve, sep } from "node:path";

export const DISTRIBUTION_ALLOWLIST = Object.freeze([
  ".nojekyll",
  "Personal-Finance-Planner.html",
  "SHA256SUMS.txt",
  "index.html",
  "release-manifest.json",
]);

const CHECKSUM_TARGETS = Object.freeze([
  ".nojekyll",
  "Personal-Finance-Planner.html",
  "index.html",
  "release-manifest.json",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertReleaseIdentity({ version, tag, targetCommit }) {
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("version must be a canonical semantic version");
  if (tag !== `v${version}`) throw new Error("tag must equal v<version>");
  if (!/^[0-9a-f]{40}$/.test(targetCommit))
    throw new Error("target commit must be a lowercase full 40-hex SHA");
}

async function assertPlainFile(path, label) {
  await assertNoLinkedPath(path, label);
  const linkInfo = await lstat(path);
  if (linkInfo.isSymbolicLink())
    throw new Error(`${label} must not be a symlink or junction`);
  if (!linkInfo.isFile()) throw new Error(`${label} must be a regular file`);
  const fileInfo = await stat(path);
  if (fileInfo.nlink !== 1)
    throw new Error(`${label} must not be a hard-linked file`);
}

async function assertNoLinkedPath(path, label) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let current = root;
  for (const part of relative(root, absolute).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`${label} must not traverse a symlink or junction`);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") return;
      throw error;
    }
  }
}

async function prepareOutputDirectory(outputDirectory) {
  await assertNoLinkedPath(outputDirectory, "output directory");
  try {
    const info = await lstat(outputDirectory);
    if (info.isSymbolicLink())
      throw new Error("output directory must not be a symlink or junction");
    if (!info.isDirectory()) throw new Error("output path must be a directory");
    const entries = await readdir(outputDirectory);
    if (entries.length !== 0)
      throw new Error("output directory must be absent or empty");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      await mkdir(outputDirectory, { recursive: false });
      return;
    }
    throw error;
  }
}

function canonicalText(value) {
  return Buffer.from(`${value}\n`, "utf8");
}

function fileIdentity(path, bytes) {
  return { path, sha256: sha256(bytes), bytes: bytes.byteLength };
}

export async function buildDistribution({
  version,
  tag,
  targetCommit,
  rootLauncherPath,
  outputDirectory,
  ruleVerifiedAt,
}) {
  assertReleaseIdentity({ version, tag, targetCommit });
  if (basename(rootLauncherPath) !== "Personal-Finance-Planner.html")
    throw new Error("root launcher basename is invalid");
  const launcher = resolve(rootLauncherPath);
  const output = resolve(outputDirectory);
  if (launcher.startsWith(`${output}\\`) || launcher.startsWith(`${output}/`))
    throw new Error("root launcher must not be inside the output directory");
  await assertPlainFile(launcher, "root launcher");
  await prepareOutputDirectory(output);

  const launcherBytes = await readFile(launcher);
  const noJekyllBytes = Buffer.alloc(0);
  const pagesFiles = [
    fileIdentity("index.html", launcherBytes),
    fileIdentity("Personal-Finance-Planner.html", launcherBytes),
    fileIdentity(".nojekyll", noJekyllBytes),
  ];
  const manifest = {
    schema_version: 1,
    product: "Personal Finance Planner",
    version,
    tag,
    target_commit: targetCommit,
    primary_asset: "Personal-Finance-Planner.html",
    primary_asset_sha256: sha256(launcherBytes),
    primary_asset_bytes: launcherBytes.byteLength,
    pages_files: pagesFiles,
    rule_verified_at: {
      take_home: ruleVerifiedAt.takeHome,
      nisa: ruleVerifiedAt.nisa,
      ideco: ruleVerifiedAt.ideco,
    },
    checksums: {
      path: "SHA256SUMS.txt",
      algorithm: "SHA-256",
      self_reference_excluded: true,
    },
    standalone: true,
    offline: true,
    no_backend: true,
    runtime_external_requests: 0,
  };
  const manifestBytes = canonicalText(JSON.stringify(manifest, null, 2));
  const fileBytes = new Map([
    [".nojekyll", noJekyllBytes],
    ["Personal-Finance-Planner.html", launcherBytes],
    ["index.html", launcherBytes],
    ["release-manifest.json", manifestBytes],
  ]);
  const checksumBytes = canonicalText(
    CHECKSUM_TARGETS.map(
      (path) => `${sha256(fileBytes.get(path))}  ${path}`,
    ).join("\n"),
  );
  fileBytes.set("SHA256SUMS.txt", checksumBytes);

  for (const path of DISTRIBUTION_ALLOWLIST) {
    const bytes = fileBytes.get(path);
    if (!bytes) throw new Error(`internal output is missing: ${path}`);
    await writeFile(resolve(output, path), bytes, { flag: "wx" });
  }
  return verifyDistribution({
    version,
    tag,
    targetCommit,
    rootLauncherPath: launcher,
    outputDirectory: output,
  });
}

function assertCanonicalText(bytes, label) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])))
    throw new Error(`${label} must not contain a UTF-8 BOM`);
  const text = bytes.toString("utf8");
  if (text.includes("\r")) throw new Error(`${label} must use LF only`);
  if (!text.endsWith("\n") || text.endsWith("\n\n"))
    throw new Error(`${label} must have exactly one trailing LF`);
  return text;
}

export async function verifyDistribution({
  version,
  tag,
  targetCommit,
  rootLauncherPath,
  outputDirectory,
}) {
  assertReleaseIdentity({ version, tag, targetCommit });
  const output = resolve(outputDirectory);
  const outputInfo = await lstat(output);
  if (outputInfo.isSymbolicLink() || !outputInfo.isDirectory())
    throw new Error("staging output must be a plain directory");
  const paths = (await readdir(output)).sort();
  if (JSON.stringify(paths) !== JSON.stringify(DISTRIBUTION_ALLOWLIST))
    throw new Error(`staging allowlist mismatch: ${paths.join(",")}`);
  for (const path of paths)
    await assertPlainFile(resolve(output, path), `staging file ${path}`);

  const launcherBytes = await readFile(resolve(rootLauncherPath));
  const indexBytes = await readFile(resolve(output, "index.html"));
  const downloadBytes = await readFile(
    resolve(output, "Personal-Finance-Planner.html"),
  );
  if (!launcherBytes.equals(indexBytes) || !launcherBytes.equals(downloadBytes))
    throw new Error("launcher and staged HTML bytes must be identical");
  const noJekyll = await readFile(resolve(output, ".nojekyll"));
  if (noJekyll.byteLength !== 0) throw new Error(".nojekyll must be empty");

  const manifestBytes = await readFile(
    resolve(output, "release-manifest.json"),
  );
  const manifestText = assertCanonicalText(
    manifestBytes,
    "release-manifest.json",
  );
  const manifest = JSON.parse(manifestText);
  if (
    manifest.version !== version ||
    manifest.tag !== tag ||
    manifest.target_commit !== targetCommit ||
    manifest.primary_asset_sha256 !== sha256(launcherBytes) ||
    manifest.primary_asset_bytes !== launcherBytes.byteLength ||
    manifest.checksums?.self_reference_excluded !== true ||
    manifest.runtime_external_requests !== 0
  )
    throw new Error("release manifest identity mismatch");

  const checksumBytes = await readFile(resolve(output, "SHA256SUMS.txt"));
  const checksumText = assertCanonicalText(checksumBytes, "SHA256SUMS.txt");
  const expectedLines = [];
  for (const path of CHECKSUM_TARGETS) {
    const bytes = await readFile(resolve(output, path));
    expectedLines.push(`${sha256(bytes)}  ${path}`);
  }
  if (checksumText !== `${expectedLines.join("\n")}\n`)
    throw new Error("SHA256SUMS.txt identity mismatch");
  if (checksumText.includes("SHA256SUMS.txt"))
    throw new Error("SHA256SUMS.txt must exclude self-reference");

  return {
    paths,
    launcher: fileIdentity("Personal-Finance-Planner.html", launcherBytes),
    manifest: fileIdentity("release-manifest.json", manifestBytes),
    checksums: fileIdentity("SHA256SUMS.txt", checksumBytes),
    nojekyll: fileIdentity(".nojekyll", noJekyll),
  };
}
