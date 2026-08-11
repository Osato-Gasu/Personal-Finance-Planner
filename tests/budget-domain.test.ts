import { describe, expect, it } from "vitest";
import {
  calculateBudgetSummary,
  effectiveSelfShareBasisPoints,
  monthlyExpenseYen,
} from "../src/domain/budget";
import { validateAppState, type ExpenseItem } from "../src/domain/state";
import { createFixtureState } from "./fixtures/state";

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function expense(overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  return {
    id: "expense",
    categoryId: "category-base",
    purpose: "費目",
    kind: "living-expense",
    scope: "shared",
    amountYen: 1_000,
    cycleValue: 1,
    cycleUnit: "month",
    occurrencesPerCycle: 1,
    shareMode: "inherit",
    source: { type: "manual" },
    memo: "",
    active: true,
    ...overrides,
  };
}

function stateWith(items: ExpenseItem[]) {
  const state = createFixtureState();
  state.budget.items = items;
  state.links = [];
  required(
    state.incomeTargets.find((target) => target.memberId === "self"),
    "self target",
  ).manualYen = 300_000;
  required(
    state.incomeTargets.find((target) => target.memberId === "partner"),
    "partner target",
  ).manualYen = 200_000;
  validateAppState(state);
  return state;
}

describe("expense normalization", () => {
  it.each([
    [4_500, 2, "month", 1, 2_250],
    [120_000, 3, "year", 1, 3_333],
    [500, 1, "week", 3, 6_522],
    [80_000, 1, "month", 1, 80_000],
  ] as const)(
    "normalizes %s yen every %s %s with %s occurrences",
    (amountYen, cycleValue, cycleUnit, occurrencesPerCycle, expected) => {
      expect(
        Math.round(
          monthlyExpenseYen(
            expense({
              amountYen,
              cycleValue,
              cycleUnit,
              occurrencesPerCycle,
            }),
          ),
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ["day", 1],
    ["week", 1],
    ["month", 12],
    ["year", 1],
  ] as const)("supports the %s boundary", (cycleUnit, cycleValue) => {
    expect(
      monthlyExpenseYen(expense({ cycleUnit, cycleValue })),
    ).toBeGreaterThan(0);
  });

  it.each([
    ["cycleValue", { cycleValue: 0 }],
    ["occurrencesPerCycle", { occurrencesPerCycle: 0 }],
    ["cycleValue", { cycleValue: 1.5 }],
    ["occurrencesPerCycle", { occurrencesPerCycle: 1.5 }],
  ] as const)("rejects invalid %s", (_field, override) => {
    expect(() => monthlyExpenseYen(expense(override))).toThrow();
  });

  it("rejects overflow", () => {
    expect(() =>
      monthlyExpenseYen(
        expense({
          amountYen: Number.MAX_SAFE_INTEGER,
          occurrencesPerCycle: Number.MAX_SAFE_INTEGER,
          cycleUnit: "day",
        }),
      ),
    ).toThrow("supported monetary range");
  });
});

describe("share allocation and budget summary", () => {
  it.each([
    [5000, 50_000, 50_000],
    [6000, 60_000, 40_000],
    [0, 0, 100_000],
    [10_000, 100_000, 0],
    [3330, 33_300, 66_700],
  ])("allocates global %s basis points", (basisPoints, self, partner) => {
    const state = stateWith([expense({ amountYen: 100_000 })]);
    state.budget.globalSelfShareBasisPoints = basisPoints;
    const summary = calculateBudgetSummary(state);
    expect(summary.self.expenseYen).toBe(self);
    expect(summary.partner.expenseYen).toBe(partner);
    expect(summary.self.expenseYen + summary.partner.expenseYen).toBe(
      summary.householdExpenseYen,
    );
  });

  it("uses item custom before category custom before global", () => {
    const state = stateWith([
      expense({
        amountYen: 100_000,
        shareMode: "custom",
        selfShareBasisPoints: 7000,
      }),
    ]);
    state.budget.globalSelfShareBasisPoints = 4000;
    const category = required(state.budget.categories[0], "category");
    category.shareMode = "custom";
    category.selfShareBasisPoints = 6000;
    expect(
      effectiveSelfShareBasisPoints(
        state,
        required(state.budget.items[0], "item"),
        category,
      ),
    ).toBe(7000);
    expect(calculateBudgetSummary(state).self.expenseYen).toBe(70_000);
    const item = required(state.budget.items[0], "item");
    item.shareMode = "inherit";
    delete item.selfShareBasisPoints;
    expect(calculateBudgetSummary(state).self.expenseYen).toBe(60_000);
    category.shareMode = "inherit";
    delete category.selfShareBasisPoints;
    expect(calculateBudgetSummary(state).self.expenseYen).toBe(40_000);
  });

  it("keeps rounded member totals equal to the household total", () => {
    const state = stateWith([
      expense({ id: "a", amountYen: 1, cycleUnit: "week" }),
      expense({ id: "b", amountYen: 1, cycleUnit: "day" }),
    ]);
    state.budget.globalSelfShareBasisPoints = 3330;
    const summary = calculateBudgetSummary(state);
    expect(summary.self.expenseYen + summary.partner.expenseYen).toBe(
      summary.householdExpenseYen,
    );
  });

  it("separates self and partner expenses", () => {
    const state = stateWith([
      expense({ id: "self", scope: "self", amountYen: 10_000 }),
      expense({ id: "partner", scope: "partner", amountYen: 20_000 }),
    ]);
    const summary = calculateBudgetSummary(state);
    expect(summary.self.expenseYen).toBe(10_000);
    expect(summary.partner.expenseYen).toBe(20_000);
  });

  it("makes self responsible for shared costs and excludes partner costs when partner is inactive", () => {
    const state = stateWith([
      expense({ id: "shared", scope: "shared", amountYen: 10_000 }),
      expense({ id: "self", scope: "self", amountYen: 20_000 }),
      expense({ id: "partner", scope: "partner", amountYen: 30_000 }),
    ]);
    required(
      state.members.find((member) => member.role === "partner"),
      "partner",
    ).active = false;
    const summary = calculateBudgetSummary(state);
    expect(summary.householdExpenseYen).toBe(30_000);
    expect(summary.self.expenseYen).toBe(30_000);
    expect(summary.partner.expenseYen).toBe(0);
    expect(summary.householdIncomeYen).toBe(300_000);
  });

  it("excludes inactive categories and items", () => {
    const state = stateWith([
      expense({ id: "active", amountYen: 10_000 }),
      expense({ id: "inactive", amountYen: 20_000, active: false }),
    ]);
    expect(calculateBudgetSummary(state).householdExpenseYen).toBe(10_000);
    required(state.budget.categories[0], "category").active = false;
    expect(calculateBudgetSummary(state).householdExpenseYen).toBe(0);
  });

  it("reports category totals", () => {
    const state = stateWith([expense({ amountYen: 100_000 })]);
    expect(calculateBudgetSummary(state).categories).toMatchObject([
      {
        categoryId: "category-base",
        householdExpenseYen: 100_000,
        selfExpenseYen: 50_000,
        partnerExpenseYen: 50_000,
        householdSharePercent: 100,
      },
    ]);
  });

  it("uses only simple input in simple mode and preserves detail data", () => {
    const state = stateWith([expense({ amountYen: 100_000 })]);
    state.budget.mode = "simple";
    state.budget.simpleMonthlyExpenseYen = 40_000;
    const summary = calculateBudgetSummary(state);
    expect(summary.householdExpenseYen).toBe(40_000);
    expect(state.budget.items).toHaveLength(1);
  });

  it("allows negative remaining and labels division by zero as uncomputed", () => {
    const state = stateWith([expense({ amountYen: 600_000 })]);
    const summary = calculateBudgetSummary(state);
    expect(summary.householdRemainingYen).toBe(-100_000);
    expect(summary.overspent).toBe(true);
    state.incomeTargets.forEach((target) => (target.manualYen = 0));
    expect(calculateBudgetSummary(state).spendingRatePercent).toBeNull();
  });

  it("keeps unresolved linked income uncomputed instead of zero", () => {
    const state = stateWith([expense({ amountYen: 100_000 })]);
    state.links.push({
      id: "broken",
      targetId: "budget-income-self",
      sourceType: "take-home-result",
      sourceId: "missing",
      field: "averageMonthlyTakeHomeYen",
      active: true,
    });
    const summary = calculateBudgetSummary(state);
    expect(summary.self.incomeYen).toBeNull();
    expect(summary.self.remainingYen).toBeNull();
    expect(summary.householdRemainingYen).toBeNull();
  });

  it("does not include contribution sources in living expenses", () => {
    const state = stateWith([expense({ amountYen: 10_000 })]);
    required(state.contributionSources[0], "contribution").amountYen = 900_000;
    expect(calculateBudgetSummary(state).householdExpenseYen).toBe(10_000);
  });
});
