import { tryCalculateBudgetSummary } from "./budget";
import { calculateIdecoPlan } from "./ideco";
import {
  calculateNisaPlan,
  type InvestmentScenario,
  type NisaResultStatus,
} from "./nisa";
import type { AppState, HouseholdMember } from "./state";
import { SCHEMA_VERSION } from "./state";
import { selectBackupReminder } from "./backup";
import { calculateTakeHomeFromState } from "./take-home-linked-calculator";
import type { AppliedRule, CalculatedTakeHomePlan } from "./take-home-plan";

export type OverviewStatus =
  | "not-configured"
  | "complete"
  | "invalid"
  | "incomplete"
  | "unsupported"
  | "missing-rule"
  | "out-of-range";

export type OverviewWarningCategory =
  "blocking" | "overspent" | "statutory" | "assumption";

export interface OverviewWarning {
  key: string;
  category: OverviewWarningCategory;
  domain: "overview" | "take-home" | "budget" | "nisa" | "ideco";
  memberId: string;
  sourceId: string;
  code: string;
  message: string;
}

export interface OverviewRuleSource {
  title: string;
  publisher: string;
  url: string;
}

export interface OverviewRule {
  key: string;
  id: string;
  domain: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  verifiedAt: string;
  sources: readonly OverviewRuleSource[];
}

export interface OverviewInvestmentResult {
  sourceId: string | null;
  status: OverviewStatus;
  currentMonthContributionYen: number | null;
  projectedPrincipalYen: number | null;
  projectedBalanceYen: number | null;
  projectedGainYen: number | null;
  realValueYen: number | null;
}

export interface OverviewMemberResult {
  memberId: string;
  displayName: string;
  role: HouseholdMember["role"];
  takeHomePlanId: string | null;
  takeHomeStatus: OverviewStatus;
  grossMonthlyYen: number | null;
  takeHomeMonthlyYen: number | null;
  livingExpenseMonthlyYen: number | null;
  afterLivingExpenseYen: number | null;
  nisa: OverviewInvestmentResult;
  ideco: OverviewInvestmentResult;
  investmentContributionYen: number | null;
  afterInvestmentYen: number | null;
  projectedPrincipalYen: number | null;
  projectedBalanceYen: number | null;
  projectedGainYen: number | null;
  realValueYen: number | null;
}

export interface OverviewHouseholdResult {
  grossMonthlyYen: number | null;
  takeHomeMonthlyYen: number | null;
  livingExpenseMonthlyYen: number | null;
  afterLivingExpenseYen: number | null;
  nisaContributionYen: number | null;
  idecoContributionYen: number | null;
  investmentContributionYen: number | null;
  afterInvestmentYen: number | null;
  projectedPrincipalYen: number | null;
  projectedBalanceYen: number | null;
  projectedGainYen: number | null;
  realValueYen: number | null;
}

export interface OverviewResult {
  referenceDate: string;
  referenceMonth: string;
  referenceYear: number;
  members: readonly OverviewMemberResult[];
  household: OverviewHouseholdResult;
  warnings: readonly OverviewWarning[];
  rules: readonly OverviewRule[];
}

const warningPriority: Record<OverviewWarningCategory, number> = {
  blocking: 0,
  overspent: 1,
  statutory: 2,
  assumption: 3,
};

function assertReferenceDate(value: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("referenceDate must be YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (days[month - 1] ?? 0)
  )
    throw new Error("referenceDate must be a real calendar date");
}

