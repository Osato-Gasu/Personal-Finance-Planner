import type {
  EmploymentInsuranceCategory,
  PrefectureCode,
} from "../rules/jp/take-home/social-insurance/rules-2026";

export type ISODate = string;
export type TakeHomePlanStatus =
  "complete" | "incomplete" | "unsupported" | "missing-rule" | "out-of-range";

export interface BonusPayment {
  id: string;
  paymentDate: ISODate;
  grossYen: number;
  socialInsuranceEligible: boolean;
  employmentInsuranceEligible: boolean;
}

export interface CompensationInput {
  annualTaxableSalaryYen: number;
  annualNonTaxableCommutingYen: number;
  monthlyTaxableSalaryYen: number;
  monthlyNonTaxableCommutingYen: number;
  annualOtherTaxableSalaryYen: number;
  bonuses: BonusPayment[];
  monthlyEmploymentInsuranceWagesYen: number[] | null;
  /** @deprecated Annual totals cannot establish month-specific statutory bases. */
  employmentInsuranceWageOverrideYen: number | null;
}

export interface EmploymentSettings {
  employmentType: "employee";
  oneEmployerFullYearConfirmed: boolean;
  salaryIncomeOnlyConfirmed: boolean;
  employmentInsuranceCategory: EmploymentInsuranceCategory;
  note: string;
}

export type SocialInsuranceMode =
  "kyokai-auto" | "manual" | "unsupported-uncomputed";
export type StandardRemunerationMode =
  | "exact-standard-remuneration"
  | "estimate-from-remuneration"
  | "manual-total"
  | "unsupported-uncomputed";

export interface ManualSocialInsurance {
  annualHealthInsuranceYen: number | null;
  annualCareInsuranceYen: number | null;
  annualAdditionalInsuranceYen: number | null;
  annualPensionYen: number | null;
  annualEmploymentInsuranceYen: number | null;
  annualOtherStatutoryDeductionYen: number;
}

export interface SocialInsuranceSettings {
  mode: SocialInsuranceMode;
  standardRemunerationMode: StandardRemunerationMode;
  employerPrefecture: PrefectureCode | null;
  standardMonthlyRemunerationYen: number | null;
  monthlyRemunerationYen: number | null;
  healthBonusPriorFiscalYearCumulativeYen: number;
  manual: ManualSocialInsurance;
}

export interface ResidentTaxSettings {
  mode: "manual-annual" | "unsupported-uncomputed";
  assessmentYear: number;
  annualResidentTaxYen: number | null;
  zeroYenConfirmed: boolean;
  municipalityNote: string;
}

export interface DeductionSettings {
  annualIdecoContributionYen: number;
  annualOtherIncomeDeductionsYen: number;
  otherIncomeDeductionsNote: string;
}

export interface CalculatedTakeHomePlan {
  id: string;
  memberId: string;
  targetYear: number;
  mode: "calculated";
  birthDate: ISODate | null;
  residencePrefecture: PrefectureCode | null;
  inputMode: "annual" | "monthly";
  compensation: CompensationInput;
  employment: EmploymentSettings;
  socialInsurance: SocialInsuranceSettings;
  residentTax: ResidentTaxSettings;
  deductions: DeductionSettings;
  active: boolean;
}

export interface LegacyManualTakeHomePlan {
  id: string;
  memberId: string;
  targetYear: number | null;
  mode: "legacy-manual";
  manualAverageMonthlyTakeHomeYen: number;
  active: boolean;
}

export type TakeHomePlan = CalculatedTakeHomePlan | LegacyManualTakeHomePlan;

export interface AppliedRule {
  id: string;
  domain: string;
  contextKey: string;
  effectiveFrom: string;
  effectiveTo: string;
  effectiveBasis: string;
  status: string;
  publishedAt: string;
  verifiedAt: string;
  verifiedBy: string;
  sourceTitle: string;
  sourceUrls: readonly string[];
  sourcePublisher: string;
  sourceRetrievedAt: string;
  notes: string;
}

export interface AppliedBonusBasis {
  bonusId: string;
  paymentDate: ISODate;
  grossYen: number;
  healthStandardBonusYen: number;
  pensionStandardBonusYen: number;
}

export interface SocialInsuranceBasis {
  employerPrefecture: PrefectureCode | null;
  healthStandardMonthlyRemunerationYen: number | null;
  pensionStandardMonthlyRemunerationYen: number | null;
  bonuses: readonly AppliedBonusBasis[];
}

