import {
  evaluateIdecoPlan,
  type IdecoEvaluation,
  type IdecoPlan,
} from "./ideco";
import {
  idecoContributionForMonth,
  nisaContributionForMonth,
} from "./investment-contributions";
import type { InvestmentProjectionPoint } from "./investment-projection";
import {
  selectLifePlan,
  type LifePlanResult,
  type LifePlanStatus,
  type LifePlanYearResult,
} from "./life-plan";
import {
  evaluateNisaPlan,
  type InvestmentScenario,
  type NisaEvaluation,
  type NisaPlan,
} from "./nisa";
import { selectOverview, type OverviewMemberResult } from "./overview";
import type { AppState, HouseholdMember } from "./state";

export type InvestmentDomain = "nisa" | "ideco";

export type InvestmentYearStatus =
  | "not-configured"
  | "complete"
  | "incomplete"
  | "invalid"
  | "unsupported"
  | "missing-rule"
  | "out-of-range"
  | "start-after-year-end"
  | "target-before-year-end";

export interface InvestmentYearValue {
  domain: InvestmentDomain;
  memberId: string;
  sourceId: string | null;
  endpointMonth: string;
  status: InvestmentYearStatus;
  balanceYen: number | null;
  principalYen: number | null;
  gainYen: number | null;
}

export interface MemberInvestmentYearResult {
  memberId: string;
  nisa: InvestmentYearValue;
  ideco: InvestmentYearValue;
  investmentBalanceYen: number | null;
}

export type ContributionConsistencyIssueKind = "mismatch" | "unavailable";

export interface ContributionConsistencyIssue {
  kind: ContributionConsistencyIssueKind;
  memberId: string;
  domain: InvestmentDomain;
  sourceId: string | null;
  firstAffectedMonth: string;
  baselineMonthlyYen: number | null;
  actualMonthlyYen: number | null;
}

export type LifePlanAssetRowReason =
  | "investment-unavailable"
  | "cashflow-schedule-mismatch"
  | "contribution-consistency-unavailable"
  | "negative-liquid-shortfall"
  | "arithmetic-out-of-range";

export interface LifePlanAssetYearResult extends LifePlanYearResult {
  endpointMonth: string;
  nisaBalanceYen: number | null;
  idecoBalanceYen: number | null;
  investmentBalanceYen: number | null;
  totalFinancialAssetsYen: number | null;
  totalStatus: "complete" | "unavailable" | "out-of-range";
  totalReasons: readonly LifePlanAssetRowReason[];
  liquidShortfallYen: number | null;
  memberInvestments: readonly MemberInvestmentYearResult[];
}

export type LifePlanAssetWarningCode =
  | "investment-projection-incomplete"
  | "investment-projection-invalid"
  | "investment-projection-unsupported"
  | "investment-rule-missing"
  | "investment-projection-out-of-range"
  | "investment-target-before-year-end"
  | "investment-start-after-year-end"
  | "fixed-cashflow-investment-schedule-mismatch"
  | "investment-contribution-consistency-unavailable"
  | "negative-liquid-shortfall-total-unavailable"
  | "financial-assets-arithmetic-out-of-range";

export interface LifePlanAssetWarning {
  code: LifePlanAssetWarningCode;
  message: string;
  route: "life-plan" | "investments";
  memberId: string | null;
  domain: InvestmentDomain | null;
  sourceId: string | null;
  endpointMonth: string | null;
  firstAffectedMonth: string | null;
}

export interface LifePlanAssetsResult {
  status: LifePlanStatus;
  base: LifePlanResult;
  years: readonly LifePlanAssetYearResult[];
  contributionConsistencyIssues: readonly ContributionConsistencyIssue[];
  warnings: readonly LifePlanAssetWarning[];
}

interface MemberEvaluation {
  member: Readonly<HouseholdMember>;
  nisaPlans: readonly Readonly<NisaPlan>[];
  nisaEvaluation: NisaEvaluation | null;
  nisaPoints: ReadonlyMap<string, InvestmentProjectionPoint>;
  idecoPlans: readonly Readonly<IdecoPlan>[];
  idecoEvaluation: IdecoEvaluation | null;
  idecoPoints: ReadonlyMap<string, InvestmentProjectionPoint>;
}

interface NullableSum {
  value: number | null;
  outOfRange: boolean;
}

