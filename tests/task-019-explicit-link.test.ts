import { describe, expect, it } from "vitest";
import { Store } from "../src/app/store";
import { createInitialState, type AppState } from "../src/domain/state";
import { resolveIncomeTarget } from "../src/domain/linked-value";
import {
  createTakeHomePreviewPersistenceAction,
  resolveCurrentTakeHomeContext,
} from "../src/domain/take-home-current-context";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";

const REFERENCE_DATE = "2026-08-25";

function payroll(overrides: Partial<AppState["payrollPlans"][number]> = {}) {
  return {
    id: "payroll-self-2026",
    memberId: "member-self",
    targetYear: 2026,
    active: true,
    baseMonthlyYen: 300_000,
    taxableAllowanceMonthlyYen: 0,
    averageMonthlyOvertimeMinutes: 0,
    scheduledMonthlyMinutes: 10_000,
    overtimeRateBasisPoints: 12_500,
    monthlyNonTaxableCommutingYen: 10_000,
    commutingFuelEstimate: {
      averageWorkdaysPerMonthTenths: null,
      roundTripDistanceKmTenths: null,
      fuelEfficiencyKmPerLiterTenths: null,
      gasolinePriceYenPerLiter: null,
    },
    commutingAllowanceMode: "legacy-monthly" as const,
    nonTaxableCommutingAllowanceYenPerWorkday: 800,
    bonuses: [],
    ...overrides,
  };
}

function stateWithSelfPayroll(): AppState {
  const state = createInitialState();
  const self = state.members.find((member) => member.role === "self");
  if (!self) throw new Error("self is missing");
  self.birthDate = "1990-01-01";
  self.residencePrefecture = "JP-13";
  state.payrollPlans = [payroll()];
  return state;
}

function addExplicitSelfLink(store: Store, sourceId: string): void {
  store.dispatch({
    type: "set-budget-income-policy",
    targetId: "budget-income-self",
    mode: "legacy",
  });
  store.dispatch({
    type: "add-link",
    referenceDate: REFERENCE_DATE,
    link: {
      id: "explicit-self-income-link",
      targetId: "budget-income-self",
      sourceType: "take-home-result",
      sourceId,
      field: "averageMonthlyTakeHomeYen",
      active: true,
    },
  });
}

