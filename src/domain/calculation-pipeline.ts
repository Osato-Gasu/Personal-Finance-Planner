import { sumAssetContributions, sumLivingExpenses } from "./contributions";
import type { EffectiveRule, RuleResolver } from "./rule-resolver";
import type { AppState, HouseholdMember, TakeHomeInput } from "./state";

export interface PipelineContext {
  memberId: string;
}

export interface FixtureTakeHomeProvider<TRuleValue> {
  calculate(
    input: Readonly<TakeHomeInput>,
    rule: Readonly<TRuleValue>,
  ): {
    takeHomeYen: number;
    warnings: string[];
  };
}

export interface PipelineResult {
  member: Readonly<HouseholdMember>;
  ruleId: string | null;
  takeHomeYen: number | null;
  livingExpenseYen: number;
  assetContributionYen: number;
  afterLivingYen: number | null;
  afterInvestmentYen: number | null;
  warnings: string[];
  steps: readonly string[];
}

export function runCalculationPipeline<TRuleValue>(options: {
  state: Readonly<AppState>;
  memberId: string;
  targetDate: string;
  resolver: RuleResolver<PipelineContext, TRuleValue>;
  provider: FixtureTakeHomeProvider<TRuleValue>;
}): PipelineResult {
  const steps: string[] = [];
  const member = options.state.members.find(
    (candidate) => candidate.id === options.memberId && candidate.active,
  );
  steps.push("resolve-member");
  if (!member) throw new Error("active member is missing");

  const resolution = options.resolver.resolve(
    "fixture-take-home",
    options.targetDate,
    {
      memberId: member.id,
    },
  );
  steps.push("resolve-rule");
  if (resolution.status !== "selected") {
    return {
      member,
      ruleId: null,
      takeHomeYen: null,
      livingExpenseYen: 0,
      assetContributionYen: 0,
      afterLivingYen: null,
      afterInvestmentYen: null,
      warnings: [resolution.status],
      steps,
    };
  }

  const input = options.state.takeHomeInputs.find(
    (candidate) => candidate.memberId === member.id,
  );
  if (!input) throw new Error("fixture take-home input is missing");
  const takeHome = options.provider.calculate(input, resolution.value);
  steps.push("resolve-take-home");
  const livingExpenseYen = sumLivingExpenses(options.state, member.id);
  steps.push("sum-living-expenses");
  const assetContributionYen = sumAssetContributions(options.state, member.id);
  steps.push("sum-asset-contributions");
  steps.push("present-take-home");
  const afterLivingYen = takeHome.takeHomeYen - livingExpenseYen;
  steps.push("calculate-after-living");
  const afterInvestmentYen = afterLivingYen - assetContributionYen;
  steps.push("calculate-after-investment");
  steps.push("collect-warnings");
  return {
    member,
    ruleId: resolution.ruleId,
    takeHomeYen: takeHome.takeHomeYen,
    livingExpenseYen,
    assetContributionYen,
    afterLivingYen,
    afterInvestmentYen,
    warnings: [...takeHome.warnings],
    steps,
  };
}

export type FixturePipelineRule<TValue> = EffectiveRule<
  PipelineContext,
  TValue
>;
