import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import { cloneState, validateAppState } from "../src/domain/state";
import { createFixtureState } from "./fixtures/state";

describe("Store and state invariants", () => {
  it("subscribes and unsubscribes listeners", () => {
    const store = new Store(createFixtureState());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: "navigate", route: "budget" });
    unsubscribe();
    store.dispatch({ type: "navigate", route: "settings" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("prevents direct mutation of state", () => {
    const store = new Store(createFixtureState());
    expect(() => {
      const self = store.getState().members[0];
      if (!self) throw new Error("fixture self is missing");
      self.displayName = "変更";
    }).toThrow();
  });

  it("requires exactly one self", () => {
    const state = createFixtureState();
    const self = state.members[0];
    if (!self) throw new Error("fixture self is missing");
    self.role = "partner";
    expect(() => validateAppState(state)).toThrow(
      "self must occur exactly once",
    );
  });

  it("rejects more than one partner", () => {
    const state = createFixtureState();
    state.members.push({
      id: "partner-2",
      role: "partner",
      displayName: "相手2",
      active: true,
    });
    expect(() => validateAppState(state)).toThrow("at most one active partner");
  });

  it("rejects unsafe monetary values before persistence", () => {
    const writer = { save: vi.fn() };
    const store = new Store(createFixtureState(), writer);
    expect(() =>
      store.dispatch({
        type: "update-take-home",
        sourceId: "take-home-self",
        amountYen: 1.5,
      }),
    ).toThrow("safe integer");
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("keeps entity identity on rename and preserves inactive partner data", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "rename-member",
      memberId: "partner",
      displayName: "パートナー",
    });
    store.dispatch({
      type: "set-partner-active",
      memberId: "partner",
      active: false,
    });
    const partner = store
      .getState()
      .members.find((member) => member.role === "partner");
    expect(partner).toEqual({
      id: "partner",
      role: "partner",
      displayName: "パートナー",
      active: false,
    });
    expect(
      store
        .getState()
        .takeHomeInputs.some((input) => input.memberId === "partner"),
    ).toBe(true);
  });

  it("does not publish state when persistence fails", () => {
    const initial = createFixtureState();
    const store = new Store(initial, {
      save: () => {
        throw new Error("storage failed");
      },
    });
    expect(() => store.dispatch({ type: "navigate", route: "budget" })).toThrow(
      "storage failed",
    );
    expect(cloneState(store.getState() as typeof initial)).toEqual(initial);
  });
});
