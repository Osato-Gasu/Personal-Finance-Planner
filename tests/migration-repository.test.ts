import { describe, expect, it } from "vitest";
import { migrateToCurrentState } from "../src/domain/migration";
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import {
  validateAppState,
  type AppState,
  type LegacyAppState,
} from "../src/domain/state";
import { createFixtureState, createLegacyFixtureState } from "./fixtures/state";

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

class ByteStorage implements StorageLike {
  readonly values = new Map<string, string>();
  fail: "none" | "before" | "after" = "none";

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.fail === "before") throw new Error("write failed");
    this.values.set(key, value);
    if (this.fail === "after") throw new Error("write failed");
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function withoutPartnerAndTargets(): LegacyAppState {
  const legacy = createLegacyFixtureState();
  legacy.members = legacy.members.filter((member) => member.role === "self");
  legacy.takeHomeInputs = legacy.takeHomeInputs.filter(
    (input) => input.memberId === "self",
  );
  legacy.incomeTargets = [];
  legacy.links = [];
  legacy.livingExpenses = [];
  return legacy;
}

describe("schema version 1 to 2 migration", () => {
  it("preserves legacy entities and migrates living expenses traceably", () => {
    const legacy = createLegacyFixtureState();
    const migrated = migrateToCurrentState(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.members).toEqual(legacy.members);
    expect(migrated.takeHomeInputs).toEqual(legacy.takeHomeInputs);
    expect(migrated.incomeTargets).toEqual(legacy.incomeTargets);
    expect(migrated.links).toEqual(legacy.links);
    expect(migrated.contributionSources).toEqual(legacy.contributionSources);
    expect(migrated.budget.categories).toHaveLength(1);
    expect(migrated.budget.items).toMatchObject([
      {
        id: "legacy-living-self",
        amountYen: 12_345,
        cycleValue: 1,
        cycleUnit: "month",
        occurrencesPerCycle: 1,
        scope: "self",
        memo: "v1:legacy-living-self",
        active: true,
      },
    ]);
  });

  it("does not invent categories or items for an empty legacy budget", () => {
    const migrated = migrateToCurrentState(withoutPartnerAndTargets());
    expect(migrated.budget.categories).toEqual([]);
    expect(migrated.budget.items).toEqual([]);
  });

  it("preserves a valid zero-yen legacy expense without inventing value", () => {
    const legacy = createLegacyFixtureState();
    required(legacy.livingExpenses[0], "legacy expense").amountYen = 0;
    const migrated = migrateToCurrentState(legacy);
    expect(
      required(migrated.budget.items[0], "migrated expense").amountYen,
    ).toBe(0);
  });

  it("adds one inactive partner and missing manual income targets", () => {
    const migrated = migrateToCurrentState(withoutPartnerAndTargets());
    const partner = migrated.members.find(
      (member) => member.role === "partner",
    );
    expect(partner).toMatchObject({ active: false, displayName: "相手" });
    expect(migrated.incomeTargets).toHaveLength(2);
    expect(
      migrated.members.every((member) =>
        migrated.incomeTargets.some((target) => target.memberId === member.id),
      ),
    ).toBe(true);
  });

  it("is idempotent for schema version 2", () => {
    const once = migrateToCurrentState(createLegacyFixtureState());
    const twice = migrateToCurrentState(once);
    expect(twice).toEqual(once);
  });

  it("rejects a missing active link source during migration", () => {
    const legacy = createLegacyFixtureState();
    required(legacy.links[0], "legacy link").sourceId = "missing";
    expect(() => migrateToCurrentState(legacy)).toThrow(
      "active link source is missing",
    );
  });

  it("rejects active link member mismatch during migration", () => {
    const legacy = createLegacyFixtureState();
    required(legacy.links[0], "legacy link").sourceId = "take-home-partner";
    expect(() => migrateToCurrentState(legacy)).toThrow("members must match");
  });
});

