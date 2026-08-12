export interface NisaRuleMetadata {
  id: string;
  domain: "nisa";
  jurisdiction: "JP";
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "current";
  publishedAt: string;
  verifiedAt: string;
  verifiedBy: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePublisher: string;
  sourceRetrievedAt: string;
  notes: string;
  sources: readonly NisaRuleSource[];
}

export interface NisaRuleSource {
  title: string;
  url: string;
  publisher: string;
  retrievedAt: string;
  verifiedAt: string;
  purpose: string;
}

export const nisaRuleSources: readonly NisaRuleSource[] = [
  {
    title: "NISAのよくある質問 Q3・Q48",
    url: "https://www.jsda.or.jp/nisa/faq/",
    publisher: "日本証券業協会",
    retrievedAt: "2026-08-12",
    verifiedAt: "2026-08-12",
    purpose:
      "年齢計算に関する法律により1月2日生まれを当年の成人NISA対象へ含める境界",
  },
  {
    title: "NISAを知る",
    url: "https://www.fsa.go.jp/policy/nisa2/know/index.html",
    publisher: "金融庁",
    retrievedAt: "2026-08-12",
    verifiedAt: "2026-08-12",
    purpose: "成人NISAの年間枠、非課税保有限度額、簿価残高方式",
  },
  {
    title: "No.1535 NISA制度",
    url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1535.htm",
    publisher: "国税庁",
    retrievedAt: "2026-08-12",
    verifiedAt: "2026-08-12",
    purpose: "対象年1月1日時点18歳以上、年間枠、総枠、旧NISA外枠",
  },
  {
    title: "令和8（2026）年度税制改正について",
    url: "https://www.fsa.go.jp/news/r7/sonota/20251226-2/01.pdf",
    publisher: "金融庁",
    retrievedAt: "2026-08-12",
    verifiedAt: "2026-08-12",
    purpose: "2027年からの0～17歳向け拡充を成人ruleの対象外とする根拠",
  },
  {
    title: "アクセスFSA第273号",
    url: "https://www.fsa.go.jp/access/r7/273.html",
    publisher: "金融庁",
    retrievedAt: "2026-08-12",
    verifiedAt: "2026-08-12",
    purpose: "指定一次資料の確認（成人NISA制度値の根拠には使用しない）",
  },
];

export interface AdultNisaRule {
  metadata: NisaRuleMetadata;
  minimumAgeOnJanuaryFirst: number;
  annualTsumitateLimitYen: number;
  annualGrowthLimitYen: number;
  annualCombinedLimitYen: number;
  lifetimeTotalLimitYen: number;
  lifetimeGrowthLimitYen: number;
}

export const adultNisaRule2024: AdultNisaRule = {
  metadata: {
    id: "jp-nisa-adult-2024-01-01",
    domain: "nisa",
    jurisdiction: "JP",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    status: "current",
    publishedAt: "2025-04-01",
    verifiedAt: "2026-08-12",
    verifiedBy: "Codex",
    sourceTitle: "NISAを知る",
    sourceUrl: "https://www.fsa.go.jp/policy/nisa2/know/index.html",
    sourcePublisher: "金融庁",
    sourceRetrievedAt: "2026-08-12",
    notes:
      "2024年以降の成人NISA。年間枠・総枠は簿価ベース。2023年までのNISAは外枠。売却翌年の枠再利用、商品適格性、2027年の未成年制度は本ruleの計算対象外。国税庁No.1535でも対象年1月1日時点18歳以上と各上限を照合済み。",
    sources: nisaRuleSources,
  },
  minimumAgeOnJanuaryFirst: 18,
  annualTsumitateLimitYen: 1_200_000,
  annualGrowthLimitYen: 2_400_000,
  annualCombinedLimitYen: 3_600_000,
  lifetimeTotalLimitYen: 18_000_000,
  lifetimeGrowthLimitYen: 12_000_000,
};

export const adultNisaRules: readonly AdultNisaRule[] = [adultNisaRule2024];

function isRealIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${field} is required`);
}

function requireIsoDate(
  value: unknown,
  field: string,
): asserts value is string {
  if (!isRealIsoDate(value))
    throw new Error(`${field} must be a real ISO date`);
}

function opaque(value: unknown): unknown {
  return value;
}

function requireAbsoluteHttpsUrl(value: unknown, field: string): void {
  if (typeof value !== "string")
    throw new Error(`${field} must be an absolute HTTPS URL`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTPS URL`);
  }
  if (parsed.protocol !== "https:" || parsed.hostname.length === 0)
    throw new Error(`${field} must be an absolute HTTPS URL`);
}

