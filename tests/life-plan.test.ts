import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import {
  annualizeMonthlyCashflowYen,
  selectLifePlan,
} from "../src/domain/life-plan";
import { selectOverview } from "../src/domain/overview";
import {
  createInitialState,
  type AppAction,
  type AppState,
  type LifePlanEvent,
} from "../src/domain/state";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";

const baseReferenceDate = "2026-08-20";

function completeState(referenceDate = baseReferenceDate): AppState {
  const state = createInitialState();
  const member = state.members[0];
  if (!member) throw new Error("self member is missing");
  member.birthDate = "1990-01-01";
  member.residencePrefecture = "JP-13";
  const plan = createCalculatedTakeHomePlan({
    id: "take-home-self",
    memberId: member.id,
    targetYear: Number(referenceDate.slice(0, 4)),
    birthDate: member.birthDate,
    residencePrefecture: "JP-13",
  });
  plan.compensation.annualTaxableSalaryYen = 3_600_000;
  plan.socialInsurance.mode = "manual";
  plan.socialInsurance.standardRemunerationMode = "manual-total";
  plan.socialInsurance.manual = {
    annualHealthInsuranceYen: 0,
    annualCareInsuranceYen: 0,
    annualAdditionalInsuranceYen: 0,
    annualPensionYen: 0,
    annualEmploymentInsuranceYen: 0,
    annualOtherStatutoryDeductionYen: 0,
  };
  plan.residentTax.mode = "manual-annual";
  plan.residentTax.annualResidentTaxYen = 0;
  plan.residentTax.zeroYenConfirmed = true;
  state.takeHomePlans = [plan];
  state.budget.mode = "simple";
  state.budget.simpleMonthlyExpenseYen = 100_000;
  state.lifePlan = {
    baseReferenceDate: referenceDate,
    projectionStartYear: 2027,
    startingLiquidAssetsYen: 1_000_000,
    projectionYears: 3,
    events: [],
  };
  return state;
}

function event(changes: Partial<LifePlanEvent> = {}): LifePlanEvent {
  return {
    id: "event-1",
    name: "イベント",
    kind: "expense",
    startYear: 2027,
    endYear: 2027,
    annualAmountYen: 100_000,
    memo: "",
    active: true,
    ...changes,
  };
}

class Writer {
  saves = 0;
  bytes: string | null = null;
  save(state: AppState): void {
    this.saves += 1;
    this.bytes = JSON.stringify(state);
  }
}

function rejectedWithoutEffects(state: AppState, action: AppAction): void {
  const writer = new Writer();
  const store = new Store(state, writer, () => "2026-08-20T00:00:00.000Z");
  const before = JSON.stringify(store.getState());
  expect(() => store.dispatch(action)).toThrow();
  expect(JSON.stringify(store.getState())).toBe(before);
  expect(writer.saves).toBe(0);
  expect(writer.bytes).toBeNull();
}

