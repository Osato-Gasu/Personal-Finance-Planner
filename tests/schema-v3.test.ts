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
import { calculateTakeHome } from "../src/domain/take-home-calculator";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import type { SchemaVersion2AppState } from "../src/domain/state";
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

describe("schema version 3 migration and storage", () => {
  it("migrates v2 values without changing source and link IDs", () => {
    const previous = v2Fixture();
    const migrated = migrateToCurrentState(previous);
    expect(migrated.schemaVersion).toBe(3);
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
    expect(new StorageRepository(storage).load()?.schemaVersion).toBe(3);
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBe(v2Bytes);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("keeps v1 bytes while migrating directly to v3", () => {
    const storage = new BytesStorage();
    const v1 = { ...v2Fixture(), schemaVersion: 1, livingExpenses: [] };
    const v1Bytes = JSON.stringify(v1);
    storage.values.set(LEGACY_STORAGE_KEY, v1Bytes);
    expect(new StorageRepository(storage).load()?.schemaVersion).toBe(3);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(v1Bytes);
  });

  it("imports v1, v2, and v3 as v3 previews", () => {
    const repository = new StorageRepository(new BytesStorage());
    const v2 = v2Fixture();
    const v1 = { ...v2, schemaVersion: 1, livingExpenses: [] };
    expect(
      repository.prepareImport(JSON.stringify(v1)).preview.schemaVersion,
    ).toBe(3);
    expect(
      repository.prepareImport(JSON.stringify(v2)).preview.schemaVersion,
    ).toBe(3);
    expect(
      repository.prepareImport(JSON.stringify(createFixtureState())).preview
        .schemaVersion,
    ).toBe(3);
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
