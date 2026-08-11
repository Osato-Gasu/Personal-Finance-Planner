import {
  OFFICIAL_SOURCE_PUBLISHERS,
  type RuleMetadata,
  type RuleRecord,
} from "./metadata";
import type { TakeHomeRulePackage } from "./manifest";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\//;

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
  if (value.sourceUrls.some((url: string) => !HTTPS.test(url))) {
    throw new Error("rule source URL must use https");
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
