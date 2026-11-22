import { describe, expect, it } from "vitest";
import { atMost, FIELD_MAX, mendedText } from "./mended-text.js";

// The legacy's examples (test/builder.test.mjs, test/normalise-audit.test.mjs NOA-09), written
// with escapes so the broken letters are seen.
const CASES: readonly (readonly [string, string])[] = [
  ["M\\u00fcnchen, DE", "M\u00fcnchen, DE"],
  [
    "Szolnok, J\u00c3\u00a1sz-Nagykun-Szolnok",
    "Szolnok, J\u00e1sz-Nagykun-Szolnok",
  ],
  ["Engineer - \u00c2\u00a3700 per day", "Engineer - \u00a3700 per day"],
  ["Ing\u00e9nieur \u00e2\u20ac\u201c FEM", "Ing\u00e9nieur \u2013 FEM"],
  ['"Erlangen"', "Erlangen"],
  ["CAF\u00c9\u2019S MANAGER", "CAF\u00c9\u2019S MANAGER"],
  ["M\u00e1laga", "M\u00e1laga"],
  [
    "Vila Nova de Famalic\u00e3\u0192o, Portugal",
    "Vila Nova de Famalic\u00e3o, Portugal",
  ],
  ["Set\u00e3\u0161bal", "Set\u00fabal"],
  ["Santar\u00e3\u2030m", "Santar\u00e9m"],
  ["Alcoba\u00e3\u2021a", "Alcoba\u00e7a"],
  ["Dob\u0159\u00ed\u0161", "Dob\u0159\u00ed\u0161"],
  ["ma\u00e7\u00e3\u00bb", "ma\u00e7\u00e3\u00bb"],
  ["DIRECCI\u00d3\u00a0T\u00c8CNICA", "DIRECCI\u00d3\u00a0T\u00c8CNICA"],
  ["Set\u00c3\u00babal", "Set\u00fabal"],
  ["700 \u00e2\u201a\u00ac", "700 \u20ac"],
  [
    "Ing\u00e9nieur \u00e2\u20ac\u201c 700 \u00e2\u201a\u00ac",
    "Ing\u00e9nieur \u2013 700 \u20ac",
  ],
];

describe("letters a source sent broken (publication FR-2)", () => {
  it("mends a JSON escape, UTF-8 read as windows-1252, a capital broken and written small, a value in its own quotes; keeps good letters", () => {
    expect(CASES.map(([broken]) => mendedText(broken))).toEqual(
      CASES.map(([, mended]) => mended),
    );
  });

  it("reads nothing as an empty field", () => {
    expect([mendedText(undefined), mendedText(null), mendedText("")]).toEqual([
      "",
      "",
      "",
    ]);
  });
});

describe("the length a field is read to", () => {
  it("keeps a field within its limit, and cuts a longer one at a word", () => {
    expect(atMost("Elektroniker", FIELD_MAX.title)).toBe("Elektroniker");
    expect(atMost("Bauleiter Hochbau Tiefbau", 15)).toBe("Bauleiter");
    expect(atMost("x".repeat(20), 15)).toBe("x".repeat(15));
    expect(FIELD_MAX).toEqual({
      title: 500,
      company: 300,
      location: 2000,
      city: 300,
    });
  });
});
