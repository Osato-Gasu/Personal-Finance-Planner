import { describe, expect, it, vi } from "vitest";
import {
  SCHEMA_VERSION_6_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { migrateToCurrentState } from "../src/domain/migration";
import {
  parseAppState,
  type SchemaVersion2AppState,
  type SchemaVersion3AppState,
  type SchemaVersion4AppState,
  type SchemaVersion5AppState,
  type SchemaVersion6AppState,
} from "../src/domain/state";
import { createFixtureState, createLegacyFixtureState } from "./fixtures/state";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  writes = 0;
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function v6Fixture(): SchemaVersion6AppState {
  const previous = structuredClone(createFixtureState()) as Partial<
    ReturnType<typeof createFixtureState>
  >;
  Reflect.deleteProperty(previous, "lifePlan");
  return {
    ...previous,
    schemaVersion: 6,
    activeRoute: "overview",
  } as SchemaVersion6AppState;
}

function historicalCandidates(): unknown[] {
  const v6 = v6Fixture();
  const withoutBackup = structuredClone(v6) as Partial<SchemaVersion6AppState>;
  Reflect.deleteProperty(withoutBackup, "backup");
  const v5 = {
    ...withoutBackup,
    schemaVersion: 5,
  } as SchemaVersion5AppState;
  const withoutIdeco = structuredClone(v5) as Partial<SchemaVersion5AppState>;
  Reflect.deleteProperty(withoutIdeco, "idecoPlans");
  const v4 = {
    ...withoutIdeco,
    schemaVersion: 4,
  } as SchemaVersion4AppState;
  const withoutInvestments = structuredClone(
    v4,
  ) as Partial<SchemaVersion4AppState>;
  Reflect.deleteProperty(withoutInvestments, "nisaPlans");
  Reflect.deleteProperty(withoutInvestments, "investmentScenarios");
  const v3 = {
    ...withoutInvestments,
    schemaVersion: 3,
  } as SchemaVersion3AppState;
  const legacy = createLegacyFixtureState();
  const v2: SchemaVersion2AppState = {
    schemaVersion: 2,
    activeRoute: legacy.activeRoute,
    members: structuredClone(legacy.members),
    takeHomeInputs: structuredClone(legacy.takeHomeInputs),
    incomeTargets: structuredClone(legacy.incomeTargets),
    links: structuredClone(legacy.links),
    contributionSources: structuredClone(legacy.contributionSources),
    budget: {
      mode: "detailed",
      globalSelfShareBasisPoints: 5000,
      simpleMonthlyExpenseYen: 0,
      categories: [],
      items: [],
    },
  };
  return [legacy, v2, v3, v4, v5, v6];
}

describe("schema v7 life plan migration", () => {
  it("adds the exact deterministic default to schema v6 without mutation", () => {
    const previous = v6Fixture();
    const before = JSON.stringify(previous);
    const migrated = migrateToCurrentState(previous);
    expect(JSON.stringify(previous)).toBe(before);
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.lifePlan).toEqual({
      baseReferenceDate: null,
      projectionStartYear: null,
      startingLiquidAssetsYen: 0,
      projectionYears: 30,
      events: [],
    });
    const domain = structuredClone(migrated) as Partial<typeof migrated>;
    Reflect.deleteProperty(domain, "lifePlan");
    expect(domain).toEqual({ ...previous, schemaVersion: 7 });
    expect(migrateToCurrentState(migrated)).toEqual(migrated);
  });

  it("does not use the wall clock during migration", () => {
    const previous = v6Fixture();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T23:59:59+09:00"));
    const december = JSON.stringify(migrateToCurrentState(previous));
    vi.setSystemTime(new Date("2027-01-01T00:00:01+09:00"));
    const january = JSON.stringify(migrateToCurrentState(previous));
    vi.useRealTimers();
    expect(january).toBe(december);
  });

  it.each(historicalCandidates().map((value, index) => [index + 1, value]))(
    "rejects life-plan as a schema v%s legacy route",
    (_version, value) => {
      expect(() =>
        migrateToCurrentState({
          ...(value as Record<string, unknown>),
          activeRoute: "life-plan",
        }),
      ).toThrow("activeRoute is invalid");
    },
  );

  it("accepts life-plan only in a valid schema v7 state", () => {
    const state = createFixtureState();
    state.activeRoute = "life-plan";
    expect(parseAppState(state).activeRoute).toBe("life-plan");
  });

  it("loads v6 only when v7 is absent, writes v7, and preserves exact v6 bytes", () => {
    const storage = new MemoryStorage();
    const bytes = JSON.stringify(v6Fixture());
    storage.values.set(SCHEMA_VERSION_6_STORAGE_KEY, bytes);
    const loaded = new StorageRepository(storage).load();
    expect(loaded?.schemaVersion).toBe(7);
    expect(storage.getItem(SCHEMA_VERSION_6_STORAGE_KEY)).toBe(bytes);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(loaded));
    expect(storage.writes).toBe(1);
  });

  it("fails closed on corrupt v7 without reading through or overwriting v6", () => {
    const storage = new MemoryStorage();
    const v6Bytes = JSON.stringify(v6Fixture());
    storage.values.set(STORAGE_KEY, "{broken");
    storage.values.set(SCHEMA_VERSION_6_STORAGE_KEY, v6Bytes);
    expect(() => new StorageRepository(storage).load()).toThrow("invalid JSON");
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
    expect(storage.getItem(SCHEMA_VERSION_6_STORAGE_KEY)).toBe(v6Bytes);
    expect(storage.writes).toBe(0);
  });

  it("imports every schema version through v7 without mutating storage", () => {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify(createFixtureState()));
    const before = storage.getItem(STORAGE_KEY);
    const repository = new StorageRepository(storage);
    for (const candidate of [...historicalCandidates(), createFixtureState()]) {
      expect(
        repository.prepareImport(JSON.stringify(candidate)).preview
          .schemaVersion,
      ).toBe(7);
      expect(storage.getItem(STORAGE_KEY)).toBe(before);
    }
    expect(storage.writes).toBe(0);
  });
});
