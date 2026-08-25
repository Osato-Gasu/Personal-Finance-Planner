import { describe, expect, it } from "vitest";
import { Store } from "../src/app/store";
import { createInitialState, type AppState } from "../src/domain/state";
import { resolveIncomeTarget } from "../src/domain/linked-value";
import { selectOverview } from "../src/domain/overview";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import {
  createTakeHomePreviewPersistenceAction,
  estimateCurrentYearResidentTaxYen,
  resolveCurrentTakeHomeContext,
} from "../src/domain/take-home-current-context";

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
    bonuses: [
      {
        id: "bonus-2026",
        paymentDate: "2026-06-30",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ],
    ...overrides,
  };
}

function stateWithPayroll(): AppState {
  const state = createInitialState();
  const self = state.members[0];
  if (!self) throw new Error("fixture self is missing");
  self.birthDate = "1990-01-01";
  self.residencePrefecture = "JP-13";
  state.payrollPlans = [payroll()];
  return state;
}

describe("TASK-019 current Take-home domain", () => {
  it("resolves a Payroll-backed current-year preview without writing state", () => {
    const state = stateWithPayroll();
    const before = JSON.stringify(state);
    const resolution = resolveCurrentTakeHomeContext(state, "2026-08-25");

    expect(resolution.status).toBe("transient-preview");
    if (resolution.status !== "transient-preview") return;
    expect(resolution.provenance.salary).toBe("payroll-statutory");
    expect(resolution.provenance.employment).toBe("assumed");
    expect(resolution.plan.compensation.annualTaxableSalaryYen).toBe(3_700_000);
    expect(resolution.plan.compensation.annualNonTaxableCommutingYen).toBe(
      120_000,
    );
    expect(resolution.result.status).toBe("complete");
    expect(resolution.result.warnings.join(" ")).toContain(
      "前年データがないため",
    );
    expect(JSON.stringify(state)).toBe(before);
  });

  it("fails closed for unsupported reference years before preview creation", () => {
    const state = stateWithPayroll();
    const resolution = resolveCurrentTakeHomeContext(state, "2027-01-01");
    expect(resolution.status).toBe("unsupported-year");
    expect(resolution.plan).toBeNull();
    expect(state.takeHomePlans).toHaveLength(0);
    expect(state.takeHomeCompensationBindings).toHaveLength(0);
  });

  it("requires one unique current-year Payroll source without guessing or writing", () => {
    const missing = stateWithPayroll();
    missing.payrollPlans = [];
    const missingBefore = JSON.stringify(missing);
    expect(resolveCurrentTakeHomeContext(missing, "2026-08-25").status).toBe(
      "blocked",
    );
    expect(JSON.stringify(missing)).toBe(missingBefore);

    const multiple = stateWithPayroll();
    multiple.payrollPlans.push(payroll({ id: "payroll-self-2026-b" }));
    const multipleBefore = JSON.stringify(multiple);
    expect(resolveCurrentTakeHomeContext(multiple, "2026-08-25").status).toBe(
      "integrity-error",
    );
    expect(JSON.stringify(multiple)).toBe(multipleBefore);
  });

  it("keeps repeated previews and Payroll practical inputs out of persisted/statutory state", () => {
    const state = stateWithPayroll();
    const before = JSON.stringify(state);
    const first = resolveCurrentTakeHomeContext(state, "2026-08-25");
    const annualTakeHome = first.result?.annualTakeHomeYen;
    const source = state.payrollPlans[0];
    if (!source) throw new Error("fixture payroll is missing");
    source.commutingFuelEstimate = {
      averageWorkdaysPerMonthTenths: 200,
      roundTripDistanceKmTenths: 400,
      fuelEfficiencyKmPerLiterTenths: 100,
      gasolinePriceYenPerLiter: 200,
    };
    const second = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(second.result?.annualTakeHomeYen).toBe(annualTakeHome);
    expect(state.takeHomePlans).toHaveLength(0);
    expect(state.takeHomeCompensationBindings).toHaveLength(0);
    expect(JSON.parse(before)).toMatchObject({
      takeHomePlans: [],
      takeHomeCompensationBindings: [],
    });
  });

  it("keeps a current-year explicit unbound plan direct across repeated resolution", () => {
    const state = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(state, "2026-08-25");
    if (preview.status !== "transient-preview")
      throw new Error("fixture preview is unavailable");
    state.takeHomePlans = [structuredClone(preview.plan)];
    const before = JSON.stringify(state);
    for (let count = 0; count < 2; count += 1) {
      const resolution = resolveCurrentTakeHomeContext(state, "2026-08-25");
      expect(resolution.status).toBe("persisted");
      if (resolution.status === "persisted")
        expect(resolution.source).toBe("direct");
    }
    expect(state.takeHomeCompensationBindings).toHaveLength(0);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("does not repair stale bindings or replace disabled current-year plans", () => {
    const stale = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(stale, "2026-08-25");
    if (preview.status !== "transient-preview")
      throw new Error("fixture preview is unavailable");
    stale.takeHomePlans = [structuredClone(preview.plan)];
    stale.takeHomeCompensationBindings = [
      {
        takeHomePlanId: preview.plan.id,
        payrollPlanId: "missing-payroll",
        active: true,
      },
    ];
    const staleBefore = JSON.stringify(stale);
    expect(resolveCurrentTakeHomeContext(stale, "2026-08-25").status).toBe(
      "blocked",
    );
    expect(JSON.stringify(stale)).toBe(staleBefore);

    const disabled = stateWithPayroll();
    const disabledPlan = structuredClone(preview.plan);
    disabledPlan.active = false;
    disabled.takeHomePlans = [disabledPlan];
    const disabledBefore = JSON.stringify(disabled);
    expect(resolveCurrentTakeHomeContext(disabled, "2026-08-25").status).toBe(
      "disabled",
    );
    expect(JSON.stringify(disabled)).toBe(disabledBefore);
  });

  it("keeps preview employment and residence fallbacks transient and visible", () => {
    const state = stateWithPayroll();
    const resolution = resolveCurrentTakeHomeContext(state, "2026-08-25");
    if (resolution.status !== "transient-preview")
      throw new Error("fixture preview is unavailable");
    expect(resolution.plan.employment).toMatchObject({
      oneEmployerFullYearConfirmed: true,
      salaryIncomeOnlyConfirmed: true,
      employmentInsuranceCategory: "general",
    });
    expect(resolution.plan.socialInsurance.employerPrefecture).toBeNull();
    expect(resolution.result.socialInsuranceBasis.employerPrefecture).toBe(
      "JP-13",
    );
    expect(resolution.provenance.employerPrefecture).toBe(
      "member-residence-estimate",
    );
    expect(resolution.provenance.assumptions.join(" ")).toContain(
      "雇用保険事業区分は「一般」を仮定",
    );
    expect(resolution.result.warnings.join(" ")).toContain("保存されません");
    expect(state.takeHomePlans).toHaveLength(0);

    const explicit = resolveCurrentTakeHomeContext(state, "2026-08-25", {
      transientEmployerPrefecture: "JP-13",
    });
    expect(explicit.status).toBe("transient-preview");
    if (explicit.status === "transient-preview") {
      expect(explicit.plan.socialInsurance.employerPrefecture).toBe("JP-13");
      expect(explicit.provenance.employerPrefecture).toBe("transient-explicit");
    }
    expect(state.takeHomePlans).toHaveLength(0);
  });

  it("uses the current-year manual resident tax only when its year matches", () => {
    expect(
      estimateCurrentYearResidentTaxYen({
        annualTaxableSalaryYen: 4_000_000,
        annualSocialInsuranceYen: 600_000,
        annualIdecoContributionYen: 120_000,
      }),
    ).toBe(161_000);
  });

  it("persists the first preview as one plan-plus-binding transition", () => {
    const state = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(preview.status).toBe("transient-preview");
    if (preview.status !== "transient-preview") return;
    const store = new Store(state);
    store.dispatch(createTakeHomePreviewPersistenceAction(preview));
    expect(store.getState().takeHomePlans).toHaveLength(1);
    expect(store.getState().takeHomeCompensationBindings).toEqual([
      {
        takeHomePlanId: preview.plan.id,
        payrollPlanId: "payroll-self-2026",
        active: true,
      },
    ]);
    expect(
      resolveIncomeTarget(store.getState(), "budget-income-self", "2026-08-25"),
    ).toMatchObject({
      status: "selected",
      sourceId: preview.plan.id,
      valueYen: preview.result.averageMonthlyTakeHomeYen,
    });
    expect(
      selectOverview(store.getState(), "2026-08-25").members.find(
        (member) => member.role === "self",
      )?.takeHomeMonthlyYen,
    ).toBe(preview.result.averageMonthlyTakeHomeYen);
  });

  it("applies only a matching resident-tax manual year and preserves false conditions", () => {
    const state = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(preview.status).toBe("transient-preview");
    if (preview.status !== "transient-preview") return;
    const plan = structuredClone(preview.plan);
    plan.residentTax = {
      ...plan.residentTax,
      mode: "manual-annual",
      assessmentYear: 2026,
      annualResidentTaxYen: 123_456,
      zeroYenConfirmed: false,
    };
    state.takeHomePlans = [plan];
    state.takeHomeCompensationBindings = [
      {
        takeHomePlanId: plan.id,
        payrollPlanId: preview.payrollPlanId,
        active: true,
      },
    ];
    const manual = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(manual.status).toBe("persisted");
    if (manual.status !== "persisted") return;
    expect(manual.result.residentTaxYen).toBe(123_456);
    expect(manual.provenance.residentTax).toBe("current-year-manual");

    plan.residentTax.assessmentYear = 2025;
    const staleManualBytes = JSON.stringify(plan.residentTax);
    const stale = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(stale.status).toBe("persisted");
    if (stale.status !== "persisted") return;
    expect(stale.result.residentTaxYen).not.toBe(123_456);
    expect(stale.provenance.residentTax).toBe("stale-manual-estimate");
    expect(stale.result.warnings.join(" ")).toContain(
      "現在の給与・社会保険・iDeCo",
    );
    expect(stale.result.warnings.join(" ")).toContain("その他所得控除");
    expect(JSON.stringify(plan.residentTax)).toBe(staleManualBytes);
  });

  it("preserves existing false employment conditions instead of estimate-overriding them", () => {
    const state = stateWithPayroll();
    const plan = createCalculatedTakeHomePlan({
      id: "direct-false-plan",
      memberId: "member-self",
      targetYear: 2026,
      birthDate: "1990-01-01",
      residencePrefecture: "JP-13",
    });
    plan.compensation.annualTaxableSalaryYen = 4_000_000;
    plan.employment.oneEmployerFullYearConfirmed = false;
    plan.employment.salaryIncomeOnlyConfirmed = false;
    state.takeHomePlans = [plan];
    const resolution = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(resolution.status).toBe("persisted");
    expect(resolution.result?.status).toBe("unsupported");
    expect(plan.employment.oneEmployerFullYearConfirmed).toBe(false);
    expect(plan.employment.salaryIncomeOnlyConfirmed).toBe(false);
  });

  it("keeps active legacy manual authority and bytes instead of replacing it", () => {
    const state = stateWithPayroll();
    state.takeHomePlans = [
      {
        id: "legacy-self",
        memberId: "member-self",
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 234_567,
        active: true,
      },
    ];
    const before = JSON.stringify(state);
    const resolution = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(resolution.status).toBe("persisted");
    if (resolution.status === "persisted") {
      expect(resolution.source).toBe("direct");
      expect(resolution.result.averageMonthlyTakeHomeYen).toBe(234_567);
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rejects unsafe resident-tax inputs and keeps the annualized bonus average exact", () => {
    expect(() =>
      estimateCurrentYearResidentTaxYen({
        annualTaxableSalaryYen: Number.MAX_SAFE_INTEGER + 1,
        annualSocialInsuranceYen: 0,
        annualIdecoContributionYen: 0,
      }),
    ).toThrow("non-negative safe integer");

    const state = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(state, "2026-08-25");
    if (preview.status !== "transient-preview")
      throw new Error("fixture preview is unavailable");
    expect(preview.result.annualTakeHomeYen).not.toBeNull();
    expect(preview.result.averageMonthlyTakeHomeYen).toBe(
      Math.floor((preview.result.annualTakeHomeYen ?? 0) / 12),
    );
  });

  it("does not publish either side when atomic preview persistence fails", () => {
    const state = stateWithPayroll();
    const preview = resolveCurrentTakeHomeContext(state, "2026-08-25");
    expect(preview.status).toBe("transient-preview");
    if (preview.status !== "transient-preview") return;
    const store = new Store(state, {
      save: () => {
        throw new Error("storage failed");
      },
    });
    expect(() =>
      store.dispatch(createTakeHomePreviewPersistenceAction(preview)),
    ).toThrow("storage failed");
    expect(store.getState().takeHomePlans).toHaveLength(0);
    expect(store.getState().takeHomeCompensationBindings).toHaveLength(0);
  });
});
