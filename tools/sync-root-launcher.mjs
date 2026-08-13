import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "dist", "index.html");
const target = resolve(root, "Personal-Finance-Planner.html");
const built = await readFile(source);

if (process.argv.includes("--check")) {
  let existing;
  try {
    existing = await readFile(target);
  } catch {
    throw new Error(
      "Personal-Finance-Planner.html is missing; run npm run build",
    );
  }
  if (!built.equals(existing))
    throw new Error(
      "Personal-Finance-Planner.html is stale; run npm run build",
    );
  console.log(`launcher freshness: PASS (${String(built.byteLength)} bytes)`);
} else {
  await writeFile(target, built);
  console.log(
    `launcher synchronized: ${target} (${String(built.byteLength)} bytes)`,
  );
}
