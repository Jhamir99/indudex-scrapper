import { describe, expect, it } from "vitest";
import { TranslationDataError, translationData, vocab } from "./data.js";

describe("the method's data (title translation FR-6)", () => {
  it("reads each language's words, English's cases and the titles' spellings", () => {
    for (const language of ["ca", "de", "en", "es", "fr", "nl"])
      expect(Object.keys(vocab(language)).length).toBeGreaterThan(1000);
    expect(
      Object.keys(translationData<Record<string, string>>("case-en.json"))
        .length,
    ).toBeGreaterThan(1000);
    const spellings = translationData<[string, string][]>("spellings.json");
    expect(spellings[0]).toEqual(["AI", "AI"]);
  });

  it("reads nothing outside its folder, and names a missing file", () => {
    expect(() => translationData("../families.json")).toThrow(
      TranslationDataError,
    );
    expect(() => translationData("missing.json")).toThrow(
      /missing\.json: not found/,
    );
  });
});
