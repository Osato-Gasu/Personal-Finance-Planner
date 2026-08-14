import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const routes = [
  ["overview", "総合サマリー"],
  ["budget", "家計・生活費"],
  ["take-home", "手取り計算"],
  ["investments", "NISA・iDeCo"],
  ["settings", "設定"],
];
const storageKey = "personal-finance-planner:state:v6";

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

export async function runDistributionBrowserSmoke(baseUrl) {
  const launched = await launchSystemChromium();
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "配布 browser evidence "),
  );
  const browser = launched.browser;
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const consoleErrors = [];
    const pageErrors = [];
    const unexpectedRequests = [];
    const expectedOrigin = new URL(baseUrl).origin;
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        request.isNavigationRequest() &&
        request.resourceType() === "document" &&
        url.origin === expectedOrigin &&
        (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))
      )
        return;
      unexpectedRequests.push(`${request.resourceType()} ${request.url()}`);
    });
    await page.goto(`${baseUrl}#/settings`, { waitUntil: "load" });
    await page.getByRole("heading", { level: 2, name: "設定" }).waitFor();
    await page.getByText("version 0.1.0", { exact: true }).waitFor();
    await page
      .getByText("手取り制度確認日 2026-08-12", { exact: true })
      .waitFor();
    await page
      .getByText("NISA制度確認日 2026-08-12", { exact: true })
      .waitFor();
    await page
      .getByText("iDeCo制度確認日 2026-08-13", { exact: true })
      .waitFor();
    const settingsBytes = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    assert.ok(
      settingsBytes,
      "settings route must preserve a valid stored state",
    );
    await page.reload({ waitUntil: "load" });
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
      settingsBytes,
    );

    for (const [route, label] of routes) {
      await page.getByRole("link", { name: label }).click();
      await page.getByRole("heading", { level: 2, name: label }).waitFor();
      assert.equal(new URL(page.url()).hash, `#/${route}`);
    }
    await page.reload({ waitUntil: "load" });
    await page.getByRole("heading", { level: 2, name: "設定" }).waitFor();

    await page.setViewportSize({ width: 360, height: 800 });
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      true,
    );
    await page.getByRole("link", { name: "総合サマリー" }).focus();
    assert.equal(
      await page
        .getByRole("link", { name: "総合サマリー" })
        .evaluate((element) => element === element.ownerDocument.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.notEqual(
      await page.evaluate(() => document.activeElement?.tagName),
      "BODY",
    );
    await page.setViewportSize({ width: 1280, height: 900 });

    const selfName = page.getByLabel("本人の表示名");
    await selfName.fill("配布テスト本人");
    await selfName
      .locator("xpath=ancestor::form")
      .getByRole("button", { name: "表示名を保存" })
      .click();
    const persisted = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    assert.match(persisted ?? "", /配布テスト本人/u);
    await page.reload({ waitUntil: "load" });
    assert.equal(
      await page.getByLabel("本人の表示名").inputValue(),
      "配布テスト本人",
    );

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "JSONバックアップを保存" }).click(),
    ]);
    assert.match(
      download.suggestedFilename(),
      /^personal-finance-planner-\d{4}-\d{2}-\d{2}\.json$/u,
    );
    const beforeImport = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    assert.ok(beforeImport);
    const importedState = JSON.parse(beforeImport);
    importedState.members[0].displayName = "配布import成功";
    const importPath = join(temporaryDirectory, "配布 import fixture.json");
    await writeFile(importPath, `${JSON.stringify(importedState)}\n`, "utf8");
    const fileInput = page.getByLabel("JSONバックアップを復元");
    await fileInput.setInputFiles(importPath);
    await page.getByText(/復元候補を検証しました/u).waitFor();
    await page.getByRole("button", { name: "復元をキャンセル" }).click();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
      beforeImport,
    );
    await fileInput.setInputFiles(importPath);
    await page.getByRole("button", { name: "確認して復元" }).click();
    assert.match(
      (await page.evaluate((key) => localStorage.getItem(key), storageKey)) ??
        "",
      /配布import成功/u,
    );
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(unexpectedRequests, []);
    return {
      channel: launched.channel,
      routes: routes.length,
      viewport: "360px",
      keyboard_focus: "passed",
      settings_metadata: "passed",
      storage_persistence: "passed",
      backup_export: "passed",
      import_preview_cancel_success: "passed",
      runtime_external_requests: 0,
      console_errors: 0,
      page_errors: 0,
    };
  } finally {
    await browser.close();
    await rm(temporaryDirectory, { recursive: true });
  }
}
