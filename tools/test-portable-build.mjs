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
const storageKey = "personal-finance-planner:state:v10";
const schemaVersion9StorageKey = "personal-finance-planner:state:v9";
const schemaVersion8StorageKey = "personal-finance-planner:state:v8";
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
  // Hosted Windows runners can spend more than Playwright's 30-second default
  // warming the system browser before the first file:// navigation completes.
  page.setDefaultNavigationTimeout(90_000);
  const consoleErrors = [];
  const pageErrors = [];
  const unexpectedRequests = [];
  const observeRuntimePage = (runtimePage) => {
    runtimePage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    runtimePage.on("pageerror", (error) => pageErrors.push(error.message));
    runtimePage.on("request", (request) => {
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
  };
  observeRuntimePage(page);

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

  const reference2027Context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  try {
    await reference2027Context.addInitScript(() => {
      const NativeDate = Date;
      const fixedNow = "2027-08-24T03:00:00.000Z";
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
    const page2027 = await reference2027Context.newPage();
    page2027.setDefaultNavigationTimeout(90_000);
    observeRuntimePage(page2027);
    await expectRoute(page2027, standaloneUrl, "payroll", "給与計算");
    await assertContains(
      page2027.getByTestId("payroll-context"),
      "2027年（自動）",
    );
    assert.equal(await page2027.getByLabel("人物", { exact: true }).count(), 0);
    assert.equal(
      await page2027.getByLabel("対象年", { exact: true }).count(),
      0,
    );
    await page2027.getByLabel("基本給（月）", { exact: true }).fill("300000");
    await page2027.getByLabel("車で通勤", { exact: true }).check();
    await page2027
      .getByLabel("出勤日数（月平均）", { exact: true })
      .fill("0.0");
    await page2027.getByText("詳細", { exact: true }).click();
    await page2027.getByLabel("ガソリン単価（1L）", { exact: true }).fill("0");
    await page2027.getByLabel("往復距離（日）", { exact: true }).fill("0.0");
    await page2027.getByLabel("燃費", { exact: true }).fill("10.0");
    await page2027.getByRole("button", { name: "給与計画を保存" }).click();
    await page2027.getByRole("button", { name: "給与計画を更新" }).waitFor();
    await assertContains(
      page2027.getByTestId("payroll-take-home-linkability"),
      "この年は給与総支給のみ計算できます。手取り自動連携は2026年のみ対応しています。",
    );
    assert.equal(
      await page2027
        .getByTestId("payroll-take-home-linkability")
        .getAttribute("data-linkability"),
      "gross-only",
    );
    await assertContains(
      page2027.locator("[data-result-kind='practical-annual-income']"),
      "3,600,000円",
    );
    const payroll2027 = await page2027.evaluate((key) => {
      const bytes = globalThis.localStorage.getItem(key);
      if (!bytes) throw new Error("2027 state is missing");
      return JSON.parse(bytes).payrollPlans[0];
    }, storageKey);
    assert.equal(payroll2027.targetYear, 2027);

    await page2027.getByRole("link", { name: "手取り計算" }).click();
    await assertContains(
      page2027.locator("main [data-area='result']"),
      "2027年の手取り計算ルールは未登録です",
    );
    assert.equal(
      await page2027
        .getByRole("button", { name: "2026年計算プランを作成" })
        .count(),
      0,
    );
    const supportedYearState = await page2027.evaluate((key) => {
      const bytes = globalThis.localStorage.getItem(key);
      if (!bytes) throw new Error("2027 state is missing");
      const state = JSON.parse(bytes);
      return {
        state,
        takeHomePlans: state.takeHomePlans,
        bindings: state.takeHomeCompensationBindings,
      };
    }, storageKey);
    assert.deepEqual(supportedYearState.takeHomePlans, []);
    assert.deepEqual(supportedYearState.bindings, []);

    await page2027.getByRole("link", { name: "家計簿", exact: true }).click();
    await assertContains(page2027.getByTestId("household-income"), "未計算");
    await page2027.getByRole("link", { name: "NISA + iDeCo" }).click();
    await assertContains(page2027.locator(".funding-context"), "未計算");

    await page2027.getByRole("link", { name: "設定" }).click();
    await page2027.waitForFunction((key) => {
      const bytes = globalThis.localStorage.getItem(key);
      if (!bytes) return false;
      return JSON.parse(bytes).activeRoute === "settings";
    }, storageKey);
    const beforeInvalidUnsupportedImport = await page2027.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    );
    assert.ok(beforeInvalidUnsupportedImport);
    const invalidUnsupportedState = JSON.parse(beforeInvalidUnsupportedImport);
    invalidUnsupportedState.takeHomePlans = [
      {
        id: "unsupported-take-home-2027",
        memberId: invalidUnsupportedState.payrollPlans[0].memberId,
        targetYear: 2027,
        mode: "calculated",
        birthDate: null,
        residencePrefecture: null,
        inputMode: "annual",
        compensation: {
          annualTaxableSalaryYen: 0,
          annualNonTaxableCommutingYen: 0,
          monthlyTaxableSalaryYen: 0,
          monthlyNonTaxableCommutingYen: 0,
          annualOtherTaxableSalaryYen: 0,
          bonuses: [],
          monthlyEmploymentInsuranceWagesYen: null,
          employmentInsuranceWageOverrideYen: null,
        },
        employment: {
          employmentType: "employee",
          oneEmployerFullYearConfirmed: true,
          salaryIncomeOnlyConfirmed: true,
          employmentInsuranceCategory: "general",
          note: "",
        },
        socialInsurance: {
          mode: "kyokai-auto",
          standardRemunerationMode: "estimate-from-remuneration",
          employerPrefecture: null,
          standardMonthlyRemunerationYen: null,
          monthlyRemunerationYen: null,
          healthBonusPriorFiscalYearCumulativeYen: 0,
          manual: {
            annualHealthInsuranceYen: null,
            annualCareInsuranceYen: null,
            annualAdditionalInsuranceYen: null,
            annualPensionYen: null,
            annualEmploymentInsuranceYen: null,
            annualOtherStatutoryDeductionYen: 0,
          },
        },
        residentTax: {
          mode: "unsupported-uncomputed",
          assessmentYear: 2028,
          annualResidentTaxYen: null,
          zeroYenConfirmed: false,
          municipalityNote: "",
        },
        deductions: {
          annualIdecoContributionYen: 0,
          idecoContributionMode: "manual",
          linkedIdecoPlanId: null,
          annualOtherIncomeDeductionsYen: 0,
          otherIncomeDeductionsNote: "",
        },
        active: true,
      },
    ];
    invalidUnsupportedState.takeHomeCompensationBindings = [
      {
        takeHomePlanId: invalidUnsupportedState.takeHomePlans[0].id,
        payrollPlanId: invalidUnsupportedState.payrollPlans[0].id,
        active: true,
      },
    ];
    await page2027.locator('input[name="backup-import"]').setInputFiles({
      name: "unsupported-binding-v10.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalidUnsupportedState), "utf8"),
    });
    await assertContains(page2027.getByRole("alert"), "year is not supported");
    assert.equal(
      await page2027.evaluate(
        (key) => globalThis.localStorage.getItem(key),
        storageKey,
      ),
      beforeInvalidUnsupportedImport,
    );
  } finally {
    await reference2027Context.close();
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
  await assertContains(
    page.getByTestId("payroll-context"),
    "本人 / 2026年（自動）",
  );
  assert.equal(await page.getByLabel("人物", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("対象年", { exact: true }).count(), 0);
  assert.equal(
    await page.getByLabel("この給与計画を有効にする", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator(".payroll-bonus-row").count(), 0);
  const carCommute = page.getByLabel("車で通勤", { exact: true });
  assert.equal(await carCommute.count(), 1);
  assert.equal(await carCommute.isChecked(), false);
  assert.equal(
    await page.getByLabel("通勤手当（月・非課税）", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByLabel("出勤日数（月平均）", { exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await page.getByLabel("通勤手当（日）", { exact: true }).inputValue(),
    "800",
  );
  assert.equal(
    await page.getByLabel("通勤手当（日）", { exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByLabel("通勤手当（日）", { exact: true })
      .evaluate((element) =>
        Boolean(element.closest("details.payroll-details")),
      ),
    true,
  );
  await assertContains(
    page.locator("#payroll-commuting-mode-status"),
    "通勤手当とガソリン代試算は0円",
  );
  await carCommute.focus();
  await carCommute.press("Space");
  assert.equal(await carCommute.isChecked(), true);
  assert.equal(
    await page.getByLabel("出勤日数（月平均）", { exact: true }).isEnabled(),
    true,
  );
  await page.getByLabel("基本給（月）", { exact: true }).fill("320000");
  await page.getByLabel("残業（月平均）", { exact: true }).fill("10");
  await page.getByLabel("手当（月）", { exact: true }).fill("20000");
  await page.getByLabel("出勤日数（月平均）", { exact: true }).fill("20.0");
  await page.getByLabel("賞与（年）", { exact: true }).fill("400000");
  await page.getByText("詳細", { exact: true }).click();
  await page.getByLabel("ガソリン単価（1L）", { exact: true }).fill("180");
  await page.getByLabel("往復距離（日）", { exact: true }).fill("20.0");
  await page.getByLabel("燃費", { exact: true }).fill("10.0");
  await page.getByRole("button", { name: "給与計画を保存" }).click();
  await page.getByRole("button", { name: "給与計画を更新" }).waitFor();
  const createdPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.ok(createdPayroll?.id);
  assert.equal(createdPayroll.commutingAllowanceMode, "car-daily");
  assert.equal(createdPayroll.nonTaxableCommutingAllowanceYenPerWorkday, 800);
  assert.equal(createdPayroll.monthlyNonTaxableCommutingYen, 0);
  assert.deepEqual(createdPayroll.commutingFuelEstimate, {
    averageWorkdaysPerMonthTenths: 200,
    roundTripDistanceKmTenths: 200,
    fuelEfficiencyKmPerLiterTenths: 100,
    gasolinePriceYenPerLiter: 180,
  });
  assert.deepEqual(createdPayroll.bonuses, [
    {
      id: createdPayroll.bonuses[0].id,
      paymentDate: "2026-08-13",
      grossYen: 400_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: true,
    },
  ]);
  assert.equal(await page.getByTestId("payroll-primary-result").count(), 3);
  assert.deepEqual(
    await page.locator(".payroll-result-label-trigger").allTextContents(),
    ["月収", "実質月収", "年収"],
  );
  assert.equal(
    await page
      .locator(".payroll-primary-result > .payroll-result-breakdown")
      .count(),
    0,
  );
  assert.equal(
    await page.locator(".payroll-result-help-panel:visible").count(),
    0,
  );
  assert.equal(
    await page
      .locator("[data-result-kind='monthly-income'] > strong")
      .textContent(),
    "381,000円",
  );
  assert.equal(
    await page
      .locator("[data-result-kind='practical-monthly-income'] > strong")
      .textContent(),
    "373,800円",
  );
  assert.equal(
    await page
      .locator("[data-result-kind='practical-annual-income'] > strong")
      .textContent(),
    "4,885,600円",
  );
  await assertContains(
    page.locator("[data-result-kind='practical-monthly-income']"),
    "7,200円",
  );
  await assertContains(
    page.getByTestId("payroll-practical-note"),
    "税・社会保険の計算には使いません",
  );
  assert.equal(
    await page.getByTestId("payroll-practical-note").isVisible(),
    true,
  );
  const monthlyHelp = page.getByRole("button", {
    name: "月収の詳細",
    exact: true,
  });
  const monthlyHelpPanel = page.locator("#payroll-result-monthly-income-help");
  const practicalHelp = page.getByRole("button", {
    name: "実質月収の詳細",
    exact: true,
  });
  const practicalHelpPanel = page.locator(
    "#payroll-result-practical-monthly-income-help",
  );
  const annualHelp = page.getByRole("button", {
    name: "年収の詳細",
    exact: true,
  });
  const annualHelpPanel = page.locator(
    "#payroll-result-practical-annual-income-help",
  );
  for (const { trigger, panel, labels } of [
    {
      trigger: monthlyHelp,
      panel: monthlyHelpPanel,
      labels: ["税、社会保険控除前", "基本給", "手当", "残業代", "通勤手当"],
    },
    {
      trigger: practicalHelp,
      panel: practicalHelpPanel,
      labels: [
        "月収",
        "通勤手当",
        "推定ガソリン代",
        "通勤収支",
        "実質月収",
        "税引後手取りではなく",
      ],
    },
    {
      trigger: annualHelp,
      panel: annualHelpPanel,
      labels: [
        "実質月収 × 12",
        "賞与（年）",
        "年収",
        "税務上の年収・年間総支給ではありません",
      ],
    },
  ]) {
    assert.equal(await panel.isVisible(), false);
    await trigger.hover();
    assert.equal(await panel.isVisible(), true);
    for (const label of labels) await assertContains(panel, label);
    await page.mouse.move(0, 0);
    assert.equal(await panel.isVisible(), false);
  }
  await monthlyHelp.focus();
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "true");
  await monthlyHelp.press("Escape");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "false");
  await monthlyHelp.press("Enter");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "true");
  await monthlyHelp.press("Enter");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "false");
  await monthlyHelp.press("Space");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "true");
  await monthlyHelp.press("Space");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "false");
  await monthlyHelp.dispatchEvent("click");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "true");
  await monthlyHelp.dispatchEvent("click");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "false");
  await monthlyHelp.dispatchEvent("click");
  assert.equal(await monthlyHelp.getAttribute("aria-expanded"), "true");
  const helpBox = await monthlyHelpPanel.boundingBox();
  assert.ok(helpBox);
  assert.ok(helpBox.x >= 0 && helpBox.x + helpBox.width <= 1280);
  await monthlyHelp.press("Escape");
  await page.getByText("詳細", { exact: true }).click();
  const dailyAllowanceHelp = page.getByRole("button", {
    name: "通勤手当（日）の説明",
    exact: true,
  });
  const dailyAllowanceHelpPanel = page.locator(
    "#payroll-daily-commuting-allowance-help",
  );
  await dailyAllowanceHelp.focus();
  assert.equal(await dailyAllowanceHelp.getAttribute("aria-expanded"), "true");
  await assertContains(dailyAllowanceHelpPanel, "非課税通勤手当");
  await assertContains(dailyAllowanceHelpPanel, "距離別非課税限度額");
  await assertContains(dailyAllowanceHelpPanel, "課税超過分は自動判定しません");
  await dailyAllowanceHelp.press("Escape");
  assert.equal(await dailyAllowanceHelp.getAttribute("aria-expanded"), "false");
  await dailyAllowanceHelp.dispatchEvent("click");
  assert.equal(await dailyAllowanceHelp.getAttribute("aria-expanded"), "true");
  await dailyAllowanceHelp.dispatchEvent("click");
  assert.equal(await dailyAllowanceHelp.getAttribute("aria-expanded"), "false");
  await page.getByText("詳細", { exact: true }).click();

  const touchState = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.ok(touchState);
  const touchContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 900 },
  });
  try {
    await touchContext.addInitScript(() => {
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
    const touchPage = await touchContext.newPage();
    touchPage.setDefaultNavigationTimeout(90_000);
    observeRuntimePage(touchPage);
    await touchPage.goto(`${standaloneUrl}#/payroll`, { waitUntil: "load" });
    await touchPage.evaluate(
      ({ key, value }) => globalThis.localStorage.setItem(key, value),
      { key: storageKey, value: touchState },
    );
    await touchPage.reload({ waitUntil: "load" });
    const touchMonthlyHelp = touchPage.getByRole("button", {
      name: "月収の詳細",
      exact: true,
    });
    await touchMonthlyHelp.tap();
    assert.equal(await touchMonthlyHelp.getAttribute("aria-expanded"), "true");
    await touchMonthlyHelp.tap();
    assert.equal(await touchMonthlyHelp.getAttribute("aria-expanded"), "false");
    await touchPage.getByText("詳細", { exact: true }).tap();
    const touchDailyHelp = touchPage.getByRole("button", {
      name: "通勤手当（日）の説明",
      exact: true,
    });
    await touchDailyHelp.tap();
    assert.equal(await touchDailyHelp.getAttribute("aria-expanded"), "true");
    await assertContains(
      touchPage.locator("#payroll-daily-commuting-allowance-help"),
      "課税超過分は自動判定しません",
    );
    await touchDailyHelp.tap();
    assert.equal(await touchDailyHelp.getAttribute("aria-expanded"), "false");
    const touchCarCommute = touchPage.getByLabel("車で通勤", { exact: true });
    await touchCarCommute.tap();
    assert.equal(await touchCarCommute.isChecked(), false);
    await touchCarCommute.tap();
    assert.equal(await touchCarCommute.isChecked(), true);
    assert.equal(
      await touchPage.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.document.documentElement.clientWidth,
      ),
      true,
    );
  } finally {
    await touchContext.close();
  }

  const carValuesBeforeOff = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    const plan = state.payrollPlans[0];
    return {
      commutingFuelEstimate: plan.commutingFuelEstimate,
      daily: plan.nonTaxableCommutingAllowanceYenPerWorkday,
      monthlyCompatibility: plan.monthlyNonTaxableCommutingYen,
    };
  }, storageKey);
  await carCommute.uncheck();
  await assertContains(
    page.locator("#payroll-commuting-mode-status"),
    "通勤手当とガソリン代試算は0円",
  );
  assert.equal(
    await page.getByLabel("出勤日数（月平均）", { exact: true }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  await page.getByRole("button", { name: "給与計画を更新" }).waitFor();
  const offPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.equal(offPayroll.commutingAllowanceMode, "none");
  assert.deepEqual(
    offPayroll.commutingFuelEstimate,
    carValuesBeforeOff.commutingFuelEstimate,
  );
  assert.equal(
    offPayroll.nonTaxableCommutingAllowanceYenPerWorkday,
    carValuesBeforeOff.daily,
  );
  assert.equal(
    offPayroll.monthlyNonTaxableCommutingYen,
    carValuesBeforeOff.monthlyCompatibility,
  );
  assert.equal(
    await page
      .locator("[data-result-kind='monthly-income'] > strong")
      .textContent(),
    "365,000円",
  );
  assert.equal(
    await page
      .locator("[data-result-kind='practical-monthly-income'] > strong")
      .textContent(),
    "365,000円",
  );
  assert.equal(
    await page
      .locator("[data-result-kind='practical-annual-income'] > strong")
      .textContent(),
    "4,780,000円",
  );
  await carCommute.check();
  assert.equal(
    await page.getByLabel("出勤日数（月平均）", { exact: true }).inputValue(),
    "20.0",
  );
  assert.equal(
    await page.getByLabel("通勤手当（日）", { exact: true }).inputValue(),
    "800",
  );
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  const restoredPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.equal(restoredPayroll.commutingAllowanceMode, "car-daily");
  assert.deepEqual(
    restoredPayroll.commutingFuelEstimate,
    carValuesBeforeOff.commutingFuelEstimate,
  );
  assert.equal(
    await page
      .locator("[data-result-kind='practical-monthly-income'] > strong")
      .textContent(),
    "373,800円",
  );

  const legacyV9Bytes = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    state.schemaVersion = 9;
    for (const plan of state.payrollPlans) {
      plan.monthlyNonTaxableCommutingYen = 5_000;
      delete plan.commutingAllowanceMode;
      delete plan.nonTaxableCommutingAllowanceYenPerWorkday;
    }
    return JSON.stringify(state);
  }, storageKey);
  const legacyContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  try {
    const legacyPage = await legacyContext.newPage();
    legacyPage.setDefaultNavigationTimeout(90_000);
    observeRuntimePage(legacyPage);
    await legacyPage.goto(`${standaloneUrl}#/payroll`, { waitUntil: "load" });
    await legacyPage.evaluate(
      ({ currentKey, previousKey, bytes }) => {
        globalThis.localStorage.setItem(previousKey, bytes);
        globalThis.localStorage.removeItem(currentKey);
      },
      {
        currentKey: storageKey,
        previousKey: schemaVersion9StorageKey,
        bytes: legacyV9Bytes,
      },
    );
    await legacyPage.reload({ waitUntil: "load" });
    assert.equal(
      await legacyPage.evaluate(
        (key) => globalThis.localStorage.getItem(key),
        schemaVersion9StorageKey,
      ),
      legacyV9Bytes,
    );
    const migratedLegacy = await legacyPage.evaluate((key) => {
      const state = JSON.parse(globalThis.localStorage.getItem(key));
      return state.payrollPlans[0];
    }, storageKey);
    assert.equal(migratedLegacy.commutingAllowanceMode, "legacy-monthly");
    assert.equal(migratedLegacy.nonTaxableCommutingAllowanceYenPerWorkday, 800);
    const legacyCheckbox = legacyPage.getByLabel("車で通勤", { exact: true });
    assert.equal(
      await legacyCheckbox.evaluate((element) => element.indeterminate),
      true,
    );
    assert.equal(await legacyCheckbox.getAttribute("aria-checked"), "mixed");
    await assertContains(
      legacyPage.locator("#payroll-commuting-mode-status"),
      "旧月額を使用中",
    );
    assert.equal(
      await legacyPage
        .getByLabel("通勤手当（月・非課税）", { exact: true })
        .count(),
      0,
    );
    await legacyPage.getByText("詳細", { exact: true }).click();
    await assertContains(
      legacyPage.getByTestId("payroll-legacy-commuting"),
      "旧通勤手当（月）",
    );
    await assertContains(
      legacyPage.getByTestId("payroll-legacy-commuting"),
      "5,000円",
    );
    assert.equal(
      await legacyPage
        .locator("[data-result-kind='monthly-income'] > strong")
        .textContent(),
      "370,000円",
    );
    await legacyPage.getByLabel("基本給（月）", { exact: true }).fill("321000");
    await legacyPage.getByRole("button", { name: "給与計画を更新" }).click();
    assert.equal(
      await legacyPage.evaluate((key) => {
        const state = JSON.parse(globalThis.localStorage.getItem(key));
        return state.payrollPlans[0].commutingAllowanceMode;
      }, storageKey),
      "legacy-monthly",
    );
    await legacyCheckbox.check();
    await legacyPage.getByRole("button", { name: "給与計画を更新" }).click();
    assert.equal(
      await legacyPage.evaluate((key) => {
        const state = JSON.parse(globalThis.localStorage.getItem(key));
        return state.payrollPlans[0].commutingAllowanceMode;
      }, storageKey),
      "car-daily",
    );

    await legacyPage.evaluate(
      ({ currentKey, previousKey, bytes }) => {
        globalThis.localStorage.setItem(previousKey, bytes);
        globalThis.localStorage.removeItem(currentKey);
      },
      {
        currentKey: storageKey,
        previousKey: schemaVersion9StorageKey,
        bytes: legacyV9Bytes,
      },
    );
    await legacyPage.reload({ waitUntil: "load" });
    const legacyOffCheckbox = legacyPage.getByLabel("車で通勤", {
      exact: true,
    });
    await legacyOffCheckbox.evaluate((element) => {
      element.indeterminate = false;
      element.checked = false;
      element.dispatchEvent(new globalThis.Event("change", { bubbles: true }));
    });
    assert.equal(
      await legacyPage
        .getByLabel("出勤日数（月平均）", { exact: true })
        .isDisabled(),
      true,
    );
    await legacyPage.getByRole("button", { name: "給与計画を更新" }).click();
    const adoptedOff = await legacyPage.evaluate((key) => {
      const state = JSON.parse(globalThis.localStorage.getItem(key));
      return state.payrollPlans[0];
    }, storageKey);
    assert.equal(adoptedOff.commutingAllowanceMode, "none");
    assert.equal(adoptedOff.monthlyNonTaxableCommutingYen, 5_000);
    assert.deepEqual(
      adoptedOff.commutingFuelEstimate,
      migratedLegacy.commutingFuelEstimate,
    );
  } finally {
    await legacyContext.close();
  }

  await page.evaluate(
    ({ key, bonuses }) => {
      const state = JSON.parse(globalThis.localStorage.getItem(key));
      state.payrollPlans[0].bonuses = bonuses.map((bonus, index) => ({
        id: `legacy-bonus-${String(index + 1)}`,
        ...bonus,
      }));
      globalThis.localStorage.setItem(key, JSON.stringify(state));
    },
    { key: storageKey, bonuses: portableBonusObservations },
  );
  await page.reload({ waitUntil: "load" });
  await page.getByText("賞与明細（既存データ）", { exact: true }).waitFor();
  const beforeUnrelatedBonusEdit = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0].bonuses;
  }, storageKey);
  await page.getByLabel("基本給（月）", { exact: true }).fill("321000");
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  const savedPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.equal(savedPayroll.baseMonthlyYen, 321_000);
  assert.deepEqual(savedPayroll.bonuses, beforeUnrelatedBonusEdit);

  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const resultBefore = await page.locator(".result-card").boundingBox();
    assert.ok(resultBefore);
    await page.getByText("詳細", { exact: true }).click();
    await page.getByText("賞与明細（既存データ）", { exact: true }).click();
    const mobileMonthlyHelp = page.getByRole("button", {
      name: "月収の詳細",
      exact: true,
    });
    await mobileMonthlyHelp.dispatchEvent("click");
    const mobileHelpBox = await page
      .locator("#payroll-result-monthly-income-help")
      .boundingBox();
    assert.ok(mobileHelpBox);
    assert.ok(
      mobileHelpBox.x >= 0 && mobileHelpBox.x + mobileHelpBox.width <= width,
    );
    assert.equal(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.document.documentElement.clientWidth,
      ),
      true,
      `Payroll must not overflow at ${String(width)}px with disclosures open`,
    );
    await mobileMonthlyHelp.dispatchEvent("click");
    const resultAfter = await page.locator(".result-card").boundingBox();
    assert.ok(resultAfter);
    assert.equal(resultAfter.width, resultBefore.width);
    assert.equal(resultAfter.height, resultBefore.height);
    await page.getByText("詳細", { exact: true }).click();
    await page.getByText("賞与明細（既存データ）", { exact: true }).click();
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByLabel("賞与（年）", { exact: true }).fill("950000");
  const beforeCancelledFlatten = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  page.once("dialog", async (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  await page.getByText("賞与明細の置換を取り消しました").waitFor();
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    beforeCancelledFlatten,
  );
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "給与計画を更新" }).click();
  await page.getByRole("button", { name: "給与計画を更新" }).waitFor();
  const flattenedPayroll = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return state.payrollPlans[0];
  }, storageKey);
  assert.deepEqual(flattenedPayroll.bonuses, [
    {
      id: flattenedPayroll.bonuses[0].id,
      paymentDate: "2026-08-13",
      grossYen: 950_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: true,
    },
  ]);

  let compactChoiceCount = 0;
  for (const [route, label] of routes) {
    await expectRoute(page, standaloneUrl, route, label);
    const choices = page.locator('input[type="checkbox"], input[type="radio"]');
    const choiceCount = await choices.count();
    compactChoiceCount += choiceCount;
    for (let index = 0; index < choiceCount; index += 1) {
      const box = await choices.nth(index).boundingBox();
      if (!box) continue;
      assert.ok(box.width <= 24 && box.height <= 24);
    }
  }
  assert.ok(compactChoiceCount > 0);
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
  await page.waitForURL(`${standaloneUrl}#/take-home`);
  await page.getByRole("heading", { level: 3, name: "計算条件" }).waitFor();
  await assertContains(page.locator("main"), "本人 / 2026年（自動）");
  await assertContains(page.locator("main"), "給与: 給与計算から取得");
  await assertContains(page.locator("main"), "就業前提: 概算のため仮定");
  await assertContains(page.locator("main"), "住民税: 2026年支払額を自動概算");
  await assertContains(page.locator("main"), "月収（給与計算から）");
  await assertContains(page.locator("main"), "年間総支給（賞与込）");
  await assertContains(page.locator("main"), "通勤手当（月）");
  const stateBeforeTransientPreview = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  const transientState = JSON.parse(stateBeforeTransientPreview);
  assert.equal(transientState.takeHomePlans.length, 0);
  assert.equal(transientState.takeHomeCompensationBindings.length, 0);
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
    stateBeforeTransientPreview,
  );

  const employerPrefecture = page.getByLabel("事業所都道府県（計算に必要）");
  await employerPrefecture.selectOption("JP-13");
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  await assertContains(
    page.locator("main"),
    "勤務先都道府県（健康保険用）: 東京都（今回の入力・保存前）",
  );
  await assertContains(
    page.locator("main"),
    "平均月間手取りは年間手取りを12分割した平均です",
  );
  await assertContains(
    page.locator("main"),
    "配偶者・扶養控除はモデル化していません",
  );
  for (const testId of [
    "take-home-result-average-monthly",
    "take-home-result-annual",
    "take-home-result-tax-insurance-total",
  ]) {
    const value = await page
      .getByTestId(testId)
      .locator("strong")
      .textContent();
    assert.match(value ?? "", /^[\d,]+円$/u);
  }
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

  const savePreview = page.getByRole("button", {
    name: "この給与連携を保存",
  });
  const dismissedConfirmation = new Promise((resolve) => {
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
      resolve();
    });
  });
  await savePreview.click();
  await dismissedConfirmation;
  const stateAfterDismissal = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return {
      plans: state.takeHomePlans,
      bindings: state.takeHomeCompensationBindings,
    };
  }, storageKey);
  assert.deepEqual(stateAfterDismissal, { plans: [], bindings: [] });

  const acceptedConfirmation = new Promise((resolve) => {
    page.once("dialog", async (dialog) => {
      await dialog.accept();
      resolve();
    });
  });
  await savePreview.click();
  await acceptedConfirmation;
  await page
    .getByText("詳細計算設定（保存済みの値・例外設定）", { exact: true })
    .waitFor();
  const persistedTakeHomeState = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return {
      plans: state.takeHomePlans,
      bindings: state.takeHomeCompensationBindings,
      policies: state.budgetIncomePolicies,
    };
  }, storageKey);
  assert.equal(persistedTakeHomeState.plans.length, 1);
  assert.equal(persistedTakeHomeState.bindings.length, 1);
  assert.equal(
    persistedTakeHomeState.bindings[0].takeHomePlanId,
    persistedTakeHomeState.plans[0].id,
  );
  assert.equal(
    persistedTakeHomeState.bindings[0].payrollPlanId,
    savedPayroll.id,
  );
  assert.equal(
    persistedTakeHomeState.plans[0].employment.employmentInsuranceCategory,
    "general",
  );
  assert.equal(
    persistedTakeHomeState.plans[0].socialInsurance.employerPrefecture,
    "JP-13",
  );
  assert.deepEqual(persistedTakeHomeState.policies, [
    { targetId: "budget-income-self", mode: "auto-take-home" },
    { targetId: "budget-income-partner", mode: "auto-take-home" },
  ]);
  const advanced = page.locator("details.take-home-details");
  assert.equal(await advanced.getAttribute("open"), null);
  await advanced.locator("summary").click();
  const payrollBinding = page.getByLabel("給与情報の入力元");
  assert.equal(await payrollBinding.inputValue(), savedPayroll.id);
  const persistedAverageMonthly = await page
    .getByTestId("take-home-result-average-monthly")
    .locator("strong")
    .textContent();
  assert.match(persistedAverageMonthly ?? "", /^[\d,]+円$/u);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { name: "概算結果: complete" }).waitFor();
  const stateAfterPersistenceReload = await page.evaluate((key) => {
    const state = JSON.parse(globalThis.localStorage.getItem(key));
    return {
      planCount: state.takeHomePlans.length,
      bindingCount: state.takeHomeCompensationBindings.length,
    };
  }, storageKey);
  assert.deepEqual(stateAfterPersistenceReload, {
    planCount: 1,
    bindingCount: 1,
  });

  await page.getByRole("link", { name: "家計簿", exact: true }).click();
  assert.equal(
    await page.getByLabel("本人手取りの連携方法").inputValue(),
    "auto-take-home",
  );
  await assertContains(
    page.getByTestId("household-income"),
    persistedAverageMonthly,
  );
  await page.getByLabel("本人手取りの連携方法").selectOption("legacy");
  await page.getByLabel("相手手取りの連携方法").selectOption("legacy");

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
  assert.equal(JSON.parse(savedBeforeReload).schemaVersion, 10);
  await page.reload({ waitUntil: "load" });
  await page.getByRole("heading", { level: 2, name: "家計簿" }).waitFor();
  await assertContains(page.getByTestId("household-expense"), "108,772円");
  const savedAfterReload = await page.evaluate(
    (key) => globalThis.localStorage.getItem(key),
    storageKey,
  );
  assert.equal(savedAfterReload, savedBeforeReload);

  const portableV8Bytes = await page.evaluate(
    ({ currentKey, previousKey }) => {
      const current = JSON.parse(globalThis.localStorage.getItem(currentKey));
      current.schemaVersion = 8;
      for (const payrollPlan of current.payrollPlans) {
        delete payrollPlan.commutingFuelEstimate;
        delete payrollPlan.commutingAllowanceMode;
        delete payrollPlan.nonTaxableCommutingAllowanceYenPerWorkday;
      }
      const bytes = JSON.stringify(current);
      globalThis.localStorage.setItem(previousKey, bytes);
      globalThis.localStorage.removeItem(currentKey);
      return bytes;
    },
    { currentKey: storageKey, previousKey: schemaVersion8StorageKey },
  );
  await page.reload({ waitUntil: "load" });
  assert.equal(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      schemaVersion8StorageKey,
    ),
    portableV8Bytes,
  );
  const migratedV10 = JSON.parse(
    await page.evaluate(
      (key) => globalThis.localStorage.getItem(key),
      storageKey,
    ),
  );
  assert.equal(migratedV10.schemaVersion, 10);
  assert.deepEqual(migratedV10.payrollPlans[0].commutingFuelEstimate, {
    averageWorkdaysPerMonthTenths: null,
    roundTripDistanceKmTenths: null,
    fuelEfficiencyKmPerLiterTenths: null,
    gasolinePriceYenPerLiter: null,
  });
  assert.equal(
    migratedV10.payrollPlans[0].commutingAllowanceMode,
    "legacy-monthly",
  );
  assert.equal(
    migratedV10.payrollPlans[0].nonTaxableCommutingAllowanceYenPerWorkday,
    800,
  );

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
    ({ currentKey, previousKey, version8Key, sourceBytes }) => {
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
      globalThis.localStorage.removeItem(version8Key);
      return bytes;
    },
    {
      currentKey: storageKey,
      previousKey: schemaVersion6StorageKey,
      version8Key: schemaVersion8StorageKey,
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
    10,
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
    `Portable file:// browser test passed: channel=${launched.channel}, checks=TASK019-transient-no-write-confirm-cancel-atomic-persist-reload-plus-TASK018-TASK017-TASK016-regressions, routes=${routes.length}, payrollContext=self-current-year, payrollPrimaryResults=3, task019CurrentContext=passed, task019AutomaticPayrollBinding=passed, task019BudgetAndOverviewDownstream=passed, task019Viewport=360px, unsupportedYear2027=zero-write, unsupportedBindingImport=blocked, userOverride=passed, compactChoices=${String(compactChoiceCount)}, legacyNames=lossless-explicit-edit, localStorage=preserved, runtimeRequests=0, consoleErrors=0, pageErrors=0.`,
  );
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