function safeSignedSum(values: readonly number[]): number | null {
  let total = 0;
  for (const value of values) {
    total += value;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}

function safeDifference(left: number, right: number): number | null {
  const value = left - right;
  return Number.isSafeInteger(value) ? value : null;
}

function nullableSum(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  return safeSignedSum(values as readonly number[]);
}

function safeHttps(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function warning(
  memberId: string,
  domain: OverviewWarning["domain"],
  sourceId: string,
  code: string,
  category: OverviewWarningCategory,
  message: string,
): OverviewWarning {
  return {
    key: `${domain}/${sourceId}/${memberId}/${code}`,
    category,
    domain,
    memberId,
    sourceId,
    code,
    message,
  };
}

function messageCode(prefix: string, message: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < message.length; index += 1) {
    hash ^= message.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function appliedRule(rule: AppliedRule): OverviewRule {
  return {
    key: `${rule.domain}/${rule.id}`,
    id: rule.id,
    domain: rule.domain,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    status: rule.status,
    verifiedAt: rule.verifiedAt,
    sources: rule.sourceUrls.filter(safeHttps).map((url) => ({
      title: rule.sourceTitle,
      publisher: rule.sourcePublisher,
      url,
    })),
  };
}

function absentInvestment(): OverviewInvestmentResult {
  return {
    sourceId: null,
    status: "not-configured",
    currentMonthContributionYen: 0,
    projectedPrincipalYen: null,
    projectedBalanceYen: null,
    projectedGainYen: null,
    realValueYen: null,
  };
}

function invalidInvestment(): OverviewInvestmentResult {
  return {
    ...absentInvestment(),
    status: "invalid",
    currentMonthContributionYen: null,
  };
}

function scenarioFor(
  scenarios: readonly InvestmentScenario[],
  memberId: string,
  scenarioId: string,
): InvestmentScenario | undefined {
  return scenarios.find(
    (candidate) =>
      candidate.id === scenarioId && candidate.memberId === memberId,
  );
}

function currentNisaContribution(
  plan: Readonly<AppState["nisaPlans"][number]>,
  referenceMonth: string,
): number | null {
  if (referenceMonth < plan.startMonth || referenceMonth > plan.targetMonth)
    return 0;
  const values = [
    plan.monthlyTsumitateYen,
    plan.monthlyGrowthYen,
    ...plan.additionalPurchases
      .filter((purchase) => purchase.month === referenceMonth)
      .map((purchase) => purchase.amountYen),
  ];
  return nullableSum(values);
}

function idecoTargetMonth(
  plan: Readonly<AppState["idecoPlans"][number]>,
  member: Readonly<HouseholdMember>,
): string | null {
  if (plan.projectionTarget.type === "month")
    return plan.projectionTarget.month;
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(member.birthDate ?? "");
  if (!birth) return null;
  const year = Number(birth[1]) + plan.projectionTarget.age;
  if (!Number.isSafeInteger(year) || year < 1 || year > 9999) return null;
  return `${String(year).padStart(4, "0")}-${birth[2] ?? ""}`;
}

function currentIdecoContribution(
  plan: Readonly<AppState["idecoPlans"][number]>,
  member: Readonly<HouseholdMember>,
  referenceMonth: string,
): {
  amountYen: number | null;
  period: "in-period" | "before-start" | "after-end" | "unresolved";
} {
  if (plan.annualUnitContributionActive !== false)
    return { amountYen: null, period: "unresolved" };
  const target = idecoTargetMonth(plan, member);
  if (target === null) return { amountYen: null, period: "unresolved" };
  if (referenceMonth < plan.startMonth)
    return { amountYen: 0, period: "before-start" };
  if (referenceMonth > target) return { amountYen: 0, period: "after-end" };
  return { amountYen: plan.monthlyContributionYen, period: "in-period" };
}

function statusWarningText(
  domain: "take-home" | "nisa" | "ideco",
  status: OverviewStatus,
): string {
  const labels = {
    "take-home": "手取り",
    nisa: "NISA",
    ideco: "iDeCo",
  } as const;
  return `${labels[domain]}の状態は${status}です。`;
}

function overviewForMember(
  state: Readonly<AppState>,
  member: Readonly<HouseholdMember>,
  livingExpenseMonthlyYen: number | null,
  referenceDate: string,
  warnings: OverviewWarning[],
  rules: OverviewRule[],
): OverviewMemberResult {
  const referenceYear = Number(referenceDate.slice(0, 4));
  const referenceMonth = referenceDate.slice(0, 7);
  const takeHomePlans = state.takeHomePlans.filter(
    (plan): plan is CalculatedTakeHomePlan =>
      plan.memberId === member.id &&
      plan.active &&
      plan.mode === "calculated" &&
      plan.targetYear === referenceYear,
  );
  let takeHomePlanId: string | null = null;
  let takeHomeStatus: OverviewStatus = "not-configured";
  let grossMonthlyYen: number | null = null;
  let takeHomeMonthlyYen: number | null = null;
  if (takeHomePlans.length === 1) {
    const plan = takeHomePlans[0] as CalculatedTakeHomePlan;
    takeHomePlanId = plan.id;
    const result = calculateTakeHomeFromState(
      state,
      plan,
      member,
      referenceDate,
    );
    takeHomeStatus = result.status;
    grossMonthlyYen =
      result.annualGrossYen === null
        ? null
        : Math.floor(result.annualGrossYen / 12);
    takeHomeMonthlyYen = result.averageMonthlyTakeHomeYen;
    rules.push(...result.appliedRules.map(appliedRule));
    result.warnings.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "take-home",
          plan.id,
          messageCode("warning", message),
          "statutory",
          message,
        ),
      ),
    );
    result.unsupportedConditions.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "take-home",
          plan.id,
          messageCode("unsupported", message),
          "blocking",
          message,
        ),
      ),
    );
    result.assumptions.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "take-home",
          plan.id,
          messageCode("assumption", message),
          "assumption",
          message,
        ),
      ),
    );
  } else if (takeHomePlans.length > 1) {
    takeHomeStatus = "invalid";
    warnings.push(
      warning(
        member.id,
        "take-home",
        "multiple",
        "multiple-active",
        "blocking",
        "対象年の有効な手取り計画が複数あります。",
      ),
    );
  }
  if (takeHomeStatus !== "complete") {
    warnings.push(
      warning(
        member.id,
        "take-home",
        takeHomePlanId ?? "none",
        takeHomeStatus,
        "blocking",
        statusWarningText("take-home", takeHomeStatus),
      ),
    );
  }

  const afterLivingExpenseYen =
    takeHomeMonthlyYen === null || livingExpenseMonthlyYen === null
      ? null
      : safeDifference(takeHomeMonthlyYen, livingExpenseMonthlyYen);
  if (
    takeHomeMonthlyYen !== null &&
    livingExpenseMonthlyYen !== null &&
    afterLivingExpenseYen === null
  ) {
    warnings.push(
      warning(
        member.id,
        "overview",
        member.id,
        "after-living-out-of-range",
        "blocking",
        "生活費差引後の金額が対応範囲を超えました。",
      ),
    );
  }

  let nisa = absentInvestment();
  const nisaPlans = state.nisaPlans.filter(
    (plan) => plan.memberId === member.id && plan.active,
  );
  if (nisaPlans.length === 1) {
    const plan = nisaPlans[0] as AppState["nisaPlans"][number];
    const result = calculateNisaPlan(
      plan,
      scenarioFor(state.investmentScenarios, member.id, plan.activeScenarioId),
      member,
    );
    const amount = currentNisaContribution(plan, referenceMonth);
    const status: NisaResultStatus =
      amount === null && result.status === "complete"
        ? "out-of-range"
        : result.status;
    nisa = {
      sourceId: plan.id,
      status,
      currentMonthContributionYen: amount,
      projectedPrincipalYen: result.projectedPrincipalYen,
      projectedBalanceYen: result.projectedBalanceYen,
      projectedGainYen: result.projectedGainYen,
      realValueYen: result.realValueYen,
    };
    if (result.rule) {
      const metadata = result.rule.metadata;
      rules.push({
        key: `${metadata.domain}/${metadata.id}`,
        id: metadata.id,
        domain: metadata.domain,
        effectiveFrom: metadata.effectiveFrom,
        effectiveTo: metadata.effectiveTo,
        status: metadata.status,
        verifiedAt: metadata.verifiedAt,
        sources: metadata.sources
          .filter((source) => safeHttps(source.url))
          .map((source) => ({
            title: source.title,
            publisher: source.publisher,
            url: source.url,
          })),
      });
    }
    result.issues.forEach((issue) =>
      warnings.push(
        warning(
          member.id,
          "nisa",
          plan.id,
          `${issue.code}-${issue.year === null ? "all" : String(issue.year)}`,
          "statutory",
          `NISA上限を${String(issue.exceededByYen)}円超過しています。`,
        ),
      ),
    );
    result.messages.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "nisa",
          plan.id,
          messageCode("message", message),
          "statutory",
          message,
        ),
      ),
    );
    if (result.assumptions) {
      Object.entries(result.assumptions).forEach(([code, value]) =>
        warnings.push(
          warning(
            member.id,
            "nisa",
            plan.id,
            code,
            "assumption",
            `${code}: ${String(value)}`,
          ),
        ),
      );
    }
  } else if (nisaPlans.length > 1) {
    nisa = invalidInvestment();
  }
  if (nisa.status !== "complete") {
    warnings.push(
      warning(
        member.id,
        "nisa",
        nisa.sourceId ?? "none",
        nisa.status,
        "blocking",
        statusWarningText("nisa", nisa.status),
      ),
    );
  }

  let ideco = absentInvestment();
  const idecoPlans = state.idecoPlans.filter(
    (plan) => plan.memberId === member.id && plan.active,
  );
  if (idecoPlans.length === 1) {
    const plan = idecoPlans[0] as AppState["idecoPlans"][number];
    const result = calculateIdecoPlan(
      plan,
      scenarioFor(state.investmentScenarios, member.id, plan.activeScenarioId),
      member,
      { referenceDate, taxYear: referenceYear },
    );
    const currentContribution = currentIdecoContribution(
      plan,
      member,
      referenceMonth,
    );
    const status: OverviewStatus =
      result.status !== "complete"
        ? result.status
        : currentContribution.period === "before-start" ||
            currentContribution.period === "after-end"
          ? "not-configured"
          : currentContribution.amountYen === null
            ? "out-of-range"
            : "complete";
    ideco = {
      sourceId: plan.id,
      status,
      currentMonthContributionYen: currentContribution.amountYen,
      projectedPrincipalYen: result.projectedPrincipalYen,
      projectedBalanceYen: result.projectedBalanceYen,
      projectedGainYen: result.projectedGainYen,
      realValueYen: result.realValueYen,
    };
    if (result.rule) {
      const metadata = result.rule.metadata;
      rules.push({
        key: `${metadata.domain}/${metadata.id}`,
        id: metadata.id,
        domain: metadata.domain,
        effectiveFrom: metadata.effectiveFrom,
        effectiveTo: metadata.effectiveTo,
        status: metadata.status,
        verifiedAt: metadata.verifiedAt,
        sources: metadata.sourceUrls.filter(safeHttps).map((url) => ({
          title: metadata.sourceTitle,
          publisher: metadata.sourcePublisher,
          url,
        })),
      });
    }
    result.messages.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "ideco",
          plan.id,
          messageCode("message", message),
          "statutory",
          message,
        ),
      ),
    );
    result.assumptions.forEach((message) =>
      warnings.push(
        warning(
          member.id,
          "ideco",
          plan.id,
          messageCode("assumption", message),
          "assumption",
          message,
        ),
      ),
    );
  } else if (idecoPlans.length > 1) {
    ideco = invalidInvestment();
  }
  if (ideco.status !== "complete") {
    warnings.push(
      warning(
        member.id,
        "ideco",
        ideco.sourceId ?? "none",
        ideco.status,
        "blocking",
        statusWarningText("ideco", ideco.status),
      ),
    );
  }

  const investmentContributionYen = nullableSum([
    nisa.currentMonthContributionYen,
    ideco.currentMonthContributionYen,
  ]);
  const afterInvestmentYen =
    afterLivingExpenseYen === null || investmentContributionYen === null
      ? null
      : safeDifference(afterLivingExpenseYen, investmentContributionYen);
  if (afterLivingExpenseYen !== null && afterLivingExpenseYen < 0) {
    warnings.push(
      warning(
        member.id,
        "budget",
        member.id,
        "after-living-negative",
        "overspent",
        "生活費差引後の金額がマイナスです。",
      ),
    );
  }
  if (afterInvestmentYen !== null && afterInvestmentYen < 0) {
    warnings.push(
      warning(
        member.id,
        "overview",
        member.id,
        "after-investment-negative",
        "overspent",
        "投資差引後の金額がマイナスです。",
      ),
    );
  }
  if (
    afterLivingExpenseYen !== null &&
    investmentContributionYen !== null &&
    afterInvestmentYen === null
  ) {
    warnings.push(
      warning(
        member.id,
        "overview",
        member.id,
        "after-investment-out-of-range",
        "blocking",
        "投資差引後の金額が対応範囲を超えました。",
      ),
    );
  }

  const asset = (
    field: keyof Pick<
      OverviewInvestmentResult,
      | "projectedPrincipalYen"
      | "projectedBalanceYen"
      | "projectedGainYen"
      | "realValueYen"
    >,
  ): number | null => {
    const values = [nisa[field], ideco[field]];
    const total = nullableSum(values);
    if (values.every((value) => value !== null) && total === null) {
      warnings.push(
        warning(
          member.id,
          "overview",
          member.id,
          `${field}-out-of-range`,
          "blocking",
          "資産集計が対応範囲を超えました。",
        ),
      );
    }
    return total;
  };

  return {
    memberId: member.id,
    displayName: member.displayName,
    role: member.role,
    takeHomePlanId,
    takeHomeStatus,
    grossMonthlyYen,
    takeHomeMonthlyYen,
    livingExpenseMonthlyYen,
    afterLivingExpenseYen,
    nisa,
    ideco,
    investmentContributionYen,
    afterInvestmentYen,
    projectedPrincipalYen: asset("projectedPrincipalYen"),
    projectedBalanceYen: asset("projectedBalanceYen"),
    projectedGainYen: asset("projectedGainYen"),
    realValueYen: asset("realValueYen"),
  };
}

