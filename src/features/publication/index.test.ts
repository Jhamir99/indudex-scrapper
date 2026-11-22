import { readFileSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readPlaces } from "../../shared/catalogues/places.js";
import { CATALOGUE_VERSION } from "../../shared/catalogues/published.js";
import { readCatalogue } from "../../shared/catalogues/read-catalogue.js";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { SourceDefinition } from "../../shared/schemas/source.js";
import { FileAdvertStore } from "../../shared/storage/file-advert-store.js";
import { PublishedDataset } from "../../shared/storage/published-dataset.js";
import { type PublicationDependencies, runPublication } from "./index.js";

// The processor's run on a temporary store of made-up adverts, with the real catalogues.
let directory: string;
let catalogues: PublicationDependencies["catalogues"];
const NOW = "2026-11-22T10:00:00.000Z";

const advert = (
  n: number,
  fields: Partial<StoredAdvert> = {},
): StoredAdvert => ({
  id: `brz-${n}`,
  source: "brz",
  sourceId: String(n),
  title: n % 2 ? "Maschinenbauingenieur (m/w/d)" : "Elektrotechniker (m/w/d)",
  company: `Firma ${n} GmbH`,
  location: "Wien",
  country: "at",
  city: "Wien",
  remote: false,
  url: `https://brz.example/jobs/${n}`,
  description: "Wir suchen dich. Vollzeit, unbefristet.",
  posted: "2026-11-15",
  occupationCodes: {},
  language: "de",
  attribution: { licence: "CC BY 4.0", credit: "Bundesrechenzentrum" },
  firstSeen: "2026-11-15",
  ...fields,
});
const brz: SourceDefinition = {
  id: "brz",
  kind: "feed",
  licence: {
    name: "BRZ",
    short: "BRZ",
    url: "https://www.data.gv.at/",
    licence: "CC BY 4.0",
    credit: "Bundesrechenzentrum",
  },
  needsCredentials: false,
  credentialVariables: [],
};

