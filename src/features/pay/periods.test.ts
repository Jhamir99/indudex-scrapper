import { describe, expect, it } from "vitest";
import { goldenSet, PERIOD_OF_LETTER } from "../../../test/pay/golden.js";
import { periodOf } from "./periods.js";

describe("periodOf (pay FR-4)", () => {
  it("reads a year, a month, an hour, a day and a week in the words of schema.org, Lever, Ashby and Personio", () => {
    expect(
      ["YEAR", "per-year-salary", "1 YEAR", "yearly", "annual"].map(periodOf),
    ).toEqual(["year", "year", "year", "year", "year"]);
    expect(
      ["MONTH", "Monthly", "per-month-salary", "1 MONTH", "month"].map(
        periodOf,
      ),
    ).toEqual(["month", "month", "month", "month", "month"]);
    expect(
      [
        "HOUR",
        "per-hour-wage",
        "1 HOUR",
        "hourly",
        "DAY",
        "per-day-wage",
        "WEEK",
        "per-week-salary",
      ].map(periodOf),
    ).toEqual(["hour", "hour", "hour", "hour", "day", "day", "week", "week"]);
  });

  it("reads their short forms and the words employers' pages write in their own languages", () => {
    expect(
      ["PerHour", "p/u", "per mnd", "p.m.", "/h", "yr", "p/maand"].map(
        periodOf,
      ),
    ).toEqual(["hour", "hour", "month", "month", "hour", "year", "month"]);
    expect(
      [
        "MAAND",
        "pro Stunde",
        "/mes",
        "al año",
        "per annum",
        "a year",
        "an hour",
        "p.a.",
        "år",
        "miesiąc",
        "Std.",
        "P1Y",
        "PT1H",
        "ANN",
        "MON",
      ].map(periodOf),
    ).toEqual([
      "month",
      "hour",
      "month",
      "year",
      "year",
      "year",
      "hour",
      "year",
      "year",
      "month",
      "hour",
      "year",
      "hour",
      "year",
      "month",
    ]);
  });

  it("reads nothing else: two weeks, a minute, a sentence", () => {
    expect(
      [
        "bi-week-salary",
        "bi-month-salary",
        "",
        null,
        "per annum please",
        "2 WEEK",
        "PT1M",
        "per month please",
      ].map(periodOf),
    ).toEqual(["", "", "", "", "", "", "", ""]);
  });

  it("reads every period of the legacy's golden set the same", async () => {
    const { cases } = await goldenSet("fields");
    const periods = cases.filter((c) => c.fn === "periodOf");
    expect(periods.length).toBeGreaterThan(700);
    const differ = periods.filter(
      (c) => periodOf(c.args[0]) !== PERIOD_OF_LETTER[String(c.result)],
    );
    expect(differ).toEqual([]);
  });
});
