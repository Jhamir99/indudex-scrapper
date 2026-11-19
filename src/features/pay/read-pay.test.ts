import { describe, expect, it } from "vitest";
import { goldenSet, PERIOD_OF_LETTER } from "../../../test/pay/golden.js";
import type { Rates } from "../../shared/rates/ecb.js";
import { MINIMUM_WAGE_YEAR } from "./minimum-wages.js";
import { type CheckedPay, type PayGiven, readPay } from "./read-pay.js";

const RATES: Rates = {
  EUR: 1,
  GBP: 0.8578,
  USD: 1.1463,
  CZK: 24.344,
  PLN: 4.348,
};

// As the legacy wrote it: [low, high, currency, period letter].
const card = (pay: CheckedPay | null) =>
  pay && [pay.low, pay.high, pay.currency, pay.period];

// The legacy's `{ p, pa }` as the port's pay.
function asCheckedPay(result: unknown): CheckedPay | null {
  if (!result) return null;
  const { p, pa } = result as {
    p: [number, number, string, string];
    pa?: number;
  };
  return {
    low: p[0],
    high: p[1],
    currency: p[2],
    period: PERIOD_OF_LETTER[p[3]] as CheckedPay["period"],
    yearlyEur: pa ?? null,
  };
}

describe("readPay (pay FR-7, FR-8)", () => {
  it("shows the pay as given and gives the top of a year in euros", () => {
    expect(
      readPay({ min: "3500", max: "4500", currency: "EUR", period: "month" }),
    ).toEqual({
      low: 3500,
      high: 4500,
      currency: "EUR",
      period: "month",
      yearlyEur: 54000,
    });
    expect(
      readPay(
        { min: 45000, max: 55000, currency: "GBP", period: "per-year-salary" },
        RATES,
      )?.yearlyEur,
    ).toBe(64100);
    // An hourly pay is 2,080 hours a year.
    expect(
      readPay({ min: 30, max: 34, currency: "USD", period: "1 HOUR" }, RATES)
        ?.yearlyEur,
    ).toBe(61700);
  });

  it("counts an hourly wage by its weekly hours, and gives part time by the hour no year", () => {
    expect(
      readPay(
        {
          min: 195,
          max: 195,
          currency: "CZK",
          period: "hour",
          hoursPerWeek: 40,
        },
        RATES,
      )?.yearlyEur,
    ).toBe(16700);
    expect(
      readPay(
        { min: 195, currency: "CZK", period: "hour", hoursPerWeek: 20 },
        RATES,
      )?.yearlyEur,
    ).toBe(8300);
    expect(
      readPay({
        min: 25,
        max: 30,
        currency: "EUR",
        period: "hourly",
        partTime: true,
      }),
    ).toEqual({
      low: 25,
      high: 30,
      currency: "EUR",
      period: "hour",
      yearlyEur: null,
    });
    expect(
      readPay({ min: 1200, currency: "EUR", period: "month", partTime: true })
        ?.yearlyEur,
    ).toBe(14400);
    expect(
      readPay({
        min: 22,
        currency: "EUR",
        period: "hour",
        partTime: true,
        hoursPerWeek: 20,
      })?.yearlyEur,
    ).toBe(22900);
  });

  it("checks a small pay for a few hours a week as the full-time pay it amounts to", () => {
    expect(
      readPay(
        { min: 3500, currency: "CZK", period: "month", hoursPerWeek: 4 },
        RATES,
      )?.yearlyEur,
    ).toBe(1700);
    expect([
      readPay({ min: 3500, currency: "CZK", period: "month" }, RATES),
      readPay(
        { min: 3500, currency: "CZK", period: "month", hoursPerWeek: 1 },
        RATES,
      ),
    ]).toEqual([null, null]);
  });

  it("reads a top alone as a ceiling, a bottom alone as a point (DAA-28)", () => {
    expect(
      card(readPay({ max: 60000, currency: "EUR", period: "YEAR" })),
    ).toEqual([0, 60000, "EUR", "year"]);
    expect(
      card(readPay({ min: 60000, currency: "EUR", period: "YEAR" })),
    ).toEqual([60000, 60000, "EUR", "year"]);
    expect(
      card(
        readPay({
          max: "50.000 - 60.000 €",
          currency: "EUR",
          period: "YEAR",
          country: "es",
        }),
      ),
    ).toEqual([50000, 60000, "EUR", "year"]);
    // A negative figure is no figure: the top alone is a ceiling.
    expect(
      card(
        readPay({ min: "-5", max: "40000", currency: "EUR", period: "year" }),
      ),
    ).toEqual([0, 40000, "EUR", "year"]);
  });

  it("refuses a year that is no believable year, and a range too wide or upside down", () => {
    const refused: PayGiven[] = [
      { min: 3000, max: 3000, currency: "EUR", period: "YEAR" },
      { min: 55000, max: 65000, currency: "EUR", period: "MONTH" },
      { min: 3500, max: 45000, currency: "EUR", period: "month" },
      { min: 60000, max: 50000, currency: "EUR", period: "year" },
    ];
    expect(refused.map((given) => readPay(given))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("reads a period by the law when none is named, full time, where a minimum wage exists", () => {
    expect(
      card(readPay({ min: 2900, max: 3600, currency: "EUR", country: "nl" })),
    ).toEqual([2900, 3600, "EUR", "month"]);
    expect(
      card(
        readPay({
          min: "42000",
          max: "54000",
          currency: "€",
          period: "",
          country: "de",
        }),
      ),
    ).toEqual([42000, 54000, "EUR", "year"]);
    // An hour when its cents are written; a bare 45 may be a year in thousands.
    expect(
      card(
        readPay({ min: "19.70", max: "21.87", currency: "EUR", country: "de" }),
      ),
    ).toEqual([19.7, 21.87, "EUR", "hour"]);
    expect(
      [
        { min: 45, currency: "EUR", country: "de" },
        { min: 20000, currency: "EUR", country: "de" },
        { min: 11202, currency: "EUR", country: "fr" },
        // Where pay is stated by the year, a month-sized figure is likelier a part-time year.
        { min: "£16,400", max: "£16,400", country: "gb" },
        // No minimum wage, or part time.
        { min: 3000, currency: "EUR", country: "it" },
        { min: 1200, currency: "EUR", country: "es", partTime: true },
        { min: 1500, currency: "EUR", country: "es", hoursPerWeek: 20 },
        { min: 50000, currency: "EUR" },
      ].map((given) => readPay(given, RATES)),
    ).toEqual([null, null, null, null, null, null, null, null]);
  });

  it("reads «18.000 € al mes» in Spain as a year's pay labelled a month's (NO2-05)", () => {
    expect(card(readPay({ min: "18.000 € al mes", country: "es" }))).toEqual([
      18000,
      18000,
      "EUR",
      "year",
    ]);
  });

  it("gives the currency of the country when none is named, and refuses one the ECB does not quote", () => {
    expect(
      readPay({ min: "3500", max: "4200", period: "month", country: "nl" }),
    ).toEqual({
      low: 3500,
      high: 4200,
      currency: "EUR",
      period: "month",
      yearlyEur: 50400,
    });
    expect(
      readPay({ min: 12000, period: "month", country: "pl" }, RATES)?.yearlyEur,
    ).toBe(33100);
    expect([
      readPay({ min: 50000, period: "year" }),
      readPay({ min: 50000, period: "year", country: "us" }),
      readPay({ min: 900000, currency: "RSD", period: "year" }, RATES),
      readPay({ min: 50000, currency: "GBP", period: "year" }),
      readPay({ min: "75000 OTE", period: "year", country: "de" }, RATES),
    ]).toEqual([null, null, null, null, null]);
  });

  it("believes what the pay field shows over the fields beside it", () => {
    expect(
      [
        readPay(
          {
            min: "£27,000 p.a.",
            max: "£38,000 p.a.",
            currency: "£",
            period: "MONTH",
          },
          RATES,
        ),
        readPay({ min: "£13.40 per hour", country: "gb" }, RATES),
        readPay({ min: "€ 16,20 p/u", country: "nl" }),
        readPay({ min: "3000€/mes", country: "es" }),
        readPay({
          min: "€150,000",
          max: "€150,000",
          currency: "USD",
          period: "YEAR",
        }),
      ].map(card),
    ).toEqual([
      [27000, 38000, "GBP", "year"],
      [13.4, 13.4, "GBP", "hour"],
      [16.2, 16.2, "EUR", "hour"],
      [3000, 3000, "EUR", "month"],
      [150000, 150000, "EUR", "year"],
    ]);
    // Two currencies or two periods in one pay.
    expect([
      readPay({ min: "€100", max: "£120", period: "hour" }),
      readPay({ min: "100 per hour", max: "120 per day", currency: "EUR" }),
    ]).toEqual([null, null]);
  });

  it("uses the minimum wages of this year", () => {
    expect(MINIMUM_WAGE_YEAR).toBe(new Date().getUTCFullYear());
  });

  it("reads every pay of the legacy's golden set the same", async () => {
    const { cases, rates } = await goldenSet("fields");
    const pays = cases.filter((c) => c.fn === "readPay");
    expect(pays.length).toBeGreaterThan(3000);
    const differ = pays.filter((c) => {
      const [given, rateArgument] = c.args as [
        PayGiven | undefined,
        Rates | "RATES" | undefined,
      ];
      const used = rateArgument === "RATES" ? rates : rateArgument;
      return (
        JSON.stringify(readPay(given ?? {}, used)) !==
        JSON.stringify(asCheckedPay(c.result))
      );
    });
    expect(differ).toEqual([]);
  });
});