export interface TakeHomeResult {
  status: TakeHomePlanStatus;
  planId: string;
  memberId: string;
  targetYear: number | null;
  annualGrossYen: number | null;
  annualTaxableSalaryYen: number | null;
  annualNonTaxableCommutingYen: number | null;
  salaryIncomeYen: number | null;
  taxableIncomeYen: number | null;
  nationalIncomeTaxYen: number | null;
  reconstructionIncomeTaxYen: number | null;
  residentTaxYen: number | null;
  healthInsuranceYen: number | null;
  careInsuranceYen: number | null;
  additionalInsuranceYen: number | null;
  pensionYen: number | null;
  employmentInsuranceYen: number | null;
  otherStatutoryDeductionYen: number;
  statutoryDeductionsYen: number | null;
  annualTakeHomeYen: number | null;
  averageMonthlyTakeHomeYen: number | null;
  deductionRatePercent: number | null;
  incomeTaxBeforeIdecoYen: number | null;
  incomeTaxAfterIdecoYen: number | null;
  incomeTaxBenefitFromIdecoYen: number | null;
  taxableIncomeBeforeIdecoYen: number | null;
  taxableIncomeAfterIdecoYen: number | null;
  nationalIncomeTaxBeforeIdecoYen: number | null;
  nationalIncomeTaxAfterIdecoYen: number | null;
  reconstructionIncomeTaxBeforeIdecoYen: number | null;
  reconstructionIncomeTaxAfterIdecoYen: number | null;
  appliedRules: readonly AppliedRule[];
  socialInsuranceBasis: SocialInsuranceBasis;
  warnings: readonly string[];
  unsupportedConditions: readonly string[];
  assumptions: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: unknown, field: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(`${field} must be a string`);
  }
  return value;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
  return value;
}

export function assertSafeYenValue(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}

function nullableYen(value: unknown, field: string): number | null {
  if (value === null) return null;
  assertSafeYenValue(value, field);
  return value;
}

export function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be an ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const normalized = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`${field} must be a real calendar date`);
  }
}

const prefectureCodeSet = new Set(
  Array.from(
    { length: 47 },
    (_, index) => `JP-${String(index + 1).padStart(2, "0")}`,
  ),
);

function parseBonus(value: unknown, targetYear: number): BonusPayment {
  if (!isRecord(value)) throw new Error("bonus must be an object");
  const paymentDate = string(value.paymentDate, "bonus paymentDate");
  assertIsoDate(paymentDate, "bonus paymentDate");
  if (Number(paymentDate.slice(0, 4)) !== targetYear) {
    throw new Error("bonus paymentDate must be within targetYear");
  }
  assertSafeYenValue(value.grossYen, "bonus grossYen");
  return {
    id: string(value.id, "bonus id"),
    paymentDate,
    grossYen: value.grossYen,
    socialInsuranceEligible: boolean(
      value.socialInsuranceEligible,
      "bonus socialInsuranceEligible",
    ),
    employmentInsuranceEligible: boolean(
      value.employmentInsuranceEligible,
      "bonus employmentInsuranceEligible",
    ),
  };
}

