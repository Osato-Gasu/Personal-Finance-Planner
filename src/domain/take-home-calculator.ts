import type { HouseholdMember } from "./state";
import type {
  AppliedBonusBasis,
  AppliedRule,
  CalculatedTakeHomePlan,
  TakeHomePlan,
  TakeHomeResult,
} from "./take-home-plan";
import {
  basicDeduction2026,
  incomeDeductionRules2026,
  incomeTaxBrackets2026,
  reconstructionIncomeTax2026,
  salaryIncomeDeduction2026,
  taxableIncomeRounding2026,
} from "../rules/jp/take-home/income-tax/rules-2026";
import {
  additionalInsuranceRules2026,
  careInsuranceRules2026,
  careInsuranceEligibility2026,
  employmentInsuranceRules2026,
  healthInsuranceEligibility2026,
  healthInsuranceRules2026,
  healthStandardRemunerationTable,
  pensionRule2026,
  pensionInsuranceEligibility2026,
  pensionStandardRemunerationTable,
  standardBonusRule2026,
  type StandardRemunerationTable,
} from "../rules/jp/take-home/social-insurance/rules-2026";
import type { RuleRecord } from "../rules/jp/take-home/metadata";

const SUPPORT_YEAR = 2026;

function checked(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${field} is out of range`);
  return value;
}

function checkedSigned(value: number, field: string): number {
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${field} is out of range`);
  return value;
}

function add(values: readonly number[], field: string): number {
  return checked(
    values.reduce((total, value) => {
      if (value > Number.MAX_SAFE_INTEGER - total)
        throw new RangeError(`${field} is out of range`);
      return total + value;
    }, 0),
    field,
  );
}

function employeeRounded(
  base: number,
  numerator: number,
  denominator: number,
): number {
  const scaled = BigInt(base) * BigInt(numerator);
  const divisor = BigInt(denominator) * 2n;
  const quotient = scaled / divisor;
  const remainder = scaled % divisor;
  return Number(remainder * 2n <= divisor ? quotient : quotient + 1n);
}

function payrollRounded(
  base: number,
  numerator: number,
  denominator: number,
): number {
  const scaled = BigInt(base) * BigInt(Math.round(numerator * 2));
  const divisor = BigInt(denominator) * 2n;
  const quotient = scaled / divisor;
  const remainder = scaled % divisor;
  return Number(remainder * 2n <= divisor ? quotient : quotient + 1n);
}

function ruleOn<T>(
  rules: readonly RuleRecord<T>[],
  date: string,
): RuleRecord<T> {
  const found = rules.find(
    (rule) =>
      rule.metadata.effectiveFrom <= date && rule.metadata.effectiveTo >= date,
  );
  if (!found) throw new Error(`missing rule for ${date}`);
  return found;
}

function applied(rule: RuleRecord<unknown>): AppliedRule {
  return {
    id: rule.metadata.id,
    domain: rule.metadata.domain,
    contextKey: rule.metadata.contextKey,
    effectiveFrom: rule.metadata.effectiveFrom,
    effectiveTo: rule.metadata.effectiveTo,
    effectiveBasis: rule.metadata.effectiveBasis,
    status: rule.metadata.status,
    publishedAt: rule.metadata.publishedAt,
    verifiedAt: rule.metadata.verifiedAt,
    verifiedBy: rule.metadata.verifiedBy,
    sourceTitle: rule.metadata.sourceTitle,
    sourceUrls: rule.metadata.sourceUrls,
    sourcePublisher: rule.metadata.sourcePublisher,
    sourceRetrievedAt: rule.metadata.sourceRetrievedAt,
    notes: rule.metadata.notes,
  };
}

