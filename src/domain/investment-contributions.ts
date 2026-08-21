import type { IdecoPlan } from "./ideco";
import type { NisaPlan } from "./nisa";
import type { HouseholdMember } from "./state";

export interface MonthlyInvestmentContribution {
  amountYen: number | null;
  period: "in-period" | "before-start" | "after-end" | "unresolved";
}

function isYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function checkedNullableSum(values: readonly (number | null)[]): number | null {
  let total = 0;
  for (const value of values) {
    if (value === null || !Number.isSafeInteger(value) || value < 0)
      return null;
    if (value > Number.MAX_SAFE_INTEGER - total) return null;
    total += value;
  }
  return total;
}

export function nisaContributionForMonth(
  plan: Readonly<NisaPlan>,
  month: string,
): MonthlyInvestmentContribution {
  if (
    !isYearMonth(month) ||
    !isYearMonth(plan.startMonth) ||
    !isYearMonth(plan.targetMonth) ||
    plan.startMonth > plan.targetMonth
  )
    return { amountYen: null, period: "unresolved" };
  if (month < plan.startMonth) return { amountYen: 0, period: "before-start" };
  if (month > plan.targetMonth) return { amountYen: 0, period: "after-end" };
  return {
    amountYen: checkedNullableSum([
      plan.monthlyTsumitateYen,
      plan.monthlyGrowthYen,
      ...plan.additionalPurchases
        .filter((purchase) => purchase.month === month)
        .map((purchase) => purchase.amountYen),
    ]),
    period: "in-period",
  };
}

export function resolveIdecoTargetMonth(
  plan: Readonly<IdecoPlan>,
  member: Readonly<HouseholdMember>,
): string | null {
  if (plan.projectionTarget.type === "month")
    return isYearMonth(plan.projectionTarget.month)
      ? plan.projectionTarget.month
      : null;
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(member.birthDate ?? "");
  if (!birth) return null;
  const year = Number(birth[1]) + plan.projectionTarget.age;
  if (!Number.isSafeInteger(year) || year < 1 || year > 9999) return null;
  const target = `${String(year).padStart(4, "0")}-${birth[2] ?? ""}`;
  return isYearMonth(target) ? target : null;
}

export function idecoContributionForMonth(
  plan: Readonly<IdecoPlan>,
  member: Readonly<HouseholdMember>,
  month: string,
): MonthlyInvestmentContribution {
  if (!isYearMonth(month) || plan.annualUnitContributionActive !== false)
    return { amountYen: null, period: "unresolved" };
  const target = resolveIdecoTargetMonth(plan, member);
  if (target === null || !isYearMonth(plan.startMonth))
    return { amountYen: null, period: "unresolved" };
  if (month < plan.startMonth) return { amountYen: 0, period: "before-start" };
  if (month > target) return { amountYen: 0, period: "after-end" };
  const amount = plan.monthlyContributionYen;
  return {
    amountYen:
      amount !== null && Number.isSafeInteger(amount) && amount >= 0
        ? amount
        : null,
    period: "in-period",
  };
}
