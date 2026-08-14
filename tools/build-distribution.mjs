import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build as viteBuild } from "vite";
import { buildDistribution } from "./distribution-lib.mjs";
import packageMetadata from "../package.json" with { type: "json" };

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1])
    throw new Error(`missing required option: ${name}`);
  return process.argv[index + 1];
}

const version = readOption("--version");
if (version !== packageMetadata.version)
  throw new Error("version must equal package.json version");

const repositoryRoot = resolve(import.meta.dirname, "..");
const metadataBuild = await mkdtemp(join(tmpdir(), "pfp-product-metadata-"));
try {
  await viteBuild({
    configFile: false,
    root: repositoryRoot,
    logLevel: "silent",
    build: {
      ssr: resolve(repositoryRoot, "src/product-metadata.ts"),
      outDir: metadataBuild,
      emptyOutDir: false,
      rollupOptions: { output: { entryFileNames: "product-metadata.mjs" } },
    },
  });
  const { productMetadata } = await import(
    pathToFileURL(resolve(metadataBuild, "product-metadata.mjs")).href
  );
  const result = await buildDistribution({
    version,
    tag: readOption("--tag"),
    targetCommit: readOption("--target-commit"),
    rootLauncherPath: resolve(readOption("--root-launcher")),
    outputDirectory: resolve(readOption("--output")),
    ruleVerifiedAt: productMetadata.ruleVerifiedAt,
  });
  console.log(JSON.stringify(result));
} finally {
  await rm(metadataBuild, { recursive: true });
}
