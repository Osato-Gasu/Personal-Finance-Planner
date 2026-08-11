import type { AppState, ContributionSource, MemberId } from "./state";

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
  return state.livingExpenses
    .filter((expense) => expense.memberId === memberId)
    .reduce((total, expense) => total + expense.amountYen, 0);
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
