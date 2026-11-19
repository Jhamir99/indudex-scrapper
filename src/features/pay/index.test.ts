import { describe, expect, it } from "vitest";
import { AdvertPay, createPayReader, type PayInput } from "./index.js";

const RATES = { EUR: 1, GBP: 0.8578, CZK: 24.344 };
const reader = createPayReader({ rates: RATES });

const advert = (fields: Partial<PayInput>): PayInput => ({
  country: "at",
  title: "Softwareentwickler (m/w/d)",
  description: "",
  ...fields,
});

describe("an advert's pay (pay FR-3, FR-6, FR-8, FR-9)", () => {
  it("reads the source's field, checked, with its year in euros", () => {
    const pay = reader.pay(
      advert({
        country: "cz",
        pay: { min: 45000, max: 60000, currency: "CZK", period: "month" },
      }),
    );
    expect(pay).toEqual({
      low: 45000,
      high: 60000,
      currency: "CZK",
      period: "month",
      from: "field",
      yearlyEur: 29600,
    });
    expect(AdvertPay.parse(pay)).toEqual(pay);
  });

  it("reads the text when there is no field, or one the reader sets aside", () => {
    const text = "Gehalt: 3.500 € - 4.200 € brutto pro Monat";
    expect(reader.pay(advert({ description: text }))).toMatchObject({
      low: 3500,
      high: 4200,
      from: "text",
    });
    expect(
      reader.pay(
        advert({
          description: text,
          pay: { min: 14.73, currency: "EUR", period: "year" },
        }),
      ),
    ).toMatchObject({ low: 3500, from: "text" });
    expect(
      reader.pay(advert({ description: "Gehalt nach Vereinbarung" })),
    ).toBeNull();
  });

  it("believes the text's pay over a template field below the minimum the text states", () => {
    expect(
      reader.pay(
        advert({
          pay: { min: 2000, max: 3000, currency: "EUR", period: "month" },
          description:
            "Für diese Position gilt das monatliche Mindestgehalt von 4.061,00 EUR brutto.",
        }),
      ),
    ).toMatchObject({ low: 4061, high: 4061, period: "month", from: "text" });
    // Without a stated minimum, a higher pay in the text is likelier a ceiling: the field stands.
    expect(
      reader.pay(
        advert({
          pay: { min: 2000, max: 3000, currency: "EUR", period: "month" },
          description: "Gehalt: 4.061,00 EUR brutto pro Monat.",
        }),
      ),
    ).toMatchObject({ low: 2000, from: "field" });
  });

  it("shows the text's band when the field gives one end of it", () => {
    expect(
      reader.pay(
        advert({
          pay: { max: 5000, currency: "EUR", period: "month" },
          description: "Festgehalt pro Monat von 4.200,00 bis 5.000 € brutto.",
        }),
      ),
    ).toMatchObject({ low: 4200, high: 5000, from: "text" });
  });

  it("gives no year for part time by the hour with no hours, and the same pay twice", () => {
    const parttime = advert({
      pay: {
        min: 25,
        max: 30,
        currency: "EUR",
        period: "hourly",
        partTime: true,
      },
    });
    expect(reader.pay(parttime)?.yearlyEur).toBeNull();
    expect(reader.pay(parttime)).toEqual(reader.pay(parttime));
  });
});
