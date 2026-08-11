import {
  cloneState,
  parseAppState,
  validateAppState,
  type AppState,
} from "../domain/state";

export const STORAGE_KEY = "personal-finance-planner:state:v1";
export const MAX_IMPORT_BYTES = 1_000_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
    const serialized = this.#storage.getItem(STORAGE_KEY);
    if (serialized === null) return null;
    return this.#parseAndValidate(serialized);
  }

  save(state: AppState): void {
    validateAppState(state);
    const serialized = JSON.stringify(state);
    this.#storage.setItem(STORAGE_KEY, serialized);
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

  #parseAndValidate(serialized: string): AppState {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("invalid JSON");
    }
    assertNoDangerousKeys(parsed);
    assertImportEnvelope(parsed);
    const migrated = this.#migrationHook(parsed);
    assertNoDangerousKeys(migrated);
    return parseAppState(migrated);
  }
}
