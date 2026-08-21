import { monthlyExpenseYen } from "./checked-arithmetic";
import {
  parseTakeHomePlan,
  validateTakeHomePlan,
  type BonusPayment,
  type TakeHomePlan,
} from "./take-home-plan";
import { calculateTakeHome } from "./take-home-calculator";
import { calculateTakeHomeFromState } from "./take-home-linked-calculator";
import {
  calculateNisaPlan,
  parseInvestmentScenario,
  parseNisaPlan,
  validateInvestmentScenario,
  validateNisaPlan,
  type InvestmentScenario,
  type NisaPlan,
} from "./nisa";
import {
  calculateIdecoPlan,
  parseIdecoPlan,
  validateIdecoPlan,
  type IdecoPlan,
} from "./ideco";
import {
  parsePayrollPlan,
  validatePayrollPlan,
  type PayrollPlan,
} from "./payroll";

export const SCHEMA_VERSION = 8 as const;
export const PREVIOUS_SCHEMA_VERSION = 7 as const;
export const SCHEMA_VERSION_6 = 6 as const;
export const SCHEMA_VERSION_5 = 5 as const;
export const SCHEMA_VERSION_4 = 4 as const;
export const SCHEMA_VERSION_3 = 3 as const;
export const SCHEMA_VERSION_2 = 2 as const;
export const LEGACY_SCHEMA_VERSION = 1 as const;

export type MemberRole = "self" | "partner";
export type MemberId = string;
export type LegacyRouteIdV1ToV6 =
  "overview" | "budget" | "take-home" | "investments" | "settings";
export type SchemaVersion7RouteId = LegacyRouteIdV1ToV6 | "life-plan";
export type RouteId = LegacyRouteIdV1ToV6 | "payroll";
export type ShareMode = "inherit" | "custom";
export type ExpenseScope = "shared" | "self" | "partner";
export type CycleUnit = "day" | "week" | "month" | "year";

