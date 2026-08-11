export type RuleDomain =
  | "salary-income-deduction"
  | "basic-deduction"
  | "taxable-income-rounding"
  | "national-income-tax-brackets"
  | "reconstruction-special-income-tax"
  | "social-insurance-income-deduction"
  | "ideco-income-deduction"
  | "health-insurance"
  | "care-insurance"
  | "care-insurance-eligibility"
  | "additional-insurance"
  | "pension"
  | "employment-insurance"
  | "standard-remuneration"
  | "standard-bonus";

export type EffectiveBasis =
  | "tax-year"
  | "salary-month"
  | "payment-date"
  | "bonus-payment-date"
  | "assessment-year";

export interface RuleMetadata {
  id: string;
  domain: RuleDomain;
  jurisdiction: "JP";
  contextKey: string;
  effectiveFrom: string;
  effectiveTo: string;
  effectiveBasis: EffectiveBasis;
  status: "current" | "scheduled" | "retired";
  publishedAt: string;
  verifiedAt: string;
  verifiedBy: "Codex";
  sourceTitle: string;
  sourceUrls: readonly string[];
  sourcePublisher:
    "国税庁" | "厚生労働省" | "日本年金機構" | "全国健康保険協会";
  sourceRetrievedAt: string;
  notes: string;
}

export interface RuleRecord<T> {
  metadata: RuleMetadata;
  value: T;
}

export const OFFICIAL_SOURCE_PUBLISHERS = [
  "国税庁",
  "厚生労働省",
  "日本年金機構",
  "全国健康保険協会",
] as const;

export const RULE_VERIFIED_AT = "2026-08-12";

export function metadata(
  value: Omit<
    RuleMetadata,
    "jurisdiction" | "verifiedAt" | "verifiedBy" | "sourceRetrievedAt"
  >,
): RuleMetadata {
  return {
    ...value,
    jurisdiction: "JP",
    verifiedAt: RULE_VERIFIED_AT,
    verifiedBy: "Codex",
    sourceRetrievedAt: RULE_VERIFIED_AT,
  };
}
