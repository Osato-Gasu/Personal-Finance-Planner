import {
  OFFICIAL_SOURCE_PUBLISHERS,
  type RuleMetadata,
  type RuleRecord,
} from "./metadata";
import type { TakeHomeRulePackage } from "./manifest";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OFFICIAL_SOURCE_HOSTS: Record<RuleMetadata["sourcePublisher"], string> = {
  国税庁: "nta.go.jp",
  厚生労働省: "mhlw.go.jp",
  日本年金機構: "nenkin.go.jp",
  全国健康保険協会: "kyoukaikenpo.or.jp",
};
const EFFECTIVE_BASES = new Set([
  "tax-year",
  "salary-month",
  "payment-date",
  "bonus-payment-date",
  "assessment-year",
]);
const RULE_STATUSES = new Set(["current", "scheduled", "retired"]);
const HEALTH_STANDARD_LOWER_BOUNDS_2026 = [
  0, 63_000, 73_000, 83_000, 93_000, 101_000, 107_000, 114_000, 122_000,
  130_000, 138_000, 146_000, 155_000, 165_000, 175_000, 185_000, 195_000,
  210_000, 230_000, 250_000, 270_000, 290_000, 310_000, 330_000, 350_000,
  370_000, 395_000, 425_000, 455_000, 485_000, 515_000, 545_000, 575_000,
  605_000, 635_000, 665_000, 695_000, 730_000, 770_000, 810_000, 855_000,
  905_000, 955_000, 1_005_000, 1_055_000, 1_115_000, 1_175_000, 1_235_000,
  1_295_000, 1_355_000,
] as const;
const HEALTH_STANDARD_VALUES_2026 = [
  58_000, 68_000, 78_000, 88_000, 98_000, 104_000, 110_000, 118_000, 126_000,
  134_000, 142_000, 150_000, 160_000, 170_000, 180_000, 190_000, 200_000,
  220_000, 240_000, 260_000, 280_000, 300_000, 320_000, 340_000, 360_000,
  380_000, 410_000, 440_000, 470_000, 500_000, 530_000, 560_000, 590_000,
  620_000, 650_000, 680_000, 710_000, 750_000, 790_000, 830_000, 880_000,
  930_000, 980_000, 1_030_000, 1_090_000, 1_150_000, 1_210_000, 1_270_000,
  1_330_000, 1_390_000,
] as const;
const PENSION_STANDARD_LOWER_BOUNDS_2026 = [
  0, 93_000, 101_000, 107_000, 114_000, 122_000, 130_000, 138_000, 146_000,
  155_000, 165_000, 175_000, 185_000, 195_000, 210_000, 230_000, 250_000,
  270_000, 290_000, 310_000, 330_000, 350_000, 370_000, 395_000, 425_000,
  455_000, 485_000, 515_000, 545_000, 575_000, 605_000, 635_000,
] as const;
const PENSION_STANDARD_VALUES_2026 = [
  88_000, 98_000, 104_000, 110_000, 118_000, 126_000, 134_000, 142_000, 150_000,
  160_000, 170_000, 180_000, 190_000, 200_000, 220_000, 240_000, 260_000,
  280_000, 300_000, 320_000, 340_000, 360_000, 380_000, 410_000, 440_000,
  470_000, 500_000, 530_000, 560_000, 590_000, 620_000, 650_000,
] as const;

function opaque(value: unknown): unknown {
  return value;
}

function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) throw new Error(`${field} must be an ISO date`);
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

function nextDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function validateMetadata(value: RuleMetadata): void {
  for (const field of [
    "id",
    "domain",
    "jurisdiction",
    "contextKey",
    "effectiveFrom",
    "effectiveTo",
    "effectiveBasis",
    "status",
    "publishedAt",
    "verifiedAt",
    "verifiedBy",
    "sourceTitle",
    "sourcePublisher",
    "sourceRetrievedAt",
    "notes",
  ] as const) {
    if (typeof value[field] !== "string" || value[field].length === 0) {
      throw new Error(`rule metadata field is missing: ${field}`);
    }
  }
  if (opaque(value.jurisdiction) !== "JP")
    throw new Error("rule jurisdiction must be JP");
  if (!EFFECTIVE_BASES.has(value.effectiveBasis)) {
    throw new Error("rule effective basis is invalid");
  }
  if (!RULE_STATUSES.has(value.status)) {
    throw new Error("rule status is invalid");
  }
  if (opaque(value.verifiedBy) !== "Codex") {
    throw new Error("rule verifier is invalid");
  }
  if (!OFFICIAL_SOURCE_PUBLISHERS.includes(value.sourcePublisher)) {
    throw new Error("rule source publisher is not allowed");
  }
  for (const [field, date] of [
    ["effectiveFrom", value.effectiveFrom],
    ["effectiveTo", value.effectiveTo],
    ["publishedAt", value.publishedAt],
    ["verifiedAt", value.verifiedAt],
    ["sourceRetrievedAt", value.sourceRetrievedAt],
  ] as const) {
    assertIsoDate(date, field);
  }
  if (value.effectiveFrom > value.effectiveTo) {
    throw new Error("rule effectiveFrom must not exceed effectiveTo");
  }
  if (!Array.isArray(value.sourceUrls) || value.sourceUrls.length === 0) {
    throw new Error("rule sourceUrls are required");
  }
  const expectedHost = OFFICIAL_SOURCE_HOSTS[value.sourcePublisher];
  for (const sourceUrl of value.sourceUrls as readonly unknown[]) {
    if (typeof sourceUrl !== "string") {
      throw new Error("rule source URL must be a string");
    }
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new Error("rule source URL is invalid");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("rule source URL must use https");
    }
    if (
      parsed.hostname !== expectedHost &&
      !parsed.hostname.endsWith(`.${expectedHost}`)
    ) {
      throw new Error("rule source URL publisher mismatch");
    }
  }
}

function validatePeriods(rules: readonly RuleRecord<unknown>[]): void {
  const grouped = new Map<string, RuleMetadata[]>();
  for (const { metadata } of rules) {
    const key = `${metadata.domain}\u0000${metadata.contextKey}`;
    const list = grouped.get(key) ?? [];
    list.push(metadata);
    grouped.set(key, list);
  }
  for (const entries of grouped.values()) {
    entries.sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    );
    if (
      entries[0]?.effectiveFrom !== "2026-01-01" ||
      entries.at(-1)?.effectiveTo !== "2026-12-31"
    ) {
      throw new Error("missing-rule:annual-coverage");
    }
    for (let index = 1; index < entries.length; index += 1) {
      const previous = entries[index - 1];
      const current = entries[index];
      if (!previous || !current) throw new Error("rule period is missing");
      if (current.effectiveFrom <= previous.effectiveTo) {
        throw new Error(
          `overlapping-rule:${current.domain}:${current.contextKey}`,
        );
      }
      if (current.effectiveFrom !== nextDate(previous.effectiveTo)) {
        throw new Error(`missing-rule:${current.domain}:${current.contextKey}`);
      }
    }
  }
}

function validateAscending(values: readonly number[], field: string): void {
  if (values.length === 0) throw new Error(`${field} must not be empty`);
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (!Number.isSafeInteger(current) || (current ?? -1) < 0) {
      throw new Error(`${field} must contain non-negative safe integers`);
    }
    if (index > 0 && (values[index - 1] ?? 0) >= (current ?? 0)) {
      throw new Error(`${field} must be strictly ascending`);
    }
  }
}

function validateExactTable(
  actual: readonly number[],
  expected: readonly number[],
  field: string,
): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(`${field} does not match the official 2026 table`);
  }
}

