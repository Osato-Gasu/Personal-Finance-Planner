import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import { validateAppState, type AppAction } from "../src/domain/state";
import { createFixtureState } from "./fixtures/state";

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function rejectedWithoutEffects(action: AppAction, message: string): void {
  const initial = createFixtureState();
  const writer = { save: vi.fn() };
  const listener = vi.fn();
  const store = new Store(initial, writer);
  store.subscribe(listener);
  const before = JSON.stringify(store.getState());
  expect(() => store.dispatch(action)).toThrow(message);
  expect(JSON.stringify(store.getState())).toBe(before);
  expect(writer.save).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
}

describe("budget Store actions", () => {
  it("adds, edits, reorders, disables, and enables categories with stable IDs", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "add-category",
      category: {
        id: "category-second",
        name: " 日用品 ",
        description: " 説明 ",
        shareMode: "custom",
        selfShareBasisPoints: 6000,
        sortOrder: 1,
        active: true,
      },
    });
    store.dispatch({
      type: "update-category",
      categoryId: "category-second",
      changes: {
        name: "日用品・消耗品",
        description: "更新",
        shareMode: "inherit",
      },
    });
    store.dispatch({
      type: "move-category",
      categoryId: "category-second",
      direction: "up",
    });
    store.dispatch({
      type: "set-category-active",
      categoryId: "category-second",
      active: false,
    });
    store.dispatch({
      type: "set-category-active",
      categoryId: "category-second",
      active: true,
    });
    const category = store
      .getState()
      .budget.categories.find(
        (candidate) => candidate.id === "category-second",
      );
    expect(category).toMatchObject({
      id: "category-second",
      name: "日用品・消耗品",
      description: "更新",
      shareMode: "inherit",
      active: true,
    });
    expect(category).not.toHaveProperty("selfShareBasisPoints");
    expect(
      store
        .getState()
        .budget.categories.filter((candidate) => candidate.active)
        .map((candidate) => candidate.sortOrder),
    ).toEqual([0, 1]);
  });

  it("deletes an empty category", () => {
    const state = createFixtureState();
    state.budget.categories.push({
      id: "empty",
      name: "空",
      description: "",
      shareMode: "inherit",
      sortOrder: 1,
      active: true,
    });
    const store = new Store(state);
    store.dispatch({ type: "delete-category", categoryId: "empty" });
    expect(store.getState().budget.categories).toHaveLength(1);
  });

  it("moves all items before deleting a populated category", () => {
    const state = createFixtureState();
    state.budget.categories.push({
      id: "move-target",
      name: "移動先",
      description: "",
      shareMode: "inherit",
      sortOrder: 1,
      active: true,
    });
    const store = new Store(state);
    store.dispatch({
      type: "delete-category",
      categoryId: "category-base",
      moveToCategoryId: "move-target",
    });
    expect(
      store
        .getState()
        .budget.items.every((item) => item.categoryId === "move-target"),
    ).toBe(true);
    expect(
      store
        .getState()
        .budget.categories.some((category) => category.id === "category-base"),
    ).toBe(false);
  });

  it("allows disabling the last active category without losing items", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "set-category-active",
      categoryId: "category-base",
      active: false,
    });
    expect(store.getState().budget.categories[0]?.active).toBe(false);
    expect(store.getState().budget.items).toHaveLength(2);
  });

  it("adds, edits, duplicates, disables, enables, and deletes expenses", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "add-expense",
      item: {
        id: "expense-new",
        categoryId: "category-base",
        purpose: " 光熱費 ",
        kind: "living-expense",
        scope: "shared",
        amountYen: 20_000,
        cycleValue: 1,
        cycleUnit: "month",
        occurrencesPerCycle: 1,
        shareMode: "custom",
        selfShareBasisPoints: 6000,
        source: { type: "manual" },
        memo: " memo ",
        active: true,
      },
    });
    store.dispatch({
      type: "update-expense",
      itemId: "expense-new",
      changes: {
        categoryId: "category-base",
        purpose: "電気・ガス",
        scope: "self",
        amountYen: 22_000,
        cycleValue: 1,
        cycleUnit: "month",
        occurrencesPerCycle: 1,
        shareMode: "inherit",
        memo: "更新",
        active: true,
      },
    });
    store.dispatch({
      type: "duplicate-expense",
      itemId: "expense-new",
      newId: "expense-copy",
    });
    store.dispatch({
      type: "set-expense-active",
      itemId: "expense-new",
      active: false,
    });
    store.dispatch({
      type: "set-expense-active",
      itemId: "expense-new",
      active: true,
    });
    store.dispatch({ type: "delete-expense", itemId: "expense-new" });
    const copy = store
      .getState()
      .budget.items.find((item) => item.id === "expense-copy");
    expect(copy).toMatchObject({
      id: "expense-copy",
      purpose: "電気・ガス（コピー）",
      amountYen: 22_000,
    });
    expect(
      store.getState().budget.items.some((item) => item.id === "expense-new"),
    ).toBe(false);
  });

  it("preserves detailed and simple data while switching modes", () => {
    const store = new Store(createFixtureState());
    const before = JSON.stringify(store.getState().budget.items);
    store.dispatch({ type: "set-simple-expense", amountYen: 88_000 });
    store.dispatch({ type: "set-budget-mode", mode: "simple" });
    store.dispatch({ type: "set-budget-mode", mode: "detailed" });
    expect(store.getState().budget.simpleMonthlyExpenseYen).toBe(88_000);
    expect(JSON.stringify(store.getState().budget.items)).toBe(before);
  });

  it("updates household settings without deleting inactive partner data", () => {
    const store = new Store(createFixtureState());
    store.dispatch({
      type: "update-household",
      selfName: "本人A",
      partnerName: "相手B",
      partnerActive: false,
      partnerManualYen: 123_000,
      globalSelfShareBasisPoints: 6000,
    });
    store.dispatch({
      type: "update-household",
      selfName: "本人A",
      partnerName: "相手B",
      partnerActive: true,
      globalSelfShareBasisPoints: 6000,
    });
    const state = store.getState();
    expect(
      state.members.find((member) => member.role === "partner"),
    ).toMatchObject({
      displayName: "相手B",
      active: true,
    });
    expect(
      state.incomeTargets.find((target) => target.memberId === "partner")
        ?.manualYen,
    ).toBe(123_000);
  });

  it.each([
    [
      "missing category",
      {
        type: "add-expense",
        item: {
          ...required(createFixtureState().budget.items[0], "fixture item"),
          id: "bad-missing-category",
          categoryId: "missing",
        },
      },
      "active category",
    ],
    [
      "partner expense without active partner",
      {
        type: "add-expense",
        item: {
          ...required(createFixtureState().budget.items[0], "fixture item"),
          id: "bad-partner",
          scope: "partner",
        },
      },
      "active partner",
    ],
    [
      "missing expense",
      { type: "delete-expense", itemId: "missing" },
      "expense item is missing",
    ],
    [
      "missing category action",
      { type: "set-category-active", categoryId: "missing", active: false },
      "category is missing",
    ],
    [
      "populated category without move target",
      { type: "delete-category", categoryId: "category-base" },
      "active move target",
    ],
    [
      "manual overwrite of linked income",
      {
        type: "update-manual-income",
        targetId: "budget-income-self",
        amountYen: 1,
      },
      "linked income is read-only",
    ],
    [
      "unlink with a stale manual value",
      {
        type: "unlink-income",
        targetId: "budget-income-self",
        manualYen: 299_999,
      },
      "current linked value",
    ],
  ] as const)("rejects %s without effects", (_label, action, message) => {
    if (_label === "partner expense without active partner") {
      const initial = createFixtureState();
      required(
        initial.members.find((member) => member.role === "partner"),
        "partner",
      ).active = false;
      const writer = { save: vi.fn() };
      const listener = vi.fn();
      const store = new Store(initial, writer);
      store.subscribe(listener);
      const before = JSON.stringify(store.getState());
      expect(() => store.dispatch(action as AppAction)).toThrow(message);
      expect(JSON.stringify(store.getState())).toBe(before);
      expect(writer.save).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      return;
    }
    rejectedWithoutEffects(action, message);
  });

  it("rejects invalid category share before persistence", () => {
    rejectedWithoutEffects(
      {
        type: "update-category",
        categoryId: "category-base",
        changes: {
          name: "基本生活費",
          description: "fixture",
          shareMode: "custom",
          selfShareBasisPoints: 10_001,
        },
      },
      "0 to 10000",
    );
  });

  it("rejects re-enabling an item under an inactive category without effects", () => {
    const initial = createFixtureState();
    required(initial.budget.categories[0], "category").active = false;
    required(initial.budget.items[0], "item").active = false;
    const writer = { save: vi.fn() };
    const listener = vi.fn();
    const store = new Store(initial, writer);
    store.subscribe(listener);
    const before = JSON.stringify(store.getState());
    expect(() =>
      store.dispatch({
        type: "set-expense-active",
        itemId: "living-self",
        active: true,
      }),
    ).toThrow("active category");
    expect(JSON.stringify(store.getState())).toBe(before);
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("validates schema version 2 invariants", () => {
    const state = createFixtureState();
    required(state.budget.categories[0], "category").sortOrder = 4;
    expect(() => validateAppState(state)).toThrow(
      "sortOrder must be continuous",
    );
  });
});