export function salaryIncomeYen2026(salaryYen: number): number {
  checked(salaryYen, "salary");
  if (salaryYen > salaryIncomeDeduction2026.value.supportedSalaryMaximumYen) {
    throw new RangeError("salary is outside the supported range");
  }
  const band = salaryIncomeDeduction2026.value.bands.find(
    (candidate) => salaryYen <= candidate.maximumYen,
  );
  if (!band) throw new Error("missing salary income band");
  if (band.formula === "zero") return 0;
  if (band.formula === "subtract") return salaryYen - band.amountYen;
  if (band.formula === "fixed") return band.amountYen;
  const base =
    band.formula === "quarter-step"
      ? Math.floor(salaryYen / 4_000) * 1_000
      : salaryYen;
  return (
    Number((BigInt(base) * BigInt(band.numerator)) / BigInt(band.denominator)) +
    band.adjustmentYen
  );
}

export function basicDeductionYen2026(totalIncomeYen: number): number {
  return (
    basicDeduction2026.value.find(
      (band) =>
        band.incomeMaximumYen === null ||
        totalIncomeYen <= band.incomeMaximumYen,
    )?.deductionYen ?? 0
  );
}

export function nationalIncomeTaxYen2026(taxableIncomeYen: number): number {
  const bracket = incomeTaxBrackets2026.value.find(
    (candidate) =>
      taxableIncomeYen >= candidate.taxableIncomeMinimumYen &&
      (candidate.taxableIncomeMaximumYen === null ||
        taxableIncomeYen <= candidate.taxableIncomeMaximumYen),
  );
  if (!bracket) return 0;
  return checked(
    Number(
      (BigInt(taxableIncomeYen) * BigInt(bracket.rateNumerator)) /
        BigInt(bracket.rateDenominator),
    ) - bracket.deductionYen,
    "income tax",
  );
}

function standardFrom(
  table: StandardRemunerationTable,
  remunerationYen: number,
): number {
  let index = 0;
  for (
    let candidate = 0;
    candidate < table.lowerBoundsYen.length;
    candidate += 1
  ) {
    if ((table.lowerBoundsYen[candidate] ?? 0) <= remunerationYen)
      index = candidate;
  }
  return (
    table.standardMonthlyValuesYen[index] ??
    table.standardMonthlyValuesYen[0] ??
    0
  );
}

function ageBoundaryDate(
  birthDate: string,
  age: number,
  reachedOn: "birthday" | "day-before-birthday",
): Date {
  const [year, month, day] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(
    Date.UTC(
      year + age,
      month - 1,
      day - (reachedOn === "day-before-birthday" ? 1 : 0),
    ),
  );
}

function monthsFromInclusiveUntilExclusive(
  from: Date,
  until: Date,
): Set<number> {
  const result = new Set<number>();
  const fromKey = from.getUTCFullYear() * 12 + from.getUTCMonth();
  const untilKey = until.getUTCFullYear() * 12 + until.getUTCMonth();
  for (let month = 1; month <= 12; month += 1) {
    const key = SUPPORT_YEAR * 12 + month - 1;
    if (key >= fromKey && key < untilKey) result.add(month);
  }
  return result;
}

function careEligibilityMonths(birthDate: string): Set<number> {
  return monthsFromInclusiveUntilExclusive(
    ageBoundaryDate(
      birthDate,
      careInsuranceEligibility2026.value.minimumAge,
      careInsuranceEligibility2026.value.ageReachedOn,
    ),
    ageBoundaryDate(
      birthDate,
      careInsuranceEligibility2026.value.maximumAgeExclusive,
      careInsuranceEligibility2026.value.ageReachedOn,
    ),
  );
}

function insurancePremiumMonths(
  birthDate: string,
  age: number,
  lostOn: "birthday" | "day-before-birthday",
): Set<number> {
  return monthsFromInclusiveUntilExclusive(
    new Date(Date.UTC(1900, 0, 1)),
    ageBoundaryDate(birthDate, age, lostOn),
  );
}

