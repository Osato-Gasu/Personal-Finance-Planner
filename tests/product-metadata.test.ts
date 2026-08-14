import packageMetadata from "../package.json";
import { describe, expect, it } from "vitest";
import { productMetadata } from "../src/product-metadata";
import { idecoRules } from "../src/rules/jp/ideco/rules";
import { adultNisaRules } from "../src/rules/jp/nisa/rules-2024";
import { RULE_VERIFIED_AT } from "../src/rules/jp/take-home/metadata";

describe("read-only product metadata", () => {
  it("binds version and verification dates to their canonical sources", () => {
    expect(productMetadata).toEqual({
      version: packageMetadata.version,
      ruleVerifiedAt: {
        takeHome: RULE_VERIFIED_AT,
        nisa: adultNisaRules[0]?.metadata.verifiedAt,
        ideco: idecoRules[1]?.metadata.verifiedAt,
      },
    });
    expect(productMetadata.version).toBe("0.1.0");
    expect(productMetadata.ruleVerifiedAt).toEqual({
      takeHome: "2026-08-12",
      nisa: "2026-08-12",
      ideco: "2026-08-13",
    });
  });

  it("is not part of AppState or backup serialization", async () => {
    const { createFixtureState } = await import("./fixtures/state");
    const serialized = JSON.stringify(createFixtureState());
    expect(serialized).not.toContain('"version":"0.1.0"');
    expect(serialized).not.toContain("ruleVerifiedAt");
    expect(serialized).not.toContain("2026-08-12");
    expect(serialized).not.toContain("2026-08-13");
  });
});
