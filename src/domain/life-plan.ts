import { selectOverview } from "./overview";
import type { AppState, LifePlanEvent } from "./state";

export type LifePlanStatus = "complete" | "incomplete" | "out-of-range";

export interface LifePlanYearResult {
  year: number;
  openingLiquidAssetsYen: number;
  baseAnnualCashflowYen: number;
  eventIncomeYen: number;
  eventExpenseYen: number;
  closingLiquidAssetsYen: number;
}

export interface LifePlanWarning {
  code:
    | "settings-required"
    | "upstream-incomplete"
    | "arithmetic-out-of-range"
    | "negative-liquid-assets";
  message: string;
  route: "life-plan" | "overview" | "budget" | "take-home" | "investments";
}

export interface LifePlanResult {
  status: LifePlanStatus;
  baseReferenceDate: string | null;
  baseReferenceMonth: string | null;
  projectionStartYear: number | null;
  baseMonthlyCashflowYen: number | null;
  baseAnnualCashflowYen: number | null;
  years: readonly LifePlanYearResult[];
  firstNegativeYear: number | null;
  warnings: readonly LifePlanWarning[];
}

function resultBase(state: Readonly<AppState>): Omit<LifePlanResult, "status"> {
  return {
    baseReferenceDate: state.lifePlan.baseReferenceDate,
    baseReferenceMonth: state.lifePlan.baseReferenceDate?.slice(0, 7) ?? null,
    projectionStartYear: state.lifePlan.projectionStartYear,
    baseMonthlyCashflowYen: null,
    baseAnnualCashflowYen: null,
    years: [],
    firstNegativeYear: null,
    warnings: [],
  };
}

function safeAdd(left: number, right: number): number | null {
  const value = left + right;
  return Number.isSafeInteger(value) ? value : null;
}

export function annualizeMonthlyCashflowYen(monthlyYen: number): number | null {
  if (!Number.isSafeInteger(monthlyYen)) return null;
  const annual = monthlyYen * 12;
  return Number.isSafeInteger(annual) ? annual : null;
}

function activeInYear(event: Readonly<LifePlanEvent>, year: number): boolean {
  return event.active && event.startYear <= year && year <= event.endYear;
}

function sumEvents(
  events: readonly Readonly<LifePlanEvent>[],
  year: number,
  kind: LifePlanEvent["kind"],
): number | null {
  let total = 0;
  for (const event of events) {
    if (!activeInYear(event, year) || event.kind !== kind) continue;
    const next = safeAdd(total, event.annualAmountYen);
    if (next === null) return null;
    total = next;
  }
  return total;
}

function outOfRange(
  base: Omit<LifePlanResult, "status">,
  monthly: number | null,
  annual: number | null,
  years: readonly LifePlanYearResult[],
): LifePlanResult {
  return {
    ...base,
    status: "out-of-range",
    baseMonthlyCashflowYen: monthly,
    baseAnnualCashflowYen: annual,
    years,
    warnings: [
      ...base.warnings,
      {
        code: "arithmetic-out-of-range",
        message:
          "年次キャッシュフローが安全に計算できる金額範囲を超えました。入力額または投影期間を見直してください。",
        route: "life-plan",
      },
    ],
  };
}

export function selectLifePlan(state: Readonly<AppState>): LifePlanResult {
  const base = resultBase(state);
  const { baseReferenceDate, projectionStartYear } = state.lifePlan;
  if (baseReferenceDate === null || projectionStartYear === null) {
    return {
      ...base,
      status: "incomplete",
      warnings: [
        {
          code: "settings-required",
          message: "基準日と開始年を保存すると年間投影を計算できます。",
          route: "life-plan",
        },
      ],
    };
  }

  const overview = selectOverview(state, baseReferenceDate);
  const monthly = overview.household.afterInvestmentYen;
  if (monthly === null) {
    return {
      ...base,
      status: "incomplete",
      warnings: [
        {
          code: "upstream-incomplete",
          message:
            "基準日の投資後手残りを計算できません。総合サマリーの警告と各入力画面を確認してください。",
          route: "overview",
        },
      ],
    };
  }

  const annual = annualizeMonthlyCashflowYen(monthly);
  if (annual === null) return outOfRange(base, monthly, null, []);

  const rows: LifePlanYearResult[] = [];
  let opening = state.lifePlan.startingLiquidAssetsYen;
  let firstNegativeYear: number | null = null;
  for (let offset = 0; offset < state.lifePlan.projectionYears; offset += 1) {
    const year = projectionStartYear + offset;
    const income = sumEvents(state.lifePlan.events, year, "income");
    const expense = sumEvents(state.lifePlan.events, year, "expense");
    if (income === null || expense === null)
      return outOfRange(base, monthly, annual, rows);
    const afterBase = safeAdd(opening, annual);
    const afterIncome = afterBase === null ? null : safeAdd(afterBase, income);
    const closing =
      afterIncome === null ? null : safeAdd(afterIncome, -expense);
    if (closing === null) return outOfRange(base, monthly, annual, rows);
    rows.push({
      year,
      openingLiquidAssetsYen: opening,
      baseAnnualCashflowYen: annual,
      eventIncomeYen: income,
      eventExpenseYen: expense,
      closingLiquidAssetsYen: closing,
    });
    if (closing < 0 && firstNegativeYear === null) firstNegativeYear = year;
    opening = closing;
  }

  const warnings: LifePlanWarning[] = [];
  if (firstNegativeYear !== null) {
    warnings.push({
      code: "negative-liquid-assets",
      message: `${String(firstNegativeYear)}年に現預金残高が初めてマイナスになります。`,
      route: "life-plan",
    });
  }
  return {
    ...base,
    status: "complete",
    baseMonthlyCashflowYen: monthly,
    baseAnnualCashflowYen: annual,
    years: rows,
    firstNegativeYear,
    warnings,
  };
}
