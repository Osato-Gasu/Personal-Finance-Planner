import { describe, expect, it, vi } from "vitest";
import { Store } from "../src/app/store";
import {
  LEGACY_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  STORAGE_KEY,
  StorageRepository,
  type StorageLike,
} from "../src/data/storage-repository";
import { migrateToCurrentState } from "../src/domain/migration";
import { calculateBudgetSummary } from "../src/domain/budget";
import { calculateTakeHome } from "../src/domain/take-home-calculator";
import { resolveIncomeTarget } from "../src/domain/linked-value";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import {
  parseAppState,
  type AppState,
  type SchemaVersion2AppState,
} from "../src/domain/state";
import { createFixtureState } from "./fixtures/state";

class BytesStorage implements StorageLike {
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

class FailingV3Storage extends BytesStorage {
  override setItem(key: string, value: string): void {
    this.values.set(key, value);
    if (key === STORAGE_KEY) throw new Error("simulated v3 write failure");
  }
}

function v2Fixture(): SchemaVersion2AppState {
  const current = createFixtureState();
  return {
    schemaVersion: 2,
    activeRoute: current.activeRoute,
    members: current.members.map(({ id, role, displayName, active }) => ({
      id,
      role,
      displayName,
      active,
    })),
    takeHomeInputs: current.takeHomePlans.map((plan) => ({
      id: plan.id,
      memberId: plan.memberId,
      fixtureMonthlyTakeHomeYen:
        plan.mode === "legacy-manual"
          ? plan.manualAverageMonthlyTakeHomeYen
          : 0,
    })),
    incomeTargets: structuredClone(current.incomeTargets),
    links: structuredClone(current.links),
    budget: structuredClone(current.budget),
    contributionSources: structuredClone(current.contributionSources),
  };
}

function completeCalculatedSelfPlan() {
  const plan = createCalculatedTakeHomePlan({
    id: "take-home-self",
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

function linkedCalculatedState(): AppState {
  const state = createFixtureState();
  const self = state.members[0];
  if (!self) throw new Error("self member is missing");
  state.members[0] = {
    ...self,
    birthDate: "1990-01-01",
    residencePrefecture: "JP-13",
  };
  state.takeHomePlans[0] = completeCalculatedSelfPlan();
  return state;
}

describe("schema version 3 migration and storage", () => {
  it("migrates v2 values without changing source and link IDs", () => {
    const previous = v2Fixture();
    const migrated = migrateToCurrentState(previous);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.takeHomePlans.map((plan) => plan.id)).toEqual(
      previous.takeHomeInputs.map((input) => input.id),
    );
    expect(migrated.links).toEqual(previous.links);
  });

  it("maps every v2 manual value to a legacy plan", () => {
    const migrated = migrateToCurrentState(v2Fixture());
    expect(migrated.takeHomePlans).toEqual([
      {
        id: "take-home-self",
        memberId: "self",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 300_000,
        active: true,
      },
      {
        id: "take-home-partner",
        memberId: "partner",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 250_000,
        active: true,
      },
    ]);
  });

  it("loads v3 before older storage", () => {
    const storage = new BytesStorage();
    const current = createFixtureState();
    storage.values.set(STORAGE_KEY, JSON.stringify(current));
    storage.values.set(PREVIOUS_STORAGE_KEY, "{broken");
    expect(new StorageRepository(storage).load()).toEqual(current);
  });

  it("does not fall back when v3 is corrupt", () => {
    const storage = new BytesStorage();
    const v2Bytes = JSON.stringify(v2Fixture());
    storage.values.set(STORAGE_KEY, "{broken");
    storage.values.set(PREVIOUS_STORAGE_KEY, v2Bytes);
    expect(() => new StorageRepository(storage).load()).toThrow("invalid JSON");
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBe(v2Bytes);
  });

  it("loads v2 only when v3 is absent and preserves v2 bytes", () => {
    const storage = new BytesStorage();
    const v2Bytes = JSON.stringify(v2Fixture());
    storage.values.set(PREVIOUS_STORAGE_KEY, v2Bytes);
    expect(new StorageRepository(storage).load()?.schemaVersion).toBe(5);
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBe(v2Bytes);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("restores every storage byte when v2-to-v3 persistence fails", () => {
    const storage = new FailingV3Storage();
    const v2Bytes = JSON.stringify(v2Fixture());
    storage.values.set(PREVIOUS_STORAGE_KEY, v2Bytes);
    const before = [...storage.values.entries()];
    expect(() => new StorageRepository(storage).load()).toThrow(
      "simulated v3 write failure",
    );
    expect([...storage.values.entries()]).toEqual(before);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps v1 bytes while migrating directly to v3", () => {
    const storage = new BytesStorage();
    const v1 = { ...v2Fixture(), schemaVersion: 1, livingExpenses: [] };
    const v1Bytes = JSON.stringify(v1);
    storage.values.set(LEGACY_STORAGE_KEY, v1Bytes);
    expect(new StorageRepository(storage).load()?.schemaVersion).toBe(5);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(v1Bytes);
  });

  it("imports v1, v2, and v3 as v3 previews", () => {
    const repository = new StorageRepository(new BytesStorage());
    const v2 = v2Fixture();
    const v1 = { ...v2, schemaVersion: 1, livingExpenses: [] };
    expect(
      repository.prepareImport(JSON.stringify(v1)).preview.schemaVersion,
    ).toBe(5);
    expect(
      repository.prepareImport(JSON.stringify(v2)).preview.schemaVersion,
    ).toBe(5);
    expect(
      repository.prepareImport(JSON.stringify(createFixtureState())).preview
        .schemaVersion,
    ).toBe(5);
  });

  it("normalizes pre-finding v3 calculated plans by snapshotting member identity", () => {
    const state = linkedCalculatedState();
    const plan = state.takeHomePlans[0];
    if (!plan || plan.mode !== "calculated") throw new Error("plan is missing");
    Reflect.deleteProperty(plan, "birthDate");
    Reflect.deleteProperty(plan, "residencePrefecture");
    Reflect.deleteProperty(
      plan.compensation,
      "monthlyEmploymentInsuranceWagesYen",
    );
    const normalized = parseAppState(JSON.parse(JSON.stringify(state)));
    expect(normalized.takeHomePlans[0]).toMatchObject({
      birthDate: "1990-01-01",
      residencePrefecture: "JP-13",
      compensation: { monthlyEmploymentInsuranceWagesYen: null },
    });
  });

  it("preserves missing and explicit-zero monthly employment wages in v3", () => {
    const state = linkedCalculatedState();
    const plan = state.takeHomePlans[0];
    if (!plan || plan.mode !== "calculated") throw new Error("plan is missing");
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.standardRemunerationMode =
      "estimate-from-remuneration";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = [
      500_000,
      0,
      null,
      ...Array.from({ length: 9 }, () => 500_000),
    ];
    const parsed = parseAppState(JSON.parse(JSON.stringify(state)));
    const parsedPlan = parsed.takeHomePlans[0];
    if (!parsedPlan || parsedPlan.mode !== "calculated")
      throw new Error("parsed plan is missing");
    expect(parsedPlan.compensation.monthlyEmploymentInsuranceWagesYen).toEqual(
      plan.compensation.monthlyEmploymentInsuranceWagesYen,
    );
    const parsedMember = parsed.members[0];
    if (!parsedMember) throw new Error("parsed member is missing");
    expect(calculateTakeHome(parsedPlan, parsedMember)).toMatchObject({
      status: "incomplete",
      warnings: [
        "雇用保険の月別対象賃金（賞与を除く）は12か月すべての入力が必要です",
      ],
    });
  });

  it("completes only after all 12 monthly employment wages are explicit", () => {
    const state = linkedCalculatedState();
    const plan = state.takeHomePlans[0];
    const member = state.members[0];
    if (!plan || plan.mode !== "calculated" || !member)
      throw new Error("fixture is missing");
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.standardRemunerationMode =
      "estimate-from-remuneration";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = [
      500_000,
      0,
      null,
      ...Array.from({ length: 9 }, () => 500_000),
    ];
    expect(calculateTakeHome(plan, member).status).toBe("incomplete");
    plan.compensation.monthlyEmploymentInsuranceWagesYen[2] = 500_000;
    expect(calculateTakeHome(plan, member).status).toBe("complete");
  });

  it("round-trips missing and explicit-zero monthly wages through reload and import", () => {
    const storage = new BytesStorage();
    const repository = new StorageRepository(storage);
    const state = linkedCalculatedState();
    const plan = state.takeHomePlans[0];
    if (!plan || plan.mode !== "calculated") throw new Error("plan is missing");
    plan.compensation.monthlyEmploymentInsuranceWagesYen = [
      500_000,
      0,
      null,
      ...Array.from({ length: 9 }, () => 500_000),
    ];
    repository.save(state);
    const reloaded = repository.load();
    if (!reloaded) throw new Error("reloaded state is missing");
    const imported = repository.prepareImport(JSON.stringify(reloaded)).preview;
    for (const candidate of [reloaded, imported]) {
      const candidatePlan = candidate.takeHomePlans[0];
      if (!candidatePlan || candidatePlan.mode !== "calculated")
        throw new Error("candidate plan is missing");
      expect(
        candidatePlan.compensation.monthlyEmploymentInsuranceWagesYen,
      ).toEqual(plan.compensation.monthlyEmploymentInsuranceWagesYen);
    }
  });

  it("rejects an invalid monthly wage before writer and listener side effects", () => {
    const writer = { save: vi.fn() };
    const listener = vi.fn();
    const state = linkedCalculatedState();
    const store = new Store(state, writer);
    store.subscribe(listener);
    const before = JSON.stringify(store.getState());
    const plan = structuredClone(state.takeHomePlans[0]);
    if (!plan || plan.mode !== "calculated") throw new Error("plan is missing");
    plan.compensation.monthlyEmploymentInsuranceWagesYen = [
      -1,
      ...Array.from({ length: 11 }, () => 500_000),
    ];
    expect(() =>
      store.dispatch({ type: "update-take-home-plan", planId: plan.id, plan }),
    ).toThrow("employment insurance wage month 1");
    expect(JSON.stringify(store.getState())).toBe(before);
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("leaves all storage bytes unchanged during import preview", () => {
    const storage = new BytesStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify(createFixtureState()));
    storage.values.set(PREVIOUS_STORAGE_KEY, JSON.stringify(v2Fixture()));
    const before = [...storage.values.entries()];
    new StorageRepository(storage).prepareImport(JSON.stringify(v2Fixture()));
    expect([...storage.values.entries()]).toEqual(before);
  });

  it("rejects an invalid v2 link without writing v3", () => {
    const storage = new BytesStorage();
    const invalid = v2Fixture();
    const link = invalid.links[0];
    if (!link) throw new Error("fixture link is missing");
    link.sourceId = "missing";
    expect(() =>
      new StorageRepository(storage).prepareImport(JSON.stringify(invalid)),
    ).toThrow("active link source is missing");
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("adds and updates a calculated plan through the Store", () => {
    const writer = { save: vi.fn() };
    const store = new Store(createFixtureState(), writer);
    const plan = createCalculatedTakeHomePlan({
      id: "calculated",
      memberId: "self",
    });
    store.dispatch({ type: "add-take-home-plan", plan });
    plan.compensation.annualTaxableSalaryYen = 5_000_000;
    store.dispatch({ type: "update-take-home-plan", planId: plan.id, plan });
    expect(
      store.getState().takeHomePlans.find((item) => item.id === plan.id),
    ).toMatchObject({ compensation: { annualTaxableSalaryYen: 5_000_000 } });
    expect(writer.save).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate plan IDs without saving or notifying", () => {
    const writer = { save: vi.fn() };
    const listener = vi.fn();
    const store = new Store(createFixtureState(), writer);
    store.subscribe(listener);
    const before = JSON.stringify(store.getState());
    const duplicate = createCalculatedTakeHomePlan({
      id: "take-home-self",
      memberId: "self",
    });
    expect(() =>
      store.dispatch({ type: "add-take-home-plan", plan: duplicate }),
    ).toThrow("already in use");
    expect(JSON.stringify(store.getState())).toBe(before);
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects a plan whose member is missing without side effects", () => {
    const writer = { save: vi.fn() };
    const store = new Store(createFixtureState(), writer);
    const plan = createCalculatedTakeHomePlan({
      id: "missing-member",
      memberId: "nobody",
    });
    expect(() => store.dispatch({ type: "add-take-home-plan", plan })).toThrow(
      "member is missing",
    );
    expect(writer.save).not.toHaveBeenCalled();
  });

  it("supports bonus add, update, and delete actions", () => {
    const state = createFixtureState();
    const plan = createCalculatedTakeHomePlan({
      id: "calculated",
      memberId: "self",
    });
    plan.compensation.annualTaxableSalaryYen = 1_000_000;
    state.takeHomePlans.push(plan);
    const store = new Store(state);
    store.dispatch({
      type: "add-take-home-bonus",
      planId: plan.id,
      bonus: {
        id: "bonus",
        paymentDate: "2026-06-30",
        grossYen: 500_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    });
    store.dispatch({
      type: "update-take-home-bonus",
      planId: plan.id,
      bonusId: "bonus",
      bonus: {
        id: "bonus",
        paymentDate: "2026-12-10",
        grossYen: 600_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    });
    expect(
      (
        store
          .getState()
          .takeHomePlans.find(
            (item) => item.id === plan.id && item.mode === "calculated",
          ) as typeof plan
      ).compensation.bonuses[0]?.grossYen,
    ).toBe(600_000);
    store.dispatch({
      type: "delete-take-home-bonus",
      planId: plan.id,
      bonusId: "bonus",
    });
    expect(
      (
        store
          .getState()
          .takeHomePlans.find(
            (item) => item.id === plan.id && item.mode === "calculated",
          ) as typeof plan
      ).compensation.bonuses,
    ).toEqual([]);
  });

  it("rejects calculation overflow before writer and listener side effects", () => {
    const writer = { save: vi.fn() };
    const listener = vi.fn();
    const store = new Store(createFixtureState(), writer);
    store.subscribe(listener);
    const plan = createCalculatedTakeHomePlan({
      id: "overflow",
      memberId: "self",
    });
    plan.inputMode = "monthly";
    plan.compensation.monthlyTaxableSalaryYen = Number.MAX_SAFE_INTEGER;
    expect(() => store.dispatch({ type: "add-take-home-plan", plan })).toThrow(
      "supported range",
    );
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects an annual plan whose declared salary does not include its bonus", () => {
    const writer = { save: vi.fn() };
    const listener = vi.fn();
    const store = new Store(createFixtureState(), writer);
    store.subscribe(listener);
    const before = JSON.stringify(store.getState());
    const plan = createCalculatedTakeHomePlan({
      id: "bonus-outside-annual-total",
      memberId: "self",
    });
    plan.compensation.annualTaxableSalaryYen = 100_000;
    plan.compensation.bonuses.push({
      id: "bonus",
      paymentDate: "2026-06-30",
      grossYen: 200_000,
      socialInsuranceEligible: true,
      employmentInsuranceEligible: true,
    });
    expect(() => store.dispatch({ type: "add-take-home-plan", plan })).toThrow(
      "must include every bonus",
    );
    expect(JSON.stringify(store.getState())).toBe(before);
    expect(writer.save).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("derives TakeHomeResult without mutating or persisting it in AppState", () => {
    const state = createFixtureState();
    const plan = createCalculatedTakeHomePlan({
      id: "derived-only",
      memberId: "self",
    });
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
    state.takeHomePlans.push(plan);
    const before = JSON.stringify(state);
    const member = state.members.find((item) => item.id === "self");
    if (!member) throw new Error("fixture member is missing");
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("complete");
    expect(JSON.stringify(state)).toBe(before);
    expect(before).not.toContain("appliedRules");
    expect(before).not.toContain("socialInsuranceBasis");
  });

  it("keeps calculated plan identity independent from later member profile changes", () => {
    const state = createFixtureState();
    const self = state.members[0];
    if (!self) throw new Error("self member is missing");
    state.members[0] = {
      ...self,
      birthDate: "1990-01-01",
      residencePrefecture: "JP-13",
    };
    const plan = completeCalculatedSelfPlan();
    plan.id = "identity-snapshot";
    state.takeHomePlans.push(plan);
    const store = new Store(state);
    store.dispatch({
      type: "update-member-profile",
      memberId: "self",
      birthDate: "1950-01-01",
      residencePrefecture: "JP-47",
    });
    const retained = store
      .getState()
      .takeHomePlans.find((item) => item.id === plan.id);
    expect(retained).toMatchObject({
      birthDate: "1990-01-01",
      residencePrefecture: "JP-13",
    });
  });

  it.each([
    [
      "incomplete",
      (plan: ReturnType<typeof completeCalculatedSelfPlan>) => {
        plan.residentTax.mode = "unsupported-uncomputed";
        plan.residentTax.annualResidentTaxYen = null;
        plan.residentTax.zeroYenConfirmed = false;
      },
    ],
    [
      "unsupported",
      (plan: ReturnType<typeof completeCalculatedSelfPlan>) => {
        plan.socialInsurance.mode = "unsupported-uncomputed";
      },
    ],
    [
      "missing-rule",
      (plan: ReturnType<typeof completeCalculatedSelfPlan>) => {
        plan.targetYear = 2027;
        plan.residentTax.assessmentYear = 2028;
      },
    ],
  ])(
    "persists a linked plan transition to %s as unresolved without zero conversion",
    (expectedStatus, mutate) => {
      const storage = new BytesStorage();
      const repository = new StorageRepository(storage);
      const state = linkedCalculatedState();
      repository.save(state);
      const writer = { save: vi.fn((next: AppState) => repository.save(next)) };
      const listener = vi.fn();
      const store = new Store(state, writer);
      store.subscribe(listener);
      const plan = structuredClone(completeCalculatedSelfPlan());
      const member = state.members[0];
      if (!member) throw new Error("self member is missing");
      mutate(plan);
      store.dispatch({
        type: "update-take-home-plan",
        planId: plan.id,
        plan,
      });
      expect(writer.save).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(calculateTakeHome(plan, member).status).toBe(expectedStatus);
      expect(
        resolveIncomeTarget(store.getState(), "budget-income-self"),
      ).toEqual({
        status: "broken-link",
        warning: `uncomputed-link:${expectedStatus}:take-home-self`,
        sourceId: "take-home-self",
      });
      expect(calculateBudgetSummary(store.getState())).toMatchObject({
        householdIncomeYen: null,
        self: { incomeYen: null, unresolvedIncome: true },
      });
      const reloaded = repository.load();
      if (!reloaded) throw new Error("reloaded state is missing");
      expect(resolveIncomeTarget(reloaded, "budget-income-self").status).toBe(
        "broken-link",
      );
      const prepared = repository.prepareImport(JSON.stringify(reloaded));
      expect(
        resolveIncomeTarget(prepared.preview, "budget-income-self").status,
      ).toBe("broken-link");
      const committed = repository.commitImport(prepared);
      expect(resolveIncomeTarget(committed, "budget-income-self").status).toBe(
        "broken-link",
      );
      expect(
        resolveIncomeTarget(
          repository.load() ?? committed,
          "budget-income-self",
        ).status,
      ).toBe("broken-link");
    },
  );

  it.each([
    ["65", "1961-06-02", "第1号介護保険料"],
    ["70", "1956-01-02", "介護保険第1号被保険者"],
    ["75", "1951-06-02", "後期高齢者医療保険料"],
  ])(
    "keeps a linked age-%s transition unresolved through save, reload, and import",
    (_age, birthDate, reason) => {
      const storage = new BytesStorage();
      const repository = new StorageRepository(storage);
      const state = linkedCalculatedState();
      const initial = state.takeHomePlans[0];
      if (!initial || initial.mode !== "calculated")
        throw new Error("initial plan is missing");
      initial.socialInsurance.mode = "kyokai-auto";
      initial.socialInsurance.standardRemunerationMode =
        "estimate-from-remuneration";
      initial.socialInsurance.employerPrefecture = "JP-13";
      initial.socialInsurance.monthlyRemunerationYen = 300_000;
      initial.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
        { length: 12 },
        () => 500_000,
      );
      repository.save(state);
      const writer = { save: vi.fn((next: AppState) => repository.save(next)) };
      const listener = vi.fn();
      const store = new Store(state, writer);
      store.subscribe(listener);
      const updated = structuredClone(initial);
      updated.birthDate = birthDate;
      store.dispatch({
        type: "update-take-home-plan",
        planId: updated.id,
        plan: updated,
      });
      const member = store.getState().members[0];
      if (!member) throw new Error("member is missing");
      expect(calculateTakeHome(updated, member)).toMatchObject({
        status: "unsupported",
        annualTakeHomeYen: null,
        averageMonthlyTakeHomeYen: null,
        unsupportedConditions: [expect.stringContaining(reason)],
      });
      expect(writer.save).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(
        resolveIncomeTarget(store.getState(), "budget-income-self").status,
      ).toBe("broken-link");
      expect(calculateBudgetSummary(store.getState())).toMatchObject({
        householdIncomeYen: null,
        self: { incomeYen: null, unresolvedIncome: true },
      });
      const reloaded = repository.load();
      if (!reloaded) throw new Error("reloaded state is missing");
      expect(resolveIncomeTarget(reloaded, "budget-income-self").status).toBe(
        "broken-link",
      );
      const imported = repository.prepareImport(
        JSON.stringify(reloaded),
      ).preview;
      expect(resolveIncomeTarget(imported, "budget-income-self").status).toBe(
        "broken-link",
      );
    },
  );

  it("allows a safe negative take-home result instead of treating it as overflow", () => {
    const plan = createCalculatedTakeHomePlan({
      id: "negative",
      memberId: "self",
    });
    plan.compensation.annualTaxableSalaryYen = 100_000;
    plan.socialInsurance.mode = "manual";
    plan.socialInsurance.standardRemunerationMode = "manual-total";
    plan.socialInsurance.manual = {
      annualHealthInsuranceYen: 200_000,
      annualCareInsuranceYen: 0,
      annualAdditionalInsuranceYen: 0,
      annualPensionYen: 0,
      annualEmploymentInsuranceYen: 0,
      annualOtherStatutoryDeductionYen: 0,
    };
    plan.residentTax.mode = "manual-annual";
    plan.residentTax.annualResidentTaxYen = 0;
    plan.residentTax.zeroYenConfirmed = true;
    const member = createFixtureState().members[0];
    if (!member) throw new Error("fixture member is missing");
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("complete");
    expect(result.annualTakeHomeYen).toBe(-100_000);
  });

  it("rejects two active calculated plans for the same member and year", () => {
    const state = createFixtureState();
    state.takeHomePlans.push(
      createCalculatedTakeHomePlan({ id: "first", memberId: "self" }),
    );
    const store = new Store(state);
    expect(() =>
      store.dispatch({
        type: "add-take-home-plan",
        plan: createCalculatedTakeHomePlan({ id: "second", memberId: "self" }),
      }),
    ).toThrow("only one active calculated plan");
  });

  it("requires an explicit unlink before deleting a linked plan", () => {
    const state = createFixtureState();
    const plan = createCalculatedTakeHomePlan({
      id: "partner-calculated",
      memberId: "partner",
    });
    plan.compensation.annualTaxableSalaryYen = 1_000_000;
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
    state.takeHomePlans.push(plan);
    state.links.push({
      id: "partner-calculated-link",
      targetId: "budget-income-partner",
      sourceType: "take-home-result",
      sourceId: plan.id,
      field: "averageMonthlyTakeHomeYen",
      active: true,
    });
    const writer = { save: vi.fn() };
    const store = new Store(state, writer);
    expect(() =>
      store.dispatch({ type: "delete-take-home-plan", planId: plan.id }),
    ).toThrow("must be unlinked");
    expect(writer.save).not.toHaveBeenCalled();
  });
});
