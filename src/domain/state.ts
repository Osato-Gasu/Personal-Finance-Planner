import { monthlyExpenseYen } from "./checked-arithmetic";

export const SCHEMA_VERSION = 2 as const;
export const LEGACY_SCHEMA_VERSION = 1 as const;

export type MemberRole = "self" | "partner";
export type MemberId = string;
export type RouteId =
  "overview" | "budget" | "take-home" | "investments" | "settings";
export type ShareMode = "inherit" | "custom";
export type ExpenseScope = "shared" | "self" | "partner";
export type CycleUnit = "day" | "week" | "month" | "year";

export interface HouseholdMember {
  id: MemberId;
  role: MemberRole;
  displayName: string;
  active: boolean;
}

export interface TakeHomeInput {
  id: string;
  memberId: MemberId;
  fixtureMonthlyTakeHomeYen: number;
}

export interface IncomeTarget {
  id: string;
  memberId: MemberId;
  manualYen: number;
}

export interface LinkDefinition {
  id: string;
  targetId: string;
  sourceType: "take-home-result";
  sourceId: string;
  field: "averageMonthlyTakeHomeYen";
  active: boolean;
}

export interface LivingExpense {
  id: string;
  memberId: MemberId;
  kind: "living-expense";
  amountYen: number;
}

export interface ContributionSource {
  id: string;
  memberId: MemberId;
  kind: "asset-contribution";
  sourceType: "nisa-fixture" | "ideco-fixture";
  sourceId: string;
  amountYen: number;
  active: boolean;
}

export interface BudgetState {
  mode: "detailed" | "simple";
  globalSelfShareBasisPoints: number;
  simpleMonthlyExpenseYen: number;
  categories: BudgetCategory[];
  items: ExpenseItem[];
}

export interface BudgetCategory {
  id: string;
  name: string;
  description: string;
  shareMode: ShareMode;
  selfShareBasisPoints?: number | undefined;
  sortOrder: number;
  active: boolean;
}

export interface ExpenseItem {
  id: string;
  categoryId: string;
  purpose: string;
  kind: "living-expense";
  scope: ExpenseScope;
  amountYen: number;
  cycleValue: number;
  cycleUnit: CycleUnit;
  occurrencesPerCycle: number;
  shareMode: ShareMode;
  selfShareBasisPoints?: number | undefined;
  source: { type: "manual" };
  memo: string;
  active: boolean;
}

