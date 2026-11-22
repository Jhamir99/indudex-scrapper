import { describe, expect, it } from "vitest";
import {
  CurrentVersion,
  PublishedCompanies,
  PublishedCompanyCards,
  PublishedIndex,
  PublishedPlaces,
  PublishedRegions,
  RegisterCompanies,
  Today,
} from "./dataset.js";
import { Offer, OffersPart } from "./offer.js";

// An offer as the legacy's pile wrote it (the made-up records of its tests).
const offer: Offer = {
  id: "aB3dE6gH",
  t: "Técnico de mantenimiento",
  tl: "es",
  c: "Acme",
  l: "Vic, Barcelona",
  cc: "es",
  ci: "Vic",
  g: [41.93, 2.25],
  n: "ES511",
  d: "2026-10-01",
  x: "2026-12-01",
  u: "https://acme.example/jobs/1",
  s: "feinaactiva",
  f: ["3115"],
  e: ["3115.1"],
  k: "3115",
  ct: "t6",
  wt: "p20",
  w: "h",
  p: [30_000, 34_000, "EUR", "y"],
  pa: 32_000,
  y: 3,
  yl: 2,
  dg: ["engineering"],
  lg: ["es", "ca"],
};

describe("the published schemas (publication FR-9)", () => {
  it("accept an offer with every field the legacy wrote, and one with only the fields always there", () => {
    expect(Offer.parse(offer)).toEqual(offer);
    const bare = {
      id: "x1",
      t: "Electricista",
      c: "",
      l: "",
      cc: "zz",
      ci: "",
      d: "",
      u: "https://a.example/1",
      s: "sae",
      f: ["7411"],
    };
    expect(Offer.parse(bare)).toEqual(bare);
    expect(
      OffersPart.parse({ v: 1, shard: "3115-es", offers: [offer] }),
    ).toBeTruthy();
  });

  it("refuse an offer field the contract does not name: no text, no contact", () => {
    expect(Offer.safeParse({ ...offer, description: "…" }).success).toBe(false);
    expect(
      Offer.safeParse({ ...offer, email: "jobs@acme.example" }).success,
    ).toBe(false);
  });

  it("refuse a contract, a working time or a period the legacy never wrote", () => {
    expect(Offer.safeParse({ ...offer, ct: "permanent" }).success).toBe(false);
    expect(Offer.safeParse({ ...offer, wt: "full" }).success).toBe(false);
    expect(Offer.safeParse({ ...offer, p: [1, 2, "EUR", "q"] }).success).toBe(
      false,
    );
  });

  it("accept the index, the front page, places, regions and the directory as the legacy wrote them", () => {
    const at = "2026-11-22T10:00:00.000Z";
    expect(
      PublishedIndex.safeParse({
        v: 1,
        generated_at: at,
        crawled_at: at,
        expires_at: "2026-11-24T10:00:00.000Z",
        catalogue_v: 1,
        families: {
          "3115": {
            label: "Mechanical engineering technicians",
            group: "technicians",
            countries: {
              es: { files: ["offers/3115-es.json"], n: 1, bytes: 512 },
            },
            occupations: { "3115.1": 1 },
          },
        },
        latest: { files: ["offers/latest.json"], n: 1, since: "2026-11-01" },
        sources: {
          feinaactiva: {
            name: "Feina Activa",
            short: "Feina Activa",
            url: "https://feinaactiva.gencat.cat/",
            licence: "CC BY 4.0",
            credit: "Generalitat de Catalunya",
            needsKey: false,
            kind: "feed",
            enabled: true,
          },
        },
        counts: {
          offers: 1,
          optional: 0,
          found: 3,
          by_country: { es: 1 },
          via: 0,
          sources: 1,
          companies: 0,
          on_map: 1,
          with_pay: 1,
          with_mode: 1,
        },
        status: { ok: true, seconds: 12 },
        words: {
          dir: "words",
          n: 1,
          block: 250,
          buckets: 1024,
          pairs: 256,
          sizes: [2],
          countries: ["es"],
          via: 1,
        },
      }).success,
    ).toBe(true);
    const { id, t, c, ci, cc, u, s, p, w } = offer;
    expect(
      Today.safeParse({
        v: 1,
        offers: [{ id, t, c, ci, cc, u, s, p, w }],
        latest: {},
      }).success,
    ).toBe(true);
    expect(
      PublishedPlaces.safeParse({
        v: 2,
        places: [
          ["Vic", "", "Catalunya", "es", 41.93, 2.25, 1, ["Vich"]],
          ["Girona", "", "Catalunya", "es", 41.98, 2.82, 3],
        ],
        ambiguous: ["Mataró"],
      }).success,
    ).toBe(true);
    expect(
      PublishedRegions.safeParse({
        v: 1,
        regions: { es: { ES51: ["Cataluña", "Catalunya", 4] } },
        provinces: {},
      }).success,
    ).toBe(true);
    expect(
      PublishedCompanies.safeParse({
        v: 2,
        generated_at: at,
        groups: { technicians: { en: "Technicians", es: "Técnicos" } },
        companies: [["Acme", 1, "technicians", { ES511: 1 }, "Vic", "ES511"]],
        local: { no: 12 },
      }).success,
    ).toBe(true);
    expect(
      RegisterCompanies.safeParse({
        v: 1,
        companies: [["Sandnes Elektriske AS", "NO0A2", "Sandnes", ""]],
      }).success,
    ).toBe(true);
    expect(
      PublishedCompanyCards.safeParse({
        v: 2,
        cards: {
          acme: {
            g: [["technicians", 1]],
            md: [0, 1, 0],
            pay: [30_000, 34_000, "EUR", "y", 1],
          },
        },
      }).success,
    ).toBe(true);
  });

  it("names the current version by its build's time", () => {
    expect(
      CurrentVersion.safeParse({ v: 1, version: "20261122T100000Z" }).success,
    ).toBe(true);
    expect(CurrentVersion.safeParse({ v: 1, version: "../etc" }).success).toBe(
      false,
    );
  });
});