function scenarioFor(
  scenarios: readonly Readonly<InvestmentScenario>[],
  memberId: string,
  scenarioId: string,
): InvestmentScenario | undefined {
  return scenarios.find(
    (candidate) =>
      candidate.id === scenarioId && candidate.memberId === memberId,
  );
}

function pointMap(
  points: readonly InvestmentProjectionPoint[],
): ReadonlyMap<string, InvestmentProjectionPoint> {
  return new Map(points.map((point) => [point.month, point]));
}

function monthNumber(value: string): number {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) throw new Error("month must be YYYY-MM");
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function monthText(value: number): string {
  const year = Math.floor(value / 12);
  return `${String(year).padStart(4, "0")}-${String((value % 12) + 1).padStart(2, "0")}`;
}

function nullableSafeSum(values: readonly (number | null)[]): NullableSum {
  if (values.some((value) => value === null))
    return { value: null, outOfRange: false };
  let total = 0;
  for (const value of values as readonly number[]) {
    if (!Number.isSafeInteger(value) || value < 0)
      return { value: null, outOfRange: true };
    if (value > Number.MAX_SAFE_INTEGER - total)
      return { value: null, outOfRange: true };
    total += value;
  }
  return { value: total, outOfRange: false };
}

function unavailableYearValue(
  domain: InvestmentDomain,
  memberId: string,
  sourceId: string | null,
  endpointMonth: string,
  status: Exclude<InvestmentYearStatus, "not-configured" | "complete">,
): InvestmentYearValue {
  return {
    domain,
    memberId,
    sourceId,
    endpointMonth,
    status,
    balanceYen: null,
    principalYen: null,
    gainYen: null,
  };
}

function notConfiguredYearValue(
  domain: InvestmentDomain,
  memberId: string,
  endpointMonth: string,
): InvestmentYearValue {
  return {
    domain,
    memberId,
    sourceId: null,
    endpointMonth,
    status: "not-configured",
    balanceYen: 0,
    principalYen: 0,
    gainYen: 0,
  };
}

function completeYearValue(
  domain: InvestmentDomain,
  memberId: string,
  sourceId: string,
  endpointMonth: string,
  point: InvestmentProjectionPoint,
): InvestmentYearValue {
  return {
    domain,
    memberId,
    sourceId,
    endpointMonth,
    status: "complete",
    balanceYen: point.balanceYen,
    principalYen: point.principalYen,
    gainYen: point.gainYen,
  };
}

function nisaYearValue(
  evaluation: MemberEvaluation,
  endpointMonth: string,
): InvestmentYearValue {
  const { member, nisaPlans, nisaEvaluation, nisaPoints } = evaluation;
  if (nisaPlans.length === 0)
    return notConfiguredYearValue("nisa", member.id, endpointMonth);
  if (nisaPlans.length > 1)
    return unavailableYearValue(
      "nisa",
      member.id,
      null,
      endpointMonth,
      "invalid",
    );
  const plan = nisaPlans[0] as Readonly<NisaPlan>;
  if (nisaEvaluation === null)
    return unavailableYearValue(
      "nisa",
      member.id,
      plan.id,
      endpointMonth,
      "out-of-range",
    );
  if (nisaEvaluation.result.status !== "complete")
    return unavailableYearValue(
      "nisa",
      member.id,
      plan.id,
      endpointMonth,
      nisaEvaluation.result.status,
    );
  if (plan.startMonth > endpointMonth)
    return unavailableYearValue(
      "nisa",
      member.id,
      plan.id,
      endpointMonth,
      "start-after-year-end",
    );
  if (plan.targetMonth < endpointMonth)
    return unavailableYearValue(
      "nisa",
      member.id,
      plan.id,
      endpointMonth,
      "target-before-year-end",
    );
  const point = nisaPoints.get(endpointMonth);
  return point
    ? completeYearValue("nisa", member.id, plan.id, endpointMonth, point)
    : unavailableYearValue(
        "nisa",
        member.id,
        plan.id,
        endpointMonth,
        "out-of-range",
      );
}

