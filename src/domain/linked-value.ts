import type { AppState } from "./state";
import { calculateTakeHome } from "./take-home-calculator";

export type LinkedValueResult =
  | { status: "selected"; valueYen: number; sourceId: string }
  | { status: "manual"; valueYen: number }
  | { status: "broken-link"; warning: string; sourceId: string };

export function resolveIncomeTarget(
  state: Readonly<AppState>,
  targetId: string,
): LinkedValueResult {
  const target = state.incomeTargets.find(
    (candidate) => candidate.id === targetId,
  );
  if (!target) throw new Error(`income target is missing: ${targetId}`);
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
  const result = calculateTakeHome(source, member);
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
