import { describe, expect, it } from "vitest";
import { InMemoryAdvertStore } from "../../../test/fakes/advert-store.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import {
  fakeDefinition,
  fakeDraft,
  FakeSourceAdapter,
} from "../../../test/fakes/source-adapter.js";
import { FakeStopSwitch } from "../../../test/fakes/stop-switch.js";
import { CrawlConfig, scheduleRules } from "./config/crawl-config.js";
import { loadConfig } from "../../shared/config/load-config.js";
import { TakedownList } from "./config/takedowns.js";
import { crawl, parseCrawlArguments, UsageError } from "./run.js";

async function fakeRun() {
  const config = await loadConfig("crawl.yml", CrawlConfig);
  const clock = new FakeClock("2026-11-16T08:00:00Z");
  const store = new InMemoryAdvertStore(clock);
  const http = new FakeHttpClient();
  const adapters = ["alpha", "bravo", "charlie"].map((id) => {
    http.route(`https://${id}.example/feed`, "<rss/>");
    return new FakeSourceAdapter(fakeDefinition(id), [fakeDraft(id, "1")], {
      fetches: [`https://${id}.example/feed`],
    });
  });
  const dependencies = {
    http,
    store,
    clock,
    rulesFor: (source: string) => scheduleRules(config, source),
    takedowns: new TakedownList({ sources: [], companies: [], adverts: [] }),
    stopSwitch: new FakeStopSwitch(),
    environment: {},
    log: () => {},
  };
  return { clock, store, http, adapters, dependencies };
}

describe("crawl entry (FR-6)", () => {
  it("runs every due source without arguments", async () => {
    const { adapters, dependencies } = await fakeRun();

    const result = await crawl(parseCrawlArguments([]), adapters, dependencies);

    expect(result.sources.map((source) => source.source)).toEqual([
      "alpha",
      "bravo",
      "charlie",
    ]);
  });

  it("runs only the source asked for with --source, even when it is not due", async () => {
    const { clock, store, http, adapters, dependencies } = await fakeRun();
    await crawl(parseCrawlArguments([]), adapters, dependencies);
    http.requests.length = 0;
    clock.advance(3_600_000);

    const result = await crawl(
      parseCrawlArguments(["--", "--source", "bravo"]),
      adapters,
      dependencies,
    );

    expect(result.sources.map((source) => source.source)).toEqual(["bravo"]);
    expect(http.requests.map((request) => request.url)).toEqual([
      "https://bravo.example/feed",
    ]);
    expect(adapters.map((adapter) => adapter.runs)).toEqual([1, 2, 1]);
    expect((await store.readState("bravo"))?.lastRunAt).toBe(
      "2026-11-16T09:00:00.000Z",
    );
  });

  it("refuses an unknown source and names the registered ones", async () => {
    const { adapters, dependencies } = await fakeRun();

    await expect(
      crawl({ source: "delta" }, adapters, dependencies),
    ).rejects.toThrow(
      new UsageError(
        'unknown source "delta"; registered: alpha, bravo, charlie',
      ),
    );
  });

  it("refuses unknown options and stray words", () => {
    expect(() => parseCrawlArguments(["--sources", "x"])).toThrow(UsageError);
    expect(() => parseCrawlArguments(["bravo"])).toThrow(UsageError);
    expect(parseCrawlArguments(["--source=bravo"])).toEqual({
      source: "bravo",
    });
  });
});
