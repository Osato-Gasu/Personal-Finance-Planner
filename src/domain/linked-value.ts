import type { AppState, HouseholdMember } from "./state";
import { resolveCurrentTakeHomeContext } from "./take-home-current-context";
import { calculateTakeHomeFromState } from "./take-home-linked-calculator";
import type { TakeHomePlan, TakeHomeResult } from "./take-home-plan";

export type LinkedValueResult =
  | { status: "selected"; valueYen: number; sourceId: string }
  | { status: "manual"; valueYen: number }
  | { status: "broken-link"; warning: string; sourceId: string };

function referenceYear(referenceDate: string | null): number | null {
  const match = referenceDate?.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isSafeInteger(year) ? year : null;
}

/**
 * Resolve a Take-home source for an income link.  For self/current-year
 * calculated sources this is deliberately the same read-only context result
 * used by the Take-home screen; strict legacy/partner/out-of-year paths keep
 * their existing calculator behavior.
 */
export function resolveTakeHomeForIncomeLink(
  state: Readonly<AppState>,
  source: Readonly<TakeHomePlan>,
  member: Readonly<HouseholdMember>,
  referenceDate: string | null,
): TakeHomeResult | null {
  const year = referenceYear(referenceDate);
  if (
    member.role === "self" &&
    source.mode === "calculated" &&
    year !== null &&
    source.targetYear === year
  ) {
    const context = resolveCurrentTakeHomeContext(state, referenceDate);
    if (context.status !== "persisted" || context.plan.id !== source.id)
      return null;
    return context.result;
  }
  return calculateTakeHomeFromState(state, source, member, referenceDate);
}

export function resolveIncomeTarget(
  state: Readonly<AppState>,
  targetId: string,
  referenceDate: string | null = null,
): LinkedValueResult {
  const target = state.incomeTargets.find(
    (candidate) => candidate.id === targetId,
  );
  if (!target) throw new Error(`income target is missing: ${targetId}`);
  const policies = state.budgetIncomePolicies.filter(
    (candidate) => candidate.targetId === targetId,
  );
  if (policies.length > 1)
    return {
      status: "broken-link",
      warning: `ambiguous-budget-income-policy:${targetId}`,
      sourceId: `auto-take-home:${targetId}`,
    };
  if (policies[0]?.mode === "auto-take-home") {
    const match = referenceDate?.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (!match)
      return {
        status: "broken-link",
        warning: `auto-take-home-reference-date-unavailable:${targetId}`,
        sourceId: `auto-take-home:${targetId}`,
      };
    const year = Number(match[1]);
    const sources = state.takeHomePlans.filter(
      (candidate) =>
        candidate.mode === "calculated" &&
        candidate.active &&
        candidate.memberId === target.memberId &&
        candidate.targetYear === year,
    );
    if (sources.length !== 1)
      return {
        status: "broken-link",
        warning: `auto-take-home-source-count:${String(sources.length)}:${targetId}`,
        sourceId: `auto-take-home:${targetId}`,
      };
    const source = sources[0];
    const member = state.members.find(
      (candidate) => candidate.id === target.memberId,
    );
    if (!source || !member)
      return {
        status: "broken-link",
        warning: `auto-take-home-member-unavailable:${targetId}`,
        sourceId: source?.id ?? `auto-take-home:${targetId}`,
      };
    const currentContext =
      member.role === "self"
        ? resolveCurrentTakeHomeContext(state, referenceDate)
        : null;
    if (
      currentContext !== null &&
      (currentContext.status !== "persisted" ||
        currentContext.plan.id !== source.id)
    )
      return {
        status: "broken-link",
        warning: `auto-take-home-current-context:${currentContext.status}:${source.id}`,
        sourceId: source.id,
      };
    const result = resolveTakeHomeForIncomeLink(
      state,
      source,
      member,
      referenceDate,
    );
    if (!result)
      return {
        status: "broken-link",
        warning: `auto-take-home-current-context:${currentContext?.status ?? "unavailable"}:${source.id}`,
        sourceId: source.id,
      };
    if (
      result.status !== "complete" ||
      result.averageMonthlyTakeHomeYen === null
    )
      return {
        status: "broken-link",
        warning: `auto-take-home-uncomputed:${result.status}:${source.id}`,
        sourceId: source.id,
      };
    return {
      status: "selected",
      valueYen: result.averageMonthlyTakeHomeYen,
      sourceId: source.id,
    };
  }
  const link = state.links.find(
    (candidate) => candidate.targetId === targetId && candidate.active,
  );
  if (!link) return { status: "manual", valueYen: target.manualYen };
  const source = state.takeHomePlans.find(
    (candidate) => candidate.id === link.sourceId,
  );
  const member = state.members.find(
    (candidate) => candidate.id === target.memberId,
  );
  if (!source || !member || source.memberId !== target.memberId) {
    return {
      status: "broken-link",
      warning: `broken-link:${link.sourceType}:${link.sourceId}`,
      sourceId: link.sourceId,
    };
  }
  const result = resolveTakeHomeForIncomeLink(
    state,
    source,
    member,
    referenceDate,
  );
  if (!result || result.averageMonthlyTakeHomeYen === null) {
    return {
      status: "broken-link",
      warning: `uncomputed-link:${result?.status ?? "unavailable"}:${source.id}`,
      sourceId: source.id,
    };
  }
  return {
    status: "selected",
    valueYen: result.averageMonthlyTakeHomeYen,
    sourceId: source.id,
  };
}
