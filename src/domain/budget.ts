import { resolveIncomeTarget } from "./linked-value";
import {
  assertPositiveSafeInteger,
  assertSafeYen,
  type AppState,
  type BudgetCategory,
  type CycleUnit,
  type ExpenseItem,
  type HouseholdMember,
} from "./state";

export const AVERAGE_YEAR_DAYS = 365.2425;

export interface CategoryBudgetSummary {
  categoryId: string;
  name: string;
  householdExpenseYen: number;
  selfExpenseYen: number;
  partnerExpenseYen: number;
  householdSharePercent: number;
}

export interface MemberBudgetSummary {
  memberId: string;
  displayName: string;
  active: boolean;
  incomeYen: number | null;
  expenseYen: number;
  remainingYen: number | null;
  unresolvedIncome: boolean;
}

export interface BudgetSummary {
  mode: "detailed" | "simple";
  householdIncomeYen: number | null;
  householdExpenseYen: number;
  householdRemainingYen: number | null;
  spendingRatePercent: number | null;
  overspent: boolean | null;
  self: MemberBudgetSummary;
  partner: MemberBudgetSummary;
  categories: CategoryBudgetSummary[];
}

function assertFiniteSafeResult(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${field} exceeds the supported monetary range`);
  }
  return value;
}

export function monthlyExpenseYen(item: Readonly<ExpenseItem>): number {
  assertSafeYen(item.amountYen, "amountYen");
  assertPositiveSafeInteger(item.cycleValue, "cycleValue");
  assertPositiveSafeInteger(item.occurrencesPerCycle, "occurrencesPerCycle");
  const annualPeriods: Record<CycleUnit, number> = {
    day: AVERAGE_YEAR_DAYS / item.cycleValue,
    week: AVERAGE_YEAR_DAYS / 7 / item.cycleValue,
    month: 12 / item.cycleValue,
    year: 1 / item.cycleValue,
  };
  const annual =
    item.amountYen * item.occurrencesPerCycle * annualPeriods[item.cycleUnit];
  return assertFiniteSafeResult(annual / 12, "monthly expense");
}

export function formatFrequency(item: Readonly<ExpenseItem>): string {
  const units: Record<CycleUnit, string> = {
    day: "日",
    week: "週間",
    month: "か月",
    year: "年",
  };
  return `${String(item.cycleValue)}${units[item.cycleUnit]}あたり${String(item.occurrencesPerCycle)}回`;
}

export function effectiveSelfShareBasisPoints(
  state: Readonly<AppState>,
  item: Readonly<ExpenseItem>,
  category: Readonly<BudgetCategory>,
): number {
  if (item.scope === "self") return 10_000;
  if (item.scope === "partner") return 0;
  if (item.shareMode === "custom") {
    if (item.selfShareBasisPoints === undefined)
      throw new Error("item custom share is missing");
    return item.selfShareBasisPoints;
  }
  if (category.shareMode === "custom") {
    if (category.selfShareBasisPoints === undefined)
      throw new Error("category custom share is missing");
    return category.selfShareBasisPoints;
  }
  return state.budget.globalSelfShareBasisPoints;
}

function incomeForMember(
  state: Readonly<AppState>,
  member: Readonly<HouseholdMember>,
): { value: number | null; unresolved: boolean } {
  const target = state.incomeTargets.find(
    (candidate) => candidate.memberId === member.id,
  );
  if (!target) return { value: null, unresolved: true };
  const resolved = resolveIncomeTarget(state, target.id);
  if (resolved.status === "broken-link") {
    return { value: null, unresolved: true };
  }
  return { value: resolved.valueYen, unresolved: false };
}

interface UnroundedAllocation {
  total: number;
  self: number;
}

function allocate(
  total: number,
  scope: ExpenseItem["scope"],
  selfShareBasisPoints: number,
  partnerActive: boolean,
): UnroundedAllocation | null {
  if (!partnerActive && scope === "partner") return null;
  if (!partnerActive || scope === "self") return { total, self: total };
  if (scope === "partner") return { total, self: 0 };
  return { total, self: (total * selfShareBasisPoints) / 10_000 };
}

function roundSafe(value: number, field: string): number {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded))
    throw new Error(`${field} exceeds safe integer range`);
  return rounded;
}

export function calculateBudgetSummary(
  state: Readonly<AppState>,
): BudgetSummary {
  const selfMember = state.members.find((member) => member.role === "self");
  const partnerMember = state.members.find(
    (member) => member.role === "partner",
  );
  if (!selfMember || !partnerMember)
    throw new Error("household members are incomplete");
  const partnerActive = partnerMember.active;
  const categoryAllocations = new Map<
    string,
    { category: Readonly<BudgetCategory>; total: number; self: number }
  >();
  let householdUnrounded = 0;
  let selfUnrounded = 0;

  if (state.budget.mode === "simple") {
    const total = state.budget.simpleMonthlyExpenseYen;
    const allocation = allocate(
      total,
      "shared",
      state.budget.globalSelfShareBasisPoints,
      partnerActive,
    );
    if (!allocation) throw new Error("simple shared allocation is unavailable");
    householdUnrounded = allocation.total;
    selfUnrounded = allocation.self;
  } else {
    const categories = new Map(
      state.budget.categories.map((category) => [category.id, category]),
    );
    for (const item of state.budget.items) {
      const category = categories.get(item.categoryId);
      if (!item.active || !category?.active) continue;
      const monthly = monthlyExpenseYen(item);
      const allocation = allocate(
        monthly,
        item.scope,
        effectiveSelfShareBasisPoints(state, item, category),
        partnerActive,
      );
      if (!allocation) continue;
      householdUnrounded += allocation.total;
      selfUnrounded += allocation.self;
      const current = categoryAllocations.get(category.id) ?? {
        category,
        total: 0,
        self: 0,
      };
      current.total += allocation.total;
      current.self += allocation.self;
      categoryAllocations.set(category.id, current);
    }
  }

  assertFiniteSafeResult(householdUnrounded, "household expense");
  assertFiniteSafeResult(selfUnrounded, "self expense");
  const householdExpenseYen = roundSafe(
    householdUnrounded,
    "household expense",
  );
  const selfExpenseYen = partnerActive
    ? roundSafe(selfUnrounded, "self expense")
    : householdExpenseYen;
  const partnerExpenseYen = householdExpenseYen - selfExpenseYen;

  const selfIncome = incomeForMember(state, selfMember);
  const partnerIncome = partnerActive
    ? incomeForMember(state, partnerMember)
    : { value: 0, unresolved: false };
  const incomeUnresolved = selfIncome.unresolved || partnerIncome.unresolved;
  const householdIncomeYen =
    incomeUnresolved ||
    selfIncome.value === null ||
    partnerIncome.value === null
      ? null
      : selfIncome.value + partnerIncome.value;
  const householdRemainingYen =
    householdIncomeYen === null
      ? null
      : householdIncomeYen - householdExpenseYen;

  const categories = [...categoryAllocations.values()]
    .sort((left, right) => left.category.sortOrder - right.category.sortOrder)
    .map((entry) => {
      const total = roundSafe(entry.total, "category expense");
      const self = partnerActive
        ? roundSafe(entry.self, "category self expense")
        : total;
      return {
        categoryId: entry.category.id,
        name: entry.category.name,
        householdExpenseYen: total,
        selfExpenseYen: self,
        partnerExpenseYen: total - self,
        householdSharePercent:
          householdUnrounded === 0
            ? 0
            : (entry.total / householdUnrounded) * 100,
      };
    });

  const selfRemaining =
    selfIncome.value === null ? null : selfIncome.value - selfExpenseYen;
  const partnerRemaining =
    partnerIncome.value === null
      ? null
      : partnerIncome.value - partnerExpenseYen;
  return {
    mode: state.budget.mode,
    householdIncomeYen,
    householdExpenseYen,
    householdRemainingYen,
    spendingRatePercent:
      householdIncomeYen === null || householdIncomeYen === 0
        ? null
        : (householdExpenseYen / householdIncomeYen) * 100,
    overspent:
      householdRemainingYen === null ? null : householdRemainingYen < 0,
    self: {
      memberId: selfMember.id,
      displayName: selfMember.displayName,
      active: true,
      incomeYen: selfIncome.value,
      expenseYen: selfExpenseYen,
      remainingYen: selfRemaining,
      unresolvedIncome: selfIncome.unresolved,
    },
    partner: {
      memberId: partnerMember.id,
      displayName: partnerMember.displayName,
      active: partnerActive,
      incomeYen: partnerIncome.value,
      expenseYen: partnerExpenseYen,
      remainingYen: partnerRemaining,
      unresolvedIncome: partnerIncome.unresolved,
    },
    categories,
  };
}
