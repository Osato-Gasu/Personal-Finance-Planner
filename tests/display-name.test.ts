import { describe, expect, it } from "vitest";
import {
  displayNameFromEditor,
  displayNameToEditor,
} from "../src/domain/display-name";

describe("lossless display-name editor", () => {
  it.each([
    ["CR", "本人\r旧版"],
    ["LF", "本人\n旧版"],
    ["CRLF", "本人\r\n旧版"],
    ["surrounding whitespace", " 本人 "],
    ["more than 50 characters", "長".repeat(51)],
    ["literal escape text", String.raw`本人\r\n\\旧版`],
  ])("round-trips %s byte-equivalently", (_label, value) => {
    expect(displayNameFromEditor(displayNameToEditor(value))).toBe(value);
  });

  it("keeps unknown escape sequences literal", () => {
    expect(displayNameFromEditor(String.raw`本人\x旧版`)).toBe(
      String.raw`本人\x旧版`,
    );
  });
});
