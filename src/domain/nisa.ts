import {
  resolveAdultNisaRule,
  type AdultNisaRule,
} from "../rules/jp/nisa/rules-2024";

export type NisaBucket = "tsumitate" | "growth";
export type ContributionTiming = "beginning" | "end";
export type ScenarioKind = "bear" | "standard" | "bull";

export interface ScheduledNisaContribution {
  id: string;
  month: string;
  bucket: NisaBucket;
  amountYen: number;
}

export interface InvestmentScenario {
  id: string;
  memberId: string;
  kind: ScenarioKind;
  annualReturnBasisPoints: number | null;
  annualFeeBasisPoints: number | null;
  annualInflationBasisPoints: number | null;
}

export interface NisaPlan {
  id: string;
  memberId: string;
  japanResidentConfirmed: boolean;
  startMonth: string;
  targetMonth: string;
  currentBalanceYen: number;
  currentBookValueYen: number;
  usedLimitYen: number;
  usedGrowthLimitYen: number;
  monthlyTsumitateYen: number;
  monthlyGrowthYen: number;
  additionalPurchases: ScheduledNisaContribution[];
  contributionTiming: ContributionTiming;
  activeScenarioId: string;
  active: boolean;
}

export type NisaResultStatus =
  | "complete"
  | "invalid"
  | "incomplete"
  | "unsupported"
  | "missing-rule"
  | "out-of-range";

export interface NisaLimitIssue {
  code:
    | "annual-tsumitate"
    | "annual-growth"
    | "annual-combined"
    | "lifetime-total"
    | "lifetime-growth";
  year: number | null;
  exceededByYen: number;
}

export interface NisaProjectionResult {
  status: NisaResultStatus;
  rule: AdultNisaRule | null;
  assumptions: {
    annualReturnBasisPoints: number;
    annualFeeBasisPoints: number;
    annualInflationBasisPoints: number;
  } | null;
  annualContributions: Readonly<
    Record<string, { tsumitateYen: number; growthYen: number }>
  >;
  futureContributionsYen: number | null;
  futureGrowthContributionsYen: number | null;
  projectedPrincipalYen: number | null;
  projectedBalanceYen: number | null;
  projectedGainYen: number | null;
  realValueYen: number | null;
  lifetimeRemainingYen: number | null;
  lifetimeGrowthRemainingYen: number | null;
  issues: NisaLimitIssue[];
  messages: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`${key} must be a non-empty string`);
  return value;
}

export function parseInvestmentScenario(value: unknown): InvestmentScenario {
  if (!isRecord(value)) throw new Error("scenario must be an object");
  if (
    value.kind !== "bear" &&
    value.kind !== "standard" &&
    value.kind !== "bull"
  )
    throw new Error("scenario kind is invalid");
  const parsed: InvestmentScenario = {
    id: requiredString(value, "id"),
    memberId: requiredString(value, "memberId"),
    kind: value.kind,
    annualReturnBasisPoints: value.annualReturnBasisPoints as number | null,
    annualFeeBasisPoints: value.annualFeeBasisPoints as number | null,
    annualInflationBasisPoints: value.annualInflationBasisPoints as
      number | null,
  };
  validateInvestmentScenario(parsed);
  return parsed;
}

export function parseNisaPlan(value: unknown): NisaPlan {
  if (!isRecord(value)) throw new Error("NISA plan must be an object");
  if (
    value.contributionTiming !== "beginning" &&
    value.contributionTiming !== "end"
  )
    throw new Error("contribution timing is invalid");
  if (!Array.isArray(value.additionalPurchases))
    throw new Error("additionalPurchases must be an array");
  const parsed: NisaPlan = {
    id: requiredString(value, "id"),
    memberId: requiredString(value, "memberId"),
    japanResidentConfirmed: value.japanResidentConfirmed as boolean,
    startMonth: requiredString(value, "startMonth"),
    targetMonth: requiredString(value, "targetMonth"),
    currentBalanceYen: value.currentBalanceYen as number,
    currentBookValueYen: value.currentBookValueYen as number,
    usedLimitYen: value.usedLimitYen as number,
    usedGrowthLimitYen: value.usedGrowthLimitYen as number,
    monthlyTsumitateYen: value.monthlyTsumitateYen as number,
    monthlyGrowthYen: value.monthlyGrowthYen as number,
    additionalPurchases: value.additionalPurchases.map((item) => {
      if (!isRecord(item))
        throw new Error("additional purchase must be an object");
      if (item.bucket !== "tsumitate" && item.bucket !== "growth")
        throw new Error("additional purchase bucket is invalid");
      return {
        id: requiredString(item, "id"),
        month: requiredString(item, "month"),
        bucket: item.bucket,
        amountYen: item.amountYen as number,
      };
    }),
    contributionTiming: value.contributionTiming,
    activeScenarioId: requiredString(value, "activeScenarioId"),
    active: value.active as boolean,
  };
  if (typeof parsed.active !== "boolean")
    throw new Error("NISA plan active must be boolean");
  validateNisaPlan(parsed);
  return parsed;
}

