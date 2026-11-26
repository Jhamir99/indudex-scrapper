import { describe, expect, it } from "vitest";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import type { AdvertFacts } from "../advert-facts/index.js";
import type { Placement } from "../places/index.js";
import { build, type BuildInput, type BuildSteps } from "./build.js";
import { offerId } from "./offer.js";
import type { StoreReading } from "./read-store.js";

const TODAY = "2026-11-22";
let serial = 0;
const advert = (
  source: string,
  fields: Partial<StoredAdvert> = {},
): StoredAdvert => {
  serial++;
  return {
    id: `${source}-${serial}`,
    source,
    sourceId: String(serial),
    title: "Process Engineer",
    company: "Acme GmbH",
    location: "Berlin",
    country: "de",
    city: "Berlin",
    remote: false,
    url: `https://${source}.example/jobs/${serial}`,
    description: "Wir suchen dich.",
    posted: "2026-11-10",
    occupationCodes: {},
    language: "de",
    attribution: { licence: "CC BY 4.0", credit: null },
    firstSeen: "2026-11-01",
    ...fields,
  };
};

// Towns by name, a gate that keeps engineers (2144) and electricians (7411, a skilled trade).
const TOWNS: Record<string, number> = {
  Berlin: 2_950_159,
  Hamburg: 2_911_298,
  Köln: 2_886_242,
};
const steps: BuildSteps = {
  gate: {
    decide: (a) =>
      /besetzt/.test(a.description)
        ? { kept: false, reason: "closed" }
        : /engineer/i.test(a.title)
          ? { kept: true, families: ["2144"], occupations: [], trade: false }
          : /elektriker/i.test(a.title)
            ? { kept: true, families: ["7411"], occupations: [], trade: true }
            : { kept: false, reason: "outside the vertical" },
  },
  placer: {
    place: (input): Placement => {
      const id = TOWNS[input.city];
      return id
        ? {
            town: {
              geonameId: id,
              name: input.city,
              latitude: 52.52,
              longitude: 13.4,
            },
            nuts: "DE300",
            from: "location",
          }
        : { town: null, nuts: null, from: null };
    },
    namedPlace: (input) => ({ country: input.country, town: input.city }),
  },
  facts: {
    facts: (a): AdvertFacts => ({
      workMode: a.workMode ?? null,
      contract: null,
      workingTime: null,
      years: null,
      degrees: [],
      languages: [],
      tools: [],
      title: a.title,
    }),
  },
  pay: { pay: () => null },
};
const reading = (
  adverts: StoredAdvert[],
  taken: StoredAdvert[] = [],
): StoreReading => {
  const sources = [...new Set(adverts.map((a) => a.source))];
  return {
    passes: sources.map((source) => ({
      source,
      adverts: adverts.filter((a) => a.source === source),
    })),
    taken,
    counts: {
      found: adverts.length + taken.length,
      withdrawn: taken.length,
      stale: 0,
      noLink: 0,
    },
    sources: sources.length,
    crawledAt: "2026-11-21T10:00:00.000Z",
  };
};
const run = (adverts: StoredAdvert[], fields: Partial<BuildInput> = {}) =>
  build({
    reading: reading(adverts),
    steps,
    kinds: new Map([["acme", "careers"]]),
    untranslated: new Set(),
    optionalFamilies: new Set(["7411"]),
    remembered: [],
    stillTaken: () => true,
    today: TODAY,
    ...fields,
  });

