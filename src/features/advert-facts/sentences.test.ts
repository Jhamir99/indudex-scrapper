import { describe, expect, it } from "vitest";
import { sentences } from "./sentences.js";

describe("sentences", () => {
  it("splits at full stops, line breaks and bullets", () => {
    expect(
      sentences(
        "We build bridges. You have 5+ years of experience!\n• A degree in civil engineering\n· Fluent German",
      ),
    ).toEqual([
      "We build bridges.",
      "You have 5+ years of experience!",
      "A degree in civil engineering",
      "Fluent German",
    ]);
  });

  it("splits a list with no full stops by its lines", () => {
    expect(
      sentences(
        "Minimum Qualifications Required:\n7–10 years in heavy industrial construction",
      ),
    ).toEqual([
      "Minimum Qualifications Required:",
      "7–10 years in heavy industrial construction",
    ]);
  });

  it("ends a sentence at each paragraph and list item of leftover markup", () => {
    expect(
      sentences(
        "<p>Our team</p><ul><li>3 years in QA</li><li><b>SAP</b> skills</li></ul>",
      ),
    ).toEqual(["Our team", "3 years in QA", "SAP skills"]);
  });

  it("drops pieces of two letters or less, and is fast on a long run of spaces", () => {
    expect(sentences("ok\nA real line")).toEqual(["A real line"]);
    const start = performance.now();
    sentences(`a${" ".repeat(100_000)}•b`);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
