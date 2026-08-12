import {
  validateInvestmentScenario,
  type InvestmentScenario,
  type ContributionTiming,
} from "./nisa";
import {
  calculateIdecoAllowance,
  type EmployerPensionType,
  type IdecoParticipantCategory,
  type IdecoRule,
  type IdecoRuleContext,
} from "../rules/jp/ideco/rules";

export type IdecoResultStatus =
  | "complete"
  | "invalid"
  | "incomplete"
  | "unsupported"
  | "missing-rule"
  | "out-of-range";

export type IdecoProjectionTarget =
  { type: "month"; month: string } | { type: "receipt-age"; age: number };

export interface IdecoTaxContributionSnapshot {
  taxYear: number;
  paidThroughMonth: string;
  paidYen: number;
}

export interface IdecoCalculationReference {
  referenceDate: string | null;
  taxYear?: number;
}

export interface IdecoPlan extends IdecoRuleContext {
  id: string;
  memberId: string;
  startMonth: string;
  contributionMode: "monthly-fixed";
  annualUnitContributionActive: boolean | null;
  monthlyContributionYen: number | null;
  currentBalanceYen: number | null;
  currentContributionTotalYen: number | null;
  monthlyFeeYen: number | null;
  projectionTarget: IdecoProjectionTarget;
  contributionTiming: ContributionTiming;
  activeScenarioId: string;
  active: boolean;
  taxContributionSnapshots: IdecoTaxContributionSnapshot[];
}

export interface IdecoProjectionResult {
  status: IdecoResultStatus;
  rule: IdecoRule | null;
  targetMonth: string | null;
  allowedContributionYen: number | null;
  enteredContributionYen: number | null;
  exceededByYen: number | null;
  affectedMonth: string | null;
  annualPaidContributionYen: number | null;
  projectedPrincipalYen: number | null;
  projectedBalanceYen: number | null;
  projectedGainYen: number | null;
  realValueYen: number | null;
  residentTaxBenefitFromIdecoYen: null;
  totalTaxBenefitYen: null;
  effectiveAnnualIdecoCostYen: null;
  messages: string[];
  assumptions: string[];
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

function nullableSafeYen(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`${field} must be a non-negative safe integer or null`);
  return value;
}

export function assertYearMonth(value: string, field: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    throw new Error(`${field} must be YYYY-MM`);
}

function monthNumber(value: string): number {
  assertYearMonth(value, "month");
  const [year, month] = value.split("-").map(Number);
  return (year ?? 0) * 12 + (month ?? 1) - 1;
}

function monthText(value: number): string {
  const year = Math.floor(value / 12);
  return `${String(year).padStart(4, "0")}-${String((value % 12) + 1).padStart(2, "0")}`;
}

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value))
    throw new Error(`${field} must be YYYY-MM-DD`);
  const [year, month, day] = value.split("-").map(Number);
  const normalized = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  )
    throw new Error(`${field} must be a real calendar date`);
}

function lastCompletedPaymentMonth(referenceDate: string): number {
  assertIsoDate(referenceDate, "referenceDate");
  const month = monthNumber(referenceDate.slice(0, 7));
  return Number(referenceDate.slice(8, 10)) >= 26 ? month : month - 1;
}

function nullableBoolean(value: unknown, field: string): boolean | null {
  if (value === null) return null;
  if (typeof value !== "boolean")
    throw new Error(`${field} must be boolean or null`);
  return value;
}

const participantCategories = new Set<IdecoParticipantCategory>([
  "category1",
  "category2",
  "category3",
  "category4",
  "category5",
]);
const employerPensionTypes = new Set<EmployerPensionType>([
  "none",
  "corporate-dc",
  "db-or-other",
  "corporate-dc-and-db-or-other",
]);