export interface AppState {
  schemaVersion: 2;
  activeRoute: RouteId;
  members: HouseholdMember[];
  takeHomeInputs: TakeHomeInput[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
}

export interface LegacyAppState {
  schemaVersion: 1;
  activeRoute: RouteId;
  members: HouseholdMember[];
  takeHomeInputs: TakeHomeInput[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  livingExpenses: LivingExpense[];
  contributionSources: ContributionSource[];
}

export type AppAction =
  | { type: "navigate"; route: RouteId }
  | { type: "rename-member"; memberId: string; displayName: string }
  | { type: "set-partner-active"; memberId: string; active: boolean }
  | { type: "update-take-home"; sourceId: string; amountYen: number }
  | { type: "update-manual-income"; targetId: string; amountYen: number }
  | { type: "add-link"; link: LinkDefinition }
  | { type: "unlink-income"; targetId: string; manualYen: number }
  | {
      type: "update-household";
      selfName: string;
      partnerName: string;
      partnerActive: boolean;
      selfManualYen?: number | undefined;
      partnerManualYen?: number | undefined;
      globalSelfShareBasisPoints: number;
    }
  | { type: "set-budget-mode"; mode: BudgetState["mode"] }
  | { type: "set-simple-expense"; amountYen: number }
  | { type: "add-category"; category: BudgetCategory }
  | {
      type: "update-category";
      categoryId: string;
      changes: Pick<BudgetCategory, "name" | "description" | "shareMode"> & {
        selfShareBasisPoints?: number | undefined;
      };
    }
  | { type: "move-category"; categoryId: string; direction: "up" | "down" }
  | { type: "set-category-active"; categoryId: string; active: boolean }
  | {
      type: "delete-category";
      categoryId: string;
      moveToCategoryId?: string | undefined;
    }
  | { type: "add-expense"; item: ExpenseItem }
  | {
      type: "update-expense";
      itemId: string;
      changes: Omit<
        ExpenseItem,
        "id" | "kind" | "source" | "selfShareBasisPoints"
      > & { selfShareBasisPoints?: number | undefined };
    }
  | { type: "duplicate-expense"; itemId: string; newId: string }
  | { type: "set-expense-active"; itemId: string; active: boolean }
  | { type: "delete-expense"; itemId: string };

export const routeIds: readonly RouteId[] = [
  "overview",
  "budget",
  "take-home",
  "investments",
  "settings",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function opaque(value: unknown): unknown {
  return value;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value;
}

function requireOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

function requireArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`${key} must be an array`);
  return value;
}

export function assertSafeYen(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}

export function assertPositiveSafeInteger(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive safe integer`);
  }
}

export function assertBasisPoints(
  value: unknown,
  field: string,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 10_000
  ) {
    throw new Error(`${field} must be an integer from 0 to 10000`);
  }
}

function uniqueIds(items: readonly { id: string }[], field: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id))
      throw new Error(`${field} IDs must be unique`);
    ids.add(item.id);
  }
}

function requirePresent<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function assertTrimmedText(
  value: string,
  field: string,
  minimum: number,
  maximum: number,
): void {
  if (
    value !== value.trim() ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw new Error(
      `${field} length must be ${String(minimum)}..${String(maximum)} after trim`,
    );
  }
}

function assertPersistedDisplayName(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("member displayName must be a non-empty string");
  }
}

function validateShare(
  shareMode: ShareMode,
  basisPoints: number | undefined,
  field: string,
): void {
  const rawShareMode = opaque(shareMode);
  if (rawShareMode !== "inherit" && rawShareMode !== "custom") {
    throw new Error(`${field} shareMode is invalid`);
  }
  if (shareMode === "custom")
    assertBasisPoints(basisPoints, `${field} selfShareBasisPoints`);
  if (shareMode === "inherit" && basisPoints !== undefined) {
    throw new Error(`${field} inherited share must not store basis points`);
  }
}

function validateMembersAndIncome(state: AppState | LegacyAppState): void {
  uniqueIds(state.members, "member");
  uniqueIds(state.takeHomeInputs, "take-home input");
  uniqueIds(state.incomeTargets, "income target");
  uniqueIds(state.links, "link");
  uniqueIds(state.contributionSources, "contribution source");
  const selfMembers = state.members.filter((member) => member.role === "self");
  if (selfMembers.length !== 1) throw new Error("self must occur exactly once");
  if (!selfMembers[0]?.active) throw new Error("self must be active");
  const partners = state.members.filter((member) => member.role === "partner");
  if (partners.length > 1) throw new Error("at most one partner is allowed");
  const memberIds = new Set(state.members.map((member) => member.id));
  for (const member of state.members) {
    if (opaque(member.role) !== "self" && opaque(member.role) !== "partner") {
      throw new Error("member role is invalid");
    }
    // Persisted names retain the schema v1 contract so migration never trims
    // or truncates previously valid bytes. UI actions enforce current limits.
    assertPersistedDisplayName(member.displayName);
  }
  for (const input of state.takeHomeInputs) {
    if (!memberIds.has(input.memberId))
      throw new Error("take-home member is missing");
    assertSafeYen(input.fixtureMonthlyTakeHomeYen, "fixtureMonthlyTakeHomeYen");
  }
  for (const target of state.incomeTargets) {
    if (!memberIds.has(target.memberId))
      throw new Error("income target member is missing");
    assertSafeYen(target.manualYen, "manualYen");
  }
  const targets = new Map(
    state.incomeTargets.map((target) => [target.id, target]),
  );
  const sources = new Map(
    state.takeHomeInputs.map((source) => [source.id, source]),
  );
  const activeTargets = new Set<string>();
  for (const link of state.links) {
    if (
      opaque(link.sourceType) !== "take-home-result" ||
      opaque(link.field) !== "averageMonthlyTakeHomeYen"
    ) {
      throw new Error("link source is invalid");
    }
    const target = targets.get(link.targetId);
    if (!target) throw new Error("link target is missing");
    if (link.active) {
      const source = sources.get(link.sourceId);
      if (!source) throw new Error("active link source is missing");
      if (source.memberId !== target.memberId) {
        throw new Error("active link source and target members must match");
      }
      if (activeTargets.has(link.targetId)) {
        throw new Error("only one active link is allowed for a target");
      }
      activeTargets.add(link.targetId);
    }
  }
  const contributionKeys = new Set<string>();
  for (const contribution of state.contributionSources) {
    if (
      opaque(contribution.kind) !== "asset-contribution" ||
      (opaque(contribution.sourceType) !== "nisa-fixture" &&
        opaque(contribution.sourceType) !== "ideco-fixture")
    ) {
      throw new Error("contribution source is invalid");
    }
    if (!memberIds.has(contribution.memberId))
      throw new Error("contribution member is missing");
    assertSafeYen(contribution.amountYen, "contribution amountYen");
    if (contribution.active) {
      const key = `${contribution.sourceType}\u0000${contribution.sourceId}`;
      if (contributionKeys.has(key))
        throw new Error("active contribution source must be unique");
      contributionKeys.add(key);
    }
  }
}

export function validateAppState(state: AppState): void {
  if (opaque(state.schemaVersion) !== SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (!routeIds.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  validateMembersAndIncome(state);
  uniqueIds(state.budget.categories, "budget category");
  uniqueIds(state.budget.items, "expense item");
  assertBasisPoints(
    state.budget.globalSelfShareBasisPoints,
    "globalSelfShareBasisPoints",
  );
  assertSafeYen(
    state.budget.simpleMonthlyExpenseYen,
    "simpleMonthlyExpenseYen",
  );
  const budgetMode = opaque(state.budget.mode);
  if (
    typeof budgetMode !== "string" ||
    !new Set(["detailed", "simple"]).has(budgetMode)
  ) {
    throw new Error("budget mode is invalid");
  }
  const categories = new Map(
    state.budget.categories.map((category) => [category.id, category]),
  );
  const activeCategories = state.budget.categories
    .filter((category) => category.active)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  activeCategories.forEach((category, index) => {
    if (category.sortOrder !== index)
      throw new Error("active category sortOrder must be continuous");
  });
  for (const category of state.budget.categories) {
    assertTrimmedText(category.name, "category name", 1, 50);
    assertTrimmedText(category.description, "category description", 0, 200);
    if (!Number.isSafeInteger(category.sortOrder) || category.sortOrder < 0) {
      throw new Error("category sortOrder must be a non-negative safe integer");
    }
    validateShare(
      category.shareMode,
      category.selfShareBasisPoints,
      "category",
    );
  }
  for (const item of state.budget.items) {
    if (!categories.has(item.categoryId))
      throw new Error("expense category is missing");
    if (
      opaque(item.kind) !== "living-expense" ||
      opaque(item.source.type) !== "manual"
    ) {
      throw new Error("expense item kind or source is invalid");
    }
    assertTrimmedText(item.purpose, "expense purpose", 1, 100);
    assertTrimmedText(item.memo, "expense memo", 0, 500);
    assertSafeYen(item.amountYen, "expense amountYen");
    assertPositiveSafeInteger(item.cycleValue, "expense cycleValue");
    assertPositiveSafeInteger(
      item.occurrencesPerCycle,
      "expense occurrencesPerCycle",
    );
    if (!["day", "week", "month", "year"].includes(item.cycleUnit)) {
      throw new Error("expense cycleUnit is invalid");
    }
    if (!["shared", "self", "partner"].includes(item.scope)) {
      throw new Error("expense scope is invalid");
    }
    if (item.scope === "shared")
      validateShare(item.shareMode, item.selfShareBasisPoints, "expense");
    else if (
      item.shareMode !== "inherit" ||
      item.selfShareBasisPoints !== undefined
    ) {
      throw new Error("personal expense must inherit without custom share");
    }
  }
}

export function validateLegacyAppState(state: LegacyAppState): void {
  if (opaque(state.schemaVersion) !== LEGACY_SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (!routeIds.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  validateMembersAndIncome(state);
  uniqueIds(state.livingExpenses, "living expense");
  const memberIds = new Set(state.members.map((member) => member.id));
  for (const expense of state.livingExpenses) {
    if (!memberIds.has(expense.memberId))
      throw new Error("living expense member is missing");
    assertSafeYen(expense.amountYen, "living expense amountYen");
  }
}

function parseMembers(value: Record<string, unknown>): HouseholdMember[] {
  return requireArray(value, "members").map((item) => {
    if (!isRecord(item)) throw new Error("member must be an object");
    const role = requireString(item, "role");
    if (role !== "self" && role !== "partner")
      throw new Error("member role is invalid");
    return {
      id: requireString(item, "id"),
      role,
      displayName: requireString(item, "displayName"),
      active: requireBoolean(item, "active"),
    };
  });
}

function parseTakeHomeInputs(value: Record<string, unknown>): TakeHomeInput[] {
  return requireArray(value, "takeHomeInputs").map((item) => {
    if (!isRecord(item)) throw new Error("take-home input must be an object");
    assertSafeYen(item.fixtureMonthlyTakeHomeYen, "fixtureMonthlyTakeHomeYen");
    return {
      id: requireString(item, "id"),
      memberId: requireString(item, "memberId"),
      fixtureMonthlyTakeHomeYen: item.fixtureMonthlyTakeHomeYen,
    };
  });
}

function parseIncomeTargets(value: Record<string, unknown>): IncomeTarget[] {
  return requireArray(value, "incomeTargets").map((item) => {
    if (!isRecord(item)) throw new Error("income target must be an object");
    assertSafeYen(item.manualYen, "manualYen");
    return {
      id: requireString(item, "id"),
      memberId: requireString(item, "memberId"),
      manualYen: item.manualYen,
    };
  });
}

function parseLinks(value: Record<string, unknown>): LinkDefinition[] {
  return requireArray(value, "links").map((item) => {
    if (
      !isRecord(item) ||
      item.sourceType !== "take-home-result" ||
      item.field !== "averageMonthlyTakeHomeYen"
    ) {
      throw new Error("link source is invalid");
    }
    return {
      id: requireString(item, "id"),
      targetId: requireString(item, "targetId"),
      sourceType: item.sourceType,
      sourceId: requireString(item, "sourceId"),
      field: item.field,
      active: requireBoolean(item, "active"),
    };
  });
}

function parseContributions(
  value: Record<string, unknown>,
): ContributionSource[] {
  return requireArray(value, "contributionSources").map((item) => {
    if (!isRecord(item) || item.kind !== "asset-contribution")
      throw new Error("contribution source is invalid");
    if (
      item.sourceType !== "nisa-fixture" &&
      item.sourceType !== "ideco-fixture"
    )
      throw new Error("contribution sourceType is invalid");
    assertSafeYen(item.amountYen, "contribution amountYen");
    return {
      id: requireString(item, "id"),
      memberId: requireString(item, "memberId"),
      kind: item.kind,
      sourceType: item.sourceType,
      sourceId: requireString(item, "sourceId"),
      amountYen: item.amountYen,
      active: requireBoolean(item, "active"),
    };
  });
}

function parseBase(value: Record<string, unknown>) {
  if (
    typeof value.activeRoute !== "string" ||
    !routeIds.includes(value.activeRoute as RouteId)
  )
    throw new Error("activeRoute is invalid");
  return {
    activeRoute: value.activeRoute as RouteId,
    members: parseMembers(value),
    takeHomeInputs: parseTakeHomeInputs(value),
    incomeTargets: parseIncomeTargets(value),
    links: parseLinks(value),
    contributionSources: parseContributions(value),
  };
}

export function parseLegacyAppState(value: unknown): LegacyAppState {
  if (!isRecord(value) || value.schemaVersion !== LEGACY_SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  const livingExpenses = requireArray(value, "livingExpenses").map(
    (item): LivingExpense => {
      if (!isRecord(item) || item.kind !== "living-expense")
        throw new Error("living expense is invalid");
      assertSafeYen(item.amountYen, "living expense amountYen");
      return {
        id: requireString(item, "id"),
        memberId: requireString(item, "memberId"),
        kind: item.kind,
        amountYen: item.amountYen,
      };
    },
  );
  const state: LegacyAppState = {
    schemaVersion: 1,
    ...parseBase(value),
    livingExpenses,
  };
  validateLegacyAppState(state);
  return state;
}

function parseBudget(value: unknown): BudgetState {
  if (!isRecord(value)) throw new Error("budget must be an object");
  if (value.mode !== "detailed" && value.mode !== "simple")
    throw new Error("budget mode is invalid");
  assertBasisPoints(
    value.globalSelfShareBasisPoints,
    "globalSelfShareBasisPoints",
  );
  assertSafeYen(value.simpleMonthlyExpenseYen, "simpleMonthlyExpenseYen");
  const categories = requireArray(value, "categories").map((item) => {
    if (!isRecord(item)) throw new Error("category must be an object");
    if (item.shareMode !== "inherit" && item.shareMode !== "custom")
      throw new Error("category shareMode is invalid");
    const category: BudgetCategory = {
      id: requireString(item, "id"),
      name: requireString(item, "name"),
      description: requireOptionalString(item, "description") ?? "",
      shareMode: item.shareMode,
      sortOrder: item.sortOrder as number,
      active: requireBoolean(item, "active"),
    };
    if (item.selfShareBasisPoints !== undefined)
      category.selfShareBasisPoints = item.selfShareBasisPoints as number;
    return category;
  });
  const items = requireArray(value, "items").map((item) => {
    if (
      !isRecord(item) ||
      item.kind !== "living-expense" ||
      item.source === null ||
      !isRecord(item.source) ||
      item.source.type !== "manual"
    )
      throw new Error("expense item is invalid");
    if (
      item.scope !== "shared" &&
      item.scope !== "self" &&
      item.scope !== "partner"
    )
      throw new Error("expense scope is invalid");
    if (
      item.cycleUnit !== "day" &&
      item.cycleUnit !== "week" &&
      item.cycleUnit !== "month" &&
      item.cycleUnit !== "year"
    )
      throw new Error("expense cycleUnit is invalid");
    if (item.shareMode !== "inherit" && item.shareMode !== "custom")
      throw new Error("expense shareMode is invalid");
    const parsed: ExpenseItem = {
      id: requireString(item, "id"),
      categoryId: requireString(item, "categoryId"),
      purpose: requireString(item, "purpose"),
      kind: item.kind,
      scope: item.scope,
      amountYen: item.amountYen as number,
      cycleValue: item.cycleValue as number,
      cycleUnit: item.cycleUnit,
      occurrencesPerCycle: item.occurrencesPerCycle as number,
      shareMode: item.shareMode,
      source: { type: "manual" },
      memo: requireOptionalString(item, "memo") ?? "",
      active: requireBoolean(item, "active"),
    };
    if (item.selfShareBasisPoints !== undefined)
      parsed.selfShareBasisPoints = item.selfShareBasisPoints as number;
    return parsed;
  });
  return {
    mode: value.mode,
    globalSelfShareBasisPoints: value.globalSelfShareBasisPoints,
    simpleMonthlyExpenseYen: value.simpleMonthlyExpenseYen,
    categories,
    items,
  };
}

export function parseAppState(value: unknown): AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  const state: AppState = {
    schemaVersion: 2,
    ...parseBase(value),
    budget: parseBudget(value.budget),
  };
  validateAppState(state);
  return state;
}

export function cloneState<T extends AppState | LegacyAppState>(state: T): T {
  return structuredClone(state);
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function normalizeCategoryOrder(
  categories: BudgetCategory[],
): BudgetCategory[] {
  const active = categories
    .filter((category) => category.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const order = new Map(active.map((category, index) => [category.id, index]));
  return categories.map((category) => ({
    ...category,
    sortOrder: order.get(category.id) ?? category.sortOrder,
  }));
}

function cleanCategory(category: BudgetCategory): BudgetCategory {
  const cleaned = {
    ...category,
    name: category.name.trim(),
    description: category.description.trim(),
  };
  if (cleaned.shareMode === "inherit") delete cleaned.selfShareBasisPoints;
  return cleaned;
}

function cleanExpense(item: ExpenseItem): ExpenseItem {
  const cleaned = {
    ...item,
    purpose: item.purpose.trim(),
    memo: item.memo.trim(),
    source: { type: "manual" as const },
  };
  if (cleaned.scope !== "shared" || cleaned.shareMode === "inherit") {
    cleaned.shareMode = "inherit";
    delete cleaned.selfShareBasisPoints;
  }
  return cleaned;
}

export function reduceState(state: AppState, action: AppAction): AppState {
  assertActionApplicable(state, action);
  const next = cloneState(state);
  switch (action.type) {
    case "navigate":
      next.activeRoute = action.route;
      break;
    case "rename-member":
      requirePresent(
        next.members.find((m) => m.id === action.memberId),
        "rename member is missing",
      ).displayName = action.displayName.trim();
      break;
    case "set-partner-active":
      requirePresent(
        next.members.find((m) => m.id === action.memberId),
        "partner is missing",
      ).active = action.active;
      break;
    case "update-take-home":
      requirePresent(
        next.takeHomeInputs.find((i) => i.id === action.sourceId),
        "take-home source is missing",
      ).fixtureMonthlyTakeHomeYen = action.amountYen;
      break;
    case "update-manual-income":
      requirePresent(
        next.incomeTargets.find((t) => t.id === action.targetId),
        "income target is missing",
      ).manualYen = action.amountYen;
      break;
    case "add-link":
      next.links.push({ ...action.link });
      break;
    case "unlink-income": {
      requirePresent(
        next.incomeTargets.find((t) => t.id === action.targetId),
        "unlink target is missing",
      ).manualYen = action.manualYen;
      for (const link of next.links)
        if (link.targetId === action.targetId && link.active)
          link.active = false;
      break;
    }
    case "update-household": {
      const self = requirePresent(
        next.members.find((m) => m.role === "self"),
        "self is missing",
      );
      if (action.selfName !== self.displayName)
        self.displayName = action.selfName.trim();
      const partner = requirePresent(
        next.members.find((m) => m.role === "partner"),
        "partner is missing",
      );
      if (action.partnerName !== partner.displayName)
        partner.displayName = action.partnerName.trim();
      partner.active = action.partnerActive;
      next.budget.globalSelfShareBasisPoints =
        action.globalSelfShareBasisPoints;
      const selfTarget = requirePresent(
        next.incomeTargets.find((t) => t.memberId === self.id),
        "self income target is missing",
      );
      const partnerTarget = requirePresent(
        next.incomeTargets.find((t) => t.memberId === partner.id),
        "partner income target is missing",
      );
      if (action.selfManualYen !== undefined)
        selfTarget.manualYen = action.selfManualYen;
      if (action.partnerManualYen !== undefined)
        partnerTarget.manualYen = action.partnerManualYen;
      break;
    }
    case "set-budget-mode":
      next.budget.mode = action.mode;
      break;
    case "set-simple-expense":
      next.budget.simpleMonthlyExpenseYen = action.amountYen;
      break;
    case "add-category":
      next.budget.categories = normalizeCategoryOrder([
        ...next.budget.categories,
        cleanCategory(action.category),
      ]);
      break;
    case "update-category": {
      const category = requirePresent(
        next.budget.categories.find((c) => c.id === action.categoryId),
        "category is missing",
      );
      Object.assign(
        category,
        cleanCategory({ ...category, ...action.changes }),
      );
      if (category.shareMode === "inherit")
        delete category.selfShareBasisPoints;
      break;
    }
    case "move-category": {
      const active = next.budget.categories
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = active.findIndex((c) => c.id === action.categoryId);
      const otherIndex = action.direction === "up" ? index - 1 : index + 1;
      const other = requirePresent(
        active[otherIndex],
        "category move target is missing",
      );
      const current = requirePresent(
        active[index],
        "active category is missing",
      );
      [current.sortOrder, other.sortOrder] = [
        other.sortOrder,
        current.sortOrder,
      ];
      next.budget.categories = normalizeCategoryOrder(next.budget.categories);
      break;
    }
    case "set-category-active": {
      requirePresent(
        next.budget.categories.find((c) => c.id === action.categoryId),
        "category is missing",
      ).active = action.active;
      next.budget.categories = normalizeCategoryOrder(next.budget.categories);
      break;
    }
    case "delete-category": {
      if (action.moveToCategoryId)
        for (const item of next.budget.items)
          if (item.categoryId === action.categoryId)
            item.categoryId = action.moveToCategoryId;
      next.budget.categories = normalizeCategoryOrder(
        next.budget.categories.filter((c) => c.id !== action.categoryId),
      );
      break;
    }
    case "add-expense":
      next.budget.items.push(cleanExpense(action.item));
      break;
    case "update-expense": {
      const item = requirePresent(
        next.budget.items.find((i) => i.id === action.itemId),
        "expense item is missing",
      );
      Object.assign(item, cleanExpense({ ...item, ...action.changes }));
      if (item.scope !== "shared" || item.shareMode === "inherit")
        delete item.selfShareBasisPoints;
      break;
    }
    case "duplicate-expense": {
      const source = requirePresent(
        next.budget.items.find((i) => i.id === action.itemId),
        "expense item is missing",
      );
      next.budget.items.push({
        ...source,
        source: { ...source.source },
        id: action.newId,
        purpose: `${source.purpose}（コピー）`,
      });
      break;
    }
    case "set-expense-active":
      requirePresent(
        next.budget.items.find((i) => i.id === action.itemId),
        "expense item is missing",
      ).active = action.active;
      break;
    case "delete-expense":
      next.budget.items = next.budget.items.filter(
        (i) => i.id !== action.itemId,
      );
      break;
  }
  return next;
}

function hasActiveLink(state: AppState, targetId: string): boolean {
  return state.links.some((link) => link.active && link.targetId === targetId);
}

function assertActionApplicable(state: AppState, action: AppAction): void {
  switch (action.type) {
    case "navigate":
      return;
    case "rename-member":
      if (!state.members.some((m) => m.id === action.memberId))
        throw new Error("rename member is missing");
      assertTrimmedText(action.displayName.trim(), "member displayName", 1, 50);
      return;
    case "set-partner-active":
      if (
        !state.members.some(
          (m) => m.id === action.memberId && m.role === "partner",
        )
      )
        throw new Error("set-partner-active requires an existing partner");
      return;
    case "update-take-home":
      if (!state.takeHomeInputs.some((i) => i.id === action.sourceId))
        throw new Error("take-home source is missing");
      assertSafeYen(action.amountYen, "amountYen");
      return;
    case "update-manual-income":
      if (!state.incomeTargets.some((t) => t.id === action.targetId))
        throw new Error("income target is missing");
      if (hasActiveLink(state, action.targetId))
        throw new Error("linked income is read-only");
      assertSafeYen(action.amountYen, "amountYen");
      return;
    case "add-link": {
      if (state.links.some((l) => l.id === action.link.id))
        throw new Error("link ID is already in use");
      const target = state.incomeTargets.find(
        (t) => t.id === action.link.targetId,
      );
      if (!target) throw new Error("link target is missing");
      const source = state.takeHomeInputs.find(
        (s) => s.id === action.link.sourceId,
      );
      if (!source) throw new Error("link source is missing");
      if (target.memberId !== source.memberId)
        throw new Error("link source and target members must match");
      if (!action.link.active) throw new Error("added link must be active");
      if (hasActiveLink(state, action.link.targetId))
        throw new Error("only one active link is allowed for a target");
      return;
    }
    case "unlink-income":
      if (!state.incomeTargets.some((t) => t.id === action.targetId))
        throw new Error("unlink target is missing");
      {
        const link = state.links.find(
          (candidate) =>
            candidate.active && candidate.targetId === action.targetId,
        );
        if (!link) throw new Error("active link is missing for unlink target");
        const source = state.takeHomeInputs.find(
          (candidate) => candidate.id === link.sourceId,
        );
        if (!source) throw new Error("active link source is missing");
        assertSafeYen(action.manualYen, "manualYen");
        if (action.manualYen !== source.fixtureMonthlyTakeHomeYen) {
          throw new Error(
            "unlink manual value must equal the current linked value",
          );
        }
      }
      return;
    case "update-household": {
      const self = state.members.find((m) => m.role === "self");
      const partner = state.members.find((m) => m.role === "partner");
      if (!self || !partner)
        throw new Error("household members are incomplete");
      if (action.selfName !== self.displayName)
        assertTrimmedText(action.selfName.trim(), "self name", 1, 50);
      if (action.partnerName !== partner.displayName)
        assertTrimmedText(action.partnerName.trim(), "partner name", 1, 50);
      assertBasisPoints(
        action.globalSelfShareBasisPoints,
        "globalSelfShareBasisPoints",
      );
      const selfTarget = state.incomeTargets.find(
        (t) => t.memberId === self.id,
      );
      const partnerTarget = state.incomeTargets.find(
        (t) => t.memberId === partner.id,
      );
      if (!selfTarget || !partnerTarget)
        throw new Error("household income targets are incomplete");
      if (action.selfManualYen !== undefined) {
        if (hasActiveLink(state, selfTarget.id))
          throw new Error("linked self income is read-only");
        assertSafeYen(action.selfManualYen, "selfManualYen");
      }
      if (action.partnerManualYen !== undefined) {
        if (hasActiveLink(state, partnerTarget.id))
          throw new Error("linked partner income is read-only");
        assertSafeYen(action.partnerManualYen, "partnerManualYen");
      }
      return;
    }
    case "set-budget-mode":
      return;
    case "set-simple-expense":
      assertSafeYen(action.amountYen, "simpleMonthlyExpenseYen");
      return;
    case "add-category":
      if (state.budget.categories.some((c) => c.id === action.category.id))
        throw new Error("category ID is already in use");
      validateAppState({
        ...cloneState(state),
        budget: {
          ...state.budget,
          categories: normalizeCategoryOrder([
            ...state.budget.categories,
            cleanCategory(action.category),
          ]),
        },
      });
      return;
    case "update-category":
      if (!state.budget.categories.some((c) => c.id === action.categoryId))
        throw new Error("category is missing");
      return;
    case "move-category": {
      const active = state.budget.categories
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = active.findIndex((c) => c.id === action.categoryId);
      if (index < 0) throw new Error("active category is missing");
      const other = action.direction === "up" ? index - 1 : index + 1;
      if (other < 0 || other >= active.length)
        throw new Error("category cannot move further");
      return;
    }
    case "set-category-active":
      if (!state.budget.categories.some((c) => c.id === action.categoryId))
        throw new Error("category is missing");
      return;
    case "delete-category": {
      if (!state.budget.categories.some((c) => c.id === action.categoryId))
        throw new Error("category is missing");
      const items = state.budget.items.filter(
        (i) => i.categoryId === action.categoryId,
      );
      if (items.length > 0) {
        const target = state.budget.categories.find(
          (c) =>
            c.id === action.moveToCategoryId &&
            c.active &&
            c.id !== action.categoryId,
        );
        if (!target)
          throw new Error("category with items requires an active move target");
      }
      return;
    }
    case "add-expense":
      if (state.budget.items.some((i) => i.id === action.item.id))
        throw new Error("expense ID is already in use");
      assertExpenseDestination(state, action.item);
      return;
    case "update-expense": {
      const current = state.budget.items.find((i) => i.id === action.itemId);
      if (!current) throw new Error("expense item is missing");
      assertExpenseDestination(state, { ...current, ...action.changes });
      return;
    }
    case "duplicate-expense": {
      const source = state.budget.items.find((i) => i.id === action.itemId);
      if (!source) throw new Error("expense item is missing");
      if (state.budget.items.some((i) => i.id === action.newId))
        throw new Error("expense ID is already in use");
      const duplicate = cleanExpense({
        ...source,
        source: { ...source.source },
        id: action.newId,
        purpose: `${source.purpose}（コピー）`,
      });
      assertExpenseDestination(state, duplicate);
      return;
    }
    case "set-expense-active": {
      const item = state.budget.items.find(
        (candidate) => candidate.id === action.itemId,
      );
      if (!item) throw new Error("expense item is missing");
      if (action.active) assertExpenseDestination(state, item);
      return;
    }
    case "delete-expense":
      if (!state.budget.items.some((i) => i.id === action.itemId))
        throw new Error("expense item is missing");
      return;
  }
}

function assertExpenseDestination(state: AppState, item: ExpenseItem): void {
  assertPositiveSafeInteger(item.amountYen, "expense amountYen");
  assertPositiveSafeInteger(item.cycleValue, "expense cycleValue");
  assertPositiveSafeInteger(
    item.occurrencesPerCycle,
    "expense occurrencesPerCycle",
  );
  monthlyExpenseYen(item);
  const category = state.budget.categories.find(
    (c) => c.id === item.categoryId,
  );
  if (!category || !category.active)
    throw new Error("expense requires an active category");
  if (
    item.scope === "partner" &&
    !state.members.some((m) => m.role === "partner" && m.active)
  )
    throw new Error("partner expense requires an active partner");
}

export function createInitialState(): AppState {
  return {
    schemaVersion: 2,
    activeRoute: "overview",
    members: [
      { id: "member-self", role: "self", displayName: "本人", active: true },
      {
        id: "member-partner",
        role: "partner",
        displayName: "相手",
        active: false,
      },
    ],
    takeHomeInputs: [],
    incomeTargets: [
      { id: "budget-income-self", memberId: "member-self", manualYen: 0 },
      { id: "budget-income-partner", memberId: "member-partner", manualYen: 0 },
    ],
    links: [],
    budget: {
      mode: "detailed",
      globalSelfShareBasisPoints: 5000,
      simpleMonthlyExpenseYen: 0,
      categories: [],
      items: [],
    },
    contributionSources: [],
  };
}
