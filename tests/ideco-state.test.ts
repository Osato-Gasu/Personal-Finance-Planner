import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import {
  calculateIdecoPlan,
  createIdecoPlan,
  type IdecoPlan,
} from "../src/domain/ideco";
import { migrateToCurrentState } from "../src/domain/migration";
import type { InvestmentScenario } from "../src/domain/nisa";
import {
  validateAppState,
  type AppState,
  type SchemaVersion4AppState,
} from "../src/domain/state";
import { calculateTakeHomeFromState } from "../src/domain/take-home-linked-calculator";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import {
  SCHEMA_VERSION_4_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { createFixtureState } from "./fixtures/state";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

const referenceDate = "2026-08-13";
const calculationReference = { taxYear: 2026, referenceDate } as const;

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

function scenario(memberId = "self"): InvestmentScenario {
  return {
    id: `scenario-${memberId}`,
    memberId,
    kind: "standard",
    annualReturnBasisPoints: 300,
    annualFeeBasisPoints: 50,
    annualInflationBasisPoints: 100,
  };
}

function idecoPlan(values: Partial<IdecoPlan> = {}): IdecoPlan {
  return {
    ...createIdecoPlan({
      id: "ideco-self",
      memberId: "self",
      activeScenarioId: "scenario-self",
    }),
    participantCategory: "category2",
    participantCategoryConfirmed: true,
    employerPensionType: "none",
    matchingContributionActive: false,
    idecoPlusActive: false,
    annualUnitContributionActive: false,
    startMonth: "2026-08",
    monthlyContributionYen: 10_000,
    currentBalanceYen: 100_000,
    currentContributionTotalYen: 80_000,
    monthlyFeeYen: 0,
    projectionTarget: { type: "month", month: "2026-12" },
    ...values,
  };
}

function takeHomePlan() {
  const plan = createCalculatedTakeHomePlan({
    id: "calculated-self",
    memberId: "self",
    birthDate: "1990-01-01",
    residencePrefecture: "JP-13",
  });
  plan.compensation.annualTaxableSalaryYen = 6_000_000;
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
  return plan;
}

function linkedState(): AppState {
  const state = createFixtureState();
  const takeHome = takeHomePlan();
  takeHome.deductions.annualIdecoContributionYen = 123_456;
  takeHome.deductions.idecoContributionMode = "linked";
  takeHome.deductions.linkedIdecoPlanId = "ideco-self";
  state.takeHomePlans.push(takeHome);
  state.investmentScenarios.push(scenario());
  state.idecoPlans.push(idecoPlan());
  validateAppState(state);
  return state;
}

describe("AppState v5 iDeCo migration and validation", () => {
  it("migrates v4 to v5 without changing the manual annual iDeCo value", () => {
    const current = createFixtureState();
    const calculated = takeHomePlan();
    calculated.deductions.annualIdecoContributionYen = 240_000;
    const deductions = structuredClone(
      calculated.deductions,
    ) as unknown as Record<string, unknown>;
    delete deductions.idecoContributionMode;
    delete deductions.linkedIdecoPlanId;
    const legacyPlan = { ...structuredClone(calculated), deductions };
    const rest = structuredClone(current);
    Reflect.deleteProperty(rest, "idecoPlans");
    const previous = {
      ...rest,
      schemaVersion: 4,
      takeHomePlans: [...rest.takeHomePlans, legacyPlan],
    } as unknown as SchemaVersion4AppState;
    const before = JSON.stringify(previous);
    const migrated = migrateToCurrentState(previous);
    expect(JSON.stringify(previous)).toBe(before);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.idecoPlans).toEqual([]);
    const plan = migrated.takeHomePlans.find(
      (item) => item.id === calculated.id,
    );
    expect(plan?.mode).toBe("calculated");
    if (!plan || plan.mode !== "calculated") throw new Error("plan missing");
    expect(plan.deductions).toMatchObject({
      annualIdecoContributionYen: 240_000,
      idecoContributionMode: "manual",
      linkedIdecoPlanId: null,
    });
  });

  it("loads v4 from its old key, preserves old bytes, and writes v5", () => {
    const current = createFixtureState();
    const rest = structuredClone(current);
    Reflect.deleteProperty(rest, "idecoPlans");
    const previous = { ...rest, schemaVersion: 4 };
    const bytes = JSON.stringify(previous);
    const storage = new MemoryStorage();
    storage.values.set(SCHEMA_VERSION_4_STORAGE_KEY, bytes);
    const loaded = new StorageRepository(storage).load();
    expect(loaded?.schemaVersion).toBe(5);
    expect(loaded?.idecoPlans).toEqual([]);
    expect(storage.getItem(SCHEMA_VERSION_4_STORAGE_KEY)).toBe(bytes);
    const persisted = JSON.parse(
      storage.getItem(STORAGE_KEY) ?? "{}",
    ) as unknown as { schemaVersion: unknown };
    expect(persisted.schemaVersion).toBe(5);
  });

  it("keeps v1, v2, and v3 imports working through v5", () => {
    const state = createFixtureState();
    const candidates = [
      {
        schemaVersion: 3,
        activeRoute: state.activeRoute,
        members: state.members,
        takeHomePlans: state.takeHomePlans,
        incomeTargets: state.incomeTargets,
        links: state.links,
        budget: state.budget,
        contributionSources: state.contributionSources,
      },
    ];
    for (const candidate of candidates)
      expect(migrateToCurrentState(candidate)).toMatchObject({
        schemaVersion: 5,
        idecoPlans: [],
      });
  });

  it.each([
    [
      "duplicate plan",
      (state: AppState): void => {
        state.idecoPlans.push(structuredClone(state.idecoPlans[0]!));
      },
    ],
    [
      "active plan duplicate",
      (state: AppState): void => {
        state.idecoPlans.push({
          ...structuredClone(state.idecoPlans[0]!),
          id: "second",
        });
      },
    ],
    [
      "missing member",
      (state: AppState): void => {
        state.idecoPlans[0]!.memberId = "missing";
      },
    ],
    [
      "scenario mismatch",
      (state: AppState): void => {
        state.idecoPlans[0]!.activeScenarioId = "missing";
      },
    ],
  ] as const)("rejects %s", (_name, mutate) => {
    const state = linkedState();
    mutate(state);
    expect(() => validateAppState(state)).toThrow();
  });

  it("rejects broken and cross-member take-home links", () => {
    const broken = linkedState();
    const plan = broken.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    );
    if (!plan || plan.mode !== "calculated") throw new Error("plan missing");
    plan.deductions.linkedIdecoPlanId = "missing";
    expect(() => validateAppState(broken)).toThrow("linked iDeCo plan");

    const mismatch = linkedState();
    const ideco = mismatch.idecoPlans[0]!;
    ideco.memberId = "partner";
    mismatch.investmentScenarios[0]!.memberId = "partner";
    expect(() => validateAppState(mismatch)).toThrow("linked iDeCo plan");
  });

  it("rejects unsafe money, malformed month, target, and unknown enum", () => {
    for (const mutate of [
      (plan: IdecoPlan) => (plan.monthlyFeeYen = Number.MAX_VALUE),
      (plan: IdecoPlan) => (plan.startMonth = "2030-13"),
      (plan: IdecoPlan) =>
        (plan.projectionTarget = { type: "receipt-age", age: 121 }),
      (plan: IdecoPlan) =>
        (plan.participantCategory =
          "unknown" as IdecoPlan["participantCategory"]),
    ]) {
      const state = linkedState();
      mutate(state.idecoPlans[0]!);
      expect(() => validateAppState(state)).toThrow();
    }
  });

  it("rejects a safe-integer input whose projection exceeds the supported range", () => {
    const state = linkedState();
    state.idecoPlans[0]!.currentBalanceYen = Number.MAX_SAFE_INTEGER;
    expect(() => validateAppState(state)).toThrow(
      "iDeCo plan exceeds the supported range",
    );
  });

  it("rejects malformed v5 missing explicit link fields", () => {
    const state = linkedState();
    const raw = structuredClone(state) as unknown as Record<string, unknown>;
    const plans = raw.takeHomePlans as Array<Record<string, unknown>>;
    const calculated = plans.find((item) => item.id === "calculated-self")!;
    delete (calculated.deductions as Record<string, unknown>)
      .idecoContributionMode;
    expect(() => migrateToCurrentState(raw)).toThrow("link fields");
  });
});

