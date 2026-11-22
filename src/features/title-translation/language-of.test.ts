import { describe, expect, it } from "vitest";
import {
  type GoldenLanguage,
  goldenFile,
} from "../../../test/title-translation/golden.js";
import {
  englishOnly,
  englishTitle,
  languageOf,
  languageOfPlace,
  readsAs,
} from "./language-of.js";

describe("the languages' golden set (title translation FR-1)", () => {
  it("reads every published title's language as the legacy did", async () => {
    const cases = await goldenFile<GoldenLanguage>("languages.json");
    expect(cases.length).toBeGreaterThan(4000);
    const differ = cases.filter(
      (c) =>
        languageOf(c.t, c.filed, c.cc) !== c.lang ||
        englishTitle(c.t) !== c.english ||
        languageOfPlace(c.l) !== c.place ||
        (c.readsAs !== undefined && readsAs(c.t, c.filed) !== c.readsAs) ||
        (c.englishOnly !== undefined &&
          englishOnly(c.t, c.filed) !== c.englishOnly),
    );
    expect(differ.map((c) => `${c.filed} ${c.t}`)).toEqual([]);
  });
});
