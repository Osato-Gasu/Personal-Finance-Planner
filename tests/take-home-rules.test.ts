import { describe, expect, it } from "vitest";
import {
  basicDeductionYen2026,
  calculateTakeHome,
  nationalIncomeTaxYen2026,
  salaryIncomeYen2026,
  socialInsuranceEligibilityMonths2026,
} from "../src/domain/take-home-calculator";
import { createCalculatedTakeHomePlan } from "../src/domain/take-home-plan";
import { takeHomeRulePackage2026 } from "../src/rules/jp/take-home/manifest";
import { RULE_VERIFIED_AT } from "../src/rules/jp/take-home/metadata";
import { validateTakeHomeRulePackage } from "../src/rules/jp/take-home/validator";
import { prefectures } from "../src/rules/jp/take-home/social-insurance/rules-2026";

const member = {
  id: "self",
  role: "self" as const,
  displayName: "本人",
  active: true,
  birthDate: "1990-01-01",
  residencePrefecture: "JP-13",
};

function manualPlan(salaryYen: number) {
  const plan = createCalculatedTakeHomePlan({
    id: "plan",
    memberId: member.id,
    birthDate: member.birthDate,
    residencePrefecture: "JP-13",
  });
  plan.compensation.annualTaxableSalaryYen = salaryYen;
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

describe("2026 fixed rule package", () => {
  it("validates every rule and all 47 prefectures", () => {
    expect(validateTakeHomeRulePackage(takeHomeRulePackage2026)).toEqual({
      ruleCount: takeHomeRulePackage2026.allRules.length,
      prefectureCount: 47,
    });
    expect(prefectures).toHaveLength(47);
  });

  it("contains complete official-source metadata", () => {
    for (const rule of takeHomeRulePackage2026.allRules) {
      expect(rule.metadata.verifiedAt).toBe(RULE_VERIFIED_AT);
      expect(rule.metadata.sourceUrls.length).toBeGreaterThan(0);
      expect(
        rule.metadata.sourceUrls.every((url) => url.startsWith("https://")),
      ).toBe(true);
      expect(rule.metadata.effectiveFrom).toMatch(/^2026-/);
      expect(rule.metadata.effectiveTo).toMatch(/^2026-/);
    }
  });

  it("rejects missing official source metadata", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    const first = rules.allRules[0];
    if (!first) throw new Error("fixture rule is missing");
    (first.metadata.sourceUrls as string[]).length = 0;
    expect(() => validateTakeHomeRulePackage(rules)).toThrow("sourceUrls");
  });

  it("rejects an HTTPS source outside the official publisher domain", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    const first = rules.allRules[0];
    if (!first) throw new Error("fixture rule is missing");
    Reflect.set(first.metadata, "sourceUrls", ["https://example.com/rule"]);
    expect(() => validateTakeHomeRulePackage(rules)).toThrow(
      "publisher mismatch",
    );
  });

  it("rejects an invalid effective basis", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    const first = rules.allRules[0];
    if (!first) throw new Error("fixture rule is missing");
    (first.metadata as { effectiveBasis: string }).effectiveBasis = "unknown";
    expect(() => validateTakeHomeRulePackage(rules)).toThrow("effective basis");
  });

  it("rejects incomplete prefecture coverage", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    const health = rules.healthInsuranceRules[0];
    if (!health) throw new Error("fixture health rule is missing");
    Reflect.deleteProperty(health.value.fullRateNumeratorByPrefecture, "JP-47");
    expect(() => validateTakeHomeRulePackage(rules)).toThrow(
      "prefecture coverage",
    );
  });

  it("rejects overlapping rule periods", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    const second = rules.healthInsuranceRules[1];
    if (!second) throw new Error("fixture health rule is missing");
    second.metadata.effectiveFrom = "2026-02-28";
    expect(() => validateTakeHomeRulePackage(rules)).toThrow(
      "overlapping-rule",
    );
  });

  it("rejects a missing grade even when both standard-remuneration arrays are shortened", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    Reflect.set(
      rules.healthStandardRemunerationTable.value,
      "lowerBoundsYen",
      rules.healthStandardRemunerationTable.value.lowerBoundsYen.filter(
        (_, index) => index !== 10,
      ),
    );
    Reflect.set(
      rules.healthStandardRemunerationTable.value,
      "standardMonthlyValuesYen",
      rules.healthStandardRemunerationTable.value.standardMonthlyValuesYen.filter(
        (_, index) => index !== 10,
      ),
    );
    expect(() => validateTakeHomeRulePackage(rules)).toThrow(
      "official 2026 table",
    );
  });

  it("rejects modified standard-remuneration boundaries and values", () => {
    const boundary = structuredClone(takeHomeRulePackage2026);
    Reflect.set(
      boundary.pensionStandardRemunerationTable.value,
      "lowerBoundsYen",
      [
        0,
        92_000,
        ...boundary.pensionStandardRemunerationTable.value.lowerBoundsYen.slice(
          2,
        ),
      ],
    );
    expect(() => validateTakeHomeRulePackage(boundary)).toThrow(
      "official 2026 table",
    );
    const value = structuredClone(takeHomeRulePackage2026);
    Reflect.set(
      value.healthStandardRemunerationTable.value,
      "standardMonthlyValuesYen",
      [
        ...value.healthStandardRemunerationTable.value.standardMonthlyValuesYen.slice(
          0,
          49,
        ),
        1_400_000,
      ],
    );
    expect(() => validateTakeHomeRulePackage(value)).toThrow(
      "official 2026 table",
    );
  });

  it("rejects a modified standard-remuneration official identity", () => {
    const rules = structuredClone(takeHomeRulePackage2026);
    rules.healthStandardRemunerationTable.metadata.id = "replacement";
    expect(() => validateTakeHomeRulePackage(rules)).toThrow(
      "official identity",
    );
  });

  it.each([
    [0, 0],
    [740_999, 0],
    [741_000, 1_000],
    [2_190_999, 1_450_999],
    [2_191_000, 1_451_000],
    [2_193_000, 1_453_000],
    [2_196_000, 1_456_000],
    [2_200_000, 1_460_000],
    [3_600_000, 2_440_000],
    [6_600_000, 4_840_000],
    [8_500_000, 6_550_000],
    [20_000_000, 18_050_000],
  ])("calculates salary income at %i", (salary, expected) => {
    expect(salaryIncomeYen2026(salary)).toBe(expected);
  });

  it.each([
    [4_890_000, 1_040_000],
    [4_890_001, 670_000],
    [6_550_000, 670_000],
    [6_550_001, 620_000],
    [23_500_001, 480_000],
    [24_000_001, 320_000],
    [24_500_001, 160_000],
    [25_000_001, 0],
  ])("selects the basic deduction at %i", (income, expected) => {
    expect(basicDeductionYen2026(income)).toBe(expected);
  });

  it.each([
    [0, 0],
    [1_949_000, 97_450],
    [1_950_000, 97_500],
    [3_300_000, 232_500],
    [6_950_000, 962_500],
    [9_000_000, 1_434_000],
    [18_000_000, 4_404_000],
    [40_000_000, 13_204_000],
  ])("calculates progressive income tax at %i", (income, expected) => {
    expect(nationalIncomeTaxYen2026(income)).toBe(expected);
  });

  it("produces a deterministic manual-social golden result", () => {
    const result = calculateTakeHome(manualPlan(6_000_000), member);
    expect(result).toMatchObject({
      status: "complete",
      annualGrossYen: 6_000_000,
      salaryIncomeYen: 4_360_000,
      taxableIncomeYen: 3_320_000,
      nationalIncomeTaxYen: 236_500,
      reconstructionIncomeTaxYen: 4_966,
      incomeTaxBeforeIdecoPreRoundedYen: 241_466,
      incomeTaxBeforeIdecoYen: 241_400,
      annualTakeHomeYen: 5_758_600,
      averageMonthlyTakeHomeYen: 479_883,
    });
  });

  it("shows the iDeCo income-tax difference", () => {
    const plan = manualPlan(6_000_000);
    plan.deductions.annualIdecoContributionYen = 240_000;
    const result = calculateTakeHome(plan, member);
    expect(result).toMatchObject({
      taxableIncomeBeforeIdecoYen: 3_320_000,
      nationalIncomeTaxBeforeIdecoYen: 236_500,
      reconstructionIncomeTaxBeforeIdecoYen: 4_966,
      incomeTaxBeforeIdecoPreRoundedYen: 241_466,
      incomeTaxBeforeIdecoYen: 241_400,
      taxableIncomeAfterIdecoYen: 3_080_000,
      nationalIncomeTaxAfterIdecoYen: 210_500,
      reconstructionIncomeTaxAfterIdecoYen: 4_420,
      incomeTaxAfterIdecoPreRoundedYen: 214_920,
      incomeTaxAfterIdecoYen: 214_900,
      incomeTaxBenefitFromIdecoYen: 26_500,
    });
  });

  it("recalculates both iDeCo paths across the final 100-yen boundary", () => {
    const plan = manualPlan(6_000_000);
    plan.deductions.annualIdecoContributionYen = 1_000;
    const result = calculateTakeHome(plan, member);
    expect(result.incomeTaxBeforeIdecoYen).toBe(241_400);
    expect(result.incomeTaxAfterIdecoYen).toBe(241_200);
    expect(result.incomeTaxBenefitFromIdecoYen).toBe(200);
  });

  it("treats annual salary as bonus-inclusive without double counting", () => {
    const plan = manualPlan(6_000_000);
    plan.compensation.bonuses = [
      {
        id: "summer",
        paymentDate: "2026-06-30",
        grossYen: 500_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ];
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("complete");
    expect(result.annualTaxableSalaryYen).toBe(6_000_000);
    expect(result.annualGrossYen).toBe(6_000_000);
  });

  it("requires monthly remuneration evidence for annual-mode automatic insurance", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.standardRemunerationMode =
      "estimate-from-remuneration";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = null;
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("incomplete");
    expect(result.warnings).toContain("標準報酬月額または報酬月額が未入力です");
  });

  it("calculates Tokyo 2026 month-specific insurance rates", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.standardRemunerationMode =
      "estimate-from-remuneration";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyTaxableSalaryYen = 500_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    const result = calculateTakeHome(plan, member);
    expect(result).toMatchObject({
      status: "complete",
      healthInsuranceYen: 177_480,
      careInsuranceYen: 0,
      additionalInsuranceYen: 3_105,
      pensionYen: 329_400,
      employmentInsuranceYen: 30_750,
      socialInsuranceBasis: {
        employerPrefecture: "JP-13",
        healthStandardMonthlyRemunerationYen: 300_000,
        pensionStandardMonthlyRemunerationYen: 300_000,
        bonuses: [],
      },
    });
    expect(result.appliedRules).toContainEqual(
      expect.objectContaining({
        id: "jp-kyokai-health-rate-2026",
        contextKey: "kyokai:all-prefectures",
        effectiveBasis: "salary-month",
        verifiedAt: RULE_VERIFIED_AT,
        sourcePublisher: "全国健康保険協会",
      }),
    );
  });

  it("requires actual monthly employment-insurance wages in annual mode", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    expect(calculateTakeHome(plan, member)).toMatchObject({
      status: "incomplete",
      warnings: ["雇用保険の月別対象賃金（賞与を除く）が未入力です"],
    });
  });

  it("uses month-specific employment wages, eligible bonuses, and statutory rounding", () => {
    const plan = manualPlan(2_300_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 200_000;
    plan.compensation.annualOtherTaxableSalaryYen = 100_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = [
      100_000, 100_000, 100_000, 200_000, 200_000, 200_000, 200_000, 200_000,
      200_000, 200_000, 200_000, 200_000,
    ];
    plan.compensation.bonuses = [
      {
        id: "eligible",
        paymentDate: "2026-01-31",
        grossYen: 100_000,
        socialInsuranceEligible: false,
        employmentInsuranceEligible: true,
      },
      {
        id: "not-eligible",
        paymentDate: "2026-04-30",
        grossYen: 100_000,
        socialInsuranceEligible: false,
        employmentInsuranceEligible: false,
      },
    ];
    expect(calculateTakeHome(plan, member).employmentInsuranceYen).toBe(11_200);
  });

  it("resets the health standard-bonus cap at the April fiscal boundary", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.standardRemunerationMode =
      "estimate-from-remuneration";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.socialInsurance.healthBonusPriorFiscalYearCumulativeYen = 5_630_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    plan.compensation.bonuses = [
      {
        id: "april",
        paymentDate: "2026-04-30",
        grossYen: 200_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
      {
        id: "january",
        paymentDate: "2026-01-31",
        grossYen: 200_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: true,
      },
    ];
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("complete");
    expect(result.socialInsuranceBasis.bonuses).toEqual([
      expect.objectContaining({
        bonusId: "january",
        healthStandardBonusYen: 100_000,
        pensionStandardBonusYen: 200_000,
      }),
      expect.objectContaining({
        bonusId: "april",
        healthStandardBonusYen: 200_000,
        pensionStandardBonusYen: 200_000,
      }),
    ]);
  });

  it("starts care insurance in the month containing the day before age 40", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyTaxableSalaryYen = 500_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    plan.compensation.bonuses = [
      {
        id: "before-care",
        paymentDate: "2026-05-31",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
      {
        id: "during-care",
        paymentDate: "2026-06-30",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
    ];
    plan.birthDate = "1986-06-02";
    const result = calculateTakeHome(plan, member);
    expect(result.careInsuranceYen).toBe(17_820);
  });

  it("resolves the 40, 65, 70, and 75 age boundaries by statutory month", () => {
    expect(socialInsuranceEligibilityMonths2026("1986-06-02").care).toEqual([
      6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(socialInsuranceEligibilityMonths2026("1961-06-02").care).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(socialInsuranceEligibilityMonths2026("1956-06-02").pension).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(socialInsuranceEligibilityMonths2026("1951-06-02").health).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("applies the age-70 pension boundary to salary and bonus", () => {
    const plan = manualPlan(6_000_000);
    plan.birthDate = "1956-06-02";
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    plan.compensation.bonuses = [
      {
        id: "before-loss-month",
        paymentDate: "2026-05-31",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
      {
        id: "loss-month",
        paymentDate: "2026-06-30",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
    ];
    expect(calculateTakeHome(plan, member).pensionYen).toBe(146_400);
  });

  it("does not complete the age-75 transition year without later medical premiums", () => {
    const plan = manualPlan(6_000_000);
    plan.birthDate = "1951-06-02";
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    plan.compensation.bonuses = [
      {
        id: "before-loss-month",
        paymentDate: "2026-05-31",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
      {
        id: "loss-month",
        paymentDate: "2026-06-30",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
    ];
    expect(calculateTakeHome(plan, member)).toMatchObject({
      status: "unsupported",
      annualTakeHomeYen: null,
      averageMonthlyTakeHomeYen: null,
      unsupportedConditions: [
        "2026年中の75歳到達後に必要な後期高齢者医療保険料は自動計算対象外です",
      ],
    });
    plan.socialInsurance.mode = "manual";
    plan.socialInsurance.standardRemunerationMode = "manual-total";
    plan.socialInsurance.manual.annualHealthInsuranceYen = 240_000;
    plan.socialInsurance.manual.annualCareInsuranceYen = 120_000;
    expect(calculateTakeHome(plan, member)).toMatchObject({
      status: "complete",
      healthInsuranceYen: 240_000,
      careInsuranceYen: 120_000,
    });
  });

  it("does not infer kyokai or voluntary pension deductions above age limits", () => {
    const age70 = manualPlan(6_000_000);
    age70.birthDate = "1955-12-31";
    age70.socialInsurance.mode = "kyokai-auto";
    age70.socialInsurance.employerPrefecture = "JP-13";
    age70.socialInsurance.monthlyRemunerationYen = 300_000;
    age70.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    expect(calculateTakeHome(age70, member)).toMatchObject({
      status: "complete",
      pensionYen: 0,
    });
    const age75 = structuredClone(age70);
    age75.birthDate = "1950-12-31";
    expect(calculateTakeHome(age75, member)).toMatchObject({
      status: "unsupported",
      healthInsuranceYen: null,
    });
  });

  it("does not complete the age-65 transition year without later care premiums", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "kyokai-auto";
    plan.socialInsurance.employerPrefecture = "JP-13";
    plan.socialInsurance.monthlyRemunerationYen = 300_000;
    plan.compensation.monthlyEmploymentInsuranceWagesYen = Array.from(
      { length: 12 },
      () => 500_000,
    );
    plan.compensation.bonuses = [
      {
        id: "before-care-end",
        paymentDate: "2026-05-31",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
      {
        id: "after-care-end",
        paymentDate: "2026-06-30",
        grossYen: 100_000,
        socialInsuranceEligible: true,
        employmentInsuranceEligible: false,
      },
    ];
    plan.birthDate = "1961-06-02";
    expect(calculateTakeHome(plan, member)).toMatchObject({
      status: "unsupported",
      annualTakeHomeYen: null,
      averageMonthlyTakeHomeYen: null,
      unsupportedConditions: [
        "2026年中の65歳到達後に必要な第1号介護保険料は自動計算対象外です",
      ],
    });
    plan.socialInsurance.mode = "manual";
    plan.socialInsurance.standardRemunerationMode = "manual-total";
    plan.socialInsurance.manual.annualHealthInsuranceYen = 240_000;
    plan.socialInsurance.manual.annualCareInsuranceYen = 120_000;
    expect(calculateTakeHome(plan, member)).toMatchObject({
      status: "complete",
      healthInsuranceYen: 240_000,
      careInsuranceYen: 120_000,
    });
  });

  it("keeps resident tax explicitly uncomputed", () => {
    const plan = manualPlan(6_000_000);
    plan.residentTax.mode = "unsupported-uncomputed";
    expect(calculateTakeHome(plan, member).status).toBe("incomplete");
  });

  it("returns missing-rule outside 2026", () => {
    const plan = manualPlan(6_000_000);
    plan.targetYear = 2027;
    expect(calculateTakeHome(plan, member).status).toBe("missing-rule");
  });

  it("returns unsupported above 20 million yen", () => {
    expect(calculateTakeHome(manualPlan(20_000_001), member).status).toBe(
      "unsupported",
    );
  });

  it("returns unsupported for employment outside the confirmed scope", () => {
    const plan = manualPlan(6_000_000);
    plan.employment.oneEmployerFullYearConfirmed = false;
    expect(calculateTakeHome(plan, member).status).toBe("unsupported");
  });

  it("returns incomplete when manual social insurance has a missing field", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.manual.annualPensionYen = null;
    expect(calculateTakeHome(plan, member).status).toBe("incomplete");
  });

  it("keeps unsupported social insurance distinct with a concrete condition", () => {
    const plan = manualPlan(6_000_000);
    plan.socialInsurance.mode = "unsupported-uncomputed";
    const result = calculateTakeHome(plan, member);
    expect(result.status).toBe("unsupported");
    expect(result.unsupportedConditions).toEqual([
      "社会保険の自動計算に対応しない保険者・加入条件です",
    ]);
  });

  it("preserves a migrated legacy manual result", () => {
    const result = calculateTakeHome(
      {
        id: "legacy",
        memberId: member.id,
        targetYear: null,
        mode: "legacy-manual",
        manualAverageMonthlyTakeHomeYen: 321_000,
        active: true,
      },
      member,
    );
    expect(result).toMatchObject({
      status: "complete",
      annualTakeHomeYen: 3_852_000,
      averageMonthlyTakeHomeYen: 321_000,
    });
  });
});