function parseCalculatedPlan(
  value: Record<string, unknown>,
  profileFallback?: {
    birthDate?: string | undefined;
    residencePrefecture?: string | undefined;
  },
): CalculatedTakeHomePlan {
  if (
    !Number.isSafeInteger(value.targetYear) ||
    (value.targetYear as number) < 1900 ||
    (value.targetYear as number) > 9999
  ) {
    throw new Error("targetYear is invalid");
  }
  const targetYear = value.targetYear as number;
  if (value.inputMode !== "annual" && value.inputMode !== "monthly") {
    throw new Error("inputMode is invalid");
  }
  if (!isRecord(value.compensation))
    throw new Error("compensation is required");
  const compensation = value.compensation;
  for (const field of [
    "annualTaxableSalaryYen",
    "annualNonTaxableCommutingYen",
    "monthlyTaxableSalaryYen",
    "monthlyNonTaxableCommutingYen",
    "annualOtherTaxableSalaryYen",
  ] as const) {
    assertSafeYenValue(compensation[field], `compensation ${field}`);
  }
  const annualTaxableSalaryYen = compensation.annualTaxableSalaryYen as number;
  const annualNonTaxableCommutingYen =
    compensation.annualNonTaxableCommutingYen as number;
  const monthlyTaxableSalaryYen =
    compensation.monthlyTaxableSalaryYen as number;
  const monthlyNonTaxableCommutingYen =
    compensation.monthlyNonTaxableCommutingYen as number;
  const annualOtherTaxableSalaryYen =
    compensation.annualOtherTaxableSalaryYen as number;
  let monthlyEmploymentInsuranceWagesYen: number[] | null = null;
  if (
    compensation.monthlyEmploymentInsuranceWagesYen !== null &&
    compensation.monthlyEmploymentInsuranceWagesYen !== undefined
  ) {
    if (!Array.isArray(compensation.monthlyEmploymentInsuranceWagesYen)) {
      throw new Error(
        "monthlyEmploymentInsuranceWagesYen must be an array or null",
      );
    }
    if (compensation.monthlyEmploymentInsuranceWagesYen.length !== 12) {
      throw new Error(
        "monthlyEmploymentInsuranceWagesYen must contain 12 months",
      );
    }
    monthlyEmploymentInsuranceWagesYen =
      compensation.monthlyEmploymentInsuranceWagesYen.map((monthly, index) => {
        assertSafeYenValue(
          monthly,
          `employment insurance wage month ${String(index + 1)}`,
        );
        return monthly;
      });
  }
  if (!Array.isArray(compensation.bonuses))
    throw new Error("bonuses must be an array");
  const bonuses = compensation.bonuses.map((bonus) =>
    parseBonus(bonus, targetYear),
  );
  if (new Set(bonuses.map((bonus) => bonus.id)).size !== bonuses.length) {
    throw new Error("bonus IDs must be unique");
  }
  let annualBonusGrossYen = 0;
  for (const bonus of bonuses) {
    if (bonus.grossYen > Number.MAX_SAFE_INTEGER - annualBonusGrossYen) {
      throw new Error("annual bonus total is out of range");
    }
    annualBonusGrossYen += bonus.grossYen;
  }
  if (
    value.inputMode === "annual" &&
    annualBonusGrossYen > annualTaxableSalaryYen
  ) {
    throw new Error("annual taxable salary must include every bonus");
  }
  if (!isRecord(value.employment)) throw new Error("employment is required");
  const employment = value.employment;
  if (employment.employmentType !== "employee")
    throw new Error("employmentType is unsupported");
  if (
    employment.employmentInsuranceCategory !== "general" &&
    employment.employmentInsuranceCategory !==
      "agriculture-forestry-fishery-sake" &&
    employment.employmentInsuranceCategory !== "construction"
  ) {
    throw new Error("employment insurance category is invalid");
  }
  if (!isRecord(value.socialInsurance))
    throw new Error("socialInsurance is required");
  const social = value.socialInsurance;
  if (
    social.mode !== "kyokai-auto" &&
    social.mode !== "manual" &&
    social.mode !== "unsupported-uncomputed"
  ) {
    throw new Error("social insurance mode is invalid");
  }
  if (
    social.standardRemunerationMode !== "exact-standard-remuneration" &&
    social.standardRemunerationMode !== "estimate-from-remuneration" &&
    social.standardRemunerationMode !== "manual-total" &&
    social.standardRemunerationMode !== "unsupported-uncomputed"
  ) {
    throw new Error("standard remuneration mode is invalid");
  }
  if (
    social.employerPrefecture !== null &&
    (typeof social.employerPrefecture !== "string" ||
      !prefectureCodeSet.has(social.employerPrefecture))
  ) {
    throw new Error("employerPrefecture is invalid");
  }
  if (!isRecord(social.manual))
    throw new Error("manual social insurance is required");
  assertSafeYenValue(
    social.healthBonusPriorFiscalYearCumulativeYen,
    "healthBonusPriorFiscalYearCumulativeYen",
  );
  const manual: ManualSocialInsurance = {
    annualHealthInsuranceYen: nullableYen(
      social.manual.annualHealthInsuranceYen,
      "annualHealthInsuranceYen",
    ),
    annualCareInsuranceYen: nullableYen(
      social.manual.annualCareInsuranceYen,
      "annualCareInsuranceYen",
    ),
    annualAdditionalInsuranceYen: nullableYen(
      social.manual.annualAdditionalInsuranceYen,
      "annualAdditionalInsuranceYen",
    ),
    annualPensionYen: nullableYen(
      social.manual.annualPensionYen,
      "annualPensionYen",
    ),
    annualEmploymentInsuranceYen: nullableYen(
      social.manual.annualEmploymentInsuranceYen,
      "annualEmploymentInsuranceYen",
    ),
    annualOtherStatutoryDeductionYen: (() => {
      assertSafeYenValue(
        social.manual.annualOtherStatutoryDeductionYen,
        "annualOtherStatutoryDeductionYen",
      );
      return social.manual.annualOtherStatutoryDeductionYen;
    })(),
  };
  if (!isRecord(value.residentTax)) throw new Error("residentTax is required");
  const resident = value.residentTax;
  if (
    resident.mode !== "manual-annual" &&
    resident.mode !== "unsupported-uncomputed"
  ) {
    throw new Error("resident tax mode is invalid");
  }
  if (!Number.isSafeInteger(resident.assessmentYear))
    throw new Error("resident tax assessmentYear is invalid");
  if (!isRecord(value.deductions)) throw new Error("deductions are required");
  const deductions = value.deductions;
  assertSafeYenValue(
    deductions.annualIdecoContributionYen,
    "annualIdecoContributionYen",
  );
  assertSafeYenValue(
    deductions.annualOtherIncomeDeductionsYen,
    "annualOtherIncomeDeductionsYen",
  );
  const rawBirthDate =
    value.birthDate === undefined
      ? (profileFallback?.birthDate ?? null)
      : value.birthDate;
  if (rawBirthDate !== null) {
    if (typeof rawBirthDate !== "string")
      throw new Error("plan birthDate is invalid");
    assertIsoDate(rawBirthDate, "plan birthDate");
  }
  const rawResidencePrefecture =
    value.residencePrefecture === undefined
      ? (profileFallback?.residencePrefecture ?? null)
      : value.residencePrefecture;
  if (
    rawResidencePrefecture !== null &&
    (typeof rawResidencePrefecture !== "string" ||
      !prefectureCodeSet.has(rawResidencePrefecture))
  ) {
    throw new Error("plan residencePrefecture is invalid");
  }
  return {
    id: string(value.id, "plan id"),
    memberId: string(value.memberId, "plan memberId"),
    targetYear,
    mode: "calculated",
    birthDate: rawBirthDate,
    residencePrefecture: rawResidencePrefecture as PrefectureCode | null,
    inputMode: value.inputMode,
    compensation: {
      annualTaxableSalaryYen,
      annualNonTaxableCommutingYen,
      monthlyTaxableSalaryYen,
      monthlyNonTaxableCommutingYen,
      annualOtherTaxableSalaryYen,
      bonuses,
      monthlyEmploymentInsuranceWagesYen,
      employmentInsuranceWageOverrideYen: nullableYen(
        compensation.employmentInsuranceWageOverrideYen,
        "employmentInsuranceWageOverrideYen",
      ),
    },
    employment: {
      employmentType: "employee",
      oneEmployerFullYearConfirmed: boolean(
        employment.oneEmployerFullYearConfirmed,
        "oneEmployerFullYearConfirmed",
      ),
      salaryIncomeOnlyConfirmed: boolean(
        employment.salaryIncomeOnlyConfirmed,
        "salaryIncomeOnlyConfirmed",
      ),
      employmentInsuranceCategory: employment.employmentInsuranceCategory,
      note: string(employment.note, "employment note", true),
    },
    socialInsurance: {
      mode: social.mode,
      standardRemunerationMode: social.standardRemunerationMode,
      employerPrefecture: social.employerPrefecture as PrefectureCode | null,
      standardMonthlyRemunerationYen: nullableYen(
        social.standardMonthlyRemunerationYen,
        "standardMonthlyRemunerationYen",
      ),
      monthlyRemunerationYen: nullableYen(
        social.monthlyRemunerationYen,
        "monthlyRemunerationYen",
      ),
      healthBonusPriorFiscalYearCumulativeYen:
        social.healthBonusPriorFiscalYearCumulativeYen,
      manual,
    },
    residentTax: {
      mode: resident.mode,
      assessmentYear: resident.assessmentYear as number,
      annualResidentTaxYen: nullableYen(
        resident.annualResidentTaxYen,
        "annualResidentTaxYen",
      ),
      zeroYenConfirmed: boolean(resident.zeroYenConfirmed, "zeroYenConfirmed"),
      municipalityNote: string(
        resident.municipalityNote,
        "municipalityNote",
        true,
      ),
    },
    deductions: {
      annualIdecoContributionYen: deductions.annualIdecoContributionYen,
      annualOtherIncomeDeductionsYen: deductions.annualOtherIncomeDeductionsYen,
      otherIncomeDeductionsNote: string(
        deductions.otherIncomeDeductionsNote,
        "otherIncomeDeductionsNote",
        true,
      ),
    },
    active: boolean(value.active, "plan active"),
  };
}