async function run(
  adverts: StoredAdvert[],
  at: string,
  fields: Partial<PublicationDependencies> = {},
) {
  const store = new FileAdvertStore(join(directory, "store"), {
    now: () => new Date(at),
  });
  await store.replaceAdverts("brz", adverts);
  const log: string[] = [];
  const result = await runPublication({
    store,
    registers: [],
    rates: {},
    catalogues,
    publishedCatalogues: { families: catalogues.families },
    catalogueVersion: CATALOGUE_VERSION,
    takedowns: {
      sourceReason: () => undefined,
      advertReason: () => undefined,
      companyNames: [],
    },
    untranslated: new Set(),
    definitions: [brz],
    dataset: new PublishedDataset(join(directory, "published")),
    stateDirectory: join(directory, "state"),
    now: () => new Date(at),
    log: (line) => log.push(line),
    ...fields,
  });
  return { result, log };
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-process-"));
  catalogues = {
    families: await readCatalogue("families"),
    isco: await readCatalogue("isco"),
    ssykIsco: await readCatalogue("ssykIsco"),
    titles: await readCatalogue("titles"),
    confirmedTitles: await readCatalogue("confirmedTitles"),
    countries: await readCatalogue("countries"),
    nuts: await readCatalogue("nuts"),
    degrees: await readCatalogue("degrees"),
    languages: await readCatalogue("languages"),
    places: await readPlaces(),
  };
}, 60_000);

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("the processor's run (publication FR-1, FR-10, FR-11, FR-12)", () => {
  it("writes a whole version, moves the pointer, keeps its state, and logs each stage", async () => {
    const adverts = Array.from({ length: 10 }, (_, i) => advert(i));
    const { result, log } = await run(adverts, NOW);
    expect(result).toEqual({
      published: true,
      version: "20261122T100000Z",
      offers: 10,
    });
    const published = join(directory, "published");
    expect(
      JSON.parse(await readFile(join(published, "current.json"), "utf8")),
    ).toEqual({ v: 1, version: "20261122T100000Z" });
    const files = await readdir(join(published, "20261122T100000Z"));
    expect(files.toSorted()).toEqual(
      [
        "cards",
        "catalogues",
        "companies.json",
        "index.json",
        "offers",
        "places.json",
        "regions.json",
        "status.json",
        "today.json",
        "words",
      ].toSorted(),
    );
    const index = JSON.parse(
      await readFile(join(published, "20261122T100000Z", "index.json"), "utf8"),
    );
    expect(index.counts.offers + index.counts.optional).toBe(10);
    expect(index.sources.brz).toMatchObject({
      kind: "feed",
      credit: "Bundesrechenzentrum",
    });
    expect((await readdir(join(directory, "state"))).toSorted()).toEqual([
      "companies.json",
      "mt-wanted.json",
      "pile-history.json",
      "taken.json",
    ]);
    expect(log.some((line) => line.startsWith("stages: store read"))).toBe(
      true,
    );
  }, 60_000);

  it("holds a pile that fell by a third, leaves the pointer, and publishes it with --force", async () => {
    const fewer = [advert(1), advert(2)];
    const held = await run(fewer, "2026-11-22T11:00:00.000Z");
    expect(held.result).toMatchObject({
      published: false,
      reason: expect.stringMatching(/^ALERT not publishing/),
    });
    const published = join(directory, "published");
    expect(
      JSON.parse(await readFile(join(published, "current.json"), "utf8"))
        .version,
    ).toBe("20261122T100000Z");
    expect(
      (await readdir(published)).filter((name) => name.startsWith("2026")),
    ).toEqual(["20261122T100000Z"]);
    const forced = await run(fewer, "2026-11-22T12:00:00.000Z", {
      force: true,
    });
    expect(forced.result).toMatchObject({
      published: true,
      version: "20261122T120000Z",
    });
    expect(forced.log.some((line) => line.includes("forced"))).toBe(true);
  }, 60_000);

  it("applies the caches' titles, lists the titles they lack, and gives each language its ten", async () => {
    const state = join(directory, "state");
    await writeFile(
      join(state, "titles-en.json"),
      JSON.stringify({ Maschinenbauingenieur: "Mechanical engineer" }),
    );
    const adverts = Array.from({ length: 10 }, (_, i) => advert(i));
    const { result } = await run(adverts, "2026-11-22T14:00:00.000Z", {
      force: true,
    });
    expect(result).toMatchObject({ published: true });
    const version = join(directory, "published", "20261122T140000Z");
    const offers = (await readdir(join(version, "offers"))).flatMap(
      (name) =>
        JSON.parse(readFileSync(join(version, "offers", name), "utf8"))
          .offers as { t: string; te?: string; tl?: string }[],
    );
    expect(
      offers.find((offer) => offer.t === "Maschinenbauingenieur")?.te,
    ).toBe("Mechanical engineer");
    const wanted = JSON.parse(
      await readFile(join(state, "mt-wanted.json"), "utf8"),
    ) as { t: string; into: string[] }[];
    expect(wanted.find((w) => w.t === "Maschinenbauingenieur")?.into).toEqual([
      "es",
      "ca",
      "fr",
      "nl",
    ]);
    const today = JSON.parse(
      await readFile(join(version, "today.json"), "utf8"),
    );
    expect(Object.keys(today.latest).toSorted()).toEqual([
      "ca",
      "de",
      "en",
      "es",
      "fr",
      "nl",
    ]);
  }, 60_000);

  it("never publishes an empty pile", async () => {
    const { result } = await run(
      [advert(1, { title: "Koch (m/w/d)" })],
      "2026-11-22T13:00:00.000Z",
      { force: true },
    );
    expect(result).toEqual({
      published: false,
      reason: "nothing usable in the store: not publishing",
    });
  }, 60_000);
});
