import {
  SCHEMA_VERSION,
  parseAppState,
  parseSchemaVersion6AppState,
  parseSchemaVersion5AppState,
  parseLegacyAppState,
  parseSchemaVersion4AppState,
  parseSchemaVersion3AppState,
  parseSchemaVersion2AppState,
  validateAppState,
  type AppState,
  type BudgetCategory,
  type ExpenseItem,
  type HouseholdMember,
  type IncomeTarget,
  type SchemaVersion2AppState,
  type SchemaVersion3AppState,
  type SchemaVersion4AppState,
  type SchemaVersion5AppState,
  type SchemaVersion6AppState,
  defaultBackupMetadata,
  defaultLifePlanState,
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
  if (value.schemaVersion === 6)
    return migrateV6(parseSchemaVersion6AppState(value));
  if (value.schemaVersion === 5)
    return migrateV6(migrateV5(parseSchemaVersion5AppState(value)));
  if (value.schemaVersion === 4)
    return migrateV6(migrateV5(migrateV4(parseSchemaVersion4AppState(value))));
  if (value.schemaVersion === 3)
    return migrateV6(
      migrateV5(migrateV4(migrateV3(parseSchemaVersion3AppState(value)))),
    );
  if (value.schemaVersion === 2)
    return migrateV6(
      migrateV5(
        migrateV4(migrateV3(migrateV2(parseSchemaVersion2AppState(value)))),
      ),
    );
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
  return migrateV6(migrateV5(migrateV4(migrateV3(migrateV2(migrated)))));
}

function migrateV2(previous: SchemaVersion2AppState): SchemaVersion3AppState {
  const migrated: SchemaVersion3AppState = {
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
  return migrated;
}

function migrateV3(previous: SchemaVersion3AppState): SchemaVersion4AppState {
  const migrated: SchemaVersion4AppState = {
    ...structuredClone(previous),
    schemaVersion: 4,
    nisaPlans: [],
    investmentScenarios: [],
  };
  return migrated;
}

function migrateV4(previous: SchemaVersion4AppState): SchemaVersion5AppState {
  const migrated: SchemaVersion5AppState = {
    ...structuredClone(previous),
    schemaVersion: 5,
    takeHomePlans: previous.takeHomePlans.map((plan) =>
      plan.mode === "calculated"
        ? {
            ...structuredClone(plan),
            deductions: {
              ...structuredClone(plan.deductions),
              idecoContributionMode: "manual" as const,
              linkedIdecoPlanId: null,
            },
          }
        : structuredClone(plan),
    ),
    idecoPlans: [],
  };
  return migrated;
}

function migrateV5(previous: SchemaVersion5AppState): SchemaVersion6AppState {
  const migrated: SchemaVersion6AppState = {
    ...structuredClone(previous),
    schemaVersion: 6,
    backup: defaultBackupMetadata(),
  };
  return migrated;
}

export function migrateV6(previous: SchemaVersion6AppState): AppState {
  const migrated: AppState = {
    ...structuredClone(previous),
    schemaVersion: 7,
    lifePlan: defaultLifePlanState(),
  };
  validateAppState(migrated);
  return migrated;
}
