import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION_9_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { migrateToCurrentState } from "../src/domain/migration";
import {
  calculatePayroll,
  calculatePayrollPracticalResult,
  effectiveMonthlyNonTaxableCommutingYen,
  parsePayrollPlan,
  type PayrollPlan,
} from "../src/domain/payroll";
import {
  calculateTakeHomeFromState,
  resolveEffectiveTakeHomePlan,
} from "../src/domain/take-home-linked-calculator";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import {
  createInitialState,
  reduceState,
  type AppState,
} from "../src/domain/state";
import { resolveCommutingAllowanceModeForSave } from "../src/modules/payroll/payroll-view";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function payroll(overrides: Partial<PayrollPlan> = {}): PayrollPlan {
  return {
    id: "payroll-self-2026",
    memberId: "member-self",
    targetYear: 2026,
    active: true,
    baseMonthlyYen: 300_000,
    taxableAllowanceMonthlyYen: 20_000,
    averageMonthlyOvertimeMinutes: 0,
    scheduledMonthlyMinutes: 9_600,
    overtimeRateBasisPoints: 12_500,
    monthlyNonTaxableCommutingYen: 12_345,
    commutingFuelEstimate: {
      averageWorkdaysPerMonthTenths: 205,
      roundTripDistanceKmTenths: 200,
      fuelEfficiencyKmPerLiterTenths: 100,
      gasolinePriceYenPerLiter: 180,
    },
    commutingAllowanceMode: "legacy-monthly",
    nonTaxableCommutingAllowanceYenPerWorkday: 800,
    bonuses: [
      {
        id: "summer",
        paymentDate: "2026-06-30",
        grossYen: 400_000,
        socialInsuranceEligible: false,
        employmentInsuranceEligible: true,
      },
    ],
    ...overrides,
  };
}

function linkedState(plan: PayrollPlan): {
  state: AppState;
  takeHomePlan: ReturnType<typeof createCalculatedTakeHomePlan>;
} {
  const state = createInitialState();
  const takeHomePlan = createCalculatedTakeHomePlan({
    id: "take-home-self-2026",
    memberId: "member-self",
    targetYear: 2026,
  });
  state.payrollPlans = [plan];
  state.takeHomePlans = [takeHomePlan];
  state.takeHomeCompensationBindings = [
    {
      takeHomePlanId: takeHomePlan.id,
      payrollPlanId: plan.id,
      active: true,
    },
  ];
  return { state, takeHomePlan };
}

function asSchemaVersion9(state: Readonly<AppState>): Record<string, unknown> {
  const previous = structuredClone(state) as unknown as Record<string, unknown>;
  previous.schemaVersion = 9;
  const payrollPlans = previous.payrollPlans as Record<string, unknown>[];
  for (const plan of payrollPlans) {
    Reflect.deleteProperty(plan, "commutingAllowanceMode");
    Reflect.deleteProperty(plan, "nonTaxableCommutingAllowanceYenPerWorkday");
  }
  return previous;
}

function selfMember(state: Readonly<AppState>) {
  return required(
    state.members.find((member) => member.role === "self"),
    "self member is missing",
  );
}

