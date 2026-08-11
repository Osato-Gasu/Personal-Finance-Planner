import { describe, expect, it } from "vitest";
import { Store } from "../src/app/store";
import { runCalculationPipeline } from "../src/domain/calculation-pipeline";
import {
  deriveAssetContributions,
  sumAssetContributions,
  sumLivingExpenses,
} from "../src/domain/contributions";
import { resolveIncomeTarget } from "../src/domain/linked-value";
import { RuleResolver } from "../src/domain/rule-resolver";
import { validateAppState } from "../src/domain/state";
import { pipelineRules, type FixtureRuleValue } from "./fixtures/rules";
import { createFixtureState } from "./fixtures/state";

describe("linked values", () => {
  it("recalculates from the canonical source without a stale target copy", () => {
    const store = new Store(createFixtureState());
    expect(
      resolveIncomeTarget(store.getState(), "budget-income-self"),
    ).toMatchObject({
      status: "selected",
      valueYen: 300_000,
    });
    store.dispatch({
      type: "update-take-home",
      sourceId: "take-home-self",
      amountYen: 320_000,
    });
    expect(
      resolveIncomeTarget(store.getState(), "budget-income-self"),
    ).toMatchObject({
      status: "selected",
      valueYen: 320_000,
    });
    expect(store.getState().incomeTargets[0]).not.toHaveProperty(
      "linkedValueYen",
    );
  });

  it("reports a broken link instead of converting it to zero", () => {
    const state = createFixtureState();
    const link = state.links[0];
    if (!link) throw new Error("fixture link is missing");
    link.sourceId = "missing-source";
    expect(resolveIncomeTarget(state, "budget-income-self")).toEqual({
      status: "broken-link",
      warning: "broken-link:take-home-result:missing-source",
      sourceId: "missing-source",
    });
  });

  it("requires an explicit manual value when unlinking", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "unlink-income",
      targetId: "budget-income-self",
      manualYen: 300_000,
    });
    store.dispatch({
      type: "update-take-home",
      sourceId: "take-home-self",
      amountYen: 350_000,
    });
    expect(resolveIncomeTarget(store.getState(), "budget-income-self")).toEqual(
      {
        status: "manual",
        valueYen: 300_000,
      },
    );
  });

  it("rejects duplicate active links to one target", () => {
    const state = createFixtureState();
    state.links.push({
      id: "duplicate-link",
      targetId: "budget-income-self",
      sourceType: "take-home-result",
      sourceId: "take-home-self",
      field: "averageMonthlyTakeHomeYen",
      active: true,
    });
    expect(() => validateAppState(state)).toThrow("only one active link");
  });
});

describe("contribution separation and calculation pipeline", () => {
  it("keeps living expenses and asset contributions in separate totals", () => {
    const state = createFixtureState();
    expect(sumLivingExpenses(state, "self")).toBe(120_000);
    expect(sumAssetContributions(state, "self")).toBe(50_000);
    expect(deriveAssetContributions(state).map((item) => item.id)).toEqual([
      "nisa-self",
      "ideco-self",
      "nisa-partner",
    ]);
  });

  it("does not mix member sources", () => {
    const state = createFixtureState();
    expect(
      deriveAssetContributions(state, "self").map((item) => item.id),
    ).toEqual(["nisa-self", "ideco-self"]);
    expect(
      deriveAssetContributions(state, "partner").map((item) => item.id),
    ).toEqual(["nisa-partner"]);
  });

  it("rejects duplicate active contribution source identity", () => {
    const state = createFixtureState();
    state.contributionSources.push({
      id: "duplicate-nisa",
      memberId: "self",
      kind: "asset-contribution",
      sourceType: "nisa-fixture",
      sourceId: "plan-self",
      amountYen: 30_000,
      active: true,
    });
    expect(() => validateAppState(state)).toThrow(
      "active contribution source must be unique",
    );
  });

  it("runs the fixture pipeline in the required order", () => {
    const state = createFixtureState();
    const resolver = new RuleResolver(pipelineRules);
    const result = runCalculationPipeline<FixtureRuleValue>({
      state,
      memberId: "self",
      targetDate: "2030-06-01",
      resolver,
      provider: {
        calculate: (input, rule) => {
          expect(rule.fixtureOnly).toBe(true);
          return {
            takeHomeYen: input.fixtureMonthlyTakeHomeYen,
            warnings: ["fixture-only"],
          };
        },
      },
    });
    expect(result).toMatchObject({
      takeHomeYen: 300_000,
      livingExpenseYen: 120_000,
      assetContributionYen: 50_000,
      afterLivingYen: 180_000,
      afterInvestmentYen: 130_000,
      warnings: ["fixture-only"],
    });
    expect(result.steps).toEqual([
      "resolve-member",
      "resolve-rule",
      "resolve-take-home",
      "sum-living-expenses",
      "sum-asset-contributions",
      "present-take-home",
      "calculate-after-living",
      "calculate-after-investment",
      "collect-warnings",
    ]);
  });
});