function idecoYearValue(
  evaluation: MemberEvaluation,
  endpointMonth: string,
): InvestmentYearValue {
  const { member, idecoPlans, idecoEvaluation, idecoPoints } = evaluation;
  if (idecoPlans.length === 0)
    return notConfiguredYearValue("ideco", member.id, endpointMonth);
  if (idecoPlans.length > 1)
    return unavailableYearValue(
      "ideco",
      member.id,
      null,
      endpointMonth,
      "invalid",
    );
  const plan = idecoPlans[0] as Readonly<IdecoPlan>;
  if (idecoEvaluation === null)
    return unavailableYearValue(
      "ideco",
      member.id,
      plan.id,
      endpointMonth,
      "out-of-range",
    );
  if (idecoEvaluation.result.status !== "complete")
    return unavailableYearValue(
      "ideco",
      member.id,
      plan.id,
      endpointMonth,
      idecoEvaluation.result.status,
    );
  const targetMonth = idecoEvaluation.result.targetMonth;
  if (targetMonth === null)
    return unavailableYearValue(
      "ideco",
      member.id,
      plan.id,
      endpointMonth,
      "out-of-range",
    );
  if (plan.startMonth > endpointMonth)
    return unavailableYearValue(
      "ideco",
      member.id,
      plan.id,
      endpointMonth,
      "start-after-year-end",
    );
  if (targetMonth < endpointMonth)
    return unavailableYearValue(
      "ideco",
      member.id,
      plan.id,
      endpointMonth,
      "target-before-year-end",
    );
  const point = idecoPoints.get(endpointMonth);
  return point
    ? completeYearValue("ideco", member.id, plan.id, endpointMonth, point)
    : unavailableYearValue(
        "ideco",
        member.id,
        plan.id,
        endpointMonth,
        "out-of-range",
      );
}

function actualContribution(
  evaluation: MemberEvaluation,
  domain: InvestmentDomain,
  month: string,
): number | null {
  if (domain === "nisa") {
    if (evaluation.nisaPlans.length === 0) return 0;
    if (evaluation.nisaPlans.length > 1) return null;
    return nisaContributionForMonth(
      evaluation.nisaPlans[0] as Readonly<NisaPlan>,
      month,
    ).amountYen;
  }
  if (evaluation.idecoPlans.length === 0) return 0;
  if (evaluation.idecoPlans.length > 1) return null;
  return idecoContributionForMonth(
    evaluation.idecoPlans[0] as Readonly<IdecoPlan>,
    evaluation.member,
    month,
  ).amountYen;
}

function contributionIssue(
  evaluation: MemberEvaluation,
  overviewMember: Readonly<OverviewMemberResult> | undefined,
  domain: InvestmentDomain,
  firstMonth: string,
  lastMonth: string,
): ContributionConsistencyIssue | null {
  const baseline =
    domain === "nisa"
      ? (overviewMember?.nisa.currentMonthContributionYen ?? null)
      : (overviewMember?.ideco.currentMonthContributionYen ?? null);
  const plans =
    domain === "nisa" ? evaluation.nisaPlans : evaluation.idecoPlans;
  const sourceId = plans.length === 1 ? (plans[0]?.id ?? null) : null;
  for (
    let cursor = monthNumber(firstMonth);
    cursor <= monthNumber(lastMonth);
    cursor += 1
  ) {
    const month = monthText(cursor);
    const actual = actualContribution(evaluation, domain, month);
    if (baseline === null || actual === null)
      return {
        kind: "unavailable",
        memberId: evaluation.member.id,
        domain,
        sourceId,
        firstAffectedMonth: month,
        baselineMonthlyYen: baseline,
        actualMonthlyYen: actual,
      };
    if (baseline !== actual)
      return {
        kind: "mismatch",
        memberId: evaluation.member.id,
        domain,
        sourceId,
        firstAffectedMonth: month,
        baselineMonthlyYen: baseline,
        actualMonthlyYen: actual,
      };
  }
  return null;
}

function investmentWarning(
  value: InvestmentYearValue,
): LifePlanAssetWarning | null {
  if (value.status === "complete" || value.status === "not-configured")
    return null;
  const details: Record<
    Exclude<InvestmentYearStatus, "complete" | "not-configured">,
    { code: LifePlanAssetWarningCode; message: string }
  > = {
    incomplete: {
      code: "investment-projection-incomplete",
      message: "入力不足のため投資残高を年末値として確定できません。",
    },
    invalid: {
      code: "investment-projection-invalid",
      message: "無効な投資計画のため年末残高を集計できません。",
    },
    unsupported: {
      code: "investment-projection-unsupported",
      message: "未対応条件を含む投資計画のため年末残高を集計できません。",
    },
    "missing-rule": {
      code: "investment-rule-missing",
      message: "必要な制度ルールがないため投資残高を集計できません。",
    },
    "out-of-range": {
      code: "investment-projection-out-of-range",
      message: "投資計算が安全な金額範囲を超えたため集計できません。",
    },
    "target-before-year-end": {
      code: "investment-target-before-year-end",
      message:
        "計画目標が12月より前のため、目標月残高を年末残高として代用しません。",
    },
    "start-after-year-end": {
      code: "investment-start-after-year-end",
      message: "計画開始が年末より後のため、年末残高を推測しません。",
    },
  };
  const detail = details[value.status];
  return {
    code: detail.code,
    message: `${value.endpointMonth} ${value.memberId} ${value.domain}: ${detail.message}`,
    route: "investments",
    memberId: value.memberId,
    domain: value.domain,
    sourceId: value.sourceId,
    endpointMonth: value.endpointMonth,
    firstAffectedMonth: null,
  };
}