describe("life plan annual cashflow", () => {
  it("uses the saved overview date and projects full calendar years", () => {
    const state = completeState();
    const monthly = selectOverview(state, baseReferenceDate).household
      .afterInvestmentYen;
    expect(monthly).not.toBeNull();
    const result = selectLifePlan(state);
    expect(result.status).toBe("complete");
    expect(result.baseReferenceDate).toBe(baseReferenceDate);
    expect(result.years.map((row) => row.year)).toEqual([2027, 2028, 2029]);
    expect(result.years[0]?.openingLiquidAssetsYen).toBe(1_000_000);
    expect(result.baseAnnualCashflowYen).toBe((monthly ?? 0) * 12);
    expect(result.years[1]?.openingLiquidAssetsYen).toBe(
      result.years[0]?.closingLiquidAssetsYen,
    );
  });

  it("applies one-time and recurring income/expense inclusively", () => {
    const state = completeState();
    state.lifePlan.events = [
      event({ id: "one", kind: "expense", annualAmountYen: 500_000 }),
      event({
        id: "income",
        kind: "income",
        startYear: 2027,
        endYear: 2028,
        annualAmountYen: 200_000,
      }),
      event({
        id: "outside",
        startYear: 2030,
        endYear: 2031,
        annualAmountYen: 999,
      }),
      event({ id: "inactive", active: false, annualAmountYen: 999 }),
    ];
    const result = selectLifePlan(state);
    expect(result.years[0]).toMatchObject({
      eventIncomeYen: 200_000,
      eventExpenseYen: 500_000,
    });
    expect(result.years[1]).toMatchObject({
      eventIncomeYen: 200_000,
      eventExpenseYen: 0,
    });
    expect(result.years[2]).toMatchObject({
      eventIncomeYen: 0,
      eventExpenseYen: 0,
    });
  });

  it("reports the first negative year while allowing later recovery", () => {
    const state = completeState();
    state.lifePlan.startingLiquidAssetsYen = 0;
    state.lifePlan.events = [
      event({ annualAmountYen: 5_000_000 }),
      event({
        id: "recovery",
        kind: "income",
        startYear: 2028,
        endYear: 2028,
        annualAmountYen: 10_000_000,
      }),
    ];
    const result = selectLifePlan(state);
    expect(result.status).toBe("complete");
    expect(result.firstNegativeYear).toBe(2027);
    expect(result.years[0]?.closingLiquidAssetsYen).toBeLessThan(0);
    expect(result.years[1]?.closingLiquidAssetsYen).toBeGreaterThan(0);
  });

  it("returns incomplete instead of substituting zero for prerequisites", () => {
    const blank = createInitialState();
    expect(selectLifePlan(blank)).toMatchObject({
      status: "incomplete",
      baseMonthlyCashflowYen: null,
      years: [],
    });
    blank.lifePlan.baseReferenceDate = baseReferenceDate;
    blank.lifePlan.projectionStartYear = 2027;
    expect(selectLifePlan(blank)).toMatchObject({
      status: "incomplete",
      baseMonthlyCashflowYen: null,
      years: [],
    });
  });

  it.each([
    ["both anchors", null, null],
    ["baseReferenceDate only", null, 2027],
    ["projectionStartYear only", baseReferenceDate, null],
  ])(
    "returns deterministic incomplete when %s are cleared",
    (_caseName, referenceDate, projectionStartYear) => {
      const state = completeState();
      state.lifePlan.baseReferenceDate = referenceDate;
      state.lifePlan.projectionStartYear = projectionStartYear;
      const first = selectLifePlan(state);
      const second = selectLifePlan(structuredClone(state));
      expect(first).toEqual(second);
      expect(first).toMatchObject({
        status: "incomplete",
        baseMonthlyCashflowYen: null,
        baseAnnualCashflowYen: null,
        years: [],
      });
    },
  );

  it("keeps the full-calendar projection identical for January 1 and December 31 base dates", () => {
    const january = selectLifePlan(completeState("2026-01-01"));
    const december = selectLifePlan(completeState("2026-12-31"));
    expect(january.status).toBe("complete");
    expect(december.status).toBe("complete");
    expect(january.projectionStartYear).toBe(2027);
    expect(december.projectionStartYear).toBe(2027);
    expect(january.baseMonthlyCashflowYen).toBe(
      december.baseMonthlyCashflowYen,
    );
    expect(january.baseAnnualCashflowYen).toBe(december.baseAnnualCashflowYen);
    expect(january.years).toEqual(december.years);
    expect(january.years[0]?.openingLiquidAssetsYen).toBe(1_000_000);
    expect(december.years[0]?.openingLiquidAssetsYen).toBe(1_000_000);
  });

  it("fails closed on annual multiplication, event sum, and cumulative overflow", () => {
    expect(
      annualizeMonthlyCashflowYen(Math.floor(Number.MAX_SAFE_INTEGER / 12) + 1),
    ).toBeNull();
    const eventOverflow = completeState();
    eventOverflow.lifePlan.events = [
      event({
        id: "a",
        kind: "income",
        annualAmountYen: Number.MAX_SAFE_INTEGER,
      }),
      event({ id: "b", kind: "income", annualAmountYen: 1 }),
    ];
    expect(selectLifePlan(eventOverflow)).toMatchObject({
      status: "out-of-range",
      years: [],
    });
    const cumulativeOverflow = completeState();
    cumulativeOverflow.lifePlan.startingLiquidAssetsYen =
      Number.MAX_SAFE_INTEGER;
    expect(selectLifePlan(cumulativeOverflow)).toMatchObject({
      status: "out-of-range",
      years: [],
    });
  });

  it("is deterministic across a browser-date rollover", () => {
    const state = completeState();
    const before = selectLifePlan(state);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T23:59:59+09:00"));
    const december = selectLifePlan(state);
    vi.setSystemTime(new Date("2027-01-01T00:00:01+09:00"));
    const january = selectLifePlan(state);
    vi.useRealTimers();
    expect(december).toEqual(before);
    expect(january).toEqual(before);
  });
});

