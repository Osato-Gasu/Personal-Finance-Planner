import { SCHEMA_VERSION, type AppState } from "../../src/domain/state";

export function createFixtureState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
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
        id: "living-self",
        memberId: "self",
        kind: "living-expense",
        amountYen: 120_000,
      },
      {
        id: "living-partner",
        memberId: "partner",
        kind: "living-expense",
        amountYen: 80_000,
      },
    ],
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
  };
}
