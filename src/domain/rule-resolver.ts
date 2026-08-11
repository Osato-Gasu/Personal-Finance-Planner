export interface EffectiveRule<TContext, TValue> {
  id: string;
  domain: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  matches?: (context: TContext) => boolean;
  value: TValue;
}

export type RuleResolution<TValue> =
  | { status: "missing-rule"; domain: string; targetDate: string }
  | { status: "selected"; ruleId: string; value: TValue }
  | { status: "overlapping-rule"; ruleIds: string[] };

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, field: string): void {
  if (
    !isoDatePattern.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  ) {
    throw new Error(`${field} must be an ISO date`);
  }
}

export class RuleResolver<TContext, TValue> {
  readonly #rules: readonly EffectiveRule<TContext, TValue>[];

  constructor(rules: readonly EffectiveRule<TContext, TValue>[]) {
    const ids = new Set<string>();
    for (const rule of rules) {
      if (!rule.id || ids.has(rule.id))
        throw new Error("rule IDs must be unique");
      ids.add(rule.id);
      assertIsoDate(rule.effectiveFrom, "effectiveFrom");
      if (rule.effectiveTo !== null) {
        assertIsoDate(rule.effectiveTo, "effectiveTo");
        if (rule.effectiveFrom > rule.effectiveTo) {
          throw new Error("effectiveFrom must not be after effectiveTo");
        }
      }
    }
    this.#rules = [...rules];
  }

  resolve(
    domain: string,
    targetDate: string,
    context: TContext,
  ): RuleResolution<TValue> {
    assertIsoDate(targetDate, "targetDate");
    const matches = this.#rules.filter(
      (rule) =>
        rule.domain === domain &&
        rule.effectiveFrom <= targetDate &&
        (rule.effectiveTo === null || targetDate <= rule.effectiveTo) &&
        (rule.matches?.(context) ?? true),
    );
    if (matches.length === 0)
      return { status: "missing-rule", domain, targetDate };
    if (matches.length > 1) {
      return {
        status: "overlapping-rule",
        ruleIds: matches.map((rule) => rule.id).sort(),
      };
    }
    const selected = matches[0];
    if (!selected) throw new Error("selected rule is unexpectedly missing");
    return { status: "selected", ruleId: selected.id, value: selected.value };
  }
}
