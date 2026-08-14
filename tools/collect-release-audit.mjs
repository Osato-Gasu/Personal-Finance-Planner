import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  GitHubDistributionApi,
  optionalGet,
} from "./github-distribution-api.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

const repository = option("--repository");
const tag = option("--tag");
const output = resolve(option("--output"));
const api = new GitHubDistributionApi({ token: process.env.GITHUB_TOKEN });
const base = `https://api.github.com/repos/${repository}`;
const tagReference = await optionalGet(
  api,
  `${base}/git/ref/tags/${encodeURIComponent(tag)}`,
);
const release = await optionalGet(
  api,
  `${base}/releases/tags/${encodeURIComponent(tag)}`,
);
const audit = {
  schema_version: 1,
  tag:
    tagReference === null
      ? null
      : {
          name: tag,
          object_type: tagReference.object?.type,
          target: tagReference.object?.sha,
        },
  release:
    release === null
      ? null
      : {
          id: release.id,
          tag: release.tag_name,
          title: release.name,
          draft: release.draft,
          prerelease: release.prerelease,
          assets: release.assets.map((asset) => ({
            id: asset.id,
            name: asset.name,
            sha256: asset.digest,
            bytes: asset.size,
          })),
        },
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(audit, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});
console.log(JSON.stringify(audit));
