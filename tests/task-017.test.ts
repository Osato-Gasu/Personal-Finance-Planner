import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION_8_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { migrateToCurrentState } from "../src/domain/migration";
import {
  adaptAnnualBonuses,
  calculateEstimatedGasolineYen,
  calculatePayroll,
  calculatePayrollPracticalResult,
  selectPayrollPlanForContext,
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

function fuel(
  overrides: Partial<PayrollPlan["commutingFuelEstimate"]> = {},
): PayrollPlan["commutingFuelEstimate"] {
  return {
    averageWorkdaysPerMonthTenths: null,
    roundTripDistanceKmTenths: null,
    fuelEfficiencyKmPerLiterTenths: null,
    gasolinePriceYenPerLiter: null,
    ...overrides,
  };
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function schemaVersion8Payroll(
  plan: Readonly<PayrollPlan>,
): Omit<PayrollPlan, "commutingFuelEstimate"> {
  const legacy = structuredClone(plan) as Partial<PayrollPlan>;
  Reflect.deleteProperty(legacy, "commutingFuelEstimate");
  return legacy as Omit<PayrollPlan, "commutingFuelEstimate">;
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
    monthlyNonTaxableCommutingYen: 5_000,
    commutingFuelEstimate: fuel(),
    bonuses: [],
    ...overrides,
  };
}

function linkedState(
  commutingFuelEstimate: PayrollPlan["commutingFuelEstimate"],
): {
  state: AppState;
  takeHomePlan: ReturnType<typeof createCalculatedTakeHomePlan>;
} {
  const state = createInitialState();
  const takeHomePlan = createCalculatedTakeHomePlan({
    id: "take-home-self-2026",
    memberId: "member-self",
    targetYear: 2026,
  });
  state.payrollPlans = [payroll({ commutingFuelEstimate })];
  state.takeHomePlans = [takeHomePlan];
  state.takeHomeCompensationBindings = [
    {
      takeHomePlanId: takeHomePlan.id,
      payrollPlanId: "payroll-self-2026",
      active: true,
    },
  ];
  return { state, takeHomePlan };
}

describe("TASK-017 self/current-year payroll resolution", () => {
  it("filters to self/current year before selected, active, and first priority", () => {
    const partner = payroll({
      id: "partner-active",
      memberId: "member-partner",
      active: true,
    });
    const past = payroll({ id: "self-past", targetYear: 2025, active: true });
    const first = payroll({ id: "self-first", active: false });
    const active = payroll({ id: "self-active", active: true });
    const selected = payroll({ id: "self-selected", active: false });
    const plans = [partner, past, first, active, selected];

    expect(
      selectPayrollPlanForContext(plans, "member-self", 2026, partner.id)?.id,
    ).toBe(active.id);
    expect(
      selectPayrollPlanForContext(plans, "member-self", 2026, selected.id)?.id,
    ).toBe(selected.id);
    expect(
      selectPayrollPlanForContext(
        [partner, past, first],
        "member-self",
        2026,
        null,
      )?.id,
    ).toBe(first.id);
    expect(
      selectPayrollPlanForContext([partner, past], "member-self", 2026, null),
    ).toBeUndefined();
  });

  it("adds a missing current plan without modifying partner, past-year, or bindings", () => {
    const state = createInitialState();
    state.payrollPlans = [
      payroll({ id: "partner", memberId: "member-partner" }),
      payroll({ id: "past", targetYear: 2025 }),
    ];
    const before = structuredClone(state);
    const current = payroll({ id: "current", targetYear: 2027 });
    const next = reduceState(state, {
      type: "add-payroll-plan",
      plan: current,
    });

    expect(next.payrollPlans.slice(0, 2)).toEqual(before.payrollPlans);
    expect(next.takeHomeCompensationBindings).toEqual(
      before.takeHomeCompensationBindings,
    );
    expect(next.payrollPlans[2]).toEqual(current);
  });
});

describe("TASK-017 annual bonus compatibility adapter", () => {
  const multiple = [
    {
      id: "summer",
      paymentDate: "2026-06-30",
      grossYen: 200_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: false,
    },
    {
      id: "winter",
      paymentDate: "2026-12-10",
      grossYen: 300_000,
      socialInsuranceEligible: false,
      employmentInsuranceEligible: true,
    },
  ];

  it("preserves unchanged arrays and changes only grossYen for one record", () => {
    expect(
      adaptAnnualBonuses({
        bonuses: multiple,
        annualBonusYen: 500_000,
        referenceDate: "2026-08-24",
        createId: () => "unused",
        allowMultipleReplacement: false,
      }),
    ).toEqual(multiple);
    const one = [required(multiple[0], "bonus is missing")];
    expect(
      adaptAnnualBonuses({
        bonuses: one,
        annualBonusYen: 123_456,
        referenceDate: "2026-08-24",
        createId: () => "unused",
        allowMultipleReplacement: false,
      }),
    ).toEqual([{ ...one[0], grossYen: 123_456 }]);
  });

  it("requires confirmation for multiple records and flattens only after approval", () => {
    expect(() =>
      adaptAnnualBonuses({
        bonuses: multiple,
        annualBonusYen: 600_000,
        referenceDate: "2026-08-24",
        createId: () => "synthetic",
        allowMultipleReplacement: false,
      }),
    ).toThrow("requires confirmation");
    expect(
      adaptAnnualBonuses({
        bonuses: multiple,
        annualBonusYen: 600_000,
        referenceDate: "2026-08-24",
        createId: () => "synthetic",
        allowMultipleReplacement: true,
      }),
    ).toEqual([
      {
        id: "synthetic",
        paymentDate: "2026-08-24",
        grossYen: 600_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ]);
    expect(
      adaptAnnualBonuses({
        bonuses: multiple,
        annualBonusYen: 0,
        referenceDate: "2026-08-24",
        createId: () => "unused",
        allowMultipleReplacement: true,
      }),
    ).toEqual([]);
  });

  it("keeps zero records empty and creates one current-date record for nonzero", () => {
    expect(
      adaptAnnualBonuses({
        bonuses: [],
        annualBonusYen: 0,
        referenceDate: "2026-08-24",
        createId: () => "unused",
        allowMultipleReplacement: false,
      }),
    ).toEqual([]);
    expect(
      adaptAnnualBonuses({
        bonuses: [],
        annualBonusYen: 1,
        referenceDate: "2026-08-24",
        createId: () => "new-bonus",
        allowMultipleReplacement: false,
      }),
    ).toEqual([
      {
        id: "new-bonus",
        paymentDate: "2026-08-24",
        grossYen: 1,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ]);
  });
});

describe("TASK-017 schema v9 commuting-fuel persistence", () => {
  it("migrates v8 by adding only null commuting-fuel inputs to each payroll plan", () => {
    const current = createInitialState();
    const currentPayroll = payroll({
      bonuses: [
        {
          id: "bonus",
          paymentDate: "2026-06-30",
          grossYen: 400_000,
          socialInsuranceEligible: false,
          employmentInsuranceEligible: true,
        },
      ],
    });
    const legacyPayroll = schemaVersion8Payroll(currentPayroll);
    const v8 = {
      ...structuredClone(current),
      schemaVersion: 8,
      payrollPlans: [legacyPayroll],
    };
    const before = JSON.stringify(v8);
    const migrated = migrateToCurrentState(v8);

    expect(JSON.stringify(v8)).toBe(before);
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.payrollPlans[0]).toEqual(currentPayroll);
    const oldOther = structuredClone(v8) as Partial<typeof v8>;
    Reflect.deleteProperty(oldOther, "schemaVersion");
    Reflect.deleteProperty(oldOther, "payrollPlans");
    const newOther = structuredClone(migrated) as Partial<AppState>;
    Reflect.deleteProperty(newOther, "schemaVersion");
    Reflect.deleteProperty(newOther, "payrollPlans");
    expect(newOther).toEqual(oldOther);
    expect(migrateToCurrentState(migrated)).toEqual(migrated);
  });

  it("loads v8 from its frozen key, preserves bytes, and round-trips v9 export/import", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    state.payrollPlans = [
      payroll({
        commutingFuelEstimate: fuel({
          averageWorkdaysPerMonthTenths: 205,
          roundTripDistanceKmTenths: 321,
          fuelEfficiencyKmPerLiterTenths: 123,
          gasolinePriceYenPerLiter: 181,
        }),
      }),
    ];
    const legacyPayroll = schemaVersion8Payroll(
      required(state.payrollPlans[0], "payroll plan is missing"),
    );
    const v8 = {
      ...structuredClone(state),
      schemaVersion: 8,
      payrollPlans: [legacyPayroll],
    };
    const v8Bytes = JSON.stringify(v8);
    storage.values.set(SCHEMA_VERSION_8_STORAGE_KEY, v8Bytes);
    const repository = new StorageRepository(storage);
    const loaded = repository.load();
    expect(loaded?.schemaVersion).toBe(9);
    expect(storage.getItem(SCHEMA_VERSION_8_STORAGE_KEY)).toBe(v8Bytes);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(loaded));

    repository.save(state);
    const exported = repository.export(state);
    const prepared = repository.prepareImport(exported);
    expect(prepared.preview).toEqual(state);
    expect(repository.commitImport(prepared)).toEqual(state);
  });

  it("fails closed on corrupt current v9 instead of falling back to valid v8", () => {
    const storage = new MemoryStorage();
    const state = createInitialState();
    storage.values.set(STORAGE_KEY, "{broken");
    storage.values.set(
      SCHEMA_VERSION_8_STORAGE_KEY,
      JSON.stringify({ ...state, schemaVersion: 8 }),
    );
    expect(() => new StorageRepository(storage).load()).toThrow("invalid JSON");
    expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
  });
});