export function parseIdecoPlan(value: unknown): IdecoPlan {
  if (!isRecord(value)) throw new Error("iDeCo plan must be an object");
  if (
    value.participantCategory !== null &&
    !participantCategories.has(
      value.participantCategory as IdecoParticipantCategory,
    )
  )
    throw new Error("participantCategory is invalid");
  if (
    value.employerPensionType !== null &&
    !employerPensionTypes.has(value.employerPensionType as EmployerPensionType)
  )
    throw new Error("employerPensionType is invalid");
  if (value.contributionMode !== "monthly-fixed")
    throw new Error("contributionMode is invalid");
  if (
    value.contributionTiming !== "beginning" &&
    value.contributionTiming !== "end"
  )
    throw new Error("contributionTiming is invalid");
  if (!isRecord(value.projectionTarget))
    throw new Error("projectionTarget is required");
  let projectionTarget: IdecoProjectionTarget;
  if (value.projectionTarget.type === "month") {
    projectionTarget = {
      type: "month",
      month: requiredString(value.projectionTarget, "month"),
    };
  } else if (value.projectionTarget.type === "receipt-age") {
    if (
      typeof value.projectionTarget.age !== "number" ||
      !Number.isSafeInteger(value.projectionTarget.age)
    )
      throw new Error("receipt age is invalid");
    projectionTarget = { type: "receipt-age", age: value.projectionTarget.age };
  } else throw new Error("projectionTarget type is invalid");
  if (!Array.isArray(value.taxContributionSnapshots))
    throw new Error("taxContributionSnapshots must be an array");
  const plan: IdecoPlan = {
    id: requiredString(value, "id"),
    memberId: requiredString(value, "memberId"),
    participantCategory:
      value.participantCategory as IdecoParticipantCategory | null,
    participantCategoryConfirmed:
      typeof value.participantCategoryConfirmed === "boolean"
        ? value.participantCategoryConfirmed
        : (() => {
            throw new Error("participantCategoryConfirmed must be boolean");
          })(),
    employerPensionType:
      value.employerPensionType as EmployerPensionType | null,
    employerDcContributionYen: nullableSafeYen(
      value.employerDcContributionYen,
      "employerDcContributionYen",
    ),
    otherPensionEquivalentYen: nullableSafeYen(
      value.otherPensionEquivalentYen,
      "otherPensionEquivalentYen",
    ),
    nationalPensionFundContributionYen: nullableSafeYen(
      value.nationalPensionFundContributionYen,
      "nationalPensionFundContributionYen",
    ),
    nationalPensionAdditionalPremiumYen: nullableSafeYen(
      value.nationalPensionAdditionalPremiumYen,
      "nationalPensionAdditionalPremiumYen",
    ),
    matchingContributionActive: nullableBoolean(
      value.matchingContributionActive,
      "matchingContributionActive",
    ),
    idecoPlusActive: nullableBoolean(value.idecoPlusActive, "idecoPlusActive"),
    startMonth: requiredString(value, "startMonth"),
    contributionMode: "monthly-fixed",
    annualUnitContributionActive: nullableBoolean(
      value.annualUnitContributionActive,
      "annualUnitContributionActive",
    ),
    monthlyContributionYen: nullableSafeYen(
      value.monthlyContributionYen,
      "monthlyContributionYen",
    ),
    currentBalanceYen: nullableSafeYen(
      value.currentBalanceYen,
      "currentBalanceYen",
    ),
    currentContributionTotalYen: nullableSafeYen(
      value.currentContributionTotalYen,
      "currentContributionTotalYen",
    ),
    monthlyFeeYen: nullableSafeYen(value.monthlyFeeYen, "monthlyFeeYen"),
    projectionTarget,
    contributionTiming: value.contributionTiming,
    activeScenarioId: requiredString(value, "activeScenarioId"),
    active:
      typeof value.active === "boolean"
        ? value.active
        : (() => {
            throw new Error("active must be boolean");
          })(),
    taxContributionSnapshots: value.taxContributionSnapshots.map((snapshot) => {
      if (!isRecord(snapshot))
        throw new Error("tax snapshot must be an object");
      if (
        typeof snapshot.taxYear !== "number" ||
        !Number.isSafeInteger(snapshot.taxYear) ||
        snapshot.taxYear < 1900 ||
        snapshot.taxYear > 9999
      )
        throw new Error("tax snapshot year is invalid");
      const paidYen = nullableSafeYen(snapshot.paidYen, "paidYen");
      if (paidYen === null) throw new Error("paidYen must not be null");
      return {
        taxYear: snapshot.taxYear,
        paidThroughMonth: requiredString(snapshot, "paidThroughMonth"),
        paidYen,
      };
    }),
  };
  validateIdecoPlan(plan);
  return plan;
}

