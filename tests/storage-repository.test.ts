import { describe, expect, it } from "vitest";
import { Store } from "../src/app/store";
import { commitPreparedImport } from "../src/data/import-coordinator";
import {
  MAX_IMPORT_BYTES,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { createFixtureState, createLegacyFixtureState } from "./fixtures/state";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("write failed");
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("StorageRepository export/import transaction", () => {
  it("loads, saves, and exports valid state under a versioned key", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const state = createFixtureState();
    repository.save(state);
    expect(STORAGE_KEY).toContain(":v2");
    expect(repository.load()).toEqual(state);
    expect(JSON.parse(repository.export(state))).toEqual(state);
  });

  it("prepares without changing current state or persistence", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const current = createFixtureState();
    repository.save(current);
    const before = storage.getItem(STORAGE_KEY);
    const incoming = createFixtureState();
    incoming.activeRoute = "budget";
    const prepared = repository.prepareImport(JSON.stringify(incoming));
    expect(prepared.preview.activeRoute).toBe("budget");
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("commits valid import before replacing Store state", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const current = createFixtureState();
    repository.save(current);
    const store = new Store(current, repository);
    const incoming = createFixtureState();
    incoming.activeRoute = "settings";
    const prepared = repository.prepareImport(JSON.stringify(incoming));
    commitPreparedImport(repository, store, prepared);
    expect(store.getState().activeRoute).toBe("settings");
    expect(repository.load()?.activeRoute).toBe("settings");
  });

  it("rejects invalid JSON", () => {
    const repository = new StorageRepository(new MemoryStorage());
    expect(() => repository.prepareImport("{invalid")).toThrow("invalid JSON");
  });

  it("rejects unsupported schema without migration", () => {
    const repository = new StorageRepository(new MemoryStorage());
    const state = { ...createFixtureState(), schemaVersion: 999 };
    expect(() => repository.prepareImport(JSON.stringify(state))).toThrow(
      "unsupported schema",
    );
  });

  it("runs the migration hook before invariant validation", () => {
    const repository = new StorageRepository(new MemoryStorage(), (value) => {
      const record = value as Record<string, unknown>;
      return { ...record, schemaVersion: 1 };
    });
    const state = { ...createLegacyFixtureState(), schemaVersion: 0 };
    expect(
      repository.prepareImport(JSON.stringify(state)).preview.schemaVersion,
    ).toBe(2);
  });

  it("rejects invariant violations", () => {
    const repository = new StorageRepository(new MemoryStorage());
    const state = createFixtureState();
    const self = state.members[0];
    if (!self) throw new Error("fixture self is missing");
    self.role = "partner";
    expect(() => repository.prepareImport(JSON.stringify(state))).toThrow(
      "self must occur exactly once",
    );
  });

  it("rejects an import with inactive self", () => {
    const repository = new StorageRepository(new MemoryStorage());
    const state = createFixtureState();
    const self = state.members.find((member) => member.role === "self");
    if (!self) throw new Error("fixture self is missing");
    self.active = false;
    expect(() => repository.prepareImport(JSON.stringify(state))).toThrow(
      "self must be active",
    );
  });

  it("preserves persisted bytes when an invalid Store action is rejected", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const current = createFixtureState();
    repository.save(current);
    const before = storage.getItem(STORAGE_KEY);
    const store = new Store(current, repository);

    expect(() =>
      store.dispatch({
        type: "rename-member",
        memberId: "missing",
        displayName: "不明",
      }),
    ).toThrow("rename member is missing");
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("rejects prototype pollution keys recursively", () => {
    const repository = new StorageRepository(new MemoryStorage());
    const serialized = JSON.stringify(createFixtureState()).replace(
      '"members":',
      '"__proto__":{"polluted":true},"members":',
    );
    expect(() => repository.prepareImport(serialized)).toThrow(
      "unsafe import key",
    );
    expect(
      (Object.prototype as { polluted?: boolean }).polluted,
    ).toBeUndefined();
  });

  it("rejects oversized imports before parsing", () => {
    const repository = new StorageRepository(new MemoryStorage());
    expect(() =>
      repository.prepareImport("x".repeat(MAX_IMPORT_BYTES + 1)),
    ).toThrow("import exceeds size limit");
  });

  it("preserves Store and persisted bytes when commit save fails", () => {
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const current = createFixtureState();
    repository.save(current);
    const before = storage.getItem(STORAGE_KEY);
    const store = new Store(current, repository);
    const incoming = createFixtureState();
    incoming.activeRoute = "investments";
    const prepared = repository.prepareImport(JSON.stringify(incoming));
    storage.failWrites = true;
    expect(() => commitPreparedImport(repository, store, prepared)).toThrow(
      "write failed",
    );
    expect(store.getState().activeRoute).toBe("overview");
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });
});
