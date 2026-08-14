import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { runDistributionBrowserSmoke } from "./distribution-browser-smoke.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "配布 HTTP staging "));
const staging = join(temporaryDirectory, "公開 staging");
let server;
try {
  await execFileAsync(process.execPath, [
    resolve(root, "tools/build-distribution.mjs"),
    "--version",
    "0.1.0",
    "--tag",
    "v0.1.0",
    "--target-commit",
    "a".repeat(40),
    "--root-launcher",
    resolve(root, "Personal-Finance-Planner.html"),
    "--output",
    staging,
  ]);
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      const name = pathname === "/" ? "index.html" : pathname.slice(1);
      if (
        ![
          ".nojekyll",
          "Personal-Finance-Planner.html",
          "SHA256SUMS.txt",
          "index.html",
          "release-manifest.json",
        ].includes(name)
      ) {
        response.writeHead(404).end();
        return;
      }
      const bytes = await readFile(join(staging, name));
      const type =
        extname(name) === ".html"
          ? "text/html; charset=utf-8"
          : "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": type,
        "Content-Length": bytes.byteLength,
      });
      response.end(bytes);
    } catch (error) {
      response
        .writeHead(500)
        .end(error instanceof Error ? error.message : "error");
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("HTTP server address is unavailable");
  const evidence = await runDistributionBrowserSmoke(
    `http://127.0.0.1:${String(address.port)}/`,
  );
  console.log(`Staged HTTP browser test passed: ${JSON.stringify(evidence)}`);
} finally {
  if (server)
    await new Promise((resolvePromise) => server.close(resolvePromise));
  await rm(temporaryDirectory, { recursive: true });
}