export function validateIdecoPlan(plan: IdecoPlan): void {
  if (!plan.id || !plan.memberId || !plan.activeScenarioId)
    throw new Error("iDeCo plan identity is required");
  assertYearMonth(plan.startMonth, "startMonth");
  if (
    plan.participantCategory !== null &&
    !participantCategories.has(plan.participantCategory)
  )
    throw new Error("participantCategory is invalid");
  if (typeof plan.participantCategoryConfirmed !== "boolean")
    throw new Error("participantCategoryConfirmed must be boolean");
  if (
    plan.employerPensionType !== null &&
    !employerPensionTypes.has(plan.employerPensionType)
  )
    throw new Error("employerPensionType is invalid");
  for (const [field, value] of Object.entries({
    matchingContributionActive: plan.matchingContributionActive,
    idecoPlusActive: plan.idecoPlusActive,
    annualUnitContributionActive: plan.annualUnitContributionActive,
  }))
    nullableBoolean(value, field);
  const contributionMode: unknown = plan.contributionMode;
  if (contributionMode !== "monthly-fixed")
    throw new Error("contributionMode is invalid");
  const contributionTiming: unknown = plan.contributionTiming;
  if (contributionTiming !== "beginning" && contributionTiming !== "end")
    throw new Error("contributionTiming is invalid");
  if (typeof plan.active !== "boolean")
    throw new Error("active must be boolean");
  for (const [field, value] of Object.entries({
    employerDcContributionYen: plan.employerDcContributionYen,
    otherPensionEquivalentYen: plan.otherPensionEquivalentYen,
    nationalPensionFundContributionYen: plan.nationalPensionFundContributionYen,
    nationalPensionAdditionalPremiumYen:
      plan.nationalPensionAdditionalPremiumYen,
    monthlyContributionYen: plan.monthlyContributionYen,
    currentBalanceYen: plan.currentBalanceYen,
    currentContributionTotalYen: plan.currentContributionTotalYen,
    monthlyFeeYen: plan.monthlyFeeYen,
  }))
    nullableSafeYen(value, field);
  if (plan.projectionTarget.type === "month") {
    assertYearMonth(plan.projectionTarget.month, "projection target month");
    if (monthNumber(plan.projectionTarget.month) < monthNumber(plan.startMonth))
      throw new Error("iDeCo projection target precedes start month");
    if (
      monthNumber(plan.projectionTarget.month) - monthNumber(plan.startMonth) >=
      1_200
    )
      throw new Error("iDeCo projection exceeds 100 years");
  } else if (
    !Number.isSafeInteger(plan.projectionTarget.age) ||
    plan.projectionTarget.age < 1 ||
    plan.projectionTarget.age > 120
  )
    throw new Error("receipt age is invalid");
  const years = new Set<number>();
  for (const snapshot of plan.taxContributionSnapshots) {
    if (years.has(snapshot.taxYear))
      throw new Error("tax snapshot years must be unique");
    years.add(snapshot.taxYear);
    assertYearMonth(snapshot.paidThroughMonth, "paidThroughMonth");
    if (Number(snapshot.paidThroughMonth.slice(0, 4)) !== snapshot.taxYear)
      throw new Error("paidThroughMonth must be within taxYear");
    if (
      plan.projectionTarget.type === "month" &&
      monthNumber(snapshot.paidThroughMonth) >
        monthNumber(plan.projectionTarget.month) + 1
    )
      throw new Error("paidThroughMonth exceeds the plan payment horizon");
    nullableSafeYen(snapshot.paidYen, "paidYen");
    const possibleMonths = Math.max(
      0,
      monthNumber(snapshot.paidThroughMonth) - monthNumber(plan.startMonth),
    );
    if (
      plan.monthlyContributionYen !== null &&
      plan.currentContributionTotalYen !== null
    ) {
      const possible =
        plan.currentContributionTotalYen +
        possibleMonths * plan.monthlyContributionYen;
      if (!Number.isSafeInteger(possible) || snapshot.paidYen > possible)
        throw new Error(
          "tax snapshot paidYen is inconsistent with contribution history",
        );
    }
  }
}

