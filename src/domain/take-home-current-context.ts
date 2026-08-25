import type { AppAction, AppState, HouseholdMember } from "./state";
import type {
  CalculatedTakeHomePlan,
  TakeHomePlan,
  TakeHomeResult,
} from "./take-home-plan";
import { createCalculatedTakeHomePlan } from "./take-home-plan";
import type { PrefectureCode } from "../rules/jp/take-home/social-insurance/rules-2026";
import { calculateTakeHomeFromState } from "./take-home-linked-calculator";
import {
  createUnavailableTakeHomeResult,
  salaryIncomeYen2026,
} from "./take-home-calculator";
import { calculateIdecoPlan } from "./ideco";
import { calculatePayroll } from "./payroll";
import { isTakeHomeSupportedYear } from "./take-home-support";

/**
 * Provenance for the values used by the current Take-home context.  The
 * resolver intentionally keeps this separate from persisted plan data so a
 * render-time estimate cannot be mistaken for a user-confirmed setting.
 */
export interface TakeHomeEstimateProvenance {
  salary: "payroll-statutory" | "persisted-direct" | "none";
  employment: "persisted" | "assumed" | "none";
  employerPrefecture:
    "persisted" | "transient-explicit" | "member-residence-estimate" | "none";
  residentTax:
    | "current-year-manual"
    | "current-year-estimate"
    | "stale-manual-estimate"
    | "none";
  assumptions: readonly string[];
  warnings: readonly string[];
}

export type CurrentTakeHomeContextResolution =
  | {
      status: "transient-preview";
      currentYear: number;
      member: Readonly<HouseholdMember>;
      payrollPlanId: string;
      plan: CalculatedTakeHomePlan;
      result: TakeHomeResult;
      provenance: TakeHomeEstimateProvenance;
    }
  | {
      status: "persisted";
      currentYear: number;
      member: Readonly<HouseholdMember>;
      plan: TakeHomePlan;
      result: TakeHomeResult;
      source: "payroll-linked" | "direct";
      provenance: TakeHomeEstimateProvenance;
    }
  | {
      status: "disabled" | "integrity-error" | "blocked" | "unsupported-year";
      currentYear: number | null;
      member: Readonly<HouseholdMember> | null;
      plan: TakeHomePlan | null;
      result: TakeHomeResult | null;
      message: string;
      provenance: TakeHomeEstimateProvenance;
    };

const EMPTY_PROVENANCE: TakeHomeEstimateProvenance = {
  salary: "none",
  employment: "none",
  employerPrefecture: "none",
  residentTax: "none",
  assumptions: [],
  warnings: [],
};

