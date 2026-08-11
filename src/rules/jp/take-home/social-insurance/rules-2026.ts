import { metadata, type RuleRecord } from "../metadata";

export const prefectures = [
  ["JP-01", "北海道"],
  ["JP-02", "青森県"],
  ["JP-03", "岩手県"],
  ["JP-04", "宮城県"],
  ["JP-05", "秋田県"],
  ["JP-06", "山形県"],
  ["JP-07", "福島県"],
  ["JP-08", "茨城県"],
  ["JP-09", "栃木県"],
  ["JP-10", "群馬県"],
  ["JP-11", "埼玉県"],
  ["JP-12", "千葉県"],
  ["JP-13", "東京都"],
  ["JP-14", "神奈川県"],
  ["JP-15", "新潟県"],
  ["JP-16", "富山県"],
  ["JP-17", "石川県"],
  ["JP-18", "福井県"],
  ["JP-19", "山梨県"],
  ["JP-20", "長野県"],
  ["JP-21", "岐阜県"],
  ["JP-22", "静岡県"],
  ["JP-23", "愛知県"],
  ["JP-24", "三重県"],
  ["JP-25", "滋賀県"],
  ["JP-26", "京都府"],
  ["JP-27", "大阪府"],
  ["JP-28", "兵庫県"],
  ["JP-29", "奈良県"],
  ["JP-30", "和歌山県"],
  ["JP-31", "鳥取県"],
  ["JP-32", "島根県"],
  ["JP-33", "岡山県"],
  ["JP-34", "広島県"],
  ["JP-35", "山口県"],
  ["JP-36", "徳島県"],
  ["JP-37", "香川県"],
  ["JP-38", "愛媛県"],
  ["JP-39", "高知県"],
  ["JP-40", "福岡県"],
  ["JP-41", "佐賀県"],
  ["JP-42", "長崎県"],
  ["JP-43", "熊本県"],
  ["JP-44", "大分県"],
  ["JP-45", "宮崎県"],
  ["JP-46", "鹿児島県"],
  ["JP-47", "沖縄県"],
] as const;

export type PrefectureCode = (typeof prefectures)[number][0];
export type EmploymentInsuranceCategory =
  "general" | "agriculture-forestry-fishery-sake" | "construction";

export interface KyokaiHealthRateValue {
  fullRateDenominator: 10_000;
  fullRateNumeratorByPrefecture: Readonly<Record<PrefectureCode, number>>;
  employeeShare: "one-half-with-payroll-rounding";
}

function prefectureRates(
  values: readonly number[],
): Record<PrefectureCode, number> {
  if (values.length !== prefectures.length) {
    throw new Error("prefecture rate source must contain 47 values");
  }
  return Object.fromEntries(
    prefectures.map(([code], index) => [code, values[index]]),
  ) as Record<PrefectureCode, number>;
}

const kyokaiRatePage2025 =
  "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r07/index.html";
const kyokaiRatePage2026 =
  "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08/index.html";
const kyokaiPremiumTable2026 =
  "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/premium_prefectures/r08/";
const kyokaiCareRatePage =
  "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/002/";
const kyokaiAdditionalRatePage =
  "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/003/";
const pensionPage =
  "https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html";
const pensionAgeEligibilityPage =
  "https://www.nenkin.go.jp/section/faq/kounen/hihokensha/20170801.html";
const healthAgeEligibilityPage =
  "https://www.nenkin.go.jp/service/kounen/tekiyo/hihokensha1/20150407-02.html";
const pensionRoundingPage =
  "https://www.nenkin.go.jp/service/kounen/hokenryo/nofu/20121026.html";
const bonusPage =
  "https://www.nenkin.go.jp/section/faq/kounen/hokenryo/shoyokeisan.html";
const employmentRatePage =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000108634.html";
const employment2026Pdf = "https://www.mhlw.go.jp/content/001692566.pdf";
const employmentRoundingPage =
  "https://www.mhlw.go.jp/new-info/kobetu/roudou/gyousei/hoken/kakikata/dl/koyou-all.pdf";

