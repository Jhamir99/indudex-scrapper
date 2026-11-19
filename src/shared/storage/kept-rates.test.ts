import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import type { RatesKeeper } from "../../features/crawl-core/ports.js";
import { FileRatesKeeper, RATES_FILE, readKeptRates } from "./kept-rates.js";

const ecbFile = await readFile(
  join(FIXTURES_DIRECTORY, "ecb", "eurofxref-daily.xml"),
  "utf8",
);

let directory: string;
let clock: FakeClock;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-rates-"));
  clock = new FakeClock("2026-11-19T17:00:00Z");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("FileRatesKeeper (pay FR-2)", () => {
  it("fits the crawl-core RatesKeeper port", () => {
    const keeper = new FileRatesKeeper(directory, clock);
    const port: RatesKeeper = keeper;
    expect(port).toBe(keeper);
  });

  it("keeps the file in the store, with the day it was kept on", async () => {
    const keeper = new FileRatesKeeper(directory, clock);
    expect(await keeper.keptOn()).toBeUndefined();
    await keeper.keep(ecbFile);
    expect(await readFile(join(directory, RATES_FILE), "utf8")).toBe(ecbFile);
    expect(await keeper.keptOn()).toBe("2026-11-19");
  });
});

describe("readKeptRates (pay FR-3)", () => {
  it("reads the kept rates", async () => {
    await new FileRatesKeeper(directory, clock).keep(ecbFile);
    const kept = await readKeptRates(directory, "2026-11-23");
    expect([kept.day, kept.rates["USD"], kept.warning]).toEqual([
      "2026-11-19",
      1.0992,
      undefined,
    ]);
  });

  it("warns when they are more than a week old", async () => {
    await new FileRatesKeeper(directory, clock).keep(ecbFile);
    const kept = await readKeptRates(directory, "2026-11-27");
    expect(kept.rates["USD"]).toBe(1.0992);
    expect(kept.warning).toBe(
      "the exchange rates kept are of 2026-11-19: pay in other currencies may be converted at old rates",
    );
  });

  it("knows only the euro when none are kept", async () => {
    expect(await readKeptRates(directory, "2026-11-19")).toEqual({
      day: "",
      rates: { EUR: 1 },
      warning: "no exchange rates kept: only pay in euros is converted",
    });
  });
});
