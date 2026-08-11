import type { Store } from "../app/store";
import type { PreparedImport, StorageRepository } from "./storage-repository";

export function commitPreparedImport(
  repository: StorageRepository,
  store: Store,
  prepared: PreparedImport,
): void {
  const committed = repository.commitImport(prepared);
  store.replaceCommittedState(committed);
}