export const healthInsuranceRules2026: readonly RuleRecord<KyokaiHealthRateValue>[] =
  [
    {
      metadata: metadata({
        id: "jp-kyokai-health-rate-2025-carry-into-2026",
        domain: "health-insurance",
        contextKey: "kyokai:all-prefectures",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-02-28",
        effectiveBasis: "salary-month",
        status: "retired",
        publishedAt: "2025-03-01",
        sourceTitle: "令和7年度都道府県単位健康保険料率",
        sourceUrls: [kyokaiRatePage2025],
        sourcePublisher: "全国健康保険協会",
        notes: "令和7年3月分から令和8年2月分までの率を2026年1・2月へ適用。",
      }),
      value: {
        fullRateDenominator: 10_000,
        fullRateNumeratorByPrefecture: prefectureRates([
          1031, 985, 962, 1011, 1001, 975, 962, 967, 982, 977, 976, 979, 991,
          992, 955, 965, 988, 994, 989, 969, 993, 980, 1003, 999, 997, 1003,
          1024, 1016, 1002, 1019, 993, 994, 1017, 997, 1036, 1047, 1021, 1018,
          1013, 1031, 1078, 1041, 1012, 1025, 1009, 1031, 944,
        ]),
        employeeShare: "one-half-with-payroll-rounding",
      },
    },
    {
      metadata: metadata({
        id: "jp-kyokai-health-rate-2026",
        domain: "health-insurance",
        contextKey: "kyokai:all-prefectures",
        effectiveFrom: "2026-03-01",
        effectiveTo: "2026-12-31",
        effectiveBasis: "salary-month",
        status: "current",
        publishedAt: "2026-01-16",
        sourceTitle: "令和8年度都道府県単位健康保険料率・保険料額表",
        sourceUrls: [kyokaiRatePage2026, kyokaiPremiumTable2026],
        sourcePublisher: "全国健康保険協会",
        notes:
          "一般被保険者は令和8年3月分から適用。被保険者折半額は公式端数規則で算出。",
      }),
      value: {
        fullRateDenominator: 10_000,
        fullRateNumeratorByPrefecture: prefectureRates([
          1028, 985, 951, 1010, 1001, 975, 950, 952, 982, 968, 967, 973, 985,
          992, 921, 959, 970, 971, 955, 963, 980, 961, 993, 977, 988, 989, 1013,
          1012, 991, 1006, 986, 994, 1005, 978, 1015, 1024, 1002, 998, 1005,
          1011, 1055, 1006, 1008, 1008, 977, 1013, 944,
        ]),
        employeeShare: "one-half-with-payroll-rounding",
      },
    },
  ];

export const careInsuranceRules2026: readonly RuleRecord<{
  fullRateNumerator: number;
  fullRateDenominator: number;
}>[] = [
  {
    metadata: metadata({
      id: "jp-kyokai-care-rate-2025-carry-into-2026",
      domain: "care-insurance",
      contextKey: "kyokai:age-40-to-64",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-02-28",
      effectiveBasis: "salary-month",
      status: "retired",
      publishedAt: "2025-03-01",
      sourceTitle: "協会けんぽ令和7年度介護保険料率",
      sourceUrls: [kyokaiCareRatePage, kyokaiRatePage2025],
      sourcePublisher: "全国健康保険協会",
      notes: "令和7年3月分から1.59%。40歳到達月から65歳到達月の前月相当まで。",
    }),
    value: { fullRateNumerator: 159, fullRateDenominator: 10_000 },
  },
  {
    metadata: metadata({
      id: "jp-kyokai-care-rate-2026",
      domain: "care-insurance",
      contextKey: "kyokai:age-40-to-64",
      effectiveFrom: "2026-03-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "salary-month",
      status: "current",
      publishedAt: "2026-01-16",
      sourceTitle: "協会けんぽ令和8年度介護保険料率",
      sourceUrls: [kyokaiCareRatePage, kyokaiRatePage2026],
      sourcePublisher: "全国健康保険協会",
      notes: "令和8年3月分から1.62%。",
    }),
    value: { fullRateNumerator: 162, fullRateDenominator: 10_000 },
  },
];

