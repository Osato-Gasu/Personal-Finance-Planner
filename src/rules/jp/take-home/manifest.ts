import { incomeTaxRules2026 } from "./income-tax/rules-2026";
import {
  additionalInsuranceRules2026,
  careInsuranceRules2026,
  employmentInsuranceRules2026,
  healthInsuranceRules2026,
  healthStandardRemunerationTable,
  pensionRule2026,
  pensionStandardRemunerationTable,
  prefectures,
  socialInsuranceRules2026,
  standardBonusRule2026,
} from "./social-insurance/rules-2026";
import type { RuleRecord } from "./metadata";

export const takeHomeRulePackage2026 = {
  id: "jp-take-home-2026-v1",
  targetYear: 2026 as const,
  incomeTaxRules: incomeTaxRules2026,
  healthInsuranceRules: healthInsuranceRules2026,
  careInsuranceRules: careInsuranceRules2026,
  additionalInsuranceRules: additionalInsuranceRules2026,
  pensionRule: pensionRule2026,
  employmentInsuranceRules: employmentInsuranceRules2026,
  healthStandardRemunerationTable,
  pensionStandardRemunerationTable,
  standardBonusRule: standardBonusRule2026,
  prefectures,
  allRules: [
    ...incomeTaxRules2026,
    ...socialInsuranceRules2026,
  ] as readonly RuleRecord<unknown>[],
} as const;

export type TakeHomeRulePackage = typeof takeHomeRulePackage2026;
