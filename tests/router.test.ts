import { describe, expect, it } from "vitest";
import {
  HashRouter,
  hashForRoute,
  routeFromHash,
  routeIds,
  type HashEnvironment,
} from "../src/app/router";

class MemoryHashEnvironment implements HashEnvironment {
  hash = "";
  listeners = new Set<() => void>();

  getHash(): string {
    return this.hash;
  }
  replaceHash(hash: string): void {
    this.hash = hash;
  }
  addHashChangeListener(listener: () => void): void {
    this.listeners.add(listener);
  }
  removeHashChangeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }
  navigate(hash: string): void {
    this.hash = hash;
    for (const listener of this.listeners) listener();
  }
}

describe("hash routing", () => {
  it.each(routeIds)("resolves direct route %s", (route) => {
    expect(routeFromHash(hashForRoute(route))).toBe(route);
  });

  it("normalizes an unknown route to overview", () => {
    const environment = new MemoryHashEnvironment();
    environment.hash = "#/unknown";
    const seen: string[] = [];
    const stop = new HashRouter(environment).start((route) => seen.push(route));
    expect(environment.hash).toBe("#/overview");
    expect(seen).toEqual(["overview"]);
    stop();
  });

  it("reacts to hash changes and supports unsubscribe", () => {
    const environment = new MemoryHashEnvironment();
    const seen: string[] = [];
    const stop = new HashRouter(environment).start((route) => seen.push(route));
    environment.navigate("#/budget");
    environment.navigate("#/settings");
    stop();
    environment.navigate("#/overview");
    expect(seen).toEqual(["overview", "budget", "settings"]);
  });
});
