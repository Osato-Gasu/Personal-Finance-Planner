import { describe, expect, it } from "vitest";
import {
  calculateNisaPlan,
  validateInvestmentScenario,
  validateNisaPlan,
  type InvestmentScenario,
  type NisaPlan,
} from "../src/domain/nisa";
import {
  adultNisaRule2024,
  adultNisaRules,
  nisaRuleSources,
  resolveAdultNisaRule,
  validateNisaRule,
  validateNisaRulePackage,
} from "../src/rules/jp/nisa/rules-2024";

const adult = { birthDate: "1990-06-15", active: true };

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function scenario(
  changes: Partial<InvestmentScenario> = {},
): InvestmentScenario {
  return {
    id: "scenario-standard",
    memberId: "self",
    kind: "standard",
    annualReturnBasisPoints: 0,
    annualFeeBasisPoints: 0,
    annualInflationBasisPoints: 0,
    ...changes,
  };
}

function plan(changes: Partial<NisaPlan> = {}): NisaPlan {
  return {
    id: "nisa-self",
    memberId: "self",
    japanResidentConfirmed: true,
    startMonth: "2026-01",
    targetMonth: "2026-12",
    currentBalanceYen: 0,
    currentBookValueYen: 0,
    usedLimitYen: 0,
    usedGrowthLimitYen: 0,
    monthlyTsumitateYen: 0,
    monthlyGrowthYen: 0,
    additionalPurchases: [],
    contributionTiming: "end",
    activeScenarioId: "scenario-standard",
    active: true,
    ...changes,
  };
}

describe("adult NISA 2024 rule package", () => {
  it("contains the verified statutory limits and official metadata", () => {
    expect(adultNisaRule2024).toMatchObject({
      minimumAgeOnJanuaryFirst: 18,
      annualTsumitateLimitYen: 1_200_000,
      annualGrowthLimitYen: 2_400_000,
      annualCombinedLimitYen: 3_600_000,
      lifetimeTotalLimitYen: 18_000_000,
      lifetimeGrowthLimitYen: 12_000_000,
    });
    expect(nisaRuleSources.map((source) => source.publisher)).toContain(
      "金融庁",
    );
    expect(nisaRuleSources.map((source) => source.publisher)).toContain(
      "国税庁",
    );
    expect(
      nisaRuleSources.every(
        (source) =>
          source.url.startsWith("https://") &&
          source.retrievedAt === "2026-08-12" &&
          source.verifiedAt === "2026-08-12",
      ),
    ).toBe(true);
    expect(() => validateNisaRule(adultNisaRule2024)).not.toThrow();
    expect(() => validateNisaRulePackage(adultNisaRules)).not.toThrow();
  });

  it("resolves only the 2024-and-later adult rule period", () => {
    expect(resolveAdultNisaRule("2023-12-31")).toBeNull();
    expect(resolveAdultNisaRule("2024-01-01")?.metadata.id).toBe(
      adultNisaRule2024.metadata.id,
    );
    expect(resolveAdultNisaRule("2027-01-01")?.minimumAgeOnJanuaryFirst).toBe(
      18,
    );
  });

  it("rejects malformed rule metadata and inconsistent limits", () => {
    expect(() =>
      validateNisaRule({
        ...adultNisaRule2024,
        annualCombinedLimitYen: 3_599_999,
      }),
    ).toThrow("annual limits");
    expect(() =>
      validateNisaRule({
        ...adultNisaRule2024,
        metadata: {
          ...adultNisaRule2024.metadata,
          sources: [
            {
              ...required(nisaRuleSources[0], "primary source"),
              url: "http://example.invalid",
            },
            required(nisaRuleSources[1], "secondary source"),
          ],
        },
      }),
    ).toThrow("source metadata");
    expect(() =>
      validateNisaRulePackage([adultNisaRule2024, adultNisaRule2024]),
    ).toThrow("unique");
  });
});

