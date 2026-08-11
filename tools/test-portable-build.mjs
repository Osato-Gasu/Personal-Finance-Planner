import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = path.resolve(import.meta.dirname, "..");
const builtHtml = path.join(projectRoot, "dist", "index.html");
const storageKey = "personal-finance-planner:state:v3";
const legacyStorageKey = "personal-finance-planner:state:v1";
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
  assert.match(html, /<script\b[^>]*>[\s\S]+<\/script>/iu);
  assert.match(html, /<style\b[^>]*>[\s\S]+<\/style>/iu);
}

async function expectRoute(page, standaloneUrl, route, label) {
  await page.goto(`${standaloneUrl}#/${route}`, { waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: label }).waitFor();
  assert.equal(new globalThis.URL(page.url()).hash, `#/${route}`);
}

async function assertContains(locator, expected) {
  await locator.waitFor();
  const text = await locator.textContent();
  assert.ok(
    text?.includes(expected),
    `Expected ${JSON.stringify(text)} to contain ${expected}`,
  );
}

async function addExpense(page, values) {
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "費目管理" }) });
  const form = section.locator("form.expense-form").first();
  await form.getByLabel("費目カテゴリ").selectOption({ label: "生活費" });
  await form.getByLabel("用途").fill(values.purpose);
  await form.getByLabel("1回あたり出費").fill(String(values.amount));
  await form.getByLabel("周期値").fill(String(values.cycle));
  await form.getByLabel("周期単位").selectOption(values.unit);
  await form.getByLabel("周期内回数").fill(String(values.occurrences));
  await form.getByLabel("費目範囲").selectOption(values.scope);
  await form.getByRole("button", { name: "費目を追加" }).click();
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
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
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

  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("button", { name: "2026年計算プランを作成" }).click();
  await page.getByLabel("生年月日").fill("1990-01-01");
  await page.getByLabel("生年月日").press("Tab");
  await page.getByLabel("年間課税給与（賞与を含む）").fill("6000000");
  await page.getByLabel("年間課税給与（賞与を含む）").press("Tab");
  await page.getByLabel("事業所都道府県").selectOption("JP-13");
  await page.getByLabel("月額報酬（標準報酬推定用）").fill("300000");
  await page.getByLabel("月額報酬（標準報酬推定用）").press("Tab");
  await page.getByLabel("住民税年額を入力する").check();
  await page.getByLabel("住民税年額", { exact: true }).fill("0");
  await page.getByLabel("住民税年額", { exact: true }).press("Tab");
  await page.getByLabel("住民税0円を確認").check();
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await assertContains(page.locator(".take-home-result"), "年間手取り");
  await assertContains(
    page.locator(".take-home-result"),
    "適用ルールと公式根拠",
  );
  await assertContains(
    page.locator(".take-home-result"),
    "事業所都道府県: 東京都 (JP-13)",
  );
  await assertContains(
    page.locator(".take-home-result"),
    "健康保険標準報酬月額: 300,000円",
  );
  await assertContains(
    page.locator(".take-home-result"),
    "jp-kyokai-health-rate-2026",
  );
  await assertContains(page.locator(".take-home-result"), "確認日 2026-08-12");
  await page.getByRole("button", { name: "家計の月間手取りへ連携" }).click();
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "439,597円");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("年間課税給与（賞与を含む）").fill("6100000");
  await page.getByLabel("年間課税給与（賞与を含む）").press("Tab");
  await page.getByRole("button", { name: "賞与を追加" }).click();
  assert.equal(await page.getByLabel("賞与支給日").inputValue(), "2026-06-30");
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  const linkedIncomeAfterEdit = await page
    .getByTestId("household-income")
    .textContent();
  assert.ok(!linkedIncomeAfterEdit?.includes("439,597円"));
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("button", { name: "家計連携を解除" }).click();
  await page.getByRole("link", { name: "家計・生活費" }).click();

  await page.getByLabel("本人の月間手取り").fill("300000");
  await page.getByLabel("同棲モード").check();
  await page.getByLabel("相手の月間手取り").fill("200000");
  await page.getByLabel("本人の既定負担割合（%）").fill("60");
  await page.getByRole("button", { name: "世帯設定を保存" }).click();

  await page.getByLabel("カテゴリ名").fill("生活費");
  await page.getByLabel("カテゴリ説明").fill("毎月の生活費");
  await page.getByRole("button", { name: "カテゴリを追加" }).click();

  await addExpense(page, {
    purpose: "家賃",
    amount: 100_000,
    cycle: 1,
    unit: "month",
    occurrences: 1,
    scope: "shared",
  });
  await addExpense(page, {
    purpose: "日用品",
    amount: 4_500,
    cycle: 2,
    unit: "month",
    occurrences: 1,
    scope: "self",
  });

  await addExpense(page, {
    purpose: "昼食",
    amount: 500,
    cycle: 1,
    unit: "week",
    occurrences: 3,
    scope: "self",
  });

  const search = page.getByLabel("用途検索");
  await search.click();
  await page.keyboard.type("昼食");
  assert.equal(await search.inputValue(), "昼食");
  assert.equal(
    await search.evaluate(
      (element) => element === element.ownerDocument.activeElement,
    ),
    true,
  );
  const expenseList = page.locator(".expense-list");
  await expenseList
    .getByRole("heading", { name: "昼食", exact: true })
    .waitFor();
  assert.equal(await expenseList.getByRole("heading", { level: 4 }).count(), 1);
  await page.keyboard.press("Backspace");
  assert.equal(await search.inputValue(), "昼");
  assert.equal(
    await search.evaluate(
      (element) => element === element.ownerDocument.activeElement,
    ),
    true,
  );
  await page.keyboard.type("食");
  assert.equal(await search.inputValue(), "昼食");
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  assert.equal(await search.inputValue(), "");

  await assertContains(page.getByTestId("household-income"), "500,000円");
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  await assertContains(page.getByTestId("household-remaining"), "391,228円");
  await assertContains(page.getByTestId("self-summary"), "負担額 68,772円");
  await assertContains(page.getByTestId("partner-summary"), "負担額 40,000円");
  await page.getByText("2か月あたり1回", { exact: false }).waitFor();
  await page.getByText("月換算：2,250円", { exact: true }).waitFor();
  await page.getByText("月換算：6,522円", { exact: true }).waitFor();

  const categoryCard = page.locator("article.entity-card").filter({
    has: page.getByRole("heading", { name: "生活費", exact: true }),
  });
  await categoryCard.getByText("編集", { exact: true }).click();
  await categoryCard
    .getByLabel("生活費カテゴリ負担設定")
    .selectOption("custom");
  await categoryCard.getByLabel("生活費カテゴリ本人割合（%）").fill("70");
  await categoryCard
    .getByRole("button", { name: "カテゴリ編集を保存" })
    .click();
  await assertContains(page.getByTestId("self-summary"), "負担額 78,772円");

  const rentCard = page
    .locator("article.entity-card")
    .filter({ has: page.getByRole("heading", { name: "家賃", exact: true }) });
  await rentCard.getByText("編集", { exact: true }).click();
  await rentCard.getByLabel("費目負担設定").selectOption("custom");
  await rentCard.getByLabel("費目本人割合（%）").fill("80");
  await rentCard.getByRole("button", { name: "費目編集を保存" }).click();
  await assertContains(page.getByTestId("self-summary"), "負担額 88,772円");

  await page.getByRole("button", { name: "日用品を無効化" }).click();
  await assertContains(page.getByTestId("household-expense"), "106,522円");
  await page.getByRole("button", { name: "日用品を有効化" }).click();
  await assertContains(page.getByTestId("household-expense"), "108,772円");

  await page.getByLabel("簡易集計").check();
  await page.getByLabel("月間世帯生活費").fill("50000");
  await page.getByRole("button", { name: "簡易生活費を保存" }).click();
  await assertContains(page.getByTestId("household-expense"), "50,000円");
  await page.getByLabel("詳細集計").check();
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  await page.getByRole("heading", { name: "家賃", exact: true }).waitFor();

  const savedBeforeReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.ok(
    savedBeforeReload,
    "application state was not saved to localStorage",
  );
  assert.equal(JSON.parse(savedBeforeReload).schemaVersion, 3);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: "家計・生活費" }).waitFor();
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  const savedAfterReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(savedAfterReload, savedBeforeReload);

  const legacyLongName = "長".repeat(51);
  const legacyState = {
    schemaVersion: 1,
    activeRoute: "budget",
    members: [
      { id: "legacy-self", role: "self", displayName: " 本人 ", active: true },
      {
        id: "legacy-partner",
        role: "partner",
        displayName: legacyLongName,
        active: true,
      },
    ],
    takeHomeInputs: [],
    incomeTargets: [
      { id: "legacy-income-self", memberId: "legacy-self", manualYen: 100_000 },
      {
        id: "legacy-income-partner",
        memberId: "legacy-partner",
        manualYen: 80_000,
      },
    ],
    links: [],
    livingExpenses: [
      {
        id: "legacy-expense",
        memberId: "legacy-self",
        kind: "living-expense",
        amountYen: 1_000,
      },
    ],
    contributionSources: [],
  };
  await page.evaluate(
    ({ currentKey, legacyKey, state }) => {
      globalThis.localStorage.removeItem(currentKey);
      globalThis.localStorage.setItem(legacyKey, JSON.stringify(state));
    },
    { currentKey: storageKey, legacyKey: legacyStorageKey, state: legacyState },
  );
  await page.reload({ waitUntil: "load" });
  const legacySelfName = page.getByLabel("本人表示名");
  const legacyPartnerName = page.getByLabel("相手表示名");
  assert.equal(await legacySelfName.inputValue(), " 本人 ");
  assert.equal(await legacyPartnerName.inputValue(), legacyLongName);
  await page.getByLabel("本人の月間手取り").fill("345678");
  await page.getByLabel("本人の既定負担割合（%）").fill("64");
  await page.getByLabel("同棲モード").uncheck();
  await page.getByRole("button", { name: "世帯設定を保存" }).click();
  const legacyNamesAfterSave = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("migrated v3 state is missing");
    return JSON.parse(bytes).members.map((member) => member.displayName);
  }, storageKey);
  assert.deepEqual(legacyNamesAfterSave, [" 本人 ", legacyLongName]);
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.getByLabel("本人表示名").inputValue(), " 本人 ");
  assert.equal(
    await page.getByLabel("相手表示名").inputValue(),
    legacyLongName,
  );

  const overflowBytes = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("v3 state is missing");
    const state = JSON.parse(bytes);
    const source = state.budget.items[0];
    state.budget.items = [
      { ...source, amountYen: Number.MAX_SAFE_INTEGER },
      { ...source, id: "overflow-second", amountYen: 1 },
    ];
    const overflow = JSON.stringify(state);
    globalThis.localStorage.setItem(key, overflow);
    return overflow;
  }, storageKey);
  await page.reload({ waitUntil: "load" });
  await assertContains(
    page.getByTestId("calculation-status"),
    "計算範囲超過／未計算",
  );
  await page.getByLabel("並び替え").selectOption("monthly");
  await assertContains(
    page.getByTestId("calculation-status"),
    "計算範囲超過／未計算",
  );
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    overflowBytes,
  );

  await page.setViewportSize({ width: 360, height: 800 });
  const viewportFits = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth <=
      globalThis.document.documentElement.clientWidth,
  );
  assert.equal(viewportFits, true);
  await page.keyboard.press("Tab");
  assert.notEqual(
    await page.evaluate(() => globalThis.document.activeElement?.tagName),
    "BODY",
  );

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log(
    `Portable file:// browser test passed: channel=${launched.channel}, checks=82, routes=${routes.length}, budgetScenario=passed, takeHomeScenario=passed, linkedValueLiveUpdate=passed, sequentialJapaneseSearch=passed, legacyNames=preserved, overflowState=uncomputed, viewport=360px, localStorage=preserved, runtimeRequests=0.`,
  );
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