export function createIdecoPlan(options: {
  id: string;
  memberId: string;
  activeScenarioId: string;
}): IdecoPlan {
  return {
    id: options.id,
    memberId: options.memberId,
    participantCategory: null,
    participantCategoryConfirmed: false,
    employerPensionType: null,
    employerDcContributionYen: null,
    otherPensionEquivalentYen: null,
    nationalPensionFundContributionYen: null,
    nationalPensionAdditionalPremiumYen: null,
    matchingContributionActive: null,
    idecoPlusActive: null,
    startMonth: "2026-08",
    contributionMode: "monthly-fixed",
    annualUnitContributionActive: null,
    monthlyContributionYen: null,
    currentBalanceYen: null,
    currentContributionTotalYen: null,
    monthlyFeeYen: null,
    projectionTarget: { type: "month", month: "2065-12" },
    contributionTiming: "end",
    activeScenarioId: options.activeScenarioId,
    active: true,
    taxContributionSnapshots: [],
  };
}

function targetMonth(
  plan: IdecoPlan,
  member: { birthDate?: string | undefined },
): string | null {
  if (plan.projectionTarget.type === "month")
    return plan.projectionTarget.month;
  if (!member.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(member.birthDate))
    return null;
  const year = Number(member.birthDate.slice(0, 4)) + plan.projectionTarget.age;
  return `${String(year).padStart(4, "0")}-${member.birthDate.slice(5, 7)}`;
}

function safeRound(value: number, field: string): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || !Number.isSafeInteger(rounded))
    throw new Error(`${field} is out of range`);
  return Math.max(0, rounded);
}

function empty(
  plan: IdecoPlan,
  status: IdecoResultStatus,
  messages: string[],
  rule: IdecoRule | null = null,
): IdecoProjectionResult {
  return {
    status,
    rule,
    targetMonth: null,
    allowedContributionYen: null,
    enteredContributionYen: plan.monthlyContributionYen,
    exceededByYen: null,
    affectedMonth: null,
    annualPaidContributionYen: null,
    projectedPrincipalYen: null,
    projectedBalanceYen: null,
    projectedGainYen: null,
    realValueYen: null,
    residentTaxBenefitFromIdecoYen: null,
    totalTaxBenefitYen: null,
    effectiveAnnualIdecoCostYen: null,
    messages,
    assumptions: [],
  };
}

export function calculateIdecoAnnualPaidContribution(
  plan: IdecoPlan,
  taxYear: number,
  referenceDate: string | null,
  projectionTargetMonth?: string,
): { status: IdecoResultStatus; amountYen: number | null; messages: string[] } {
  try {
    if (referenceDate === null)
      return {
        status: "incomplete",
        amountYen: null,
        messages: ["税計算の基準日を入力してください。"],
      };
    const confirmedThrough = lastCompletedPaymentMonth(referenceDate);
    if (plan.monthlyContributionYen === null)
      return {
        status: "incomplete",
        amountYen: null,
        messages: ["月額掛金が未入力です。"],
      };
    const contribution = plan.monthlyContributionYen;
    const firstPayment = monthNumber(plan.startMonth) + 1;
    const yearStart = monthNumber(`${String(taxYear)}-01`);
    const targetContributionMonth =
      projectionTargetMonth ??
      (plan.projectionTarget.type === "month"
        ? plan.projectionTarget.month
        : `${String(taxYear)}-12`);
    assertYearMonth(targetContributionMonth, "projectionTargetMonth");
    const yearEnd = Math.min(
      monthNumber(`${String(taxYear)}-12`),
      monthNumber(targetContributionMonth) + 1,
    );
    const snapshot = plan.taxContributionSnapshots.find(
      (item) => item.taxYear === taxYear,
    );
    const lastPastPayment = Math.min(yearEnd, confirmedThrough);
    if (snapshot && monthNumber(snapshot.paidThroughMonth) > lastPastPayment)
      return {
        status: "invalid",
        amountYen: null,
        messages: ["実払込スナップショットが税計算の基準日より未来です。"],
      };
    if (!snapshot && firstPayment <= lastPastPayment)
      return {
        status: "incomplete",
        amountYen: null,
        messages: ["税年の既払込額スナップショットを入力してください。"],
      };
    if (
      snapshot &&
      firstPayment <= lastPastPayment &&
      monthNumber(snapshot.paidThroughMonth) < lastPastPayment
    )
      return {
        status: "incomplete",
        amountYen: null,
        messages: ["基準日までの払込実績がスナップショットで確認できません。"],
      };
    let total = snapshot?.paidYen ?? 0;
    let cursor = Math.max(firstPayment, yearStart, confirmedThrough + 1);
    if (snapshot)
      cursor = Math.max(cursor, monthNumber(snapshot.paidThroughMonth) + 1);
    for (; cursor <= yearEnd; cursor += 1) {
      if (contribution > Number.MAX_SAFE_INTEGER - total)
        throw new Error("annual iDeCo contribution is out of range");
      total += contribution;
    }
    return { status: "complete", amountYen: total, messages: [] };
  } catch (error) {
    return {
      status: "out-of-range",
      amountYen: null,
      messages: [
        error instanceof Error
          ? error.message
          : "annual contribution is out of range",
      ],
    };
  }
}

