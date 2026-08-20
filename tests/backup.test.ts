import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import { selectBackupReminder } from "../src/domain/backup";
import { migrateToCurrentState } from "../src/domain/migration";
import { reduceState } from "../src/domain/state";
import {
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { saveBackup } from "../src/modules/settings/settings-view";
import { createFixtureState } from "./fixtures/state";

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

describe("schema v6 backup metadata", () => {
  it("migrates schema v5 without changing existing domain bytes", () => {
    const current = createFixtureState();
    const oldState = structuredClone(current) as Partial<typeof current>;
    Reflect.deleteProperty(oldState, "backup");
    Reflect.deleteProperty(oldState, "lifePlan");
    const v5 = { ...oldState, schemaVersion: 5 };
    const before = JSON.stringify(v5);
    const migrated = migrateToCurrentState(v5);
    expect(JSON.stringify(v5)).toBe(before);
    const { backup, lifePlan, ...domain } = migrated;
    expect(domain).toEqual({ ...v5, schemaVersion: 7 });
    expect(lifePlan).toEqual({
      baseReferenceDate: null,
      projectionStartYear: null,
      startingLiquidAssetsYen: 0,
      projectionYears: 30,
      events: [],
    });
    expect(backup).toEqual({
      lastSuccessfulSaveAt: null,
      lastExportedAt: null,
      reminderIntervalDays: 30,
      reminderDismissedUntil: null,
    });
  });

  it("distinguishes never exported, due, current, and dismissed reminders", () => {
    const state = createFixtureState();
    expect(selectBackupReminder(state.backup, "2026-08-13").due).toBe(true);
    state.backup.lastExportedAt = "2026-08-01T00:00:00.000Z";
    expect(selectBackupReminder(state.backup, "2026-08-13").due).toBe(false);
    expect(selectBackupReminder(state.backup, "2026-09-01").due).toBe(true);
    state.backup.reminderDismissedUntil = "2026-09-02T00:00:00.000Z";
    expect(selectBackupReminder(state.backup, "2026-09-01").due).toBe(false);
  });

  it("records export only through the explicit success action", () => {
    const state = createFixtureState();
    expect(state.backup.lastExportedAt).toBeNull();
    const next = reduceState(state, {
      type: "record-export-success",
      at: "2026-08-13T00:00:00.000Z",
    });
    expect(next.backup.lastExportedAt).toBe("2026-08-13T00:00:00.000Z");
    expect(state.backup.lastExportedAt).toBeNull();
  });

  it("updates export metadata only after the download handoff succeeds", async () => {
    const repository = new StorageRepository(new MemoryStorage());
    const store = new Store(
      createFixtureState(),
      repository,
      () => "2026-08-13T00:00:00.000Z",
    );
    await expect(
      saveBackup(
        repository,
        store,
        () => {
          throw new Error("download failed");
        },
        () => "2026-08-13T00:00:00.000Z",
      ),
    ).rejects.toThrow("download failed");
    expect(store.getState().backup.lastExportedAt).toBeNull();
    const download = vi.fn();
    await saveBackup(
      repository,
      store,
      download,
      () => "2026-08-13T00:00:00.000Z",
    );
    expect(store.getState().backup.lastExportedAt).toBe(
      "2026-08-13T00:00:00.000Z",
    );
    expect(download).toHaveBeenCalledOnce();
  });

  it("records successful saves without mutating the caller state", () => {
    const state = createFixtureState();
    const save = vi.fn();
    const store = new Store(state, { save }, () => "2026-08-13T01:02:03.000Z");
    store.dispatch({ type: "navigate", route: "settings" });
    expect(store.getState().backup.lastSuccessfulSaveAt).toBe(
      "2026-08-13T01:02:03.000Z",
    );
    expect(state.backup.lastSuccessfulSaveAt).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });

  it.each([0, 366, 1.5])("rejects invalid reminder interval %s", (days) => {
    const store = new Store(createFixtureState());
    expect(() =>
      store.dispatch({ type: "set-backup-reminder-interval", days }),
    ).toThrow("reminderIntervalDays");
  });
});
