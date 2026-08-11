import type { AppState, ContributionSource, MemberId } from "./state";
import { calculateBudgetSummary } from "./budget";

export function deriveAssetContributions(
  state: Readonly<AppState>,
  memberId?: MemberId,
): readonly Readonly<ContributionSource>[] {
  return state.contributionSources.filter(
    (source) =>
      source.active && (memberId === undefined || source.memberId === memberId),
  );
}

export function sumLivingExpenses(
  state: Readonly<AppState>,
  memberId: MemberId,
): number {
  const summary = calculateBudgetSummary(state);
  if (summary.self.memberId === memberId) return summary.self.expenseYen;
  if (summary.partner.memberId === memberId) return summary.partner.expenseYen;
  throw new Error("living expense member is missing");
}

export function sumAssetContributions(
  state: Readonly<AppState>,
  memberId: MemberId,
): number {
  return deriveAssetContributions(state, memberId).reduce(
    (total, contribution) => total + contribution.amountYen,
    0,
  );
}
