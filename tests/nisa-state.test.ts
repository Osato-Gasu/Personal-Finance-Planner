import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import {
  SCHEMA_VERSION_3_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { migrateToCurrentState } from "../src/domain/migration";
import {
  calculateNisaPlan,
  type InvestmentScenario,
  type NisaPlan,
} from "../src/domain/nisa";
import {
  validateAppState,
  type AppAction,
  type AppState,
  type SchemaVersion3AppState,
} from "../src/domain/state";
import { createFixtureState, createLegacyFixtureState } from "./fixtures/state";

function required<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function scenario(
  changes: Partial<InvestmentScenario> = {},
): InvestmentScenario {
  return {
    id: "scenario-standard",
    memberId: "self",
    kind: "standard",
    annualReturnBasisPoints: 300,
    annualFeeBasisPoints: 20,
    annualInflationBasisPoints: 100,
    ...changes,
  };
}

function plan(changes: Partial<NisaPlan> = {}): NisaPlan {
  return {
    id: "nisa-self",
    memberId: "self",
    japanResidentConfirmed: true,
    startMonth: "2026-01",
    targetMonth: "2026-12",
    currentBalanceYen: 100_000,
    currentBookValueYen: 90_000,
    usedLimitYen: 90_000,
    usedGrowthLimitYen: 0,
    monthlyTsumitateYen: 10_000,
    monthlyGrowthYen: 0,
    additionalPurchases: [],
    contributionTiming: "end",
    activeScenarioId: "scenario-standard",
    active: true,
    ...changes,
  };
}

function v3Fixture(): SchemaVersion3AppState {
  const current = createFixtureState();
  return {
    schemaVersion: 3,
    activeRoute: current.activeRoute,
    members: structuredClone(current.members),
    takeHomePlans: structuredClone(current.takeHomePlans),
    incomeTargets: structuredClone(current.incomeTargets),
    links: structuredClone(current.links),
    budget: structuredClone(current.budget),
    contributionSources: structuredClone(current.contributionSources),
  };
}

function rejectedWithoutEffects(
  action: AppAction,
  initial = stateWithNisa(),
): void {
  let persisted = JSON.stringify(initial);
  const writer = {
    save: vi.fn((value) => (persisted = JSON.stringify(value))),
  };
  const listener = vi.fn();
  const store = new Store(initial, writer);
  store.subscribe(listener);
  const before = JSON.stringify(store.getState());
  expect(() => store.dispatch(action)).toThrow();
  expect(JSON.stringify(store.getState())).toBe(before);
  expect(persisted).toBe(before);
  expect(writer.save).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
}

function stateWithNisa(): AppState {
  const state = createFixtureState();
  state.members[0] = {
    ...required(state.members[0], "self"),
    birthDate: "1990-01-01",
  };
  state.investmentScenarios = [scenario()];
  state.nisaPlans = [plan()];
  return state;
}

describe("AppState schema v4 migration", () => {
  it("adds only deterministic empty NISA collections to schema v3", () => {
    const previous = v3Fixture();
    const before = JSON.stringify(previous);
    const migrated = migrateToCurrentState(previous);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.nisaPlans).toEqual([]);
    expect(migrated.investmentScenarios).toEqual([]);
    expect({
      ...previous,
      schemaVersion: migrated.schemaVersion,
    }).toEqual({ ...previous, schemaVersion: 4 });
    expect(migrated.activeRoute).toBe(previous.activeRoute);
    expect(migrated.members).toEqual(previous.members);
    expect(migrated.takeHomePlans).toEqual(previous.takeHomePlans);
    expect(migrated.incomeTargets).toEqual(previous.incomeTargets);
    expect(migrated.links).toEqual(previous.links);
    expect(migrated.budget).toEqual(previous.budget);
    expect(migrated.contributionSources).toEqual(previous.contributionSources);
    expect(JSON.stringify(previous)).toBe(before);
    expect(migrateToCurrentState(migrated)).toEqual(migrated);
  });

  it("imports v1, v2, and v3 as v4 without changing preview storage bytes", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const current = createFixtureState();
    repository.save(current);
    const before = storage.getItem(STORAGE_KEY);
    const v3 = v3Fixture();
    const v2 = {
      ...v3,
      schemaVersion: 2,
      takeHomeInputs: v3.takeHomePlans.map((item) => ({
        id: item.id,
        memberId: item.memberId,
        fixtureMonthlyTakeHomeYen:
          item.mode === "legacy-manual"
            ? item.manualAverageMonthlyTakeHomeYen
            : 0,
      })),
    };
    Reflect.deleteProperty(v2, "takeHomePlans");
    const v1 = { ...createLegacyFixtureState() };
    for (const candidate of [v1, v2, v3]) {
      expect(
        repository.prepareImport(JSON.stringify(candidate)).preview
          .schemaVersion,
      ).toBe(4);
      expect(storage.getItem(STORAGE_KEY)).toBe(before);
    }
  });

  it("loads schema v3 from its old key, preserves old bytes, and writes v4", () => {
    const storage = new MemoryStorage();
    const previousBytes = JSON.stringify(v3Fixture());
    storage.values.set(SCHEMA_VERSION_3_STORAGE_KEY, previousBytes);
    const loaded = new StorageRepository(storage).load();
    expect(loaded?.schemaVersion).toBe(4);
    expect(loaded?.nisaPlans).toEqual([]);
    expect(loaded?.investmentScenarios).toEqual([]);
    expect(storage.getItem(SCHEMA_VERSION_3_STORAGE_KEY)).toBe(previousBytes);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(loaded));
  });
});

