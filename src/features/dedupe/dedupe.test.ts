import { describe, expect, it } from "vitest";
import { type DedupeAdvert, dedupe, placeKey } from "./dedupe.js";

// The legacy's examples (test/builder.test.mjs, "Dedupe" and NOA-22, NOA-23).
const advert = (
  url: string,
  fields: Partial<DedupeAdvert> & { town?: string; geonameId?: number } = {},
): DedupeAdvert => {
  const { town = "Madrid", geonameId, ...rest } = fields;
  const country = rest.country ?? "es";
  return {
    id: url,
    url,
    kind: "careers",
    company: "Acme",
    title: "Process Engineer",
    country,
    place: placeKey({ geonameId, country, town }),
    posted: "2026-09-01",
    ...rest,
  };
};
const urls = (adverts: readonly { advert: DedupeAdvert }[]) =>
  adverts.map(({ advert: kept }) => kept.url);

// A maintenance technician's job in Vic, posted on 1 October.
const job = (url: string, fields: Partial<DedupeAdvert> = {}) =>
  advert(url, {
    title: "Técnico de mantenimiento",
    town: "Vic",
    posted: "2026-10-01",
    ...fields,
  });

// The kind of the copy kept of one job read from sources of these kinds.
const keptKind = (kinds: DedupeAdvert["kind"][]) =>
  dedupe(kinds.map((kind, i) => advert(`https://${i}.example/1`, { kind })))
    .kept[0]?.advert.kind;

describe("one copy of each advert (dedupe FR-2, FR-3, FR-5)", () => {
  it("keeps one copy per address and per role, nameless adverts apart, and counts what fell", () => {
    const result = dedupe([
      advert("https://a.example/1", {
        kind: "feed",
        title: "Mechanical Engineer",
      }),
      advert("https://a.example/1?utm_source=x", {
        title: "Mechanical Engineer",
      }),
      advert("https://b.example/9", {
        kind: "feed",
        title: "Mechanical Engineer (m/w/d)",
        posted: "2026-08-20",
      }),
      advert("https://c.example/2", { company: "", title: "Engineer" }),
      advert("https://c.example/3", { company: "", title: "Engineer" }),
    ]);
    expect(result.kept).toHaveLength(3);
    expect(result.kept[0]?.advert.kind).toBe("careers");
    expect([result.sameUrl, result.sameRole]).toEqual([1, 1]);
  });

  it("keeps the same job in two towns as two offers, and one where the town is one", () => {
    expect(
      dedupe([
        advert("https://a/1", { town: "Madrid" }),
        advert("https://a/2", { town: "München", country: "de" }),
      ]).kept,
    ).toHaveLength(2);
    expect(
      dedupe([
        advert("https://a/1", {
          town: "Munich",
          country: "de",
          geonameId: 2867714,
        }),
        advert("https://a/2", {
          town: "München",
          country: "de",
          geonameId: 2867714,
        }),
      ]).kept,
    ).toHaveLength(1);
  });

  it("reads where an advert is by its GeoNames town, else its country and town", () => {
    expect(
      placeKey({ geonameId: 3117735, country: "es", town: "Madrid" }),
    ).toBe("#3117735");
    expect(placeKey({ country: "es", town: "MADRID" })).toBe("es|madrid");
  });

  it("does not let a copy with no day beat one with a day", () => {
    expect(
      dedupe([
        advert("https://a/1", { posted: "2026-09-20" }),
        advert("https://a/2", { posted: "" }),
      ]).kept[0]?.advert.posted,
    ).toBe("2026-09-20");
  });

  it("keeps a Catalan title and its Spanish one as one job, the copy posted first", () => {
    const result = dedupe([
      advert("https://aisvision.com/ca/1", {
        company: "AIS Vision Systems",
        title: "Enginyer d'automatització",
        town: "Sabadell",
        language: "ca",
        posted: "2026-09-29",
      }),
      advert("https://aisvision.com/es/1", {
        company: "AIS Vision Systems",
        title: "Ingeniero de automatización",
        town: "Sabadell",
        posted: "2026-09-28",
      }),
    ]);
    expect([result.kept.length, result.sameRole, urls(result.kept)]).toEqual([
      1,
      1,
      ["https://aisvision.com/es/1"],
    ]);
    expect(
      dedupe([
        advert("https://a/1", {
          title: "Tècnic/a de manteniment",
          town: "Girona",
          language: "ca",
        }),
        advert("https://a/2", {
          title: "Técnico/a de mantenimiento",
          town: "Barcelona",
        }),
      ]).kept,
    ).toHaveLength(2);
    expect(
      dedupe([
        advert("https://a/3", {
          title: "Cap de producció",
          town: "Vic",
          language: "ca",
        }),
        advert("https://a/4", { title: "Jefe de producción", town: "Vic" }),
        advert("https://a/5", { title: "Jefe de calidad", town: "Vic" }),
      ]).kept,
    ).toHaveLength(2);
  });

  it("joins a company written two ways, and keeps apart what no key tells from two jobs", () => {
    const two = (a: string, b: string, title = "Systems Engineer") =>
      dedupe([
        advert("https://a/1", { company: a, title }),
        advert("https://b/1", { company: b, title }),
      ]).kept.length;
    expect(
      two("Sopra Steria", "Sopra Steria ES", "IT Senior Project Manager - SAP"),
    ).toBe(1);
    expect(two("Indra", "Indra Avitech GmbH")).toBe(2);
    expect(two("Adzuna", "Adzuna Ltd")).toBe(2);
    expect(two("(m/w/d)", "(m/w/d)", "Industriemechaniker")).toBe(2);
    expect(
      two("", "BOLQUETS FLUVIA SLU", "Mecànic/a de vehicles industrials"),
    ).toBe(2);
    expect(
      dedupe([
        advert("https://feinaactiva/1", {
          kind: "feed",
          company: "GROWING UP HR SL",
          title:
            "Enginyer/a de Projectes - Disseny Mecànic I Gestió Industrial",
          language: "ca",
        }),
        advert("https://tecdata/1", {
          company: "TECDATA ENGINEERING",
          title:
            "Ingeniero/a de Proyectos – Diseño Mecánico & Gestión Industrial",
        }),
      ]).kept,
    ).toHaveLength(2);
  });

  it("keeps the lower address in either order, with the pay, last day and years another copy states", () => {
    const pay = {
      low: 30_000,
      high: 34_000,
      currency: "EUR",
      period: "y",
      yearlyEur: 32_000,
    };
    const b = job("https://b.example/2", {
      pay,
      expires: "2026-12-01",
      years: 3,
    });
    const ab = dedupe([job("https://a.example/1"), b]).kept[0]?.advert;
    const ba = dedupe([b, job("https://a.example/1")]).kept[0]?.advert;
    expect([ab?.url, ba?.url]).toEqual([
      "https://a.example/1",
      "https://a.example/1",
    ]);
    expect([ab?.pay, ab?.expires, ab?.years]).toEqual([pay, "2026-12-01", 3]);
    expect(ba).toEqual(ab);
  });

  it("ranks an employer's page over a feed, and a feed over a portal or an intermediary", () => {
    expect(keptKind(["feed", "careers"])).toBe("careers");
    expect(keptKind(["via", "feed"])).toBe("feed");
    expect(keptKind(["portal", "feed"])).toBe("feed");
  });

  it("never changes the adverts it is given", () => {
    const a = advert("https://a/1");
    const b = advert("https://b/1", { years: 4 });
    const before = structuredClone([a, b]);
    dedupe([a, b]);
    expect([a, b]).toEqual(before);
  });
});