export function socialInsuranceEligibilityMonths2026(birthDate: string): {
  health: readonly number[];
  care: readonly number[];
  pension: readonly number[];
} {
  return {
    health: [
      ...insurancePremiumMonths(
        birthDate,
        healthInsuranceEligibility2026.value.maximumAgeExclusive,
        healthInsuranceEligibility2026.value.qualificationLostOn,
      ),
    ],
    care: [...careEligibilityMonths(birthDate)],
    pension: [
      ...insurancePremiumMonths(
        birthDate,
        pensionInsuranceEligibility2026.value.maximumAgeExclusive,
        pensionInsuranceEligibility2026.value.qualificationLostOn,
      ),
    ],
  };
}

function reachesAgeDuringSupportYear(
  birthDate: string,
  age: number,
  reachedOn: "birthday" | "day-before-birthday",
): boolean {
  return (
    ageBoundaryDate(birthDate, age, reachedOn).getUTCFullYear() === SUPPORT_YEAR
  );
}

interface SocialResult {
  health: number;
  care: number;
  additional: number;
  pension: number;
  employment: number;
  appliedRules: AppliedRule[];
  basis: TakeHomeResult["socialInsuranceBasis"];
}

function automaticSocial(plan: CalculatedTakeHomePlan): SocialResult | string {
  const prefecture = plan.socialInsurance.employerPrefecture;
  if (!prefecture) return "事業所都道府県が未入力です";
  if (!plan.birthDate) return "生年月日が未入力です";
  const eligibility = socialInsuranceEligibilityMonths2026(plan.birthDate);
  const careMonths = new Set(eligibility.care);
  const healthMonths = new Set(eligibility.health);
  const pensionMonths = new Set(eligibility.pension);
  if (
    reachesAgeDuringSupportYear(
      plan.birthDate,
      healthInsuranceEligibility2026.value.maximumAgeExclusive,
      healthInsuranceEligibility2026.value.qualificationLostOn,
    )
  ) {
    return "2026年中の75歳到達後に必要な後期高齢者医療保険料は自動計算対象外です";
  }
  if (healthMonths.size === 0)
    return "75歳以上の健康保険は協会けんぽ自動計算対象外です";
  const careFirstCategoryStart = ageBoundaryDate(
    plan.birthDate,
    careInsuranceEligibility2026.value.maximumAgeExclusive,
    careInsuranceEligibility2026.value.ageReachedOn,
  );
  const supportYearEnd = new Date(Date.UTC(SUPPORT_YEAR, 11, 31));
  if (careFirstCategoryStart <= supportYearEnd) {
    return "65～74歳の介護保険第1号被保険者の保険料は自動計算対象外です。第1号介護保険料を0円として扱っていません。社会保険計算方法を年額手入力へ切り替え、項目別に入力してください";
  }
  if (
    plan.compensation.bonuses.filter((bonus) => bonus.socialInsuranceEligible)
      .length > standardBonusRule2026.value.maximumOrdinaryPaymentsPerYear
  ) {
    return "年4回以上の賞与は標準報酬として扱うため自動計算対象外です";
  }
  const remuneration =
    plan.socialInsurance.standardRemunerationMode ===
    "exact-standard-remuneration"
      ? plan.socialInsurance.standardMonthlyRemunerationYen
      : (plan.socialInsurance.monthlyRemunerationYen ??
        (plan.inputMode === "monthly"
          ? plan.compensation.monthlyTaxableSalaryYen +
            plan.compensation.monthlyNonTaxableCommutingYen
          : null));
  if (remuneration === null) return "標準報酬月額または報酬月額が未入力です";
  if (remuneration <= 0)
    return "標準報酬月額または報酬月額は正の金額が必要です";
  if (
    plan.socialInsurance.standardRemunerationMode ===
      "exact-standard-remuneration" &&
    !healthStandardRemunerationTable.value.standardMonthlyValuesYen.some(
      (value) => value === remuneration,
    )
  )
    return "標準報酬月額が公式等級に一致しません";
  const healthStandard =
    plan.socialInsurance.standardRemunerationMode ===
    "exact-standard-remuneration"
      ? remuneration
      : standardFrom(healthStandardRemunerationTable.value, remuneration);
  const pensionStandard =
    plan.socialInsurance.standardRemunerationMode ===
    "exact-standard-remuneration"
      ? Math.min(650_000, Math.max(88_000, remuneration))
      : standardFrom(pensionStandardRemunerationTable.value, remuneration);
  let health = 0;
  let care = 0;
  let additional = 0;
  let pension = 0;
  const selected = new Map<string, RuleRecord<unknown>>();
  for (let month = 1; month <= 12; month += 1) {
    const date = `2026-${String(month).padStart(2, "0")}-15`;
    const healthRule = ruleOn(healthInsuranceRules2026, date);
    const careRule = ruleOn(careInsuranceRules2026, date);
    const additionalRule = ruleOn(additionalInsuranceRules2026, date);
    if (healthMonths.has(month)) {
      health += employeeRounded(
        healthStandard,
        healthRule.value.fullRateNumeratorByPrefecture[prefecture],
        healthRule.value.fullRateDenominator,
      );
    }
    if (careMonths.has(month)) {
      care += employeeRounded(
        healthStandard,
        careRule.value.fullRateNumerator,
        careRule.value.fullRateDenominator,
      );
    }
    if (healthMonths.has(month)) {
      additional += employeeRounded(
        healthStandard,
        additionalRule.value.fullRateNumerator,
        additionalRule.value.fullRateDenominator,
      );
    }
    if (pensionMonths.has(month)) {
      pension += employeeRounded(
        pensionStandard,
        pensionRule2026.value.fullRateNumerator,
        pensionRule2026.value.fullRateDenominator,
      );
    }
    for (const rule of [healthRule, careRule, additionalRule])
      selected.set(rule.metadata.id, rule);
  }
  let healthFiscalYear = 2025;
  let healthFiscalUsed =
    plan.socialInsurance.healthBonusPriorFiscalYearCumulativeYen;
  const pensionUsedByMonth = new Map<number, number>();
  const bonusBasis: AppliedBonusBasis[] = [];
  const socialBonuses = plan.compensation.bonuses
    .filter((item) => item.socialInsuranceEligible)
    .slice()
    .sort((left, right) => left.paymentDate.localeCompare(right.paymentDate));
  for (const bonus of socialBonuses) {
    const month = Number(bonus.paymentDate.slice(5, 7));
    const bonusFiscalYear = month <= 3 ? 2025 : 2026;
    if (bonusFiscalYear !== healthFiscalYear) {
      healthFiscalYear = bonusFiscalYear;
      healthFiscalUsed = 0;
    }
    const standardBonus = Math.floor(bonus.grossYen / 1000) * 1000;
    const healthRemaining = Math.max(
      0,
      standardBonusRule2026.value.healthFiscalYearMaximumYen - healthFiscalUsed,
    );
    const healthBase = Math.min(standardBonus, healthRemaining);
    healthFiscalUsed += healthBase;
    const healthRule = ruleOn(healthInsuranceRules2026, bonus.paymentDate);
    const careRule = ruleOn(careInsuranceRules2026, bonus.paymentDate);
    const additionalRule = ruleOn(
      additionalInsuranceRules2026,
      bonus.paymentDate,
    );
    if (healthMonths.has(month)) {
      health += employeeRounded(
        healthBase,
        healthRule.value.fullRateNumeratorByPrefecture[prefecture],
        10_000,
      );
    }
    if (careMonths.has(month))
      care += employeeRounded(
        healthBase,
        careRule.value.fullRateNumerator,
        10_000,
      );
    if (healthMonths.has(month)) {
      additional += employeeRounded(
        healthBase,
        additionalRule.value.fullRateNumerator,
        10_000,
      );
    }
    const already = pensionUsedByMonth.get(month) ?? 0;
    const pensionBase = Math.min(
      standardBonus,
      Math.max(
        0,
        standardBonusRule2026.value.pensionMonthlyMaximumYen - already,
      ),
    );
    pensionUsedByMonth.set(month, already + pensionBase);
    if (pensionMonths.has(month)) {
      pension += employeeRounded(
        pensionBase,
        pensionRule2026.value.fullRateNumerator,
        1000,
      );
    }
    bonusBasis.push({
      bonusId: bonus.id,
      paymentDate: bonus.paymentDate,
      grossYen: bonus.grossYen,
      healthStandardBonusYen: healthBase,
      pensionStandardBonusYen: pensionBase,
    });
  }
  const monthlyEmploymentWages =
    plan.compensation.monthlyEmploymentInsuranceWagesYen ??
    (plan.inputMode === "monthly" &&
    plan.compensation.annualOtherTaxableSalaryYen === 0
      ? Array.from(
          { length: 12 },
          () =>
            plan.compensation.monthlyTaxableSalaryYen +
            plan.compensation.monthlyNonTaxableCommutingYen,
        )
      : null);
  if (!monthlyEmploymentWages) {
    return "雇用保険の月別対象賃金（賞与を除く）が未入力です";
  }
  if (monthlyEmploymentWages.some((wage) => wage === null)) {
    return "雇用保険の月別対象賃金（賞与を除く）は12か月すべての入力が必要です";
  }
  let employment = 0;
  for (let month = 1; month <= 12; month += 1) {
    const monthlyWage = monthlyEmploymentWages[month - 1];
    if (monthlyWage === null || monthlyWage === undefined) {
      return "雇用保険の月別対象賃金（賞与を除く）は12か月すべての入力が必要です";
    }
    const date = `2026-${String(month).padStart(2, "0")}-15`;
    const rule = ruleOn(employmentInsuranceRules2026, date);
    const bonuses = plan.compensation.bonuses
      .filter(
        (bonus) =>
          bonus.employmentInsuranceEligible &&
          Number(bonus.paymentDate.slice(5, 7)) === month,
      )
      .reduce((total, bonus) => total + bonus.grossYen, 0);
    employment += payrollRounded(
      add([monthlyWage, bonuses], "employment wage"),
      rule.value.workerNumeratorByCategory[
        plan.employment.employmentInsuranceCategory
      ],
      rule.value.denominator,
    );
    selected.set(rule.metadata.id, rule);
  }
  for (const rule of [
    pensionRule2026,
    healthInsuranceEligibility2026,
    pensionInsuranceEligibility2026,
    healthStandardRemunerationTable,
    pensionStandardRemunerationTable,
    standardBonusRule2026,
  ]) {
    selected.set(rule.metadata.id, rule);
  }
  return {
    health,
    care,
    additional,
    pension,
    employment,
    appliedRules: [...selected.values()].map(applied),
    basis: {
      employerPrefecture: prefecture,
      healthStandardMonthlyRemunerationYen: healthStandard,
      pensionStandardMonthlyRemunerationYen: pensionStandard,
      bonuses: bonusBasis,
    },
  };
}

