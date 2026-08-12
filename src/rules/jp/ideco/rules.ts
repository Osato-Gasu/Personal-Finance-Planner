export type IdecoParticipantCategory =
  "category1" | "category2" | "category3" | "category4" | "category5";

export type EmployerPensionType =
  "none" | "corporate-dc" | "db-or-other" | "corporate-dc-and-db-or-other";

export interface IdecoRuleMetadata {
  id: string;
  domain: "ideco";
  jurisdiction: "JP";
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "current" | "scheduled";
  publishedAt: string;
  verifiedAt: string;
  verifiedBy: string;
  sourceTitle: string;
  sourceUrls: readonly string[];
  sourcePublisher: string;
  sourceRetrievedAt: string;
  notes: string;
}

export interface IdecoRule {
  metadata: IdecoRuleMetadata;
  minimumContributionYen: number;
  contributionUnitYen: number;
  category1And4SharedLimitYen: number;
  category2NoPensionLimitYen: number;
  category2SharedLimitYen: number;
  category2AbsoluteLimitYen: number | null;
  category3LimitYen: number;
  category5SharedLimitYen: number | null;
}

export interface IdecoRuleContext {
  participantCategory: IdecoParticipantCategory | null;
  participantCategoryConfirmed: boolean;
  employerPensionType: EmployerPensionType | null;
  employerDcContributionYen: number | null;
  otherPensionEquivalentYen: number | null;
  nationalPensionFundContributionYen: number | null;
  nationalPensionAdditionalPremiumYen: number | null;
  matchingContributionActive: boolean | null;
  idecoPlusActive: boolean | null;
}

export type IdecoEligibilityStatus =
  "complete" | "incomplete" | "unsupported" | "missing-rule" | "out-of-range";

export interface IdecoAllowanceResult {
  status: IdecoEligibilityStatus;
  rule: IdecoRule | null;
  allowedContributionYen: number | null;
  messages: string[];
}

const sourceUrls = [
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/kyoshutsu/ideco.html",
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/kyoshutsu/2025kaisei.html",
  "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9646&dataType=1&pageNo=1",
  "https://www.ideco-koushiki.jp/start/entry.html",
  "https://www.ideco-koushiki.jp/library/",
  "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1135.htm",
] as const;

export const currentIdecoRule: IdecoRule = {
  metadata: {
    id: "jp-ideco-2024-12-01",
    domain: "ideco",
    jurisdiction: "JP",
    effectiveFrom: "2024-12-01",
    effectiveTo: "2026-11-30",
    status: "current",
    publishedAt: "2024-12-01",
    verifiedAt: "2026-08-13",
    verifiedBy: "Codex",
    sourceTitle: "iDeCoの概要",
    sourceUrls,
    sourcePublisher: "厚生労働省",
    sourceRetrievedAt: "2026-08-13",
    notes:
      "現行の加入区分別限度額。第1・4号は国民年金基金掛金・付加保険料との共通枠、第2号企業年金ありは5.5万円の残余かつ2万円上限。",
  },
  minimumContributionYen: 5_000,
  contributionUnitYen: 1_000,
  category1And4SharedLimitYen: 68_000,
  category2NoPensionLimitYen: 23_000,
  category2SharedLimitYen: 55_000,
  category2AbsoluteLimitYen: 20_000,
  category3LimitYen: 23_000,
  category5SharedLimitYen: null,
};

export const scheduledIdecoRule: IdecoRule = {
  metadata: {
    id: "jp-ideco-2026-12-01",
    domain: "ideco",
    jurisdiction: "JP",
    effectiveFrom: "2026-12-01",
    effectiveTo: null,
    status: "scheduled",
    publishedAt: "2025-12-24",
    verifiedAt: "2026-08-13",
    verifiedBy: "Codex",
    sourceTitle: "2025年の制度改正",
    sourceUrls,
    sourcePublisher: "厚生労働省",
    sourceRetrievedAt: "2026-08-13",
    notes:
      "2026年12月1日施行予定。第1・4号共通枠7.5万円、第2・5号共通枠6.2万円。施行日前へ適用しない。",
  },
  minimumContributionYen: 5_000,
  contributionUnitYen: 1_000,
  category1And4SharedLimitYen: 75_000,
  category2NoPensionLimitYen: 62_000,
  category2SharedLimitYen: 62_000,
  category2AbsoluteLimitYen: null,
  category3LimitYen: 23_000,
  category5SharedLimitYen: 62_000,
};

export const idecoRules: readonly IdecoRule[] = [
  currentIdecoRule,
  scheduledIdecoRule,
];

function isRealIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function nextDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function requireText(value: unknown, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${field} is required`);
}

function requireHttps(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string")
    throw new Error(`${field} must be an absolute HTTPS URL`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.hostname.length === 0)
    throw new Error(`${field} must be an absolute HTTPS URL`);
}

function requireSafeYen(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`${field} must be a non-negative safe integer`);
}

export function validateIdecoRule(rule: IdecoRule): void {
  if (!/^jp-ideco-\d{4}-\d{2}-\d{2}$/.test(rule.metadata.id))
    throw new Error("iDeCo rule ID is invalid");
  const domain: unknown = rule.metadata.domain;
  const jurisdiction: unknown = rule.metadata.jurisdiction;
  if (domain !== "ideco" || jurisdiction !== "JP")
    throw new Error("iDeCo rule context is invalid");
  if (!isRealIsoDate(rule.metadata.effectiveFrom))
    throw new Error("iDeCo effectiveFrom is invalid");
  if (
    rule.metadata.effectiveTo !== null &&
    !isRealIsoDate(rule.metadata.effectiveTo)
  )
    throw new Error("iDeCo effectiveTo is invalid");
  if (
    rule.metadata.effectiveTo !== null &&
    rule.metadata.effectiveFrom > rule.metadata.effectiveTo
  )
    throw new Error("iDeCo rule period is invalid");
  for (const [field, value] of Object.entries({
    publishedAt: rule.metadata.publishedAt,
    verifiedAt: rule.metadata.verifiedAt,
    sourceRetrievedAt: rule.metadata.sourceRetrievedAt,
  }))
    if (!isRealIsoDate(value)) throw new Error(`${field} is invalid`);
  for (const [field, value] of Object.entries({
    verifiedBy: rule.metadata.verifiedBy,
    sourceTitle: rule.metadata.sourceTitle,
    sourcePublisher: rule.metadata.sourcePublisher,
    notes: rule.metadata.notes,
  }))
    requireText(value, field);
  if (
    !Array.isArray(rule.metadata.sourceUrls) ||
    rule.metadata.sourceUrls.length === 0
  )
    throw new Error("iDeCo rule sources are required");
  const urls = new Set<string>();
  for (const sourceUrl of rule.metadata.sourceUrls) {
    const url: unknown = sourceUrl;
    requireHttps(url, "sourceUrl");
    if (urls.has(url)) throw new Error("iDeCo rule source URLs must be unique");
    urls.add(url);
  }
  for (const [field, value] of Object.entries({
    minimumContributionYen: rule.minimumContributionYen,
    contributionUnitYen: rule.contributionUnitYen,
    category1And4SharedLimitYen: rule.category1And4SharedLimitYen,
    category2NoPensionLimitYen: rule.category2NoPensionLimitYen,
    category2SharedLimitYen: rule.category2SharedLimitYen,
    category3LimitYen: rule.category3LimitYen,
  }))
    requireSafeYen(value, field);
  if (rule.category2AbsoluteLimitYen !== null)
    requireSafeYen(rule.category2AbsoluteLimitYen, "category2AbsoluteLimitYen");
  if (rule.category5SharedLimitYen !== null)
    requireSafeYen(rule.category5SharedLimitYen, "category5SharedLimitYen");
  if (
    rule.minimumContributionYen !== 5_000 ||
    rule.contributionUnitYen !== 1_000
  )
    throw new Error("iDeCo minimum or unit is inconsistent");
  if (rule.metadata.id === "jp-ideco-2024-12-01") {
    if (
      rule.metadata.status !== "current" ||
      rule.category1And4SharedLimitYen !== 68_000 ||
      rule.category2NoPensionLimitYen !== 23_000 ||
      rule.category2SharedLimitYen !== 55_000 ||
      rule.category2AbsoluteLimitYen !== 20_000 ||
      rule.category3LimitYen !== 23_000 ||
      rule.category5SharedLimitYen !== null
    )
      throw new Error("current iDeCo statutory values are inconsistent");
  } else if (rule.metadata.id === "jp-ideco-2026-12-01") {
    if (
      rule.metadata.status !== "scheduled" ||
      rule.category1And4SharedLimitYen !== 75_000 ||
      rule.category2NoPensionLimitYen !== 62_000 ||
      rule.category2SharedLimitYen !== 62_000 ||
      rule.category2AbsoluteLimitYen !== null ||
      rule.category3LimitYen !== 23_000 ||
      rule.category5SharedLimitYen !== 62_000
    )
      throw new Error("scheduled iDeCo statutory values are inconsistent");
  }
}

export function validateIdecoRulePackage(rules: readonly IdecoRule[]): void {
  const ids = new Set<string>();
  const ordered = [...rules].sort((left, right) =>
    left.metadata.effectiveFrom.localeCompare(right.metadata.effectiveFrom),
  );
  for (const rule of ordered) {
    validateIdecoRule(rule);
    if (ids.has(rule.metadata.id))
      throw new Error("iDeCo rule IDs must be unique");
    ids.add(rule.metadata.id);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (!previous || !current || previous.metadata.effectiveTo === null)
      throw new Error("iDeCo rule periods overlap");
    if (previous.metadata.effectiveTo >= current.metadata.effectiveFrom)
      throw new Error("iDeCo rule periods overlap");
    if (
      nextDay(previous.metadata.effectiveTo) !== current.metadata.effectiveFrom
    )
      throw new Error("iDeCo rule periods contain a gap");
  }
}

export function resolveIdecoRule(targetMonth: string): IdecoRule | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) return null;
  const date = `${targetMonth}-01`;
  const matches = idecoRules.filter(
    (rule) =>
      date >= rule.metadata.effectiveFrom &&
      (rule.metadata.effectiveTo === null || date <= rule.metadata.effectiveTo),
  );
  if (matches.length > 1)
    throw new Error("multiple iDeCo rules match target month");
  return matches[0] ?? null;
}

function sumResidual(limit: number, values: readonly number[]): number {
  let used = 0;
  for (const value of values) {
    requireSafeYen(value, "iDeCo context amount");
    if (value > Number.MAX_SAFE_INTEGER - used)
      throw new Error("iDeCo context amount is out of range");
    used += value;
  }
  return Math.max(0, limit - used);
}

function requiredAmount(value: number | null, name: string): number | string {
  return value === null
    ? `${name}を入力してください。0円も明示入力が必要です。`
    : value;
}

export function calculateIdecoAllowance(
  targetMonth: string,
  context: IdecoRuleContext,
): IdecoAllowanceResult {
  const rule = resolveIdecoRule(targetMonth);
  if (!rule)
    return {
      status: "missing-rule",
      rule: null,
      allowedContributionYen: null,
      messages: ["対象月のiDeCo ruleがありません。"],
    };
  try {
    if (
      !context.participantCategoryConfirmed ||
      context.participantCategory === null
    )
      return {
        status: "incomplete",
        rule,
        allowedContributionYen: null,
        messages: ["公式制度上の加入区分を確認してください。"],
      };
    if (
      context.idecoPlusActive === null ||
      context.matchingContributionActive === null
    )
      return {
        status: "incomplete",
        rule,
        allowedContributionYen: null,
        messages: ["iDeCo+とマッチング拠出の有無を明示してください。"],
      };
    if (context.idecoPlusActive)
      return {
        status: "unsupported",
        rule,
        allowedContributionYen: null,
        messages: ["iDeCo+の事業主掛金を含む自動計算は未対応です。"],
      };
    if (context.matchingContributionActive)
      return {
        status: "unsupported",
        rule,
        allowedContributionYen: null,
        messages: ["企業型DCのマッチング拠出実施中はiDeCo自動計算対象外です。"],
      };
    const category = context.participantCategory;
    if (category === "category5" && rule.category5SharedLimitYen === null)
      return {
        status: "unsupported",
        rule,
        allowedContributionYen: null,
        messages: ["第5号加入者は2026年12月より前は対象外です。"],
      };
    if (category === "category1" || category === "category4") {
      const fund = requiredAmount(
        context.nationalPensionFundContributionYen,
        "国民年金基金掛金",
      );
      const additional = requiredAmount(
        context.nationalPensionAdditionalPremiumYen,
        "国民年金付加保険料",
      );
      if (typeof fund === "string" || typeof additional === "string")
        return {
          status: "incomplete",
          rule,
          allowedContributionYen: null,
          messages: [fund, additional].filter(
            (value): value is string => typeof value === "string",
          ),
        };
      return {
        status: "complete",
        rule,
        allowedContributionYen: sumResidual(rule.category1And4SharedLimitYen, [
          fund,
          additional,
        ]),
        messages: [],
      };
    }
    if (category === "category3")
      return {
        status: "complete",
        rule,
        allowedContributionYen: rule.category3LimitYen,
        messages: [],
      };
    if (context.employerPensionType === null)
      return {
        status: "incomplete",
        rule,
        allowedContributionYen: null,
        messages: ["企業年金区分を入力してください。"],
      };
    if (context.employerPensionType === "none")
      return {
        status: "complete",
        rule,
        allowedContributionYen:
          category === "category5"
            ? rule.category5SharedLimitYen
            : rule.category2NoPensionLimitYen,
        messages: [],
      };
    const employerDcNeeded =
      context.employerPensionType === "corporate-dc" ||
      context.employerPensionType === "corporate-dc-and-db-or-other";
    const otherNeeded =
      context.employerPensionType === "db-or-other" ||
      context.employerPensionType === "corporate-dc-and-db-or-other";
    const employerDc = employerDcNeeded
      ? requiredAmount(context.employerDcContributionYen, "企業型DC事業主掛金")
      : 0;
    const other = otherNeeded
      ? requiredAmount(context.otherPensionEquivalentYen, "他制度掛金相当額")
      : 0;
    if (typeof employerDc === "string" || typeof other === "string")
      return {
        status: "incomplete",
        rule,
        allowedContributionYen: null,
        messages: [employerDc, other].filter(
          (value): value is string => typeof value === "string",
        ),
      };
    const sharedLimit =
      category === "category5"
        ? (rule.category5SharedLimitYen as number)
        : rule.category2SharedLimitYen;
    const residual = sumResidual(sharedLimit, [employerDc, other]);
    return {
      status: "complete",
      rule,
      allowedContributionYen:
        rule.category2AbsoluteLimitYen === null
          ? residual
          : Math.min(rule.category2AbsoluteLimitYen, residual),
      messages: [],
    };
  } catch (error) {
    return {
      status: "out-of-range",
      rule,
      allowedContributionYen: null,
      messages: [
        error instanceof Error
          ? error.message
          : "iDeCo context is out of range",
      ],
    };
  }
}

validateIdecoRulePackage(idecoRules);