function currentYearFromReferenceDate(
  referenceDate: string | null,
): number | null {
  if (!referenceDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(referenceDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isSafeInteger(year) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return year;
}

function prefectureCode(value: string | undefined): PrefectureCode | null {
  if (!value || !/^JP-(?:0[1-9]|[1-3]\d|4[0-7])$/.test(value)) return null;
  return value as PrefectureCode;
}

function residentTaxFallbackWarning(
  currentYear: number,
  hasOtherIncomeDeductions: boolean,
): string {
  const suffix = hasOtherIncomeDeductions
    ? "その他所得控除は住民税概算へ自動反映していません。"
    : "その他所得控除は未反映です。";
  return `${String(currentYear)}年に支払う住民税を概算しています。前年データがないため、現在の給与・社会保険・iDeCoを前年相当として代用しています。均等割等・税額控除・扶養等は未反映です。${suffix}`;
}

/**
 * Calculate the bounded current-year cash-flow resident-tax estimate defined
 * by TASK-019.  The input salary/social/iDeCo values are current-year
 * proxies; this is deliberately not an exact municipal tax engine.
 */
export function estimateCurrentYearResidentTaxYen(options: {
  annualTaxableSalaryYen: number;
  annualSocialInsuranceYen: number;
  annualIdecoContributionYen: number;
}): number {
  for (const [field, value] of Object.entries(options)) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(`${field} must be a non-negative safe integer`);
  }
  const salaryIncome = salaryIncomeForResidentTax(
    options.annualTaxableSalaryYen,
  );
  const taxableBase = Math.max(
    0,
    salaryIncome -
      options.annualSocialInsuranceYen -
      options.annualIdecoContributionYen -
      430_000,
  );
  return Math.floor(taxableBase / 1_000) * 100;
}

function salaryIncomeForResidentTax(annualTaxableSalaryYen: number): number {
  return salaryIncomeYen2026(annualTaxableSalaryYen);
}

function linkedIdecoContribution(
  state: Readonly<AppState>,
  plan: Readonly<CalculatedTakeHomePlan>,
  member: Readonly<HouseholdMember>,
  referenceDate: string | null,
): number {
  if (plan.deductions.idecoContributionMode !== "linked")
    return plan.deductions.annualIdecoContributionYen;
  const linked = state.idecoPlans.find(
    (candidate) => candidate.id === plan.deductions.linkedIdecoPlanId,
  );
  if (!linked || linked.memberId !== plan.memberId || !linked.active) return 0;
  const scenario = state.investmentScenarios.find(
    (candidate) => candidate.id === linked.activeScenarioId,
  );
  const result = calculateIdecoPlan(linked, scenario, member, {
    taxYear: plan.targetYear,
    referenceDate,
  });
  return result.status === "complete"
    ? (result.annualPaidContributionYen ?? 0)
    : 0;
}

function calculatePlanWithResidentTaxEstimate(
  state: Readonly<AppState>,
  plan: Readonly<CalculatedTakeHomePlan>,
  member: Readonly<HouseholdMember>,
  referenceDate: string | null,
  currentYear: number,
  allowTransientAssumptions: boolean,
): {
  result: TakeHomeResult;
  plan: CalculatedTakeHomePlan;
  provenance: TakeHomeEstimateProvenance;
} {
  const workingPlan = structuredClone(plan) as CalculatedTakeHomePlan;
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (member.birthDate) {
    if (workingPlan.birthDate !== member.birthDate)
      warnings.push("生年月日はプロフィールから参照しています。");
    workingPlan.birthDate = member.birthDate;
  } else if (workingPlan.birthDate) {
    warnings.push("生年月日は保存済み計算プランから参照しています。");
  }

  let employerPrefecture = prefectureCode(
    workingPlan.socialInsurance.employerPrefecture ?? undefined,
  );
  if (!employerPrefecture) {
    employerPrefecture = prefectureCode(member.residencePrefecture);
    if (employerPrefecture) {
      workingPlan.socialInsurance.employerPrefecture = employerPrefecture;
      warnings.push(
        "事業所都道府県は居住地から仮設定しています（保存されません）。",
      );
    }
  }

  if (allowTransientAssumptions) {
    workingPlan.employment.oneEmployerFullYearConfirmed = true;
    workingPlan.employment.salaryIncomeOnlyConfirmed = true;
    workingPlan.employment.employmentInsuranceCategory = "general";
    assumptions.push(
      "概算前提: 1社勤務・通年在籍・給与所得のみとして計算しています。雇用保険事業区分は「一般」を仮定しています。",
    );
  }

  const hasMatchingManualResidentTax =
    workingPlan.residentTax.mode === "manual-annual" &&
    (workingPlan.residentTax.annualResidentTaxYen !== null ||
      workingPlan.residentTax.zeroYenConfirmed) &&
    workingPlan.residentTax.assessmentYear === currentYear;
  let residentTaxMode: TakeHomeEstimateProvenance["residentTax"];
  let baseResult: TakeHomeResult;
  if (hasMatchingManualResidentTax) {
    baseResult = calculateTakeHomeFromState(
      state,
      workingPlan,
      member,
      referenceDate,
    );
    residentTaxMode = "current-year-manual";
    assumptions.push(`住民税:手入力（${String(currentYear)}年度）`);
  } else {
    const staleManualYear =
      workingPlan.residentTax.mode === "manual-annual" &&
      workingPlan.residentTax.assessmentYear !== currentYear;
    if (staleManualYear) {
      warnings.push(
        `手入力住民税は${String(workingPlan.residentTax.assessmentYear)}年度のため、${String(currentYear)}年の概算には使用していません。`,
      );
    }
    const zeroResidentPlan = structuredClone(workingPlan);
    zeroResidentPlan.residentTax = {
      ...zeroResidentPlan.residentTax,
      mode: "manual-annual",
      assessmentYear: currentYear,
      annualResidentTaxYen: 0,
      zeroYenConfirmed: true,
    };
    baseResult = calculateTakeHomeFromState(
      state,
      zeroResidentPlan,
      member,
      referenceDate,
    );
    residentTaxMode = staleManualYear
      ? "stale-manual-estimate"
      : "current-year-estimate";
  }

  if (
    residentTaxMode === "current-year-manual" ||
    baseResult.status !== "complete"
  ) {
    return {
      result: {
        ...baseResult,
        warnings: [...baseResult.warnings, ...warnings],
        assumptions: [...baseResult.assumptions, ...assumptions],
      },
      plan: workingPlan,
      provenance: {
        salary: "persisted-direct",
        employment: allowTransientAssumptions ? "assumed" : "persisted",
        employerPrefecture: employerPrefecture
          ? plan.socialInsurance.employerPrefecture
            ? allowTransientAssumptions
              ? "transient-explicit"
              : "persisted"
            : "member-residence-estimate"
          : "none",
        residentTax: residentTaxMode,
        assumptions,
        warnings,
      },
    };
  }

  const annualSocialInsuranceYen = [
    baseResult.healthInsuranceYen,
    baseResult.careInsuranceYen,
    baseResult.additionalInsuranceYen,
    baseResult.pensionYen,
    baseResult.employmentInsuranceYen,
  ].reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const annualIdecoContributionYen = linkedIdecoContribution(
    state,
    workingPlan,
    member,
    referenceDate,
  );
  const annualTaxableSalaryYen = baseResult.annualTaxableSalaryYen ?? 0;
  const residentTax = estimateCurrentYearResidentTaxYen({
    annualTaxableSalaryYen,
    annualSocialInsuranceYen,
    annualIdecoContributionYen,
  });
  const estimatedPlan = structuredClone(workingPlan);
  estimatedPlan.residentTax = {
    ...estimatedPlan.residentTax,
    mode: "manual-annual",
    assessmentYear: currentYear,
    annualResidentTaxYen: residentTax,
    zeroYenConfirmed: residentTax === 0,
  };
  const result = calculateTakeHomeFromState(
    state,
    estimatedPlan,
    member,
    referenceDate,
  );
  const fallbackWarning = residentTaxFallbackWarning(
    currentYear,
    workingPlan.deductions.annualOtherIncomeDeductionsYen > 0,
  );
  warnings.push(fallbackWarning);
  assumptions.push(
    `住民税は${String(currentYear)}年支払額の概算（前年データの代わりに現在の給与・社会保険・iDeCoを使用）`,
    "配偶者・扶養控除はモデル化していません",
  );
  return {
    result: {
      ...result,
      // The estimate is calculated through a temporary manual-zero/estimate
      // plan so strict primitives remain unchanged.  Remove that temporary
      // label before presenting provenance to callers.
      warnings: [
        ...result.warnings.filter((warning) => warning !== "住民税は手入力"),
        ...warnings,
      ],
      assumptions: [
        ...result.assumptions.filter(
          (assumption) => assumption !== "住民税は手入力",
        ),
        ...assumptions,
      ],
    },
    plan: estimatedPlan,
    provenance: {
      salary: "persisted-direct",
      employment: allowTransientAssumptions ? "assumed" : "persisted",
      employerPrefecture: employerPrefecture
        ? plan.socialInsurance.employerPrefecture
          ? allowTransientAssumptions
            ? "transient-explicit"
            : "persisted"
          : "member-residence-estimate"
        : "none",
      residentTax: residentTaxMode,
      assumptions,
      warnings,
    },
  };
}

function transientPlanFromPayroll(
  member: Readonly<HouseholdMember>,
  payrollPlan: Readonly<AppState["payrollPlans"][number]>,
  currentYear: number,
  explicitEmployerPrefecture: PrefectureCode | null,
): CalculatedTakeHomePlan {
  const payroll = calculatePayroll(payrollPlan);
  const plan = createCalculatedTakeHomePlan({
    id: `transient-take-home:${member.id}:${String(currentYear)}`,
    memberId: member.id,
    targetYear: currentYear,
    birthDate: member.birthDate ?? null,
    residencePrefecture: prefectureCode(member.residencePrefecture),
  });
  plan.inputMode = "monthly";
  plan.compensation = {
    annualTaxableSalaryYen: payroll.annualTaxableSalaryYen,
    annualNonTaxableCommutingYen: payroll.annualNonTaxableCommutingYen,
    monthlyTaxableSalaryYen: payroll.monthlyTaxableSalaryYen,
    monthlyNonTaxableCommutingYen: payroll.monthlyNonTaxableCommutingYen,
    annualOtherTaxableSalaryYen: 0,
    bonuses: structuredClone(payrollPlan.bonuses),
    monthlyEmploymentInsuranceWagesYen: null,
    employmentInsuranceWageOverrideYen: null,
  };
  plan.employment.oneEmployerFullYearConfirmed = true;
  plan.employment.salaryIncomeOnlyConfirmed = true;
  plan.employment.employmentInsuranceCategory = "general";
  // A residence-derived fallback is applied only to a calculation clone in
  // calculatePlanWithResidentTaxEstimate.  Only a value explicitly selected
  // in the normal UI may enter the plan that can later be persisted.
  plan.socialInsurance.employerPrefecture = explicitEmployerPrefecture;
  plan.socialInsurance.monthlyRemunerationYen =
    payroll.monthlyTaxableSalaryYen + payroll.monthlyNonTaxableCommutingYen;
  plan.residentTax.assessmentYear = currentYear;
  return plan;
}

function blockedResolution(
  status: "integrity-error" | "blocked" | "unsupported-year" | "disabled",
  currentYear: number | null,
  member: Readonly<HouseholdMember> | null,
  message: string,
  plan: TakeHomePlan | null = null,
): CurrentTakeHomeContextResolution {
  return {
    status,
    currentYear,
    member,
    plan,
    result: plan ? createUnavailableTakeHomeResult(plan, message) : null,
    message,
    provenance: EMPTY_PROVENANCE,
  };
}

/**
 * Resolve the read-only self/current-year Take-home context.  This function
 * never dispatches, inserts, binds, reactivates, or otherwise mutates state.
 */
export function resolveCurrentTakeHomeContext(
  state: Readonly<AppState>,
  referenceDate: string | null,
  options: { transientEmployerPrefecture?: PrefectureCode | null } = {},
): CurrentTakeHomeContextResolution {
  const currentYear = currentYearFromReferenceDate(referenceDate);
  if (currentYear === null)
    return blockedResolution(
      "blocked",
      null,
      null,
      "基準日が未設定または不正です。",
    );
  const selfMembers = state.members.filter(
    (member) => member.role === "self" && member.active,
  );
  if (selfMembers.length !== 1)
    return blockedResolution(
      "integrity-error",
      currentYear,
      null,
      "有効な本人が1人に解決できません。",
    );
  const member = selfMembers[0];
  if (!member) throw new Error("self member resolution failed");
  if (!isTakeHomeSupportedYear(currentYear))
    return blockedResolution(
      "unsupported-year",
      currentYear,
      member,
      `${String(currentYear)}年の手取り計算ルールは未登録です。別の年へ自動変更していません。`,
    );

  const sameYearCalculatedPlans = state.takeHomePlans.filter(
    (plan): plan is CalculatedTakeHomePlan =>
      plan.mode === "calculated" &&
      plan.memberId === member.id &&
      plan.targetYear === currentYear,
  );
  const activePlans = sameYearCalculatedPlans.filter((plan) => plan.active);
  if (activePlans.length > 1)
    return blockedResolution(
      "integrity-error",
      currentYear,
      member,
      "同じ人物・対象年の有効な手取り計算プランが複数あります。",
    );
  if (activePlans.length === 1) {
    const plan = activePlans[0];
    if (!plan) throw new Error("active take-home plan resolution failed");
    const bindings = state.takeHomeCompensationBindings.filter(
      (binding) => binding.active && binding.takeHomePlanId === plan.id,
    );
    if (bindings.length > 1)
      return blockedResolution(
        "integrity-error",
        currentYear,
        member,
        "給与連携が複数あるため手取りを計算できません。",
        plan,
      );
    const source = bindings.length === 1 ? "payroll-linked" : "direct";
    if (bindings.length === 1) {
      const binding = bindings[0];
      const payroll = state.payrollPlans.find(
        (candidate) => candidate.id === binding?.payrollPlanId,
      );
      const activeSources = state.payrollPlans.filter(
        (candidate) =>
          candidate.active &&
          candidate.memberId === member.id &&
          candidate.targetYear === currentYear,
      );
      if (
        !payroll ||
        !payroll.active ||
        payroll.memberId !== member.id ||
        payroll.targetYear !== currentYear ||
        activeSources.length !== 1 ||
        activeSources[0]?.id !== payroll.id
      ) {
        return blockedResolution(
          "blocked",
          currentYear,
          member,
          "給与連携元が見つからないか、人物・対象年・有効な給与計画が一致しません。詳細設定から明示的に修復してください。",
          plan,
        );
      }
    }
    const resolved = calculatePlanWithResidentTaxEstimate(
      state,
      plan,
      member,
      referenceDate,
      currentYear,
      false,
    );
    const sourceProvenance = {
      ...resolved.provenance,
      salary:
        source === "payroll-linked" ? "payroll-statutory" : "persisted-direct",
    } as TakeHomeEstimateProvenance;
    return {
      status: "persisted",
      currentYear,
      member,
      plan,
      result: resolved.result,
      source,
      provenance: sourceProvenance,
    };
  }

  const activeLegacyPlans = state.takeHomePlans.filter(
    (plan) =>
      plan.mode === "legacy-manual" &&
      plan.active &&
      plan.memberId === member.id &&
      (plan.targetYear === currentYear || plan.targetYear === null),
  );
  if (activeLegacyPlans.length > 1)
    return blockedResolution(
      "integrity-error",
      currentYear,
      member,
      "本人・現在年に適用できる移行済み手入力値が複数あります。詳細設定から明示的に整理してください。",
    );
  if (activeLegacyPlans.length === 1) {
    const plan = activeLegacyPlans[0];
    if (!plan) throw new Error("legacy take-home plan resolution failed");
    return {
      status: "persisted",
      currentYear,
      member,
      plan,
      result: calculateTakeHomeFromState(state, plan, member, referenceDate),
      source: "direct",
      provenance: {
        salary: "persisted-direct",
        employment: "none",
        employerPrefecture: "none",
        residentTax: "none",
        assumptions: ["移行済みの手入力月間手取りを使用"],
        warnings: [
          "移行済み手入力値を保持しています。給与計算へ自動置換していません。",
        ],
      },
    };
  }

  if (sameYearCalculatedPlans.length > 0)
    return blockedResolution(
      "disabled",
      currentYear,
      member,
      "計算プランが無効です。詳細設定から明示的に再有効化してください。",
      sameYearCalculatedPlans[0] ?? null,
    );

  const payrollCandidates = state.payrollPlans.filter(
    (plan) =>
      plan.active &&
      plan.memberId === member.id &&
      plan.targetYear === currentYear,
  );
  if (payrollCandidates.length !== 1)
    return blockedResolution(
      payrollCandidates.length === 0 ? "blocked" : "integrity-error",
      currentYear,
      member,
      payrollCandidates.length === 0
        ? "本人・現在年の有効な給与計算が見つかりません。給与計算タブで作成してください。"
        : "本人・現在年の有効な給与計算が複数あるため、自動選択できません。",
    );
  const payrollPlan = payrollCandidates[0];
  if (!payrollPlan) throw new Error("payroll preview source resolution failed");
  let previewPlan: CalculatedTakeHomePlan;
  try {
    previewPlan = transientPlanFromPayroll(
      member,
      payrollPlan,
      currentYear,
      options.transientEmployerPrefecture ?? null,
    );
  } catch (error) {
    return blockedResolution(
      "blocked",
      currentYear,
      member,
      `給与計算結果を利用できません。${error instanceof Error ? ` ${error.message}` : ""}`,
    );
  }
  const resolved = calculatePlanWithResidentTaxEstimate(
    state,
    previewPlan,
    member,
    referenceDate,
    currentYear,
    true,
  );
  return {
    status: "transient-preview",
    currentYear,
    member,
    payrollPlanId: payrollPlan.id,
    plan: previewPlan,
    result: resolved.result,
    provenance: {
      ...resolved.provenance,
      salary: "payroll-statutory",
      employment: "assumed",
    },
  };
}

/** Build the only action allowed to persist a brand-new Payroll preview. */
export function createTakeHomePreviewPersistenceAction(
  resolution: Extract<
    CurrentTakeHomeContextResolution,
    { status: "transient-preview" }
  >,
): AppAction {
  return {
    type: "add-take-home-plan-with-payroll-binding",
    plan: structuredClone(resolution.plan),
    payrollPlanId: resolution.payrollPlanId,
  };
}
