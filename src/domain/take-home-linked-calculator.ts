import type { AppState, HouseholdMember } from "./state";
import type {
  CalculatedTakeHomePlan,
  TakeHomePlan,
  TakeHomeResult,
} from "./take-home-plan";
import {
  calculateTakeHome,
  createUnavailableTakeHomeResult,
} from "./take-home-calculator";
import { calculateIdecoPlan } from "./ideco";
import { calculatePayroll } from "./payroll";

export type EffectiveTakeHomePlanResolution =
  | { status: "direct"; plan: Readonly<TakeHomePlan> }
  | { status: "payroll-linked"; plan: CalculatedTakeHomePlan }
  | { status: "unavailable"; message: string };

export function resolveEffectiveTakeHomePlan(
  state: Readonly<AppState>,
  plan: Readonly<TakeHomePlan>,
): EffectiveTakeHomePlanResolution {
  if (plan.mode !== "calculated") return { status: "direct", plan };
  const bindings = state.takeHomeCompensationBindings.filter(
    (binding) => binding.active && binding.takeHomePlanId === plan.id,
  );
  if (bindings.length === 0) return { status: "direct", plan };
  if (bindings.length !== 1)
    return {
      status: "unavailable",
      message: "給与連携が複数あるため手取りを計算できません。",
    };
  const binding = bindings[0];
  const activeSources = state.payrollPlans.filter(
    (candidate) =>
      candidate.active &&
      candidate.memberId === plan.memberId &&
      candidate.targetYear === plan.targetYear,
  );
  const payroll = state.payrollPlans.find(
    (candidate) => candidate.id === binding?.payrollPlanId,
  );
  if (
    !payroll ||
    !payroll.active ||
    payroll.memberId !== plan.memberId ||
    payroll.targetYear !== plan.targetYear ||
    activeSources.length !== 1 ||
    activeSources[0]?.id !== payroll.id
  )
    return {
      status: "unavailable",
      message:
        "給与連携元が見つからないか、人物・対象年・有効な給与計画が一致しません。",
    };
  try {
    const result = calculatePayroll(payroll);
    return {
      status: "payroll-linked",
      plan: {
        ...structuredClone(plan),
        inputMode: "monthly",
        compensation: {
          annualTaxableSalaryYen: result.annualTaxableSalaryYen,
          annualNonTaxableCommutingYen: result.annualNonTaxableCommutingYen,
          monthlyTaxableSalaryYen: result.monthlyTaxableSalaryYen,
          monthlyNonTaxableCommutingYen: result.monthlyNonTaxableCommutingYen,
          annualOtherTaxableSalaryYen: 0,
          bonuses: structuredClone(payroll.bonuses),
          monthlyEmploymentInsuranceWagesYen: null,
          employmentInsuranceWageOverrideYen: null,
        },
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      message: `給与計算結果を利用できません。${
        error instanceof Error ? ` ${error.message}` : ""
      }`,
    };
  }
}

export function calculateTakeHomeFromState(
  state: Readonly<AppState>,
  plan: Readonly<TakeHomePlan>,
  member: Readonly<HouseholdMember>,
  referenceDate: string | null,
): TakeHomeResult {
  const resolved = resolveEffectiveTakeHomePlan(state, plan);
  if (resolved.status === "unavailable")
    return createUnavailableTakeHomeResult(plan, resolved.message);
  const effectivePlan = resolved.plan;
  if (
    effectivePlan.mode !== "calculated" ||
    effectivePlan.deductions.idecoContributionMode !== "linked"
  )
    return calculateTakeHome(effectivePlan, member);
  const idecoPlan = state.idecoPlans.find(
    (candidate) => candidate.id === effectivePlan.deductions.linkedIdecoPlanId,
  );
  if (!idecoPlan || idecoPlan.memberId !== effectivePlan.memberId)
    return calculateTakeHome(effectivePlan, member, {
      status: "incomplete",
      annualContributionYen: null,
      message: "連携iDeCo計画が見つからないか人物が一致しません。",
    });
  if (!idecoPlan.active)
    return calculateTakeHome(effectivePlan, member, {
      status: "incomplete",
      annualContributionYen: null,
      message: "連携iDeCo計画が無効のため控除額を計算できません。",
    });
  const scenario = state.investmentScenarios.find(
    (candidate) => candidate.id === idecoPlan.activeScenarioId,
  );
  const result = calculateIdecoPlan(idecoPlan, scenario, member, {
    taxYear: effectivePlan.targetYear,
    referenceDate,
  });
  return calculateTakeHome(effectivePlan, member, {
    status: result.status,
    annualContributionYen: result.annualPaidContributionYen,
    message:
      result.messages.join(" ") ||
      `連携iDeCo計画は${result.status}のため控除額を計算できません。`,
  });
}