// EWOR's remote co-founder, filed in a town of a country.
const ewor = (i: number, town: string, country: string) =>
  advert(`https://x.example/${i}`, {
    company: "EWOR GmbH",
    title: "SaaS Co-Founder / CCO (100 % remote)",
    town,
    country,
  });

// One deepset job, at an address, in a town, with the work mode its copy names.
const deepset = (url: string, town: string, workMode?: string) =>
  advert(url, {
    company: "deepset",
    title: "Senior Backend Engineer",
    town,
    country: "de",
    posted: "2026-10-22",
    workMode,
  });

// How many copies of a job with this title, in Madrid and Sevilla, are kept.
const keptOf = (title: string) =>
  dedupe([
    advert("https://a/1", { title, town: "Madrid" }),
    advert("https://a/2", { title, town: "Sevilla" }),
  ]).kept.length;

describe("campaigns and remote jobs (dedupe FR-4)", () => {
  const campaign = Array.from({ length: 12 }, (_, i) =>
    advert(`https://c/${i}`, {
      town: `Town ${i}`,
      country: i < 8 ? "nl" : "be",
    }),
  );

  it("keeps a company and title in more than ten towns once per country, with the copies of its other towns", () => {
    const { kept } = dedupe(campaign);
    expect(kept.map(({ advert: one }) => one.country).toSorted()).toEqual([
      "be",
      "nl",
    ]);
    expect(
      kept.find(({ advert: one }) => one.country === "nl")?.alsoAt,
    ).toHaveLength(7);
    expect(dedupe(campaign.slice(0, 3)).kept).toHaveLength(3);
  });

  it("keeps a fully remote job once wherever its copies are filed, the same job on site in two towns twice", () => {
    const { kept } = dedupe([
      ewor(1, "Rohrbach", "de"),
      ewor(2, "Warsaw", "pl"),
      ewor(3, "Pristina", "xk"),
      advert("https://y.example/1", {
        title: "Elektriker",
        town: "Berlin",
        country: "de",
      }),
      advert("https://y.example/2", {
        title: "Elektriker",
        town: "Köln",
        country: "de",
      }),
    ]);
    expect([kept.length, kept[0]?.alsoAt.length]).toEqual([3, 2]);
  });

  it("joins a copy naming no mode to a remote copy in its place, not one elsewhere nor one on site", () => {
    const same = dedupe([
      deepset("https://jobs.ashbyhq.com/deepsetai/1", "Berlin", "remote"),
      deepset("https://noordt.co/jobs/1", "Berlin"),
    ]);
    expect([same.kept.length, same.kept[0]?.advert.workMode]).toEqual([
      1,
      "remote",
    ]);
    expect(
      dedupe([
        deepset("https://jobs.ashbyhq.com/deepsetai/1", "Berlin", "remote"),
        deepset("https://deepset.ai/jobs/2", "Hamburg"),
      ]).kept,
    ).toHaveLength(2);
    expect(
      dedupe([
        deepset("https://jobs.ashbyhq.com/deepsetai/1", "Berlin", "remote"),
        deepset("https://deepset.ai/jobs/3", "Berlin", "onsite"),
      ])
        .kept.map(({ advert: one }) => one.workMode)
        .toSorted(),
    ).toEqual(["onsite", "remote"]);
  });

  it("reads a remote job in its title, in the sources' languages", () => {
    expect(
      [
        "Ingeniero de datos (100 % remoto)",
        "Data Engineer - full remote",
        "Ingénieur DevOps - télétravail complet",
        "Data Engineer",
      ].map(keptOf),
    ).toEqual([1, 1, 1, 2]);
  });
});
