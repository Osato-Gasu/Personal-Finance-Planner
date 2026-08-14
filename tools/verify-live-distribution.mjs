import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DISTRIBUTION_ALLOWLIST } from "./distribution-lib.mjs";
import { runDistributionBrowserSmoke } from "./distribution-browser-smoke.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

const suppliedBaseUrl = option("--base-url");
const baseUrl = new URL(
  suppliedBaseUrl.endsWith("/") ? suppliedBaseUrl : `${suppliedBaseUrl}/`,
);
const staging = resolve(option("--staging"));
for (const path of DISTRIBUTION_ALLOWLIST.filter(
  (candidate) => candidate !== ".nojekyll",
)) {
  const response = await fetch(new URL(path, baseUrl));
  if (!response.ok) throw new Error(`live file is unavailable: ${path}`);
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    await readFile(resolve(staging, path)),
    `live bytes differ: ${path}`,
  );
}
const evidence = await runDistributionBrowserSmoke(
  new URL("index.html", baseUrl).href,
);
console.log(
  JSON.stringify({ ok: true, raw_bytes: "exact", browser: evidence }),
);
