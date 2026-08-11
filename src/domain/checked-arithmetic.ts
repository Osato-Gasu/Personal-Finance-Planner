import type { CycleUnit, ExpenseItem } from "./state";

export const AVERAGE_YEAR_DAYS = 365.2425;

export class CalculationRangeError extends Error {
  constructor(field: string) {
    super(`${field} exceeds the supported monetary range`);
    this.name = "CalculationRangeError";
  }
}

export function checkedNonNegativeAmount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new CalculationRangeError(field);
  }
  return value;
}

export function checkedAmountSum(
  left: number,
  right: number,
  field: string,
): number {
  checkedNonNegativeAmount(left, field);
  checkedNonNegativeAmount(right, field);
  if (right > Number.MAX_SAFE_INTEGER - left) {
    throw new CalculationRangeError(field);
  }
  return checkedNonNegativeAmount(left + right, field);
}

export function checkedIntegerSum(
  left: number,
  right: number,
  field: string,
): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new CalculationRangeError(field);
  }
  return result;
}

export function checkedIntegerDifference(
  left: number,
  right: number,
  field: string,
): number {
  const result = left - right;
  if (!Number.isSafeInteger(result)) throw new CalculationRangeError(field);
  return result;
}

export function checkedRound(value: number, field: string): number {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded) || rounded < 0) {
    throw new CalculationRangeError(field);
  }
  return rounded;
}

export function checkedShare(
  total: number,
  basisPoints: number,
  field: string,
): number {
  return checkedNonNegativeAmount(total * (basisPoints / 10_000), field);
}

export function monthlyExpenseYen(item: Readonly<ExpenseItem>): number {
  if (
    !Number.isSafeInteger(item.amountYen) ||
    item.amountYen < 0 ||
    !Number.isSafeInteger(item.cycleValue) ||
    item.cycleValue < 1 ||
    !Number.isSafeInteger(item.occurrencesPerCycle) ||
    item.occurrencesPerCycle < 1 ||
    !["day", "week", "month", "year"].includes(item.cycleUnit)
  ) {
    throw new CalculationRangeError("monthly expense input");
  }
  const monthlyPeriods: Record<CycleUnit, number> = {
    day: AVERAGE_YEAR_DAYS / 12 / item.cycleValue,
    week: AVERAGE_YEAR_DAYS / 84 / item.cycleValue,
    month: 1 / item.cycleValue,
    year: 1 / 12 / item.cycleValue,
  };
  const multiplier = item.occurrencesPerCycle * monthlyPeriods[item.cycleUnit];
  if (
    !Number.isFinite(multiplier) ||
    (item.amountYen !== 0 &&
      multiplier > Number.MAX_SAFE_INTEGER / item.amountYen)
  ) {
    throw new CalculationRangeError("monthly expense");
  }
  return checkedNonNegativeAmount(
    item.amountYen * multiplier,
    "monthly expense",
  );
}

export function monthlyExpenseYenOrNull(
  item: Readonly<ExpenseItem>,
): number | null {
  try {
    return monthlyExpenseYen(item);
  } catch (error) {
    if (error instanceof CalculationRangeError) return null;
    throw error;
  }
}