describe("NISA Store transitions and persistence", () => {
  it("persists blank money as null and distinguishes it from explicit zero across reload and import", () => {
    const state = stateWithNisa();
    state.nisaPlans[0] = plan({
      currentBalanceYen: null,
      currentBookValueYen: null,
      usedLimitYen: null,
      usedGrowthLimitYen: null,
      monthlyTsumitateYen: null,
      monthlyGrowthYen: null,
      additionalPurchases: [
        {
          id: "blank-extra",
          month: "2026-06",
          bucket: "growth",
          amountYen: null,
        },
      ],
    });
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(state);
    const blankBytes = required(storage.getItem(STORAGE_KEY), "blank bytes");
    expect(blankBytes).toContain('"currentBalanceYen":null');
    const loaded = required(repository.load(), "loaded blank state");
    expect(loaded.nisaPlans[0]?.currentBalanceYen).toBeNull();
    expect(loaded.nisaPlans[0]?.additionalPurchases[0]?.amountYen).toBeNull();
    expect(
      calculateNisaPlan(
        required(loaded.nisaPlans[0], "blank plan"),
        loaded.investmentScenarios[0],
        required(loaded.members[0], "member"),
      ).status,
    ).toBe("incomplete");

    const explicitZero = structuredClone(loaded);
    const zeroPlan = required(explicitZero.nisaPlans[0], "zero plan");
    zeroPlan.currentBalanceYen = 0;
    zeroPlan.currentBookValueYen = 0;
    zeroPlan.usedLimitYen = 0;
    zeroPlan.usedGrowthLimitYen = 0;
    zeroPlan.monthlyTsumitateYen = 0;
    zeroPlan.monthlyGrowthYen = 0;
    required(zeroPlan.additionalPurchases[0], "zero purchase").amountYen = 0;
    const imported = repository.prepareImport(JSON.stringify(explicitZero));
    expect(storage.getItem(STORAGE_KEY)).toBe(blankBytes);
    repository.commitImport(imported);
    expect(repository.load()?.nisaPlans[0]?.currentBalanceYen).toBe(0);
    expect(
      repository.load()?.nisaPlans[0]?.additionalPurchases[0]?.amountYen,
    ).toBe(0);
  });

  it("adds scenarios and a plan, switches scenario, and derives fresh results", () => {
    const state = createFixtureState();
    state.members[0] = {
      ...required(state.members[0], "self"),
      birthDate: "1990-01-01",
    };
    const writer = { save: vi.fn() };
    const store = new Store(state, writer);
    store.dispatch({ type: "add-investment-scenario", scenario: scenario() });
    store.dispatch({
      type: "add-investment-scenario",
      scenario: scenario({
        id: "scenario-bull",
        kind: "bull",
        annualReturnBasisPoints: 800,
      }),
    });
    store.dispatch({ type: "add-nisa-plan", plan: plan() });
    const standard = calculateNisaPlan(
      required(store.getState().nisaPlans[0], "standard plan"),
      store.getState().investmentScenarios[0],
      required(store.getState().members[0], "self"),
    );
    store.dispatch({
      type: "update-nisa-plan",
      planId: "nisa-self",
      plan: plan({ activeScenarioId: "scenario-bull" }),
    });
    const bull = calculateNisaPlan(
      required(store.getState().nisaPlans[0], "bull plan"),
      store.getState().investmentScenarios[1],
      required(store.getState().members[0], "self"),
    );
    expect(bull.projectedBalanceYen).toBeGreaterThan(
      standard.projectedBalanceYen ?? 0,
    );
    expect(JSON.stringify(store.getState())).not.toContain(
      "projectedBalanceYen",
    );
    expect(writer.save).toHaveBeenCalledTimes(4);
  });

  it("saves and reloads an over-limit input without clamping it", () => {
    const state = stateWithNisa();
    state.nisaPlans[0] = plan({ monthlyTsumitateYen: 100_001 });
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(state);
    const loaded = repository.load();
    expect(loaded?.nisaPlans[0]?.monthlyTsumitateYen).toBe(100_001);
    const result = calculateNisaPlan(
      required(required(loaded, "loaded state").nisaPlans[0], "loaded plan"),
      required(loaded, "loaded state").investmentScenarios[0],
      required(required(loaded, "loaded state").members[0], "loaded self"),
    );
    expect(result.status).toBe("invalid");
    expect(result.issues[0]?.exceededByYen).toBe(12);
  });

  it("keeps inactive partner NISA data and separates member references", () => {
    const state = stateWithNisa();
    const partner = required(
      state.members.find((member) => member.role === "partner"),
      "partner",
    );
    partner.active = false;
    partner.birthDate = "1992-01-01";
    state.investmentScenarios.push(
      scenario({ id: "partner-standard", memberId: partner.id }),
    );
    state.nisaPlans.push(
      plan({
        id: "nisa-partner",
        memberId: partner.id,
        activeScenarioId: "partner-standard",
      }),
    );
    expect(() => validateAppState(state)).not.toThrow();
    expect(
      calculateNisaPlan(
        required(state.nisaPlans[1], "partner plan"),
        state.investmentScenarios[1],
        partner,
      ).status,
    ).toBe("unsupported");
    expect(state.nisaPlans).toHaveLength(2);
  });

  it("rejects a non-finite inflation projection before writer or listener effects", () => {
    const initial = stateWithNisa();
    required(initial.nisaPlans[0], "plan").targetMonth = "2125-12";
    const current = required(initial.investmentScenarios[0], "scenario");
    rejectedWithoutEffects(
      {
        type: "update-investment-scenario",
        scenarioId: current.id,
        scenario: {
          ...current,
          annualInflationBasisPoints: Number.MAX_SAFE_INTEGER,
        },
      },
      initial,
    );
  });

  it.each([
    [
      "duplicate active plan",
      {
        type: "add-nisa-plan",
        plan: plan({ id: "nisa-second" }),
      },
    ],
    [
      "cross-member scenario",
      {
        type: "update-nisa-plan",
        planId: "nisa-self",
        plan: plan({ activeScenarioId: "partner-standard" }),
      },
    ],
    [
      "missing member scenario",
      {
        type: "add-investment-scenario",
        scenario: scenario({
          id: "missing-member",
          memberId: "missing",
          kind: "bull",
        }),
      },
    ],
    [
      "referenced scenario deletion",
      { type: "delete-investment-scenario", scenarioId: "scenario-standard" },
    ],
    [
      "overflow plan",
      {
        type: "update-nisa-plan",
        planId: "nisa-self",
        plan: plan({ monthlyTsumitateYen: Number.MAX_SAFE_INTEGER }),
      },
    ],
  ] as const)("rejects %s before Store side effects", (_label, action) => {
    const initial = stateWithNisa();
    required(
      initial.members.find((member) => member.role === "partner"),
      "partner",
    ).birthDate = "1992-01-01";
    initial.investmentScenarios.push(
      scenario({ id: "partner-standard", memberId: "partner" }),
    );
    rejectedWithoutEffects(action, initial);
  });

  it("supports additional-contribution CRUD through whole-plan transactions", () => {
    const store = new Store(stateWithNisa());
    const source = structuredClone(
      required(store.getState().nisaPlans[0], "source plan"),
    );
    const added = structuredClone(source);
    added.additionalPurchases.push({
      id: "purchase-1",
      month: "2026-06",
      bucket: "growth",
      amountYen: 50_000,
    });
    store.dispatch({
      type: "update-nisa-plan",
      planId: source.id,
      plan: added,
    });
    const edited = structuredClone(
      required(store.getState().nisaPlans[0], "added plan"),
    );
    required(edited.additionalPurchases[0], "added purchase").amountYen =
      60_000;
    store.dispatch({
      type: "update-nisa-plan",
      planId: source.id,
      plan: edited,
    });
    const removed = structuredClone(
      required(store.getState().nisaPlans[0], "edited plan"),
    );
    removed.additionalPurchases = [];
    store.dispatch({
      type: "update-nisa-plan",
      planId: source.id,
      plan: removed,
    });
    expect(store.getState().nisaPlans[0]?.additionalPurchases).toEqual([]);
    expect(source.additionalPurchases).toEqual([]);
  });
});