describe("the build (publication FR-1, FR-2, FR-5)", () => {
  it("gates, keeps one copy of an advert across sources (the employer's page), and counts what fell", () => {
    const built = run([
      advert("brz", { url: "https://brz.example/jobs/1" }),
      advert("acme", { url: "https://acme.example/jobs/1" }),
      advert("brz", { title: "Koch" }),
      advert("brz", { title: "Elektriker", city: "Köln" }),
    ]);
    expect(built.offers.map((offer) => offer.u)).toEqual([
      "https://acme.example/jobs/1",
      expect.stringMatching(/brz\.example/),
    ]);
    expect(built.counts.outsideVertical).toBe(1);
    expect(built.duplicates).toEqual({ sameUrl: 0, sameRole: 1 });
    expect(built.offers.map(built.inMain)).toEqual([true, false]);
    expect(built.directory[0]).toMatchObject({
      employer: "Acme GmbH",
      families: ["2144"],
      country: "de",
      town: "Berlin",
      nuts: "DE300",
    });
  });

  it("counts an advert the gate leaves out as closed (closed adverts FR-4)", () => {
    const built = run([
      advert("brz"),
      advert("brz", { description: "Diese Stelle ist bereits besetzt." }),
    ]);
    expect(built.offers).toHaveLength(1);
    expect([built.counts.closed, built.counts.outsideVertical]).toEqual([1, 0]);
  });

  it("leaves out an offer whose last day passed and one over a year old", () => {
    const built = run([
      advert("brz", {
        description: "Bewerbungsfrist: 01.11.2026",
        posted: "2026-10-01",
        expires: "2026-11-20",
      }),
      advert("brz", { posted: "2025-10-01" }),
      advert("brz", { posted: undefined, firstSeen: "2025-11-01" }),
      advert("brz", { posted: "2026-11-01", title: "Test Engineer" }),
    ]);
    expect([
      built.offers.length,
      built.counts.expired,
      built.counts.old,
    ]).toEqual([1, 1, 2]);
  });

  it("leaves out every copy of an advert taken down, remembers it, and forgets it once the list does", () => {
    const takenDown = advert("acme", { url: "https://acme.example/jobs/9" });
    const copy = advert("brz");
    const first = build({
      reading: reading([copy], [takenDown]),
      steps,
      kinds: new Map(),
      untranslated: new Set(),
      optionalFamilies: new Set(),
      remembered: [],
      stillTaken: () => true,
      today: TODAY,
    });
    expect(first.offers).toEqual([]);
    expect(first.taken).toEqual([
      {
        url: "https://acme.example/jobs/9",
        company: "Acme GmbH",
        title: "Process Engineer",
        language: "de",
        place: "#2950159",
      },
    ]);
    // Swept from the store by the scrapper, the advert's copy stays out while the list names it.
    expect(run([copy], { remembered: first.taken }).offers).toEqual([]);
    const forgotten = run([copy], {
      remembered: first.taken,
      stillTaken: () => false,
    });
    expect([forgotten.offers.length, forgotten.taken]).toEqual([1, []]);
  });

  it("gives a campaign kept once per country its other towns, and the copy kept what another says", () => {
    const towns = [
      "Berlin",
      "Hamburg",
      "Köln",
      ...Array.from({ length: 9 }, (_, i) => `Ort ${i}`),
    ];
    const built = run(
      towns.map((city, i) =>
        advert("brz", {
          city,
          location: city,
          ...(i === 1 ? { workMode: "hybrid" as const } : {}),
        }),
      ),
    );
    expect(built.offers).toHaveLength(1);
    const [offer] = built.offers;
    expect(offer?.m?.length).toBe(11);
    expect(offer?.w).toBe("h");
    expect(built.campaignPlacements).toHaveLength(11);
  });

  it("brings titles in capitals down as the others write them, but a source's that forbids it; writes out entities", () => {
    const built = run(
      [
        advert("brz", { title: "PROCESS ENGINEER SAP" }),
        ...Array.from({ length: 3 }, (_, i) =>
          advert("brz", { title: `SAP Engineer ${i}`, city: "Hamburg" }),
        ),
        advert("sae", { title: "TEST ENGINEER", city: "Köln" }),
        advert("brz", { title: "R&amp;D Engineer", city: "Ort" }),
      ],
      { untranslated: new Set(["sae"]) },
    );
    expect(built.offers.map((offer) => offer.t)).toEqual(
      expect.arrayContaining([
        "Process Engineer SAP",
        "TEST ENGINEER",
        "R&D Engineer",
      ]),
    );
    expect(built.offers.every((offer) => built.placements.has(offer.id))).toBe(
      true,
    );
  });

  it("ids an offer by its address", () => {
    const built = run([
      advert("brz", { url: "https://brz.example/jobs/77?utm_source=x" }),
    ]);
    expect(built.offers[0]?.id).toBe(offerId("https://brz.example/jobs/77"));
  });
});

describe("a place that names its town or its country falsely (legacy resync T012, T011)", () => {
  // The town the place names once its false parts are read off, and the country it names.
  const where: Record<string, { country: string; town: string }> = {
    "Köln und Umgebung": { country: "de", town: "Köln" },
    Niemcy: { country: "pl", town: "" },
  };
  const falseSteps: BuildSteps = {
    ...steps,
    placer: {
      place: (input) =>
        steps.placer.place({ ...input, city: input.city || input.location }),
      namedPlace: (input) =>
        where[input.location]
          ? {
              town: where[input.location]!.town,
              country: input.location === "Niemcy" ? "de" : input.country,
            }
          : { country: input.country, town: input.city },
    },
  };
  it("places the advert by the town read off, and in the country its place names", () => {
    const built = build({
      reading: reading([
        advert("brz", { location: "Köln und Umgebung", city: "" }),
        advert("brz", {
          location: "Niemcy",
          city: "",
          country: "pl",
          title: "Process Engineer II",
        }),
      ]),
      steps: falseSteps,
      kinds: new Map(),
      untranslated: new Set(),
      optionalFamilies: new Set(["7411"]),
      remembered: [],
      stillTaken: () => true,
      today: TODAY,
    });
    expect(
      built.offers.map((offer) => [offer.cc, offer.ci, Boolean(offer.g)]),
    ).toEqual([
      ["de", "Köln", true],
      ["de", "", false],
    ]);
  });
});