function assertSafeYen(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`${field} must be a non-negative safe integer`);
}

function assertYearMonth(value: string, field: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    throw new Error(`${field} must be YYYY-MM`);
}

function monthNumber(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return (year ?? 0) * 12 + (month ?? 1) - 1;
}

function monthText(value: number): string {
  const year = Math.floor(value / 12);
  return `${String(year).padStart(4, "0")}-${String((value % 12) + 1).padStart(2, "0")}`;
}

export function validateInvestmentScenario(scenario: InvestmentScenario): void {
  if (!scenario.id || !scenario.memberId)
    throw new Error("scenario identity is required");
  if (!["bear", "standard", "bull"].includes(scenario.kind))
    throw new Error("scenario kind is invalid");
  for (const [field, value] of Object.entries({
    annualReturnBasisPoints: scenario.annualReturnBasisPoints,
    annualFeeBasisPoints: scenario.annualFeeBasisPoints,
    annualInflationBasisPoints: scenario.annualInflationBasisPoints,
  })) {
    if (
      value !== null &&
      (!Number.isSafeInteger(value) || !Number.isFinite(value))
    )
      throw new Error(`${field} must be an integer or null`);
  }
  if (
    scenario.annualReturnBasisPoints !== null &&
    scenario.annualReturnBasisPoints < -10_000
  )
    throw new Error("annual return must not be below -100%");
  if (
    scenario.annualFeeBasisPoints !== null &&
    scenario.annualFeeBasisPoints < 0
  )
    throw new Error("annual fee must be non-negative");
  if (
    scenario.annualInflationBasisPoints !== null &&
    scenario.annualInflationBasisPoints <= -10_000
  )
    throw new Error("annual inflation must be above -100%");
}

export function validateNisaPlan(plan: NisaPlan): void {
  if (!plan.id || !plan.memberId || !plan.activeScenarioId)
    throw new Error("NISA plan identity is required");
  if (typeof plan.japanResidentConfirmed !== "boolean")
    throw new Error("japanResidentConfirmed must be boolean");
  assertYearMonth(plan.startMonth, "startMonth");
  assertYearMonth(plan.targetMonth, "targetMonth");
  if (plan.startMonth > plan.targetMonth)
    throw new Error("NISA plan period is invalid");
  if (monthNumber(plan.targetMonth) - monthNumber(plan.startMonth) >= 1_200)
    throw new Error("NISA plan period exceeds 100 years");
  for (const [field, value] of Object.entries({
    currentBalanceYen: plan.currentBalanceYen,
    currentBookValueYen: plan.currentBookValueYen,
    usedLimitYen: plan.usedLimitYen,
    usedGrowthLimitYen: plan.usedGrowthLimitYen,
    monthlyTsumitateYen: plan.monthlyTsumitateYen,
    monthlyGrowthYen: plan.monthlyGrowthYen,
  }))
    assertSafeYen(value, field);
  if (plan.usedGrowthLimitYen > plan.usedLimitYen)
    throw new Error("growth limit use cannot exceed total limit use");
  const contributionTiming: unknown = plan.contributionTiming;
  if (contributionTiming !== "beginning" && contributionTiming !== "end")
    throw new Error("contribution timing is invalid");
  const ids = new Set<string>();
  for (const purchase of plan.additionalPurchases) {
    if (!purchase.id || ids.has(purchase.id))
      throw new Error("additional purchase IDs must be unique");
    ids.add(purchase.id);
    assertYearMonth(purchase.month, "additional purchase month");
    if (purchase.month < plan.startMonth || purchase.month > plan.targetMonth)
      throw new Error("additional purchase is outside the plan period");
    const bucket: unknown = purchase.bucket;
    if (bucket !== "tsumitate" && bucket !== "growth")
      throw new Error("additional purchase bucket is invalid");
    assertSafeYen(purchase.amountYen, "additional purchase amountYen");
  }
}

