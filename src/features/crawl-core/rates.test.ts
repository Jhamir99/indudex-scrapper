import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { InMemoryRatesKeeper } from "../../../test/fakes/rates-keeper.js";
import { FakeStopSwitch } from "../../../test/fakes/stop-switch.js";
import { ECB_URL } from "../../shared/rates/ecb.js";
import { refreshRates } from "./rates.js";

const ecbFile = await readFile(
  join(FIXTURES_DIRECTORY, "ecb", "eurofxref-daily.xml"),
  "utf8",
);

let clock: FakeClock;
let http: FakeHttpClient;
let rates: InMemoryRatesKeeper;
let stopSwitch: FakeStopSwitch;
let logged: string[];

beforeEach(() => {
  clock = new FakeClock("2026-11-19T17:00:00Z");
  http = new FakeHttpClient({ [ECB_URL]: ecbFile });
  rates = new InMemoryRatesKeeper(clock);
  stopSwitch = new FakeStopSwitch();
  logged = [];
});

const refresh = () =>
  refreshRates({
    http,
    rates,
    clock,
    stopSwitch,
    log: (message) => logged.push(message),
  });

describe("refreshRates (pay FR-2)", () => {
  it("keeps the ECB's whole file", async () => {
    expect(await refresh()).toBe("kept");
    expect(rates.kept).toBe(ecbFile);
    expect(logged).toEqual([
      "exchange rates: the ECB's file of 2026-11-19 kept",
    ]);
  });

  it("asks once a day", async () => {
    await refresh();
    clock.advance(3_600_000);
    expect(await refresh()).toBe("fresh");
    expect(http.requests).toHaveLength(1);
    clock.advance(24 * 3_600_000);
    expect(await refresh()).toBe("kept");
    expect(http.requests).toHaveLength(2);
  });

  it("keeps the last file on a notice page, a cut file or a failure", async () => {
    await refresh();
    clock.advance(24 * 3_600_000);
    for (const answer of [
      "<html>Maintenance</html>",
      ecbFile.slice(0, 700),
      new Error("ECB unreachable"),
    ]) {
      http.route(ECB_URL, answer);
      expect(await refresh()).not.toBe("kept");
      expect(rates.kept).toBe(ecbFile);
    }
    expect(logged.slice(1)).toEqual([
      "exchange rates: the ECB's answer is not its file (0 rates): the last one kept stays",
      "exchange rates: the ECB's answer is not its file (9 rates): the last one kept stays",
      "exchange rates: not asked (ECB unreachable): the last one kept stays",
    ]);
  });

  it("asks nothing while the stop switch is set", async () => {
    stopSwitch.active = true;
    expect(await refresh()).toBe("stopped");
    expect(http.requests).toEqual([]);
  });
});
