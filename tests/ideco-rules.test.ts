import { describe, expect, it } from "vitest";
import {
  calculateIdecoAnnualPaidContribution,
  calculateIdecoPlan,
  createIdecoPlan,
  parseIdecoPlan,
  validateIdecoPlan,
  type IdecoPlan,
} from "../src/domain/ideco";
import type { InvestmentScenario } from "../src/domain/nisa";
import {
  calculateIdecoAllowance,
  currentIdecoRule,
  idecoRules,
  resolveIdecoRule,
  scheduledIdecoRule,
  validateIdecoRule,
  validateIdecoRulePackage,
  type IdecoRuleContext,
} from "../src/rules/jp/ideco/rules";

const member = {
  id: "self",
  active: true,
  birthDate: "1990-01-01",
};

const scenario: InvestmentScenario = {
  id: "scenario-standard",
  memberId: "self",
  kind: "standard",
  annualReturnBasisPoints: 300,
  annualFeeBasisPoints: 50,
  annualInflationBasisPoints: 100,
};

const reference = {
  taxYear: 2026,
  referenceDate: "2026-08-13",
} as const;

function context(values: Partial<IdecoRuleContext> = {}): IdecoRuleContext {
  return {
    participantCategory: "category2",
    participantCategoryConfirmed: true,
    employerPensionType: "none",
    employerDcContributionYen: null,
    otherPensionEquivalentYen: null,
    nationalPensionFundContributionYen: null,
    nationalPensionAdditionalPremiumYen: null,
    matchingContributionActive: false,
    idecoPlusActive: false,
    ...values,
  };
}

function plan(values: Partial<IdecoPlan> = {}): IdecoPlan {
  return {
    ...createIdecoPlan({
      id: "ideco-self",
      memberId: "self",
      activeScenarioId: scenario.id,
    }),
    participantCategory: "category2",
    participantCategoryConfirmed: true,
    employerPensionType: "none",
    matchingContributionActive: false,
    idecoPlusActive: false,
    annualUnitContributionActive: false,
    startMonth: "2026-08",
    monthlyContributionYen: 10_000,
    currentBalanceYen: 100_000,
    currentContributionTotalYen: 80_000,
    monthlyFeeYen: 0,
    projectionTarget: { type: "month", month: "2026-12" },
    ...values,
  };
}

describe("iDeCo rule package", () => {
  it("validates the current and scheduled rules with official metadata", () => {
    expect(() => validateIdecoRulePackage(idecoRules)).not.toThrow();
    expect(currentIdecoRule.metadata.status).toBe("current");
    expect(scheduledIdecoRule.metadata.status).toBe("scheduled");
    for (const rule of idecoRules) {
      expect(rule.metadata.sourceUrls.length).toBeGreaterThanOrEqual(6);
      expect(rule.metadata.verifiedAt).toBe("2026-08-13");
      expect(rule.metadata.sourceRetrievedAt).toBe("2026-08-13");
    }
  });

  it.each([
    ["2026-11", currentIdecoRule.metadata.id],
    ["2026-12", scheduledIdecoRule.metadata.id],
    ["2024-12", currentIdecoRule.metadata.id],
  ])("resolves %s without early scheduled application", (month, id) => {
    expect(resolveIdecoRule(month)?.metadata.id).toBe(id);
  });

  it.each(["2030-00", "2030-13", "2030-1", "text"])(
    "rejects invalid YearMonth %s",
    (month) => {
      expect(resolveIdecoRule(month)).toBeNull();
    },
  );

  it("rejects invalid and non-HTTPS source URLs", () => {
    for (const url of ["http://example.test", "/relative", "https://"]) {
      const candidate = structuredClone(currentIdecoRule);
      (candidate.metadata.sourceUrls as string[])[0] = url;
      expect(() => validateIdecoRule(candidate)).toThrow("HTTPS");
    }
  });

  it("rejects duplicate official source URLs", () => {
    const candidate = structuredClone(currentIdecoRule);
    (candidate.metadata.sourceUrls as string[])[1] =
      candidate.metadata.sourceUrls[0] ?? "";
    expect(() => validateIdecoRule(candidate)).toThrow("unique");
  });

  it("rejects an invalid real date, duplicate ID, overlap, and gap", () => {
    const invalidDate = structuredClone(currentIdecoRule);
    invalidDate.metadata.verifiedAt = "2026-02-30";
    expect(() => validateIdecoRule(invalidDate)).toThrow("verifiedAt");
    const duplicate = structuredClone(currentIdecoRule);
    expect(() =>
      validateIdecoRulePackage([currentIdecoRule, duplicate]),
    ).toThrow("unique");
    const overlap = structuredClone(scheduledIdecoRule);
    overlap.metadata.effectiveFrom = "2026-11-30";
    expect(() => validateIdecoRulePackage([currentIdecoRule, overlap])).toThrow(
      "overlap",
    );
    const gap = structuredClone(scheduledIdecoRule);
    gap.metadata.effectiveFrom = "2026-12-02";
    expect(() => validateIdecoRulePackage([currentIdecoRule, gap])).toThrow(
      "gap",
    );
  });

  it("rejects changed statutory values", () => {
    const candidate = structuredClone(scheduledIdecoRule);
    candidate.category2SharedLimitYen = 61_999;
    expect(() => validateIdecoRule(candidate)).toThrow("statutory");
  });
});

