import type { AppState } from "./state";
import { calculateTakeHomeFromState } from "./take-home-linked-calculator";

export type LinkedValueResult =
  | { status: "selected"; valueYen: number; sourceId: string }
  | { status: "manual"; valueYen: number }
  | { status: "broken-link"; warning: string; sourceId: string };

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
    const result = calculateTakeHomeFromState(
      state,
      source,
      member,
      referenceDate,
    );
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
  const result = calculateTakeHomeFromState(
    state,
    source,
    member,
    referenceDate,
  );
  if (result.averageMonthlyTakeHomeYen === null) {
    return {
      status: "broken-link",
      warning: `uncomputed-link:${result.status}:${source.id}`,
      sourceId: source.id,
    };
  }
  return {
    status: "selected",
    valueYen: result.averageMonthlyTakeHomeYen,
    sourceId: source.id,
  };
}
