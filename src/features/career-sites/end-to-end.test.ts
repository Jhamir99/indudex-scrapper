import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryAdvertStore } from "../../../test/fakes/advert-store.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { FakeHttpClient, type Route } from "../../../test/fakes/http-client.js";
import { FakeStopSwitch } from "../../../test/fakes/stop-switch.js";
import {
  FIXTURES_DIRECTORY,
  loadFixtureRoutes,
} from "../../../test/contract/adapter-contract.js";
import { loadConfig } from "../../shared/config/load-config.js";
import { TakedownList } from "../../shared/config/takedowns.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import { readPlaces } from "../../shared/catalogues/places.js";
import {
  CrawlConfig,
  scheduleRules,
} from "../crawl-core/config/crawl-config.js";
import type { SourceAdapter } from "../crawl-core/ports.js";
import { runDue } from "../crawl-core/runner.js";
import { createPlacer } from "../places/index.js";
import { careerAdapters } from "./index.js";
import { siteSource } from "./family.js";

// One run of the career sources on their saved answers (career sites FR-11, FR-12): every careers site and board with a
// fixture (sites of each shape, a vendor's, a board of each platform), a site whose pages give no advert, a board that
// does not answer, a source and an advert taken down, and the stop switch; with the crawl's own settings, queue and
// country reader.

const HOUR = 3_600_000;
const config = await loadConfig("crawl.yml", CrawlConfig);
const all = careerAdapters();
const withFixtures = all.filter(
  (one) =>
    !one.definition.disabledReason &&
    existsSync(join(FIXTURES_DIRECTORY, one.definition.id)),
);
const failing = all.find(
  (one) =>
    one.definition.id.startsWith("greenhouse.") &&
    !one.definition.disabledReason &&
    !withFixtures.includes(one),
)!;

// A careers site whose sixty vacancy pages carry no advert: barren, read again in a week.
const BARREN = "https://barren.example";
const barren = siteSource({ sitemap: `${BARREN}/sitemap.xml` });
const barrenRoutes = (): Record<string, Route> => {
  const pages = Array.from(
    { length: 60 },
    (_, n) => `${BARREN}/jobs/maintenance-engineer-${n}`,
  );
  return {
    [`${BARREN}/robots.txt`]: "User-agent: *\nAllow: /\n",
    [`${BARREN}/sitemap.xml`]: `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`,
    ...Object.fromEntries(
      pages.map((url) => [
        url,
        "<html><head><title>Maintenance Engineer</title></head><body><p>Join us.</p></body></html>",
      ]),
    ),
  };
};

const placer = createPlacer({
  places: await readPlaces(),
  nuts: await readCatalogue("nuts"),
  countries: (await readCatalogue("countries")).countries,
  elsewhere: (await readCatalogue("elsewhere")).elsewhere,
});

async function setup() {
  const routes: Record<string, Route> = barrenRoutes();
  for (const adapter of withFixtures)
    Object.assign(routes, await loadFixtureRoutes(adapter.definition.id));
  const clock = new FakeClock("2026-11-27T08:00:00Z");
  const store = new InMemoryAdvertStore(clock);
  const stopSwitch = new FakeStopSwitch();
  const kinds = new Map(all.map((one) => [one.definition.id, "careers"]));
  return {
    clock,
    store,
    stopSwitch,
    http: new FakeHttpClient(routes),
    dependencies: (takedowns: TakedownList) => ({
      http: new FakeHttpClient(routes),
      store,
      clock,
      rulesFor: (source: string) =>
        scheduleRules(config, source, kinds.get(source)),
      takedowns,
      stopSwitch,
      environment: {},
      log: () => {},
      concurrency: 8,
      inFlight: config.run.inFlight,
      countryOf: placer.countryOf,
    }),
  };
}

const nothingTaken = new TakedownList({
  sources: [],
  companies: [],
  adverts: [],
});

