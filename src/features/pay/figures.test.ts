import { describe, expect, it } from "vitest";
import { fieldOf, figureOf } from "./figures.js";

const low = (value: unknown, country = "") => fieldOf(value, country).low;

describe("fieldOf (pay FR-4)", () => {
  it("reads a figure written for people, the ways sources write it", () => {
    expect(
      [
        "45000",
        "45.000",
        "45,000",
        "45 000",
        "45'000",
        "45.000,-",
        "€ 45.000",
        "45000 EUR",
        "45k",
      ].map((value) => low(value)),
    ).toEqual([45000, 45000, 45000, 45000, 45000, 45000, 45000, 45000, 45000]);
  });

  it("reads its cents", () => {
    expect(
      ["3.772,00", "3,772.00", "3772,5", "3772.123"].map((value) => low(value)),
    ).toEqual([3772, 3772, 3772.5, 3772.12]);
    expect(fieldOf("19.70", "de").cents).toBe(true);
    expect(fieldOf(45, "de").cents).toBe(false);
  });

  it("reads a range in one field, its remark in brackets left aside", () => {
    expect(
      fieldOf("£35,000 - £40,000 (depending on experience)", "gb"),
    ).toMatchObject({ low: 35000, high: 40000, currency: "GBP" });
    expect(fieldOf("35.000 bis 45.000 €", "de")).toMatchObject({
      low: 35000,
      high: 45000,
      currency: "EUR",
    });
    // «35-45k» writes its thousands once, at the end (DAA-22).
    expect(fieldOf("35-45k", "de")).toMatchObject({ low: 35000, high: 45000 });
  });

  it("reads the period written in the field", () => {
    expect(
      ["£27,000 p.a.", "£13.40 per hour", "€ 16,20 p/u", "3000€/mes"].map(
        (value) => fieldOf(value, "gb").period,
      ),
    ).toEqual(["year", "hour", "hour", "month"]);
  });

  it("reads «Kč» as a currency, not thousands, and «45.000,- EUR» without cents (DAA-22)", () => {
    expect(figureOf("45 000 Kč", "cz")).toMatchObject({
      value: 45000,
      currency: "CZK",
    });
    expect(fieldOf("45.000,- EUR", "de")).toMatchObject({
      low: 45000,
      currency: "EUR",
      cents: false,
    });
  });

  it("names no currency with «$», and refuses what it cannot read rather than read it wrong", () => {
    expect(figureOf("$80,000", "es")).toMatchObject({
      value: 80000,
      currency: "",
      dollar: true,
    });
    expect(
      [
        "1.234,567",
        "ab 3.000",
        "-3000",
        "€100 - £120",
        "nach Vereinbarung",
        0,
        -5,
      ].map((value) => low(value, "de")),
    ).toEqual([0, 0, 0, 0, 0, 0, 0]);
    // «OTE» reads as a three-letter code, which no rate is quoted for: refused when checked.
    expect(fieldOf("75000 OTE", "de").currency).toBe("OTE");
  });
});
