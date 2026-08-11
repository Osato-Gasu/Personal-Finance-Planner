import type {
  FixturePipelineRule,
  PipelineContext,
} from "../../src/domain/calculation-pipeline";
import type { EffectiveRule } from "../../src/domain/rule-resolver";

export interface FixtureRuleValue {
  fixtureOnly: true;
}

export const boundaryRules: readonly EffectiveRule<
  Record<string, never>,
  string
>[] = [
  {
    id: "fixture-period",
    domain: "fixture-domain",
    effectiveFrom: "2030-04-01",
    effectiveTo: "2031-03-31",
    value: "fixture-value",
  },
];

export const pipelineRules: readonly FixturePipelineRule<FixtureRuleValue>[] = [
  {
    id: "fixture-take-home-rule",
    domain: "fixture-take-home",
    effectiveFrom: "2030-01-01",
    effectiveTo: "2030-12-31",
    matches: (context: PipelineContext) => context.memberId.length > 0,
    value: { fixtureOnly: true },
  },
];
