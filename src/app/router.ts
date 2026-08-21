import type { RouteId } from "../domain/state";

export const routeIds = [
  "overview",
  "payroll",
  "take-home",
  "budget",
  "investments",
  "settings",
] as const satisfies readonly RouteId[];

export function hashForRoute(route: RouteId): string {
  return `#/${route}`;
}

export function routeFromHash(hash: string): RouteId {
  const value = hash.startsWith("#/") ? hash.slice(2) : "";
  if (value === "life-plan") return "overview";
  return routeIds.includes(value as RouteId) ? (value as RouteId) : "overview";
}

export interface HashEnvironment {
  getHash(): string;
  replaceHash(hash: string): void;
  addHashChangeListener(listener: () => void): void;
  removeHashChangeListener(listener: () => void): void;
}

export class HashRouter {
  readonly #environment: HashEnvironment;

  constructor(environment: HashEnvironment) {
    this.#environment = environment;
  }

  current(): RouteId {
    return routeFromHash(this.#environment.getHash());
  }

  start(listener: (route: RouteId) => void): () => void {
    const emit = (): void => {
      const route = this.current();
      const canonicalHash = hashForRoute(route);
      if (this.#environment.getHash() !== canonicalHash)
        this.#environment.replaceHash(canonicalHash);
      listener(route);
    };
    this.#environment.addHashChangeListener(emit);
    emit();
    return () => this.#environment.removeHashChangeListener(emit);
  }
}

export function createBrowserHashEnvironment(
  browserWindow: Window,
): HashEnvironment {
  return {
    getHash: () => browserWindow.location.hash,
    replaceHash: (hash) => browserWindow.location.replace(hash),
    addHashChangeListener: (listener) =>
      browserWindow.addEventListener("hashchange", listener),
    removeHashChangeListener: (listener) =>
      browserWindow.removeEventListener("hashchange", listener),
  };
}
