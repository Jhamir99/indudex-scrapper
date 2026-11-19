import { describe, expect, it } from "vitest";
import { goldenSet } from "../../../../test/pay/golden.js";
import { payInText } from "./pay-in-text.js";

const read = (line: string) => {
  const pay = payInText(line);
  return pay && [pay.min, pay.max, pay.currency, pay.period];
};

describe("payInText (pay FR-5)", () => {
  it("reads a range joined by a word or a dash, else the figure beside the currency", () => {
    expect(
      [
        "Rémunération : De 34 000 € à 50 000 € brut par an",
        "Software Engineer at AIOS — Hybrid, €60k-€120k /yr + equity",
        "Werfleider startloon €21,8 + 32 verlofdagen",
        "Wynagrodzenie: 16 EUR/h, 40 h tygodniowo",
        "3.500 € und 30 Tage Urlaub",
      ].map(read),
    ).toEqual([
      [34000, 50000, "EUR", "year"],
      [60000, 120000, "EUR", "year"],
      [21.8, 21.8, "EUR", ""],
      [16, 16, "EUR", "hour"],
      [3500, 3500, "EUR", ""],
    ]);
  });

  it("reads a range that writes its thousands once, and the period nearest the figure (DAA-19)", () => {
    expect(read("38-42.000 Kč")).toEqual([38000, 42000, "CZK", ""]);
    expect(read("7.500 € brutto monatlich zzgl. Jahresprämie")).toEqual([
      7500,
      7500,
      "EUR",
      "month",
    ]);
    expect(
      read(
        "4,500 to 8,000 eur gross (and more in exceptional cases) per month",
      ),
    ).toEqual([4500, 8000, "EUR", "month"]);
  });

  it("reads a band hidden by a currency written twice, an hour or a period glued to it, or «USD$»", () => {
    expect(
      [
        "14,50 EUR (€) - 18 EUR (€) / heure",
        "£14.78ph - £17.97ph",
        "$42/hr - $50/hr",
        "USD$90,000 - USD$100,000",
      ].map(read),
    ).toEqual([
      [14.5, 18, "EUR", "hour"],
      [14.78, 17.97, "GBP", "hour"],
      [42, 50, "USD", "hour"],
      [90000, 100000, "USD", ""],
    ]);
  });

  it("takes the currency beside the figure read (DAA-21), and no code stuck to a word (DAA-17)", () => {
    expect(read("CHF 95,000 – 110,000 (EUR 100,000)")).toEqual([
      95000,
      110000,
      "CHF",
      "",
    ]);
    expect(read("soudeur 35 h, 2.000 €")).toEqual([2000, 2000, "EUR", ""]);
    expect(read("SMIC à 2 000 € … Référence : 2026-3332")).toEqual([
      2000,
      2000,
      "EUR",
      "",
    ]);
  });

  it("sets aside company money, and refuses a net pay, a statistic, a ceiling or another country's dollar", () => {
    expect(read("$20M Series A, salary $120,000 per year")).toEqual([
      120000,
      120000,
      "USD",
      "year",
    ]);
    expect(
      [
        "Salaire : 2500 € net / mois",
        "The median annual wage for environmental engineers is $96,820",
        "Bis zu €45.000 Pro Jahr",
        "CA$85,000 per year",
        "About 40 people work here",
      ].map(read),
    ).toEqual([null, null, null, null, null]);
  });

  it("reads no year in a year of training", () => {
    expect(read("Ausbildungsvergütung 1.100 € im ersten Lehrjahr")).toEqual([
      1100,
      1100,
      "EUR",
      "",
    ]);
  });

  it("reads every line of the legacy's golden set the same", async () => {
    const { cases } = await goldenSet("text");
    const lines = cases.filter((c) => c.fn === "payInText");
    expect(lines.length).toBeGreaterThan(700);
    const differ = lines.filter(
      (c) =>
        JSON.stringify(payInText(String(c.args[0] ?? ""))) !==
        JSON.stringify(c.result),
    );
    expect(differ).toEqual([]);
  });
});