describe("participant-category allowance matrix", () => {
  it.each([
    ["category1", 68_000],
    ["category3", 23_000],
    ["category4", 68_000],
  ] as const)("uses current %s base limit", (category, expected) => {
    expect(
      calculateIdecoAllowance(
        "2026-11",
        context({
          participantCategory: category,
          nationalPensionFundContributionYen:
            category === "category3" ? null : 0,
          nationalPensionAdditionalPremiumYen:
            category === "category3" ? null : 0,
        }),
      ),
    ).toMatchObject({ status: "complete", allowedContributionYen: expected });
  });

  it("subtracts National Pension Fund and additional premium for categories 1 and 4", () => {
    for (const participantCategory of ["category1", "category4"] as const)
      expect(
        calculateIdecoAllowance(
          "2026-11",
          context({
            participantCategory,
            nationalPensionFundContributionYen: 20_000,
            nationalPensionAdditionalPremiumYen: 400,
          }),
        ).allowedContributionYen,
      ).toBe(47_600);
  });

  it("uses current category2 no-pension, absolute, and residual limits", () => {
    expect(
      calculateIdecoAllowance("2026-11", context()).allowedContributionYen,
    ).toBe(23_000);
    expect(
      calculateIdecoAllowance(
        "2026-11",
        context({
          employerPensionType: "corporate-dc",
          employerDcContributionYen: 10_000,
        }),
      ).allowedContributionYen,
    ).toBe(20_000);
    expect(
      calculateIdecoAllowance(
        "2026-11",
        context({
          employerPensionType: "corporate-dc-and-db-or-other",
          employerDcContributionYen: 30_000,
          otherPensionEquivalentYen: 10_000,
        }),
      ).allowedContributionYen,
    ).toBe(15_000);
  });

  it("does not apply category5 before 2026-12", () => {
    expect(
      calculateIdecoAllowance(
        "2026-11",
        context({ participantCategory: "category5" }),
      ).status,
    ).toBe("unsupported");
  });

  it.each([
    ["category1", 75_000],
    ["category2", 62_000],
    ["category3", 23_000],
    ["category4", 75_000],
    ["category5", 62_000],
  ] as const)("uses scheduled %s limit", (participantCategory, expected) => {
    expect(
      calculateIdecoAllowance(
        "2026-12",
        context({
          participantCategory,
          nationalPensionFundContributionYen:
            participantCategory === "category1" ||
            participantCategory === "category4"
              ? 0
              : null,
          nationalPensionAdditionalPremiumYen:
            participantCategory === "category1" ||
            participantCategory === "category4"
              ? 0
              : null,
        }),
      ).allowedContributionYen,
    ).toBe(expected);
  });

  it("uses scheduled category2 and category5 pension residuals", () => {
    for (const participantCategory of ["category2", "category5"] as const)
      expect(
        calculateIdecoAllowance(
          "2026-12",
          context({
            participantCategory,
            employerPensionType: "corporate-dc-and-db-or-other",
            employerDcContributionYen: 20_000,
            otherPensionEquivalentYen: 12_000,
          }),
        ).allowedContributionYen,
      ).toBe(30_000);
  });

  it("floors negative residuals at zero", () => {
    expect(
      calculateIdecoAllowance(
        "2026-12",
        context({
          employerPensionType: "corporate-dc",
          employerDcContributionYen: 70_000,
        }),
      ).allowedContributionYen,
    ).toBe(0);
  });

  it.each([
    [context({ participantCategory: null }), "incomplete"],
    [context({ participantCategoryConfirmed: false }), "incomplete"],
    [context({ employerPensionType: null }), "incomplete"],
    [
      context({
        employerPensionType: "corporate-dc",
        employerDcContributionYen: null,
      }),
      "incomplete",
    ],
    [context({ matchingContributionActive: true }), "unsupported"],
    [context({ idecoPlusActive: true }), "unsupported"],
  ] as const)("separates missing and unsupported context", (value, status) => {
    expect(calculateIdecoAllowance("2026-12", value).status).toBe(status);
  });

  it("distinguishes explicit enterprise zero from blank", () => {
    const blank = calculateIdecoAllowance(
      "2026-12",
      context({
        employerPensionType: "corporate-dc",
        employerDcContributionYen: null,
      }),
    );
    const zero = calculateIdecoAllowance(
      "2026-12",
      context({
        employerPensionType: "corporate-dc",
        employerDcContributionYen: 0,
      }),
    );
    expect(blank.status).toBe("incomplete");
    expect(zero).toMatchObject({
      status: "complete",
      allowedContributionYen: 62_000,
    });
  });
});

