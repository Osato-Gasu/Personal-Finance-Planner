import packageMetadata from "../package.json";
import { idecoRules } from "./rules/jp/ideco/rules";
import { adultNisaRules } from "./rules/jp/nisa/rules-2024";
import { RULE_VERIFIED_AT } from "./rules/jp/take-home/metadata";

function latestVerifiedAt(values: readonly string[], label: string): string {
  if (values.length === 0) throw new Error(`${label} rule metadata is missing`);
  return [...values].sort().at(-1) as string;
}

export interface ProductMetadata {
  readonly version: string;
  readonly repositoryVisibility: "public";
  readonly distribution: {
    readonly offline: true;
    readonly noBackend: true;
    readonly runtimeExternalRequests: 0;
  };
  readonly ruleVerifiedAt: {
    readonly takeHome: string;
    readonly nisa: string;
    readonly ideco: string;
  };
}

export const productMetadata: ProductMetadata = Object.freeze({
  version: packageMetadata.version,
  repositoryVisibility: "public",
  distribution: Object.freeze({
    offline: true,
    noBackend: true,
    runtimeExternalRequests: 0,
  }),
  ruleVerifiedAt: Object.freeze({
    takeHome: RULE_VERIFIED_AT,
    nisa: latestVerifiedAt(
      adultNisaRules.map((rule) => rule.metadata.verifiedAt),
      "NISA",
    ),
    ideco: latestVerifiedAt(
      idecoRules.map((rule) => rule.metadata.verifiedAt),
      "iDeCo",
    ),
  }),
});
