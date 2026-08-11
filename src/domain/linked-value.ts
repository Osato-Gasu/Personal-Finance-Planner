import type { AppState } from "./state";

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
  const source = state.takeHomeInputs.find(
    (candidate) => candidate.id === link.sourceId,
  );
  if (!source || source.memberId !== target.memberId) {
    return {
      status: "broken-link",
      warning: `broken-link:${link.sourceType}:${link.sourceId}`,
      sourceId: link.sourceId,
    };
  }
  return {
    status: "selected",
    valueYen: source.fixtureMonthlyTakeHomeYen,
    sourceId: source.id,
  };
}