export const careInsuranceEligibility2026 = {
  metadata: metadata({
    id: "jp-kyokai-care-age-eligibility-2026",
    domain: "care-insurance-eligibility",
    contextKey: "kyokai:insured-person",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "salary-month",
    status: "current",
    publishedAt: "2026-01-16",
    sourceTitle: "介護保険第2号被保険者の年齢到達日",
    sourceUrls: [kyokaiCareRatePage],
    sourcePublisher: "全国健康保険協会",
    notes:
      "40歳到達日（誕生日の前日）の属する月から、65歳到達日の属する月の前月まで。",
  }),
  value: {
    minimumAge: 40,
    maximumAgeExclusive: 65,
    ageReachedOn: "day-before-birthday" as const,
  },
};

export const healthInsuranceEligibility2026 = {
  metadata: metadata({
    id: "jp-kyokai-health-age-eligibility-2026",
    domain: "health-insurance-eligibility",
    contextKey: "kyokai:insured-person",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "salary-month",
    status: "current",
    publishedAt: "2025-12-25",
    sourceTitle: "75歳到達による健康保険の資格喪失",
    sourceUrls: [healthAgeEligibilityPage],
    sourcePublisher: "日本年金機構",
    notes:
      "75歳の誕生日当日に健康保険資格を喪失し、資格喪失月の前月分まで保険料が発生する。",
  }),
  value: {
    maximumAgeExclusive: 75,
    qualificationLostOn: "birthday" as const,
    premiumThrough: "month-before-loss" as const,
    exceptionalCoverage: "unsupported" as const,
  },
};

export const additionalInsuranceRules2026: readonly RuleRecord<{
  fullRateNumerator: number;
  fullRateDenominator: number;
}>[] = [
  {
    metadata: metadata({
      id: "jp-child-support-contribution-before-2026-04",
      domain: "additional-insurance",
      contextKey: "kyokai:child-support-contribution",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      effectiveBasis: "salary-month",
      status: "retired",
      publishedAt: "2026-01-16",
      sourceTitle: "子ども・子育て支援金制度の2026年4月開始",
      sourceUrls: [kyokaiAdditionalRatePage, kyokaiRatePage2026],
      sourcePublisher: "全国健康保険協会",
      notes: "制度開始前の被保険者負担は0円。",
    }),
    value: { fullRateNumerator: 0, fullRateDenominator: 10_000 },
  },
  {
    metadata: metadata({
      id: "jp-child-support-contribution-2026-04",
      domain: "additional-insurance",
      contextKey: "kyokai:child-support-contribution",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "salary-month",
      status: "current",
      publishedAt: "2026-01-16",
      sourceTitle: "協会けんぽ子ども・子育て支援金率",
      sourceUrls: [kyokaiAdditionalRatePage, kyokaiRatePage2026],
      sourcePublisher: "全国健康保険協会",
      notes: "令和8年4月分から全国一律0.23%、労使折半。",
    }),
    value: { fullRateNumerator: 23, fullRateDenominator: 10_000 },
  },
];

export const pensionRule2026 = {
  metadata: metadata({
    id: "jp-employees-pension-rate-2017-09-current-2026",
    domain: "pension",
    contextKey: "employees-pension:general",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "salary-month",
    status: "current",
    publishedAt: "2024-08-09",
    sourceTitle: "厚生年金保険の保険料",
    sourceUrls: [pensionPage, pensionRoundingPage],
    sourcePublisher: "日本年金機構",
    notes:
      "保険料率18.3%、労使折半。給与控除時は50銭以下切捨て、50銭超切上げ。",
  }),
  value: { fullRateNumerator: 183, fullRateDenominator: 1000 },
} as const;