describe("career sources end to end on their saved answers (career sites FR-11, FR-12)", () => {
  it("stores every source's adverts, marks the barren and the failing, and honours the takedowns and the stop switch", async () => {
    const { clock, store, stopSwitch, dependencies } = await setup();
    const sources: SourceAdapter[] = [...withFixtures, barren, failing];
    const [takenSource, takenFrom] = withFixtures;
    const first = await runDue(sources, dependencies(nothingTaken));
    const outcome = new Map(first.sources.map((one) => [one.source, one]));

    // Every saved source read and stored, its states enabled and due again by its cadence.
    for (const adapter of withFixtures) {
      const id = adapter.definition.id;
      expect([id, outcome.get(id)?.outcome]).toEqual([id, "stored"]);
      const state = await store.readState(id);
      expect(state?.status).toBe("enabled");
      expect(Date.parse(state!.nextDueAt!)).toBeGreaterThan(
        clock.now().getTime() + 20 * HOUR,
      );
      for (const advert of await store.readAdverts(id))
        expect(advert.country).toMatch(/^[a-z]{2}$/);
    }
    // The barren site: read, nothing stored, back in a week.
    const barrenState = await store.readState(barren.definition.id);
    expect(outcome.get(barren.definition.id)?.outcome).toBe("empty");
    expect(barrenState?.nextDueAt).toBe(
      new Date(clock.now().getTime() + 168 * HOUR).toISOString(),
    );
    // The board that does not answer: failed, back in a day.
    expect(outcome.get(failing.definition.id)?.outcome).toBe("failed");
    expect(await store.readState(failing.definition.id)).toMatchObject({
      status: "failed",
      consecutiveFailures: 1,
    });

    // Nothing is due again an hour later.
    clock.advance(HOUR);
    expect(
      (await runDue(sources, dependencies(nothingTaken))).sources.filter(
        (one) => one.outcome !== "disabled",
      ),
    ).toEqual([]);

    // A source taken down is disabled and its adverts leave the store; an advert taken down leaves too.
    const advertTaken = (await store.readAdverts(takenFrom!.definition.id))[0]!;
    const takedowns = new TakedownList({
      sources: [{ id: takenSource!.definition.id, reason: "its owner asked" }],
      companies: [],
      adverts: [{ url: advertTaken.url, reason: "its owner asked" }],
    });
    await runDue(sources, dependencies(takedowns));
    expect(await store.readState(takenSource!.definition.id)).toMatchObject({
      status: "disabled",
      reason: "taken down: its owner asked",
    });
    expect(await store.readAdverts(takenSource!.definition.id)).toEqual([]);
    expect(
      (await store.readAdverts(takenFrom!.definition.id)).map((one) => one.url),
    ).not.toContain(advertTaken.url);

    // With the stop switch set, a day later nothing runs and nothing changes.
    stopSwitch.active = true;
    clock.advance(30 * HOUR);
    const before = await store.readState(withFixtures[2]!.definition.id);
    const stopped = await runDue(sources, dependencies(nothingTaken));
    expect(stopped).toEqual({ sources: [], stopped: true });
    expect(await store.readState(withFixtures[2]!.definition.id)).toEqual(
      before,
    );
  });

  it("covers a careers site of each shape, a vendor's site and a board of each platform with saved answers", () => {
    const ids = withFixtures.map((one) => one.definition.id);
    expect(
      ids.filter((id) => id.startsWith("careers.")).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(
        ids
          .filter((id) => !id.startsWith("careers."))
          .map((id) => id.split(".")[0]),
      ),
    ).toEqual(
      new Set([
        "ashby",
        "cornerstone",
        "greenhouse",
        "hrmanager",
        "lever",
        "oracle",
        "personio",
        "prospective",
        "recruitee",
        "teamtailor",
        "workable",
        "workday",
      ]),
    );
    expect(ids).toContain("careers.4am-robotics.softgarden.io-fac59c");
  });
});
