import { describe, expect, it } from "vitest";
import {
  calculateIdecoPlan,
  createIdecoPlan,
  evaluateIdecoPlan,
  type IdecoCalculationReference,
  type IdecoPlan,
} from "../src/domain/ideco";
import { selectLifePlanAssets } from "../src/domain/life-plan-assets";
import { selectLifePlan } from "../src/domain/life-plan";
import {
  calculateNisaPlan,
  evaluateNisaPlan,
  type InvestmentScenario,
  type NisaPlan,
} from "../src/domain/nisa";
import {
  createInitialState,
  routeIds,
  SCHEMA_VERSION,
  type AppState,
  type HouseholdMember,
} from "../src/domain/state";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";

const baseReferenceDate = "2026-08-21";
const calculationReference = {
  referenceDate: baseReferenceDate,
  taxYear: 2026,
} as const;

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

function scenario(
  memberId = "member-self",
  changes: Partial<InvestmentScenario> = {},
): InvestmentScenario {
  return {
    id: `scenario-${memberId}`,
    memberId,
    kind: "standard",
    annualReturnBasisPoints: 300,
    annualFeeBasisPoints: 20,
    annualInflationBasisPoints: 100,
    ...changes,
  };
}

function nisaPlan(
  memberOrChanges: string | Partial<NisaPlan> = "member-self",
  changes: Partial<NisaPlan> = {},
): NisaPlan {
  const memberId =
    typeof memberOrChanges === "string" ? memberOrChanges : "member-self";
  const overrides =
    typeof memberOrChanges === "string" ? changes : memberOrChanges;
  return {
    id: `nisa-${memberId}`,
    memberId,
    japanResidentConfirmed: true,
    startMonth: "2026-01",
    targetMonth: "2027-12",
    currentBalanceYen: 100_000,
    currentBookValueYen: 90_000,
    usedLimitYen: 90_000,
    usedGrowthLimitYen: 0,
    monthlyTsumitateYen: 10_000,
    monthlyGrowthYen: 0,
    additionalPurchases: [],
    contributionTiming: "end",
    activeScenarioId: `scenario-${memberId}`,
    active: true,
    ...overrides,
  };
}

function idecoPlan(
  memberOrChanges: string | Partial<IdecoPlan> = "member-self",
  changes: Partial<IdecoPlan> = {},
): IdecoPlan {
  const memberId =
    typeof memberOrChanges === "string" ? memberOrChanges : "member-self";
  const overrides =
    typeof memberOrChanges === "string" ? changes : memberOrChanges;
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
    startMonth: "2026-01",
    monthlyContributionYen: 10_000,
    currentBalanceYen: 100_000,
    currentContributionTotalYen: 80_000,
    monthlyFeeYen: 171,
    projectionTarget: { type: "month", month: "2027-12" },
    taxContributionSnapshots: [
      {
        taxYear: 2026,
        paidThroughMonth: "2026-07",
        paidYen: 60_000,
      },
    ],
    ...overrides,
  };
}