describe("TASK-018 schema v10 migration and storage", () => {
  it.each([
    {
      name: "complete fuel",
      fuel: payroll().commutingFuelEstimate,
    },
    {
      name: "incomplete fuel",
      fuel: {
        averageWorkdaysPerMonthTenths: null,
        roundTripDistanceKmTenths: null,
        fuelEfficiencyKmPerLiterTenths: null,
        gasolinePriceYenPerLiter: null,
      },
    },
  ])(
    "preserves exact v9 Payroll, practical, and linked Take-home results for $name",
    ({ fuel }) => {
      const legacyPlan = payroll({ commutingFuelEstimate: fuel });
      const expected = linkedState(legacyPlan);
      const v9 = asSchemaVersion9(expected.state);
      const before = JSON.stringify(v9);
      const migrated = migrateToCurrentState(v9);
      const migratedPlan = required(
        migrated.payrollPlans[0],
        "migrated payroll is missing",
      );

      expect(JSON.stringify(v9)).toBe(before);
      expect(migrated.schemaVersion).toBe(10);
      expect(migratedPlan.commutingAllowanceMode).toBe("legacy-monthly");
      expect(migratedPlan.nonTaxableCommutingAllowanceYenPerWorkday).toBe(800);
      const oldShape = structuredClone(migratedPlan) as Partial<PayrollPlan>;
      Reflect.deleteProperty(oldShape, "commutingAllowanceMode");
      Reflect.deleteProperty(
        oldShape,
        "nonTaxableCommutingAllowanceYenPerWorkday",
      );
      expect(oldShape).toEqual(
        (v9.payrollPlans as Record<string, unknown>[])[0],
      );
      expect(calculatePayroll(migratedPlan)).toEqual(
        calculatePayroll(legacyPlan),
      );
      expect(calculatePayrollPracticalResult(migratedPlan)).toEqual(
        calculatePayrollPracticalResult(legacyPlan),
      );
      expect(
        resolveEffectiveTakeHomePlan(
          migrated,
          required(migrated.takeHomePlans[0], "migrated take-home is missing"),
        ),
      ).toEqual(
        resolveEffectiveTakeHomePlan(expected.state, expected.takeHomePlan),
      );
      expect(
        calculateTakeHomeFromState(
          migrated,
          required(migrated.takeHomePlans[0], "migrated take-home is missing"),
          selfMember(migrated),
          "2026-08-24",
        ),
      ).toEqual(
        calculateTakeHomeFromState(
          expected.state,
          expected.takeHomePlan,
          selfMember(expected.state),
          "2026-08-24",
        ),
      );
    },
  );

  it("loads the frozen v9 key without changing its bytes", () => {
    const storage = new MemoryStorage();
    const v9 = asSchemaVersion9(linkedState(payroll()).state);
    const v9Bytes = JSON.stringify(v9);
    storage.values.set(SCHEMA_VERSION_9_STORAGE_KEY, v9Bytes);

    const loaded = new StorageRepository(storage).load();

    expect(loaded?.schemaVersion).toBe(10);
    expect(storage.getItem(SCHEMA_VERSION_9_STORAGE_KEY)).toBe(v9Bytes);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(loaded));
  });

  it("fails closed on corrupt v10 and does not fall back to valid v9", () => {
    const storage = new MemoryStorage();
    const v9Bytes = JSON.stringify(
      asSchemaVersion9(linkedState(payroll()).state),
    );
    storage.values.set(STORAGE_KEY, "{broken");
    storage.values.set(SCHEMA_VERSION_9_STORAGE_KEY, v9Bytes);

    expect(() => new StorageRepository(storage).load()).toThrow("invalid JSON");
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
    expect(storage.getItem(SCHEMA_VERSION_9_STORAGE_KEY)).toBe(v9Bytes);
  });

  it("round-trips v10 OFF-state values through export/import", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    const off = payroll({
      commutingAllowanceMode: "none",
      monthlyNonTaxableCommutingYen: 99_999,
      nonTaxableCommutingAllowanceYenPerWorkday: 1_234,
    });
    state.payrollPlans = [off];
    const repository = new StorageRepository(storage);

    const committed = repository.commitImport(
      repository.prepareImport(repository.export(state)),
    );

    expect(committed).toEqual(state);
    expect(committed.payrollPlans[0]).toEqual(off);
  });
});

