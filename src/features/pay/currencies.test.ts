import { describe, expect, it } from "vitest";
import { goldenSet } from "../../../test/pay/golden.js";
import { currencyOf } from "./currencies.js";

describe("currencyOf (pay FR-4)", () => {
  it("reads ISO codes and the signs and words that name one currency; the dollar sign names several", () => {
    expect(
      ["eur", "€", "£", "CZK", "$", "EURO", ""].map((value) =>
        currencyOf(value),
      ),
    ).toEqual(["EUR", "EUR", "GBP", "CZK", "", "EUR", ""]);
  });

  it("reads a sign or a word that names one currency, or one where the country tells whose", () => {
    expect([
      currencyOf("&euro;"),
      currencyOf("Euros"),
      currencyOf("zł"),
      currencyOf("Kč"),
      currencyOf("kr", "se"),
      currencyOf("kr.", "dk"),
      currencyOf("Fr.", "ch"),
    ]).toEqual(["EUR", "EUR", "PLN", "CZK", "SEK", "DKK", "CHF"]);
  });

  it("refuses a crown outside the crowns' countries, a dollar, a word the list does not know", () => {
    expect([
      currencyOf("kr", "de"),
      currencyOf("$", "us"),
      currencyOf("dollars", "gb"),
    ]).toEqual(["", "", ""]);
  });

  it("gives the country's own currency when none is named, when the country is one of ours", () => {
    expect([
      currencyOf("", "es"),
      currencyOf(null, "nl"),
      currencyOf("N/A", "gb"),
      currencyOf("", "pl"),
      currencyOf("", "rs"),
      currencyOf("", "us"),
      currencyOf("", "xx"),
      currencyOf(""),
    ]).toEqual(["EUR", "EUR", "GBP", "PLN", "RSD", "", "", ""]);
  });

  it("reads every currency of the legacy's golden set the same", async () => {
    const { cases } = await goldenSet("fields");
    const currencies = cases.filter((c) => c.fn === "currencyOf");
    expect(currencies.length).toBeGreaterThan(2000);
    const differ = currencies.filter(
      (c) =>
        currencyOf(c.args[0], (c.args[1] as string | undefined) ?? "") !==
        c.result,
    );
    expect(differ).toEqual([]);
  });
});
