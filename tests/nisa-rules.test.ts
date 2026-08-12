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
  type AdultNisaRule,
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
    expect(resolveAdultNisaRule("2024-13-40")).toBeNull();
    expect(resolveAdultNisaRule("2024-02-30")).toBeNull();
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

  it.each([
    [
      "status",
      { metadata: { ...adultNisaRule2024.metadata, status: "draft" } },
    ],
    [
      "publishedAt",
      {
        metadata: { ...adultNisaRule2024.metadata, publishedAt: "2024-02-30" },
      },
    ],
    [
      "verifiedAt",
      { metadata: { ...adultNisaRule2024.metadata, verifiedAt: "" } },
    ],
    [
      "verifiedBy",
      { metadata: { ...adultNisaRule2024.metadata, verifiedBy: "" } },
    ],
    [
      "sourceTitle",
      { metadata: { ...adultNisaRule2024.metadata, sourceTitle: "" } },
    ],
    [
      "sourceUrl",
      {
        metadata: {
          ...adultNisaRule2024.metadata,
          sourceUrl: "http://example.invalid",
        },
      },
    ],
    [
      "sourcePublisher",
      { metadata: { ...adultNisaRule2024.metadata, sourcePublisher: "" } },
    ],
    [
      "sourceRetrievedAt",
      {
        metadata: {
          ...adultNisaRule2024.metadata,
          sourceRetrievedAt: "2024-13-01",
        },
      },
    ],
    ["notes", { metadata: { ...adultNisaRule2024.metadata, notes: "" } }],
    ["minimum age", { minimumAgeOnJanuaryFirst: 17 }],
  ] as const)("strictly rejects invalid %s metadata", (_label, changes) => {
    const candidate = {
      ...adultNisaRule2024,
      ...changes,
    } as unknown as AdultNisaRule;
    expect(() => validateNisaRule(candidate)).toThrow();
  });

  it("rejects invalid source fields, real-date errors, reversed and overlapping periods", () => {
    expect(() =>
      validateNisaRule({ metadata: {} } as unknown as AdultNisaRule),
    ).toThrow();
    expect(() => validateNisaRule(null as unknown as AdultNisaRule)).toThrow();
    const invalidSource = {
      ...adultNisaRule2024,
      metadata: {
        ...adultNisaRule2024.metadata,
        sources: [
          { ...required(nisaRuleSources[0], "source"), purpose: "" },
          required(nisaRuleSources[1], "source"),
        ],
      },
    };
    expect(() => validateNisaRule(invalidSource)).toThrow();
    const reversed = {
      ...adultNisaRule2024,
      metadata: {
        ...adultNisaRule2024.metadata,
        effectiveFrom: "2024-12-31",
        effectiveTo: "2024-01-01",
      },
    };
    expect(() => validateNisaRule(reversed)).toThrow("period");
    const adjacent = {
      ...adultNisaRule2024,
      metadata: {
        ...adultNisaRule2024.metadata,
        id: "jp-nisa-adult-next",
        effectiveFrom: "2025-01-01",
      },
    };
    const first = {
      ...adultNisaRule2024,
      metadata: { ...adultNisaRule2024.metadata, effectiveTo: "2025-01-01" },
    };
    expect(() => validateNisaRulePackage([first, adjacent])).toThrow("overlap");
    const nonOverlappingFirst = {
      ...first,
      metadata: { ...first.metadata, effectiveTo: "2024-12-31" },
    };
    expect(() =>
      validateNisaRulePackage([nonOverlappingFirst, adjacent]),
    ).not.toThrow();
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
    expect(result.annualContributions["2026"]).toMatchObject({
      tsumitateYen: 1_200_000,
      tsumitateLimitYen: 1_200_000,
      tsumitateRemainingYen: 0,
      growthYen: 0,
      growthRemainingYen: 2_400_000,
      combinedYen: 1_200_000,
      combinedRemainingYen: 2_400_000,
    });
    expect(result.annualContributions["2027"]).toMatchObject({
      tsumitateYen: 1_200_000,
      tsumitateRemainingYen: 0,
      combinedRemainingYen: 2_400_000,
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
  it.each(["2008-01-01", "2008-01-02"])(
    "applies the 2026 adult rule to legal-age boundary %s",
    (birthDate) => {
      expect(
        calculateNisaPlan(plan(), scenario(), { birthDate, active: true })
          .status,
      ).toBe("complete");
    },
  );

  it("rejects actual minors while handling leap days and invalid dates", () => {
    const minor = calculateNisaPlan(plan(), scenario(), {
      birthDate: "2008-01-03",
      active: true,
    });
    expect(minor.status).toBe("unsupported");
    expect(minor.messages.join(" ")).toContain("18歳未満");
    expect(
      calculateNisaPlan(plan(), scenario(), {
        birthDate: "2008-02-29",
        active: true,
      }).status,
    ).toBe("unsupported");
    expect(
      calculateNisaPlan(plan(), scenario(), {
        birthDate: "2007-02-28",
        active: true,
      }).status,
    ).toBe("complete");
    expect(
      calculateNisaPlan(plan(), scenario(), {
        birthDate: "2007-02-29",
        active: true,
      }).status,
    ).toBe("incomplete");
  });

  it("derives annual limits, remaining amounts, and first lifetime reach months", () => {
    const reached = calculateNisaPlan(
      plan({
        startMonth: "2026-12",
        targetMonth: "2027-01",
        usedLimitYen: 17_000_000,
        usedGrowthLimitYen: 11_000_000,
        monthlyGrowthYen: 500_000,
      }),
      scenario(),
      adult,
    );
    expect(reached.annualContributions["2026"]).toMatchObject({
      growthLimitYen: 2_400_000,
      growthYen: 500_000,
      growthRemainingYen: 1_900_000,
      combinedLimitYen: 3_600_000,
      combinedRemainingYen: 3_100_000,
    });
    expect(reached.lifetimeLimitReach).toEqual({
      status: "reached",
      month: "2027-01",
    });
    expect(reached.lifetimeGrowthLimitReach).toEqual({
      status: "reached",
      month: "2027-01",
    });
    const starting = calculateNisaPlan(
      plan({ usedLimitYen: 18_000_001, usedGrowthLimitYen: 12_000_001 }),
      scenario(),
      adult,
    );
    expect(starting.lifetimeLimitReach.status).toBe("starting-reached");
    expect(starting.lifetimeGrowthLimitReach.status).toBe("starting-reached");
    const notReached = calculateNisaPlan(plan(), scenario(), adult);
    expect(notReached.lifetimeLimitReach.status).toBe("not-reached");
  });

  it("keeps blank money distinct from explicit zero", () => {
    const blank = calculateNisaPlan(
      plan({ currentBalanceYen: null }),
      scenario(),
      adult,
    );
    expect(blank.status).toBe("incomplete");
    expect(blank.lifetimeLimitReach.status).toBe("uncomputed");
    expect(calculateNisaPlan(plan(), scenario(), adult).status).toBe(
      "complete",
    );
    const blankPurchase = calculateNisaPlan(
      plan({
        additionalPurchases: [
          { id: "blank", month: "2026-01", bucket: "growth", amountYen: null },
        ],
      }),
      scenario(),
      adult,
    );
    expect(blankPurchase.status).toBe("incomplete");
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