describe("TASK-018 commuting allowance authority", () => {
  it.each([
    [200, 800, 16_000],
    [205, 800, 16_400],
    [5, 1, 1],
    [0, 800, 0],
  ])(
    "uses BigInt half-up for workdaysTenths=%i and daily=%i",
    (workdays, daily, expected) => {
      const plan = payroll({
        commutingAllowanceMode: "car-daily",
        nonTaxableCommutingAllowanceYenPerWorkday: daily,
        commutingFuelEstimate: {
          ...payroll().commutingFuelEstimate,
          averageWorkdaysPerMonthTenths: workdays,
        },
      });
      expect(effectiveMonthlyNonTaxableCommutingYen(plan)).toBe(expected);
      expect(calculatePayroll(plan).monthlyNonTaxableCommutingYen).toBe(
        expected,
      );
    },
  );

  it("rejects car-daily without workdays while accepting zero workdays", () => {
    expect(() =>
      parsePayrollPlan({
        ...payroll(),
        commutingAllowanceMode: "car-daily",
        commutingFuelEstimate: {
          ...payroll().commutingFuelEstimate,
          averageWorkdaysPerMonthTenths: null,
        },
      }),
    ).toThrow("requires average workdays");
    expect(() =>
      parsePayrollPlan({
        ...payroll(),
        commutingAllowanceMode: "car-daily",
        commutingFuelEstimate: {
          ...payroll().commutingFuelEstimate,
          averageWorkdaysPerMonthTenths: 0,
        },
      }),
    ).not.toThrow();
  });

  it("ignores stale monthly compatibility bytes in car-daily and none", () => {
    const car = payroll({
      monthlyNonTaxableCommutingYen: 999_999,
      commutingAllowanceMode: "car-daily",
    });
    const none = payroll({
      monthlyNonTaxableCommutingYen: 999_999,
      commutingAllowanceMode: "none",
    });
    expect(calculatePayroll(car).monthlyNonTaxableCommutingYen).toBe(16_400);
    expect(calculatePayroll(none).monthlyNonTaxableCommutingYen).toBe(0);
  });

  it.each([
    {
      name: "complete fuel",
      fuel: payroll().commutingFuelEstimate,
    },
    {
      name: "incomplete fuel",
      fuel: {
        averageWorkdaysPerMonthTenths: null,
        roundTripDistanceKmTenths: null,
        fuelEfficiencyKmPerLiterTenths: null,
        gasolinePriceYenPerLiter: null,
      },
    },
  ])("short-circuits car OFF to exact zero for $name", ({ fuel }) => {
    const plan = payroll({
      commutingAllowanceMode: "none",
      monthlyNonTaxableCommutingYen: 12_345,
      commutingFuelEstimate: fuel,
    });
    const statutory = calculatePayroll(plan);
    const practical = calculatePayrollPracticalResult(plan);
    expect(statutory.monthlyNonTaxableCommutingYen).toBe(0);
    expect(practical.estimatedGasolineYen).toBe(0);
    expect(practical.commutingBalanceYen).toBe(0);
    expect(practical.practicalMonthlyIncomeYen).toBe(
      practical.monthlyIncomeYen,
    );
    expect(practical.practicalAnnualIncomeYen).toBe(
      practical.monthlyIncomeYen * 12 + practical.annualBonusYen,
    );
  });

  it("keeps statutory Payroll available when car fuel details are incomplete", () => {
    const plan = payroll({
      commutingAllowanceMode: "car-daily",
      commutingFuelEstimate: {
        averageWorkdaysPerMonthTenths: 200,
        roundTripDistanceKmTenths: null,
        fuelEfficiencyKmPerLiterTenths: null,
        gasolinePriceYenPerLiter: null,
      },
    });
    expect(calculatePayroll(plan).monthlyNonTaxableCommutingYen).toBe(16_000);
    expect(calculatePayrollPracticalResult(plan)).toMatchObject({
      estimatedGasolineYen: null,
      commutingBalanceYen: null,
      practicalMonthlyIncomeYen: null,
      practicalAnnualIncomeYen: null,
    });
  });

  it("preserves saved car values through OFF and re-ON state updates", () => {
    const initial = createInitialState();
    const on = payroll({ commutingAllowanceMode: "car-daily" });
    initial.payrollPlans = [on];
    const offPlan: PayrollPlan = {
      ...structuredClone(on),
      commutingAllowanceMode: "none",
    };
    const offState = reduceState(initial, {
      type: "update-payroll-plan",
      planId: on.id,
      plan: offPlan,
    });
    expect(offState.payrollPlans[0]?.commutingFuelEstimate).toEqual(
      on.commutingFuelEstimate,
    );
    expect(
      offState.payrollPlans[0]?.nonTaxableCommutingAllowanceYenPerWorkday,
    ).toBe(on.nonTaxableCommutingAllowanceYenPerWorkday);
    const restored = reduceState(offState, {
      type: "update-payroll-plan",
      planId: on.id,
      plan: on,
    });
    expect(restored.payrollPlans[0]).toEqual(on);
  });
});

