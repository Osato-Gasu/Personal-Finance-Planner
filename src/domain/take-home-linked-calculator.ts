import type { AppState, HouseholdMember } from "./state";
import type { TakeHomePlan, TakeHomeResult } from "./take-home-plan";
import { calculateTakeHome } from "./take-home-calculator";
import { calculateIdecoPlan } from "./ideco";

export function calculateTakeHomeFromState(
  state: Readonly<AppState>,
  plan: Readonly<TakeHomePlan>,
  member: Readonly<HouseholdMember>,
  referenceDate: string | null,
): TakeHomeResult {
  if (
    plan.mode !== "calculated" ||
    plan.deductions.idecoContributionMode !== "linked"
  )
    return calculateTakeHome(plan, member);
  const idecoPlan = state.idecoPlans.find(
    (candidate) => candidate.id === plan.deductions.linkedIdecoPlanId,
  );
  if (!idecoPlan || idecoPlan.memberId !== plan.memberId)
    return calculateTakeHome(plan, member, {
      status: "incomplete",
      annualContributionYen: null,
      message: "連携iDeCo計画が見つからないか人物が一致しません。",
    });
  if (!idecoPlan.active)
    return calculateTakeHome(plan, member, {
      status: "incomplete",
      annualContributionYen: null,
      message: "連携iDeCo計画が無効のため控除額を計算できません。",
    });
  const scenario = state.investmentScenarios.find(
    (candidate) => candidate.id === idecoPlan.activeScenarioId,
  );
  const result = calculateIdecoPlan(idecoPlan, scenario, member, {
    taxYear: plan.targetYear,
    referenceDate,
  });
  return calculateTakeHome(plan, member, {
    status: result.status,
    annualContributionYen: result.annualPaidContributionYen,
    message:
      result.messages.join(" ") ||
      `連携iDeCo計画は${result.status}のため控除額を計算できません。`,
  });
}
