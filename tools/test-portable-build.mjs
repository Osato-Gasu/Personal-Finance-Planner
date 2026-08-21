import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = path.resolve(import.meta.dirname, "..");
const builtHtml = path.join(projectRoot, "Personal-Finance-Planner.html");
const distHtml = path.join(projectRoot, "dist", "index.html");
const storageKey = "personal-finance-planner:state:v8";
const schemaVersion6StorageKey = "personal-finance-planner:state:v6";
const legacyStorageKey = "personal-finance-planner:state:v1";
const routes = [
  ["overview", "総合サマリ"],
  ["payroll", "給与計算"],
  ["take-home", "手取り計算"],
  ["budget", "家計簿"],
  ["investments", "NISA + iDeCo"],
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
  await page
    .getByRole("heading", { level: 2, name: label, exact: true })
    .waitFor();
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
  assert.deepEqual(await readFile(builtHtml), await readFile(distHtml));
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
    6,
  );
  await page.waitForURL(`${standaloneUrl}#/overview`);

  for (const [route, label] of routes) {
    await expectRoute(page, standaloneUrl, route, label);
    if (["payroll", "take-home", "budget", "investments"].includes(route)) {
      assert.ok(
        (await page.locator("main [data-area='input']").count()) > 0,
        `${route} must expose an input area`,
      );
      assert.ok(
        (await page.locator("main [data-area='result']").count()) > 0,
        `${route} must expose a result area`,
      );
      await page.setViewportSize({ width: 360, height: 800 });
      assert.equal(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.document.documentElement.clientWidth,
        ),
        true,
        `${route} must not overflow at 360px`,
      );
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  }

  const portableBonusObservations = [
    {
      paymentDate: "2026-06-30",
      grossYen: 400_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: true,
    },
    {
      paymentDate: "2026-12-10",
      grossYen: 500_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: false,
    },
  ];
  await expectRoute(page, standaloneUrl, "payroll", "給与計算");
  await page.getByLabel("基本給（月額）").fill("320000");
  await page.getByLabel("月平均残業時間").fill("10");
  await page.getByLabel("固定手当（月額・課税）").fill("20000");
  await page.getByText("賞与（任意）", { exact: true }).click();
  const firstBonusRow = page.locator(".payroll-bonus-row").first();
  await firstBonusRow.getByLabel("支給日").fill("2026-06-30");
  await firstBonusRow.getByLabel("賞与総額").fill("400000");
  await page.getByRole("button", { name: "+ 賞与を追加" }).click();
  assert.equal(await page.locator(".payroll-bonus-row").count(), 2);
  const secondBonusRow = page.locator(".payroll-bonus-row").nth(1);
  await secondBonusRow.getByLabel("支給日").fill("2026-12-10");
  await secondBonusRow.getByLabel("賞与総額").fill("500000");
  await secondBonusRow.getByLabel("雇用保険対象").uncheck();
  await page.getByRole("button", { name: "給与計画を保存" }).click();
  await page.getByRole("button", { name: "給与計画を更新" }).waitFor();
  const createdPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.ok(createdPayroll?.id);
  assert.deepEqual(
    createdPayroll.bonuses.map((bonus) => ({
      paymentDate: bonus.paymentDate,
      grossYen: bonus.grossYen,
      socialInsuranceEligible: bonus.socialInsuranceEligible,
      employmentInsuranceEligible: bonus.employmentInsuranceEligible,
    })),
    portableBonusObservations,
  );
  await page.getByLabel("基本給（月額）").fill("321000");
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  const savedPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.equal(savedPayroll.baseMonthlyYen, 321_000);
  assert.deepEqual(savedPayroll.bonuses, createdPayroll.bonuses);
  await expectRoute(page, standaloneUrl, "settings", "設定");

  await assertContains(
    page.locator("main"),
    "バックアップをまだ保存していません",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSONバックアップを保存" }).click(),
  ]);
  assert.match(
    download.suggestedFilename(),
    /^personal-finance-planner-\d{4}-\d{2}-\d{2}\.json$/u,
  );
  await page.getByText("JSONバックアップを保存しました。").waitFor();
  const exportedBytes = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(
    JSON.parse(exportedBytes).backup.lastExportedAt,
    "2026-08-13T03:00:00.000Z",
  );
  await page.getByLabel("通知間隔（日）").fill("14");
  await page.getByRole("button", { name: "通知間隔を保存" }).click();
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.getByLabel("通知間隔（日）").inputValue(), "14");

  const beforeInvalidImport = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  await page.locator('input[name="backup-import"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken", "utf8"),
  });
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    beforeInvalidImport,
  );

  const importedState = JSON.parse(beforeInvalidImport);
  importedState.members.find((member) => member.role === "self").displayName =
    "本人\r\n旧版";
  const importBuffer = Buffer.from(JSON.stringify(importedState), "utf8");
  await page.locator('input[name="backup-import"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: importBuffer,
  });
  await page.getByText(/復元候補を検証しました/u).waitFor();
  await page.getByRole("button", { name: "復元をキャンセル" }).click();
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    beforeInvalidImport,
  );
  await page.locator('input[name="backup-import"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: importBuffer,
  });
  await page.getByRole("button", { name: "確認して復元" }).click();
  await page.getByText("バックアップを復元しました。").waitFor();
  assert.equal(
    JSON.parse(
      await page.evaluate(
        (key) => globalThis.localStorage.getItem(key),
        storageKey,
      ),
    ).members.find((member) => member.role === "self").displayName,
    "本人\r\n旧版",
  );

  await page.goto(`${standaloneUrl}#/unknown`, { waitUntil: "load" });
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page.getByRole("heading", { level: 2, name: "総合サマリ" }).waitFor();
  await assertContains(page.getByTestId("overview-reference-month"), "2026-08");
  await assertContains(
    page.getByRole("heading", { name: "人物別の計算状態" }).locator(".."),
    "手取り 未設定／NISA 未設定／iDeCo 未設定",
  );
  assert.equal(await page.locator("main [role='alert']").count(), 0);

  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  await page.getByRole("heading", { level: 2, name: "家計簿" }).waitFor();
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.waitForURL(`${standaloneUrl}#/take-home`);
  await page.goBack();
  await page.waitForURL(`${standaloneUrl}#/budget`);

  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
  await page.waitForURL(`${standaloneUrl}#/investments`);
  await page.getByRole("heading", { level: 2, name: "NISA + iDeCo" }).waitFor();
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
  assert.equal(
    await page.getByLabel("給与情報の入力元").inputValue(),
    savedPayroll.id,
  );
  const automaticallyLinkedState = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return {
      policies: state.budgetIncomePolicies,
      bindings: state.takeHomeCompensationBindings,
      takeHomePlanId: state.takeHomePlans[0]?.id,
      payrollPlanId: state.payrollPlans[0]?.id,
    };
  }, storageKey);
  assert.deepEqual(automaticallyLinkedState.policies, [
    { targetId: "budget-income-self", mode: "auto-take-home" },
    { targetId: "budget-income-partner", mode: "auto-take-home" },
  ]);
  assert.deepEqual(automaticallyLinkedState.bindings, [
    {
      takeHomePlanId: automaticallyLinkedState.takeHomePlanId,
      payrollPlanId: automaticallyLinkedState.payrollPlanId,
      active: true,
    },
  ]);
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
  const automaticTakeHomeMonthly = await page
    .locator(".take-home-result dt", { hasText: "平均月間手取り" })
    .locator("xpath=following-sibling::dd[1]")
    .textContent();
  assert.match(automaticTakeHomeMonthly ?? "", /^[\d,]+円$/u);
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  assert.equal(
    await page.getByLabel("本人手取りの連携方法").inputValue(),
    "auto-take-home",
  );
  await assertContains(
    page.getByTestId("household-income"),
    automaticTakeHomeMonthly,
  );
  const automaticRemaining = (
    (await page.getByTestId("household-remaining").textContent()) ?? ""
  ).match(/[\d,]+円/u)?.[0];
  assert.ok(automaticRemaining);
  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
  await assertContains(page.locator(".funding-context"), automaticRemaining);
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("給与情報の入力元").selectOption("");
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
  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
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
  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
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
  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
  await page
    .locator(".ideco-card")
    .getByTestId("ideco-plus")
    .selectOption("true");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await page.getByRole("link", { name: "NISA + iDeCo" }).click();
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
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await page.getByLabel("本人手取りの連携方法").selectOption("legacy");
  await page.getByLabel("相手手取りの連携方法").selectOption("legacy");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("button", { name: "家計の月間手取りへ連携" }).click();
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await assertContains(page.getByTestId("household-income"), "439,597円");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page
    .getByLabel("社会保険計算方法")
    .selectOption("unsupported-uncomputed");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await assertContains(page.locator(".take-home-result"), "未対応条件");
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
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
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  assert.ok(
    !(await page.getByTestId("household-income").textContent())?.includes(
      "未計算",
    ),
  );
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("社会保険計算方法").selectOption("kyokai-auto");
  await page.getByRole("heading", { name: "概算結果: unsupported" }).waitFor();
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
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
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
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
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await assertContains(page.getByTestId("household-income"), "未計算");
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByLabel("計算プランの生年月日").fill("1990-01-01");
  await page.getByLabel("計算プランの生年月日").press("Tab");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await page.getByLabel("年間課税給与（賞与を含む）").fill("6100000");
  await page.getByLabel("年間課税給与（賞与を含む）").press("Tab");
  await page.getByRole("button", { name: "賞与を追加" }).click();
  assert.equal(await page.getByLabel("賞与支給日").inputValue(), "2026-06-30");
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  const linkedIncomeAfterEdit = await page
    .getByTestId("household-income")
    .textContent();
  assert.ok(!linkedIncomeAfterEdit?.includes("439,597円"));
  await page.getByRole("link", { name: "手取り計算" }).click();
  await page.getByRole("button", { name: "家計連携を解除" }).click();
  await page.getByRole("link", { name: "家計簿", exact: true }).click();

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
  assert.equal(JSON.parse(savedBeforeReload).schemaVersion, 8);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: "家計簿" }).waitFor();
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  const savedAfterReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(savedAfterReload, savedBeforeReload);

  await page.getByRole("link", { name: "総合サマリ" }).click();
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page.getByRole("heading", { name: "世帯サマリー" }).waitFor();
  await page.getByRole("heading", { name: "人物別サマリー" }).waitFor();
  await page.getByRole("heading", { name: "人物別資産形成" }).waitFor();
  await page.getByRole("heading", { name: "警告・前提" }).waitFor();
  await page.getByRole("heading", { name: "適用ルールと根拠" }).waitFor();
  await assertContains(page.getByTestId("overview-household"), "月間生活費");
  await assertContains(page.getByTestId("overview-household"), "月間NISA拠出");
  await assertContains(page.getByTestId("overview-household"), "月間iDeCo掛金");
  await assertContains(page.getByTestId("overview-household"), "月間投資額");
  await assertContains(page.getByTestId("overview-household"), "投資差引後");
  await assertContains(page.locator("table.overview-table").first(), "本人");
  await assertContains(page.locator("table.overview-table").first(), "相手");
  await assertContains(
    page.locator("table.overview-table").nth(1),
    "想定残高合計",
  );
  assert.equal(
    await page
      .locator(
        ".pipeline-overview input, .pipeline-overview button, .pipeline-overview select, [data-testid='overview-household'] input, [data-testid='overview-household'] button, [data-testid='overview-household'] select",
      )
      .count(),
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

  const periodCases = [
    {
      name: "before-start",
      startMonth: "2026-09",
      targetMonth: "2026-12",
      expectedStatus: "iDeCo 未設定",
      expectedAmount: "0円",
    },
    {
      name: "start",
      startMonth: "2026-08",
      targetMonth: "2026-12",
      expectedStatus: "iDeCo 計算済み",
      expectedAmount: null,
    },
    {
      name: "target",
      startMonth: "2026-08",
      targetMonth: "2026-08",
      expectedStatus: "iDeCo 計算済み",
      expectedAmount: null,
    },
    {
      name: "after-end",
      startMonth: "2026-07",
      targetMonth: "2026-07",
      expectedStatus: "iDeCo 未設定",
      expectedAmount: "0円",
    },
  ];
  for (const periodCase of periodCases) {
    const periodBytes = await page.evaluate(
      ({ key, startMonth, targetMonth }) => {
        const bytes = globalThis.localStorage.getItem(key);
        if (bytes === null) throw new Error("overview state is missing");
        const state = JSON.parse(bytes);
        const plan = state.idecoPlans.find(
          (candidate) =>
            candidate.memberId === "member-self" && candidate.active,
        );
        if (!plan) throw new Error("active self iDeCo plan is missing");
        plan.startMonth = startMonth;
        plan.projectionTarget = { type: "month", month: targetMonth };
        plan.taxContributionSnapshots = [];
        const updated = JSON.stringify(state);
        globalThis.localStorage.setItem(key, updated);
        return updated;
      },
      {
        key: storageKey,
        startMonth: periodCase.startMonth,
        targetMonth: periodCase.targetMonth,
      },
    );
    await page.reload({ waitUntil: "load" });
    await page.getByRole("heading", { name: "世帯サマリー" }).waitFor();
    await assertContains(
      page.getByRole("heading", { name: "人物別の計算状態" }).locator(".."),
      periodCase.expectedStatus,
    );
    const idecoCard = page.locator("article.summary-card").filter({
      has: page.getByRole("heading", { name: "月間iDeCo掛金" }),
    });
    if (periodCase.expectedAmount === null) {
      assert.notEqual(await idecoCard.locator("strong").innerText(), "0円");
    } else {
      assert.equal(
        await idecoCard.locator("strong").innerText(),
        periodCase.expectedAmount,
      );
      await assertContains(
        page.getByTestId("overview-warnings"),
        "iDeCoの状態はnot-configuredです。",
      );
    }
    assert.equal(
      await page.evaluate(
        (key) => globalThis.localStorage.getItem(key),
        storageKey,
      ),
      periodBytes,
      `${periodCase.name} overview changed persisted bytes`,
    );
  }

  const maliciousName = '<img src=x onerror="globalThis.__overviewXss=1">';
  const maliciousBytes = await page.evaluate(
    ({ key, displayName }) => {
      const bytes = globalThis.localStorage.getItem(key);
      if (bytes === null) throw new Error("overview state is missing");
      const state = JSON.parse(bytes);
      const self = state.members.find((member) => member.role === "self");
      if (!self) throw new Error("self member is missing");
      self.displayName = displayName;
      state.budget.mode = "simple";
      state.budget.simpleMonthlyExpenseYen = 9_000_000;
      const updated = JSON.stringify(state);
      globalThis.localStorage.setItem(key, updated);
      return updated;
    },
    { key: storageKey, displayName: maliciousName },
  );
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "人物別サマリー" }).waitFor();
  const maliciousRow = page
    .locator("table.overview-table")
    .first()
    .locator("tr", {
      hasText: maliciousName,
    });
  await maliciousRow.getByText(maliciousName, { exact: true }).waitFor();
  assert.equal(await page.locator("main img").count(), 0);
  assert.equal(await page.evaluate(() => globalThis.__overviewXss), undefined);
  assert.match(
    await maliciousRow.locator('td[data-label="投資差引後"]').innerText(),
    /^-/u,
  );
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    maliciousBytes,
  );

  await page.evaluate(
    ({ key, bytes }) => globalThis.localStorage.setItem(key, bytes),
    { key: storageKey, bytes: overviewBytesBeforeReload },
  );
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "世帯サマリー" }).waitFor();
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.document.documentElement.clientWidth,
    ),
    true,
  );
  await page.getByRole("link", { name: "家計簿", exact: true }).focus();
  assert.equal(
    await page
      .getByRole("link", { name: "家計簿", exact: true })
      .evaluate((element) => element === element.ownerDocument.activeElement),
    true,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);

  const legacyLongName = "長".repeat(51);
  const legacyState = {
    schemaVersion: 1,
    activeRoute: "budget",
    members: [
      {
        id: "legacy-self",
        role: "self",
        displayName: "本人\r\n旧版",
        active: true,
      },
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
  assert.equal(await legacySelfName.inputValue(), String.raw`本人\r\n旧版`);
  assert.equal(await legacyPartnerName.inputValue(), legacyLongName);
  await legacySelfName.fill(String.raw`本人\r\n旧版更新`);
  await legacyPartnerName.fill(`${legacyLongName}更新`);
  await page.getByLabel("本人の月間手取り").fill("345678");
  await page.getByLabel("本人の既定負担割合（%）").fill("64");
  await page.getByLabel("同棲モード").uncheck();
  await page.getByRole("button", { name: "世帯設定を保存" }).click();
  const legacyNamesAfterSave = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("migrated v4 state is missing");
    return JSON.parse(bytes).members.map((member) => member.displayName);
  }, storageKey);
  assert.deepEqual(legacyNamesAfterSave, [
    "本人\r\n旧版更新",
    `${legacyLongName}更新`,
  ]);
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.getByLabel("本人表示名").inputValue(),
    String.raw`本人\r\n旧版更新`,
  );
  assert.equal(
    await page.getByLabel("相手表示名").inputValue(),
    `${legacyLongName}更新`,
  );
  const beforeInvalidBudgetNameEdit = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  await page.getByLabel("本人表示名").fill(" \n ");
  await page.getByRole("button", { name: "世帯設定を保存" }).click();
  assert.match(await page.getByRole("alert").innerText(), /self name/);
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    beforeInvalidBudgetNameEdit,
  );
  await page.getByRole("link", { name: "設定" }).click();
  await page.waitForURL(`${standaloneUrl}#/settings`);
  const settingsSelfName = page.getByLabel("本人の表示名");
  const settingsPartnerName = page.getByLabel("相手の表示名");
  assert.equal(
    settingsSelfName ? await settingsSelfName.inputValue() : "",
    String.raw`本人\r\n旧版更新`,
  );
  await settingsSelfName.fill(String.raw` 本人\n設定更新 `);
  await settingsSelfName
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "表示名を保存" })
    .click();
  await settingsPartnerName.fill(`${legacyLongName}${String.raw`\r`}更新`);
  await settingsPartnerName
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "表示名を保存" })
    .click();
  const explicitLegacyNames = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("edited v6 state is missing");
    return JSON.parse(bytes).members.map((member) => member.displayName);
  }, storageKey);
  assert.deepEqual(explicitLegacyNames, [
    " 本人\n設定更新 ",
    `${legacyLongName}\r更新`,
  ]);
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.getByLabel("本人の表示名").inputValue(),
    String.raw` 本人\n設定更新 `,
  );
  assert.equal(
    await page.getByLabel("相手の表示名").inputValue(),
    `${legacyLongName}${String.raw`\r`}更新`,
  );
  const beforeInvalidDisplayNameEdit = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  await page.getByLabel("本人の表示名").fill(" \n ");
  await page
    .getByLabel("本人の表示名")
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "表示名を保存" })
    .click();
  assert.match(await page.getByRole("alert").innerText(), /displayName/);
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    beforeInvalidDisplayNameEdit,
  );

  const migratedV6Bytes = await page.evaluate(
    ({ currentKey, previousKey, sourceBytes }) => {
      const previous = JSON.parse(sourceBytes);
      for (const member of previous.members)
        if (member.role === "partner") member.active = false;
      previous.schemaVersion = 6;
      delete previous.lifePlan;
      delete previous.payrollPlans;
      delete previous.takeHomeCompensationBindings;
      delete previous.budgetIncomePolicies;
      const bytes = JSON.stringify(previous);
      globalThis.localStorage.setItem(previousKey, bytes);
      globalThis.localStorage.removeItem(currentKey);
      return bytes;
    },
    {
      currentKey: storageKey,
      previousKey: schemaVersion6StorageKey,
      sourceBytes: overviewBytesBeforeReload,
    },
  );
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      schemaVersion6StorageKey,
    ),
    migratedV6Bytes,
  );
  assert.equal(
    JSON.parse(
      await page.evaluate(
        (key) => globalThis.localStorage.getItem(key),
        storageKey,
      ),
    ).schemaVersion,
    8,
  );

  await page.goto(`${standaloneUrl}#/life-plan`, { waitUntil: "load" });
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page
    .getByRole("heading", { level: 3, name: "将来資産シミュレーション" })
    .waitFor();
  await assertContains(
    page.getByTestId("life-plan-disclosure"),
    "将来の制度や運用成果を予測するものではありません",
  );
  for (const requiredDisclosure of [
    "開始時現預金は、保存した投影開始年の1月1日期首残高として使用します",
    "最初の投影行も完全な1暦年です",
    "経過月による按分は行いません",
    "ブラウザーの年越しでは、保存済みの基準日と開始年は変わりません",
  ]) {
    await assertContains(
      page.getByTestId("life-plan-disclosure"),
      requiredDisclosure,
    );
  }
  assert.equal(
    await page.evaluate(
      (key) =>
        JSON.parse(globalThis.localStorage.getItem(key)).lifePlan
          .baseReferenceDate,
      storageKey,
    ),
    null,
  );
  const lifePlanSettings = page.getByTestId("life-plan-settings-form");
  await lifePlanSettings.getByLabel("手残り計算の基準日").fill("2026-08-13");
  await lifePlanSettings.getByLabel("投影開始年（1月1日時点）").fill("2027");
  await lifePlanSettings
    .getByLabel("開始年1月1日の現預金残高（円）")
    .fill("10000");
  await lifePlanSettings.getByLabel("投影年数（1～60年）").fill("3");
  await lifePlanSettings.getByRole("button", { name: "設定を保存" }).click();

  let addLifeEvent = page.getByTestId("life-plan-add-event-form");
  await addLifeEvent.getByLabel("イベント名").fill("住宅購入");
  await addLifeEvent.getByLabel("種類").selectOption("expense");
  await addLifeEvent.getByLabel("開始年").fill("2027");
  await addLifeEvent.getByLabel("終了年").fill("2027");
  await addLifeEvent.getByLabel("年間金額（円）").fill("900000000");
  await addLifeEvent.getByRole("button", { name: "イベントを追加" }).click();

  addLifeEvent = page.getByTestId("life-plan-add-event-form");
  await addLifeEvent.getByLabel("イベント名").fill("副収入");
  await addLifeEvent.getByLabel("種類").selectOption("income");
  await addLifeEvent.getByLabel("開始年").fill("2028");
  await addLifeEvent.getByLabel("終了年").fill("2029");
  await addLifeEvent.getByLabel("年間金額（円）").fill("100000");
  await addLifeEvent.getByRole("button", { name: "イベントを追加" }).click();

  await assertContains(
    page.getByTestId("life-plan-result"),
    "2027年に現預金残高が初めてマイナス",
  );
  await assertContains(
    page.getByTestId("life-plan-result"),
    "負債は含まず、純資産ではありません",
  );
  for (const heading of ["年末現預金", "NISA", "iDeCo", "金融資産合計"]) {
    await page
      .getByTestId("life-plan-assets-table")
      .getByRole("columnheader", { name: heading, exact: true })
      .waitFor();
  }
  assert.equal(await page.locator("table.life-plan-table tbody tr").count(), 3);
  const housingCard = page
    .locator(".life-plan-event")
    .filter({ hasText: "住宅購入" });
  const housingEventId = await housingCard.getAttribute("data-event-id");
  assert.ok(housingEventId);
  const housingEventBeforeEdit = await page.evaluate(
    ({ key, eventId }) => {
      const bytes = globalThis.localStorage.getItem(key);
      if (!bytes) return null;
      return (
        JSON.parse(bytes).lifePlan.events.find((item) => item.id === eventId) ??
        null
      );
    },
    { key: storageKey, eventId: housingEventId },
  );
  assert.ok(housingEventBeforeEdit);
  await housingCard.getByRole("button", { name: "編集", exact: true }).click();
  const housingEdit = page
    .locator(".life-plan-event")
    .filter({ hasText: "住宅購入" });
  await housingEdit.getByLabel("イベント名").fill("住宅購入（更新）");
  await housingEdit.getByRole("button", { name: "変更を保存" }).click();
  const updatedHousingCard = page
    .locator(".life-plan-event")
    .filter({ hasText: "住宅購入（更新）" });
  await updatedHousingCard
    .getByText("住宅購入（更新）", { exact: true })
    .waitFor();
  await updatedHousingCard
    .getByRole("button", { name: "編集", exact: true })
    .waitFor();
  assert.equal(
    await updatedHousingCard
      .getByRole("button", { name: "変更を保存" })
      .count(),
    0,
  );
  const incomeCard = page
    .locator(".life-plan-event")
    .filter({ hasText: "副収入" });
  await incomeCard.getByRole("button", { name: "無効にする" }).click();
  await assertContains(
    page.locator(".life-plan-event").filter({ hasText: "副収入" }),
    "無効",
  );
  const lifePlanBytesBeforeReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    lifePlanBytesBeforeReload,
  );
  assert.deepEqual(
    await page.evaluate(
      ({ key, eventId }) => {
        const bytes = globalThis.localStorage.getItem(key);
        if (!bytes) return null;
        return (
          JSON.parse(bytes).lifePlan.events.find(
            (item) => item.id === eventId,
          ) ?? null
        );
      },
      { key: storageKey, eventId: housingEventId },
    ),
    { ...housingEventBeforeEdit, name: "住宅購入（更新）" },
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
  await page.getByRole("link", { name: "総合サマリ" }).click();
  await page.waitForURL(`${standaloneUrl}#/overview`);
  await page
    .locator(".life-plan-event")
    .filter({ hasText: "住宅購入（更新）" })
    .getByRole("button", { name: "削除" })
    .click();
  assert.equal(
    await page
      .locator(".life-plan-event")
      .filter({ hasText: "住宅購入（更新）" })
      .count(),
    0,
  );
  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  await page.waitForURL(`${standaloneUrl}#/budget`);
  await page.waitForFunction((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) return false;
    try {
      return JSON.parse(bytes).activeRoute === "budget";
    } catch {
      return false;
    }
  }, storageKey);

  const overflowBytes = await page.evaluate((key) => {
    const bytes = globalThis.localStorage.getItem(key);
    if (!bytes) throw new Error("v4 state is missing");
    const state = JSON.parse(bytes);
    state.activeRoute = "budget";
    if (state.budget.categories.length === 0)
      state.budget.categories.push({
        id: "overflow-category",
        name: "範囲検証",
        description: "",
        shareMode: "inherit",
        sortOrder: 0,
        active: true,
      });
    const source = state.budget.items[0] ?? {
      id: "overflow-first",
      categoryId: state.budget.categories[0].id,
      purpose: "範囲検証費",
      kind: "living-expense",
      scope: "self",
      amountYen: 1,
      cycleValue: 1,
      cycleUnit: "month",
      occurrencesPerCycle: 1,
      shareMode: "inherit",
      source: { type: "manual" },
      memo: "",
      active: true,
    };
    state.budget.items = [
      { ...source, amountYen: Number.MAX_SAFE_INTEGER },
      { ...source, id: "overflow-second", amountYen: 1 },
    ];
    const overflow = JSON.stringify(state);
    globalThis.localStorage.setItem(key, overflow);
    return overflow;
  }, storageKey);
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    overflowBytes,
  );
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
    `Portable file:// browser test passed: channel=${launched.channel}, checks=TASK016-autolink-extended, routes=${routes.length}, automaticPayrollBinding=passed, automaticBudgetPolicy=passed, automaticInvestmentFunding=passed, userOverride=passed, legacyLifePlanRoute=overview, lifePlan=embedded-crud-persistence-negative-warning, lifePlanAssets=table-five-columns-not-net-worth, lifePlanV6Migration=bytes-preserved-to-v8, lifePlanViewport=360px, overviewBlankStates=visible, overviewIntegratedSummary=passed, overviewReadOnly=passed, overviewHouseholdNisaIdeco=separate, overviewIdecoPeriodMatrix=passed, overviewSafeText=passed, overviewNegativeRemainder=visible, overviewRuleEvidence=https-only, overviewViewport=360px, budgetScenario=passed, takeHomeScenario=passed, nisaPlan=passed, nisaLegalAgeJan2=adult, nisaBlankMoney=null, nisaExplicitZero=valid, nisaAnnualExact=passed, nisaAnnualRemaining=visible, nisaLifetimeReach=visible, nisaRuleOwnedLabels=passed, nisaOneYenOver=invalid, nisaScenarioSwitch=passed, nisaAdditionalCrud=passed, idecoPlan=passed, idecoCurrentScheduledBoundary=passed, idecoNullZero=passed, idecoExactAndOneYenOver=passed, idecoPlus=unsupported, idecoAnnualUnit=unsupported, idecoScenarioSwitch=passed, idecoReferenceDate=explicit, inactiveIdecoLink=incomplete-preserved-reactivated, idecoTakeHomeLink=live, linkedValueLiveUpdate=passed, unresolvedLink=passed, age65To74Auto=unsupported, manualFirstCategoryCare=complete, newUnsupportedLink=blocked, ageTransition65=unsupported, ageTransition75=unsupported, monthlyWageMissing=preserved, monthlyWageZero=preserved, requiredResults=visible, manualAutoOtherDeduction=preserved, sequentialJapaneseSearch=passed, legacyNames=lossless-explicit-edit, overflowState=uncomputed, viewport=360px, keyboardFocus=passed, localStorage=preserved, runtimeRequests=0, consoleErrors=0, pageErrors=0.`,
  );
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