export function parseTakeHomePlan(
  value: unknown,
  profileFallback?: {
    birthDate?: string | undefined;
    residencePrefecture?: string | undefined;
  },
): TakeHomePlan {
  if (!isRecord(value)) throw new Error("take-home plan must be an object");
  if (value.mode === "legacy-manual") {
    if (value.targetYear !== null && !Number.isSafeInteger(value.targetYear)) {
      throw new Error("legacy targetYear is invalid");
    }
    assertSafeYenValue(
      value.manualAverageMonthlyTakeHomeYen,
      "manualAverageMonthlyTakeHomeYen",
    );
    return {
      id: string(value.id, "plan id"),
      memberId: string(value.memberId, "plan memberId"),
      targetYear: value.targetYear as number | null,
      mode: "legacy-manual",
      manualAverageMonthlyTakeHomeYen: value.manualAverageMonthlyTakeHomeYen,
      active: boolean(value.active, "plan active"),
    };
  }
  if (value.mode !== "calculated")
    throw new Error("take-home plan mode is invalid");
  return parseCalculatedPlan(value, profileFallback);
}

export function validateTakeHomePlan(plan: TakeHomePlan): void {
  if (
    plan.mode === "calculated" &&
    (!Object.hasOwn(plan, "birthDate") ||
      !Object.hasOwn(plan, "residencePrefecture") ||
      !Object.hasOwn(plan.compensation, "monthlyEmploymentInsuranceWagesYen"))
  ) {
    throw new Error("calculated plan identity fields are required");
  }
  parseTakeHomePlan(plan);
}

