import {
  cloneState,
  deepFreeze,
  reduceState,
  validateAppState,
  type AppAction,
  type AppState,
} from "../domain/state";
import { assertBudgetCalculable } from "../domain/budget";

export type StoreListener = (state: Readonly<AppState>) => void;
export type Selector<T> = (state: Readonly<AppState>) => T;

export interface StateWriter {
  save(state: AppState): void;
}

export class Store {
  readonly #writer: StateWriter | undefined;
  readonly #listeners = new Set<StoreListener>();
  #state: Readonly<AppState>;

  readonly #now: () => string;

  constructor(
    initialState: AppState,
    writer?: StateWriter,
    now = () => new Date().toISOString(),
  ) {
    validateAppState(initialState);
    this.#state = deepFreeze(cloneState(initialState));
    this.#writer = writer;
    this.#now = now;
  }

  getState(): Readonly<AppState> {
    return this.#state;
  }

  dispatch(action: AppAction): void {
    const next = reduceState(cloneState(this.#state), action);
    next.backup.lastSuccessfulSaveAt = this.#now();
    validateAppState(next);
    if (
      action.type !== "navigate" &&
      action.type !== "rename-member" &&
      action.type !== "move-category"
    ) {
      assertBudgetCalculable(next);
    }
    this.#writer?.save(next);
    this.#publish(next);
  }

  subscribe(listener: StoreListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  select<T>(selector: Selector<T>): T {
    return selector(this.#state);
  }

  replaceCommittedState(state: AppState): void {
    validateAppState(state);
    this.#publish(state);
  }

  #publish(state: AppState): void {
    this.#state = deepFreeze(cloneState(state));
    for (const listener of this.#listeners) listener(this.#state);
  }
}