export const pensionInsuranceEligibility2026 = {
  metadata: metadata({
    id: "jp-employees-pension-age-eligibility-2026",
    domain: "pension-eligibility",
    contextKey: "employees-pension:general",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "salary-month",
    status: "current",
    publishedAt: "2025-09-01",
    sourceTitle: "70歳到達による厚生年金保険の資格喪失",
    sourceUrls: [pensionAgeEligibilityPage],
    sourcePublisher: "日本年金機構",
    notes:
      "70歳到達日（誕生日の前日）に被保険者資格を喪失する。高齢任意加入は自動計算対象外。",
  }),
  value: {
    maximumAgeExclusive: 70,
    qualificationLostOn: "day-before-birthday" as const,
    premiumThrough: "month-before-loss" as const,
    exceptionalCoverage: "unsupported" as const,
  },
} as const;

export const employmentInsuranceRules2026: readonly RuleRecord<{
  denominator: number;
  workerNumeratorByCategory: Record<EmploymentInsuranceCategory, number>;
}>[] = [
  {
    metadata: metadata({
      id: "jp-employment-insurance-worker-2025-carry-into-2026",
      domain: "employment-insurance",
      contextKey: "all-business-categories",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      effectiveBasis: "payment-date",
      status: "retired",
      publishedAt: "2025-02-01",
      sourceTitle: "令和7年度雇用保険料率（労働者負担）",
      sourceUrls: [employmentRatePage, employment2026Pdf],
      sourcePublisher: "厚生労働省",
      notes: "令和7年度の労働者負担率を2026年1月から3月へ適用。",
    }),
    value: {
      denominator: 1000,
      workerNumeratorByCategory: {
        general: 5.5,
        "agriculture-forestry-fishery-sake": 6.5,
        construction: 6.5,
      },
    },
  },
  {
    metadata: metadata({
      id: "jp-employment-insurance-worker-2026",
      domain: "employment-insurance",
      contextKey: "all-business-categories",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "payment-date",
      status: "current",
      publishedAt: "2026-02-01",
      sourceTitle: "令和8年度雇用保険料率（労働者負担）",
      sourceUrls: [
        employmentRatePage,
        employment2026Pdf,
        employmentRoundingPage,
      ],
      sourcePublisher: "厚生労働省",
      notes:
        "一般5/1000、農林水産・清酒製造と建設6/1000。給与控除端数は50銭以下切捨て。",
    }),
    value: {
      denominator: 1000,
      workerNumeratorByCategory: {
        general: 5,
        "agriculture-forestry-fishery-sake": 6,
        construction: 6,
      },
    },
  },
];

export interface StandardRemunerationTable {
  lowerBoundsYen: readonly number[];
  standardMonthlyValuesYen: readonly number[];
}