function issueAffectsEndpoint(
  issue: ContributionConsistencyIssue,
  endpointMonth: string,
): boolean {
  return issue.firstAffectedMonth <= endpointMonth;
}

export function selectLifePlanAssets(
  state: Readonly<AppState>,
): LifePlanAssetsResult {
  const base = selectLifePlan(state);
  if (base.status !== "complete" || base.years.length === 0)
    return {
      status: base.status,
      base,
      years: [],
      contributionConsistencyIssues: [],
      warnings: [],
    };

  const baseReferenceDate = state.lifePlan.baseReferenceDate;
  const projectionStartYear = state.lifePlan.projectionStartYear;
  if (baseReferenceDate === null || projectionStartYear === null)
    throw new Error("complete life plan is missing its fixed reference");
  const idecoReference = {
    referenceDate: baseReferenceDate,
    taxYear: Number(baseReferenceDate.slice(0, 4)),
  } as const;
  const overview = selectOverview(state, baseReferenceDate);
  const activeMembers = state.members.filter((member) => member.active);
  const evaluations: MemberEvaluation[] = activeMembers.map((member) => {
    const nisaPlans = state.nisaPlans.filter(
      (plan) => plan.active && plan.memberId === member.id,
    );
    const nisaEvaluation =
      nisaPlans.length === 1
        ? evaluateNisaPlan(
            nisaPlans[0] as NisaPlan,
            scenarioFor(
              state.investmentScenarios,
              member.id,
              (nisaPlans[0] as NisaPlan).activeScenarioId,
            ),
            member,
          )
        : null;
    const idecoPlans = state.idecoPlans.filter(
      (plan) => plan.active && plan.memberId === member.id,
    );
    const idecoEvaluation =
      idecoPlans.length === 1
        ? evaluateIdecoPlan(
            idecoPlans[0] as IdecoPlan,
            scenarioFor(
              state.investmentScenarios,
              member.id,
              (idecoPlans[0] as IdecoPlan).activeScenarioId,
            ),
            member,
            idecoReference,
          )
        : null;
    return {
      member,
      nisaPlans,
      nisaEvaluation,
      nisaPoints: pointMap(nisaEvaluation?.points ?? []),
      idecoPlans,
      idecoEvaluation,
      idecoPoints: pointMap(idecoEvaluation?.points ?? []),
    };
  });

  const firstMonth = `${String(projectionStartYear).padStart(4, "0")}-01`;
  const lastBaseYear = base.years[base.years.length - 1];
  if (!lastBaseYear) throw new Error("complete life plan has no final year");
  const lastMonth = `${String(lastBaseYear.year).padStart(4, "0")}-12`;
  const contributionConsistencyIssues = evaluations.flatMap((evaluation) => {
    const overviewMember = overview.members.find(
      (member) => member.memberId === evaluation.member.id,
    );
    return (["nisa", "ideco"] as const)
      .map((domain) =>
        contributionIssue(
          evaluation,
          overviewMember,
          domain,
          firstMonth,
          lastMonth,
        ),
      )
      .filter((issue): issue is ContributionConsistencyIssue => issue !== null);
  });

  const warnings: LifePlanAssetWarning[] = contributionConsistencyIssues.map(
    (issue) => ({
      code:
        issue.kind === "mismatch"
          ? "fixed-cashflow-investment-schedule-mismatch"
          : "investment-contribution-consistency-unavailable",
      message:
        issue.kind === "mismatch"
          ? `${issue.firstAffectedMonth} ${issue.memberId} ${issue.domain}: 固定キャッシュフローの月額${String(issue.baselineMonthlyYen)}円と実際の拠出${String(issue.actualMonthlyYen)}円が一致しません。以後の金融資産合計は表示しません。`
          : `${issue.firstAffectedMonth} ${issue.memberId} ${issue.domain}: 拠出整合性を確認できないため、以後の金融資産合計は表示しません。`,
      route: "investments",
      memberId: issue.memberId,
      domain: issue.domain,
      sourceId: issue.sourceId,
      endpointMonth: null,
      firstAffectedMonth: issue.firstAffectedMonth,
    }),
  );

  const years = base.years.map((baseYear): LifePlanAssetYearResult => {
    const endpointMonth = `${String(baseYear.year).padStart(4, "0")}-12`;
    let arithmeticOutOfRange = false;
    const memberInvestments = evaluations.map((evaluation) => {
      const nisa = nisaYearValue(evaluation, endpointMonth);
      const ideco = idecoYearValue(evaluation, endpointMonth);
      const warningValues = [investmentWarning(nisa), investmentWarning(ideco)];
      warnings.push(
        ...warningValues.filter(
          (warning): warning is LifePlanAssetWarning => warning !== null,
        ),
      );
      const investment = nullableSafeSum([nisa.balanceYen, ideco.balanceYen]);
      arithmeticOutOfRange ||= investment.outOfRange;
      return {
        memberId: evaluation.member.id,
        nisa,
        ideco,
        investmentBalanceYen: investment.value,
      };
    });
    const nisa = nullableSafeSum(
      memberInvestments.map((member) => member.nisa.balanceYen),
    );
    const ideco = nullableSafeSum(
      memberInvestments.map((member) => member.ideco.balanceYen),
    );
    arithmeticOutOfRange ||= nisa.outOfRange || ideco.outOfRange;
    const investment = nullableSafeSum([nisa.value, ideco.value]);
    arithmeticOutOfRange ||= investment.outOfRange;

    const totalReasons: LifePlanAssetRowReason[] = [];
    if (nisa.value === null || ideco.value === null)
      totalReasons.push("investment-unavailable");
    const affectedIssues = contributionConsistencyIssues.filter((issue) =>
      issueAffectsEndpoint(issue, endpointMonth),
    );
    if (affectedIssues.some((issue) => issue.kind === "mismatch"))
      totalReasons.push("cashflow-schedule-mismatch");
    if (affectedIssues.some((issue) => issue.kind === "unavailable"))
      totalReasons.push("contribution-consistency-unavailable");
    const liquidShortfallYen =
      baseYear.closingLiquidAssetsYen < 0
        ? -baseYear.closingLiquidAssetsYen
        : null;
    if (liquidShortfallYen !== null)
      totalReasons.push("negative-liquid-shortfall");

    let totalFinancialAssetsYen: number | null = null;
    if (totalReasons.length === 0) {
      const total = nullableSafeSum([
        baseYear.closingLiquidAssetsYen,
        nisa.value,
        ideco.value,
      ]);
      totalFinancialAssetsYen = total.value;
      arithmeticOutOfRange ||= total.outOfRange;
    }
    if (arithmeticOutOfRange) {
      totalFinancialAssetsYen = null;
      if (!totalReasons.includes("arithmetic-out-of-range"))
        totalReasons.push("arithmetic-out-of-range");
    }
    if (liquidShortfallYen !== null)
      warnings.push({
        code: "negative-liquid-shortfall-total-unavailable",
        message: `${endpointMonth}: 現預金が不足しているため、金融資産合計は表示しません。`,
        route: "life-plan",
        memberId: null,
        domain: null,
        sourceId: null,
        endpointMonth,
        firstAffectedMonth: null,
      });
    if (arithmeticOutOfRange)
      warnings.push({
        code: "financial-assets-arithmetic-out-of-range",
        message: `${endpointMonth}: 金融資産集計が安全な整数範囲を超えました。`,
        route: "life-plan",
        memberId: null,
        domain: null,
        sourceId: null,
        endpointMonth,
        firstAffectedMonth: null,
      });

    return {
      ...baseYear,
      endpointMonth,
      nisaBalanceYen: nisa.value,
      idecoBalanceYen: ideco.value,
      investmentBalanceYen: investment.value,
      totalFinancialAssetsYen,
      totalStatus: arithmeticOutOfRange
        ? "out-of-range"
        : totalReasons.length === 0
          ? "complete"
          : "unavailable",
      totalReasons,
      liquidShortfallYen,
      memberInvestments,
    };
  });

  return {
    status: base.status,
    base,
    years,
    contributionConsistencyIssues,
    warnings,
  };
}