export function calculateIdecoPlan(
  plan: IdecoPlan,
  scenario: InvestmentScenario | undefined,
  member: { active: boolean; birthDate?: string | undefined },
  reference: IdecoCalculationReference,
): IdecoProjectionResult {
  try {
    validateIdecoPlan(plan);
    if (!member.active)
      return empty(plan, "unsupported", ["無効な人物のiDeCo計画です。"]);
    if (plan.annualUnitContributionActive === null)
      return empty(plan, "incomplete", [
        "月別指定（年単位）拠出の利用有無を入力してください。",
      ]);
    if (plan.annualUnitContributionActive)
      return empty(plan, "unsupported", [
        "月別指定（年単位）拠出は今回のベータでは未対応です。",
      ]);
    const target = targetMonth(plan, member);
    if (!target)
      return empty(plan, "incomplete", [
        "受取年齢目標には生年月日が必要です。",
      ]);
    assertYearMonth(target, "targetMonth");
    if (monthNumber(target) < monthNumber(plan.startMonth))
      return empty(plan, "invalid", ["目標年月が開始年月より前です。"]);
    const allowance = calculateIdecoAllowance(plan.startMonth, plan);
    if (allowance.status !== "complete")
      return empty(plan, allowance.status, allowance.messages, allowance.rule);
    const rule = allowance.rule as IdecoRule;
    if (plan.monthlyContributionYen === null)
      return empty(
        plan,
        "incomplete",
        ["月額掛金を入力してください。0円も明示入力が必要です。"],
        rule,
      );
    const amount = plan.monthlyContributionYen;
    let affectedMonth: string | null = null;
    let affectedAllowed: number | null = null;
    for (
      let cursor = monthNumber(plan.startMonth);
      cursor <= monthNumber(target);
      cursor += 1
    ) {
      const month = monthText(cursor);
      const monthly = calculateIdecoAllowance(month, plan);
      if (monthly.status !== "complete")
        return {
          ...empty(plan, monthly.status, monthly.messages, monthly.rule),
          targetMonth: target,
          affectedMonth: month,
        };
      if (monthly.allowedContributionYen === null || monthly.rule === null)
        throw new Error(
          "complete iDeCo allowance is missing its rule or limit",
        );
      const allowed = monthly.allowedContributionYen;
      if (
        amount > allowed ||
        (amount > 0 &&
          (amount < monthly.rule.minimumContributionYen ||
            amount % monthly.rule.contributionUnitYen !== 0))
      ) {
        affectedMonth = month;
        affectedAllowed = allowed;
        break;
      }
    }
    if (affectedMonth !== null)
      return {
        ...empty(
          plan,
          "invalid",
          ["掛金が対象月の最低額・単位・上限に適合しません。"],
          rule,
        ),
        targetMonth: target,
        allowedContributionYen: affectedAllowed,
        exceededByYen:
          affectedAllowed !== null && amount > affectedAllowed
            ? amount - affectedAllowed
            : 0,
        affectedMonth,
      };
    if (
      plan.currentBalanceYen === null ||
      plan.currentContributionTotalYen === null ||
      plan.monthlyFeeYen === null
    )
      return empty(
        plan,
        "incomplete",
        ["現在残高・拠出元本累計・固定月額費用を明示入力してください。"],
        rule,
      );
    if (!scenario)
      return empty(
        plan,
        "incomplete",
        ["運用シナリオを選択してください。"],
        rule,
      );
    validateInvestmentScenario(scenario);
    if (
      scenario.annualReturnBasisPoints === null ||
      scenario.annualFeeBasisPoints === null ||
      scenario.annualInflationBasisPoints === null
    )
      return empty(
        plan,
        "incomplete",
        ["利回り・比率費用・インフレ率を明示入力してください。"],
        rule,
      );
    const annualPaid = calculateIdecoAnnualPaidContribution(
      plan,
      reference.taxYear ?? 2026,
      reference.referenceDate,
      target,
    );
    if (annualPaid.status !== "complete")
      return empty(plan, annualPaid.status, annualPaid.messages, rule);
    const annualReturn = scenario.annualReturnBasisPoints / 10_000;
    const annualFee = scenario.annualFeeBasisPoints / 10_000;
    const annualInflation = scenario.annualInflationBasisPoints / 10_000;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    const monthlyFee = Math.pow(1 + annualFee, 1 / 12) - 1;
    const netMonthlyFactor = (1 + monthlyReturn) / (1 + monthlyFee);
    const months = monthNumber(target) - monthNumber(plan.startMonth) + 1;
    if (months < 1 || months > 1_200)
      throw new Error("iDeCo projection period is out of range");
    const inflationFactor = Math.pow(1 + annualInflation, months / 12);
    if (
      ![monthlyReturn, monthlyFee, netMonthlyFactor, inflationFactor].every(
        Number.isFinite,
      ) ||
      netMonthlyFactor < 0 ||
      inflationFactor <= 0
    )
      throw new Error("iDeCo projection factor is out of range");
    let balance = plan.currentBalanceYen;
    let futureContributions = 0;
    for (let cursor = 0; cursor < months; cursor += 1) {
      balance =
        plan.contributionTiming === "beginning"
          ? (balance + amount) * netMonthlyFactor
          : balance * netMonthlyFactor + amount;
      balance = Math.max(0, balance - plan.monthlyFeeYen);
      futureContributions += amount;
      if (
        !Number.isFinite(balance) ||
        balance > Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(futureContributions)
      )
        throw new Error("iDeCo projection is out of range");
    }
    const projectedBalance = safeRound(balance, "projected balance");
    const principal = plan.currentContributionTotalYen + futureContributions;
    if (!Number.isSafeInteger(principal))
      throw new Error("iDeCo principal is out of range");
    const realValue = safeRound(
      projectedBalance / inflationFactor,
      "real value",
    );
    return {
      status: "complete",
      rule,
      targetMonth: target,
      allowedContributionYen: allowance.allowedContributionYen,
      enteredContributionYen: amount,
      exceededByYen: 0,
      affectedMonth: plan.startMonth,
      annualPaidContributionYen: annualPaid.amountYen,
      projectedPrincipalYen: principal,
      projectedBalanceYen: projectedBalance,
      projectedGainYen: projectedBalance - principal,
      realValueYen: realValue,
      residentTaxBenefitFromIdecoYen: null,
      totalTaxBenefitYen: null,
      effectiveAnnualIdecoCostYen: null,
      messages: [
        "iDeCoによる住民税軽減額は未計算です。",
        "想定残高はiDeCo受取時の税引前です。受取税額・受取資格は計算しません。",
      ],
      assumptions: [
        "固定月額費用は各月の掛金・運用処理後、月末に1回控除します。実際の徴収時期を保証しません。",
      ],
    };
  } catch (error) {
    return empty(plan, "out-of-range", [
      error instanceof Error
        ? error.message
        : "iDeCo calculation is out of range",
    ]);
  }
}