describe("versioned repository migration and active link integrity", () => {
  it("loads v1 only when v2 is absent, preserves v1 bytes, and writes validated v2", () => {
    const storage = new ByteStorage();
    const legacyBytes = JSON.stringify(createLegacyFixtureState());
    storage.values.set(LEGACY_STORAGE_KEY, legacyBytes);
    const loaded = new StorageRepository(storage).load();
    expect(loaded?.schemaVersion).toBe(2);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(legacyBytes);
    expect(
      migrateToCurrentState(
        JSON.parse(required(storage.getItem(STORAGE_KEY), "v2 bytes")),
      ).schemaVersion,
    ).toBe(2);
  });

  it("does not fall back to valid v1 when v2 is corrupt", () => {
    const storage = new ByteStorage();
    const legacyBytes = JSON.stringify(createLegacyFixtureState());
    storage.values.set(LEGACY_STORAGE_KEY, legacyBytes);
    storage.values.set(STORAGE_KEY, "{broken");
    expect(() => new StorageRepository(storage).load()).toThrow("invalid JSON");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(legacyBytes);
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
  });

  it.each(["before", "after"] as const)(
    "preserves v1 and v2 bytes when migration save fails %s mutation",
    (fail) => {
      const storage = new ByteStorage();
      const legacyBytes = JSON.stringify(createLegacyFixtureState());
      storage.values.set(LEGACY_STORAGE_KEY, legacyBytes);
      storage.fail = fail;
      expect(() => new StorageRepository(storage).load()).toThrow(
        "write failed",
      );
      expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(legacyBytes);
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
    },
  );

  it("previews v1 import as v2 without changing persisted bytes", () => {
    const storage = new ByteStorage();
    const current = createFixtureState();
    storage.values.set(STORAGE_KEY, JSON.stringify(current));
    const v2Before = storage.getItem(STORAGE_KEY);
    const legacyBytes = JSON.stringify(createLegacyFixtureState());
    const prepared = new StorageRepository(storage).prepareImport(legacyBytes);
    expect(prepared.preview.schemaVersion).toBe(2);
    expect(storage.getItem(STORAGE_KEY)).toBe(v2Before);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it("imports valid v2", () => {
    const repository = new StorageRepository(new ByteStorage());
    expect(
      repository.prepareImport(JSON.stringify(createFixtureState())).preview,
    ).toEqual(createFixtureState());
  });

  it.each(["state", "load", "import"])(
    "rejects a missing active link source during %s",
    (operation) => {
      const invalid = createFixtureState();
      required(invalid.links[0], "active link").sourceId = "missing";
      const bytes = JSON.stringify(invalid);
      if (operation === "state") {
        expect(() => validateAppState(invalid)).toThrow(
          "active link source is missing",
        );
        return;
      }
      const storage = new ByteStorage();
      const currentBytes = JSON.stringify(createFixtureState());
      storage.values.set(
        STORAGE_KEY,
        operation === "load" ? bytes : currentBytes,
      );
      const repository = new StorageRepository(storage);
      if (operation === "load")
        expect(() => repository.load()).toThrow(
          "active link source is missing",
        );
      else
        expect(() => repository.prepareImport(bytes)).toThrow(
          "active link source is missing",
        );
      expect(storage.getItem(STORAGE_KEY)).toBe(
        operation === "load" ? bytes : currentBytes,
      );
    },
  );

  it("allows an inactive link to retain a missing historical source", () => {
    const state = createFixtureState();
    const link = required(state.links[0], "active link");
    link.active = false;
    link.sourceId = "missing";
    validateAppState(state);
    const storage = new ByteStorage();
    const repository = new StorageRepository(storage);
    repository.save(state);
    expect(repository.load()?.links[0]).toMatchObject({
      active: false,
      sourceId: "missing",
    });
  });

  it("accepts a valid active link and recalculates from its source", () => {
    const storage = new ByteStorage();
    const state = createFixtureState();
    new StorageRepository(storage).save(state);
    const loaded = required(
      new StorageRepository(storage).load(),
      "loaded state",
    );
    expect(loaded.links[0]).toMatchObject({
      sourceId: "take-home-self",
      targetId: "budget-income-self",
      active: true,
    });
  });

  it("preserves current v1 and v2 bytes when invalid import is rejected", () => {
    const storage = new ByteStorage();
    const v1 = JSON.stringify(createLegacyFixtureState());
    const v2 = JSON.stringify(createFixtureState());
    storage.values.set(LEGACY_STORAGE_KEY, v1);
    storage.values.set(STORAGE_KEY, v2);
    const invalid: AppState = createFixtureState();
    required(invalid.links[0], "active link").sourceId = "missing";
    expect(() =>
      new StorageRepository(storage).prepareImport(JSON.stringify(invalid)),
    ).toThrow("active link source is missing");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(v1);
    expect(storage.getItem(STORAGE_KEY)).toBe(v2);
  });
});