export function createCalculatedTakeHomePlan(options: {
  id: string;
  memberId: string;
  targetYear?: number;
  birthDate?: string | null;
  residencePrefecture?: PrefectureCode | null;
}): CalculatedTakeHomePlan {
  return {
    id: options.id,
    memberId: options.memberId,
    targetYear: options.targetYear ?? 2026,
    mode: "calculated",
    birthDate: options.birthDate ?? null,
    residencePrefecture: options.residencePrefecture ?? null,
    inputMode: "annual",
    compensation: {
      annualTaxableSalaryYen: 0,
      annualNonTaxableCommutingYen: 0,
      monthlyTaxableSalaryYen: 0,
      monthlyNonTaxableCommutingYen: 0,
      annualOtherTaxableSalaryYen: 0,
      bonuses: [],
      monthlyEmploymentInsuranceWagesYen: null,
      employmentInsuranceWageOverrideYen: null,
    },
    employment: {
      employmentType: "employee",
      oneEmployerFullYearConfirmed: true,
      salaryIncomeOnlyConfirmed: true,
      employmentInsuranceCategory: "general",
      note: "",
    },
    socialInsurance: {
      mode: "kyokai-auto",
      standardRemunerationMode: "estimate-from-remuneration",
      employerPrefecture: null,
      standardMonthlyRemunerationYen: null,
      monthlyRemunerationYen: null,
      healthBonusPriorFiscalYearCumulativeYen: 0,
      manual: {
        annualHealthInsuranceYen: null,
        annualCareInsuranceYen: null,
        annualAdditionalInsuranceYen: null,
        annualPensionYen: null,
        annualEmploymentInsuranceYen: null,
        annualOtherStatutoryDeductionYen: 0,
      },
    },
    residentTax: {
      mode: "unsupported-uncomputed",
      assessmentYear: (options.targetYear ?? 2026) + 1,
      annualResidentTaxYen: null,
      zeroYenConfirmed: false,
      municipalityNote: "",
    },
    deductions: {
      annualIdecoContributionYen: 0,
      annualOtherIncomeDeductionsYen: 0,
      otherIncomeDeductionsNote: "",
    },
    active: true,
  };
}
