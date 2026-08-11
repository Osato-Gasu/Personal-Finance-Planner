import {
  SCHEMA_VERSION,
  parseAppState,
  parseLegacyAppState,
  parseSchemaVersion2AppState,
  validateAppState,
  type AppState,
  type BudgetCategory,
  type ExpenseItem,
  type HouseholdMember,
  type IncomeTarget,
  type SchemaVersion2AppState,
} from "./state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueId(preferred: string, used: Set<string>): string {
  let candidate = preferred;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${preferred}-${String(suffix++)}`;
  used.add(candidate);
  return candidate;
}

export function migrateToCurrentState(value: unknown): AppState {
  if (!isRecord(value)) throw new Error("state must be an object");
  if (value.schemaVersion === SCHEMA_VERSION) return parseAppState(value);
  if (value.schemaVersion === 2)
    return migrateV2(parseSchemaVersion2AppState(value));
  if (value.schemaVersion !== 1) throw new Error("unsupported schema version");

  const legacy = parseLegacyAppState(value);
  const usedMemberIds = new Set(legacy.members.map((member) => member.id));
  const members: HouseholdMember[] = legacy.members.map((member) => ({
    ...member,
  }));
  if (!members.some((member) => member.role === "partner")) {
    members.push({
      id: uniqueId("member-partner", usedMemberIds),
      role: "partner",
      displayName: "相手",
      active: false,
    });
  }

  const usedTargetIds = new Set(
    legacy.incomeTargets.map((target) => target.id),
  );
  const incomeTargets: IncomeTarget[] = legacy.incomeTargets.map((target) => ({
    ...target,
  }));
  for (const member of members) {
    if (!incomeTargets.some((target) => target.memberId === member.id)) {
      incomeTargets.push({
        id: uniqueId(`budget-income-${member.id}`, usedTargetIds),
        memberId: member.id,
        manualYen: 0,
      });
    }
  }

  const categories: BudgetCategory[] = [];
  const items: ExpenseItem[] = [];
  if (legacy.livingExpenses.length > 0) {
    const categoryId = "migration-living-expenses";
    categories.push({
      id: categoryId,
      name: "移行済み生活費",
      description: "schema version 1から移行した費目",
      shareMode: "inherit",
      sortOrder: 0,
      active: true,
    });
    const roles = new Map(members.map((member) => [member.id, member.role]));
    for (const legacyExpense of legacy.livingExpenses) {
      const role = roles.get(legacyExpense.memberId);
      if (!role) throw new Error("living expense member is missing");
      items.push({
        id: legacyExpense.id,
        categoryId,
        purpose: `移行費目 ${legacyExpense.id}`,
        kind: "living-expense",
        scope: role,
        amountYen: legacyExpense.amountYen,
        cycleValue: 1,
        cycleUnit: "month",
        occurrencesPerCycle: 1,
        shareMode: "inherit",
        source: { type: "manual" },
        memo: `v1:${legacyExpense.id}`,
        active: true,
      });
    }
  }

  const migrated: SchemaVersion2AppState = {
    schemaVersion: 2,
    activeRoute: legacy.activeRoute,
    members,
    takeHomeInputs: legacy.takeHomeInputs.map((input) => ({ ...input })),
    incomeTargets,
    links: legacy.links.map((link) => ({ ...link })),
    budget: {
      mode: "detailed",
      globalSelfShareBasisPoints: 5000,
      simpleMonthlyExpenseYen: 0,
      categories,
      items,
    },
    contributionSources: legacy.contributionSources.map((source) => ({
      ...source,
    })),
  };
  return migrateV2(migrated);
}

function migrateV2(previous: SchemaVersion2AppState): AppState {
  const migrated: AppState = {
    schemaVersion: 3,
    activeRoute: previous.activeRoute,
    members: previous.members.map((member) => ({ ...member })),
    takeHomePlans: previous.takeHomeInputs.map((input) => ({
      id: input.id,
      memberId: input.memberId,
      targetYear: null,
      mode: "legacy-manual" as const,
      manualAverageMonthlyTakeHomeYen: input.fixtureMonthlyTakeHomeYen,
      active: true,
    })),
    incomeTargets: previous.incomeTargets.map((target) => ({ ...target })),
    links: previous.links.map((link) => ({ ...link })),
    budget: structuredClone(previous.budget),
    contributionSources: previous.contributionSources.map((source) => ({
      ...source,
    })),
  };
  validateAppState(migrated);
  return migrated;
}