export function selectOverview(
  state: Readonly<AppState>,
  referenceDate: string,
): OverviewResult {
  assertReferenceDate(referenceDate);
  const schemaVersion: unknown = (state as unknown as Record<string, unknown>)[
    "schemaVersion"
  ];
  if (schemaVersion !== SCHEMA_VERSION)
    throw new Error(
      `overview requires schemaVersion ${String(SCHEMA_VERSION)}`,
    );
  const roleOrder: Record<HouseholdMember["role"], number> = {
    self: 0,
    partner: 1,
  };
  const activeMembers = state.members
    .filter((member) => member.active)
    .sort(
      (left, right) =>
        roleOrder[left.role] - roleOrder[right.role] ||
        left.id.localeCompare(right.id),
    );
  const budgetState: Readonly<AppState> = {
    ...state,
    links: [],
    incomeTargets: state.incomeTargets.map((target) => ({
      ...target,
      manualYen: 0,
    })),
  };
  const warnings: OverviewWarning[] = [];
  const backupReminder = selectBackupReminder(state.backup, referenceDate);
  if (backupReminder.due)
    warnings.push(
      warning(
        "household",
        "overview",
        "backup",
        "backup-reminder",
        "assumption",
        backupReminder.message,
      ),
    );
  const rules: OverviewRule[] = [];
  const budget = tryCalculateBudgetSummary(budgetState, null);
  if (budget.status === "out-of-range") {
    warnings.push(
      warning(
        "household",
        "budget",
        "household",
        "allocation-out-of-range",
        "blocking",
        budget.message,
      ),
    );
  }
  const members = activeMembers.map((member) => {
    const livingExpenseMonthlyYen =
      budget.status === "out-of-range"
        ? null
        : member.role === "self"
          ? budget.summary.self.expenseYen
          : budget.summary.partner.expenseYen;
    return overviewForMember(
      state,
      member,
      livingExpenseMonthlyYen,
      referenceDate,
      warnings,
      rules,
    );
  });
  const aggregate = (
    selector: (member: OverviewMemberResult) => number | null,
  ): number | null => nullableSum(members.map(selector));
  const householdAggregate = (
    field: string,
    selector: (member: OverviewMemberResult) => number | null,
  ): number | null => {
    const values = members.map(selector);
    const total = aggregate(selector);
    if (values.every((value) => value !== null) && total === null) {
      warnings.push(
        warning(
          "household",
          "overview",
          "household",
          `${field}-out-of-range`,
          "blocking",
          "世帯集計が対応範囲を超えました。",
        ),
      );
    }
    return total;
  };
  const household: OverviewHouseholdResult = {
    grossMonthlyYen: householdAggregate(
      "gross",
      (member) => member.grossMonthlyYen,
    ),
    takeHomeMonthlyYen: householdAggregate(
      "take-home",
      (member) => member.takeHomeMonthlyYen,
    ),
    livingExpenseMonthlyYen: householdAggregate(
      "living-expense",
      (member) => member.livingExpenseMonthlyYen,
    ),
    afterLivingExpenseYen: householdAggregate(
      "after-living",
      (member) => member.afterLivingExpenseYen,
    ),
    nisaContributionYen: householdAggregate(
      "nisa-contribution",
      (member) => member.nisa.currentMonthContributionYen,
    ),
    idecoContributionYen: householdAggregate(
      "ideco-contribution",
      (member) => member.ideco.currentMonthContributionYen,
    ),
    investmentContributionYen: householdAggregate(
      "investment-contribution",
      (member) => member.investmentContributionYen,
    ),
    afterInvestmentYen: householdAggregate(
      "after-investment",
      (member) => member.afterInvestmentYen,
    ),
    projectedPrincipalYen: householdAggregate(
      "projected-principal",
      (member) => member.projectedPrincipalYen,
    ),
    projectedBalanceYen: householdAggregate(
      "projected-balance",
      (member) => member.projectedBalanceYen,
    ),
    projectedGainYen: householdAggregate(
      "projected-gain",
      (member) => member.projectedGainYen,
    ),
    realValueYen: householdAggregate(
      "real-value",
      (member) => member.realValueYen,
    ),
  };
  if (
    household.afterLivingExpenseYen !== null &&
    household.afterLivingExpenseYen < 0
  )
    warnings.push(
      warning(
        "household",
        "budget",
        "household",
        "after-living-negative",
        "overspent",
        "世帯の生活費差引後の金額がマイナスです。",
      ),
    );
  if (household.afterInvestmentYen !== null && household.afterInvestmentYen < 0)
    warnings.push(
      warning(
        "household",
        "overview",
        "household",
        "after-investment-negative",
        "overspent",
        "世帯の投資差引後の金額がマイナスです。",
      ),
    );

  const uniqueWarnings = new Map<string, OverviewWarning>();
  for (const item of warnings)
    if (!uniqueWarnings.has(item.key)) uniqueWarnings.set(item.key, item);
  const uniqueRules = new Map<string, OverviewRule>();
  for (const rule of rules)
    if (!uniqueRules.has(rule.key)) uniqueRules.set(rule.key, rule);
  return {
    referenceDate,
    referenceMonth: referenceDate.slice(0, 7),
    referenceYear: Number(referenceDate.slice(0, 4)),
    members,
    household,
    warnings: [...uniqueWarnings.values()].sort(
      (left, right) =>
        warningPriority[left.category] - warningPriority[right.category] ||
        left.key.localeCompare(right.key),
    ),
    rules: [...uniqueRules.values()].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
  };
}
