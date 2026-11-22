import { z } from "@hono/zod-openapi";
import { Offer, PublishedCountry, PublishedDay } from "./offer.js";

// The published dataset's files beside the offers (legacy packages/published-data/index.d.ts):
// what the API serves from the version `current.json` names. The catalogues keep the schemas of
// src/shared/catalogues/.

const Count = z.int().nonnegative();
const Timestamp = z.iso.datetime();
const ByCountry = z.record(PublishedCountry, Count);

/** One source: its licence and the credit it asks for, from the registry. */
export const PublishedSource = z
  .strictObject({
    name: z.string().min(1),
    short: z.string().min(1),
    url: z.url(),
    licence: z.string().min(1),
    credit: z.string(),
    needsKey: z.boolean(),
    kind: z.string().min(1),
    enabled: z.boolean().optional(),
    /** true: read through an intermediary's partner programme, its offers shown apart and labelled. */
    via: z.literal(true).nullable().optional(),
  })
  .openapi("PublishedSource");

/** A family of occupations and, per country, the parts that hold its offers. */
export const PublishedFamily = z
  .strictObject({
    label: z.string().min(1),
    group: z.string().optional(),
    countries: z.record(
      PublishedCountry,
      z.strictObject({
        files: z.array(z.string().min(1)).min(1),
        n: Count,
        bytes: Count,
      }),
    ),
    /** Its finer occupations (ESCO codes) and how many offers each has. */
    occupations: z.record(z.string(), Count).optional(),
    /** true for the skilled trades, shown only when a visitor asks for them. */
    optional: z.literal(true).optional(),
  })
  .openapi("PublishedFamily");

const Files = z.strictObject({ files: z.array(z.string().min(1)), n: Count });

/** Where the word index is (words/, read by the web's search); `via` is the number of the first offer read through an
 *  intermediary, as their offers are numbered last. */
export const WordIndexManifest = z
  .strictObject({
    dir: z.string().min(1),
    n: Count,
    block: z.int().positive(),
    buckets: z.int().positive(),
    pairs: z.int().positive(),
    sizes: z.array(Count),
    countries: z.array(PublishedCountry),
    via: Count,
  })
  .openapi("WordIndexManifest");

/** index.json: what a web reads first, to know which parts to ask for. */
export const PublishedIndex = z
  .strictObject({
    v: z.literal(1),
    generated_at: Timestamp,
    crawled_at: Timestamp,
    expires_at: Timestamp,
    catalogue_v: z.int().positive(),
    families: z.record(z.string(), PublishedFamily),
    /** The newest offers of every family, for a search with no occupation ticked. */
    latest: Files.extend({
      since: PublishedDay,
      optional: Files.optional(),
    }),
    sources: z.record(z.string(), PublishedSource),
    counts: z.strictObject({
      offers: Count,
      optional: Count,
      found: Count,
      by_country: ByCountry,
      via: Count,
      sources: Count,
      companies: Count,
      on_map: Count,
      with_pay: Count,
      with_mode: Count,
    }),
    status: z.strictObject({ ok: z.boolean(), seconds: Count }),
    words: WordIndexManifest,
  })
  .openapi("PublishedIndex");
export type PublishedIndex = z.infer<typeof PublishedIndex>;

const TITLE_KEYS = ["t", "te", "ts", "tc", "tf", "tn", "td"] as const;
const titles = Object.fromEntries(
  TITLE_KEYS.map((key) => [key, true]),
) as Record<(typeof TITLE_KEYS)[number], true>;

/** today.json: the front page's rows behind the search bar, and each language's ten latest (011). */
export const Today = z
  .strictObject({
    v: z.literal(1),
    offers: z.array(
      Offer.pick({
        ...titles,
        id: true,
        c: true,
        ci: true,
        cc: true,
        u: true,
        s: true,
        p: true,
        w: true,
      }),
    ),
    latest: z.record(
      z.string(),
      z.array(
        Offer.pick({
          ...titles,
          id: true,
          c: true,
          ci: true,
          cc: true,
          u: true,
          s: true,
          p: true,
          w: true,
          ct: true,
          wt: true,
          y: true,
        }),
      ),
    ),
  })
  .openapi("Today");
export type Today = z.infer<typeof Today>;

/** places.json: the towns a search bar recognises. Shown name, another name, region, country, latitude, longitude,
 *  offers, and its names in other languages; and the names that are also everyday words, never a town alone. */
