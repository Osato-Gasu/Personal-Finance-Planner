import { metadata, type RuleRecord } from "../metadata";

export interface SalaryIncomeDeductionRuleValue {
  targetYear: 2026;
  supportedSalaryMaximumYen: 20_000_000;
  bands: readonly SalaryIncomeBand[];
}

export type SalaryIncomeBand =
  | { maximumYen: number; formula: "zero" }
  | { maximumYen: number; formula: "subtract"; amountYen: number }
  | { maximumYen: number; formula: "fixed"; amountYen: number }
  | {
      maximumYen: number;
      formula: "quarter-step";
      numerator: number;
      denominator: number;
      adjustmentYen: number;
    }
  | {
      maximumYen: number;
      formula: "percentage";
      numerator: number;
      denominator: number;
      adjustmentYen: number;
    };

export interface BasicDeductionBand {
  incomeMaximumYen: number | null;
  deductionYen: number;
}

export interface IncomeTaxBracket {
  taxableIncomeMinimumYen: number;
  taxableIncomeMaximumYen: number | null;
  rateNumerator: number;
  rateDenominator: 100;
  deductionYen: number;
}

const ntaTaxReformUrl =
  "https://www.nta.go.jp/publication/pamph/gensen/2026kaisei.pdf";
const ntaTaxOverviewUrl =
  "https://www.nta.go.jp/publication/pamph/koho/kurashi/html/01_1.htm";
const ntaSalaryUrl =
  "https://www.nta.go.jp/publication/pamph/koho/kurashi/html/02_1.htm";

export const salaryIncomeDeduction2026: RuleRecord<SalaryIncomeDeductionRuleValue> =
  {
    metadata: metadata({
      id: "jp-income-tax-salary-income-deduction-2026",
      domain: "salary-income-deduction",
      contextKey: "tax-year:2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "tax-year",
      status: "current",
      publishedAt: "2026-04-01",
      sourceTitle: "令和8年度税制改正による給与所得控除の最低保障額引上げ",
      sourceUrls: [ntaTaxReformUrl, ntaSalaryUrl],
      sourcePublisher: "国税庁",
      notes:
        "令和8・9年分の最低保障額74万円と年末調整等の給与所得控除後金額表を使用する。",
    }),
    value: {
      targetYear: 2026,
      supportedSalaryMaximumYen: 20_000_000,
      bands: [
        { maximumYen: 740_999, formula: "zero" },
        { maximumYen: 2_190_999, formula: "subtract", amountYen: 740_000 },
        { maximumYen: 2_192_999, formula: "fixed", amountYen: 1_451_000 },
        { maximumYen: 2_195_999, formula: "fixed", amountYen: 1_453_000 },
        { maximumYen: 2_199_999, formula: "fixed", amountYen: 1_456_000 },
        {
          maximumYen: 3_599_999,
          formula: "quarter-step",
          numerator: 28,
          denominator: 10,
          adjustmentYen: -80_000,
        },
        {
          maximumYen: 6_599_999,
          formula: "quarter-step",
          numerator: 32,
          denominator: 10,
          adjustmentYen: -440_000,
        },
        {
          maximumYen: 8_499_999,
          formula: "percentage",
          numerator: 9,
          denominator: 10,
          adjustmentYen: -1_100_000,
        },
        { maximumYen: 20_000_000, formula: "subtract", amountYen: 1_950_000 },
      ],
    },
  };

export const basicDeduction2026: RuleRecord<readonly BasicDeductionBand[]> = {
  metadata: metadata({
    id: "jp-income-tax-basic-deduction-2026",
    domain: "basic-deduction",
    contextKey: "tax-year:2026:resident",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "tax-year",
    status: "current",
    publishedAt: "2026-04-01",
    sourceTitle: "令和8年度税制改正による所得税の基礎控除引上げ",
    sourceUrls: [ntaTaxReformUrl, ntaTaxOverviewUrl],
    sourcePublisher: "国税庁",
    notes:
      "令和8年分は合計所得489万円以下104万円、655万円以下67万円、2350万円以下62万円。2350万円超の従来逓減も保持する。",
  }),
  value: [
    { incomeMaximumYen: 4_890_000, deductionYen: 1_040_000 },
    { incomeMaximumYen: 6_550_000, deductionYen: 670_000 },
    { incomeMaximumYen: 23_500_000, deductionYen: 620_000 },
    { incomeMaximumYen: 24_000_000, deductionYen: 480_000 },
    { incomeMaximumYen: 24_500_000, deductionYen: 320_000 },
    { incomeMaximumYen: 25_000_000, deductionYen: 160_000 },
    { incomeMaximumYen: null, deductionYen: 0 },
  ],
};