describe("NISA import safety", () => {
  it.each([
    [
      "duplicate plan ID",
      (state: AppState): void => {
        state.nisaPlans.push({ ...plan(), active: false });
      },
    ],
    [
      "broken plan member",
      (state: AppState): void => {
        required(state.nisaPlans[0], "plan").memberId = "missing";
      },
    ],
    [
      "broken scenario member",
      (state: AppState): void => {
        required(state.investmentScenarios[0], "scenario").memberId = "missing";
      },
    ],
    [
      "overflow",
      (state: AppState): void => {
        required(state.nisaPlans[0], "plan").monthlyGrowthYen =
          Number.MAX_SAFE_INTEGER;
      },
    ],
    [
      "non-finite inflation projection",
      (state: AppState): void => {
        required(state.nisaPlans[0], "plan").targetMonth = "2125-12";
        required(
          state.investmentScenarios[0],
          "scenario",
        ).annualInflationBasisPoints = Number.MAX_SAFE_INTEGER;
      },
    ],
  ] as const)("rejects %s without changing storage bytes", (_label, mutate) => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(createFixtureState());
    const before = storage.getItem(STORAGE_KEY);
    const incoming = stateWithNisa();
    mutate(incoming);
    expect(() => repository.prepareImport(JSON.stringify(incoming))).toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("rejects recursive prototype pollution keys without changing storage bytes", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(createFixtureState());
    const before = storage.getItem(STORAGE_KEY);
    const serialized = JSON.stringify(stateWithNisa()).replace(
      '"nisaPlans":',
      '"prototype":{"polluted":true},"nisaPlans":',
    );
    expect(() => repository.prepareImport(serialized)).toThrow(
      "unsafe import key",
    );
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
    expect(
      (Object.prototype as { polluted?: boolean }).polluted,
    ).toBeUndefined();
  });
});