describe("adult NISA limit boundaries", () => {
  it.each([
    [1_199_999, "complete", 1_199_999],
    [1_200_000, "complete", 1_200_000],
    [1_200_001, "invalid", 1_200_001],
  ] as const)(
    "evaluates annual tsumitate %i yen as %s",
    (amountYen, status, expected) => {
      const result = calculateNisaPlan(
        plan({
          targetMonth: "2026-01",
          additionalPurchases: [
            { id: "extra", month: "2026-01", bucket: "tsumitate", amountYen },
          ],
        }),
        scenario(),
        adult,
      );
      expect(result.status).toBe(status);
      expect(result.annualContributions["2026"]?.tsumitateYen).toBe(expected);
      expect(
        result.issues.some((issue) => issue.code === "annual-tsumitate"),
      ).toBe(status === "invalid");
    },
  );

  it.each([
    [2_399_999, "complete"],
    [2_400_000, "complete"],
    [2_400_001, "invalid"],
  ] as const)("evaluates annual growth %i yen as %s", (amountYen, status) => {
    const result = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        additionalPurchases: [
          { id: "extra", month: "2026-01", bucket: "growth", amountYen },
        ],
      }),
      scenario(),
      adult,
    );
    expect(result.status).toBe(status);
    expect(result.issues.some((issue) => issue.code === "annual-growth")).toBe(
      status === "invalid",
    );
  });

  it.each([
    [3_599_999, "complete"],
    [3_600_000, "complete"],
    [3_600_001, "invalid"],
  ] as const)("evaluates annual combined %i yen as %s", (amountYen, status) => {
    const growthYen = 2_400_000;
    const result = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        additionalPurchases: [
          {
            id: "tsumitate",
            month: "2026-01",
            bucket: "tsumitate",
            amountYen: amountYen - growthYen,
          },
          {
            id: "growth",
            month: "2026-01",
            bucket: "growth",
            amountYen: growthYen,
          },
        ],
      }),
      scenario(),
      adult,
    );
    expect(result.status).toBe(status);
    expect(
      result.issues.some((issue) => issue.code === "annual-combined"),
    ).toBe(status === "invalid");
  });

  it.each([
    [17_999_999, "complete"],
    [18_000_000, "complete"],
    [18_000_001, "invalid"],
  ] as const)("evaluates lifetime total %i yen as %s", (totalYen, status) => {
    const result = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        usedLimitYen: totalYen - 1,
        monthlyTsumitateYen: 1,
      }),
      scenario(),
      adult,
    );
    expect(result.status).toBe(status);
    expect(result.lifetimeRemainingYen).toBe(18_000_000 - totalYen);
  });

  it.each([
    [11_999_999, "complete"],
    [12_000_000, "complete"],
    [12_000_001, "invalid"],
  ] as const)("evaluates lifetime growth %i yen as %s", (totalYen, status) => {
    const result = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        usedLimitYen: totalYen - 1,
        usedGrowthLimitYen: totalYen - 1,
        monthlyGrowthYen: 1,
      }),
      scenario(),
      adult,
    );
    expect(result.status).toBe(status);
    expect(result.lifetimeGrowthRemainingYen).toBe(12_000_000 - totalYen);
  });

  it("resets annual totals across calendar years while accumulating lifetime use", () => {
    const result = calculateNisaPlan(
      plan({
        startMonth: "2026-12",
        targetMonth: "2027-01",
        monthlyTsumitateYen: 1_200_000,
      }),
      scenario(),
      adult,
    );
    expect(result.status).toBe("complete");
    expect(result.annualContributions).toEqual({
      "2026": { tsumitateYen: 1_200_000, growthYen: 0 },
      "2027": { tsumitateYen: 1_200_000, growthYen: 0 },
    });
    expect(result.futureContributionsYen).toBe(2_400_000);
  });

  it("does not use market value as book-value limit consumption", () => {
    const low = calculateNisaPlan(
      plan({
        currentBalanceYen: 1,
        currentBookValueYen: 500_000,
        usedLimitYen: 700_000,
      }),
      scenario(),
      adult,
    );
    const high = calculateNisaPlan(
      plan({
        currentBalanceYen: 9_000_000,
        currentBookValueYen: 500_000,
        usedLimitYen: 700_000,
      }),
      scenario(),
      adult,
    );
    expect(high.lifetimeRemainingYen).toBe(low.lifetimeRemainingYen);
    expect(high.projectedPrincipalYen).toBe(low.projectedPrincipalYen);
  });
});

