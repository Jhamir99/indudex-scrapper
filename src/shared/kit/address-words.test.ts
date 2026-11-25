import { describe, expect, it } from "vitest";
import { addressWords } from "./address-words.js";

describe("addressWords (job portals FR-4)", () => {
  it("reads a portal address as words, without its codes and numbers (the legacy's cases)", () => {
    expect(
      addressWords(
        "https://lesjeudis.com/offers/developpeur-java-fullstack-fr-3ac70b70",
      ),
    ).toBe("offers developpeur java fullstack fr");
    expect(
      addressWords(
        "https://www.helplavoro.it/offerta-di-lavoro-in-italia-cercasi-customer-care/6943216.html",
      ),
    ).toBe("offerta di lavoro in italia cercasi customer care");
    expect(addressWords("not an address")).toBe("");
  });
});
