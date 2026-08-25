/**
 * Salary-income conversion used only by the bounded 2026 cash-year resident
 * tax estimate. It intentionally does not replace the 2026 income-tax rule.
 *
 * Source: National Tax Agency, No.1410 (令和7年分以降):
 * https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 */
export const residentTaxSalaryIncomeRule2025 = {
  targetYear: 2025 as const,
  supportedSalaryMaximumYen: 20_000_000,
  sourceTitle: "令和7年分以降の給与所得控除（住民税概算用）",
  sourceUrl: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm",
} as const;

function checkedSalary(salaryYen: number): void {
  if (
    !Number.isSafeInteger(salaryYen) ||
    salaryYen < 0 ||
    salaryYen > residentTaxSalaryIncomeRule2025.supportedSalaryMaximumYen
  ) {
    throw new RangeError("resident-tax salary is outside the supported range");
  }
}

function transformedSalaryIncome(
  salaryYen: number,
  numerator: number,
  denominator: number,
  adjustmentYen: number,
  roundToThousands = true,
): number {
  const base = roundToThousands
    ? Math.floor(salaryYen / 4_000) * 1_000
    : salaryYen;
  return (
    Number((BigInt(base) * BigInt(numerator)) / BigInt(denominator)) +
    adjustmentYen
  );
}

/**
 * Return salary income after the 2025 salary-income deduction table.
 * Amounts below 6.6 million use the same thousand-yen table granularity as
 * the tax calculator's existing 2026 helper; higher amounts use the official
 * quick formulas.
 */
export function salaryIncomeYen2025ForResidentTax(salaryYen: number): number {
  checkedSalary(salaryYen);
  if (salaryYen <= 650_999) return 0;
  if (salaryYen <= 1_900_000) return salaryYen - 650_000;
  if (salaryYen <= 3_599_999)
    return transformedSalaryIncome(salaryYen, 28, 10, -80_000);
  if (salaryYen <= 6_599_999)
    return transformedSalaryIncome(salaryYen, 32, 10, -440_000);
  if (salaryYen <= 8_499_999)
    return transformedSalaryIncome(salaryYen, 9, 10, -1_100_000, false);
  return salaryYen - 1_950_000;
}
