import { describe, expect, it } from "vitest";
import { Store } from "../src/app/store";
import { routeFromHash, routeIds } from "../src/app/router";
import { calculateBudgetSummary } from "../src/domain/budget";
import { createIdecoPlan, type IdecoPlan } from "../src/domain/ideco";
import { selectInvestmentFundingContext } from "../src/domain/investment-funding";
import { migrateToCurrentState } from "../src/domain/migration";
import type { InvestmentScenario } from "../src/domain/nisa";
import { calculatePayroll, type PayrollPlan } from "../src/domain/payroll";
import {
  createInitialState,
  parseAppState,
  reduceState,
  validateAppState,
  type AppState,
} from "../src/domain/state";
import {
  calculateTakeHomeFromState,
  resolveEffectiveTakeHomePlan,
} from "../src/domain/take-home-linked-calculator";
import { calculateTakeHome } from "../src/domain/take-home-calculator";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import {
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import investmentFundingSource from "../src/domain/investment-funding.ts?raw";
import { createFixtureState } from "./fixtures/state";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function payroll(overrides: Partial<PayrollPlan> = {}): PayrollPlan {
  return {
    id: "payroll-self-2026",
    memberId: "member-self",
    targetYear: 2026,
    active: true,
    baseMonthlyYen: 320_000,
    taxableAllowanceMonthlyYen: 20_000,
    averageMonthlyOvertimeMinutes: 600,
    scheduledMonthlyMinutes: 9_600,
    overtimeRateBasisPoints: 12_500,
    monthlyNonTaxableCommutingYen: 10_000,
    bonuses: [],
    ...overrides,
  };
}

function completeTakeHomePlan() {
  const plan = createCalculatedTakeHomePlan({
    id: "take-home-self-2026",
    memberId: "member-self",
    targetYear: 2026,
  });
  plan.inputMode = "monthly";
  plan.compensation.monthlyTaxableSalaryYen = 1;
  plan.compensation.annualTaxableSalaryYen = 1;
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

function investmentScenario(): InvestmentScenario {
  return {
    id: "scenario-self",
    memberId: "member-self",
    kind: "standard",
    annualReturnBasisPoints: 300,
    annualFeeBasisPoints: 50,
    annualInflationBasisPoints: 100,
  };
}

function linkedIdecoPlan(): IdecoPlan {
  return {
    ...createIdecoPlan({
      id: "ideco-self",
      memberId: "member-self",
      activeScenarioId: "scenario-self",
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
    monthlyFeeYen: 0,
    projectionTarget: { type: "month", month: "2026-12" },
    taxContributionSnapshots: [
      { taxYear: 2026, paidThroughMonth: "2026-07", paidYen: 60_000 },
    ],
  };
}

function workflowState(): AppState {
  const state = createInitialState();
  state.payrollPlans = [payroll()];
  state.takeHomePlans = [completeTakeHomePlan()];
  state.takeHomeCompensationBindings = [
    {
      takeHomePlanId: "take-home-self-2026",
      payrollPlanId: "payroll-self-2026",
      active: true,
    },
  ];
  return state;
}

describe("TASK-016 payroll arithmetic", () => {
  it("handles zero, representative and exact half-up overtime", () => {
    expect(
      calculatePayroll(payroll({ averageMonthlyOvertimeMinutes: 0 }))
        .overtimeMonthlyYen,
    ).toBe(0);
    expect(calculatePayroll(payroll()).overtimeMonthlyYen).toBe(25_000);
    expect(
      calculatePayroll(
        payroll({
          baseMonthlyYen: 1,
          taxableAllowanceMonthlyYen: 999,
          averageMonthlyOvertimeMinutes: 1,
          scheduledMonthlyMinutes: 1,
          overtimeRateBasisPoints: 5_000,
        }),
      ).overtimeMonthlyYen,
    ).toBe(1);
  });

  it("uses custom time/rate, excludes allowance from basis and counts bonus once", () => {
    const result = calculatePayroll(
      payroll({
        baseMonthlyYen: 300_000,
        taxableAllowanceMonthlyYen: 50_000,
        averageMonthlyOvertimeMinutes: 600,
        scheduledMonthlyMinutes: 7_500,
        overtimeRateBasisPoints: 15_000,
        monthlyNonTaxableCommutingYen: 12_000,
        bonuses: [
          {
            id: "bonus",
            paymentDate: "2026-06-30",
            grossYen: 400_000,
            socialInsuranceEligible: true,
            employmentInsuranceEligible: true,
          },
        ],
      }),
    );
    expect(result.overtimeMonthlyYen).toBe(36_000);
    expect(result.monthlyTaxableSalaryYen).toBe(386_000);
    expect(result.monthlyGrossYen).toBe(398_000);
    expect(result.annualTaxableSalaryYen).toBe(5_032_000);
    expect(result.annualNonTaxableCommutingYen).toBe(144_000);
    expect(result.annualGrossYen).toBe(5_176_000);
  });

  it("rejects invalid time, cross-year bonus and unsafe arithmetic", () => {
    expect(() =>
      validateAppState({
        ...createInitialState(),
        payrollPlans: [payroll({ scheduledMonthlyMinutes: 0 })],
      }),
    ).toThrow("scheduledMonthlyMinutes");
    expect(() =>
      validateAppState({
        ...createInitialState(),
        payrollPlans: [
          payroll({
            bonuses: [
              {
                id: "wrong-year",
                paymentDate: "2027-01-01",
                grossYen: 1,
                socialInsuranceEligible: true,
                employmentInsuranceEligible: true,
              },
            ],
          }),
        ],
      }),
    ).toThrow("targetYear");
    expect(() =>
      calculatePayroll(
        payroll({
          baseMonthlyYen: Number.MAX_SAFE_INTEGER,
          averageMonthlyOvertimeMinutes: 2,
        }),
      ),
    ).toThrow("supported range");
  });

  it("enforces one active payroll per member and year", () => {
    expect(() =>
      validateAppState({
        ...createInitialState(),
        payrollPlans: [payroll(), payroll({ id: "duplicate" })],
      }),
    ).toThrow("one active payroll plan");
  });
});

describe("TASK-016 payroll to take-home authority", () => {
  it("auto-links the new-user workflow without copying derived values", () => {
    const memory = new MemoryStorage();
    const repository = new StorageRepository(memory);
    const store = new Store(
      createInitialState(),
      repository,
      () => "2026-08-21T00:00:00.000Z",
    );
    expect(store.getState().budgetIncomePolicies).toEqual([
      { targetId: "budget-income-self", mode: "auto-take-home" },
      { targetId: "budget-income-partner", mode: "auto-take-home" },
    ]);
    expect(
      calculateBudgetSummary(store.getState(), "2026-08-21").self,
    ).toMatchObject({
      incomeYen: null,
      unresolvedIncome: true,
    });
    expect(
      selectInvestmentFundingContext(store.getState(), "2026-08-21").household
        .status,
    ).toBe("unavailable");

    const directPlan = completeTakeHomePlan();
    const directBytes = structuredClone(directPlan.compensation);
    const manualIncomeBytes = structuredClone(store.getState().incomeTargets);
    store.dispatch({ type: "add-payroll-plan", plan: payroll() });
    store.dispatch({ type: "add-take-home-plan", plan: directPlan });

    const linked = store.getState();
    expect(linked.takeHomeCompensationBindings).toEqual([
      {
        takeHomePlanId: directPlan.id,
        payrollPlanId: "payroll-self-2026",
        active: true,
      },
    ]);
    const savedPlan = required(
      linked.takeHomePlans[0],
      "take-home plan is missing",
    );
    const takeHome = calculateTakeHomeFromState(
      linked,
      savedPlan,
      required(linked.members[0], "member is missing"),
      "2026-08-21",
    );
    expect(takeHome.status, takeHome.warnings.join(" ")).toBe("complete");
    expect(takeHome.annualGrossYen).toBe(
      calculatePayroll(required(linked.payrollPlans[0], "payroll missing"))
        .annualGrossYen,
    );
    const budget = calculateBudgetSummary(linked, "2026-08-21");
    expect(budget.self.incomeYen).toBe(takeHome.averageMonthlyTakeHomeYen);
    expect(budget.self.unresolvedIncome).toBe(false);
    const funding = selectInvestmentFundingContext(linked, "2026-08-21");
    expect(funding.household).toMatchObject({
      status: "available",
      availableYen: budget.householdRemainingYen,
      totalContributionYen: 0,
      remainingAfterInvestmentYen: budget.householdRemainingYen,
    });
    expect(savedPlan.mode).toBe("calculated");
    if (savedPlan.mode !== "calculated") return;
    expect(savedPlan.compensation).toEqual(directBytes);
    expect(linked.incomeTargets).toEqual(manualIncomeBytes);
    expect(repository.load()).toEqual(linked);

    store.dispatch({
      type: "set-take-home-compensation-binding",
      takeHomePlanId: directPlan.id,
      payrollPlanId: null,
    });
    const direct = store.getState();
    expect(
      resolveEffectiveTakeHomePlan(
        direct,
        required(direct.takeHomePlans[0], "direct plan is missing"),
      ).status,
    ).toBe("direct");
    expect(required(direct.takeHomePlans[0], "direct plan is missing")).toEqual(
      savedPlan,
    );
    store.dispatch({
      type: "set-take-home-compensation-binding",
      takeHomePlanId: directPlan.id,
      payrollPlanId: "payroll-self-2026",
    });
    expect(
      resolveEffectiveTakeHomePlan(
        store.getState(),
        required(store.getState().takeHomePlans[0], "linked plan is missing"),
      ).status,
    ).toBe("payroll-linked");
  });

  it("does not guess an automatic payroll source for zero or multiple matches", () => {
    const plan = completeTakeHomePlan();
    const withoutPayroll = new Store(createInitialState());
    withoutPayroll.dispatch({ type: "add-take-home-plan", plan });
    expect(withoutPayroll.getState().takeHomeCompensationBindings).toEqual([]);

    const ambiguous = createInitialState();
    ambiguous.payrollPlans = [payroll(), payroll({ id: "payroll-other" })];
    const reduced = reduceState(ambiguous, {
      type: "add-take-home-plan",
      plan,
    });
    expect(reduced.takeHomePlans).toHaveLength(1);
    expect(reduced.takeHomeCompensationBindings).toEqual([]);
  });

  it("publishes no partial plan or automatic binding on persistence failure", () => {
    const state = createInitialState();
    state.payrollPlans = [payroll()];
    let writes = 0;
    let published = 0;
    const store = new Store(state, {
      save: () => {
        writes += 1;
        throw new Error("quota");
      },
    });
    store.subscribe(() => {
      published += 1;
    });
    expect(() =>
      store.dispatch({
        type: "add-take-home-plan",
        plan: completeTakeHomePlan(),
      }),
    ).toThrow("quota");
    expect(writes).toBe(1);
    expect(published).toBe(0);
    expect(store.getState().takeHomePlans).toEqual([]);
    expect(store.getState().takeHomeCompensationBindings).toEqual([]);
  });

  it("preserves direct mode and builds the exact transient monthly contract", () => {
    const directState = createInitialState();
    const plan = completeTakeHomePlan();
    directState.takeHomePlans = [plan];
    const member = directState.members[0];
    if (!member) throw new Error("member fixture is missing");
    const before = structuredClone(plan);
    const directMonthly = calculateTakeHomeFromState(
      directState,
      plan,
      member,
      "2026-08-21",
    );
    expect(directMonthly).toEqual(calculateTakeHome(plan, member));
    const annualPlan = structuredClone(plan);
    annualPlan.inputMode = "annual";
    annualPlan.compensation.annualTaxableSalaryYen = 4_000_000;
    expect(
      calculateTakeHomeFromState(directState, annualPlan, member, "2026-08-21"),
    ).toEqual(calculateTakeHome(annualPlan, member));

    const state = workflowState();
    const resolved = resolveEffectiveTakeHomePlan(
      state,
      required(state.takeHomePlans[0], "take-home plan is missing"),
    );
    expect(resolved.status).toBe("payroll-linked");
    if (resolved.status !== "payroll-linked") return;
    const result = calculatePayroll(
      required(state.payrollPlans[0], "payroll plan is missing"),
    );
    expect(resolved.plan).toMatchObject({
      inputMode: "monthly",
      compensation: {
        monthlyTaxableSalaryYen: result.monthlyTaxableSalaryYen,
        monthlyNonTaxableCommutingYen: result.monthlyNonTaxableCommutingYen,
        annualTaxableSalaryYen: result.annualTaxableSalaryYen,
        annualNonTaxableCommutingYen: result.annualNonTaxableCommutingYen,
        annualOtherTaxableSalaryYen: 0,
        bonuses: [],
        monthlyEmploymentInsuranceWagesYen: null,
        employmentInsuranceWageOverrideYen: null,
      },
    });
    expect(plan).toEqual(before);
  });

  it("masks stale direct compensation and counts payroll bonus exactly once", () => {
    const state = workflowState();
    const payrollPlan = required(
      state.payrollPlans[0],
      "payroll plan is missing",
    );
    payrollPlan.bonuses = [
      {
        id: "bonus",
        paymentDate: "2026-06-30",
        grossYen: 500_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ];
    const takeHomePlan = required(
      state.takeHomePlans[0],
      "take-home plan is missing",
    );
    if (takeHomePlan.mode !== "calculated")
      throw new Error("calculated take-home plan is required");
    takeHomePlan.compensation.monthlyTaxableSalaryYen = 9_000_000;
    takeHomePlan.compensation.annualOtherTaxableSalaryYen = 8_000_000;
    takeHomePlan.compensation.bonuses = [
      {
        id: "stale",
        paymentDate: "2026-01-01",
        grossYen: 7_000_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ];
    const result = calculateTakeHomeFromState(
      state,
      takeHomePlan,
      required(state.members[0], "member is missing"),
      "2026-08-21",
    );
    expect(result.status, result.warnings.join(" ")).toBe("complete");
    expect(result.annualGrossYen).toBe(
      calculatePayroll(payrollPlan).annualGrossYen,
    );
  });

  it("applies a linked iDeCo deduction after resolving payroll compensation", () => {
    const state = workflowState();
    required(state.members[0], "member is missing").birthDate = "1990-01-01";
    const takeHomePlan = required(
      state.takeHomePlans[0],
      "take-home plan is missing",
    );
    if (takeHomePlan.mode !== "calculated")
      throw new Error("calculated take-home plan is required");
    takeHomePlan.deductions.annualIdecoContributionYen = 123_456;
    takeHomePlan.deductions.idecoContributionMode = "linked";
    takeHomePlan.deductions.linkedIdecoPlanId = "ideco-self";
    state.investmentScenarios = [investmentScenario()];
    state.idecoPlans = [linkedIdecoPlan()];
    validateAppState(state);

    const before = structuredClone(takeHomePlan);
    const result = calculateTakeHomeFromState(
      state,
      takeHomePlan,
      required(state.members[0], "member is missing"),
      "2026-08-21",
    );
    expect(result.status, result.warnings.join(" ")).toBe("complete");
    expect(result.annualGrossYen).toBe(
      calculatePayroll(required(state.payrollPlans[0], "payroll missing"))
        .annualGrossYen,
    );
    expect(result.incomeTaxBenefitFromIdecoYen).toBeGreaterThan(0);
    expect(takeHomePlan.deductions.annualIdecoContributionYen).toBe(123_456);
    expect(takeHomePlan).toEqual(before);
  });

  it("fails closed for inactive, wrong-year or ambiguous payroll sources", () => {
    const state = workflowState();
    const payrollPlan = required(
      state.payrollPlans[0],
      "payroll plan is missing",
    );
    payrollPlan.active = false;
    const member = required(state.members[0], "member is missing");
    expect(
      calculateTakeHomeFromState(
        state,
        required(state.takeHomePlans[0], "take-home plan is missing"),
        member,
        "2026-08-21",
      ).status,
    ).toBe("incomplete");
    payrollPlan.active = true;
    state.payrollPlans.push(payroll({ id: "ambiguous" }));
    expect(
      calculateTakeHomeFromState(
        state,
        required(state.takeHomePlans[0], "take-home plan is missing"),
        member,
        "2026-08-21",
      ).status,
    ).toBe("incomplete");
  });

  it("rejects multiple active bindings for one calculated take-home", () => {
    const state = workflowState();
    state.takeHomeCompensationBindings.push({
      takeHomePlanId: "take-home-self-2026",
      payrollPlanId: "payroll-self-2026",
      active: true,
    });
    expect(() => validateAppState(state)).toThrow("one active compensation");
  });
});

describe("TASK-016 budget policy and funding context", () => {
  it("auto-resolves the unique complete target-year take-home", () => {
    const state = workflowState();
    state.budgetIncomePolicies = [
      { targetId: "budget-income-self", mode: "auto-take-home" },
    ];
    const summary = calculateBudgetSummary(state, "2026-08-21");
    expect(summary.self.incomeYen).not.toBeNull();
    expect(summary.self.unresolvedIncome).toBe(false);
    expect(calculateBudgetSummary(state, "2027-08-21").self).toMatchObject({
      incomeYen: null,
      unresolvedIncome: true,
    });
  });

  it("rejects duplicate, conflicting, orphan and invalid policies", () => {
    const base = createFixtureState();
    const invalid = (policies: unknown[]) =>
      parseAppState({ ...base, budgetIncomePolicies: policies });
    expect(() =>
      invalid([
        { targetId: "budget-income-self", mode: "legacy" },
        { targetId: "budget-income-self", mode: "legacy" },
      ]),
    ).toThrow("unique");
    expect(() =>
      invalid([
        { targetId: "budget-income-self", mode: "legacy" },
        { targetId: "budget-income-self", mode: "auto-take-home" },
      ]),
    ).toThrow("unique");
    expect(() => invalid([{ targetId: "missing", mode: "legacy" }])).toThrow(
      "missing",
    );
    expect(() =>
      invalid([{ targetId: "budget-income-self", mode: "automatic" }]),
    ).toThrow("mode");
  });

  it("switches policy atomically, preserves legacy bytes and is idempotent", () => {
    const state = createFixtureState();
    const beforeTargets = structuredClone(state.incomeTargets);
    const beforeLinks = structuredClone(state.links);
    let published = 0;
    const store = new Store(
      state,
      {
        save: () => {
          throw new Error("quota");
        },
      },
      () => "2026-08-21T00:00:00.000Z",
    );
    store.subscribe(() => {
      published += 1;
    });
    expect(() =>
      store.dispatch({
        type: "set-budget-income-policy",
        targetId: "budget-income-self",
        mode: "auto-take-home",
      }),
    ).toThrow("quota");
    expect(published).toBe(0);
    expect(store.getState().budgetIncomePolicies).toEqual([]);

    const memory = new MemoryStorage();
    const repository = new StorageRepository(memory);
    const writable = new Store(state, repository);
    const action = {
      type: "set-budget-income-policy" as const,
      targetId: "budget-income-self",
      mode: "auto-take-home" as const,
    };
    writable.dispatch(action);
    const once = structuredClone(writable.getState());
    writable.dispatch(action);
    expect(writable.getState().budgetIncomePolicies).toEqual(
      once.budgetIncomePolicies,
    );
    expect(writable.getState().incomeTargets).toEqual(beforeTargets);
    expect(writable.getState().links).toEqual(beforeLinks);

    writable.dispatch({
      type: "set-budget-income-policy",
      targetId: "budget-income-self",
      mode: "legacy",
    });
    expect(writable.getState().incomeTargets).toEqual(beforeTargets);
    expect(writable.getState().links).toEqual(beforeLinks);
    writable.dispatch(action);
    expect(writable.getState().incomeTargets).toEqual(beforeTargets);
    expect(writable.getState().links).toEqual(beforeLinks);
    expect(repository.load()).toEqual(writable.getState());
  });

  it("keeps the current funding selector isolated from future projection evaluators", () => {
    expect(investmentFundingSource).not.toMatch(
      /calculateNisaPlan|calculateIdecoPlan/u,
    );
    expect(investmentFundingSource).toContain("nisaContributionForMonth");
    expect(investmentFundingSource).toContain("idecoContributionForMonth");
  });

  it("reports oversubscription and propagates unavailable contributions without mutation", () => {
    const state = createInitialState();
    state.budgetIncomePolicies = state.budgetIncomePolicies.map((policy) => ({
      ...policy,
      mode: "legacy",
    }));
    required(state.incomeTargets[0], "income target is missing").manualYen =
      100;
    state.nisaPlans = [
      {
        id: "nisa",
        memberId: "member-self",
        japanResidentConfirmed: true,
        startMonth: "2026-01",
        targetMonth: "2026-12",
        currentBalanceYen: 0,
        currentBookValueYen: 0,
        usedLimitYen: 0,
        usedGrowthLimitYen: 0,
        monthlyTsumitateYen: 200,
        monthlyGrowthYen: 0,
        additionalPurchases: [],
        contributionTiming: "end",
        activeScenarioId: "unused",
        active: true,
      },
    ];
    const before = JSON.stringify(state.nisaPlans);
    const funding = selectInvestmentFundingContext(state, "2026-08-21");
    expect(funding.household).toMatchObject({
      availableYen: 100,
      totalContributionYen: 200,
      remainingAfterInvestmentYen: -100,
      oversubscribed: true,
      shortfallYen: 100,
    });
    expect(JSON.stringify(state.nisaPlans)).toBe(before);
    required(state.nisaPlans[0], "NISA plan is missing").monthlyTsumitateYen =
      null;
    expect(
      selectInvestmentFundingContext(state, "2026-08-21").household.status,
    ).toBe("unavailable");
  });
});

describe("TASK-016 schema and routes", () => {
  it("migrates frozen v7 losslessly, maps life-plan and adds only empty v8 arrays", () => {
    const current = createFixtureState();
    const direct = completeTakeHomePlan();
    direct.id = "direct-self-2026";
    direct.memberId = "self";
    current.takeHomePlans.push(direct);
    const directBefore = calculateTakeHomeFromState(
      current,
      direct,
      required(
        current.members.find((member) => member.id === "self"),
        "self member is missing",
      ),
      "2026-08-21",
    );
    const budgetBefore = calculateBudgetSummary(current, "2026-08-21");
    const v7 = structuredClone(current) as unknown as Record<string, unknown>;
    v7.schemaVersion = 7;
    v7.activeRoute = "life-plan";
    Reflect.deleteProperty(v7, "payrollPlans");
    Reflect.deleteProperty(v7, "takeHomeCompensationBindings");
    Reflect.deleteProperty(v7, "budgetIncomePolicies");
    const before = JSON.stringify(v7);
    const migrated = migrateToCurrentState(v7);
    expect(JSON.stringify(v7)).toBe(before);
    expect(migrated).toMatchObject({
      schemaVersion: 8,
      activeRoute: "overview",
      payrollPlans: [],
      takeHomeCompensationBindings: [],
      budgetIncomePolicies: [],
    });
    expect(
      calculateTakeHomeFromState(
        migrated,
        required(
          migrated.takeHomePlans.find((plan) => plan.id === direct.id),
          "migrated direct plan is missing",
        ),
        required(
          migrated.members.find((member) => member.id === "self"),
          "migrated self member is missing",
        ),
        "2026-08-21",
      ),
    ).toEqual(directBefore);
    expect(calculateBudgetSummary(migrated, "2026-08-21")).toEqual(
      budgetBefore,
    );
  });

  it("requires all v8 arrays and exposes the exact six canonical routes", () => {
    const state = createFixtureState();
    const missing = structuredClone(state) as unknown as Record<
      string,
      unknown
    >;
    Reflect.deleteProperty(missing, "payrollPlans");
    expect(() => parseAppState(missing)).toThrow("payrollPlans");
    expect(routeIds).toEqual([
      "overview",
      "payroll",
      "take-home",
      "budget",
      "investments",
      "settings",
    ]);
    expect(routeFromHash("#/life-plan")).toBe("overview");
  });
});