describe("TASK-018 linked Take-home and UI adoption guards", () => {
  it.each([
    ["car-daily" as const, 16_400],
    ["none" as const, 0],
  ])("links only the effective %s commuting allowance", (mode, expected) => {
    const linked = linkedState(
      payroll({
        commutingAllowanceMode: mode,
        monthlyNonTaxableCommutingYen: 999_999,
      }),
    );
    const resolution = resolveEffectiveTakeHomePlan(
      linked.state,
      linked.takeHomePlan,
    );
    expect(resolution.status).toBe("payroll-linked");
    if (resolution.status !== "payroll-linked") return;
    expect(resolution.plan.compensation.monthlyNonTaxableCommutingYen).toBe(
      expected,
    );
    expect(resolution.plan.compensation.annualNonTaxableCommutingYen).toBe(
      expected * 12,
    );
  });

  it("keeps gasoline out of Payroll and linked Take-home authority", () => {
    const lowFuel = linkedState(
      payroll({
        commutingAllowanceMode: "car-daily",
        commutingFuelEstimate: {
          ...payroll().commutingFuelEstimate,
          roundTripDistanceKmTenths: 100,
        },
      }),
    );
    const highFuel = linkedState(
      payroll({
        commutingAllowanceMode: "car-daily",
        commutingFuelEstimate: {
          ...payroll().commutingFuelEstimate,
          roundTripDistanceKmTenths: 500,
        },
      }),
    );
    const lowFuelPayroll = required(
      lowFuel.state.payrollPlans[0],
      "low-fuel payroll is missing",
    );
    const highFuelPayroll = required(
      highFuel.state.payrollPlans[0],
      "high-fuel payroll is missing",
    );
    expect(calculatePayroll(lowFuelPayroll)).toEqual(
      calculatePayroll(highFuelPayroll),
    );
    expect(
      resolveEffectiveTakeHomePlan(lowFuel.state, lowFuel.takeHomePlan),
    ).toEqual(
      resolveEffectiveTakeHomePlan(highFuel.state, highFuel.takeHomePlan),
    );
    expect(
      calculateTakeHomeFromState(
        lowFuel.state,
        lowFuel.takeHomePlan,
        selfMember(lowFuel.state),
        "2026-08-24",
      ),
    ).toEqual(
      calculateTakeHomeFromState(
        highFuel.state,
        highFuel.takeHomePlan,
        selfMember(highFuel.state),
        "2026-08-24",
      ),
    );
    expect(calculatePayrollPracticalResult(lowFuelPayroll)).not.toEqual(
      calculatePayrollPracticalResult(highFuelPayroll),
    );
  });

  it("preserves untouched legacy mode and adopts only explicit checkbox state", () => {
    expect(
      resolveCommutingAllowanceModeForSave({
        selectedMode: "legacy-monthly",
        checkboxChecked: false,
        checkboxTouched: false,
      }),
    ).toBe("legacy-monthly");
    expect(
      resolveCommutingAllowanceModeForSave({
        selectedMode: "legacy-monthly",
        checkboxChecked: true,
        checkboxTouched: true,
      }),
    ).toBe("car-daily");
    expect(
      resolveCommutingAllowanceModeForSave({
        selectedMode: "legacy-monthly",
        checkboxChecked: false,
        checkboxTouched: true,
      }),
    ).toBe("none");
    expect(
      resolveCommutingAllowanceModeForSave({
        selectedMode: null,
        checkboxChecked: false,
        checkboxTouched: false,
      }),
    ).toBe("none");
  });
});
