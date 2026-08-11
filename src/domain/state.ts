export const SCHEMA_VERSION = 1 as const;

export type MemberRole = "self" | "partner";
export type MemberId = string;
export type RouteId =
  "overview" | "budget" | "take-home" | "investments" | "settings";

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

export interface AppState {
  schemaVersion: number;
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
  | { type: "add-link"; link: LinkDefinition }
  | { type: "unlink-income"; targetId: string; manualYen: number };

const routeIds: readonly RouteId[] = [
  "overview",
  "budget",
  "take-home",
  "investments",
  "settings",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
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

function requireArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`${key} must be an array`);
  return value;
}

function uniqueIds(items: readonly { id: string }[], field: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id))
      throw new Error(`${field} IDs must be unique`);
    ids.add(item.id);
  }
}

export function validateAppState(state: AppState): void {
  if (state.schemaVersion !== SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (!routeIds.includes(state.activeRoute))
    throw new Error("activeRoute is invalid");
  uniqueIds(state.members, "member");
  uniqueIds(state.takeHomeInputs, "take-home input");
  uniqueIds(state.incomeTargets, "income target");
  uniqueIds(state.links, "link");
  uniqueIds(state.livingExpenses, "living expense");
  uniqueIds(state.contributionSources, "contribution source");

  const selfMembers = state.members.filter((member) => member.role === "self");
  if (selfMembers.length !== 1) {
    throw new Error("self must occur exactly once");
  }
  if (!selfMembers[0]?.active) throw new Error("self must be active");
  const partners = state.members.filter((member) => member.role === "partner");
  if (
    partners.length > 1 ||
    partners.filter((member) => member.active).length > 1
  ) {
    throw new Error("at most one active partner is allowed");
  }
  const memberIds = new Set(state.members.map((member) => member.id));
  for (const member of state.members) {
    if (!member.displayName) throw new Error("member displayName is required");
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
  const targetIds = new Set(state.incomeTargets.map((target) => target.id));
  const activeTargets = new Set<string>();
  for (const link of state.links) {
    if (!targetIds.has(link.targetId))
      throw new Error("link target is missing");
    if (link.active && activeTargets.has(link.targetId)) {
      throw new Error("only one active link is allowed for a target");
    }
    if (link.active) activeTargets.add(link.targetId);
  }
  for (const expense of state.livingExpenses) {
    if (!memberIds.has(expense.memberId))
      throw new Error("living expense member is missing");
    assertSafeYen(expense.amountYen, "living expense amountYen");
  }
  const contributionKeys = new Set<string>();
  for (const contribution of state.contributionSources) {
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

export function parseAppState(value: unknown): AppState {
  if (!isRecord(value)) throw new Error("state must be an object");
  if (value.schemaVersion !== SCHEMA_VERSION)
    throw new Error("unsupported schema version");
  if (
    typeof value.activeRoute !== "string" ||
    !routeIds.includes(value.activeRoute as RouteId)
  ) {
    throw new Error("activeRoute is invalid");
  }
  const members = requireArray(value, "members").map(
    (item): HouseholdMember => {
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
    },
  );
  const takeHomeInputs = requireArray(value, "takeHomeInputs").map(
    (item): TakeHomeInput => {
      if (!isRecord(item)) throw new Error("take-home input must be an object");
      assertSafeYen(
        item.fixtureMonthlyTakeHomeYen,
        "fixtureMonthlyTakeHomeYen",
      );
      return {
        id: requireString(item, "id"),
        memberId: requireString(item, "memberId"),
        fixtureMonthlyTakeHomeYen: item.fixtureMonthlyTakeHomeYen,
      };
    },
  );
  const incomeTargets = requireArray(value, "incomeTargets").map(
    (item): IncomeTarget => {
      if (!isRecord(item)) throw new Error("income target must be an object");
      assertSafeYen(item.manualYen, "manualYen");
      return {
        id: requireString(item, "id"),
        memberId: requireString(item, "memberId"),
        manualYen: item.manualYen,
      };
    },
  );
  const links = requireArray(value, "links").map((item): LinkDefinition => {
    if (!isRecord(item)) throw new Error("link must be an object");
    if (
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
  const livingExpenses = requireArray(value, "livingExpenses").map(
    (item): LivingExpense => {
      if (!isRecord(item) || item.kind !== "living-expense") {
        throw new Error("living expense is invalid");
      }
      assertSafeYen(item.amountYen, "living expense amountYen");
      return {
        id: requireString(item, "id"),
        memberId: requireString(item, "memberId"),
        kind: item.kind,
        amountYen: item.amountYen,
      };
    },
  );
  const contributionSources = requireArray(value, "contributionSources").map(
    (item): ContributionSource => {
      if (!isRecord(item) || item.kind !== "asset-contribution") {
        throw new Error("contribution source is invalid");
      }
      if (
        item.sourceType !== "nisa-fixture" &&
        item.sourceType !== "ideco-fixture"
      ) {
        throw new Error("contribution sourceType is invalid");
      }
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
    },
  );
  const state: AppState = {
    schemaVersion: SCHEMA_VERSION,
    activeRoute: value.activeRoute as RouteId,
    members,
    takeHomeInputs,
    incomeTargets,
    links,
    livingExpenses,
    contributionSources,
  };
  validateAppState(state);
  return state;
}

export function cloneState(state: AppState): AppState {
  return structuredClone(state);
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function reduceState(state: AppState, action: AppAction): AppState {
  assertActionApplicable(state, action);
  switch (action.type) {
    case "navigate":
      return { ...cloneState(state), activeRoute: action.route };
    case "rename-member":
      return {
        ...cloneState(state),
        members: state.members.map((member) =>
          member.id === action.memberId
            ? { ...member, displayName: action.displayName }
            : { ...member },
        ),
      };
    case "set-partner-active":
      return {
        ...cloneState(state),
        members: state.members.map((member) =>
          member.id === action.memberId
            ? { ...member, active: action.active }
            : { ...member },
        ),
      };
    case "update-take-home":
      return {
        ...cloneState(state),
        takeHomeInputs: state.takeHomeInputs.map((input) =>
          input.id === action.sourceId
            ? { ...input, fixtureMonthlyTakeHomeYen: action.amountYen }
            : { ...input },
        ),
      };
    case "add-link":
      return {
        ...cloneState(state),
        links: [...state.links.map((link) => ({ ...link })), action.link],
      };
    case "unlink-income":
      return {
        ...cloneState(state),
        incomeTargets: state.incomeTargets.map((target) =>
          target.id === action.targetId
            ? { ...target, manualYen: action.manualYen }
            : { ...target },
        ),
        links: state.links.map((link) =>
          link.targetId === action.targetId && link.active
            ? { ...link, active: false }
            : { ...link },
        ),
      };
  }
}

function assertActionApplicable(state: AppState, action: AppAction): void {
  switch (action.type) {
    case "navigate":
      return;
    case "rename-member":
      if (!state.members.some((member) => member.id === action.memberId)) {
        throw new Error("rename member is missing");
      }
      return;
    case "set-partner-active": {
      const member = state.members.find(
        (candidate) => candidate.id === action.memberId,
      );
      if (!member || member.role !== "partner") {
        throw new Error("set-partner-active requires an existing partner");
      }
      return;
    }
    case "update-take-home":
      if (!state.takeHomeInputs.some((input) => input.id === action.sourceId)) {
        throw new Error("take-home source is missing");
      }
      return;
    case "add-link": {
      if (state.links.some((link) => link.id === action.link.id)) {
        throw new Error("link ID is already in use");
      }
      const target = state.incomeTargets.find(
        (candidate) => candidate.id === action.link.targetId,
      );
      if (!target) throw new Error("link target is missing");
      const source = state.takeHomeInputs.find(
        (candidate) => candidate.id === action.link.sourceId,
      );
      if (!source) throw new Error("link source is missing");
      if (target.memberId !== source.memberId) {
        throw new Error("link source and target members must match");
      }
      if (!action.link.active) throw new Error("added link must be active");
      if (
        state.links.some(
          (link) => link.active && link.targetId === action.link.targetId,
        )
      ) {
        throw new Error("only one active link is allowed for a target");
      }
      return;
    }
    case "unlink-income":
      if (
        !state.incomeTargets.some((target) => target.id === action.targetId)
      ) {
        throw new Error("unlink target is missing");
      }
      if (
        !state.links.some(
          (link) => link.active && link.targetId === action.targetId,
        )
      ) {
        throw new Error("active link is missing for unlink target");
      }
      return;
  }
}

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeRoute: "overview",
    members: [
      { id: "member-self", role: "self", displayName: "本人", active: true },
    ],
    takeHomeInputs: [],
    incomeTargets: [],
    links: [],
    livingExpenses: [],
    contributionSources: [],
  };
}
