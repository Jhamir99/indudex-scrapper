import { describe, expect, it } from "vitest";
import { SOURCE_FIELD_LIMIT, SourcePay } from "../schemas/advert.js";
import { statedPay } from "./stated-pay.js";

describe("statedPay (pay FR-1)", () => {
  it("keeps what the source gives, tidied, so the store accepts it", () => {
    const pay = statedPay({
      min: " 1416 ",
      max: 1550,
      currency: "EUR",
      period: " per\n month ",
      hoursPerWeek: "20",
      partTime: true,
    });
    expect(pay).toEqual({
      min: "1416",
      max: 1550,
      currency: "EUR",
      period: "per month",
      hoursPerWeek: 20,
      partTime: true,
    });
    expect(SourcePay.safeParse(pay).success).toBe(true);
  });

  it("leaves out empty, zero and unreadable values", () => {
    expect(
      statedPay({
        min: 0,
        max: "2000",
        currency: "",
        period: null,
        hoursPerWeek: 0,
        partTime: false,
      }),
    ).toEqual({ max: "2000" });
    expect(
      statedPay({ min: 900, max: "x".repeat(SOURCE_FIELD_LIMIT + 1) }),
    ).toEqual({ min: 900 });
  });

  it("gives nothing without a figure", () => {
    expect([
      statedPay(null),
      statedPay({ currency: "EUR" }),
      statedPay({ min: "", max: Number.NaN }),
      statedPay({ min: -3 }),
    ]).toEqual([undefined, undefined, undefined, undefined]);
  });
});