describe("monthly contribution, payment month, and projection", () => {
  it.each([
    [null, "incomplete"],
    [0, "complete"],
    [4_999, "invalid"],
    [5_000, "complete"],
    [5_001, "invalid"],
    [6_000, "complete"],
    [22_999, "invalid"],
    [23_000, "complete"],
    [23_001, "invalid"],
  ] as const)("classifies contribution %s as %s", (amount, status) => {
    const candidate = plan({
      startMonth: "2026-11",
      projectionTarget: { type: "month", month: "2026-11" },
      monthlyContributionYen: amount,
    });
    const before = structuredClone(candidate);
    expect(
      calculateIdecoPlan(candidate, scenario, member, reference).status,
    ).toBe(status);
    expect(candidate).toEqual(before);
  });

  it("accepts exact scheduled limit and rejects one yen over", () => {
    expect(
      calculateIdecoPlan(
        plan({
          startMonth: "2026-12",
          projectionTarget: { type: "month", month: "2026-12" },
          monthlyContributionYen: 62_000,
        }),
        scenario,
        member,
        reference,
      ).status,
    ).toBe("complete");
    const over = calculateIdecoPlan(
      plan({
        startMonth: "2026-12",
        projectionTarget: { type: "month", month: "2026-12" },
        monthlyContributionYen: 62_001,
      }),
      scenario,
      member,
      reference,
    );
    expect(over).toMatchObject({
      status: "invalid",
      exceededByYen: 1,
      affectedMonth: "2026-12",
    });
  });

  it("does not make 5,000 valid when residual is below 5,000", () => {
    expect(
      calculateIdecoPlan(
        plan({
          startMonth: "2026-12",
          projectionTarget: { type: "month", month: "2026-12" },
          employerPensionType: "corporate-dc",
          employerDcContributionYen: 60_000,
          monthlyContributionYen: 5_000,
        }),
        scenario,
        member,
        reference,
      ),
    ).toMatchObject({ status: "invalid", allowedContributionYen: 2_000 });
  });

  it("keeps annual-unit contribution unsupported without conversion", () => {
    expect(
      calculateIdecoPlan(
        plan({ annualUnitContributionActive: true }),
        scenario,
        member,
        reference,
      ).status,
    ).toBe("unsupported");
  });

  it("uses actual payment months and combines a non-overlapping snapshot", () => {
    const candidate = plan({
      startMonth: "2026-01",
      monthlyContributionYen: 10_000,
      taxContributionSnapshots: [
        { taxYear: 2026, paidThroughMonth: "2026-08", paidYen: 70_000 },
      ],
      currentContributionTotalYen: 0,
    });
    expect(
      calculateIdecoAnnualPaidContribution(candidate, 2026, "2026-08-26"),
    ).toEqual({
      status: "complete",
      amountYen: 110_000,
      messages: [],
    });
  });

  it("requires missing prior paid history instead of assuming zero", () => {
    expect(
      calculateIdecoAnnualPaidContribution(
        plan({ startMonth: "2026-01", taxContributionSnapshots: [] }),
        2026,
        "2026-08-26",
      ).status,
    ).toBe("incomplete");
  });

  it("does not project tax-year payments beyond the plan horizon", () => {
    expect(
      calculateIdecoAnnualPaidContribution(
        plan({
          startMonth: "2026-08",
          projectionTarget: { type: "month", month: "2026-09" },
        }),
        2026,
        "2026-08-13",
      ).amountYen,
    ).toBe(20_000);
  });

  it("uses the explicit reference date and the payment-day boundary", () => {
    const candidate = plan({
      startMonth: "2026-01",
      currentContributionTotalYen: 0,
      taxContributionSnapshots: [
        { taxYear: 2026, paidThroughMonth: "2026-08", paidYen: 70_000 },
      ],
    });
    expect(
      calculateIdecoAnnualPaidContribution(candidate, 2026, "2026-08-25"),
    ).toMatchObject({ status: "invalid", amountYen: null });
    expect(
      calculateIdecoAnnualPaidContribution(candidate, 2026, "2026-08-26"),
    ).toEqual({ status: "complete", amountYen: 110_000, messages: [] });
  });

  it("distinguishes missing past payments from future projections", () => {
    const missingPast = plan({
      startMonth: "2026-01",
      currentContributionTotalYen: 0,
      taxContributionSnapshots: [
        { taxYear: 2026, paidThroughMonth: "2026-07", paidYen: 60_000 },
      ],
    });
    expect(
      calculateIdecoAnnualPaidContribution(missingPast, 2026, "2026-08-26"),
    ).toMatchObject({ status: "incomplete", amountYen: null });

    const futureOnly = plan({
      startMonth: "2026-10",
      projectionTarget: { type: "month", month: "2026-12" },
      currentContributionTotalYen: 0,
      taxContributionSnapshots: [],
    });
    expect(
      calculateIdecoAnnualPaidContribution(futureOnly, 2026, "2026-09-25"),
    ).toEqual({ status: "complete", amountYen: 20_000, messages: [] });
  });

  it("does not auto-fill missed payments and requires an explicit reference date", () => {
    const candidate = plan({ startMonth: "2026-01" });
    expect(
      calculateIdecoAnnualPaidContribution(candidate, 2026, null),
    ).toMatchObject({ status: "incomplete", amountYen: null });
    expect(
      calculateIdecoAnnualPaidContribution(candidate, 2026, "2030-02-30"),
    ).toMatchObject({ status: "out-of-range", amountYen: null });
  });

  it("assigns a December contribution to the next January payment year", () => {
    const december = plan({
      startMonth: "2026-12",
      projectionTarget: { type: "month", month: "2026-12" },
      currentContributionTotalYen: 0,
      taxContributionSnapshots: [],
    });
    expect(
      calculateIdecoAnnualPaidContribution(december, 2026, "2026-11-25")
        .amountYen,
    ).toBe(0);
    expect(
      calculateIdecoAnnualPaidContribution(december, 2027, "2026-11-25")
        .amountYen,
    ).toBe(10_000);
  });

  it("rejects duplicate snapshot years, wrong paid month, and inconsistent paid value", () => {
    const duplicate = plan({
      taxContributionSnapshots: [
        { taxYear: 2026, paidThroughMonth: "2026-08", paidYen: 0 },
        { taxYear: 2026, paidThroughMonth: "2026-09", paidYen: 0 },
      ],
    });
    expect(() => validateIdecoPlan(duplicate)).toThrow("unique");
    expect(() =>
      validateIdecoPlan(
        plan({
          taxContributionSnapshots: [
            { taxYear: 2026, paidThroughMonth: "2027-01", paidYen: 0 },
          ],
        }),
      ),
    ).toThrow("within taxYear");
    expect(() =>
      validateIdecoPlan(
        plan({
          startMonth: "2026-01",
          currentContributionTotalYen: 0,
          taxContributionSnapshots: [
            { taxYear: 2026, paidThroughMonth: "2026-02", paidYen: 20_000 },
          ],
        }),
      ),
    ).toThrow("inconsistent");
  });

  it.each([
    [0, 0, "end"],
    [-100, 0, "end"],
    [300, 50, "end"],
    [300, 50, "beginning"],
  ] as const)(
    "projects return %s fee %s timing %s",
    (annualReturn, annualFee, timing) => {
      const result = calculateIdecoPlan(
        plan({ contributionTiming: timing }),
        {
          ...scenario,
          annualReturnBasisPoints: annualReturn,
          annualFeeBasisPoints: annualFee,
        },
        member,
        reference,
      );
      expect(result.status).toBe("complete");
      expect(result.projectedBalanceYen).not.toBeNull();
      expect(result.projectedPrincipalYen).toBe(130_000);
    },
  );

  it("deducts fixed fees at month end and never makes balance negative", () => {
    const noFee = calculateIdecoPlan(
      plan({ monthlyFeeYen: 0 }),
      scenario,
      member,
      reference,
    );
    const fee = calculateIdecoPlan(
      plan({ monthlyFeeYen: 1_000 }),
      scenario,
      member,
      reference,
    );
    expect(
      (noFee.projectedBalanceYen ?? 0) - (fee.projectedBalanceYen ?? 0),
    ).toBeGreaterThan(0);
    const depleted = calculateIdecoPlan(
      plan({
        currentBalanceYen: 0,
        currentContributionTotalYen: 0,
        monthlyContributionYen: 0,
        monthlyFeeYen: 50_000,
      }),
      scenario,
      member,
      reference,
    );
    expect(depleted.projectedBalanceYen).toBe(0);
  });

  it("uses inflation and separates market balance from contribution principal", () => {
    const result = calculateIdecoPlan(
      plan({
        currentBalanceYen: 500_000,
        currentContributionTotalYen: 200_000,
      }),
      scenario,
      member,
      reference,
    );
    expect(result.status).toBe("complete");
    expect(result.projectedPrincipalYen).toBe(250_000);
    expect(result.projectedGainYen).toBe(
      (result.projectedBalanceYen ?? 0) - 250_000,
    );
    expect(result.realValueYen).toBeLessThan(result.projectedBalanceYen ?? 0);
  });

  it("returns incomplete for blank scenario values and never recommends defaults", () => {
    expect(
      calculateIdecoPlan(plan(), undefined, member, reference).status,
    ).toBe("incomplete");
    expect(
      calculateIdecoPlan(
        plan(),
        { ...scenario, annualReturnBasisPoints: null },
        member,
        reference,
      ).status,
    ).toBe("incomplete");
  });

  it("returns out-of-range for non-finite factors and safe integer overflow", () => {
    expect(
      calculateIdecoPlan(
        plan(),
        { ...scenario, annualReturnBasisPoints: Number.NaN },
        member,
        reference,
      ).status,
    ).toBe("out-of-range");
    expect(() =>
      parseIdecoPlan({ ...plan(), currentBalanceYen: Number.MAX_VALUE }),
    ).toThrow("safe integer");
  });

  it("stores receipt-age as a union and labels it as a projection only", () => {
    const result = calculateIdecoPlan(
      plan({ projectionTarget: { type: "receipt-age", age: 65 } }),
      scenario,
      member,
      reference,
    );
    expect(result.targetMonth).toBe("2055-01");
    expect(result.messages.join(" ")).toContain("受取資格は計算しません");
  });
});
