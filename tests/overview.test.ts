import { describe, expect, it } from "vitest";
import { selectOverview } from "../src/domain/overview";
import { createIdecoPlan, type IdecoPlan } from "../src/domain/ideco";
import type { InvestmentScenario, NisaPlan } from "../src/domain/nisa";
import { createInitialState, type AppState } from "../src/domain/state";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";

const referenceDate = "2026-08-13";

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function scenario(memberId = "member-self"): InvestmentScenario {
  return {
    id: `scenario-${memberId}`,
    memberId,
    kind: "standard",
    annualReturnBasisPoints: 0,
    annualFeeBasisPoints: 0,
    annualInflationBasisPoints: 0,
  };
}

function takeHomePlan(memberId = "member-self", annualGrossYen = 1_200_000) {
  const plan = createCalculatedTakeHomePlan({
    id: `take-home-${memberId}`,
    memberId,
    targetYear: 2026,
    birthDate: "1990-01-01",
    residencePrefecture: "JP-13",
  });
  plan.compensation.annualTaxableSalaryYen = annualGrossYen;
  plan.socialInsurance.mode = "manual";
  plan.socialInsurance.standardRemunerationMode = "manual-total";
  plan.socialInsurance.manual = {
    annualHealthInsuranceYen: 0,
    annualCareInsuranceYen: 0,
    annualAdditionalInsuranceYen: 0,
    annualPensionYen: 0,
    annualEmploymentInsuranceYen: 0,
    annualOtherStatutoryDeductionYen: 0,
  };
  plan.residentTax.mode = "manual-annual";
  plan.residentTax.annualResidentTaxYen = 0;
  plan.residentTax.zeroYenConfirmed = true;
  return plan;
}

function nisaPlan(memberId = "member-self"): NisaPlan {
  return {
    id: `nisa-${memberId}`,
    memberId,
    japanResidentConfirmed: true,
    startMonth: "2026-01",
    targetMonth: "2026-12",
    currentBalanceYen: 0,
    currentBookValueYen: 0,
    usedLimitYen: 0,
    usedGrowthLimitYen: 0,
    monthlyTsumitateYen: 10_000,
    monthlyGrowthYen: 5_000,
    additionalPurchases: [
      {
        id: `extra-${memberId}`,
        month: "2026-08",
        bucket: "growth",
        amountYen: 2_000,
      },
    ],
    contributionTiming: "end",
    activeScenarioId: `scenario-${memberId}`,
    active: true,
  };
}

function idecoPlan(memberId = "member-self"): IdecoPlan {
  return {
    ...createIdecoPlan({
      id: `ideco-${memberId}`,
      memberId,
      activeScenarioId: `scenario-${memberId}`,
    }),
    participantCategory: "category2",
    participantCategoryConfirmed: true,
    employerPensionType: "none",
    matchingContributionActive: false,
    idecoPlusActive: false,
    annualUnitContributionActive: false,
    startMonth: "2026-08",
    monthlyContributionYen: 10_000,
    currentBalanceYen: 100_000,
    currentContributionTotalYen: 80_000,
    monthlyFeeYen: 0,
    projectionTarget: { type: "month", month: "2026-12" },
  };
}

function completeState(): AppState {
  const state = createInitialState();
  state.members[0] = {
    ...required(state.members[0], "self member is missing"),
    birthDate: "1990-01-01",
    residencePrefecture: "JP-13",
  };
  state.takeHomePlans = [takeHomePlan()];
  state.investmentScenarios = [scenario()];
  state.nisaPlans = [nisaPlan()];
  state.idecoPlans = [idecoPlan()];
  state.budget.mode = "simple";
  state.budget.simpleMonthlyExpenseYen = 20_000;
  return state;
}