export interface HouseholdMember {
  id: MemberId;
  role: MemberRole;
  displayName: string;
  active: boolean;
  birthDate?: string | undefined;
  residencePrefecture?: string | undefined;
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

export interface LifePlanEvent {
  id: string;
  name: string;
  kind: "income" | "expense";
  startYear: number;
  endYear: number;
  annualAmountYen: number;
  memo: string;
  active: boolean;
}

export interface LifePlanState {
  baseReferenceDate: string | null;
  projectionStartYear: number | null;
  startingLiquidAssetsYen: number;
  projectionYears: number;
  events: LifePlanEvent[];
}

export interface TakeHomeCompensationBinding {
  takeHomePlanId: string;
  payrollPlanId: string;
  active: boolean;
}

export interface BudgetIncomePolicy {
  targetId: string;
  mode: "auto-take-home" | "legacy";
}

export interface AppState {
  schemaVersion: 8;
  activeRoute: RouteId;
  members: HouseholdMember[];
  payrollPlans: PayrollPlan[];
  takeHomePlans: TakeHomePlan[];
  takeHomeCompensationBindings: TakeHomeCompensationBinding[];
  incomeTargets: IncomeTarget[];
  budgetIncomePolicies: BudgetIncomePolicy[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
  idecoPlans: IdecoPlan[];
  backup: BackupMetadata;
  lifePlan: LifePlanState;
}

export interface SchemaVersion7AppState {
  schemaVersion: 7;
  activeRoute: SchemaVersion7RouteId;
  members: HouseholdMember[];
  takeHomePlans: TakeHomePlan[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
  idecoPlans: IdecoPlan[];
  backup: BackupMetadata;
  lifePlan: LifePlanState;
}

export interface BackupMetadata {
  lastSuccessfulSaveAt: string | null;
  lastExportedAt: string | null;
  reminderIntervalDays: number;
  reminderDismissedUntil: string | null;
}

export interface SchemaVersion6AppState {
  schemaVersion: 6;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomePlans: TakeHomePlan[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
  idecoPlans: IdecoPlan[];
  backup: BackupMetadata;
}

export interface SchemaVersion5AppState {
  schemaVersion: 5;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomePlans: TakeHomePlan[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
  idecoPlans: IdecoPlan[];
}

export interface SchemaVersion4AppState {
  schemaVersion: 4;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomePlans: TakeHomePlan[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
  nisaPlans: NisaPlan[];
  investmentScenarios: InvestmentScenario[];
}

export interface SchemaVersion3AppState {
  schemaVersion: 3;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomePlans: TakeHomePlan[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
}

export interface SchemaVersion2AppState {
  schemaVersion: 2;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomeInputs: TakeHomeInput[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  budget: BudgetState;
  contributionSources: ContributionSource[];
}

export interface LegacyAppState {
  schemaVersion: 1;
  activeRoute: LegacyRouteIdV1ToV6;
  members: HouseholdMember[];
  takeHomeInputs: TakeHomeInput[];
  incomeTargets: IncomeTarget[];
  links: LinkDefinition[];
  livingExpenses: LivingExpense[];
  contributionSources: ContributionSource[];
}

export type AppAction =
  | { type: "navigate"; route: RouteId }
  | { type: "record-export-success"; at: string }
  | { type: "set-backup-reminder-interval"; days: number }
  | { type: "dismiss-backup-reminder"; until: string | null }
  | { type: "rename-member"; memberId: string; displayName: string }
  | {
      type: "update-member-profile";
      memberId: string;
      birthDate?: string | undefined;
      residencePrefecture?: string | undefined;
    }
  | { type: "set-partner-active"; memberId: string; active: boolean }
  | { type: "add-payroll-plan"; plan: PayrollPlan }
  | { type: "update-payroll-plan"; planId: string; plan: PayrollPlan }
  | { type: "set-payroll-plan-active"; planId: string; active: boolean }
  | { type: "delete-payroll-plan"; planId: string }
  | {
      type: "set-take-home-compensation-binding";
      takeHomePlanId: string;
      payrollPlanId: string | null;
    }
  | { type: "update-take-home"; sourceId: string; amountYen: number }
  | { type: "add-take-home-plan"; plan: TakeHomePlan }
  | { type: "update-take-home-plan"; planId: string; plan: TakeHomePlan }
  | { type: "set-take-home-plan-active"; planId: string; active: boolean }
  | { type: "delete-take-home-plan"; planId: string }
  | { type: "add-take-home-bonus"; planId: string; bonus: BonusPayment }
  | { type: "add-bonus"; planId: string; bonus: BonusPayment }
  | {
      type: "update-take-home-bonus";
      planId: string;
      bonusId: string;
      bonus: BonusPayment;
    }
  | {
      type: "update-bonus";
      planId: string;
      bonusId: string;
      bonus: BonusPayment;
    }
  | { type: "delete-take-home-bonus"; planId: string; bonusId: string }
  | { type: "delete-bonus"; planId: string; bonusId: string }
  | { type: "update-manual-income"; targetId: string; amountYen: number }
  | {
      type: "set-budget-income-policy";
      targetId: string;
      mode: BudgetIncomePolicy["mode"];
    }
  | { type: "add-link"; link: LinkDefinition; referenceDate?: string }
  | {
      type: "link-budget-income-to-take-home-plan";
      link: LinkDefinition;
      referenceDate?: string;
    }
  | {
      type: "unlink-income";
      targetId: string;
      manualYen: number;
      referenceDate?: string;
    }
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
  | { type: "delete-expense"; itemId: string }
  | { type: "add-nisa-plan"; plan: NisaPlan }
  | { type: "update-nisa-plan"; planId: string; plan: NisaPlan }
  | { type: "delete-nisa-plan"; planId: string }
  | { type: "add-ideco-plan"; plan: IdecoPlan }
  | { type: "update-ideco-plan"; planId: string; plan: IdecoPlan }
  | { type: "delete-ideco-plan"; planId: string }
  | { type: "add-investment-scenario"; scenario: InvestmentScenario }
  | {
      type: "update-investment-scenario";
      scenarioId: string;
      scenario: InvestmentScenario;
    }
  | { type: "delete-investment-scenario"; scenarioId: string }
  | {
      type: "update-life-plan-settings";
      baseReferenceDate: string | null;
      projectionStartYear: number | null;
      startingLiquidAssetsYen: number;
      projectionYears: number;
    }
  | { type: "add-life-plan-event"; event: LifePlanEvent }
  | {
      type: "update-life-plan-event";
      eventId: string;
      event: Omit<LifePlanEvent, "id">;
    }
  | {
      type: "set-life-plan-event-active";
      eventId: string;
      active: boolean;
    }
  | { type: "delete-life-plan-event"; eventId: string };

export const routeIds: readonly RouteId[] = [
  "overview",
  "payroll",
  "take-home",
  "budget",
  "investments",
  "settings",
];

export const schemaVersion7RouteIds: readonly SchemaVersion7RouteId[] = [
  "overview",
  "budget",
  "take-home",
  "investments",
  "life-plan",
  "settings",
];

export const legacyRouteIdsV1ToV6: readonly LegacyRouteIdV1ToV6[] = [
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

function assertIsoDate(value: string, field: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${field} must be YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (days[month - 1] ?? 0)
  )
    throw new Error(`${field} must be a real calendar date`);
}

function validateLifePlanEvent(event: LifePlanEvent): void {
  if (typeof event.id !== "string" || event.id.length === 0)
    throw new Error("life plan event id must be a non-empty string");
  assertTrimmedText(event.name, "life plan event name", 1, 80);
  const eventKind = opaque(event.kind);
  if (eventKind !== "income" && eventKind !== "expense")
    throw new Error("life plan event kind is invalid");
  for (const [field, year] of [
    ["startYear", event.startYear],
    ["endYear", event.endYear],
  ] as const) {
    if (!Number.isInteger(year) || year < 1 || year > 9999)
      throw new Error(`${field} must be an integer from 1 to 9999`);
  }
  if (event.endYear < event.startYear)
    throw new Error("life plan event endYear must not precede startYear");
  assertSafeYen(event.annualAmountYen, "life plan event annualAmountYen");
  if (typeof event.memo !== "string" || event.memo.length > 500)
    throw new Error("life plan event memo must be at most 500 characters");
  if (typeof opaque(event.active) !== "boolean")
    throw new Error("life plan event active must be boolean");
}

function validateLifePlanState(lifePlan: LifePlanState): void {
  if (lifePlan.baseReferenceDate !== null)
    assertIsoDate(lifePlan.baseReferenceDate, "baseReferenceDate");
  if (
    lifePlan.projectionStartYear !== null &&
    (!Number.isInteger(lifePlan.projectionStartYear) ||
      lifePlan.projectionStartYear < 1 ||
      lifePlan.projectionStartYear > 9999)
  )
    throw new Error("projectionStartYear must be null or 1..9999");
  assertSafeYen(lifePlan.startingLiquidAssetsYen, "startingLiquidAssetsYen");
  if (
    !Number.isInteger(lifePlan.projectionYears) ||
    lifePlan.projectionYears < 1 ||
    lifePlan.projectionYears > 60
  )
    throw new Error("projectionYears must be 1..60");
  if (
    lifePlan.projectionStartYear !== null &&
    lifePlan.projectionStartYear + lifePlan.projectionYears - 1 > 9999
  )
    throw new Error("life plan projection horizon exceeds year 9999");
  uniqueIds(lifePlan.events, "life plan event");
  lifePlan.events.forEach(validateLifePlanEvent);
}

function assertPersistedDisplayName(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("member displayName must be a non-empty string");
  }
}

function assertEditableDisplayName(
  value: unknown,
  field: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim().length === 0
  ) {
    throw new Error(`${field} must contain a non-whitespace character`);
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

function validateLegacyMembersAndIncome(
  state: SchemaVersion2AppState | LegacyAppState,
): void {
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

function validateCurrentMembersAndIncome(
  state: AppState | SchemaVersion7AppState | SchemaVersion3AppState,
): void {
  uniqueIds(state.members, "member");
  uniqueIds(state.takeHomePlans, "take-home plan");
  uniqueIds(state.incomeTargets, "income target");
  uniqueIds(state.links, "link");
  uniqueIds(state.contributionSources, "contribution source");
  const selfMembers = state.members.filter((member) => member.role === "self");
  if (selfMembers.length !== 1) throw new Error("self must occur exactly once");
  if (!selfMembers[0]?.active) throw new Error("self must be active");
  if (state.members.filter((member) => member.role === "partner").length > 1)
    throw new Error("at most one partner is allowed");
  const memberIds = new Set(state.members.map((member) => member.id));
  for (const member of state.members) {
    if (opaque(member.role) !== "self" && opaque(member.role) !== "partner")
      throw new Error("member role is invalid");
    assertPersistedDisplayName(member.displayName);
    if (member.birthDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(member.birthDate))
        throw new Error("member birthDate is invalid");
      const [year, month, day] = member.birthDate.split("-").map(Number);
      const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() + 1 !== month ||
        date.getUTCDate() !== day
      )
        throw new Error("member birthDate is invalid");
    }
    if (
      member.residencePrefecture !== undefined &&
      !/^JP-(0[1-9]|[1-3][0-9]|4[0-7])$/.test(member.residencePrefecture)
    )
      throw new Error("member residencePrefecture is invalid");
  }
  for (const plan of state.takeHomePlans) {
    validateTakeHomePlan(plan);
    if (!memberIds.has(plan.memberId))
      throw new Error("take-home plan member is missing");
  }
  const activeCalculatedKeys = new Set<string>();
  for (const plan of state.takeHomePlans) {
    if (plan.mode !== "calculated" || !plan.active) continue;
    const key = `${plan.memberId}\u0000${String(plan.targetYear)}`;
    if (activeCalculatedKeys.has(key))
      throw new Error(
        "only one active calculated plan is allowed per member and year",
      );
    activeCalculatedKeys.add(key);
  }
  const targets = new Map(
    state.incomeTargets.map((target) => [target.id, target]),
  );
  for (const target of state.incomeTargets) {
    if (!memberIds.has(target.memberId))
      throw new Error("income target member is missing");
    assertSafeYen(target.manualYen, "manualYen");
  }
  const plans = new Map(state.takeHomePlans.map((plan) => [plan.id, plan]));
  const activeTargets = new Set<string>();
  for (const link of state.links) {
    if (
      opaque(link.sourceType) !== "take-home-result" ||
      opaque(link.field) !== "averageMonthlyTakeHomeYen"
    )
      throw new Error("link source is invalid");
    const target = targets.get(link.targetId);
    if (!target) throw new Error("link target is missing");
    if (link.active) {
      const plan = plans.get(link.sourceId);
      if (!plan || !plan.active)
        throw new Error("active link source is missing");
      if (plan.memberId !== target.memberId)
        throw new Error("active link source and target members must match");
      if (activeTargets.has(link.targetId))
        throw new Error("only one active link is allowed for a target");
      activeTargets.add(link.targetId);
    }
  }
  const contributionKeys = new Set<string>();
  for (const contribution of state.contributionSources) {
    if (
      opaque(contribution.kind) !== "asset-contribution" ||
      !["nisa-fixture", "ideco-fixture"].includes(contribution.sourceType)
    )
      throw new Error("contribution source is invalid");
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

function validateVersion8Relationships(state: AppState): void {
  uniqueIds(state.payrollPlans, "payroll plan");
  const memberIds = new Set(state.members.map((member) => member.id));
  const activePayrollKeys = new Set<string>();
  for (const plan of state.payrollPlans) {
    validatePayrollPlan(plan);
    if (!memberIds.has(plan.memberId))
      throw new Error("payroll plan member is missing");
    if (plan.active) {
      const key = `${plan.memberId}\u0000${String(plan.targetYear)}`;
      if (activePayrollKeys.has(key))
        throw new Error(
          "only one active payroll plan is allowed per member and year",
        );
      activePayrollKeys.add(key);
    }
  }

  const takeHomePlans = new Map(
    state.takeHomePlans.map((plan) => [plan.id, plan]),
  );
  const payrollPlans = new Map(
    state.payrollPlans.map((plan) => [plan.id, plan]),
  );
  const activeBindingTargets = new Set<string>();
  for (const binding of state.takeHomeCompensationBindings) {
    if (!binding.takeHomePlanId || !binding.payrollPlanId)
      throw new Error("take-home compensation binding IDs are required");
    if (typeof opaque(binding.active) !== "boolean")
      throw new Error("take-home compensation binding active is invalid");
    const takeHome = takeHomePlans.get(binding.takeHomePlanId);
    const payroll = payrollPlans.get(binding.payrollPlanId);
    if (!takeHome || takeHome.mode !== "calculated")
      throw new Error("take-home compensation binding target is missing");
    if (!payroll)
      throw new Error("take-home compensation binding payroll is missing");
    if (
      takeHome.memberId !== payroll.memberId ||
      takeHome.targetYear !== payroll.targetYear
    )
      throw new Error(
        "take-home compensation binding member and year must match",
      );
    if (binding.active) {
      if (activeBindingTargets.has(binding.takeHomePlanId))
        throw new Error(
          "only one active compensation binding is allowed per take-home plan",
        );
      activeBindingTargets.add(binding.takeHomePlanId);
    }
  }

  const targetIds = new Set(state.incomeTargets.map((target) => target.id));
  const policyTargets = new Set<string>();
  for (const policy of state.budgetIncomePolicies) {
    if (typeof policy.targetId !== "string" || policy.targetId.length === 0)
      throw new Error("budget income policy targetId is required");
    if (
      opaque(policy.mode) !== "auto-take-home" &&
      opaque(policy.mode) !== "legacy"
    )
      throw new Error("budget income policy mode is invalid");
    if (!targetIds.has(policy.targetId))
      throw new Error("budget income policy target is missing");
    if (policyTargets.has(policy.targetId))
      throw new Error("budget income policy targetId must be unique");
    policyTargets.add(policy.targetId);
  }
}

export function validateAppState(state: AppState): void {
  if (opaque(state.schemaVersion) !== SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (!routeIds.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  validateLifePlanState(state.lifePlan);
  validateBackupMetadata(state.backup);
  validateCurrentMembersAndIncome(state);
  validateVersion8Relationships(state);
  uniqueIds(state.nisaPlans, "NISA plan");
  uniqueIds(state.investmentScenarios, "investment scenario");
  const memberIds = new Set(state.members.map((member) => member.id));
  const scenarios = new Map(
    state.investmentScenarios.map((scenario) => [scenario.id, scenario]),
  );
  const activeNisaMembers = new Set<string>();
  const scenarioKinds = new Set<string>();
  for (const scenario of state.investmentScenarios) {
    validateInvestmentScenario(scenario);
    if (!memberIds.has(scenario.memberId))
      throw new Error("investment scenario member is missing");
    const key = `${scenario.memberId}\u0000${scenario.kind}`;
    if (scenarioKinds.has(key))
      throw new Error("scenario kind must be unique per member");
    scenarioKinds.add(key);
  }
  for (const plan of state.nisaPlans) {
    validateNisaPlan(plan);
    const member = state.members.find((item) => item.id === plan.memberId);
    if (!member) throw new Error("NISA plan member is missing");
    const scenario = scenarios.get(plan.activeScenarioId);
    if (!scenario || scenario.memberId !== plan.memberId)
      throw new Error(
        "NISA active scenario is missing or belongs to another member",
      );
    if (calculateNisaPlan(plan, scenario, member).status === "out-of-range")
      throw new Error("NISA plan exceeds the supported range");
    if (plan.active) {
      if (activeNisaMembers.has(plan.memberId))
        throw new Error("only one active NISA plan is allowed per member");
      activeNisaMembers.add(plan.memberId);
    }
  }
  uniqueIds(state.idecoPlans, "iDeCo plan");
  const activeIdecoMembers = new Set<string>();
  for (const plan of state.idecoPlans) {
    validateIdecoPlan(plan);
    const member = state.members.find((item) => item.id === plan.memberId);
    if (!member) throw new Error("iDeCo plan member is missing");
    const scenario = scenarios.get(plan.activeScenarioId);
    if (!scenario || scenario.memberId !== plan.memberId)
      throw new Error(
        "iDeCo active scenario is missing or belongs to another member",
      );
    if (
      calculateIdecoPlan(plan, scenario, member, {
        taxYear: Number(plan.startMonth.slice(0, 4)),
        referenceDate: `${plan.startMonth}-01`,
      }).status === "out-of-range"
    )
      throw new Error("iDeCo plan exceeds the supported range");
    if (plan.active) {
      if (activeIdecoMembers.has(plan.memberId))
        throw new Error("only one active iDeCo plan is allowed per member");
      activeIdecoMembers.add(plan.memberId);
    }
  }
  for (const plan of state.takeHomePlans) {
    if (plan.mode !== "calculated") continue;
    if (!Object.hasOwn(plan.deductions, "idecoContributionMode"))
      throw new Error("iDeCo contribution mode is required");
    if (!Object.hasOwn(plan.deductions, "linkedIdecoPlanId"))
      throw new Error("linked iDeCo plan identity is required");
    if (plan.deductions.idecoContributionMode !== "linked") continue;
    const linked = state.idecoPlans.find(
      (candidate) => candidate.id === plan.deductions.linkedIdecoPlanId,
    );
    if (!linked || linked.memberId !== plan.memberId)
      throw new Error(
        "linked iDeCo plan is missing or belongs to another member",
      );
  }
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

function assertIsoTimestamp(value: string | null, field: string): void {
  if (value === null) return;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error(`${field} must be an ISO timestamp or null`);
}

function validateBackupMetadata(metadata: BackupMetadata): void {
  assertIsoTimestamp(metadata.lastSuccessfulSaveAt, "lastSuccessfulSaveAt");
  assertIsoTimestamp(metadata.lastExportedAt, "lastExportedAt");
  assertIsoTimestamp(metadata.reminderDismissedUntil, "reminderDismissedUntil");
  if (
    !Number.isSafeInteger(metadata.reminderIntervalDays) ||
    metadata.reminderIntervalDays < 1 ||
    metadata.reminderIntervalDays > 365
  )
    throw new Error("reminderIntervalDays must be 1..365");
}

export function validateLegacyAppState(state: LegacyAppState): void {
  if (opaque(state.schemaVersion) !== LEGACY_SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (!legacyRouteIdsV1ToV6.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  validateLegacyMembersAndIncome(state);
  uniqueIds(state.livingExpenses, "living expense");
  const memberIds = new Set(state.members.map((member) => member.id));
  for (const expense of state.livingExpenses) {
    if (!memberIds.has(expense.memberId))
      throw new Error("living expense member is missing");
    assertSafeYen(expense.amountYen, "living expense amountYen");
  }
}

export function validateSchemaVersion2AppState(
  state: SchemaVersion2AppState,
): void {
  if (opaque(state.schemaVersion) !== SCHEMA_VERSION_2)
    throw new Error("unsupported schema version");
  if (!legacyRouteIdsV1ToV6.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  validateLegacyMembersAndIncome(state);
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
}

function parseMembers(
  value: Record<string, unknown>,
  includeProfile = false,
): HouseholdMember[] {
  return requireArray(value, "members").map((item) => {
    if (!isRecord(item)) throw new Error("member must be an object");
    const role = requireString(item, "role");
    if (role !== "self" && role !== "partner")
      throw new Error("member role is invalid");
    const member: HouseholdMember = {
      id: requireString(item, "id"),
      role,
      displayName: requireString(item, "displayName"),
      active: requireBoolean(item, "active"),
    };
    if (includeProfile && item.birthDate !== undefined)
      member.birthDate = requireString(item, "birthDate");
    if (includeProfile && item.residencePrefecture !== undefined)
      member.residencePrefecture = requireString(item, "residencePrefecture");
    return member;
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

function parseLegacyBase(value: Record<string, unknown>) {
  if (
    typeof value.activeRoute !== "string" ||
    !legacyRouteIdsV1ToV6.includes(value.activeRoute as LegacyRouteIdV1ToV6)
  )
    throw new Error("activeRoute is invalid");
  return {
    activeRoute: value.activeRoute as LegacyRouteIdV1ToV6,
    members: parseMembers(value, false),
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
    ...parseLegacyBase(value),
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
  const members = parseMembers(value, true);
  const memberProfiles = new Map(members.map((member) => [member.id, member]));
  const state: AppState = {
    schemaVersion: 8,
    activeRoute: (() => {
      if (
        typeof value.activeRoute !== "string" ||
        !routeIds.includes(value.activeRoute as RouteId)
      )
        throw new Error("activeRoute is invalid");
      return value.activeRoute as RouteId;
    })(),
    members,
    payrollPlans: requireArray(value, "payrollPlans").map(parsePayrollPlan),
    takeHomePlans: requireArray(value, "takeHomePlans").map((plan) => {
      if (
        !isRecord(plan) ||
        (plan.mode === "calculated" &&
          (!isRecord(plan.deductions) ||
            !Object.hasOwn(plan.deductions, "idecoContributionMode") ||
            !Object.hasOwn(plan.deductions, "linkedIdecoPlanId")))
      )
        throw new Error("schema v5 take-home iDeCo link fields are required");
      const memberId =
        isRecord(plan) && typeof plan.memberId === "string"
          ? plan.memberId
          : "";
      return parseTakeHomePlan(plan, memberProfiles.get(memberId));
    }),
    takeHomeCompensationBindings: requireArray(
      value,
      "takeHomeCompensationBindings",
    ).map((item): TakeHomeCompensationBinding => {
      if (!isRecord(item))
        throw new Error("take-home compensation binding must be an object");
      return {
        takeHomePlanId: requireString(item, "takeHomePlanId"),
        payrollPlanId: requireString(item, "payrollPlanId"),
        active: requireBoolean(item, "active"),
      };
    }),
    incomeTargets: parseIncomeTargets(value),
    budgetIncomePolicies: requireArray(value, "budgetIncomePolicies").map(
      (item): BudgetIncomePolicy => {
        if (!isRecord(item))
          throw new Error("budget income policy must be an object");
        if (item.mode !== "auto-take-home" && item.mode !== "legacy")
          throw new Error("budget income policy mode is invalid");
        return {
          targetId: requireString(item, "targetId"),
          mode: item.mode,
        };
      },
    ),
    links: parseLinks(value),
    contributionSources: parseContributions(value),
    budget: parseBudget(value.budget),
    nisaPlans: requireArray(value, "nisaPlans").map(parseNisaPlan),
    investmentScenarios: requireArray(value, "investmentScenarios").map(
      parseInvestmentScenario,
    ),
    idecoPlans: requireArray(value, "idecoPlans").map(parseIdecoPlan),
    backup: parseBackupMetadata(value.backup),
    lifePlan: parseLifePlanState(value.lifePlan),
  };
  validateAppState(state);
  return state;
}

export function parseSchemaVersion7AppState(
  value: unknown,
): SchemaVersion7AppState {
  if (!isRecord(value) || value.schemaVersion !== PREVIOUS_SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (
    typeof value.activeRoute !== "string" ||
    !schemaVersion7RouteIds.includes(value.activeRoute as SchemaVersion7RouteId)
  )
    throw new Error("activeRoute is invalid");
  const currentLike = {
    ...value,
    schemaVersion: 8,
    activeRoute:
      value.activeRoute === "life-plan" ? "overview" : value.activeRoute,
    payrollPlans: [],
    takeHomeCompensationBindings: [],
    budgetIncomePolicies: [],
  };
  const parsed = parseAppState(currentLike);
  const previous = structuredClone(parsed) as Partial<AppState>;
  Reflect.deleteProperty(previous, "payrollPlans");
  Reflect.deleteProperty(previous, "takeHomeCompensationBindings");
  Reflect.deleteProperty(previous, "budgetIncomePolicies");
  return {
    ...previous,
    schemaVersion: 7,
    activeRoute: value.activeRoute as SchemaVersion7RouteId,
  } as SchemaVersion7AppState;
}

function parseBackupMetadata(value: unknown): BackupMetadata {
  if (!isRecord(value)) throw new Error("backup metadata is required");
  const nullableTimestamp = (key: string): string | null => {
    const item = value[key];
    if (item !== null && typeof item !== "string")
      throw new Error(`${key} must be a string or null`);
    return item;
  };
  const result: BackupMetadata = {
    lastSuccessfulSaveAt: nullableTimestamp("lastSuccessfulSaveAt"),
    lastExportedAt: nullableTimestamp("lastExportedAt"),
    reminderIntervalDays: value.reminderIntervalDays as number,
    reminderDismissedUntil: nullableTimestamp("reminderDismissedUntil"),
  };
  validateBackupMetadata(result);
  return result;
}

function parseLifePlanState(value: unknown): LifePlanState {
  if (!isRecord(value)) throw new Error("lifePlan must be an object");
  const baseReferenceDate = value.baseReferenceDate;
  if (baseReferenceDate !== null && typeof baseReferenceDate !== "string")
    throw new Error("baseReferenceDate must be a string or null");
  const projectionStartYear = value.projectionStartYear;
  if (projectionStartYear !== null && typeof projectionStartYear !== "number")
    throw new Error("projectionStartYear must be a number or null");
  const result: LifePlanState = {
    baseReferenceDate,
    projectionStartYear,
    startingLiquidAssetsYen: value.startingLiquidAssetsYen as number,
    projectionYears: value.projectionYears as number,
    events: requireArray(value, "events").map((item): LifePlanEvent => {
      if (!isRecord(item)) throw new Error("life plan event must be an object");
      if (item.kind !== "income" && item.kind !== "expense")
        throw new Error("life plan event kind is invalid");
      return {
        id: requireString(item, "id"),
        name: requireString(item, "name"),
        kind: item.kind,
        startYear: item.startYear as number,
        endYear: item.endYear as number,
        annualAmountYen: item.annualAmountYen as number,
        memo: requireOptionalString(item, "memo") ?? "",
        active: requireBoolean(item, "active"),
      };
    }),
  };
  validateLifePlanState(result);
  return result;
}

export function parseSchemaVersion6AppState(
  value: unknown,
): SchemaVersion6AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_6)
    throw new Error("unsupported schema version");
  if (
    typeof value.activeRoute !== "string" ||
    !legacyRouteIdsV1ToV6.includes(value.activeRoute as LegacyRouteIdV1ToV6)
  )
    throw new Error("activeRoute is invalid");
  const currentLike = {
    ...value,
    schemaVersion: 7,
    lifePlan: defaultLifePlanState(),
  };
  const parsed = parseSchemaVersion7AppState(currentLike);
  const previous = structuredClone(parsed) as Partial<SchemaVersion7AppState>;
  Reflect.deleteProperty(previous, "lifePlan");
  return { ...previous, schemaVersion: 6 } as SchemaVersion6AppState;
}

export function parseSchemaVersion5AppState(
  value: unknown,
): SchemaVersion5AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_5)
    throw new Error("unsupported schema version");
  const currentLike = {
    ...value,
    schemaVersion: 6,
    backup: {
      lastSuccessfulSaveAt: null,
      lastExportedAt: null,
      reminderIntervalDays: 30,
      reminderDismissedUntil: null,
    },
  };
  const parsed = parseSchemaVersion6AppState(currentLike);
  const previous = structuredClone(parsed) as Partial<SchemaVersion6AppState>;
  Reflect.deleteProperty(previous, "backup");
  return { ...previous, schemaVersion: 5 } as SchemaVersion5AppState;
}

export function parseSchemaVersion4AppState(
  value: unknown,
): SchemaVersion4AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_4)
    throw new Error("unsupported schema version");
  const members = parseMembers(value, true);
  const memberProfiles = new Map(members.map((member) => [member.id, member]));
  const state: SchemaVersion4AppState = {
    schemaVersion: 4,
    activeRoute: (() => {
      if (
        typeof value.activeRoute !== "string" ||
        !legacyRouteIdsV1ToV6.includes(value.activeRoute as LegacyRouteIdV1ToV6)
      )
        throw new Error("activeRoute is invalid");
      return value.activeRoute as LegacyRouteIdV1ToV6;
    })(),
    members,
    takeHomePlans: requireArray(value, "takeHomePlans").map((plan) => {
      const memberId =
        isRecord(plan) && typeof plan.memberId === "string"
          ? plan.memberId
          : "";
      return parseTakeHomePlan(plan, memberProfiles.get(memberId));
    }),
    incomeTargets: parseIncomeTargets(value),
    links: parseLinks(value),
    contributionSources: parseContributions(value),
    budget: parseBudget(value.budget),
    nisaPlans: requireArray(value, "nisaPlans").map(parseNisaPlan),
    investmentScenarios: requireArray(value, "investmentScenarios").map(
      parseInvestmentScenario,
    ),
  };
  validateAppState({
    ...structuredClone(state),
    schemaVersion: 8,
    payrollPlans: [],
    takeHomeCompensationBindings: [],
    budgetIncomePolicies: [],
    idecoPlans: [],
    backup: defaultBackupMetadata(),
    lifePlan: defaultLifePlanState(),
  });
  return state;
}

export function parseSchemaVersion3AppState(
  value: unknown,
): SchemaVersion3AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_3)
    throw new Error("unsupported schema version");
  const members = parseMembers(value, true);
  const memberProfiles = new Map(members.map((member) => [member.id, member]));
  const state: SchemaVersion3AppState = {
    schemaVersion: 3,
    activeRoute: (() => {
      if (
        typeof value.activeRoute !== "string" ||
        !legacyRouteIdsV1ToV6.includes(value.activeRoute as LegacyRouteIdV1ToV6)
      )
        throw new Error("activeRoute is invalid");
      return value.activeRoute as LegacyRouteIdV1ToV6;
    })(),
    members,
    takeHomePlans: requireArray(value, "takeHomePlans").map((plan) => {
      const memberId =
        isRecord(plan) && typeof plan.memberId === "string"
          ? plan.memberId
          : "";
      return parseTakeHomePlan(plan, memberProfiles.get(memberId));
    }),
    incomeTargets: parseIncomeTargets(value),
    links: parseLinks(value),
    contributionSources: parseContributions(value),
    budget: parseBudget(value.budget),
  };
  validateAppState({
    ...structuredClone(state),
    schemaVersion: 8,
    payrollPlans: [],
    takeHomeCompensationBindings: [],
    budgetIncomePolicies: [],
    nisaPlans: [],
    investmentScenarios: [],
    idecoPlans: [],
    backup: defaultBackupMetadata(),
    lifePlan: defaultLifePlanState(),
  });
  return state;
}

export function parseSchemaVersion2AppState(
  value: unknown,
): SchemaVersion2AppState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_2)
    throw new Error("unsupported schema version");
  const state: SchemaVersion2AppState = {
    schemaVersion: 2,
    ...parseLegacyBase(value),
    budget: parseBudget(value.budget),
  };
  validateSchemaVersion2AppState(state);
  return state;
}

export function cloneState<
  T extends
    | AppState
    | SchemaVersion7AppState
    | SchemaVersion6AppState
    | SchemaVersion5AppState
    | SchemaVersion4AppState
    | SchemaVersion3AppState
    | SchemaVersion2AppState
    | LegacyAppState,
>(state: T): T {
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
  if (action.type === "add-bonus")
    return reduceState(state, { ...action, type: "add-take-home-bonus" });
  if (action.type === "update-bonus")
    return reduceState(state, { ...action, type: "update-take-home-bonus" });
  if (action.type === "delete-bonus")
    return reduceState(state, { ...action, type: "delete-take-home-bonus" });
  if (action.type === "link-budget-income-to-take-home-plan")
    return reduceState(state, { ...action, type: "add-link" });
  assertActionApplicable(state, action);
  const next = cloneState(state);
  switch (action.type) {
    case "navigate":
      next.activeRoute = action.route;
      break;
    case "record-export-success":
      next.backup.lastExportedAt = action.at;
      next.backup.reminderDismissedUntil = null;
      break;
    case "set-backup-reminder-interval":
      next.backup.reminderIntervalDays = action.days;
      break;
    case "dismiss-backup-reminder":
      next.backup.reminderDismissedUntil = action.until;
      break;
    case "rename-member":
      requirePresent(
        next.members.find((m) => m.id === action.memberId),
        "rename member is missing",
      ).displayName = action.displayName;
      break;
    case "update-member-profile": {
      const member = requirePresent(
        next.members.find((item) => item.id === action.memberId),
        "member is missing",
      );
      if (action.birthDate) member.birthDate = action.birthDate;
      else delete member.birthDate;
      if (action.residencePrefecture)
        member.residencePrefecture = action.residencePrefecture;
      else delete member.residencePrefecture;
      break;
    }
    case "set-partner-active":
      requirePresent(
        next.members.find((m) => m.id === action.memberId),
        "partner is missing",
      ).active = action.active;
      break;
    case "add-payroll-plan":
      next.payrollPlans.push(structuredClone(action.plan));
      break;
    case "update-payroll-plan":
      next.payrollPlans[
        next.payrollPlans.findIndex((plan) => plan.id === action.planId)
      ] = structuredClone(action.plan);
      break;
    case "set-payroll-plan-active":
      requirePresent(
        next.payrollPlans.find((plan) => plan.id === action.planId),
        "payroll plan is missing",
      ).active = action.active;
      break;
    case "delete-payroll-plan":
      next.payrollPlans = next.payrollPlans.filter(
        (plan) => plan.id !== action.planId,
      );
      break;
    case "set-take-home-compensation-binding":
      next.takeHomeCompensationBindings =
        next.takeHomeCompensationBindings.filter(
          (binding) => binding.takeHomePlanId !== action.takeHomePlanId,
        );
      if (action.payrollPlanId !== null)
        next.takeHomeCompensationBindings.push({
          takeHomePlanId: action.takeHomePlanId,
          payrollPlanId: action.payrollPlanId,
          active: true,
        });
      break;
    case "update-take-home":
      {
        const plan = requirePresent(
          next.takeHomePlans.find((item) => item.id === action.sourceId),
          "take-home source is missing",
        );
        if (plan.mode !== "legacy-manual")
          throw new Error("calculated plan requires update-take-home-plan");
        plan.manualAverageMonthlyTakeHomeYen = action.amountYen;
      }
      break;
    case "add-take-home-plan":
      next.takeHomePlans.push(structuredClone(action.plan));
      break;
    case "update-take-home-plan":
      next.takeHomePlans[
        next.takeHomePlans.findIndex((plan) => plan.id === action.planId)
      ] = structuredClone(action.plan);
      break;
    case "set-take-home-plan-active":
      requirePresent(
        next.takeHomePlans.find((plan) => plan.id === action.planId),
        "take-home plan is missing",
      ).active = action.active;
      break;
    case "delete-take-home-plan":
      next.takeHomePlans = next.takeHomePlans.filter(
        (plan) => plan.id !== action.planId,
      );
      break;
    case "add-take-home-bonus": {
      const plan = requirePresent(
        next.takeHomePlans.find((item) => item.id === action.planId),
        "take-home plan is missing",
      );
      if (plan.mode !== "calculated")
        throw new Error("legacy plan cannot contain bonuses");
      plan.compensation.bonuses.push(structuredClone(action.bonus));
      break;
    }
    case "update-take-home-bonus": {
      const plan = requirePresent(
        next.takeHomePlans.find((item) => item.id === action.planId),
        "take-home plan is missing",
      );
      if (plan.mode !== "calculated")
        throw new Error("legacy plan cannot contain bonuses");
      plan.compensation.bonuses[
        plan.compensation.bonuses.findIndex(
          (bonus) => bonus.id === action.bonusId,
        )
      ] = structuredClone(action.bonus);
      break;
    }
    case "delete-take-home-bonus": {
      const plan = requirePresent(
        next.takeHomePlans.find((item) => item.id === action.planId),
        "take-home plan is missing",
      );
      if (plan.mode !== "calculated")
        throw new Error("legacy plan cannot contain bonuses");
      plan.compensation.bonuses = plan.compensation.bonuses.filter(
        (bonus) => bonus.id !== action.bonusId,
      );
      break;
    }
    case "update-manual-income":
      requirePresent(
        next.incomeTargets.find((t) => t.id === action.targetId),
        "income target is missing",
      ).manualYen = action.amountYen;
      break;
    case "set-budget-income-policy": {
      const existing = next.budgetIncomePolicies.find(
        (policy) => policy.targetId === action.targetId,
      );
      if (existing) existing.mode = action.mode;
      else
        next.budgetIncomePolicies.push({
          targetId: action.targetId,
          mode: action.mode,
        });
      break;
    }
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
        self.displayName = action.selfName;
      const partner = requirePresent(
        next.members.find((m) => m.role === "partner"),
        "partner is missing",
      );
      if (action.partnerName !== partner.displayName)
        partner.displayName = action.partnerName;
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
    case "add-nisa-plan":
      next.nisaPlans.push(structuredClone(action.plan));
      break;
    case "update-nisa-plan":
      next.nisaPlans[
        next.nisaPlans.findIndex((plan) => plan.id === action.planId)
      ] = structuredClone(action.plan);
      break;
    case "delete-nisa-plan":
      next.nisaPlans = next.nisaPlans.filter(
        (plan) => plan.id !== action.planId,
      );
      break;
    case "add-ideco-plan":
      next.idecoPlans.push(structuredClone(action.plan));
      break;
    case "update-ideco-plan":
      next.idecoPlans[
        next.idecoPlans.findIndex((plan) => plan.id === action.planId)
      ] = structuredClone(action.plan);
      break;
    case "delete-ideco-plan":
      next.idecoPlans = next.idecoPlans.filter(
        (plan) => plan.id !== action.planId,
      );
      break;
    case "add-investment-scenario":
      next.investmentScenarios.push(structuredClone(action.scenario));
      break;
    case "update-investment-scenario":
      next.investmentScenarios[
        next.investmentScenarios.findIndex(
          (scenario) => scenario.id === action.scenarioId,
        )
      ] = structuredClone(action.scenario);
      break;
    case "delete-investment-scenario":
      next.investmentScenarios = next.investmentScenarios.filter(
        (scenario) => scenario.id !== action.scenarioId,
      );
      break;
    case "update-life-plan-settings":
      next.lifePlan = {
        ...next.lifePlan,
        baseReferenceDate: action.baseReferenceDate,
        projectionStartYear: action.projectionStartYear,
        startingLiquidAssetsYen: action.startingLiquidAssetsYen,
        projectionYears: action.projectionYears,
      };
      break;
    case "add-life-plan-event":
      next.lifePlan.events.push(structuredClone(action.event));
      break;
    case "update-life-plan-event": {
      const index = next.lifePlan.events.findIndex(
        (event) => event.id === action.eventId,
      );
      next.lifePlan.events[index] = {
        id: action.eventId,
        ...structuredClone(action.event),
      };
      break;
    }
    case "set-life-plan-event-active":
      requirePresent(
        next.lifePlan.events.find((event) => event.id === action.eventId),
        "life plan event is missing",
      ).active = action.active;
      break;
    case "delete-life-plan-event":
      next.lifePlan.events = next.lifePlan.events.filter(
        (event) => event.id !== action.eventId,
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
      assertEditableDisplayName(action.displayName, "member displayName");
      return;
    case "update-member-profile": {
      const member = state.members.find((item) => item.id === action.memberId);
      if (!member) throw new Error("member is missing");
      validateAppState({
        ...cloneState(state),
        members: state.members.map((item) =>
          item.id === action.memberId
            ? {
                ...item,
                ...(action.birthDate ? { birthDate: action.birthDate } : {}),
                ...(action.residencePrefecture
                  ? { residencePrefecture: action.residencePrefecture }
                  : {}),
              }
            : item,
        ),
      });
      return;
    }
    case "set-partner-active":
      if (
        !state.members.some(
          (m) => m.id === action.memberId && m.role === "partner",
        )
      )
        throw new Error("set-partner-active requires an existing partner");
      return;
    case "add-payroll-plan":
      if (state.payrollPlans.some((plan) => plan.id === action.plan.id))
        throw new Error("payroll plan ID is already in use");
      validateAppState({
        ...cloneState(state),
        payrollPlans: [...state.payrollPlans, structuredClone(action.plan)],
      });
      return;
    case "update-payroll-plan":
      if (!state.payrollPlans.some((plan) => plan.id === action.planId))
        throw new Error("payroll plan is missing");
      if (action.plan.id !== action.planId)
        throw new Error("payroll plan ID cannot change");
      validateAppState({
        ...cloneState(state),
        payrollPlans: state.payrollPlans.map((plan) =>
          plan.id === action.planId ? structuredClone(action.plan) : plan,
        ),
      });
      return;
    case "set-payroll-plan-active":
      if (!state.payrollPlans.some((plan) => plan.id === action.planId))
        throw new Error("payroll plan is missing");
      validateAppState({
        ...cloneState(state),
        payrollPlans: state.payrollPlans.map((plan) =>
          plan.id === action.planId ? { ...plan, active: action.active } : plan,
        ),
      });
      return;
    case "delete-payroll-plan":
      if (!state.payrollPlans.some((plan) => plan.id === action.planId))
        throw new Error("payroll plan is missing");
      if (
        state.takeHomeCompensationBindings.some(
          (binding) => binding.payrollPlanId === action.planId,
        )
      )
        throw new Error("bound payroll plan must be unbound before deletion");
      return;
    case "set-take-home-compensation-binding": {
      const bindings = state.takeHomeCompensationBindings.filter(
        (binding) => binding.takeHomePlanId !== action.takeHomePlanId,
      );
      if (action.payrollPlanId !== null)
        bindings.push({
          takeHomePlanId: action.takeHomePlanId,
          payrollPlanId: action.payrollPlanId,
          active: true,
        });
      validateAppState({
        ...cloneState(state),
        takeHomeCompensationBindings: bindings,
      });
      return;
    }
    case "update-take-home":
      if (
        !state.takeHomePlans.some(
          (plan) =>
            plan.id === action.sourceId && plan.mode === "legacy-manual",
        )
      )
        throw new Error("take-home source is missing");
      assertSafeYen(action.amountYen, "amountYen");
      return;
    case "add-take-home-plan":
      if (state.takeHomePlans.some((plan) => plan.id === action.plan.id))
        throw new Error("take-home plan ID is already in use");
      validateTakeHomePlan(action.plan);
      {
        const member = state.members.find(
          (candidate) => candidate.id === action.plan.memberId,
        );
        if (!member) throw new Error("take-home plan member is missing");
        if (calculateTakeHome(action.plan, member).status === "out-of-range")
          throw new Error("take-home plan exceeds the supported range");
      }
      return;
    case "update-take-home-plan":
      if (!state.takeHomePlans.some((plan) => plan.id === action.planId))
        throw new Error("take-home plan is missing");
      if (action.plan.id !== action.planId)
        throw new Error("take-home plan ID cannot change");
      validateTakeHomePlan(action.plan);
      {
        const member = state.members.find(
          (candidate) => candidate.id === action.plan.memberId,
        );
        if (!member) throw new Error("take-home plan member is missing");
        if (calculateTakeHome(action.plan, member).status === "out-of-range")
          throw new Error("take-home plan exceeds the supported range");
      }
      return;
    case "delete-take-home-plan":
      if (!state.takeHomePlans.some((plan) => plan.id === action.planId))
        throw new Error("take-home plan is missing");
      if (
        state.links.some(
          (link) => link.active && link.sourceId === action.planId,
        )
      )
        throw new Error(
          "linked take-home plan must be unlinked before deletion",
        );
      if (
        state.takeHomeCompensationBindings.some(
          (binding) => binding.takeHomePlanId === action.planId,
        )
      )
        throw new Error("payroll binding must be removed before deletion");
      return;
    case "set-take-home-plan-active":
      if (!state.takeHomePlans.some((plan) => plan.id === action.planId))
        throw new Error("take-home plan is missing");
      if (
        !action.active &&
        state.links.some(
          (link) => link.active && link.sourceId === action.planId,
        )
      )
        throw new Error(
          "linked take-home plan must be unlinked before deactivation",
        );
      validateAppState({
        ...cloneState(state),
        takeHomePlans: state.takeHomePlans.map((plan) =>
          plan.id === action.planId ? { ...plan, active: action.active } : plan,
        ),
      });
      return;
    case "add-take-home-bonus":
    case "update-take-home-bonus":
    case "delete-take-home-bonus": {
      const plan = state.takeHomePlans.find(
        (item) => item.id === action.planId,
      );
      if (!plan || plan.mode !== "calculated")
        throw new Error("calculated take-home plan is missing");
      if (action.type === "add-take-home-bonus") {
        if (
          plan.compensation.bonuses.some(
            (bonus) => bonus.id === action.bonus.id,
          )
        )
          throw new Error("bonus ID is already in use");
        parseTakeHomePlan({
          ...structuredClone(plan),
          compensation: {
            ...structuredClone(plan.compensation),
            bonuses: [...plan.compensation.bonuses, action.bonus],
          },
        });
      } else {
        const bonusId =
          action.type === "update-take-home-bonus"
            ? action.bonusId
            : action.bonusId;
        if (!plan.compensation.bonuses.some((bonus) => bonus.id === bonusId))
          throw new Error("bonus is missing");
        if (action.type === "update-take-home-bonus") {
          if (action.bonus.id !== action.bonusId)
            throw new Error("bonus ID cannot change");
          parseTakeHomePlan({
            ...structuredClone(plan),
            compensation: {
              ...structuredClone(plan.compensation),
              bonuses: plan.compensation.bonuses.map((bonus) =>
                bonus.id === action.bonusId ? action.bonus : bonus,
              ),
            },
          });
        }
      }
      return;
    }
    case "update-manual-income":
      if (!state.incomeTargets.some((t) => t.id === action.targetId))
        throw new Error("income target is missing");
      if (hasActiveLink(state, action.targetId))
        throw new Error("linked income is read-only");
      assertSafeYen(action.amountYen, "amountYen");
      return;
    case "set-budget-income-policy":
      if (!state.incomeTargets.some((target) => target.id === action.targetId))
        throw new Error("budget income policy target is missing");
      if (
        opaque(action.mode) !== "auto-take-home" &&
        opaque(action.mode) !== "legacy"
      )
        throw new Error("budget income policy mode is invalid");
      return;
    case "add-link": {
      if (state.links.some((l) => l.id === action.link.id))
        throw new Error("link ID is already in use");
      const target = state.incomeTargets.find(
        (t) => t.id === action.link.targetId,
      );
      if (!target) throw new Error("link target is missing");
      const source = state.takeHomePlans.find(
        (s) => s.id === action.link.sourceId,
      );
      if (!source || !source.active) throw new Error("link source is missing");
      if (target.memberId !== source.memberId)
        throw new Error("link source and target members must match");
      const member = state.members.find(
        (candidate) => candidate.id === source.memberId,
      );
      if (
        !member ||
        calculateTakeHomeFromState(
          state,
          source,
          member,
          action.referenceDate ?? null,
        ).status !== "complete"
      )
        throw new Error("only a complete take-home result can be linked");
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
        const source = state.takeHomePlans.find(
          (candidate) => candidate.id === link.sourceId,
        );
        if (!source) throw new Error("active link source is missing");
        assertSafeYen(action.manualYen, "manualYen");
        const member = state.members.find(
          (candidate) => candidate.id === source.memberId,
        );
        if (!member) throw new Error("active link member is missing");
        const result = calculateTakeHomeFromState(
          state,
          source,
          member,
          action.referenceDate ?? null,
        );
        if (
          result.averageMonthlyTakeHomeYen === null ||
          action.manualYen !== result.averageMonthlyTakeHomeYen
        ) {
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
        assertEditableDisplayName(action.selfName, "self name");
      if (action.partnerName !== partner.displayName)
        assertEditableDisplayName(action.partnerName, "partner name");
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
    case "add-nisa-plan":
      if (state.nisaPlans.some((plan) => plan.id === action.plan.id))
        throw new Error("NISA plan ID is already in use");
      assertNisaStateChange({
        ...cloneState(state),
        nisaPlans: [...state.nisaPlans, structuredClone(action.plan)],
      });
      return;
    case "update-nisa-plan":
      if (!state.nisaPlans.some((plan) => plan.id === action.planId))
        throw new Error("NISA plan is missing");
      if (action.plan.id !== action.planId)
        throw new Error("NISA plan ID cannot change");
      assertNisaStateChange({
        ...cloneState(state),
        nisaPlans: state.nisaPlans.map((plan) =>
          plan.id === action.planId ? structuredClone(action.plan) : plan,
        ),
      });
      return;
    case "delete-nisa-plan":
      if (!state.nisaPlans.some((plan) => plan.id === action.planId))
        throw new Error("NISA plan is missing");
      return;
    case "add-ideco-plan":
      if (state.idecoPlans.some((plan) => plan.id === action.plan.id))
        throw new Error("iDeCo plan ID is already in use");
      assertNisaStateChange({
        ...cloneState(state),
        idecoPlans: [...state.idecoPlans, structuredClone(action.plan)],
      });
      return;
    case "update-ideco-plan":
      if (!state.idecoPlans.some((plan) => plan.id === action.planId))
        throw new Error("iDeCo plan is missing");
      if (action.plan.id !== action.planId)
        throw new Error("iDeCo plan ID cannot change");
      assertNisaStateChange({
        ...cloneState(state),
        idecoPlans: state.idecoPlans.map((plan) =>
          plan.id === action.planId ? structuredClone(action.plan) : plan,
        ),
      });
      return;
    case "delete-ideco-plan":
      if (!state.idecoPlans.some((plan) => plan.id === action.planId))
        throw new Error("iDeCo plan is missing");
      if (
        state.takeHomePlans.some(
          (plan) =>
            plan.mode === "calculated" &&
            plan.deductions.idecoContributionMode === "linked" &&
            plan.deductions.linkedIdecoPlanId === action.planId,
        )
      )
        throw new Error("linked iDeCo plan must be unlinked before deletion");
      return;
    case "add-investment-scenario":
      if (
        state.investmentScenarios.some(
          (scenario) => scenario.id === action.scenario.id,
        )
      )
        throw new Error("scenario ID is already in use");
      assertNisaStateChange({
        ...cloneState(state),
        investmentScenarios: [
          ...state.investmentScenarios,
          structuredClone(action.scenario),
        ],
      });
      return;
    case "update-investment-scenario":
      if (
        !state.investmentScenarios.some(
          (scenario) => scenario.id === action.scenarioId,
        )
      )
        throw new Error("scenario is missing");
      if (action.scenario.id !== action.scenarioId)
        throw new Error("scenario ID cannot change");
      assertNisaStateChange({
        ...cloneState(state),
        investmentScenarios: state.investmentScenarios.map((scenario) =>
          scenario.id === action.scenarioId
            ? structuredClone(action.scenario)
            : scenario,
        ),
      });
      return;
    case "delete-investment-scenario":
      if (
        !state.investmentScenarios.some(
          (scenario) => scenario.id === action.scenarioId,
        )
      )
        throw new Error("scenario is missing");
      if (
        state.nisaPlans.some(
          (plan) => plan.activeScenarioId === action.scenarioId,
        )
      )
        throw new Error("active NISA scenario cannot be deleted");
      if (
        state.idecoPlans.some(
          (plan) => plan.activeScenarioId === action.scenarioId,
        )
      )
        throw new Error("active iDeCo scenario cannot be deleted");
      return;
    case "update-life-plan-settings":
      validateLifePlanState({
        ...structuredClone(state.lifePlan),
        baseReferenceDate: action.baseReferenceDate,
        projectionStartYear: action.projectionStartYear,
        startingLiquidAssetsYen: action.startingLiquidAssetsYen,
        projectionYears: action.projectionYears,
      });
      return;
    case "add-life-plan-event":
      if (state.lifePlan.events.some((event) => event.id === action.event.id))
        throw new Error("life plan event ID is already in use");
      validateLifePlanState({
        ...structuredClone(state.lifePlan),
        events: [...state.lifePlan.events, structuredClone(action.event)],
      });
      return;
    case "update-life-plan-event":
      if (!state.lifePlan.events.some((event) => event.id === action.eventId))
        throw new Error("life plan event is missing");
      validateLifePlanState({
        ...structuredClone(state.lifePlan),
        events: state.lifePlan.events.map((event) =>
          event.id === action.eventId
            ? { id: action.eventId, ...structuredClone(action.event) }
            : structuredClone(event),
        ),
      });
      return;
    case "set-life-plan-event-active":
      if (!state.lifePlan.events.some((event) => event.id === action.eventId))
        throw new Error("life plan event is missing");
      return;
    case "delete-life-plan-event":
      if (!state.lifePlan.events.some((event) => event.id === action.eventId))
        throw new Error("life plan event is missing");
      return;
  }
}

function assertNisaStateChange(candidate: AppState): void {
  validateAppState(candidate);
  for (const plan of candidate.nisaPlans) {
    const member = candidate.members.find((item) => item.id === plan.memberId);
    const scenario = candidate.investmentScenarios.find(
      (item) => item.id === plan.activeScenarioId,
    );
    if (!member) throw new Error("NISA plan member is missing");
    if (calculateNisaPlan(plan, scenario, member).status === "out-of-range")
      throw new Error("NISA plan exceeds the supported range");
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
    schemaVersion: 8,
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
    payrollPlans: [],
    takeHomePlans: [],
    takeHomeCompensationBindings: [],
    incomeTargets: [
      { id: "budget-income-self", memberId: "member-self", manualYen: 0 },
      { id: "budget-income-partner", memberId: "member-partner", manualYen: 0 },
    ],
    budgetIncomePolicies: [],
    links: [],
    budget: {
      mode: "detailed",
      globalSelfShareBasisPoints: 5000,
      simpleMonthlyExpenseYen: 0,
      categories: [],
      items: [],
    },
    contributionSources: [],
    nisaPlans: [],
    investmentScenarios: [],
    idecoPlans: [],
    backup: defaultBackupMetadata(),
    lifePlan: defaultLifePlanState(),
  };
}

export function defaultLifePlanState(): LifePlanState {
  return {
    baseReferenceDate: null,
    projectionStartYear: null,
    startingLiquidAssetsYen: 0,
    projectionYears: 30,
    events: [],
  };
}

export function defaultBackupMetadata(): BackupMetadata {
  return {
    lastSuccessfulSaveAt: null,
    lastExportedAt: null,
    reminderIntervalDays: 30,
    reminderDismissedUntil: null,
  };
}
