import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import {
  cloneState,
  type AppAction,
  validateAppState,
} from "../src/domain/state";
import { createFixtureState } from "./fixtures/state";

function expectRejectedWithoutEffects(
  action: AppAction,
  expectedMessage: string,
): void {
  const initial = createFixtureState();
  const writer = { save: vi.fn() };
  const listener = vi.fn();
  const store = new Store(initial, writer);
  store.subscribe(listener);
  const before = JSON.stringify(store.getState());

  expect(() => store.dispatch(action)).toThrow(expectedMessage);
  expect(JSON.stringify(store.getState())).toBe(before);
  expect(writer.save).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
}

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

  it("requires self to remain active", () => {
    const state = createFixtureState();
    const self = state.members.find((member) => member.role === "self");
    if (!self) throw new Error("fixture self is missing");
    self.active = false;
    expect(() => validateAppState(state)).toThrow("self must be active");
  });

  it("rejects more than one partner", () => {
    const state = createFixtureState();
    state.members.push({
      id: "partner-2",
      role: "partner",
      displayName: "相手2",
      active: true,
    });
    expect(() => validateAppState(state)).toThrow("at most one partner");
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

  it.each([
    [
      "set-partner-active on self",
      {
        type: "set-partner-active",
        memberId: "self",
        active: false,
      },
      "requires an existing partner",
    ],
    [
      "rename of a missing member",
      { type: "rename-member", memberId: "missing", displayName: "不明" },
      "rename member is missing",
    ],
    [
      "take-home update of a missing source",
      { type: "update-take-home", sourceId: "missing", amountYen: 1 },
      "take-home source is missing",
    ],
    [
      "unlink of a missing target",
      { type: "unlink-income", targetId: "missing", manualYen: 1 },
      "unlink target is missing",
    ],
    [
      "unlink of a target without an active link",
      {
        type: "unlink-income",
        targetId: "budget-income-partner",
        manualYen: 1,
      },
      "active link is missing",
    ],
  ] as const)("rejects %s without side effects", (_label, action, message) => {
    expectRejectedWithoutEffects(action, message);
  });

  it.each([
    [
      "a duplicate link ID",
      {
        id: "link-self",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: "take-home-partner",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
      "link ID is already in use",
    ],
    [
      "a missing target",
      {
        id: "link-missing-target",
        targetId: "missing",
        sourceType: "take-home-result",
        sourceId: "take-home-self",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
      "link target is missing",
    ],
    [
      "a missing source",
      {
        id: "link-missing-source",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: "missing",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
      "link source is missing",
    ],
    [
      "a source for another member",
      {
        id: "link-wrong-member",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: "take-home-self",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
      "members must match",
    ],
    [
      "an inactive new link",
      {
        id: "link-inactive",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: "take-home-partner",
        field: "averageMonthlyTakeHomeYen",
        active: false,
      },
      "added link must be active",
    ],
    [
      "a duplicate active target link",
      {
        id: "link-duplicate-target",
        targetId: "budget-income-self",
        sourceType: "take-home-result",
        sourceId: "take-home-self",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
      "only one active link",
    ],
  ] as const)(
    "rejects add-link with %s without side effects",
    (_label, link, message) => {
      expectRejectedWithoutEffects({ type: "add-link", link }, message);
    },
  );

  it("applies valid member, source, link, and unlink actions", () => {
    const writer = { save: vi.fn() };
    const store = new Store(createFixtureState(), writer);
    store.dispatch({
      type: "rename-member",
      memberId: "partner",
      displayName: "家族",
    });
    store.dispatch({
      type: "set-partner-active",
      memberId: "partner",
      active: false,
    });
    store.dispatch({
      type: "update-take-home",
      sourceId: "take-home-partner",
      amountYen: 200_000,
    });
    store.dispatch({
      type: "add-link",
      link: {
        id: "link-partner",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: "take-home-partner",
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
    });
    store.dispatch({
      type: "unlink-income",
      targetId: "budget-income-partner",
      manualYen: 200_000,
    });

    const state = store.getState();
    expect(
      state.members.find((member) => member.id === "partner"),
    ).toMatchObject({ displayName: "家族", active: false });
    expect(
      state.takeHomeInputs.find((input) => input.id === "take-home-partner"),
    ).toMatchObject({ fixtureMonthlyTakeHomeYen: 200_000 });
    expect(
      state.incomeTargets.find(
        (target) => target.id === "budget-income-partner",
      ),
    ).toMatchObject({ manualYen: 200_000 });
    expect(state.links.find((link) => link.id === "link-partner")?.active).toBe(
      false,
    );
    expect(writer.save).toHaveBeenCalledTimes(5);
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