export function validateTakeHomeRulePackage(rules: TakeHomeRulePackage): {
  ruleCount: number;
  prefectureCount: number;
} {
  if (opaque(rules.targetYear) !== 2026)
    throw new Error("missing-rule:target-year");
  const ids = new Set<string>();
  for (const rule of rules.allRules) {
    validateMetadata(rule.metadata);
    if (ids.has(rule.metadata.id)) throw new Error("rule IDs must be unique");
    ids.add(rule.metadata.id);
  }
  validatePeriods(rules.allRules);

  const expectedCodes = rules.prefectures.map(([code]) => code).sort();
  if (expectedCodes.length !== 47 || new Set(expectedCodes).size !== 47) {
    throw new Error("47 prefectures are required");
  }
  for (const rule of rules.healthInsuranceRules) {
    const actualCodes = Object.keys(
      rule.value.fullRateNumeratorByPrefecture,
    ).sort();
    if (actualCodes.join("\u0000") !== expectedCodes.join("\u0000")) {
      throw new Error("health insurance prefecture coverage is incomplete");
    }
  }

  for (const rule of rules.employmentInsuranceRules) {
    const categories = Object.keys(rule.value.workerNumeratorByCategory).sort();
    if (
      categories.join("\u0000") !==
      ["agriculture-forestry-fishery-sake", "construction", "general"].join(
        "\u0000",
      )
    ) {
      throw new Error("employment insurance category coverage is incomplete");
    }
  }

  for (const table of [
    rules.healthStandardRemunerationTable,
    rules.pensionStandardRemunerationTable,
  ]) {
    const { lowerBoundsYen, standardMonthlyValuesYen } = table.value;
    if (lowerBoundsYen.length !== standardMonthlyValuesYen.length) {
      throw new Error("standard remuneration table lengths must match");
    }
    validateAscending(lowerBoundsYen, "standard remuneration lower bounds");
    validateAscending(
      standardMonthlyValuesYen,
      "standard remuneration monthly values",
    );
  }
  if (
    rules.healthStandardRemunerationTable.metadata.id !==
      "jp-health-standard-remuneration-table-2026" ||
    rules.healthStandardRemunerationTable.metadata.contextKey !==
      "health-insurance" ||
    rules.healthStandardRemunerationTable.metadata.sourcePublisher !==
      "全国健康保険協会" ||
    !rules.healthStandardRemunerationTable.metadata.sourceUrls.includes(
      "https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/premium_prefectures/r08/",
    )
  ) {
    throw new Error(
      "health standard remuneration official identity is invalid",
    );
  }
  if (
    rules.pensionStandardRemunerationTable.metadata.id !==
      "jp-pension-standard-remuneration-table-2026" ||
    rules.pensionStandardRemunerationTable.metadata.contextKey !==
      "employees-pension" ||
    rules.pensionStandardRemunerationTable.metadata.sourcePublisher !==
      "日本年金機構" ||
    !rules.pensionStandardRemunerationTable.metadata.sourceUrls.includes(
      "https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html",
    )
  ) {
    throw new Error(
      "pension standard remuneration official identity is invalid",
    );
  }
  validateExactTable(
    rules.healthStandardRemunerationTable.value.lowerBoundsYen,
    HEALTH_STANDARD_LOWER_BOUNDS_2026,
    "health standard remuneration lower bounds",
  );
  validateExactTable(
    rules.healthStandardRemunerationTable.value.standardMonthlyValuesYen,
    HEALTH_STANDARD_VALUES_2026,
    "health standard remuneration values",
  );
  validateExactTable(
    rules.pensionStandardRemunerationTable.value.lowerBoundsYen,
    PENSION_STANDARD_LOWER_BOUNDS_2026,
    "pension standard remuneration lower bounds",
  );
  validateExactTable(
    rules.pensionStandardRemunerationTable.value.standardMonthlyValuesYen,
    PENSION_STANDARD_VALUES_2026,
    "pension standard remuneration values",
  );

  const taxBrackets = rules.incomeTaxRules.find(
    (rule) => rule.metadata.domain === "national-income-tax-brackets",
  )?.value as
    | readonly {
        taxableIncomeMinimumYen: number;
        taxableIncomeMaximumYen: number | null;
      }[]
    | undefined;
  if (!taxBrackets || taxBrackets.length !== 7) {
    throw new Error("income tax bracket coverage is incomplete");
  }
  for (let index = 1; index < taxBrackets.length; index += 1) {
    const previous = taxBrackets[index - 1];
    const current = taxBrackets[index];
    if (
      previous?.taxableIncomeMaximumYen === null ||
      current?.taxableIncomeMinimumYen !==
        (previous?.taxableIncomeMaximumYen ?? 0) + 1000
    ) {
      throw new Error("income tax brackets contain a gap or overlap");
    }
  }
  return { ruleCount: rules.allRules.length, prefectureCount: 47 };
}