function emptyResult(
  plan: TakeHomePlan,
  status: TakeHomeResult["status"],
  message: string,
): TakeHomeResult {
  return {
    status,
    planId: plan.id,
    memberId: plan.memberId,
    targetYear: plan.targetYear,
    annualGrossYen: null,
    annualTaxableSalaryYen: null,
    annualNonTaxableCommutingYen: null,
    salaryIncomeYen: null,
    taxableIncomeYen: null,
    nationalIncomeTaxYen: null,
    reconstructionIncomeTaxYen: null,
    residentTaxYen: null,
    healthInsuranceYen: null,
    careInsuranceYen: null,
    additionalInsuranceYen: null,
    pensionYen: null,
    employmentInsuranceYen: null,
    otherStatutoryDeductionYen: 0,
    statutoryDeductionsYen: null,
    annualTakeHomeYen: null,
    averageMonthlyTakeHomeYen: null,
    deductionRatePercent: null,
    incomeTaxBeforeIdecoYen: null,
    incomeTaxAfterIdecoYen: null,
    incomeTaxBenefitFromIdecoYen: null,
    taxableIncomeBeforeIdecoYen: null,
    taxableIncomeAfterIdecoYen: null,
    nationalIncomeTaxBeforeIdecoYen: null,
    nationalIncomeTaxAfterIdecoYen: null,
    reconstructionIncomeTaxBeforeIdecoYen: null,
    reconstructionIncomeTaxAfterIdecoYen: null,
    incomeTaxBeforeIdecoPreRoundedYen: null,
    incomeTaxAfterIdecoPreRoundedYen: null,
    appliedRules: [],
    socialInsuranceBasis: {
      employerPrefecture: null,
      healthStandardMonthlyRemunerationYen: null,
      pensionStandardMonthlyRemunerationYen: null,
      bonuses: [],
    },
    warnings: [message],
    unsupportedConditions: status === "unsupported" ? [message] : [],
    assumptions: [],
  };
}