describe("integrated overview selector", () => {
  it("requires an explicit real ISO reference date and schema version 6", () => {
    const state = createInitialState();
    expect(() => selectOverview(state, "2026-02-30")).toThrow("real calendar");
    expect(() => selectOverview(state, "2026-8-13")).toThrow("YYYY-MM-DD");
    expect(() =>
      selectOverview(
        { ...state, schemaVersion: 4 } as unknown as AppState,
        referenceDate,
      ),
    ).toThrow("schemaVersion 7");
  });

  it("reports empty sources as not-configured without converting them to zero", () => {
    const result = selectOverview(createInitialState(), referenceDate);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      memberId: "member-self",
      takeHomeStatus: "not-configured",
      grossMonthlyYen: null,
      takeHomeMonthlyYen: null,
      investmentContributionYen: 0,
      afterInvestmentYen: null,
      nisa: { status: "not-configured", currentMonthContributionYen: 0 },
      ideco: { status: "not-configured", currentMonthContributionYen: 0 },
    });
    expect(result.household.takeHomeMonthlyYen).toBeNull();
  });

  it("selects only the unique active calculated take-home plan for the reference year", () => {
    const state = completeState();
    state.takeHomePlans.push({
      id: "legacy",
      memberId: "member-self",
      targetYear: null,
      mode: "legacy-manual",
      manualAverageMonthlyTakeHomeYen: 9_999_999,
      active: true,
    });
    state.takeHomePlans.push({
      ...takeHomePlan(),
      id: "other-year",
      targetYear: 2027,
    });
    const result = selectOverview(state, referenceDate);
    expect(result.members[0]?.takeHomePlanId).toBe("take-home-member-self");
    expect(result.members[0]?.grossMonthlyYen).toBe(100_000);
    expect(result.members[0]?.takeHomeStatus).toBe("complete");
  });

  it("marks duplicate active calculated sources invalid rather than choosing one", () => {
    const state = completeState();
    state.takeHomePlans.push({ ...takeHomePlan(), id: "duplicate" });
    const result = selectOverview(state, referenceDate);
    expect(result.members[0]?.takeHomeStatus).toBe("invalid");
    expect(result.members[0]?.takeHomeMonthlyYen).toBeNull();
    expect(
      result.warnings.some((item) => item.code === "multiple-active"),
    ).toBe(true);
  });

  it("uses existing budget allocation while excluding manual income and fixture contribution sources", () => {
    const state = completeState();
    required(
      state.incomeTargets[0],
      "self income target is missing",
    ).manualYen = 8_000_000;
    state.contributionSources.push({
      id: "fixture",
      memberId: "member-self",
      kind: "asset-contribution",
      sourceType: "nisa-fixture",
      sourceId: "fixture-source",
      amountYen: 7_000_000,
      active: true,
    });
    const member = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    );
    expect(member.livingExpenseMonthlyYen).toBe(20_000);
    expect(member.nisa.currentMonthContributionYen).toBe(17_000);
    expect(member.ideco.currentMonthContributionYen).toBe(10_000);
    expect(member.investmentContributionYen).toBe(27_000);
    expect(member.takeHomeMonthlyYen).not.toBe(8_000_000);
  });

  it("includes only same-month NISA extras and returns zero outside the plan period", () => {
    const state = completeState();
    required(
      state.nisaPlans[0],
      "NISA plan is missing",
    ).additionalPurchases.push({
      id: "other-month",
      month: "2026-09",
      bucket: "growth",
      amountYen: 99_000,
    });
    expect(
      selectOverview(state, referenceDate).members[0]?.nisa
        .currentMonthContributionYen,
    ).toBe(17_000);
    expect(
      selectOverview(state, "2027-01-01").members[0]?.nisa
        .currentMonthContributionYen,
    ).toBe(0);
  });

  it("preserves null NISA money and propagates it to member and household totals", () => {
    const state = completeState();
    required(state.nisaPlans[0], "NISA plan is missing").monthlyGrowthYen =
      null;
    const result = selectOverview(state, referenceDate);
    expect(result.members[0]?.nisa.currentMonthContributionYen).toBeNull();
    expect(result.members[0]?.investmentContributionYen).toBeNull();
    expect(result.members[0]?.afterInvestmentYen).toBeNull();
    expect(result.household.investmentContributionYen).toBeNull();
  });

  it("supports iDeCo receipt-age targets without using the current clock", () => {
    const state = completeState();
    required(state.idecoPlans[0], "iDeCo plan is missing").projectionTarget = {
      type: "receipt-age",
      age: 37,
    };
    expect(
      selectOverview(state, referenceDate).members[0]?.ideco
        .currentMonthContributionYen,
    ).toBe(10_000);
    expect(
      selectOverview(state, "2028-02-01").members[0]?.ideco
        .currentMonthContributionYen,
    ).toBe(0);
  });

  it("distinguishes iDeCo before-start, start, target, and after-end months", () => {
    const cases = [
      {
        name: "before-start",
        reference: "2026-07-01",
        start: "2026-08",
        target: "2026-12",
        amount: 0,
        status: "not-configured",
        householdIdeco: 0,
      },
      {
        name: "start",
        reference: "2026-08-13",
        start: "2026-08",
        target: "2026-12",
        amount: 10_000,
        status: "complete",
        householdIdeco: 10_000,
      },
      {
        name: "target",
        reference: "2026-08-13",
        start: "2026-08",
        target: "2026-08",
        amount: 10_000,
        status: "complete",
        householdIdeco: 10_000,
      },
      {
        name: "after-end",
        reference: "2026-08-13",
        start: "2026-07",
        target: "2026-07",
        amount: 0,
        status: "not-configured",
        householdIdeco: 0,
      },
    ] as const;

    for (const item of cases) {
      const state = completeState();
      const plan = required(state.idecoPlans[0], "iDeCo plan is missing");
      plan.startMonth = item.start;
      plan.projectionTarget = { type: "month", month: item.target };
      plan.taxContributionSnapshots = [];
      const result = selectOverview(state, item.reference);
      const member = required(
        result.members[0],
        `${item.name} overview member is missing`,
      );
      expect(member.ideco.currentMonthContributionYen, item.name).toBe(
        item.amount,
      );
      expect(member.ideco.status, item.name).toBe(item.status);
      expect(result.household.idecoContributionYen, item.name).toBe(
        item.householdIdeco,
      );
      expect(result.household.investmentContributionYen, item.name).toBe(
        (result.household.nisaContributionYen ?? 0) + item.householdIdeco,
      );
      const periodWarning = result.warnings.find(
        (entry) =>
          entry.domain === "ideco" &&
          entry.sourceId === plan.id &&
          entry.code === "not-configured",
      );
      if (item.status === "not-configured") {
        expect(periodWarning, item.name).toMatchObject({
          category: "blocking",
          memberId: "member-self",
        });
      } else {
        expect(periodWarning, item.name).toBeUndefined();
      }
    }
  });

  it("excludes an inactive partner and preserves the input state bytes", () => {
    const state = completeState();
    state.members[1] = {
      ...required(state.members[1], "partner member is missing"),
      birthDate: "1991-02-02",
      residencePrefecture: "JP-13",
    };
    state.takeHomePlans.push(takeHomePlan("member-partner", 2_400_000));
    const before = JSON.stringify(state);
    const result = selectOverview(state, referenceDate);
    expect(result.members.map((member) => member.memberId)).toEqual([
      "member-self",
    ]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("includes an active partner and refuses partial household totals", () => {
    const state = completeState();
    state.members[1] = {
      ...required(state.members[1], "partner member is missing"),
      active: true,
      birthDate: "1991-02-02",
      residencePrefecture: "JP-13",
    };
    const result = selectOverview(state, referenceDate);
    expect(result.members).toHaveLength(2);
    expect(result.members[1]?.takeHomeStatus).toBe("not-configured");
    expect(result.household.takeHomeMonthlyYen).toBeNull();
    expect(result.household.afterInvestmentYen).toBeNull();
  });

  it("keeps negative remainders visible and emits deterministic overspent warnings", () => {
    const state = completeState();
    state.budget.simpleMonthlyExpenseYen = 2_000_000;
    const first = selectOverview(state, referenceDate);
    const second = selectOverview(state, referenceDate);
    expect(first.members[0]?.afterLivingExpenseYen).toBeLessThan(0);
    expect(first.members[0]?.afterInvestmentYen).toBeLessThan(0);
    expect(first.warnings.map((item) => item.key)).toEqual(
      second.warnings.map((item) => item.key),
    );
    expect(first.warnings.some((item) => item.category === "overspent")).toBe(
      true,
    );
  });

  it("keeps nonblocking warnings after blocking and overspent warnings", () => {
    const state = completeState();
    state.budget.simpleMonthlyExpenseYen = 2_000_000;
    const categories = selectOverview(state, referenceDate).warnings.map(
      (item) => item.category,
    );
    const priorities = categories.map(
      (value) =>
        ({ blocking: 0, overspent: 1, statutory: 2, assumption: 3 })[value],
    );
    expect(priorities).toEqual(
      [...priorities].sort((left, right) => left - right),
    );
  });

  it("exposes applied metadata with HTTPS-only evidence links", () => {
    const result = selectOverview(completeState(), referenceDate);
    expect(result.rules.length).toBeGreaterThan(0);
    for (const rule of result.rules) {
      expect(rule.id).not.toBe("");
      expect(rule.domain).not.toBe("");
      expect(rule.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.sources.length).toBeGreaterThan(0);
      expect(
        rule.sources.every((source) => source.url.startsWith("https://")),
      ).toBe(true);
    }
  });

  it("uses projection outputs without adding fixture balances or recomputing them", () => {
    const state = completeState();
    const result = selectOverview(state, referenceDate);
    const member = required(result.members[0], "overview member is missing");
    expect(member.nisa.projectedBalanceYen).not.toBeNull();
    expect(member.ideco.projectedBalanceYen).not.toBeNull();
    const nisaBalance = required(
      member.nisa.projectedBalanceYen ?? undefined,
      "NISA balance is missing",
    );
    const idecoBalance = required(
      member.ideco.projectedBalanceYen ?? undefined,
      "iDeCo balance is missing",
    );
    expect(result.household.projectedBalanceYen).toBe(
      nisaBalance + idecoBalance,
    );
  });

  it("preserves detailed budget allocation for self and an active partner", () => {
    const state = completeState();
    state.members[1] = {
      ...required(state.members[1], "partner member is missing"),
      active: true,
      birthDate: "1991-02-02",
      residencePrefecture: "JP-13",
    };
    state.budget.mode = "detailed";
    state.budget.globalSelfShareBasisPoints = 6_000;
    state.budget.categories = [
      {
        id: "living",
        name: "生活費",
        description: "",
        shareMode: "inherit",
        sortOrder: 0,
        active: true,
      },
    ];
    state.budget.items = [
      {
        id: "rent",
        categoryId: "living",
        purpose: "家賃",
        kind: "living-expense",
        scope: "shared",
        amountYen: 100_000,
        cycleValue: 1,
        cycleUnit: "month",
        occurrencesPerCycle: 1,
        shareMode: "inherit",
        source: { type: "manual" },
        memo: "",
        active: true,
      },
    ];
    const result = selectOverview(state, referenceDate);
    expect(
      result.members.map((member) => member.livingExpenseMonthlyYen),
    ).toEqual([60_000, 40_000]);
    expect(result.household.livingExpenseMonthlyYen).toBe(100_000);
  });

  it("recomputes from changed sources immediately and remains deterministic", () => {
    const state = completeState();
    const first = selectOverview(state, referenceDate);
    const second = selectOverview(state, referenceDate);
    expect(second).toEqual(first);
    required(state.nisaPlans[0], "NISA plan is missing").monthlyTsumitateYen =
      20_000;
    const changed = selectOverview(state, referenceDate);
    expect(changed.members[0]?.nisa.currentMonthContributionYen).toBe(27_000);
    expect(changed.members[0]?.afterInvestmentYen).not.toBe(
      first.members[0]?.afterInvestmentYen,
    );
  });

  it("keeps known contributions while missing scenarios remain incomplete", () => {
    const state = completeState();
    state.investmentScenarios = [];
    const member = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    );
    expect(member.nisa).toMatchObject({
      status: "incomplete",
      currentMonthContributionYen: 17_000,
    });
    expect(member.ideco).toMatchObject({
      status: "incomplete",
      currentMonthContributionYen: 10_000,
    });
  });

  it("propagates iDeCo context, missing-rule, and out-of-range statuses", () => {
    const contextState = completeState();
    required(
      contextState.idecoPlans[0],
      "iDeCo plan is missing",
    ).participantCategoryConfirmed = false;
    expect(
      selectOverview(contextState, referenceDate).members[0]?.ideco,
    ).toMatchObject({
      status: "incomplete",
      currentMonthContributionYen: 10_000,
    });

    const missingRuleState = completeState();
    const missingRulePlan = required(
      missingRuleState.idecoPlans[0],
      "iDeCo plan is missing",
    );
    missingRulePlan.startMonth = "2024-11";
    missingRulePlan.projectionTarget = { type: "month", month: "2024-11" };
    expect(
      selectOverview(missingRuleState, "2024-11-01").members[0]?.ideco,
    ).toMatchObject({
      status: "missing-rule",
      currentMonthContributionYen: 10_000,
    });

    const outOfRangeState = completeState();
    required(
      outOfRangeState.investmentScenarios[0],
      "investment scenario is missing",
    ).annualReturnBasisPoints = Number.MAX_SAFE_INTEGER;
    required(
      outOfRangeState.idecoPlans[0],
      "iDeCo plan is missing",
    ).currentBalanceYen = Number.MAX_SAFE_INTEGER;
    expect(
      selectOverview(outOfRangeState, referenceDate).members[0]?.ideco,
    ).toMatchObject({
      status: "out-of-range",
      currentMonthContributionYen: 10_000,
    });
  });

  it("propagates NISA missing-rule and out-of-range statuses", () => {
    const missingRuleState = completeState();
    const missingRulePlan = required(
      missingRuleState.nisaPlans[0],
      "NISA plan is missing",
    );
    missingRulePlan.startMonth = "2023-01";
    missingRulePlan.targetMonth = "2023-12";
    missingRulePlan.additionalPurchases = [];
    expect(
      selectOverview(missingRuleState, "2023-08-01").members[0]?.nisa,
    ).toMatchObject({
      status: "missing-rule",
      currentMonthContributionYen: 15_000,
    });

    const outOfRangeState = completeState();
    required(
      outOfRangeState.investmentScenarios[0],
      "investment scenario is missing",
    ).annualReturnBasisPoints = Number.MAX_SAFE_INTEGER;
    required(
      outOfRangeState.nisaPlans[0],
      "NISA plan is missing",
    ).currentBalanceYen = Number.MAX_SAFE_INTEGER;
    expect(
      selectOverview(outOfRangeState, referenceDate).members[0]?.nisa,
    ).toMatchObject({
      status: "out-of-range",
      currentMonthContributionYen: 17_000,
    });
  });

  it("preserves negative NISA and iDeCo projected gains", () => {
    const state = completeState();
    required(
      state.investmentScenarios[0],
      "investment scenario is missing",
    ).annualReturnBasisPoints = -10_000;
    required(state.idecoPlans[0], "iDeCo plan is missing").monthlyFeeYen =
      100_000;
    const member = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    );
    expect(member.nisa.projectedGainYen).toBeLessThan(0);
    expect(member.ideco.projectedGainYen).toBeLessThan(0);
    expect(member.projectedGainYen).toBe(
      (member.nisa.projectedGainYen ?? 0) +
        (member.ideco.projectedGainYen ?? 0),
    );
  });

  it("keeps household NISA, iDeCo, and combined contributions separate", () => {
    const empty = selectOverview(createInitialState(), referenceDate);
    expect(empty.household).toMatchObject({
      nisaContributionYen: 0,
      idecoContributionYen: 0,
      investmentContributionYen: 0,
    });

    const complete = selectOverview(completeState(), referenceDate);
    expect(complete.household).toMatchObject({
      nisaContributionYen: 17_000,
      idecoContributionYen: 10_000,
      investmentContributionYen: 27_000,
    });

    const partialState = completeState();
    required(
      partialState.nisaPlans[0],
      "NISA plan is missing",
    ).monthlyGrowthYen = null;
    const partial = selectOverview(partialState, referenceDate);
    expect(partial.household).toMatchObject({
      nisaContributionYen: null,
      idecoContributionYen: 10_000,
      investmentContributionYen: null,
    });
  });

  it("does not turn iDeCo null or annual-unit contributions into complete zero", () => {
    const state = completeState();
    required(
      state.idecoPlans[0],
      "iDeCo plan is missing",
    ).monthlyContributionYen = null;
    let ideco = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    ).ideco;
    expect(ideco.status).toBe("incomplete");
    expect(ideco.currentMonthContributionYen).toBeNull();
    required(
      state.idecoPlans[0],
      "iDeCo plan is missing",
    ).monthlyContributionYen = 10_000;
    required(
      state.idecoPlans[0],
      "iDeCo plan is missing",
    ).annualUnitContributionActive = true;
    ideco = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    ).ideco;
    expect(ideco.status).toBe("unsupported");
    expect(ideco.currentMonthContributionYen).toBeNull();
  });

  it("keeps known amounts for invalid NISA and iDeCo plans", () => {
    const state = completeState();
    required(state.nisaPlans[0], "NISA plan is missing").monthlyTsumitateYen =
      200_000;
    required(
      state.idecoPlans[0],
      "iDeCo plan is missing",
    ).monthlyContributionYen = 24_000;
    const member = required(
      selectOverview(state, referenceDate).members[0],
      "overview member is missing",
    );
    expect(member.nisa.status).toBe("invalid");
    expect(member.nisa.currentMonthContributionYen).toBe(207_000);
    expect(member.ideco.status).toBe("invalid");
    expect(member.ideco.currentMonthContributionYen).toBe(24_000);
  });

  it("converts budget arithmetic overflow to item null and an out-of-range warning", () => {
    const state = completeState();
    state.budget.mode = "detailed";
    state.budget.categories = [
      {
        id: "overflow",
        name: "overflow",
        description: "",
        shareMode: "inherit",
        sortOrder: 0,
        active: true,
      },
    ];
    const item = {
      id: "first",
      categoryId: "overflow",
      purpose: "first",
      kind: "living-expense" as const,
      scope: "self" as const,
      amountYen: Number.MAX_SAFE_INTEGER,
      cycleValue: 1,
      cycleUnit: "month" as const,
      occurrencesPerCycle: 1,
      shareMode: "inherit" as const,
      source: { type: "manual" as const },
      memo: "",
      active: true,
    };
    state.budget.items = [item, { ...item, id: "second", amountYen: 1 }];
    const result = selectOverview(state, referenceDate);
    expect(result.members[0]?.livingExpenseMonthlyYen).toBeNull();
    expect(
      result.warnings.some((entry) => entry.code === "allocation-out-of-range"),
    ).toBe(true);
  });

  it("deduplicates identical stable keys but never across members", () => {
    const state = createInitialState();
    state.members[1] = {
      ...required(state.members[1], "partner member is missing"),
      active: true,
    };
    const result = selectOverview(state, referenceDate);
    expect(new Set(result.warnings.map((entry) => entry.key)).size).toBe(
      result.warnings.length,
    );
    expect(
      result.warnings
        .filter(
          (entry) => entry.domain === "nisa" && entry.code === "not-configured",
        )
        .map((entry) => entry.memberId),
    ).toEqual(["member-partner", "member-self"]);
    expect(
      result.warnings.some((entry) => /バックアップ/u.test(entry.message)),
    ).toBe(true);
  });

  it("propagates a null projection component to member and household assets", () => {
    const state = completeState();
    required(state.nisaPlans[0], "NISA plan is missing").currentBalanceYen =
      null;
    const result = selectOverview(state, referenceDate);
    expect(result.members[0]?.nisa.projectedBalanceYen).toBeNull();
    expect(result.members[0]?.projectedBalanceYen).toBeNull();
    expect(result.household.projectedBalanceYen).toBeNull();
  });

  it("matches complete person totals to household totals exactly", () => {
    const state = completeState();
    state.members[1] = {
      ...required(state.members[1], "partner member is missing"),
      active: true,
      birthDate: "1991-02-02",
      residencePrefecture: "JP-13",
    };
    state.takeHomePlans.push(takeHomePlan("member-partner", 2_400_000));
    state.investmentScenarios.push(scenario("member-partner"));
    state.nisaPlans.push(nisaPlan("member-partner"));
    state.idecoPlans.push(idecoPlan("member-partner"));
    const result = selectOverview(state, referenceDate);
    const sum = (
      selector: (member: (typeof result.members)[number]) => number | null,
    ) =>
      result.members.reduce(
        (total, member) => total + (selector(member) ?? 0),
        0,
      );
    expect(result.household.takeHomeMonthlyYen).toBe(
      sum((member) => member.takeHomeMonthlyYen),
    );
    expect(result.household.afterInvestmentYen).toBe(
      sum((member) => member.afterInvestmentYen),
    );
    expect(result.household.projectedBalanceYen).toBe(
      sum((member) => member.projectedBalanceYen),
    );
  });
});