describe("TASK-017 fixed-point practical-income calculation", () => {
  it("calculates the 7,200-yen example and exact half-up boundary", () => {
    expect(
      calculateEstimatedGasolineYen(
        fuel({
          averageWorkdaysPerMonthTenths: 200,
          roundTripDistanceKmTenths: 200,
          fuelEfficiencyKmPerLiterTenths: 100,
          gasolinePriceYenPerLiter: 180,
        }),
      ),
    ).toBe(7_200);
    expect(
      calculateEstimatedGasolineYen(
        fuel({
          averageWorkdaysPerMonthTenths: 1,
          roundTripDistanceKmTenths: 1,
          fuelEfficiencyKmPerLiterTenths: 1,
          gasolinePriceYenPerLiter: 5,
        }),
      ),
    ).toBe(1);
  });

  it("keeps incomplete values unavailable, rejects invalid values, and preserves deficits", () => {
    expect(calculateEstimatedGasolineYen(fuel())).toBeNull();
    expect(() =>
      calculateEstimatedGasolineYen(
        fuel({ fuelEfficiencyKmPerLiterTenths: 0 }),
      ),
    ).toThrow("must be positive");
    expect(() =>
      calculateEstimatedGasolineYen(
        fuel({ averageWorkdaysPerMonthTenths: -1 }),
      ),
    ).toThrow("non-negative safe integer");
    const result = calculatePayrollPracticalResult(
      payroll({
        baseMonthlyYen: 100_000,
        taxableAllowanceMonthlyYen: 0,
        monthlyNonTaxableCommutingYen: 5_000,
        commutingFuelEstimate: fuel({
          averageWorkdaysPerMonthTenths: 200,
          roundTripDistanceKmTenths: 200,
          fuelEfficiencyKmPerLiterTenths: 100,
          gasolinePriceYenPerLiter: 180,
        }),
      }),
    );
    expect(result.estimatedGasolineYen).toBe(7_200);
    expect(result.commutingBalanceYen).toBe(-2_200);
    expect(result.practicalMonthlyIncomeYen).toBe(97_800);
    expect(result.practicalAnnualIncomeYen).toBe(1_173_600);
  });

  it("keeps statutory Payroll and linked Take-home authority unchanged on fuel-only edits", () => {
    const incomplete = linkedState(fuel());
    const complete = linkedState(
      fuel({
        averageWorkdaysPerMonthTenths: 200,
        roundTripDistanceKmTenths: 200,
        fuelEfficiencyKmPerLiterTenths: 100,
        gasolinePriceYenPerLiter: 180,
      }),
    );
    expect(
      calculatePayroll(
        required(incomplete.state.payrollPlans[0], "payroll plan is missing"),
      ),
    ).toEqual(
      calculatePayroll(
        required(complete.state.payrollPlans[0], "payroll plan is missing"),
      ),
    );
    expect(
      resolveEffectiveTakeHomePlan(incomplete.state, incomplete.takeHomePlan),
    ).toEqual(
      resolveEffectiveTakeHomePlan(complete.state, complete.takeHomePlan),
    );
    const member = required(
      incomplete.state.members.find((candidate) => candidate.role === "self"),
      "self member is missing",
    );
    expect(
      calculateTakeHomeFromState(
        incomplete.state,
        incomplete.takeHomePlan,
        member,
        "2026-08-24",
      ),
    ).toEqual(
      calculateTakeHomeFromState(
        complete.state,
        complete.takeHomePlan,
        member,
        "2026-08-24",
      ),
    );
  });
});
