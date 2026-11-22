import { describe, expect, it } from "vitest";
import {
  PublishedCompanies,
  PublishedCompanyCards,
  PublishedIndex,
  PublishedPlaces,
  PublishedRegions,
  PublishedStatus,
  RegisterCompanies,
} from "../../shared/schemas/published/dataset.js";
import type { Offer } from "../../shared/schemas/published/offer.js";
import type { SourceDefinition } from "../../shared/schemas/source.js";
import type { BuildCounts } from "./build.js";
import {
  cardFiles,
  companyFiles,
  indexFile,
  legacyKind,
  placesFile,
  regionsFile,
  sourcesOf,
  statusFile,
} from "./files.js";
import { buildShards } from "./shards.js";
import { bucketOf, buildWordIndex } from "./word-index.js";

const offer = (id: string, fields: Partial<Offer> = {}): Offer => ({
  id,
  t: "Process Engineer",
  c: "Acme",
  l: "",
  cc: "es",
  ci: "Vic",
  d: "2026-11-20",
  u: `https://a.example/${id}`,
  s: "feinaactiva",
  f: ["2144"],
  ...fields,
});
const definition = (
  id: string,
  kind: SourceDefinition["kind"],
): SourceDefinition => ({
  id,
  kind,
  licence: {
    name: `${id} name`,
    short: id,
    url: `https://${id}.example/`,
    licence: "CC BY 4.0",
    credit: null,
  },
  needsCredentials: false,
  credentialVariables: [],
});
const counts: BuildCounts = {
  found: 10,
  outsideVertical: 4,
  outsideEurope: 1,
  hygiene: 0,
  closed: 0,
  noLink: 0,
  stale: 0,
  expired: 1,
  old: 0,
  withdrawn: 0,
};