describe("life plan state actions", () => {
  it("updates all settings atomically and preserves events and unrelated state", () => {
    const state = completeState();
    state.lifePlan.events = [event()];
    const beforeMembers = structuredClone(state.members);
    const next = new Store(state);
    next.dispatch({
      type: "update-life-plan-settings",
      baseReferenceDate: "2026-12-31",
      projectionStartYear: 2028,
      startingLiquidAssetsYen: 2_000_000,
      projectionYears: 60,
    });
    expect(next.getState().lifePlan).toMatchObject({
      baseReferenceDate: "2026-12-31",
      projectionStartYear: 2028,
      startingLiquidAssetsYen: 2_000_000,
      projectionYears: 60,
      events: [event()],
    });
    expect(next.getState().members).toEqual(beforeMembers);
  });

  it.each([
    [
      "invalid date",
      {
        baseReferenceDate: "2026-02-30",
        projectionStartYear: 2027,
        startingLiquidAssetsYen: 0,
        projectionYears: 30,
      },
    ],
    [
      "malformed date",
      {
        baseReferenceDate: "2026-2-01",
        projectionStartYear: 2027,
        startingLiquidAssetsYen: 0,
        projectionYears: 30,
      },
    ],
    [
      "start range",
      {
        baseReferenceDate,
        projectionStartYear: 0,
        startingLiquidAssetsYen: 0,
        projectionYears: 30,
      },
    ],
    [
      "start above range",
      {
        baseReferenceDate,
        projectionStartYear: 10_000,
        startingLiquidAssetsYen: 0,
        projectionYears: 1,
      },
    ],
    [
      "years low",
      {
        baseReferenceDate,
        projectionStartYear: 2027,
        startingLiquidAssetsYen: 0,
        projectionYears: 0,
      },
    ],
    [
      "non-integer assets",
      {
        baseReferenceDate,
        projectionStartYear: 2027,
        startingLiquidAssetsYen: 1.5,
        projectionYears: 30,
      },
    ],
    [
      "unsafe assets",
      {
        baseReferenceDate,
        projectionStartYear: 2027,
        startingLiquidAssetsYen: Number.MAX_SAFE_INTEGER + 1,
        projectionYears: 30,
      },
    ],
    [
      "years high",
      {
        baseReferenceDate,
        projectionStartYear: 2027,
        startingLiquidAssetsYen: 0,
        projectionYears: 61,
      },
    ],
    [
      "horizon",
      {
        baseReferenceDate,
        projectionStartYear: 9999,
        startingLiquidAssetsYen: 0,
        projectionYears: 2,
      },
    ],
    [
      "negative assets",
      {
        baseReferenceDate,
        projectionStartYear: 2027,
        startingLiquidAssetsYen: -1,
        projectionYears: 30,
      },
    ],
  ])("rejects %s without publishing or saving", (_name, settings) => {
    rejectedWithoutEffects(completeState(), {
      type: "update-life-plan-settings",
      ...settings,
    });
  });

  it("supports immutable-ID CRUD and precise active toggles", () => {
    const store = new Store(completeState());
    store.dispatch({ type: "add-life-plan-event", event: event() });
    const updatedEvent: Omit<LifePlanEvent, "id"> = {
      name: "更新",
      kind: "expense",
      startYear: 2027,
      endYear: 2027,
      annualAmountYen: 100_000,
      memo: "",
      active: true,
    };
    store.dispatch({
      type: "update-life-plan-event",
      eventId: "event-1",
      event: updatedEvent,
    });
    expect(store.getState().lifePlan.events[0]).toMatchObject({
      id: "event-1",
      name: "更新",
    });
    store.dispatch({
      type: "set-life-plan-event-active",
      eventId: "event-1",
      active: false,
    });
    expect(store.getState().lifePlan.events[0]?.active).toBe(false);
    store.dispatch({ type: "delete-life-plan-event", eventId: "event-1" });
    expect(store.getState().lifePlan.events).toEqual([]);
  });

  it("rejects duplicate and missing event targets without effects", () => {
    const state = completeState();
    state.lifePlan.events = [event()];
    rejectedWithoutEffects(state, {
      type: "add-life-plan-event",
      event: event(),
    });
    rejectedWithoutEffects(state, {
      type: "update-life-plan-event",
      eventId: "missing",
      event: {
        name: "更新",
        kind: "expense",
        startYear: 2027,
        endYear: 2027,
        annualAmountYen: 1,
        memo: "",
        active: true,
      },
    });
    rejectedWithoutEffects(state, {
      type: "set-life-plan-event-active",
      eventId: "missing",
      active: false,
    });
    rejectedWithoutEffects(state, {
      type: "delete-life-plan-event",
      eventId: "missing",
    });
  });

  it("preserves every non-target event during update, toggle, and delete", () => {
    const other = event({
      id: "event-2",
      name: "対象外イベント",
      kind: "income",
      startYear: 2028,
      endYear: 2029,
      annualAmountYen: 321_000,
      memo: "保持される値",
      active: false,
    });
    const actions: AppAction[] = [
      {
        type: "update-life-plan-event",
        eventId: "event-1",
        event: {
          name: "更新対象",
          kind: "expense",
          startYear: 2027,
          endYear: 2027,
          annualAmountYen: 999,
          memo: "updated",
          active: true,
        },
      },
      {
        type: "set-life-plan-event-active",
        eventId: "event-1",
        active: false,
      },
      { type: "delete-life-plan-event", eventId: "event-1" },
    ];
    for (const action of actions) {
      const state = completeState();
      state.lifePlan.events = [event(), structuredClone(other)];
      const store = new Store(state);
      store.dispatch(action);
      expect(
        store.getState().lifePlan.events.find((item) => item.id === other.id),
      ).toEqual(other);
    }
  });
});