function taxableAndTax(
  salaryIncome: number,
  social: number,
  ideco: number,
  other: number,
): {
  taxable: number;
  nationalTax: number;
  reconstructionTax: number;
  preRoundedCombinedTax: number;
  combinedTax: number;
} {
  const deduction = add(
    [basicDeductionYen2026(salaryIncome), social, ideco, other],
    "income deductions",
  );
  const unit = taxableIncomeRounding2026.value.unitYen;
  const taxable =
    Math.floor(Math.max(0, salaryIncome - deduction) / unit) * unit;
  const nationalTax = nationalIncomeTaxYen2026(taxable);
  const reconstruction = reconstructionIncomeTax2026.value;
  const reconstructionTax = Number(
    (BigInt(nationalTax) * BigInt(reconstruction.rateNumerator)) /
      BigInt(reconstruction.rateDenominator),
  );
  const preRoundedCombinedTax = add(
    [nationalTax, reconstructionTax],
    "income and reconstruction tax",
  );
  const combinedTax =
    Math.floor(
      preRoundedCombinedTax / reconstruction.finalPaymentRoundingUnitYen,
    ) * reconstruction.finalPaymentRoundingUnitYen;
  return {
    taxable,
    nationalTax,
    reconstructionTax,
    preRoundedCombinedTax,
    combinedTax,
  };
}

