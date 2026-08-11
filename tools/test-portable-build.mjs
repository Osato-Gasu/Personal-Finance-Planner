import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = path.resolve(import.meta.dirname, "..");
const builtHtml = path.join(projectRoot, "dist", "index.html");
const storageKey = "personal-finance-planner:state:v1";
const routes = [
  ["overview", "総合サマリー"],
  ["budget", "家計・生活費"],
  ["take-home", "手取り計算"],
  ["investments", "NISA・iDeCo"],
  ["settings", "設定"],
];

async function launchSystemChromium() {
  const channels = [
    process.env.PORTABLE_BROWSER_CHANNEL,
    "msedge",
    "chrome",
  ].filter(
    (channel, index, values) => channel && values.indexOf(channel) === index,
  );
  const failures = [];
  for (const channel of channels) {
    try {
      return {
        browser: await chromium.launch({ channel, headless: true }),
        channel,
      };
    } catch (error) {
      failures.push(
        `${channel}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  throw new Error(
    `No supported system Chromium browser could launch.\n${failures.join("\n")}`,
  );
}

function assertStandaloneMarkup(html) {
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/iu);
  assert.doesNotMatch(
    html,
    /<link\b[^>]*\brel\s*=\s*["'](?:stylesheet|modulepreload)["']/iu,
  );
  assert.doesNotMatch(html, /\bimport\s*\(/u);
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["']\/(?!\/)/iu);
  assert.doesNotMatch(html, /https?:\/\//iu);
  assert.match(html, /<script\b[^>]*>[\s\S]+<\/script>/iu);
  assert.match(html, /<style\b[^>]*>[\s\S]+<\/style>/iu);
}

async function expectRoute(page, standaloneUrl, route, label) {
  await page.goto(`${standaloneUrl}#/${route}`, { waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: label }).waitFor();
  assert.equal(new globalThis.URL(page.url()).hash, `#/${route}`);
}

const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "Personal Finance Planner ポータブル "),
);
let browser;
try {
  const html = await readFile(builtHtml, "utf8");
  assertStandaloneMarkup(html);

  const standaloneHtml = path.join(temporaryDirectory, "index.html");
  await copyFile(builtHtml, standaloneHtml);
  assert.deepEqual(await readdir(temporaryDirectory), ["index.html"]);
  const standaloneUrl = pathToFileURL(standaloneHtml).href;

  const launched = await launchSystemChromium();
  browser = launched.browser;
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const unexpectedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const requestUrl = request.url().split("#", 1)[0];
    if (
      request.isNavigationRequest() &&
      request.resourceType() === "document" &&
      requestUrl === standaloneUrl
    ) {
      return;
    }
    unexpectedRequests.push(`${request.resourceType()} ${request.url()}`);
  });

  await page.goto(standaloneUrl, { waitUntil: "load" });
  await page
    .getByRole("heading", { level: 1, name: "暮らしと資産プランナー" })
    .waitFor();
  assert.equal(await page.title(), "暮らしと資産プランナー");
  assert.equal(
    await page
      .getByRole("navigation", { name: "主要画面" })
      .getByRole("link")
      .count(),
    5,
  );
  await page.waitForURL(`${standaloneUrl}#/overview`);

  for (const [route, label] of routes) {
    await expectRoute(page, standaloneUrl, route, label);
  }

  await page.goto(`${standaloneUrl}#/unknown`, { waitUntil: "load" });
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page.getByRole("heading", { level: 2, name: "総合サマリー" }).waitFor();

  await page.getByRole("link", { name: "家計・生活費" }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  await page.getByRole("heading", { level: 2, name: "家計・生活費" }).waitFor();
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.waitForURL(`${standaloneUrl}#/take-home`);
  await page.goBack();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  await page.goForward();
  await page.waitForURL(`${standaloneUrl}#/take-home`);

  await page.getByRole("link", { name: "設定" }).click();
  await page.waitForURL(`${standaloneUrl}#/settings`);
  await page.getByRole("heading", { level: 2, name: "設定" }).waitFor();
  await page.waitForFunction(
    (key) =>
      JSON.parse(globalThis.localStorage.getItem(key)).activeRoute ===
      "settings",
    storageKey,
  );
  const savedBeforeReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.ok(
    savedBeforeReload,
    "application state was not saved to localStorage",
  );
  assert.equal(JSON.parse(savedBeforeReload).activeRoute, "settings");
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: "設定" }).waitFor();
  const savedAfterReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(savedAfterReload, savedBeforeReload);

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log(
    `Portable file:// browser test passed: channel=${launched.channel}, checks=15, routes=${routes.length}, localStorage=preserved, runtimeRequests=0.`,
  );
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
