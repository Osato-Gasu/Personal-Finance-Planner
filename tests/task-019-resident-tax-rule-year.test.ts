import { describe, expect, it } from "vitest";
import { salaryIncomeYen2026 } from "../src/domain/take-home-calculator";
import { estimateCurrentYearResidentTaxYen } from "../src/domain/take-home-current-context";
import {
  residentTaxSalaryIncomeRule2025,
  salaryIncomeYen2025ForResidentTax,
} from "../src/rules/jp/take-home/resident-tax-salary-income-2025";

describe("TASK-019 resident-tax salary rule year", () => {
  it("uses the 2025 salary-income deduction for the 2026 cash-year estimate", () => {
    expect(residentTaxSalaryIncomeRule2025.targetYear).toBe(2025);
    expect(salaryIncomeYen2025ForResidentTax(1_500_000)).toBe(850_000);
    expect(
      estimateCurrentYearResidentTaxYen({
        annualTaxableSalaryYen: 1_500_000,
        annualSocialInsuranceYen: 0,
        annualIdecoContributionYen: 0,
      }),
    ).toBe(42_000);
  });

  it("keeps the existing 2026 salary-income conversion unchanged", () => {
    expect(salaryIncomeYen2026(1_500_000)).toBe(760_000);
  });

  it("keeps the bounded 2025 rule continuous at the official bands", () => {
    expect(salaryIncomeYen2025ForResidentTax(1_900_000)).toBe(1_250_000);
    expect(salaryIncomeYen2025ForResidentTax(1_900_001)).toBe(1_250_000);
    expect(salaryIncomeYen2025ForResidentTax(3_600_000)).toBe(2_440_000);
    expect(salaryIncomeYen2025ForResidentTax(6_600_000)).toBe(4_840_000);
    expect(salaryIncomeYen2025ForResidentTax(8_500_000)).toBe(6_550_000);
  });
});