export function calculateTakeHome(
  plan: Readonly<TakeHomePlan>,
  member: Readonly<HouseholdMember>,
  linkedIdeco?: Readonly<{
    status:
      | "complete"
      | "invalid"
      | "incomplete"
      | "unsupported"
      | "missing-rule"
      | "out-of-range";
    annualContributionYen: number | null;
    message: string;
  }>,
): TakeHomeResult {
  try {
    if (plan.memberId !== member.id) {
      return emptyResult(plan, "unsupported", "planと人物が一致しません");
    }
    if (plan.mode === "legacy-manual") {
      const annual = checked(
        plan.manualAverageMonthlyTakeHomeYen * 12,
        "legacy annual take-home",
      );
      return {
        ...emptyResult(plan, "complete", "legacy manual value"),
        annualTakeHomeYen: annual,
        averageMonthlyTakeHomeYen: plan.manualAverageMonthlyTakeHomeYen,
        warnings: ["schema v1/v2から移行した手入力値です"],
        assumptions: ["legacy-manual"],
      };
    }
    let annualIdecoContributionYen = plan.deductions.annualIdecoContributionYen;
    if (plan.deductions.idecoContributionMode === "linked") {
      if (!linkedIdeco)
        return emptyResult(plan, "incomplete", "連携iDeCo計画を解決できません");
      if (
        linkedIdeco.status !== "complete" ||
        linkedIdeco.annualContributionYen === null
      ) {
        const status =
          linkedIdeco.status === "invalid" ? "incomplete" : linkedIdeco.status;
        return emptyResult(plan, status, linkedIdeco.message);
      }
      annualIdecoContributionYen = linkedIdeco.annualContributionYen;
    }
    if (plan.targetYear !== SUPPORT_YEAR)
      return emptyResult(
        plan,
        "missing-rule",
        "2026年以外のルールは未登録です",
      );
    if (
      !plan.employment.oneEmployerFullYearConfirmed ||
      !plan.employment.salaryIncomeOnlyConfirmed
    ) {
      return emptyResult(
        plan,
        "unsupported",
        "単一勤務先・通年在籍・給与所得のみが自動計算条件です",
      );
    }
    const annualSalary =
      plan.inputMode === "annual"
        ? plan.compensation.annualTaxableSalaryYen +
          plan.compensation.annualOtherTaxableSalaryYen
        : plan.compensation.monthlyTaxableSalaryYen * 12 +
          plan.compensation.annualOtherTaxableSalaryYen +
          plan.compensation.bonuses.reduce(
            (sum, bonus) => sum + bonus.grossYen,
            0,
          );
    checked(annualSalary, "annual salary");
    if (
      annualSalary > salaryIncomeDeduction2026.value.supportedSalaryMaximumYen
    )
      return emptyResult(
        plan,
        "unsupported",
        "給与収入2000万円超は自動計算対象外です",
      );
    let social: SocialResult;
    if (plan.socialInsurance.mode === "unsupported-uncomputed") {
      return emptyResult(
        plan,
        "unsupported",
        "社会保険の自動計算に対応しない保険者・加入条件です",
      );
    }
    if (plan.socialInsurance.mode === "manual") {
      const manual = plan.socialInsurance.manual;
      if (
        [
          manual.annualHealthInsuranceYen,
          manual.annualCareInsuranceYen,
          manual.annualAdditionalInsuranceYen,
          manual.annualPensionYen,
          manual.annualEmploymentInsuranceYen,
        ].some((value) => value === null)
      ) {
        return emptyResult(
          plan,
          "incomplete",
          "手入力の社会保険料に未入力があります",
        );
      }
      social = {
        health: manual.annualHealthInsuranceYen ?? 0,
        care: manual.annualCareInsuranceYen ?? 0,
        additional: manual.annualAdditionalInsuranceYen ?? 0,
        pension: manual.annualPensionYen ?? 0,
        employment: manual.annualEmploymentInsuranceYen ?? 0,
        appliedRules: [],
        basis: {
          employerPrefecture: null,
          healthStandardMonthlyRemunerationYen: null,
          pensionStandardMonthlyRemunerationYen: null,
          bonuses: [],
        },
      };
    } else {
      const automatic = automaticSocial(plan);
      if (typeof automatic === "string")
        return emptyResult(
          plan,
          automatic.includes("対象外") ? "unsupported" : "incomplete",
          automatic,
        );
      social = automatic;
    }
    let residentTax: number;
    if (plan.residentTax.mode === "manual-annual") {
      if (
        plan.residentTax.annualResidentTaxYen === null &&
        !plan.residentTax.zeroYenConfirmed
      ) {
        return emptyResult(
          plan,
          "incomplete",
          "住民税は手入力または0円確認が必要です",
        );
      }
      residentTax = plan.residentTax.annualResidentTaxYen ?? 0;
    } else return emptyResult(plan, "incomplete", "住民税は自動計算しません");
    const salaryIncome = salaryIncomeYen2026(annualSalary);
    const socialTotal = add(
      [
        social.health,
        social.care,
        social.additional,
        social.pension,
        social.employment,
        plan.socialInsurance.manual.annualOtherStatutoryDeductionYen,
      ],
      "social insurance",
    );
    const beforeIdeco = taxableAndTax(
      salaryIncome,
      socialTotal,
      0,
      plan.deductions.annualOtherIncomeDeductionsYen,
    );
    const afterIdeco = taxableAndTax(
      salaryIncome,
      socialTotal,
      annualIdecoContributionYen,
      plan.deductions.annualOtherIncomeDeductionsYen,
    );
    const annualGross = add(
      [
        annualSalary,
        plan.inputMode === "annual"
          ? plan.compensation.annualNonTaxableCommutingYen
          : plan.compensation.monthlyNonTaxableCommutingYen * 12,
      ],
      "annual gross",
    );
    const deductions = add(
      [afterIdeco.combinedTax, residentTax, socialTotal],
      "statutory deductions",
    );
    const annualTakeHome = checkedSigned(
      annualGross - deductions,
      "annual take-home",
    );
    const rules = [
      salaryIncomeDeduction2026,
      basicDeduction2026,
      taxableIncomeRounding2026,
      incomeTaxBrackets2026,
      reconstructionIncomeTax2026,
      ...incomeDeductionRules2026,
    ].map(applied);
    return {
      status: "complete",
      planId: plan.id,
      memberId: plan.memberId,
      targetYear: plan.targetYear,
      annualGrossYen: annualGross,
      annualTaxableSalaryYen: annualSalary,
      annualNonTaxableCommutingYen: annualGross - annualSalary,
      salaryIncomeYen: salaryIncome,
      taxableIncomeYen: afterIdeco.taxable,
      nationalIncomeTaxYen: afterIdeco.nationalTax,
      reconstructionIncomeTaxYen: afterIdeco.reconstructionTax,
      residentTaxYen: residentTax,
      healthInsuranceYen: social.health,
      careInsuranceYen: social.care,
      additionalInsuranceYen: social.additional,
      pensionYen: social.pension,
      employmentInsuranceYen: social.employment,
      otherStatutoryDeductionYen:
        plan.socialInsurance.manual.annualOtherStatutoryDeductionYen,
      statutoryDeductionsYen: deductions,
      annualTakeHomeYen: annualTakeHome,
      averageMonthlyTakeHomeYen: Math.floor(annualTakeHome / 12),
      deductionRatePercent:
        annualGross === 0
          ? 0
          : Math.round((deductions / annualGross) * 10_000) / 100,
      incomeTaxBeforeIdecoYen: beforeIdeco.combinedTax,
      incomeTaxAfterIdecoYen: afterIdeco.combinedTax,
      incomeTaxBenefitFromIdecoYen: Math.max(
        0,
        beforeIdeco.combinedTax - afterIdeco.combinedTax,
      ),
      taxableIncomeBeforeIdecoYen: beforeIdeco.taxable,
      taxableIncomeAfterIdecoYen: afterIdeco.taxable,
      nationalIncomeTaxBeforeIdecoYen: beforeIdeco.nationalTax,
      nationalIncomeTaxAfterIdecoYen: afterIdeco.nationalTax,
      reconstructionIncomeTaxBeforeIdecoYen: beforeIdeco.reconstructionTax,
      reconstructionIncomeTaxAfterIdecoYen: afterIdeco.reconstructionTax,
      incomeTaxBeforeIdecoPreRoundedYen: beforeIdeco.preRoundedCombinedTax,
      incomeTaxAfterIdecoPreRoundedYen: afterIdeco.preRoundedCombinedTax,
      appliedRules: [...rules, ...social.appliedRules],
      socialInsuranceBasis: social.basis,
      warnings: [
        "概算です。給与明細・年末調整・確定申告・住民税決定通知と差が生じる場合があります",
        "iDeCo掛金の制度上限は未検証です",
        "iDeCoによる住民税軽減額は未計算です",
        ...(plan.socialInsurance.standardRemunerationMode ===
        "estimate-from-remuneration"
          ? ["標準報酬月額は入力した報酬月額からの概算です"]
          : []),
      ],
      unsupportedConditions: [],
      assumptions: [
        "単一勤務先",
        "通年在籍",
        "給与所得のみ",
        "住民税は手入力",
        `事業所都道府県:${plan.socialInsurance.employerPrefecture ?? "手入力保険料"}`,
      ],
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("missing rule")) {
      return emptyResult(plan, "missing-rule", error.message);
    }
    return emptyResult(
      plan,
      "out-of-range",
      error instanceof Error ? error.message : "計算範囲外です",
    );
  }
}
