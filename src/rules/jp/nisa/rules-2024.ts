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

export function resolveAdultNisaRule(targetDate: string): AdultNisaRule | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
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
  if (!/^jp-nisa-[a-z0-9-]+$/.test(rule.metadata.id))
    throw new Error("NISA rule ID is invalid");
  const domain: unknown = rule.metadata.domain;
  const jurisdiction: unknown = rule.metadata.jurisdiction;
  if (domain !== "nisa" || jurisdiction !== "JP")
    throw new Error("NISA rule context is invalid");
  if (!/^https:\/\//.test(rule.metadata.sourceUrl))
    throw new Error("NISA source URL must use https");
  if (rule.metadata.sources.length < 2)
    throw new Error("NISA rule requires corroborating official sources");
  for (const source of rule.metadata.sources) {
    if (
      !source.title ||
      !source.publisher ||
      !source.purpose ||
      !/^https:\/\//.test(source.url) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedAt)
    )
      throw new Error("NISA rule source metadata is invalid");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.metadata.effectiveFrom))
    throw new Error("NISA effectiveFrom is invalid");
  if (
    rule.metadata.effectiveTo !== null &&
    rule.metadata.effectiveTo < rule.metadata.effectiveFrom
  )
    throw new Error("NISA rule period is invalid");
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
