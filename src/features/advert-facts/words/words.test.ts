import { describe, expect, it } from "vitest";
import { anyOf, LANGUAGES, numbers, words } from "./index.js";

describe("the word tables", () => {
  it("hold the legacy's twenty languages", () => {
    expect(LANGUAGES).toHaveLength(20);
  });

  it("give a concept's words in the languages asked, each once", () => {
    expect(words("year", { languages: ["en", "de"] })).toEqual([
      "year",
      "years",
      "yr",
      "yrs",
      "jahr",
      "jahre",
      "jahren",
    ]);
    expect(words("lessThan", { languages: ["de"], folded: true })).toEqual([
      "weniger als",
    ]);
    expect(words("moreThan", { languages: ["de"], bare: true })).toEqual([
      "mehr als",
      "über",
      "uber",
    ]);
  });

  it("make one alternation, the longest first, stems taking their endings", () => {
    const pattern = new RegExp(
      `^${anyOf(["min", "minimum", "experien*"])}$`,
      "u",
    );
    expect(pattern.test("minimum")).toBe(true);
    expect(pattern.test("experienced")).toBe(true);
    expect(anyOf(["min", "minimum"])).toBe("(?:minimum|min)");
  });

  it("give the numbers written in words, within bounds", () => {
    expect(numbers({ languages: ["de"], folded: true, most: 2 })).toEqual({
      ein: 1,
      eine: 1,
      einen: 1,
      eins: 1,
      zwei: 2,
    });
  });
});
