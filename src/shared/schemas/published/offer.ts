import { z } from "@hono/zod-openapi";

// The published offer (legacy packages/published-data/index.d.ts `Offer`): one per advert the
// publication keeps. Short keys keep the files small: every visitor downloads them. The fields
// that are not optional are always there; the rest only when the advert says them or a step
// worked them out. Strict: an offer field the contract does not name fails the build (FR-9).

/** A day, written YYYY-MM-DD. */
export const PublishedDay = z.iso.date();
/** A country, ISO 3166 code in lower case ("es"); "xx" for a remote offer with no country, "zz" for none. */
export const PublishedCountry = z.string().regex(/^[a-z]{2}$/);
/** A language, ISO 639-1 code ("ca"). */
export const PublishedLanguage = z.string().regex(/^[a-z]{2}$/);
/** The legacy's pay periods: a year, month, week, day or hour. */
export const PayPeriod = z.enum(["y", "m", "w", "d", "h"]);

const Title = z.string().min(1);

export const Offer = z
  .strictObject({
    /** Stable id, worked out from the advert's address. */
    id: z.string().min(1),
    /** The title as the advert writes it, cleaned, whole (at most 250 characters, cut at a word). */
    t: Title.max(251),
    /** The title in English, when written in another language (011-title-translation). */
    te: Title.optional(),
    /** The title in Spanish, when written in another language. */
    ts: Title.optional(),
    /** The title in Catalan; a title written in Catalan carries itself, so the Catalan page never shows its Spanish. */
    tc: Title.optional(),
    /** The title in French, when written in another language. */
    tf: Title.optional(),
    /** The title in Dutch, when written in another language. */
    tn: Title.optional(),
    /** The title in German, when written in another language. */
    td: Title.optional(),
    /** The title's language, as its source states it. */
    tl: PublishedLanguage.optional(),
    /** Its source asks for its adverts not to be altered: no translation, and this is the title's language. */
    nt: PublishedLanguage.optional(),
    /** The employer's name ("" when the advert names none). */
    c: z.string(),
    /** 1 when the employer is a staffing or recruitment agency. */
    ag: z.literal(1).optional(),
    /** The place as the advert writes it. */
    l: z.string(),
    /** The country the place is in. */
    cc: PublishedCountry,
    /** The town ("" when the place names none). */
    ci: z.string(),
    /** The town's position: latitude, longitude. */
    g: z.tuple([z.number(), z.number()]).optional(),
    /** The place's region code in Eurostat's NUTS, as precise as the place allows ("ES511"). */
    n: z.string().min(2).optional(),
    /** The other places of one vacancy offered in several: town, latitude, longitude; the town alone when it is not on
     *  the map. */
    m: z
      .array(
        z.union([
          z.tuple([z.string(), z.number(), z.number()]),
          z.tuple([z.string()]),
        ]),
      )
      .optional(),
    /** The day it was posted, else the day the crawler first saw it ("" when neither is known). */
    d: z.union([PublishedDay, z.literal("")]),
    /** With no day: the day it was first in the store, for the date filters only (the card shows no day). */
    fs: PublishedDay.optional(),
    /** The last day to apply, when stated and still ahead. */
    x: PublishedDay.optional(),
    /** The advert's address at its source: every card links there. */
    u: z.url(),
    /** The source: its key in index.json's `sources`. */
    s: z.string().min(1),
    /** Its occupations: ISCO-08 unit groups ("2141"), the families the gate gave it. */
    f: z.array(z.string().regex(/^\d{4}$/)).min(1),
    /** Finer occupations: ESCO codes ("2141.7"). */
    e: z.array(z.string().min(1)).optional(),
    /** The occupation code its source gives: ISCO's four digits, or "ssyk:" and Sweden's. */
    k: z.string().min(1).optional(),
    /** The contract: "i" permanent, "t" temporary ("t6": for six months), "e" agency work, "eo" agency work with the
     *  option to stay, "to" temporary with the option to stay, "p" internship, "a" freelance. */
    ct: z
      .string()
      .regex(/^(?:i|t\d*|e|eo|to|p|a)$/)
      .optional(),
    /** The working time: "c" full-time, "p" part-time ("p20": twenty hours a week). */
    wt: z
      .string()
      .regex(/^(?:c|p\d*)$/)
      .optional(),
    /** Where the work is done: on-site, hybrid, remote. */
    w: z.enum(["o", "h", "r"]).optional(),
    /** The pay: from, to, currency, and per year, month, week, day or hour; from 0 is a ceiling alone, «up to». */
    p: z
      .tuple([
        z.number().nonnegative(),
        z.number().positive(),
        z.string().length(3),
        PayPeriod,
      ])
      .optional(),
    /** The pay a year in euros, for the pay filter. */
    pa: z.number().positive().optional(),
    /** The years of experience asked. */
    y: z.number().positive().optional(),
    /** The fewest years it asks, when it asks two figures: what the years filter reads. */
    yl: z.number().positive().optional(),
    /** The degrees asked: degree families. */
    dg: z.array(z.string().min(1)).optional(),
    /** The languages asked. */
    lg: z.array(PublishedLanguage).optional(),
    /** The tools and technologies named (a later feature). */
    tk: z.array(z.string().min(1)).optional(),
  })
  .openapi("Offer");
export type Offer = z.infer<typeof Offer>;

/** offers/<family>-<country>[-n].json and offers/latest[-n].json: the offers, one part each. */
export const OffersPart = z
  .strictObject({
    v: z.literal(1),
    shard: z.string().min(1),
    offers: z.array(Offer),
  })
  .openapi("OffersPart");
export type OffersPart = z.infer<typeof OffersPart>;