describe("the dataset's files (publication FR-8)", () => {
  const offers = [
    offer("a", { g: [41.93, 2.25], p: [1, 2, "EUR", "m"], w: "o" }),
    offer("b", { s: "jooble", cc: "de" }),
    offer("c", { f: ["7411"] }),
  ];
  const main = offers.filter((o) => o.f.includes("2144"));
  const definitions = new Map([
    ["feinaactiva", definition("feinaactiva", "feed")],
    ["jooble", definition("jooble", "via")],
  ]);

  it("writes the index with its families, newest, sources, counts and words", () => {
    const shards = buildShards(
      offers,
      [{ id: "2144", label: "Engineers", group: "engineers" }],
      Date.parse("2026-11-22"),
      new Set(["7411"]),
    );
    const { manifest } = buildWordIndex(
      offers,
      (s) => s === "jooble",
      "words",
      () => undefined,
    );
    const index = indexFile({
      generatedAt: "2026-11-22T10:00:00.000Z",
      crawledAt: "2026-11-22T08:00:00.000Z",
      catalogueVersion: 1,
      shards,
      sources: sourcesOf(["feinaactiva", "jooble", "gone"], definitions),
      offers,
      main,
      counts,
      isVia: (s) => s === "jooble",
      sourceFiles: 2,
      boardSources: 0,
      seconds: 42,
      words: manifest,
    });
    expect(PublishedIndex.parse(index)).toEqual(index);
    expect(index.expires_at).toBe("2026-11-24T08:00:00.000Z");
    expect(index.counts).toEqual({
      offers: 2,
      optional: 1,
      found: 10,
      by_country: { es: 1, de: 1 },
      via: 1,
      sources: 2,
      companies: 0,
      on_map: 1,
      with_pay: 1,
      with_mode: 1,
    });
    expect(index.sources["jooble"]).toMatchObject({
      kind: "via",
      via: true,
      credit: "",
    });
    expect(Object.keys(index.sources)).toEqual(["feinaactiva", "jooble"]);
  });

  it("names the sources' kinds as the legacy did", () => {
    expect(
      ["careers", "feed", "portal", "via"].map((kind) =>
        legacyKind(kind as SourceDefinition["kind"]),
      ),
    ).toEqual(["board", "feed", "via", "via"]);
  });

  it("writes the status with what fell and the skilled trades by country", () => {
    const status = statusFile({
      generatedAt: "2026-11-22T10:00:00.000Z",
      crawledAt: "2026-11-22T08:00:00.000Z",
      offers,
      main,
      counts,
      sourceFiles: 2,
      duplicates: { sameUrl: 1, sameRole: 3 },
      optionalFamilies: new Set(["7411"]),
    });
    expect(PublishedStatus.parse(status)).toEqual(status);
    expect([
      status.offers,
      status.optional,
      status.by_country_optional,
      status.dropped.outsideVertical,
    ]).toEqual([2, 1, { es: 1 }, 4]);
  });

  it("writes the towns in use and the regions with their names and offers", () => {
    const places = placesFile(
      [
        {
          geonameId: 1,
          name: "Vic",
          geonamesName: "",
          region: "Catalonia",
          country: "es",
          latitude: 41.93,
          longitude: 2.25,
          offers: 2,
          otherNames: ["Vich"],
        },
        {
          geonameId: 2,
          name: "Girona",
          geonamesName: "",
          region: "Catalonia",
          country: "es",
          latitude: 41.98,
          longitude: 2.82,
          offers: 1,
          otherNames: [],
        },
      ],
      ["mataro"],
    );
    expect(PublishedPlaces.parse(places)).toEqual(places);
    expect(places.places[1]).toEqual([
      "Girona",
      "",
      "Catalonia",
      "es",
      41.98,
      2.82,
      1,
    ]);
    const regions = regionsFile({
      regions: {
        es: {
          ES51: {
            names: ["Cataluña", "Catalunya"],
            otherNames: ["catalonia"],
            offers: 3,
          },
        },
      },
      provinces: {
        no: { NO0A2: { names: ["Rogaland"], otherNames: [], offers: 0 } },
      },
    });
    expect(PublishedRegions.parse(regions)).toEqual(regions);
    expect(regions.regions["es"]?.["ES51"]).toEqual([
      "Cataluña",
      "Catalunya",
      "catalonia",
      3,
    ]);
  });

  it("writes the directory and each country's register companies", () => {
    const files = companyFiles({
      generatedAt: "2026-11-22T10:00:00.000Z",
      groups: [{ id: "technicians", label: "Technicians", es: "Técnicos" }],
      rows: [
        {
          name: "Acme",
          count: 2,
          group: "technicians",
          places: { ES511: 2 },
          town: "Vic",
          townNuts: "ES511",
        },
      ],
      local: { no: [["Sandnes Elektriske AS", "NO0A2", "Sandnes", ""]] },
    });
    expect(PublishedCompanies.parse(files.get("companies.json"))).toMatchObject(
      {
        groups: {
          technicians: { en: "Technicians", es: "Técnicos", ca: "Técnicos" },
        },
        companies: [["Acme", 2, "technicians", { ES511: 2 }, "Vic", "ES511"]],
        local: { no: 1 },
      },
    );
    expect(
      RegisterCompanies.parse(files.get("companies/no.json")),
    ).toBeTruthy();
  });

  it("writes the cards in their short keys, in the file their key's hash names", () => {
    const files = cardFiles(
      new Map([
        [
          "acme",
          {
            groups: [["technicians", 2]] as [string, number][],
            modes: [0, 0, 2] as [number, number, number],
          },
        ],
        [
          "no:sandnes elektriske",
          {
            activity: "4321",
            register: "brreg",
            people: 40,
            website: "https://sandnes.example",
          },
        ],
        ["empty", {}],
      ]),
    );
    const name = `cards/${bucketOf("acme", 512)}.json`;
    expect(PublishedCompanyCards.parse(files.get(name))).toEqual({
      v: 2,
      cards: { acme: { g: [["technicians", 2]], md: [0, 0, 2] } },
    });
    expect(
      [...files.values()].flatMap((file) =>
        Object.keys((file as { cards: object }).cards),
      ),
    ).not.toContain("empty");
  });
});