export const healthStandardRemunerationTable: RuleRecord<StandardRemunerationTable> =
  {
    metadata: metadata({
      id: "jp-health-standard-remuneration-table-2026",
      domain: "standard-remuneration",
      contextKey: "health-insurance",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "salary-month",
      status: "current",
      publishedAt: "2026-01-16",
      sourceTitle: "令和8年度協会けんぽ保険料額表（標準報酬月額1～50等級）",
      sourceUrls: [kyokaiPremiumTable2026],
      sourcePublisher: "全国健康保険協会",
      notes: "報酬月額を健康保険の標準報酬月額50等級へ解決する。",
    }),
    value: {
      lowerBoundsYen: [
        0, 63_000, 73_000, 83_000, 93_000, 101_000, 107_000, 114_000, 122_000,
        130_000, 138_000, 146_000, 155_000, 165_000, 175_000, 185_000, 195_000,
        210_000, 230_000, 250_000, 270_000, 290_000, 310_000, 330_000, 350_000,
        370_000, 395_000, 425_000, 455_000, 485_000, 515_000, 545_000, 575_000,
        605_000, 635_000, 665_000, 695_000, 730_000, 770_000, 810_000, 855_000,
        905_000, 955_000, 1_005_000, 1_055_000, 1_115_000, 1_175_000, 1_235_000,
        1_295_000, 1_355_000,
      ],
      standardMonthlyValuesYen: [
        58_000, 68_000, 78_000, 88_000, 98_000, 104_000, 110_000, 118_000,
        126_000, 134_000, 142_000, 150_000, 160_000, 170_000, 180_000, 190_000,
        200_000, 220_000, 240_000, 260_000, 280_000, 300_000, 320_000, 340_000,
        360_000, 380_000, 410_000, 440_000, 470_000, 500_000, 530_000, 560_000,
        590_000, 620_000, 650_000, 680_000, 710_000, 750_000, 790_000, 830_000,
        880_000, 930_000, 980_000, 1_030_000, 1_090_000, 1_150_000, 1_210_000,
        1_270_000, 1_330_000, 1_390_000,
      ],
    },
  };

export const pensionStandardRemunerationTable: RuleRecord<StandardRemunerationTable> =
  {
    metadata: metadata({
      id: "jp-pension-standard-remuneration-table-2026",
      domain: "standard-remuneration",
      contextKey: "employees-pension",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      effectiveBasis: "salary-month",
      status: "current",
      publishedAt: "2024-08-09",
      sourceTitle: "厚生年金保険の標準報酬月額1～32等級",
      sourceUrls: [pensionPage],
      sourcePublisher: "日本年金機構",
      notes: "8.8万円から65万円までの32等級。",
    }),
    value: {
      lowerBoundsYen: [
        0, 93_000, 101_000, 107_000, 114_000, 122_000, 130_000, 138_000,
        146_000, 155_000, 165_000, 175_000, 185_000, 195_000, 210_000, 230_000,
        250_000, 270_000, 290_000, 310_000, 330_000, 350_000, 370_000, 395_000,
        425_000, 455_000, 485_000, 515_000, 545_000, 575_000, 605_000, 635_000,
      ],
      standardMonthlyValuesYen: [
        88_000, 98_000, 104_000, 110_000, 118_000, 126_000, 134_000, 142_000,
        150_000, 160_000, 170_000, 180_000, 190_000, 200_000, 220_000, 240_000,
        260_000, 280_000, 300_000, 320_000, 340_000, 360_000, 380_000, 410_000,
        440_000, 470_000, 500_000, 530_000, 560_000, 590_000, 620_000, 650_000,
      ],
    },
  };

export const standardBonusRule2026 = {
  metadata: metadata({
    id: "jp-standard-bonus-limits-2026",
    domain: "standard-bonus",
    contextKey: "health-and-employees-pension",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    effectiveBasis: "bonus-payment-date",
    status: "current",
    publishedAt: "2025-09-11",
    sourceTitle: "健康保険・厚生年金保険の標準賞与額",
    sourceUrls: [bonusPage, pensionPage],
    sourcePublisher: "日本年金機構",
    notes:
      "1000円未満切捨て。健康保険は年度累計573万円、厚生年金は同月150万円上限。",
  }),
  value: {
    roundingUnitYen: 1000,
    healthFiscalYearMaximumYen: 5_730_000,
    pensionMonthlyMaximumYen: 1_500_000,
    maximumOrdinaryPaymentsPerYear: 3,
  },
} as const;

export const socialInsuranceRules2026 = [
  ...healthInsuranceRules2026,
  healthInsuranceEligibility2026,
  ...careInsuranceRules2026,
  careInsuranceEligibility2026,
  ...additionalInsuranceRules2026,
  pensionRule2026,
  pensionInsuranceEligibility2026,
  ...employmentInsuranceRules2026,
  healthStandardRemunerationTable,
  pensionStandardRemunerationTable,
  standardBonusRule2026,
] as const;
