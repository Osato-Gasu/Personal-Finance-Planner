import { describe, expect, it } from "vitest";
import { RuleResolver } from "../src/domain/rule-resolver";
import { boundaryRules } from "./fixtures/rules";

describe("RuleResolver", () => {
  const resolver = new RuleResolver(boundaryRules);

  it.each([
    ["2030-03-31", "missing-rule"],
    ["2030-04-01", "selected"],
    ["2031-03-31", "selected"],
    ["2031-04-01", "missing-rule"],
  ])("resolves boundary date %s as %s", (date, status) => {
    expect(resolver.resolve("fixture-domain", date, {})).toMatchObject({
      status,
    });
  });

  it("returns missing-rule when no period matches", () => {
    expect(resolver.resolve("unknown-domain", "2030-06-01", {})).toEqual({
      status: "missing-rule",
      domain: "unknown-domain",
      targetDate: "2030-06-01",
    });
  });

  it("returns overlapping-rule when multiple periods match", () => {
    const overlap = new RuleResolver([
      ...boundaryRules,
      {
        id: "overlap",
        domain: "fixture-domain",
        effectiveFrom: "2030-06-01",
        effectiveTo: null,
        value: "overlap",
      },
    ]);
    expect(overlap.resolve("fixture-domain", "2030-06-01", {})).toEqual({
      status: "overlapping-rule",
      ruleIds: ["fixture-period", "overlap"],
    });
  });

  it("supports an inclusive open-ended rule without assuming missing future rules", () => {
    const open = new RuleResolver([
      {
        id: "explicit-open-ended",
        domain: "fixture-domain",
        effectiveFrom: "2032-01-01",
        effectiveTo: null,
        value: "explicit",
      },
    ]);
    expect(open.resolve("fixture-domain", "2032-01-01", {})).toMatchObject({
      status: "selected",
    });
    expect(resolver.resolve("fixture-domain", "2032-01-01", {})).toMatchObject({
      status: "missing-rule",
    });
  });

  it.each(["2030-02-30", "2030-02-29", "2030-00-01", "2030-13-01"])(
    "rejects invalid target calendar date %s",
    (date) => {
      expect(() => resolver.resolve("fixture-domain", date, {})).toThrow(
        "targetDate must be an ISO date",
      );
    },
  );

  it("accepts a valid leap day", () => {
    const leapDay = new RuleResolver([
      {
        id: "leap-day",
        domain: "fixture-domain",
        effectiveFrom: "2032-02-29",
        effectiveTo: "2032-02-29",
        value: "leap",
      },
    ]);
    expect(leapDay.resolve("fixture-domain", "2032-02-29", {})).toMatchObject({
      status: "selected",
    });
  });

  it.each([
    ["effectiveFrom", "2030-02-30", "2030-12-31"],
    ["effectiveTo", "2030-01-01", "2030-02-30"],
  ] as const)(
    "rejects an invalid %s calendar date",
    (field, effectiveFrom, effectiveTo) => {
      expect(
        () =>
          new RuleResolver([
            {
              id: `invalid-${field}`,
              domain: "fixture-domain",
              effectiveFrom,
              effectiveTo,
              value: "invalid",
            },
          ]),
      ).toThrow(`${field} must be an ISO date`);
    },
  );
});
