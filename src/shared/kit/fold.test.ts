import { describe, expect, it } from "vitest";
import { fold, foldLetters, nameKey, nameKeys, unaccent } from "./fold.js";

describe("fold and name keys", () => {
  it("takes accents off, keeping or lowering case", () => {
    expect(unaccent("Électromécanicien")).toBe("Electromecanicien");
    expect(fold("Électromécanicien")).toBe("electromecanicien");
    expect(fold("Bærum, Łódź")).toBe("bærum, łodz");
  });

  it("spells out the letters accent-stripping keeps", () => {
    expect(foldLetters("Bærum, Łódź, Straße")).toBe("baerum, lodz, strasse");
  });

  it("keys a name on its letters and digits", () => {
    expect(nameKey("  Saint-Étienne (42) ")).toBe("saint etienne 42");
  });

  it("keys a name also with German and Nordic letters spelt out", () => {
    expect(nameKeys("München")).toEqual(["munchen", "muenchen"]);
    expect(nameKeys("Ålesund")).toEqual(["alesund", "aalesund"]);
    expect(nameKeys("Lillestrøm")).toEqual(["lillestrom", "lillestroem"]);
    expect(nameKeys("Paris")).toEqual(["paris"]);
  });
});