export const taxableIncomeRounding2026: RuleRecord<{
  unitYen: 1000;
  mode: "floor";
}> = {
  metadata: metadata({
    id: "jp-income-tax-taxable-income-floor-1000-2026",
    domain: "taxable-income-rounding",
    contextKey: "tax-year:2026",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "tax-year",
    status: "current",
    publishedAt: "2026-04-01",
    sourceTitle: "所得税のしくみ（課税所得金額の千円未満切捨て）",
    sourceUrls: [ntaSalaryUrl],
    sourcePublisher: "国税庁",
    notes: "所得控除後の課税所得金額は1000円未満を切り捨てる。",
  }),
  value: { unitYen: 1000, mode: "floor" },
};

export const incomeTaxBrackets2026: RuleRecord<readonly IncomeTaxBracket[]> = {
  metadata: metadata({
    id: "jp-national-income-tax-brackets-2026",
    domain: "national-income-tax-brackets",
    contextKey: "tax-year:2026",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "tax-year",
    status: "current",
    publishedAt: "2026-04-01",
    sourceTitle: "令和8年分所得税の税額表",
    sourceUrls: [ntaSalaryUrl, ntaTaxOverviewUrl],
    sourcePublisher: "国税庁",
    notes: "課税所得に対する5%から45%の7段階速算表。",
  }),
  value: [
    {
      taxableIncomeMinimumYen: 1000,
      taxableIncomeMaximumYen: 1_949_000,
      rateNumerator: 5,
      rateDenominator: 100,
      deductionYen: 0,
    },
    {
      taxableIncomeMinimumYen: 1_950_000,
      taxableIncomeMaximumYen: 3_299_000,
      rateNumerator: 10,
      rateDenominator: 100,
      deductionYen: 97_500,
    },
    {
      taxableIncomeMinimumYen: 3_300_000,
      taxableIncomeMaximumYen: 6_949_000,
      rateNumerator: 20,
      rateDenominator: 100,
      deductionYen: 427_500,
    },
    {
      taxableIncomeMinimumYen: 6_950_000,
      taxableIncomeMaximumYen: 8_999_000,
      rateNumerator: 23,
      rateDenominator: 100,
      deductionYen: 636_000,
    },
    {
      taxableIncomeMinimumYen: 9_000_000,
      taxableIncomeMaximumYen: 17_999_000,
      rateNumerator: 33,
      rateDenominator: 100,
      deductionYen: 1_536_000,
    },
    {
      taxableIncomeMinimumYen: 18_000_000,
      taxableIncomeMaximumYen: 39_999_000,
      rateNumerator: 40,
      rateDenominator: 100,
      deductionYen: 2_796_000,
    },
    {
      taxableIncomeMinimumYen: 40_000_000,
      taxableIncomeMaximumYen: null,
      rateNumerator: 45,
      rateDenominator: 100,
      deductionYen: 4_796_000,
    },
  ],
};

export const reconstructionIncomeTax2026: RuleRecord<{
  rateNumerator: 21;
  rateDenominator: 1000;
  finalPaymentRoundingUnitYen: 100;
}> = {
  metadata: metadata({
    id: "jp-reconstruction-special-income-tax-2026",
    domain: "reconstruction-special-income-tax",
    contextKey: "tax-year:2026",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "tax-year",
    status: "current",
    publishedAt: "2026-04-01",
    sourceTitle: "所得税及び復興特別所得税の計算",
    sourceUrls: [ntaSalaryUrl],
    sourcePublisher: "国税庁",
    notes:
      "基準所得税額の2.1%。所得税との合計額について100円未満を切り捨てる。",
  }),
  value: {
    rateNumerator: 21,
    rateDenominator: 1000,
    finalPaymentRoundingUnitYen: 100,
  },
};

export const incomeDeductionRules2026 = [
  {
    metadata: metadata({
      id: "jp-social-insurance-income-deduction-2026",
      domain: "social-insurance-income-deduction",
      contextKey: "tax-year:2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "tax-year",
      status: "current",
      publishedAt: "2026-04-01",
      sourceTitle: "所得控除（社会保険料控除）",
      sourceUrls: [ntaSalaryUrl],
      sourcePublisher: "国税庁",
      notes: "本人が負担した年間社会保険料を所得控除へ算入する。",
    }),
    value: { mode: "actual-employee-contribution" as const },
  },
  {
    metadata: metadata({
      id: "jp-ideco-income-deduction-2026",
      domain: "ideco-income-deduction",
      contextKey: "tax-year:2026",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "tax-year",
      status: "current",
      publishedAt: "2026-04-01",
      sourceTitle: "所得控除（小規模企業共済等掛金控除）",
      sourceUrls: [ntaSalaryUrl],
      sourcePublisher: "国税庁",
      notes:
        "入力されたiDeCo掛金相当額を所得控除へ算入する。上限判定は行わない。",
    }),
    value: { mode: "actual-contribution" as const },
  },
] as const;

export const incomeTaxRules2026 = [
  salaryIncomeDeduction2026,
  basicDeduction2026,
  taxableIncomeRounding2026,
  incomeTaxBrackets2026,
  reconstructionIncomeTax2026,
  ...incomeDeductionRules2026,
] as const;
