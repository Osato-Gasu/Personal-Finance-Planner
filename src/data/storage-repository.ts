import { migrateToCurrentState } from "../domain/migration";
import { cloneState, validateAppState, type AppState } from "../domain/state";

export const STORAGE_KEY = "personal-finance-planner:state:v6";
export const SCHEMA_VERSION_5_STORAGE_KEY = "personal-finance-planner:state:v5";
export const SCHEMA_VERSION_4_STORAGE_KEY = "personal-finance-planner:state:v4";
export const SCHEMA_VERSION_3_STORAGE_KEY = "personal-finance-planner:state:v3";
export const PREVIOUS_STORAGE_KEY = "personal-finance-planner:state:v2";
export const LEGACY_STORAGE_KEY = "personal-finance-planner:state:v1";
export const MAX_IMPORT_BYTES = 1_000_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PreparedImport {
  readonly preview: Readonly<AppState>;
  readonly serialized: string;
}

export type MigrationHook = (value: unknown) => unknown;

function assertNoDangerousKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoDangerousKeys(item);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`unsafe import key: ${key}`);
    }
    assertNoDangerousKeys((value as Record<string, unknown>)[key]);
  }
}

function assertImportEnvelope(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("state must be an object");
  }
  const schemaVersion = (value as Record<string, unknown>).schemaVersion;
  if (
    typeof schemaVersion !== "number" ||
    !Number.isSafeInteger(schemaVersion)
  ) {
    throw new Error("schemaVersion must be an integer");
  }
}

export class StorageRepository {
  readonly #storage: StorageLike;
  readonly #migrationHook: MigrationHook;

  constructor(
    storage: StorageLike,
    migrationHook: MigrationHook = (value) => value,
  ) {
    this.#storage = storage;
    this.#migrationHook = migrationHook;
  }

  load(): AppState | null {
    const current = this.#storage.getItem(STORAGE_KEY);
    if (current !== null) return this.#parseAndValidate(current);
    const version5 = this.#storage.getItem(SCHEMA_VERSION_5_STORAGE_KEY);
    if (version5 !== null) {
      const migrated = this.#parseAndValidate(version5);
      this.save(migrated);
      return cloneState(migrated);
    }
    const version4 = this.#storage.getItem(SCHEMA_VERSION_4_STORAGE_KEY);
    if (version4 !== null) {
      const migrated = this.#parseAndValidate(version4);
      this.save(migrated);
      return cloneState(migrated);
    }
    const version3 = this.#storage.getItem(SCHEMA_VERSION_3_STORAGE_KEY);
    if (version3 !== null) {
      const migrated = this.#parseAndValidate(version3);
      this.save(migrated);
      return cloneState(migrated);
    }
    const previous = this.#storage.getItem(PREVIOUS_STORAGE_KEY);
    if (previous !== null) {
      const migrated = this.#parseAndValidate(previous);
      this.save(migrated);
      return cloneState(migrated);
    }
    const legacy = this.#storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === null) return null;
    const migrated = this.#parseAndValidate(legacy);
    this.save(migrated);
    return cloneState(migrated);
  }

  save(state: AppState): void {
    validateAppState(state);
    this.#setAtomically(STORAGE_KEY, JSON.stringify(state));
  }

  export(state: AppState): string {
    validateAppState(state);
    return JSON.stringify(state, null, 2);
  }

  prepareImport(bytes: string | Uint8Array): PreparedImport {
    const byteLength =
      typeof bytes === "string"
        ? new TextEncoder().encode(bytes).byteLength
        : bytes.byteLength;
    if (byteLength > MAX_IMPORT_BYTES)
      throw new Error("import exceeds size limit");
    const serialized =
      typeof bytes === "string"
        ? bytes
        : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const state = this.#parseAndValidate(serialized);
    return Object.freeze({
      preview: Object.freeze(cloneState(state)),
      serialized: JSON.stringify(state),
    });
  }

  commitImport(prepared: PreparedImport): AppState {
    const state = this.#parseAndValidate(prepared.serialized);
    this.save(state);
    return cloneState(state);
  }

  #setAtomically(key: string, serialized: string): void {
    const before = this.#storage.getItem(key);
    try {
      this.#storage.setItem(key, serialized);
    } catch (error) {
      try {
        if (before === null) this.#storage.removeItem(key);
        else this.#storage.setItem(key, before);
      } catch {
        // Preserve the original write error; browser storage normally fails
        // before mutation, while test storage verifies byte restoration.
      }
      throw error;
    }
  }

  #parseAndValidate(serialized: string): AppState {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("invalid JSON");
    }
    assertNoDangerousKeys(parsed);
    assertImportEnvelope(parsed);
    const prepared = this.#migrationHook(parsed);
    assertNoDangerousKeys(prepared);
    return migrateToCurrentState(prepared);
  }
}