export function resolveAdultNisaRule(targetDate: string): AdultNisaRule | null {
  if (!isRealIsoDate(targetDate)) return null;
  const matches = adultNisaRules.filter(
    (rule) =>
      targetDate >= rule.metadata.effectiveFrom &&
      (rule.metadata.effectiveTo === null ||
        targetDate <= rule.metadata.effectiveTo),
  );
  if (matches.length > 1)
    throw new Error("multiple adult NISA rules match the target date");
  return matches[0] ?? null;
}

export function validateNisaRule(rule: AdultNisaRule): void {
  if (typeof opaque(rule) !== "object" || opaque(rule) === null)
    throw new Error("NISA rule must be an object");
  if (
    typeof opaque(rule.metadata) !== "object" ||
    opaque(rule.metadata) === null
  )
    throw new Error("NISA rule metadata is required");
  if (!/^jp-nisa-[a-z0-9-]+$/.test(rule.metadata.id))
    throw new Error("NISA rule ID is invalid");
  const domain: unknown = rule.metadata.domain;
  const jurisdiction: unknown = rule.metadata.jurisdiction;
  if (domain !== "nisa" || jurisdiction !== "JP")
    throw new Error("NISA rule context is invalid");
  if (opaque(rule.metadata.status) !== "current")
    throw new Error("NISA rule status is invalid");
  for (const [field, value] of Object.entries({
    "metadata.id": rule.metadata.id,
    "metadata.verifiedBy": rule.metadata.verifiedBy,
    "metadata.sourceTitle": rule.metadata.sourceTitle,
    "metadata.sourcePublisher": rule.metadata.sourcePublisher,
    "metadata.notes": rule.metadata.notes,
  }))
    requireText(value, field);
  for (const [field, value] of Object.entries({
    "metadata.publishedAt": rule.metadata.publishedAt,
    "metadata.verifiedAt": rule.metadata.verifiedAt,
    "metadata.sourceRetrievedAt": rule.metadata.sourceRetrievedAt,
    "metadata.effectiveFrom": rule.metadata.effectiveFrom,
  }))
    requireIsoDate(value, field);
  if (rule.metadata.effectiveTo !== null)
    requireIsoDate(rule.metadata.effectiveTo, "metadata.effectiveTo");
  requireAbsoluteHttpsUrl(rule.metadata.sourceUrl, "metadata.sourceUrl");
  if (
    !Array.isArray(opaque(rule.metadata.sources)) ||
    rule.metadata.sources.length < 2
  )
    throw new Error("NISA rule requires corroborating official sources");
  for (const source of rule.metadata.sources) {
    if (typeof opaque(source) !== "object" || opaque(source) === null)
      throw new Error("NISA rule source metadata is invalid");
    requireText(source.title, "source.title");
    requireText(source.publisher, "source.publisher");
    requireText(source.purpose, "source.purpose");
    requireAbsoluteHttpsUrl(opaque(source.url), "source.url");
    requireIsoDate(source.retrievedAt, "source.retrievedAt");
    requireIsoDate(source.verifiedAt, "source.verifiedAt");
  }
  if (
    rule.metadata.effectiveTo !== null &&
    rule.metadata.effectiveTo < rule.metadata.effectiveFrom
  )
    throw new Error("NISA rule period is invalid");
  if (rule.minimumAgeOnJanuaryFirst !== 18)
    throw new Error("adult NISA minimum age must be 18");
  const limits = [
    rule.annualTsumitateLimitYen,
    rule.annualGrowthLimitYen,
    rule.annualCombinedLimitYen,
    rule.lifetimeTotalLimitYen,
    rule.lifetimeGrowthLimitYen,
  ];
  if (limits.some((value) => !Number.isSafeInteger(value) || value <= 0))
    throw new Error("NISA rule limit is invalid");
  if (
    rule.annualTsumitateLimitYen + rule.annualGrowthLimitYen !==
    rule.annualCombinedLimitYen
  )
    throw new Error("NISA annual limits are inconsistent");
  if (rule.lifetimeGrowthLimitYen > rule.lifetimeTotalLimitYen)
    throw new Error("NISA lifetime limits are inconsistent");
}

export function validateNisaRulePackage(rules: readonly AdultNisaRule[]): void {
  const ids = new Set<string>();
  for (const rule of rules) {
    validateNisaRule(rule);
    if (ids.has(rule.metadata.id))
      throw new Error("NISA rule IDs must be unique");
    ids.add(rule.metadata.id);
  }
  const ordered = [...rules].sort((left, right) =>
    left.metadata.effectiveFrom.localeCompare(right.metadata.effectiveFrom),
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (
      previous &&
      current &&
      (previous.metadata.effectiveTo === null ||
        previous.metadata.effectiveTo >= current.metadata.effectiveFrom)
    )
      throw new Error("adult NISA rule periods must not overlap");
  }
}

validateNisaRulePackage(adultNisaRules);