function ageOnJanuaryFirst(birthDate: string, year: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  if (
    birthYear === undefined ||
    birthMonth === undefined ||
    birthDay === undefined
  )
    return null;
  const calendarDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (
    calendarDate.getUTCFullYear() !== birthYear ||
    calendarDate.getUTCMonth() + 1 !== birthMonth ||
    calendarDate.getUTCDate() !== birthDay
  )
    return null;
  return year - birthYear - (birthDate.slice(5) > "01-01" ? 1 : 0);
}

function safeRound(value: number): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || !Number.isSafeInteger(rounded))
    throw new Error("NISA result exceeds the supported range");
  return Math.max(0, rounded);
}

export function calculateNisaPlan(
  plan: NisaPlan,
  scenario: InvestmentScenario | undefined,
  member: { birthDate?: string | undefined; active: boolean },
): NisaProjectionResult {
  const empty = (
    status: NisaResultStatus,
    messages: string[],
    rule: AdultNisaRule | null = null,
  ): NisaProjectionResult => ({
    status,
    rule,
    assumptions: null,
    annualContributions: {},
    futureContributionsYen: null,
    futureGrowthContributionsYen: null,
    projectedPrincipalYen: null,
    projectedBalanceYen: null,
    projectedGainYen: null,
    realValueYen: null,
    lifetimeRemainingYen: null,
    lifetimeGrowthRemainingYen: null,
    issues: [],
    messages,
  });
  try {
    validateNisaPlan(plan);
    if (!member.active)
      return empty("unsupported", ["無効な人物のNISA計画です。"]);
    const startYear = Number(plan.startMonth.slice(0, 4));
    const rule = resolveAdultNisaRule(`${String(startYear)}-01-01`);
    if (!rule)
      return empty("missing-rule", ["対象年のNISA ruleがありません。"]);
    if (!member.birthDate)
      return empty("incomplete", ["生年月日を入力してください。"], rule);
    if (!plan.japanResidentConfirmed)
      return empty(
        "incomplete",
        ["日本国内の居住者であることを確認してください。"],
        rule,
      );
    const age = ageOnJanuaryFirst(member.birthDate, startYear);
    if (age === null)
      return empty("incomplete", ["生年月日が不正です。"], rule);
    if (age < rule.minimumAgeOnJanuaryFirst)
      return empty(
        "unsupported",
        ["対象年1月1日時点18歳未満には成人NISA ruleを適用しません。"],
        rule,
      );
    if (!scenario)
      return empty(
        "incomplete",
        ["利用するシナリオを選択してください。"],
        rule,
      );
    validateInvestmentScenario(scenario);
    if (
      scenario.annualReturnBasisPoints === null ||
      scenario.annualFeeBasisPoints === null ||
      scenario.annualInflationBasisPoints === null
    )
      return empty(
        "incomplete",
        ["利回り・費用率・インフレ率を明示入力してください。"],
        rule,
      );

    const start = monthNumber(plan.startMonth);
    const target = monthNumber(plan.targetMonth);
    const annual: Record<string, { tsumitateYen: number; growthYen: number }> =
      {};
    const purchases = new Map<string, { tsumitate: number; growth: number }>();
    for (const purchase of plan.additionalPurchases) {
      const entry = purchases.get(purchase.month) ?? {
        tsumitate: 0,
        growth: 0,
      };
      entry[purchase.bucket] += purchase.amountYen;
      purchases.set(purchase.month, entry);
    }
    let futureTotal = 0;
    let futureGrowth = 0;
    for (let cursor = start; cursor <= target; cursor += 1) {
      const month = monthText(cursor);
      const year = month.slice(0, 4);
      const extra = purchases.get(month) ?? { tsumitate: 0, growth: 0 };
      const tsumitate = plan.monthlyTsumitateYen + extra.tsumitate;
      const growth = plan.monthlyGrowthYen + extra.growth;
      const entry = annual[year] ?? { tsumitateYen: 0, growthYen: 0 };
      entry.tsumitateYen += tsumitate;
      entry.growthYen += growth;
      annual[year] = entry;
      futureTotal += tsumitate + growth;
      futureGrowth += growth;
      if (
        ![entry.tsumitateYen, entry.growthYen, futureTotal, futureGrowth].every(
          Number.isSafeInteger,
        )
      )
        throw new Error("NISA contribution exceeds the supported range");
    }
    const issues: NisaLimitIssue[] = [];
    for (const [year, value] of Object.entries(annual)) {
      const combined = value.tsumitateYen + value.growthYen;
      if (value.tsumitateYen > rule.annualTsumitateLimitYen)
        issues.push({
          code: "annual-tsumitate",
          year: Number(year),
          exceededByYen: value.tsumitateYen - rule.annualTsumitateLimitYen,
        });
      if (value.growthYen > rule.annualGrowthLimitYen)
        issues.push({
          code: "annual-growth",
          year: Number(year),
          exceededByYen: value.growthYen - rule.annualGrowthLimitYen,
        });
      if (combined > rule.annualCombinedLimitYen)
        issues.push({
          code: "annual-combined",
          year: Number(year),
          exceededByYen: combined - rule.annualCombinedLimitYen,
        });
    }
    const lifetimeTotal = plan.usedLimitYen + futureTotal;
    const lifetimeGrowth = plan.usedGrowthLimitYen + futureGrowth;
    if (
      !Number.isSafeInteger(lifetimeTotal) ||
      !Number.isSafeInteger(lifetimeGrowth)
    )
      throw new Error("NISA lifetime use exceeds the supported range");
    if (lifetimeTotal > rule.lifetimeTotalLimitYen)
      issues.push({
        code: "lifetime-total",
        year: null,
        exceededByYen: lifetimeTotal - rule.lifetimeTotalLimitYen,
      });
    if (lifetimeGrowth > rule.lifetimeGrowthLimitYen)
      issues.push({
        code: "lifetime-growth",
        year: null,
        exceededByYen: lifetimeGrowth - rule.lifetimeGrowthLimitYen,
      });

    const annualReturn = scenario.annualReturnBasisPoints / 10_000;
    const annualFee = scenario.annualFeeBasisPoints / 10_000;
    const annualInflation = scenario.annualInflationBasisPoints / 10_000;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    const monthlyFee = Math.pow(1 + annualFee, 1 / 12) - 1;
    const monthlyFactor = (1 + monthlyReturn) / (1 + monthlyFee);
    let balance = plan.currentBalanceYen;
    for (let cursor = start; cursor <= target; cursor += 1) {
      const month = monthText(cursor);
      const extra = purchases.get(month) ?? { tsumitate: 0, growth: 0 };
      const contribution =
        plan.monthlyTsumitateYen +
        plan.monthlyGrowthYen +
        extra.tsumitate +
        extra.growth;
      balance =
        plan.contributionTiming === "beginning"
          ? (balance + contribution) * monthlyFactor
          : balance * monthlyFactor + contribution;
      if (!Number.isFinite(balance) || balance > Number.MAX_SAFE_INTEGER)
        throw new Error("NISA projection exceeds the supported range");
      balance = Math.max(0, balance);
    }
    const projectedBalanceYen = safeRound(balance);
    const principal = plan.currentBookValueYen + futureTotal;
    if (!Number.isSafeInteger(principal))
      throw new Error("NISA principal exceeds the supported range");
    const months = target - start + 1;
    const realValue = safeRound(
      projectedBalanceYen / Math.pow(1 + annualInflation, months / 12),
    );
    return {
      status: issues.length > 0 ? "invalid" : "complete",
      rule,
      assumptions: {
        annualReturnBasisPoints: scenario.annualReturnBasisPoints,
        annualFeeBasisPoints: scenario.annualFeeBasisPoints,
        annualInflationBasisPoints: scenario.annualInflationBasisPoints,
      },
      annualContributions: annual,
      futureContributionsYen: futureTotal,
      futureGrowthContributionsYen: futureGrowth,
      projectedPrincipalYen: principal,
      projectedBalanceYen,
      projectedGainYen: projectedBalanceYen - principal,
      realValueYen: realValue,
      lifetimeRemainingYen: rule.lifetimeTotalLimitYen - lifetimeTotal,
      lifetimeGrowthRemainingYen: rule.lifetimeGrowthLimitYen - lifetimeGrowth,
      issues,
      messages:
        issues.length > 0
          ? ["制度枠を超過しています。入力値は変更していません。"]
          : [],
    };
  } catch (error) {
    return empty("out-of-range", [
      error instanceof Error ? error.message : "NISA計算に失敗しました。",
    ]);
  }
}
