import {
  SCHEMA_VERSION,
  type AppState,
  type LegacyAppState,
} from "../../src/domain/state";

export function createLegacyFixtureState(): LegacyAppState {
  return {
    schemaVersion: 1,
    activeRoute: "overview",
    members: [
      { id: "self", role: "self", displayName: "本人", active: true },
      { id: "partner", role: "partner", displayName: "相手", active: true },
    ],
    takeHomeInputs: [
      {
        id: "take-home-self",
        memberId: "self",
        fixtureMonthlyTakeHomeYen: 300_000,
      },
      {
        id: "take-home-partner",
        memberId: "partner",
        fixtureMonthlyTakeHomeYen: 250_000,
      },
    ],
    incomeTargets: [
      { id: "budget-income-self", memberId: "self", manualYen: 100_000 },
      { id: "budget-income-partner", memberId: "partner", manualYen: 90_000 },
    ],
    links: [
      {
        id: "link-self",
        targetId: "budget-income-self",
        sourceType: "take-home-result",
        sourceId: "take-home-self",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
    ],
    livingExpenses: [
      {
        id: "legacy-living-self",
        memberId: "self",
        kind: "living-expense",
        amountYen: 12_345,
      },
    ],
    contributionSources: [],
  };
}

export function createFixtureState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeRoute: "overview",
    members: [
      { id: "self", role: "self", displayName: "本人", active: true },
      { id: "partner", role: "partner", displayName: "相手", active: true },
    ],
    payrollPlans: [],
    takeHomePlans: [
      {
        id: "take-home-self",
        memberId: "self",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 300_000,
        active: true,
      },
      {
        id: "take-home-partner",
        memberId: "partner",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 250_000,
        active: true,
      },
    ],
    takeHomeCompensationBindings: [],
    incomeTargets: [
      { id: "budget-income-self", memberId: "self", manualYen: 100_000 },
      { id: "budget-income-partner", memberId: "partner", manualYen: 90_000 },
    ],
    budgetIncomePolicies: [],
    links: [
      {
        id: "link-self",
        targetId: "budget-income-self",
        sourceType: "take-home-result",
        sourceId: "take-home-self",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
    ],
    budget: {
      mode: "detailed",
      globalSelfShareBasisPoints: 5000,
      simpleMonthlyExpenseYen: 0,
      categories: [
        {
          id: "category-base",
          name: "基本生活費",
          description: "fixture",
          shareMode: "inherit",
          sortOrder: 0,
          active: true,
        },
      ],
      items: [
        {
          id: "living-self",
          categoryId: "category-base",
          purpose: "本人生活費",
          kind: "living-expense",
          scope: "self",
          amountYen: 120_000,
          cycleValue: 1,
          cycleUnit: "month",
          occurrencesPerCycle: 1,
          shareMode: "inherit",
          source: { type: "manual" },
          memo: "",
          active: true,
        },
        {
          id: "living-partner",
          categoryId: "category-base",
          purpose: "相手生活費",
          kind: "living-expense",
          scope: "partner",
          amountYen: 80_000,
          cycleValue: 1,
          cycleUnit: "month",
          occurrencesPerCycle: 1,
          shareMode: "inherit",
          source: { type: "manual" },
          memo: "",
          active: true,
        },
      ],
    },
    contributionSources: [
      {
        id: "nisa-self",
        memberId: "self",
        kind: "asset-contribution",
        sourceType: "nisa-fixture",
        sourceId: "plan-self",
        amountYen: 30_000,
        active: true,
      },
      {
        id: "ideco-self",
        memberId: "self",
        kind: "asset-contribution",
        sourceType: "ideco-fixture",
        sourceId: "plan-self",
        amountYen: 20_000,
        active: true,
      },
      {
        id: "nisa-partner",
        memberId: "partner",
        kind: "asset-contribution",
        sourceType: "nisa-fixture",
        sourceId: "plan-partner",
        amountYen: 10_000,
        active: true,
      },
    ],
    nisaPlans: [],
    investmentScenarios: [],
    idecoPlans: [],
    backup: {
      lastSuccessfulSaveAt: null,
      lastExportedAt: null,
      reminderIntervalDays: 30,
      reminderDismissedUntil: null,
    },
    lifePlan: {
      baseReferenceDate: null,
      projectionStartYear: null,
      startingLiquidAssetsYen: 0,
      projectionYears: 30,
      events: [],
    },
  };
}