describe("NISA applicability and projection", () => {
  it("applies adult rules at 18 on January 1 and rejects younger users", () => {
    expect(
      calculateNisaPlan(plan(), scenario(), {
        birthDate: "2008-01-01",
        active: true,
      }).status,
    ).toBe("complete");
    const minor = calculateNisaPlan(plan(), scenario(), {
      birthDate: "2008-01-02",
      active: true,
    });
    expect(minor.status).toBe("unsupported");
    expect(minor.messages.join(" ")).toContain("18歳未満");
  });

  it("distinguishes incomplete, unsupported, and missing-rule", () => {
    expect(calculateNisaPlan(plan(), undefined, adult).status).toBe(
      "incomplete",
    );
    expect(
      calculateNisaPlan(
        plan({ japanResidentConfirmed: false }),
        scenario(),
        adult,
      ).status,
    ).toBe("incomplete");
    expect(
      calculateNisaPlan(plan(), scenario(), {
        birthDate: "2000-02-30",
        active: true,
      }).status,
    ).toBe("incomplete");
    expect(
      calculateNisaPlan(
        plan(),
        scenario({ annualReturnBasisPoints: null }),
        adult,
      ).status,
    ).toBe("incomplete");
    expect(
      calculateNisaPlan(plan(), scenario(), { active: false }).status,
    ).toBe("unsupported");
    expect(
      calculateNisaPlan(
        plan({ startMonth: "2023-01", targetMonth: "2023-12" }),
        scenario(),
        adult,
      ).status,
    ).toBe("missing-rule");
  });

  it("uses different deterministic order for beginning and end contributions", () => {
    const assumptions = scenario({ annualReturnBasisPoints: 1_200 });
    const beginning = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        monthlyTsumitateYen: 100_000,
        contributionTiming: "beginning",
      }),
      assumptions,
      adult,
    );
    const end = calculateNisaPlan(
      plan({
        targetMonth: "2026-01",
        monthlyTsumitateYen: 100_000,
        contributionTiming: "end",
      }),
      assumptions,
      adult,
    );
    expect(beginning.projectedBalanceYen).toBeGreaterThan(
      end.projectedBalanceYen ?? 0,
    );
  });

  it("keeps principal, gain, fee, inflation, and negative-return calculations explicit", () => {
    const input = plan({
      currentBalanceYen: 120_000,
      currentBookValueYen: 100_000,
      monthlyTsumitateYen: 10_000,
    });
    const zero = calculateNisaPlan(input, scenario(), adult);
    expect(zero.projectedPrincipalYen).toBe(220_000);
    expect(zero.projectedBalanceYen).toBe(240_000);
    expect(zero.projectedGainYen).toBe(20_000);
    const adjusted = calculateNisaPlan(
      input,
      scenario({
        annualReturnBasisPoints: -500,
        annualFeeBasisPoints: 100,
        annualInflationBasisPoints: 200,
      }),
      adult,
    );
    expect(adjusted.projectedBalanceYen).toBeLessThan(240_000);
    expect(adjusted.realValueYen).toBeLessThan(
      adjusted.projectedBalanceYen ?? 0,
    );
    expect(adjusted.assumptions).toEqual({
      annualReturnBasisPoints: -500,
      annualFeeBasisPoints: 100,
      annualInflationBasisPoints: 200,
    });
  });

  it("handles a long plan deterministically without persisting derived values", () => {
    const result = calculateNisaPlan(
      plan({ targetMonth: "2035-12", monthlyTsumitateYen: 10_000 }),
      scenario({ annualReturnBasisPoints: 300, annualFeeBasisPoints: 20 }),
      adult,
    );
    expect(result.status).toBe("complete");
    expect(result.futureContributionsYen).toBe(1_200_000);
    expect(result.projectedBalanceYen).toBeGreaterThan(1_200_000);
    expect(plan()).not.toHaveProperty("projectedBalanceYen");
  });

  it("rejects structurally invalid periods and contribution entries", () => {
    expect(() => validateNisaPlan(plan({ startMonth: "2026-13" }))).toThrow(
      "YYYY-MM",
    );
    expect(() =>
      validateNisaPlan(
        plan({
          additionalPurchases: [
            { id: "outside", month: "2025-12", bucket: "growth", amountYen: 1 },
          ],
        }),
      ),
    ).toThrow("outside");
    expect(() => validateNisaPlan(plan({ usedGrowthLimitYen: 1 }))).toThrow(
      "cannot exceed",
    );
    expect(() =>
      validateNisaPlan(plan({ startMonth: "2026-01", targetMonth: "2126-01" })),
    ).toThrow("100 years");
  });

  it("rejects unsafe assumptions and values without clamping", () => {
    expect(() =>
      validateInvestmentScenario(
        scenario({ annualReturnBasisPoints: -10_001 }),
      ),
    ).toThrow("-100%");
    expect(() =>
      validateNisaPlan(
        plan({ currentBalanceYen: Number.MAX_SAFE_INTEGER + 1 }),
      ),
    ).toThrow("safe integer");
    const overflow = calculateNisaPlan(
      plan({ monthlyTsumitateYen: Number.MAX_SAFE_INTEGER }),
      scenario(),
      adult,
    );
    expect(overflow.status).toBe("out-of-range");
  });
});