describe("TASK-019 explicit Budget income links", () => {
  it("links an estimate-dependent unsupported resident-tax plan via the current context", () => {
    const state = stateWithSelfPayroll();
    const preview = resolveCurrentTakeHomeContext(state, REFERENCE_DATE);
    expect(preview.status).toBe("transient-preview");
    if (preview.status !== "transient-preview") return;
    const store = new Store(state);
    store.dispatch(createTakeHomePreviewPersistenceAction(preview));

    // The persisted preview intentionally retains unsupported-uncomputed
    // resident tax; the current-context resolver supplies the estimate.
    const saved = store.getState().takeHomePlans[0];
    if (!saved || saved.mode !== "calculated")
      throw new Error("saved calculated plan is missing");
    expect(saved.residentTax.mode).toBe("unsupported-uncomputed");
    const context = resolveCurrentTakeHomeContext(
      store.getState(),
      REFERENCE_DATE,
    );
    expect(context.status).toBe("persisted");
    if (context.status !== "persisted") return;
    expect(context.result.status).toBe("complete");

    addExplicitSelfLink(store, saved.id);
    expect(
      resolveIncomeTarget(
        store.getState(),
        "budget-income-self",
        REFERENCE_DATE,
      ),
    ).toEqual({
      status: "selected",
      valueYen: context.result.averageMonthlyTakeHomeYen,
      sourceId: saved.id,
    });
  });

  it("applies the same current-context validation through link-budget-income-to-take-home-plan", () => {
    const state = stateWithSelfPayroll();
    const preview = resolveCurrentTakeHomeContext(state, REFERENCE_DATE);
    if (preview.status !== "transient-preview")
      throw new Error("preview is unavailable");
    const store = new Store(state);
    store.dispatch(createTakeHomePreviewPersistenceAction(preview));
    store.dispatch({
      type: "set-budget-income-policy",
      targetId: "budget-income-self",
      mode: "legacy",
    });
    store.dispatch({
      type: "link-budget-income-to-take-home-plan",
      referenceDate: REFERENCE_DATE,
      link: {
        id: "link-budget-self-current-context",
        targetId: "budget-income-self",
        sourceType: "take-home-result",
        sourceId: preview.plan.id,
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
    });
    expect(
      resolveIncomeTarget(
        store.getState(),
        "budget-income-self",
        REFERENCE_DATE,
      ).status,
    ).toBe("selected");
  });

  it("uses the estimate after resident-tax manual mode is turned off, then permits unlink/deactivate/delete", () => {
    const state = stateWithSelfPayroll();
    const preview = resolveCurrentTakeHomeContext(state, REFERENCE_DATE);
    if (preview.status !== "transient-preview")
      throw new Error("preview is unavailable");
    const plan = structuredClone(preview.plan);
    plan.residentTax = {
      ...plan.residentTax,
      mode: "manual-annual",
      assessmentYear: 2026,
      annualResidentTaxYen: 1,
      zeroYenConfirmed: false,
    };
    const store = new Store(state);
    store.dispatch({
      type: "add-take-home-plan-with-payroll-binding",
      plan,
      payrollPlanId: preview.payrollPlanId,
    });
    addExplicitSelfLink(store, plan.id);

    const manual = resolveCurrentTakeHomeContext(
      store.getState(),
      REFERENCE_DATE,
    );
    expect(manual.status).toBe("persisted");
    if (manual.status !== "persisted") return;
    expect(manual.result.residentTaxYen).toBe(1);

    store.dispatch({
      type: "update-take-home-plan",
      planId: plan.id,
      plan: {
        ...plan,
        residentTax: {
          ...plan.residentTax,
          mode: "unsupported-uncomputed",
          annualResidentTaxYen: null,
          zeroYenConfirmed: false,
        },
      },
    });
    const estimated = resolveCurrentTakeHomeContext(
      store.getState(),
      REFERENCE_DATE,
    );
    expect(estimated.status).toBe("persisted");
    if (estimated.status !== "persisted") return;
    expect(estimated.result.status).toBe("complete");
    expect(estimated.provenance.residentTax).toBe("current-year-estimate");

    const current = estimated.result.averageMonthlyTakeHomeYen;
    if (current === null) throw new Error("estimated average is missing");
    store.dispatch({
      type: "unlink-income",
      targetId: "budget-income-self",
      manualYen: current,
      referenceDate: REFERENCE_DATE,
    });
    expect(
      resolveIncomeTarget(
        store.getState(),
        "budget-income-self",
        REFERENCE_DATE,
      ),
    ).toEqual({ status: "manual", valueYen: current });
    expect(
      store
        .getState()
        .links.find((link) => link.targetId === "budget-income-self")?.active,
    ).toBe(false);

    store.dispatch({
      type: "set-take-home-plan-active",
      planId: plan.id,
      active: false,
    });
    store.dispatch({
      type: "set-take-home-compensation-binding",
      takeHomePlanId: plan.id,
      payrollPlanId: null,
    });
    store.dispatch({ type: "delete-take-home-plan", planId: plan.id });
    expect(store.getState().takeHomePlans).toHaveLength(0);
  });

  it("keeps stale-year manual resident tax out of Budget and uses the same context average", () => {
    const state = stateWithSelfPayroll();
    const preview = resolveCurrentTakeHomeContext(state, REFERENCE_DATE);
    if (preview.status !== "transient-preview")
      throw new Error("preview is unavailable");
    const plan = structuredClone(preview.plan);
    plan.residentTax = {
      ...plan.residentTax,
      mode: "manual-annual",
      assessmentYear: 2025,
      annualResidentTaxYen: 999_999,
      zeroYenConfirmed: false,
    };
    const store = new Store(state);
    store.dispatch({
      type: "add-take-home-plan-with-payroll-binding",
      plan,
      payrollPlanId: preview.payrollPlanId,
    });
    addExplicitSelfLink(store, plan.id);
    const context = resolveCurrentTakeHomeContext(
      store.getState(),
      REFERENCE_DATE,
    );
    expect(context.status).toBe("persisted");
    if (context.status !== "persisted") return;
    expect(context.result.residentTaxYen).not.toBe(999_999);
    const linked = resolveIncomeTarget(
      store.getState(),
      "budget-income-self",
      REFERENCE_DATE,
    );
    expect(linked).toMatchObject({
      status: "selected",
      sourceId: plan.id,
      valueYen: context.result.averageMonthlyTakeHomeYen,
    });
  });

  it("keeps the existing strict partner path linkable", () => {
    const state = createInitialState();
    const partner = state.members.find((member) => member.role === "partner");
    if (!partner) throw new Error("partner is missing");
    partner.active = true;
    partner.birthDate = "1990-01-01";
    partner.residencePrefecture = "JP-13";
    const plan = createCalculatedTakeHomePlan({
      id: "partner-strict-plan",
      memberId: partner.id,
      targetYear: 2026,
      birthDate: partner.birthDate,
      residencePrefecture: "JP-13",
    });
    plan.inputMode = "monthly";
    plan.compensation.monthlyTaxableSalaryYen = 300_000;
    plan.compensation.monthlyNonTaxableCommutingYen = 10_000;
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 310_000;
    plan.residentTax = {
      mode: "manual-annual",
      assessmentYear: 2026,
      annualResidentTaxYen: 100_000,
      zeroYenConfirmed: false,
      municipalityNote: "test",
    };
    state.takeHomePlans = [plan];
    const store = new Store(state);
    store.dispatch({
      type: "set-budget-income-policy",
      targetId: "budget-income-partner",
      mode: "legacy",
    });
    store.dispatch({
      type: "add-link",
      referenceDate: REFERENCE_DATE,
      link: {
        id: "explicit-partner-income-link",
        targetId: "budget-income-partner",
        sourceType: "take-home-result",
        sourceId: plan.id,
        field: "averageMonthlyTakeHomeYen",
        active: true,
      },
    });
    expect(
      resolveIncomeTarget(
        store.getState(),
        "budget-income-partner",
        REFERENCE_DATE,
      ).status,
    ).toBe("selected");
  });

  it("keeps the legacy-manual path on its existing strict value", () => {
    const state = createInitialState();
    state.takeHomePlans = [
      {
        id: "legacy-self-plan",
        memberId: "member-self",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 234_567,
        active: true,
      },
    ];
    const store = new Store(state);
    addExplicitSelfLink(store, "legacy-self-plan");
    expect(
      resolveIncomeTarget(
        store.getState(),
        "budget-income-self",
        REFERENCE_DATE,
      ),
    ).toEqual({
      status: "selected",
      valueYen: 234_567,
      sourceId: "legacy-self-plan",
    });
  });

  it("keeps an out-of-current-year calculated source on strict unsupported semantics", () => {
    const state = stateWithSelfPayroll();
    const plan = createCalculatedTakeHomePlan({
      id: "self-out-of-current-year-plan",
      memberId: "member-self",
      targetYear: 2027,
      birthDate: "1990-01-01",
      residencePrefecture: "JP-13",
    });
    plan.compensation.annualTaxableSalaryYen = 3_600_000;
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.residentTax = {
      mode: "manual-annual",
      assessmentYear: 2027,
      annualResidentTaxYen: 100_000,
      zeroYenConfirmed: false,
      municipalityNote: "test",
    };
    state.takeHomePlans = [plan];
    const store = new Store(state);
    expect(() => addExplicitSelfLink(store, plan.id)).toThrow(
      "only a complete take-home result can be linked",
    );
    expect(store.getState().links).toHaveLength(0);
  });
});