export const PublishedPlaces = z
  .strictObject({
    v: z.literal(2),
    places: z.array(
      z.union([
        z.tuple([
          z.string(),
          z.string(),
          z.string(),
          PublishedCountry,
          z.number(),
          z.number(),
          Count,
        ]),
        z.tuple([
          z.string(),
          z.string(),
          z.string(),
          PublishedCountry,
          z.number(),
          z.number(),
          Count,
          z.array(z.string()),
        ]),
      ]),
    ),
    ambiguous: z.array(z.string()),
  })
  .openapi("PublishedPlaces");

/** A region or province: its name, its other names, and how many offers it holds last. */
const Area = z.array(z.union([z.string(), z.number()])).min(2);

/** regions.json: the regions and provinces that hold offers, per country, by NUTS code. */
export const PublishedRegions = z
  .strictObject({
    v: z.literal(1),
    regions: z.record(PublishedCountry, z.record(z.string(), Area)),
    provinces: z.record(PublishedCountry, z.record(z.string(), Area)),
  })
  .openapi("PublishedRegions");

/** status.json: how many adverts were found and why the rest were left out; read by people, not by the web. */
export const PublishedStatus = z
  .strictObject({
    generated_at: Timestamp,
    crawled_at: z.union([Timestamp, z.literal("")]),
    offers: Count,
    optional: Count,
    found: Count,
    sources: Count,
    dropped: z.record(z.string(), Count),
    duplicates: z.strictObject({ sameUrl: Count, sameRole: Count }),
    by_country: ByCountry,
    by_country_optional: ByCountry,
  })
  .openapi("PublishedStatus");

/** companies.json: the Index's rows. Name, offers today, group, offers per region (NUTS code or country), its town and
 *  that town's NUTS region; each group's name in each language; how many register companies each country lists. */
export const PublishedCompanies = z
  .strictObject({
    v: z.literal(2),
    generated_at: Timestamp,
    groups: z.record(z.string(), z.record(z.string(), z.string())),
    companies: z.array(
      z.tuple([
        z.string().min(1),
        Count,
        z.string(),
        z.record(z.string(), Count),
        z.string(),
        z.string(),
      ]),
    ),
    local: z.record(PublishedCountry, Count),
  })
  .openapi("PublishedCompanies");

/** companies/<country>.json: a country's open register of companies: name, NUTS 3 region, town, website ("" when none). */
export const RegisterCompanies = z
  .strictObject({
    v: z.literal(1),
    companies: z.array(
      z.tuple([z.string().min(1), z.string(), z.string(), z.string()]),
    ),
  })
  .openapi("RegisterCompanies");

/** One company's panel in the Index, each field only when there is something to say. */
export const PublishedCompanyCard = z
  .strictObject({
    /** Its careers page (016-career-sites). */
    s: z.string().optional(),
    /** Activity code, register and people, from the register. */
    a: z.string().optional(),
    r: z.string().optional(),
    p: Count.optional(),
    /** The three occupation groups it hires most for, with their offers. */
    g: z.array(z.tuple([z.string(), Count])).optional(),
    /** The six occupations it hires most for, with their offers. */
    f: z.array(z.tuple([z.string(), Count])).optional(),
    /** The three towns with most of its offers ("" for offers placed in a country only), and in how many towns. */
    l: z.array(z.tuple([z.string(), PublishedCountry, Count])).optional(),
    ln: Count.optional(),
    /** Low, high, currency, period and how many adverts state a pay. */
    pay: z
      .tuple([z.number(), z.number(), z.string(), z.string(), Count])
      .optional(),
    /** Adverts saying remote, hybrid, on-site. */
    md: z.tuple([Count, Count, Count]).optional(),
    /** The register companies that belong to the employer: name, town, register. */
    j: z.array(z.tuple([z.string(), z.string(), z.string()])).optional(),
    /** The employer a register company belongs to, and its offers in the company's town today. */
    b: z.string().optional(),
    n: Count.optional(),
    /** The company's website. */
    w: z.string().optional(),
  })
  .openapi("PublishedCompanyCard");

/** cards/<n>.json: the Index's company panels, each under its row's key, read when one opens. */
export const PublishedCompanyCards = z
  .strictObject({
    v: z.literal(2),
    cards: z.record(z.string(), PublishedCompanyCard),
  })
  .openapi("PublishedCompanyCards");

/** published/current.json: the version the API serves. */
export const CurrentVersion = z
  .strictObject({
    v: z.literal(1),
    version: z.string().regex(/^\d{8}T\d{6}Z$/),
  })
  .openapi("CurrentVersion");
export type CurrentVersion = z.infer<typeof CurrentVersion>;