describe("linked iDeCo source of truth and transactional Store", () => {
  it("derives annual contribution from IdecoPlan without overwriting the manual value", () => {
    const state = linkedState();
    const plan = state.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    )!;
    const member = state.members.find((item) => item.id === "self")!;
    const before = JSON.stringify(plan);
    const result = calculateTakeHomeFromState(
      state,
      plan,
      member,
      referenceDate,
    );
    expect(result.status).toBe("complete");
    expect(result.incomeTaxBenefitFromIdecoYen).toBeGreaterThan(0);
    expect(JSON.stringify(plan)).toBe(before);
    if (plan.mode !== "calculated") throw new Error("plan missing");
    expect(plan.deductions.annualIdecoContributionYen).toBe(123_456);
  });

  it("recalculates immediately when the linked plan changes", () => {
    const state = linkedState();
    const takeHome = state.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    )!;
    const member = state.members.find((item) => item.id === "self")!;
    const before = calculateTakeHomeFromState(
      state,
      takeHome,
      member,
      referenceDate,
    );
    state.idecoPlans[0]!.monthlyContributionYen = 20_000;
    const after = calculateTakeHomeFromState(
      state,
      takeHome,
      member,
      referenceDate,
    );
    expect(after.incomeTaxAfterIdecoYen).toBeLessThan(
      before.incomeTaxAfterIdecoYen ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it.each([
    [
      "invalid",
      (plan: IdecoPlan): void => {
        plan.monthlyContributionYen = 23_001;
      },
      "incomplete",
    ],
    [
      "incomplete",
      (plan: IdecoPlan): void => {
        plan.monthlyContributionYen = null;
      },
      "incomplete",
    ],
    [
      "unsupported",
      (plan: IdecoPlan): void => {
        plan.idecoPlusActive = true;
      },
      "unsupported",
    ],
    [
      "missing-rule",
      (plan: IdecoPlan): void => {
        plan.startMonth = "2024-11";
      },
      "missing-rule",
    ],
  ] as const)(
    "does not fallback for %s linked plan",
    (_name, mutate, expected) => {
      const state = linkedState();
      mutate(state.idecoPlans[0]!);
      const takeHome = state.takeHomePlans.find(
        (item) => item.id === "calculated-self",
      )!;
      const member = state.members.find((item) => item.id === "self")!;
      const result = calculateTakeHomeFromState(
        state,
        takeHome,
        member,
        referenceDate,
      );
      expect(result.status).toBe(expected);
      expect(result.incomeTaxAfterIdecoYen).toBeNull();
    },
  );

  it("does not copy a linked value back when switching explicitly to manual", () => {
    const state = linkedState();
    const plan = state.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    );
    if (!plan || plan.mode !== "calculated") throw new Error("plan missing");
    const manualBefore = plan.deductions.annualIdecoContributionYen;
    plan.deductions.idecoContributionMode = "manual";
    plan.deductions.linkedIdecoPlanId = null;
    validateAppState(state);
    expect(plan.deductions.annualIdecoContributionYen).toBe(manualBefore);
  });

  it("keeps an inactive linked plan without fallback and recalculates after reactivation", () => {
    const state = linkedState();
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    const writer = {
      save: vi.fn((candidate: AppState) => repository.save(candidate)),
    };
    const store = new Store(state, writer);
    const listener = vi.fn();
    store.subscribe(listener);
    const linkedPlan = state.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    )!;
    const member = state.members.find((item) => item.id === "self")!;
    const linkBefore = structuredClone(state.links);
    const manualBefore =
      linkedPlan.mode === "calculated"
        ? linkedPlan.deductions.annualIdecoContributionYen
        : null;

    const inactive = structuredClone(state.idecoPlans[0]!);
    inactive.active = false;
    store.dispatch({
      type: "update-ideco-plan",
      planId: inactive.id,
      plan: inactive,
    });
    const inactiveState = store.getState();
    const inactiveTakeHome = inactiveState.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    )!;
    const inactiveResult = calculateTakeHomeFromState(
      inactiveState,
      inactiveTakeHome,
      member,
      referenceDate,
    );
    expect(inactiveResult).toMatchObject({
      status: "incomplete",
      incomeTaxBeforeIdecoYen: null,
      incomeTaxAfterIdecoYen: null,
      incomeTaxBenefitFromIdecoYen: null,
    });
    expect(inactiveState.idecoPlans).toHaveLength(1);
    expect(inactiveState.links).toEqual(linkBefore);
    if (inactiveTakeHome.mode !== "calculated") throw new Error("plan missing");
    expect(inactiveTakeHome.deductions.annualIdecoContributionYen).toBe(
      manualBefore,
    );

    const reactivated = structuredClone(inactiveState.idecoPlans[0]!);
    reactivated.active = true;
    store.dispatch({
      type: "update-ideco-plan",
      planId: reactivated.id,
      plan: reactivated,
    });
    const activeState = store.getState();
    expect(
      calculateTakeHomeFromState(
        activeState,
        activeState.takeHomePlans.find(
          (item) => item.id === "calculated-self",
        )!,
        member,
        referenceDate,
      ).status,
    ).toBe("complete");
    expect(writer.save).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not fallback or mutate state and storage for an out-of-range linked plan", () => {
    const state = linkedState();
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(state);
    const storedBefore = storage.getItem(STORAGE_KEY);
    state.idecoPlans[0]!.currentBalanceYen = Number.MAX_SAFE_INTEGER;
    const stateBefore = JSON.stringify(state);
    const takeHome = state.takeHomePlans.find(
      (item) => item.id === "calculated-self",
    )!;
    const member = state.members.find((item) => item.id === "self")!;
    const result = calculateTakeHomeFromState(
      state,
      takeHome,
      member,
      referenceDate,
    );
    expect(result).toMatchObject({
      status: "out-of-range",
      incomeTaxBeforeIdecoYen: null,
      incomeTaxAfterIdecoYen: null,
      incomeTaxBenefitFromIdecoYen: null,
    });
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(storage.getItem(STORAGE_KEY)).toBe(storedBefore);
    if (takeHome.mode !== "calculated") throw new Error("plan missing");
    expect(takeHome.deductions.annualIdecoContributionYen).toBe(123_456);
  });

  it("preserves State, storage bytes, writer and listeners after a rejected action", () => {
    const state = linkedState();
    const storage = new MemoryStorage();
    const repository = new StorageRepository(storage);
    repository.save(state);
    const bytes = storage.getItem(STORAGE_KEY);
    const writer = {
      save: vi.fn((candidate: AppState) => repository.save(candidate)),
    };
    const store = new Store(state, writer);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = JSON.stringify(store.getState());
    const invalid = structuredClone(state.idecoPlans[0]!);
    invalid.memberId = "missing";
    expect(() =>
      store.dispatch({
        type: "update-ideco-plan",
        planId: invalid.id,
        plan: invalid,
      }),
    ).toThrow();
    expect(JSON.stringify(store.getState())).toBe(before);
    expect(storage.getItem(STORAGE_KEY)).toBe(bytes);
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("supports normal add, update, deactivate, and guarded delete", () => {
    const state = createFixtureState();
    state.investmentScenarios.push(scenario());
    const store = new Store(state);
    store.dispatch({ type: "add-ideco-plan", plan: idecoPlan() });
    expect(store.getState().idecoPlans).toHaveLength(1);
    const updated = structuredClone(store.getState().idecoPlans[0]!);
    updated.active = false;
    store.dispatch({
      type: "update-ideco-plan",
      planId: updated.id,
      plan: updated,
    });
    expect(store.getState().idecoPlans[0]?.active).toBe(false);
    store.dispatch({ type: "delete-ideco-plan", planId: updated.id });
    expect(store.getState().idecoPlans).toEqual([]);
  });

  it("keeps resident tax and total benefit explicitly uncomputed", () => {
    const result = calculateIdecoPlan(
      idecoPlan(),
      scenario(),
      {
        active: true,
        birthDate: "1990-01-01",
      },
      calculationReference,
    );
    expect(result).toMatchObject({
      status: "complete",
      residentTaxBenefitFromIdecoYen: null,
      totalTaxBenefitYen: null,
      effectiveAnnualIdecoCostYen: null,
    });
  });

  it("preview and failed commit preserve bytes", () => {
    const state = linkedState();
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, "before");
    const repository = new StorageRepository(storage);
    const prepared = repository.prepareImport(JSON.stringify(state));
    expect(storage.getItem(STORAGE_KEY)).toBe("before");
    expect(prepared.preview).toEqual(state);
    const failing: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: (key) => storage.removeItem(key),
    };
    expect(() => new StorageRepository(failing).commitImport(prepared)).toThrow(
      "quota",
    );
    expect(storage.getItem(STORAGE_KEY)).toBe("before");
  });

  it("rejects prototype pollution and leaves stored bytes intact", () => {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, "before");
    const repository = new StorageRepository(storage);
    expect(() =>
      repository.prepareImport('{"schemaVersion":5,"__proto__":{}}'),
    ).toThrow("unsafe import key");
    expect(storage.getItem(STORAGE_KEY)).toBe("before");
  });
});
