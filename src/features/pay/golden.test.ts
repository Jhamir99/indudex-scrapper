import { describe, expect, it } from "vitest";
import { goldenSet } from "../../../test/pay/golden.js";
import { currencyOf, MINIMUM_WAGE_YEAR, periodOf, readPay } from "./pay.js";
import { payInText, payOfText } from "./text-pay.js";

// The legacy's own readings (test/fixtures/pay/*.json, remade from JustJans/indudex@ec79858 in legacy resync T004):
// every call its pay tests make, and every string of them, read by the copied readers the same.
const READERS: Readonly<Record<string, (...args: never[]) => unknown>> = {
  readPay,
  currencyOf,
  periodOf,
  payOfText,
  payInText,
};

describe("pay's golden sets (pay FR-3 to FR-7)", () => {
  it("uses the minimum wages of this year", () => {
    expect(MINIMUM_WAGE_YEAR).toBe(new Date().getUTCFullYear());
  });

  it.each(["fields", "text"] as const)(
    "reads every case of the %s set as the legacy did",
    async (name) => {
      const { cases, rates } = await goldenSet(name);
      expect(cases.length).toBeGreaterThan(2000);
      const differ = cases.filter((c) => {
        const read = READERS[c.fn];
        const args = c.args.map((a) => (a === "RATES" ? rates : a));
        return (
          !read ||
          JSON.stringify(read(...(args as never[])) ?? null) !==
            JSON.stringify(c.result)
        );
      });
      expect(differ).toEqual([]);
    },
  );
});
