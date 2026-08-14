import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { DISTRIBUTION_ALLOWLIST, sha256 } from "./distribution-lib.mjs";
import { runDistributionBrowserSmoke } from "./distribution-browser-smoke.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

export async function verifyLiveRawBytes({
  baseUrl,
  staging,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
}) {
  const normalizedBase = new URL(
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  const verified = [];
  for (const path of DISTRIBUTION_ALLOWLIST) {
    const response = await fetchImpl(new URL(path, normalizedBase));
    if (!response.ok) throw new Error(`live file is unavailable: ${path}`);
    const liveBytes = Buffer.from(await response.arrayBuffer());
    const stagedBytes = await readFileImpl(resolve(staging, path));
    if (path === ".nojekyll" && liveBytes.byteLength !== 0)
      throw new Error("live .nojekyll must be an empty file");
    assert.deepEqual(liveBytes, stagedBytes, `live bytes differ: ${path}`);
    verified.push({
      path,
      bytes: liveBytes.byteLength,
      sha256: sha256(liveBytes),
    });
  }
  return verified;
}

async function main() {
  const suppliedBaseUrl = option("--base-url");
  const baseUrl = new URL(
    suppliedBaseUrl.endsWith("/") ? suppliedBaseUrl : `${suppliedBaseUrl}/`,
  );
  const staging = resolve(option("--staging"));
  const rawFiles = await verifyLiveRawBytes({
    baseUrl: baseUrl.href,
    staging,
  });
  const evidence = await runDistributionBrowserSmoke(
    new URL("index.html", baseUrl).href,
  );
  console.log(
    JSON.stringify({
      ok: true,
      raw_bytes: "exact",
      raw_files: rawFiles,
      browser: evidence,
    }),
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