function takeHomePlan(member: HouseholdMember, targetYear = 2026) {
  const plan = createCalculatedTakeHomePlan({
    id: `take-home-${member.id}`,
    memberId: member.id,
    targetYear,
    birthDate: member.birthDate ?? "1990-01-01",
    residencePrefecture: "JP-13",
  });
  plan.compensation.annualTaxableSalaryYen = 3_600_000;
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

function completeState(
  options: {
    projectionStartYear?: number;
    projectionYears?: number;
    startingLiquidAssetsYen?: number;
    budgetYen?: number;
  } = {},
): AppState {
  const state = createInitialState();
  const self = required(state.members[0], "self");
  self.birthDate = "1990-01-01";
  self.residencePrefecture = "JP-13";
  state.takeHomePlans = [takeHomePlan(self)];
  state.budget.mode = "simple";
  state.budget.simpleMonthlyExpenseYen = options.budgetYen ?? 100_000;
  state.lifePlan = {
    baseReferenceDate,
    projectionStartYear: options.projectionStartYear ?? 2026,
    startingLiquidAssetsYen: options.startingLiquidAssetsYen ?? 1_000_000,
    projectionYears: options.projectionYears ?? 2,
    events: [],
  };
  return state;
}

function activatePartner(state: AppState): HouseholdMember {
  const partner = required(
    state.members.find((member) => member.role === "partner"),
    "partner",
  );
  partner.active = true;
  partner.birthDate = "1992-02-02";
  partner.residencePrefecture = "JP-13";
  state.takeHomePlans.push(takeHomePlan(partner));
  return partner;
}

function addNisa(state: AppState, plan = nisaPlan()): void {
  if (
    !state.investmentScenarios.some(
      (candidate) => candidate.id === plan.activeScenarioId,
    )
  )
    state.investmentScenarios.push(
      scenario(plan.memberId, { id: plan.activeScenarioId }),
    );
  state.nisaPlans.push(plan);
}

function addIdeco(state: AppState, plan = idecoPlan()): void {
  if (
    !state.investmentScenarios.some(
      (candidate) => candidate.id === plan.activeScenarioId,
    )
  )
    state.investmentScenarios.push(
      scenario(plan.memberId, { id: plan.activeScenarioId }),
    );
  state.idecoPlans.push(plan);
}

describe("shared investment evaluation points", () => {
  const member: { active: boolean; birthDate: string } = {
    active: true,
    birthDate: "1990-01-01",
  };

  it("preserves the complete NISA public result and keeps rounding observational", () => {
    const plan = nisaPlan();
    const selectedScenario = scenario();
    const evaluation = evaluateNisaPlan(plan, selectedScenario, member);
    const publicResult = calculateNisaPlan(plan, selectedScenario, member);
    expect(evaluation.result).toEqual(publicResult);
    expect(evaluation.points).toHaveLength(24);
    const terminal = required(evaluation.points.at(-1), "terminal NISA point");
    expect(terminal).toMatchObject({
      month: "2027-12",
      principalYen: publicResult.projectedPrincipalYen,
      balanceYen: publicResult.projectedBalanceYen,
      gainYen: publicResult.projectedGainYen,
    });

    const annualReturn =
      required(selectedScenario.annualReturnBasisPoints, "annual return") /
      10_000;
    const annualFee =
      required(selectedScenario.annualFeeBasisPoints, "annual fee") / 10_000;
    const factor =
      Math.pow(1 + annualReturn, 1 / 12) / Math.pow(1 + annualFee, 1 / 12);
    let unrounded = required(plan.currentBalanceYen, "current balance");
    let roundedFeedback = required(plan.currentBalanceYen, "current balance");
    for (let month = 0; month < 24; month += 1) {
      const contribution = required(
        plan.monthlyTsumitateYen,
        "monthly contribution",
      );
      unrounded = unrounded * factor + contribution;
      roundedFeedback = Math.round(roundedFeedback * factor + contribution);
    }
    expect(terminal.balanceYen).toBe(Math.round(unrounded));
    expect(terminal.balanceYen).not.toBe(roundedFeedback);
  });

  it("preserves the complete iDeCo public result and includes fees only in account math", () => {
    const plan = idecoPlan();
    const selectedScenario = scenario();
    const evaluation = evaluateIdecoPlan(
      plan,
      selectedScenario,
      member,
      calculationReference,
    );
    const publicResult = calculateIdecoPlan(
      plan,
      selectedScenario,
      member,
      calculationReference,
    );
    expect(evaluation.result).toEqual(publicResult);
    expect(evaluation.points).toHaveLength(24);
    expect(evaluation.points.at(-1)).toMatchObject({
      month: "2027-12",
      principalYen: publicResult.projectedPrincipalYen,
      balanceYen: publicResult.projectedBalanceYen,
      gainYen: publicResult.projectedGainYen,
    });
  });

  it("characterizes NISA complete and non-complete public diagnostics", () => {
    const cases: Array<{
      expected: string;
      plan: NisaPlan;
      scenario: InvestmentScenario | undefined;
      member?: typeof member;
    }> = [
      { expected: "complete", plan: nisaPlan(), scenario: scenario() },
      {
        expected: "invalid",
        plan: nisaPlan({ monthlyTsumitateYen: 100_001 }),
        scenario: scenario(),
      },
      {
        expected: "incomplete",
        plan: nisaPlan({ monthlyTsumitateYen: null }),
        scenario: scenario(),
      },
      {
        expected: "unsupported",
        plan: nisaPlan(),
        scenario: scenario(),
        member: { ...member, active: false },
      },
      {
        expected: "missing-rule",
        plan: nisaPlan({ startMonth: "2023-01", targetMonth: "2023-12" }),
        scenario: scenario(),
      },
      {
        expected: "out-of-range",
        plan: nisaPlan({ targetMonth: "2125-12" }),
        scenario: scenario("member-self", {
          annualInflationBasisPoints: Number.MAX_SAFE_INTEGER,
        }),
      },
    ];
    for (const item of cases) {
      const evaluation = evaluateNisaPlan(
        item.plan,
        item.scenario,
        item.member ?? member,
      );
      expect(evaluation.result).toEqual(
        calculateNisaPlan(item.plan, item.scenario, item.member ?? member),
      );
      expect(evaluation.result.status).toBe(item.expected);
      expect(evaluation.result).toHaveProperty("annualContributions");
      expect(evaluation.result).toHaveProperty("lifetimeLimitReach");
      expect(evaluation.result).toHaveProperty("issues");
      expect(evaluation.result).toHaveProperty("messages");
      expect(evaluation.result).toHaveProperty("assumptions");
    }
  });

  it("characterizes iDeCo complete and non-complete public diagnostics", () => {
    const cases: Array<{
      expected: string;
      plan: IdecoPlan;
      scenario: InvestmentScenario | undefined;
      reference?: IdecoCalculationReference;
    }> = [
      { expected: "complete", plan: idecoPlan(), scenario: scenario() },
      {
        expected: "invalid",
        plan: idecoPlan({ monthlyContributionYen: 100_000 }),
        scenario: scenario(),
      },
      { expected: "incomplete", plan: idecoPlan(), scenario: undefined },
      {
        expected: "unsupported",
        plan: idecoPlan({ annualUnitContributionActive: true }),
        scenario: scenario(),
      },
      {
        expected: "missing-rule",
        plan: idecoPlan({
          startMonth: "2024-11",
          projectionTarget: { type: "month", month: "2024-12" },
          taxContributionSnapshots: [],
        }),
        scenario: scenario(),
        reference: { referenceDate: "2024-11-01", taxYear: 2024 },
      },
      {
        expected: "out-of-range",
        plan: idecoPlan({
          projectionTarget: { type: "month", month: "2125-12" },
        }),
        scenario: scenario("member-self", {
          annualInflationBasisPoints: Number.MAX_SAFE_INTEGER,
        }),
      },
    ];
    for (const item of cases) {
      const reference = item.reference ?? calculationReference;
      const evaluation = evaluateIdecoPlan(
        item.plan,
        item.scenario,
        member,
        reference,
      );
      expect(evaluation.result).toEqual(
        calculateIdecoPlan(item.plan, item.scenario, member, reference),
      );
      expect(evaluation.result.status).toBe(item.expected);
      expect(evaluation.result).toHaveProperty("targetMonth");
      expect(evaluation.result).toHaveProperty("allowedContributionYen");
      expect(evaluation.result).toHaveProperty("annualPaidContributionYen");
      expect(evaluation.result).toHaveProperty("messages");
      expect(evaluation.result).toHaveProperty("assumptions");
    }
  });
});

describe("life plan financial-assets selector", () => {
  it("keeps TASK-014 liquid output intact and treats no plan as explicit zero", () => {
    const state = completeState();
    const liquid = selectLifePlan(state);
    const result = selectLifePlanAssets(state);
    expect(result.base).toEqual(liquid);
    expect(result.years).toHaveLength(liquid.years.length);
    for (const row of result.years) {
      expect(row.memberInvestments[0]).toMatchObject({
        nisa: { status: "not-configured", balanceYen: 0 },
        ideco: { status: "not-configured", balanceYen: 0 },
      });
      expect(row.totalFinancialAssetsYen).toBe(row.closingLiquidAssetsYen);
      expect(row.totalStatus).toBe("complete");
    }
    expect(SCHEMA_VERSION).toBe(7);
    expect(routeIds).toHaveLength(6);
  });

  it.each([
    ["NISA only", true, false],
    ["iDeCo only", false, true],
    ["both", true, true],
  ])(
    "aggregates %s at exact December endpoints",
    (_name, withNisa, withIdeco) => {
      const state = completeState();
      if (withNisa) addNisa(state);
      if (withIdeco) addIdeco(state);
      const result = selectLifePlanAssets(state);
      expect(result.contributionConsistencyIssues).toEqual([]);
      for (const row of result.years) {
        expect(row.endpointMonth).toBe(`${String(row.year)}-12`);
        expect(row.memberInvestments[0]?.nisa.status).toBe(
          withNisa ? "complete" : "not-configured",
        );
        expect(row.memberInvestments[0]?.ideco.status).toBe(
          withIdeco ? "complete" : "not-configured",
        );
        expect(row.totalFinancialAssetsYen).toBe(
          row.closingLiquidAssetsYen +
            (row.nisaBalanceYen ?? 0) +
            (row.idecoBalanceYen ?? 0),
        );
      }
    },
  );

  it("never relabels target-month balances as December and does not invent pre-start values", () => {
    const targetBefore = completeState({ projectionYears: 1 });
    addNisa(targetBefore, nisaPlan("member-self", { targetMonth: "2026-11" }));
    const targetRow = required(
      selectLifePlanAssets(targetBefore).years[0],
      "target row",
    );
    expect(targetRow.memberInvestments[0]?.nisa).toMatchObject({
      endpointMonth: "2026-12",
      status: "target-before-year-end",
      balanceYen: null,
    });

    const startAfter = completeState({ projectionYears: 1 });
    addNisa(
      startAfter,
      nisaPlan("member-self", {
        startMonth: "2027-01",
        targetMonth: "2027-12",
      }),
    );
    const startRow = required(
      selectLifePlanAssets(startAfter).years[0],
      "start row",
    );
    expect(startRow.memberInvestments[0]?.nisa).toMatchObject({
      endpointMonth: "2026-12",
      status: "start-after-year-end",
      balanceYen: null,
    });
  });

  it("detects a future NISA one-off in its exact month and propagates the mismatch", () => {
    const state = completeState();
    addNisa(
      state,
      nisaPlan("member-self", {
        additionalPurchases: [
          {
            id: "future-extra",
            month: "2026-10",
            bucket: "growth",
            amountYen: 50_000,
          },
        ],
      }),
    );
    const result = selectLifePlanAssets(state);
    expect(result.contributionConsistencyIssues).toContainEqual({
      kind: "mismatch",
      memberId: "member-self",
      domain: "nisa",
      sourceId: "nisa-member-self",
      firstAffectedMonth: "2026-10",
      baselineMonthlyYen: 10_000,
      actualMonthlyYen: 60_000,
    });
    expect(result.years.map((row) => row.totalFinancialAssetsYen)).toEqual([
      null,
      null,
    ]);
    expect(
      result.years.every((row) =>
        row.totalReasons.includes("cashflow-schedule-mismatch"),
      ),
    ).toBe(true);

    const withoutExtra = completeState();
    addNisa(withoutExtra);
    expect(result.years[0]?.nisaBalanceYen).toBeGreaterThan(
      selectLifePlanAssets(withoutExtra).years[0]?.nisaBalanceYen ?? 0,
    );
  });

  it("detects a base-reference one-off repeated by TASK-014 from the first projected month", () => {
    const state = completeState({ projectionYears: 1 });
    addNisa(
      state,
      nisaPlan("member-self", {
        additionalPurchases: [
          {
            id: "base-extra",
            month: "2026-08",
            bucket: "tsumitate",
            amountYen: 5_000,
          },
        ],
      }),
    );
    expect(
      selectLifePlanAssets(state).contributionConsistencyIssues[0],
    ).toMatchObject({
      kind: "mismatch",
      firstAffectedMonth: "2026-01",
      baselineMonthlyYen: 15_000,
      actualMonthlyYen: 10_000,
    });
  });

  it.each([
    [
      "future start",
      { startMonth: "2026-10", targetMonth: "2027-12" },
      "2026-10",
    ],
    [
      "future end",
      { startMonth: "2026-01", targetMonth: "2026-11" },
      "2026-12",
    ],
  ])(
    "detects a %s contribution timing mismatch",
    (_name, planChange, month) => {
      const state = completeState({ projectionYears: 1 });
      addNisa(state, nisaPlan("member-self", planChange));
      expect(
        selectLifePlanAssets(state).contributionConsistencyIssues[0],
      ).toMatchObject({ kind: "mismatch", firstAffectedMonth: month });
    },
  );

  it("excludes the iDeCo account fee from household contribution consistency", () => {
    const state = completeState({ projectionYears: 1 });
    addIdeco(
      state,
      idecoPlan("member-self", {
        projectionTarget: { type: "month", month: "2026-12" },
        monthlyFeeYen: 9_999,
      }),
    );
    const result = selectLifePlanAssets(state);
    expect(result.contributionConsistencyIssues).toEqual([]);
    expect(result.years[0]?.memberInvestments[0]?.ideco.status).toBe(
      "complete",
    );
    expect(result.years[0]?.totalFinancialAssetsYen).not.toBeNull();
  });

  it("uses one fixed life-plan base reference for iDeCo instead of the row end", () => {
    const state = completeState({ projectionYears: 1 });
    const plan = idecoPlan("member-self", {
      startMonth: "2026-08",
      projectionTarget: { type: "month", month: "2026-12" },
      taxContributionSnapshots: [],
    });
    addIdeco(state, plan);
    expect(
      calculateIdecoPlan(
        plan,
        required(state.investmentScenarios[0], "scenario"),
        required(state.members[0], "member"),
        calculationReference,
      ).status,
    ).toBe("complete");
    expect(
      calculateIdecoPlan(
        plan,
        required(state.investmentScenarios[0], "scenario"),
        required(state.members[0], "member"),
        { referenceDate: "2026-12-31", taxYear: 2026 },
      ).status,
    ).toBe("incomplete");
    const result = selectLifePlanAssets(state);
    expect(result.years[0]?.memberInvestments[0]?.ideco.status).toBe(
      "complete",
    );
    expect(result.contributionConsistencyIssues[0]).toMatchObject({
      domain: "ideco",
      firstAffectedMonth: "2026-01",
    });
  });

  it("reconciles two active members and excludes persisted inactive-member plans", () => {
    const state = completeState({ projectionYears: 1 });
    const partner = activatePartner(state);
    addNisa(state);
    addNisa(
      state,
      nisaPlan(partner.id, {
        id: "nisa-partner",
        activeScenarioId: "scenario-partner",
        monthlyTsumitateYen: 5_000,
      }),
    );
    const activeResult = selectLifePlanAssets(state);
    const activeRow = required(activeResult.years[0], "active row");
    expect(activeRow.memberInvestments).toHaveLength(2);
    expect(activeRow.nisaBalanceYen).toBe(
      activeRow.memberInvestments.reduce(
        (total, member) => total + (member.nisa.balanceYen ?? 0),
        0,
      ),
    );

    partner.active = false;
    const inactiveRow = required(
      selectLifePlanAssets(state).years[0],
      "inactive row",
    );
    expect(inactiveRow.memberInvestments).toHaveLength(1);
    expect(inactiveRow.nisaBalanceYen).toBe(
      inactiveRow.memberInvestments[0]?.nisa.balanceYen,
    );
  });

  it("fails closed on defensive multiple active plans", () => {
    const state = completeState({ projectionYears: 1 });
    addNisa(state);
    state.nisaPlans.push(
      nisaPlan("member-self", {
        id: "nisa-duplicate",
        activeScenarioId: "scenario-member-self",
      }),
    );
    const result = selectLifePlanAssets(state);
    expect(result.status).toBe("incomplete");
    expect(result.years).toEqual([]);
    expect(result.base.warnings[0]?.code).toBe("upstream-incomplete");
  });

  it.each([
    ["incomplete", nisaPlan(), undefined, false],
    [
      "invalid",
      nisaPlan("member-self", { monthlyTsumitateYen: 100_001 }),
      scenario(),
      false,
    ],
    ["unsupported", nisaPlan(), scenario(), true],
    [
      "missing-rule",
      nisaPlan("member-self", {
        startMonth: "2023-01",
        targetMonth: "2026-12",
      }),
      scenario(),
      false,
    ],
    [
      "out-of-range",
      nisaPlan("member-self", { targetMonth: "2125-12" }),
      scenario("member-self", {
        annualInflationBasisPoints: Number.MAX_SAFE_INTEGER,
      }),
      false,
    ],
  ] as const)(
    "propagates active NISA %s before lifecycle labels",
    (expected, plan, selectedScenario, underage) => {
      const state = completeState({ projectionYears: 1 });
      if (underage)
        required(state.members[0], "member").birthDate = "2010-01-01";
      if (selectedScenario) state.investmentScenarios.push(selectedScenario);
      state.nisaPlans.push(plan);
      const result = selectLifePlanAssets(state);
      expect(result.years[0]?.memberInvestments[0]?.nisa.status).toBe(expected);
      expect(result.years[0]?.nisaBalanceYen).toBeNull();
      expect(result.years[0]?.totalFinancialAssetsYen).toBeNull();
    },
  );

  it("keeps negative liquid visible but withholds the financial-assets total", () => {
    const state = completeState({ projectionYears: 1 });
    addNisa(state);
    state.lifePlan.events.push({
      id: "shortfall",
      name: "大口支出",
      kind: "expense",
      startYear: 2026,
      endYear: 2026,
      annualAmountYen: 10_000_000,
      memo: "",
      active: true,
    });
    const row = required(selectLifePlanAssets(state).years[0], "shortfall row");
    expect(row.closingLiquidAssetsYen).toBeLessThan(0);
    expect(row.liquidShortfallYen).toBe(-row.closingLiquidAssetsYen);
    expect(row.nisaBalanceYen).not.toBeNull();
    expect(row.totalFinancialAssetsYen).toBeNull();
    expect(row.totalReasons).toContain("negative-liquid-shortfall");
  });

  it("withholds unsafe integer aggregation without changing schema", () => {
    const state = completeState({
      projectionYears: 1,
      startingLiquidAssetsYen: 100_000,
      budgetYen: 300_000,
    });
    const zeroScenario = scenario("member-self", {
      annualReturnBasisPoints: 0,
      annualFeeBasisPoints: 0,
      annualInflationBasisPoints: 0,
    });
    state.investmentScenarios = [zeroScenario];
    state.nisaPlans = [
      nisaPlan("member-self", {
        targetMonth: "2026-12",
        currentBalanceYen: Number.MAX_SAFE_INTEGER,
        currentBookValueYen: 0,
        usedLimitYen: 0,
        monthlyTsumitateYen: 0,
      }),
    ];
    const row = required(selectLifePlanAssets(state).years[0], "overflow row");
    expect(row.closingLiquidAssetsYen).toBeGreaterThan(0);
    expect(row.nisaBalanceYen).toBe(Number.MAX_SAFE_INTEGER);
    expect(row.totalStatus).toBe("out-of-range");
    expect(row.totalFinancialAssetsYen).toBeNull();
    expect(row.totalReasons).toContain("arithmetic-out-of-range");
    expect(state.schemaVersion).toBe(7);
  });
});
