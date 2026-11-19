import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { isWhole, parseEcbRates } from "./ecb.js";

const savedFile = () =>
  readFile(join(FIXTURES_DIRECTORY, "ecb", "eurofxref-daily.xml"), "utf8");

describe("the ECB's rates file (pay FR-2)", () => {
  it("reads the day and the units of each currency for one euro", async () => {
    const { day, rates } = parseEcbRates(await savedFile());
    expect(day).toBe("2026-11-19");
    expect(rates["EUR"]).toBe(1);
    expect(rates["USD"]).toBe(1.0992);
    expect(rates["CZK"]).toBe(24.427);
    expect(Object.keys(rates)).toHaveLength(30);
  });

  it("tells the whole file from a notice page or a cut one", async () => {
    const xml = await savedFile();
    expect(isWhole(parseEcbRates(xml))).toBe(true);
    expect(
      isWhole(parseEcbRates("<html><p>Service unavailable</p></html>")),
    ).toBe(false);
    expect(isWhole(parseEcbRates(xml.slice(0, 700)))).toBe(false);
    // A file with every rate but no day is no file of the ECB's either.
    expect(isWhole(parseEcbRates(xml.replace(/time='[^']*'/, "")))).toBe(false);
    expect(
      isWhole(parseEcbRates(xml.replace(/currency='GBP' rate='[^']*'/, ""))),
    ).toBe(false);
  });
});
