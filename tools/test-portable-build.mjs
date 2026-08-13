import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = path.resolve(import.meta.dirname, "..");
const builtHtml = path.join(projectRoot, "dist", "index.html");
const storageKey = "personal-finance-planner:state:v5";
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

  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedNow = "2026-08-13T03:00:00.000Z";
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length === 0 ? [fixedNow] : args));
      }
      static now() {
        return new NativeDate(fixedNow).getTime();
      }
    }
    globalThis.Date = FixedDate;
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
  await assertContains(page.getByTestId("overview-reference-month"), "2026-08");
  await assertContains(
    page.getByRole("heading", { name: "人物別の計算状態" }).locator(".."),
    "手取り 未設定／NISA 未設定／iDeCo 未設定",
  );
  assert.equal(await page.locator("main [role='alert']").count(), 0);

  await page.getByRole("link", { name: "家計・生活費" }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  await page.getByRole("heading", { level: 2, name: "家計・生活費" }).waitFor();
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.waitForURL(`${standaloneUrl}#/take-home`);
  await page.goBack();
  await page.waitForURL(`${standaloneUrl}#/budget`);

  await page.getByRole("link", { name: "NISA・iDeCo" }).click();
  await page.waitForURL(`${standaloneUrl}#/investments`);
  await page.getByRole("heading", { level: 2, name: "NISA・iDeCo" }).waitFor();
  if ((await page.getByTestId("nisa-birth-member-self").count()) !== 1) {
    throw new Error(
      `NISA UI did not render: body=${JSON.stringify(await page.locator("body").innerText())}; pageErrors=${JSON.stringify(pageErrors)}; consoleErrors=${JSON.stringify(consoleErrors)}`,
    );
  }
  await page.getByRole("heading", { name: "iDeCoベータ" }).waitFor();
  await page.getByTestId("nisa-member-select").selectOption("member-partner");
  assert.equal(
    await page.getByTestId("nisa-create-member-partner").isDisabled(),
    true,
  );
  await page.getByTestId("nisa-member-select").selectOption("member-self");
  await page.getByTestId("nisa-birth-member-self").fill("2008-01-02");
  await page.getByTestId("nisa-birth-member-self").press("Tab");
  await page.getByTestId("nisa-create-member-self").click();
  await page
    .getByRole("heading", { name: "運用シナリオ（推奨値なし）" })
    .waitFor();
  await page.getByTestId("nisa-resident-confirmed").check();
  await page.getByRole("heading", { name: "試算状態: incomplete" }).waitFor();
  for (const testId of [
    "nisa-current-balance",
    "nisa-current-book-value",
    "nisa-used-limit",
    "nisa-used-growth-limit",
    "nisa-monthly-tsumitate",
    "nisa-monthly-growth",
  ]) {
    assert.equal(await page.getByTestId(testId).inputValue(), "");
  }
  const blankPlanBytes = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(JSON.parse(blankPlanBytes).nisaPlans[0].currentBalanceYen, null);
  assert.equal(await page.getByTestId("nisa-return-bp").inputValue(), "");
  assert.equal(await page.getByTestId("nisa-fee-bp").inputValue(), "");
  assert.equal(await page.getByTestId("nisa-inflation-bp").inputValue(), "");
  await page.getByTestId("nisa-return-bp").focus();
  assert.equal(
    await page
      .getByTestId("nisa-return-bp")
      .evaluate((element) => element === globalThis.document.activeElement),
    true,
  );
  await page.getByTestId("nisa-return-bp").pressSequentially("0");
  await page.getByTestId("nisa-return-bp").press("Tab");
  await page.getByTestId("nisa-fee-bp").pressSequentially("0");
  await page.getByTestId("nisa-fee-bp").press("Tab");
  await page.getByTestId("nisa-inflation-bp").pressSequentially("0");
  await page.getByTestId("nisa-inflation-bp").press("Tab");
  for (const testId of [
    "nisa-current-balance",
    "nisa-current-book-value",
    "nisa-used-limit",
    "nisa-used-growth-limit",
    "nisa-monthly-growth",
  ]) {
    await page.getByTestId(testId).fill("0");
    await page.getByTestId(testId).press("Tab");
  }
  await page.getByTestId("nisa-monthly-tsumitate").fill("100000");
  await page.getByTestId("nisa-monthly-tsumitate").press("Tab");
  await page.getByRole("heading", { name: "試算状態: complete" }).waitFor();
  await assertContains(
    page.getByTestId("nisa-result"),
    "2026年: つみたて投資枠 上限 1,200,000円／使用 1,200,000円／残枠 0円",
  );
  await assertContains(
    page.getByTestId("nisa-limit-reach"),
    "計画期間内に到達しない",
  );
  const limitReachText = await page
    .getByTestId("nisa-limit-reach")
    .textContent();
  assert.ok(limitReachText?.includes("非課税保有限度額への到達"));
  assert.ok(limitReachText?.includes("成長投資枠内数への到達"));
  assert.ok(!limitReachText?.includes("1,800万円"));
  assert.ok(!limitReachText?.includes("1,200万円"));
  await page.getByTestId("nisa-current-balance").fill("");
  await page.getByTestId("nisa-current-balance").press("Tab");
  await page.getByRole("heading", { name: "試算状態: incomplete" }).waitFor();
  const clearBytes = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(JSON.parse(clearBytes).nisaPlans[0].currentBalanceYen, null);
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.getByTestId("nisa-current-balance").inputValue(), "");
  await page.getByTestId("nisa-current-balance").fill("0");
  await page.getByTestId("nisa-current-balance").press("Tab");
  await page.getByRole("heading", { name: "試算状態: complete" }).waitFor();
  await page.getByTestId("nisa-add-purchase").click();
  const purchaseRow = page
    .locator(".inline-form")
    .filter({ has: page.getByRole("button", { name: "臨時拠出を削除" }) });
  assert.equal(await purchaseRow.getByLabel("金額").inputValue(), "");
  await page.getByRole("heading", { name: "試算状態: incomplete" }).waitFor();
  await purchaseRow.getByLabel("金額").fill("1");
  await purchaseRow.getByLabel("金額").press("Tab");
  await page.getByRole("heading", { name: "試算状態: invalid" }).waitFor();
  await assertContains(page.getByTestId("nisa-issues"), "1円超過");
  const nisaBytesBeforeReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.ok(nisaBytesBeforeReload, "NISA state was not saved");
  assert.equal(
    JSON.parse(nisaBytesBeforeReload).nisaPlans[0].additionalPurchases[0]
      .amountYen,
    1,
  );
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "試算状態: invalid" }).waitFor();
  await assertContains(page.getByTestId("nisa-issues"), "1円超過");
  const reloadedPurchaseRow = page
    .locator(".inline-form")
    .filter({ has: page.getByRole("button", { name: "臨時拠出を削除" }) });
  assert.equal(await reloadedPurchaseRow.getByLabel("金額").inputValue(), "1");
  await reloadedPurchaseRow.getByLabel("金額").fill("2");
  await reloadedPurchaseRow.getByLabel("金額").press("Tab");
  await assertContains(page.getByTestId("nisa-issues"), "2円超過");
  await page.getByRole("button", { name: "臨時拠出を削除" }).click();
  await page.getByRole("heading", { name: "試算状態: complete" }).waitFor();
  await page
    .getByTestId("nisa-scenario-select")
    .selectOption({ label: "強気" });
  await page.getByRole("heading", { name: "試算状態: incomplete" }).waitFor();
  assert.equal(await page.getByTestId("nisa-return-bp").inputValue(), "");
  await page
    .getByTestId("nisa-scenario-select")
    .selectOption({ label: "標準" });
  await page.getByRole("heading", { name: "試算状態: complete" }).waitFor();

  await page.getByTestId("ideco-member-select").selectOption("member-partner");
  assert.equal(
    await page.getByTestId("ideco-create-member-partner").isDisabled(),
    true,
  );
  await page.getByTestId("ideco-member-select").selectOption("member-self");
  await page.getByTestId("ideco-create-member-self").click();
  const idecoCard = page.locator(".ideco-card");
  await idecoCard
    .getByTestId("ideco-participant-category")
    .selectOption("category2");
  await idecoCard.getByTestId("ideco-category-confirmed").check();
  await idecoCard.getByLabel("企業年金区分").selectOption("none");
  await idecoCard.getByLabel("マッチング拠出").selectOption("false");
  await idecoCard.getByTestId("ideco-plus").selectOption("false");
  await idecoCard.getByTestId("ideco-annual-unit").selectOption("false");
  await idecoCard.getByTestId("ideco-start-month").fill("2026-11");
  await idecoCard.getByTestId("ideco-start-month").press("Tab");
  await idecoCard.getByLabel("目標年月", { exact: true }).fill("2026-12");
  await idecoCard.getByLabel("目標年月", { exact: true }).press("Tab");
  for (const testId of ["ideco-current-balance", "ideco-monthly-fee"]) {
    assert.equal(await idecoCard.getByTestId(testId).inputValue(), "");
    await idecoCard.getByTestId(testId).fill("0");
    await idecoCard.getByTestId(testId).press("Tab");
  }
  await idecoCard.getByLabel("開始月直前までの本人拠出元本累計").fill("0");
  await idecoCard.getByLabel("開始月直前までの本人拠出元本累計").press("Tab");
  assert.equal(
    await idecoCard.getByTestId("ideco-monthly-contribution").inputValue(),
    "",
  );
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: incomplete" })
    .waitFor();
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("0");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: complete" })
    .waitFor();
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("23001");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: invalid" })
    .waitFor();
  await assertContains(idecoCard.getByTestId("ideco-result"), "1円");
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("23000");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: complete" })
    .waitFor();
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "jp-ideco-2024-12-01",
  );
  await idecoCard.getByTestId("ideco-start-month").fill("2026-12");
  await idecoCard.getByTestId("ideco-start-month").press("Tab");
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("62000");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: complete" })
    .waitFor();
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "jp-ideco-2026-12-01",
  );
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("62001");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: invalid" })
    .waitFor();
  await assertContains(idecoCard.getByTestId("ideco-result"), "1円");
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("62000");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await idecoCard.getByTestId("ideco-plus").selectOption("true");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: unsupported" })
    .waitFor();
  await idecoCard.getByTestId("ideco-plus").selectOption("false");
  await idecoCard.getByTestId("ideco-annual-unit").selectOption("true");
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: unsupported" })
    .waitFor();
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "月別指定（年単位）拠出は今回のベータでは未対応",
  );
  await idecoCard.getByTestId("ideco-annual-unit").selectOption("false");
  await idecoCard
    .getByTestId("ideco-scenario-select")
    .selectOption({ label: "bull" });
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: incomplete" })
    .waitFor();
  await idecoCard
    .getByTestId("ideco-scenario-select")
    .selectOption({ label: "standard" });
  await idecoCard
    .getByRole("heading", { name: "iDeCo試算状態: complete" })
    .waitFor();
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "住民税軽減額未計算",
  );
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "iDeCo受取時の税引前",
  );
  await assertContains(
    idecoCard.getByTestId("ideco-result"),
    "税計算基準日: 2026-08-13",
  );
  await idecoCard.getByTestId("ideco-start-month").fill("2026-11");
  await idecoCard.getByTestId("ideco-start-month").press("Tab");
  await idecoCard.getByTestId("ideco-monthly-contribution").fill("23000");
  await idecoCard.getByTestId("ideco-monthly-contribution").press("Tab");
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page
      .locator(".ideco-card")
      .getByTestId("ideco-monthly-contribution")
      .inputValue(),
    "23000",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth,
    ),
    true,
  );
  await page
    .locator(".ideco-card")
    .getByTestId("ideco-monthly-contribution")
    .focus();
  assert.equal(
    await page
      .locator(".ideco-card")
      .getByTestId("ideco-monthly-contribution")
      .evaluate((element) => element === globalThis.document.activeElement),
    true,
  );
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("button", { name: "2026年計算プランを作成" }).click();
  await page.getByLabel("生年月日", { exact: true }).fill("1990-01-01");
  await page.getByLabel("生年月日", { exact: true }).press("Tab");
  await page.getByLabel("計算プランの生年月日").fill("1990-01-01");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByLabel("計算プランの居住都道府県").selectOption("JP-13");
  await page.getByLabel("年間課税給与（賞与を含む）").fill("6000000");
  await page.getByLabel("年間課税給与（賞与を含む）").press("Tab");
  await page.getByLabel("事業所都道府県").selectOption("JP-13");
  await page.getByLabel("月額報酬（標準報酬推定用）").fill("300000");
  await page.getByLabel("月額報酬（標準報酬推定用）").press("Tab");
  const januaryWage = page.getByLabel("1月の雇用保険対象賃金（賞与除く）", {
    exact: true,
  });
  const februaryWage = page.getByLabel("2月の雇用保険対象賃金（賞与除く）", {
    exact: true,
  });
  assert.equal(await januaryWage.inputValue(), "");
  assert.equal(await februaryWage.inputValue(), "");
  await januaryWage.fill("500000");
  await januaryWage.press("Tab");
  await page.getByRole("heading", { name: "概算結果: incomplete" }).waitFor();
  assert.equal(await februaryWage.inputValue(), "");
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page
      .getByLabel("1月の雇用保険対象賃金（賞与除く）", { exact: true })
      .inputValue(),
    "500000",
  );
  assert.equal(
    await page
      .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
      .inputValue(),
    "",
  );
  await page
    .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
    .fill("0");
  await page
    .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
    .press("Tab");
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page
      .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
      .inputValue(),
    "0",
  );
  for (let month = 3; month <= 11; month += 1) {
    const wage = page.getByLabel(
      `${String(month)}月の雇用保険対象賃金（賞与除く）`,
      { exact: true },
    );
    await wage.fill("500000");
    await wage.press("Tab");
  }
  assert.equal(
    await page
      .getByLabel("12月の雇用保険対象賃金（賞与除く）", { exact: true })
      .inputValue(),
    "",
  );
  await page.getByRole("heading", { name: "概算結果: incomplete" }).waitFor();
  await page
    .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
    .fill("500000");
  await page
    .getByLabel("2月の雇用保険対象賃金（賞与除く）", { exact: true })
    .press("Tab");
  await page
    .getByLabel("12月の雇用保険対象賃金（賞与除く）", { exact: true })
    .fill("500000");
  await page
    .getByLabel("12月の雇用保険対象賃金（賞与除く）", { exact: true })
    .press("Tab");
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
  for (const requiredResultLabel of [
    "その他法定控除",
    "法定控除合計",
    "控除率",
    "iDeCo控除なし基準所得税",
    "iDeCo控除なし復興特別所得税",
    "iDeCo控除なし所得税等（100円未満切捨て前）",
    "iDeCo控除なし所得税等総額",
    "iDeCo控除あり所得税等総額",
    "iDeCoによる所得税等差額",
  ]) {
    await assertContains(
      page.locator(".take-home-result"),
      requiredResultLabel,
    );
  }
  await page.getByTestId("take-home-ideco-mode").selectOption("linked");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await assertContains(
    page.locator(".take-home-result"),
    "iDeCoによる所得税等差額",
  );
  await page.getByRole("link", { name: "NISA・iDeCo" }).click();
  await page.getByRole("button", { name: "iDeCo計画を無効化" }).click();
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("heading", { name: "概算結果: incomplete" }).waitFor();
  const inactiveSelector = page.getByTestId("take-home-linked-ideco-plan");
  assert.equal(await inactiveSelector.locator("option").count(), 1);
  assert.equal(await inactiveSelector.inputValue(), "");
  const inactiveLinkedState = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("state is missing");
    return JSON.parse(bytes);
  }, storageKey);
  assert.equal(inactiveLinkedState.idecoPlans[0].active, false);
  assert.equal(
    inactiveLinkedState.takeHomePlans[0].deductions.linkedIdecoPlanId,
    inactiveLinkedState.idecoPlans[0].id,
  );
  assert.equal(
    inactiveLinkedState.takeHomePlans[0].deductions.annualIdecoContributionYen,
    0,
  );
  await page.getByRole("link", { name: "NISA・iDeCo" }).click();
  await page.getByRole("button", { name: "iDeCo計画を有効化" }).click();
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  assert.equal(
    await page
      .getByTestId("take-home-linked-ideco-plan")
      .locator("option")
      .count(),
    2,
  );
  await page.getByRole("link", { name: "NISA・iDeCo" }).click();
  await page
    .locator(".ideco-card")
    .getByTestId("ideco-plus")
    .selectOption("true");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await page.getByRole("link", { name: "NISA・iDeCo" }).click();
  await page
    .locator(".ideco-card")
    .getByTestId("ideco-plus")
    .selectOption("false");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await page.getByTestId("take-home-ideco-mode").selectOption("manual");
  assert.equal(
    await page.getByLabel("年間iDeCo掛金（手入力）").inputValue(),
    "0",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth,
    ),
    true,
  );
  await page.getByLabel("その他法定控除年額").fill("12345");
  await page.getByLabel("その他法定控除年額").press("Tab");
  await page.getByLabel("社会保険計算方法").selectOption("manual");
  await page.getByLabel("社会保険計算方法").selectOption("kyokai-auto");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  assert.equal(
    await page.getByLabel("その他法定控除年額").inputValue(),
    "12345",
  );
  await assertContains(page.locator(".take-home-result"), "12,345円");
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.getByLabel("その他法定控除年額").inputValue(),
    "12345",
  );
  await assertContains(page.locator(".take-home-result"), "12,345円");
  await page.getByLabel("その他法定控除年額").fill("0");
  await page.getByLabel("その他法定控除年額").press("Tab");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "家計の月間手取りへ連携" }).click();
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "439,597円");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page
    .getByLabel("社会保険計算方法")
    .selectOption("unsupported-uncomputed");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(page.locator(".take-home-result"), "未対応条件");
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "未計算");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("社会保険計算方法").selectOption("kyokai-auto");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await page.getByRole("button", { name: "家計連携を解除" }).click();
  await page.getByLabel("計算プランの生年月日").fill("1956-01-02");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(
    page.locator(".take-home-result"),
    "介護保険第1号被保険者の保険料は自動計算対象外",
  );
  await assertContains(
    page.locator(".take-home-result"),
    "第1号介護保険料を0円として扱っていません",
  );
  await assertContains(
    page.locator(".take-home-result"),
    "社会保険計算方法を年額手入力へ切り替え",
  );
  assert.equal(
    await page.getByRole("button", { name: "家計の月間手取りへ連携" }).count(),
    0,
  );
  await page.getByLabel("社会保険計算方法").selectOption("manual");
  for (const [label, value] of [
    ["健康保険年額", "240000"],
    ["介護保険年額", "120000"],
    ["子ども・子育て支援金年額", "1000"],
    ["厚生年金年額", "1"],
    ["雇用保険年額", "30000"],
  ]) {
    await page.getByLabel(label).fill(value);
    await page.getByLabel(label).press("Tab");
  }
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await assertContains(page.locator(".take-home-result"), "120,000円");
  await page.getByRole("button", { name: "家計の月間手取りへ連携" }).click();
  await page.getByRole("link", { name: "家計・生活費" }).click();
  assert.ok(
    !(await page.getByTestId("household-income").textContent())?.includes(
      "未計算",
    ),
  );
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("社会保険計算方法").selectOption("kyokai-auto");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "未計算");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(
    page.locator(".take-home-result"),
    "介護保険第1号被保険者",
  );
  await page.getByLabel("計算プランの生年月日").fill("1961-06-02");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(page.locator(".take-home-result"), "第1号介護保険料");
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "未計算");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await page.getByLabel("計算プランの生年月日").fill("1951-06-02");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(
    page.locator(".take-home-result"),
    "後期高齢者医療保険料",
  );
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await assertContains(page.getByTestId("household-income"), "未計算");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("計算プランの生年月日").fill("1990-01-01");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
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
  assert.equal(JSON.parse(savedBeforeReload).schemaVersion, 5);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: "家計・生活費" }).waitFor();
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  const savedAfterReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(savedAfterReload, savedBeforeReload);

  await page.getByRole("link", { name: "総合サマリー" }).click();
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page.getByRole("heading", { name: "世帯サマリー" }).waitFor();
  await page.getByRole("heading", { name: "人物別サマリー" }).waitFor();
  await page.getByRole("heading", { name: "人物別資産形成" }).waitFor();
  await page.getByRole("heading", { name: "警告・前提" }).waitFor();
  await page.getByRole("heading", { name: "適用ルールと根拠" }).waitFor();
  await assertContains(page.getByTestId("overview-household"), "月間生活費");
  await assertContains(page.getByTestId("overview-household"), "月間投資額");
  await assertContains(page.getByTestId("overview-household"), "投資差引後");
  await assertContains(page.locator("table.overview-table").first(), "本人");
  await assertContains(page.locator("table.overview-table").first(), "相手");
  await assertContains(
    page.locator("table.overview-table").nth(1),
    "想定残高合計",
  );
  assert.equal(
    await page.locator("main input, main button, main select").count(),
    0,
  );
  const evidenceLinks = page.getByTestId("overview-rules").locator("a");
  assert.ok((await evidenceLinks.count()) > 0);
  for (const link of await evidenceLinks.all()) {
    assert.match(await link.getAttribute("href"), /^https:\/\//u);
  }
  const overviewWarningsBeforeReload = await page
    .getByTestId("overview-warnings")
    .innerText();
  const overviewBytesBeforeReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "世帯サマリー" }).waitFor();
  assert.equal(
    await page.getByTestId("overview-warnings").innerText(),
    overviewWarningsBeforeReload,
  );
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    overviewBytesBeforeReload,
  );
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth,
    ),
    true,
  );
  await page.getByRole("link", { name: "家計・生活費" }).focus();
  assert.equal(
    await page
      .getByRole("link", { name: "家計・生活費" })
      .evaluate((element) => element === element.ownerDocument.activeElement),
    true,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: "家計・生活費" }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);

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
  const legacyFixtureSessionKey =
    "personal-finance-planner:test:legacy-fixture";
  await page.evaluate(
    ({ fixtureKey, legacyKey, state }) => {
      globalThis.sessionStorage.setItem(
        fixtureKey,
        JSON.stringify({ legacyKey, state }),
      );
    },
    {
      fixtureKey: legacyFixtureSessionKey,
      legacyKey: legacyStorageKey,
      state: legacyState,
    },
  );
  await page.addInitScript((fixtureKey) => {
    const fixtureBytes = globalThis.sessionStorage.getItem(fixtureKey);
    if (fixtureBytes === null) return;
    const fixture = JSON.parse(fixtureBytes);
    for (const key of Object.keys(globalThis.localStorage)) {
      if (key.startsWith("personal-finance-planner:state:v"))
        globalThis.localStorage.removeItem(key);
    }
    globalThis.localStorage.setItem(
      fixture.legacyKey,
      JSON.stringify(fixture.state),
    );
    globalThis.sessionStorage.removeItem(fixtureKey);
  }, legacyFixtureSessionKey);
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      legacyStorageKey,
    ),
    JSON.stringify(legacyState),
  );
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
    if (!bytes) throw new Error("migrated v4 state is missing");
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
    if (!bytes) throw new Error("v4 state is missing");
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
    `Portable file:// browser test passed: channel=${launched.channel}, checks=236, routes=${routes.length}, overviewBlankStates=visible, overviewIntegratedSummary=passed, overviewReadOnly=passed, overviewRuleEvidence=https-only, overviewViewport=360px, budgetScenario=passed, takeHomeScenario=passed, nisaPlan=passed, nisaLegalAgeJan2=adult, nisaBlankMoney=null, nisaExplicitZero=valid, nisaAnnualExact=passed, nisaAnnualRemaining=visible, nisaLifetimeReach=visible, nisaRuleOwnedLabels=passed, nisaOneYenOver=invalid, nisaScenarioSwitch=passed, nisaAdditionalCrud=passed, idecoPlan=passed, idecoCurrentScheduledBoundary=passed, idecoNullZero=passed, idecoExactAndOneYenOver=passed, idecoPlus=unsupported, idecoAnnualUnit=unsupported, idecoScenarioSwitch=passed, idecoReferenceDate=explicit, inactiveIdecoLink=incomplete-preserved-reactivated, idecoTakeHomeLink=live, linkedValueLiveUpdate=passed, unresolvedLink=passed, age65To74Auto=unsupported, manualFirstCategoryCare=complete, newUnsupportedLink=blocked, ageTransition65=unsupported, ageTransition75=unsupported, monthlyWageMissing=preserved, monthlyWageZero=preserved, requiredResults=visible, manualAutoOtherDeduction=preserved, sequentialJapaneseSearch=passed, legacyNames=preserved, overflowState=uncomputed, viewport=360px, keyboardFocus=passed, localStorage=preserved, runtimeRequests=0, consoleErrors=0, pageErrors=0.`,
  );
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
