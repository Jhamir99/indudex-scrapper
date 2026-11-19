import { createHash } from "node:crypto";
import { z } from "@hono/zod-openapi";
import { SourceId } from "./source.js";

// The legacy kept up to 100 000 characters of an advert's text (TEXT_KEPT). The text is only read
// by the processor (requirements, pay, closed notices) and is never published.
export const DESCRIPTION_LIMIT = 100_000;

const Day = z.iso.date();

// A value as the source wrote it in a field of its own: trimmed, never empty, and capped so a
// broken field cannot fill the store.
export const SOURCE_FIELD_LIMIT = 200;
const SourceWords = z.string().trim().min(1).max(SOURCE_FIELD_LIMIT);

const PayFigure = z.union([z.number().positive().finite(), SourceWords]);
const HOURS_IN_A_WEEK = 168;
export const SourcePay = z
  .strictObject({
    min: PayFigure.optional(),
    max: PayFigure.optional(),
    currency: SourceWords.optional(),
    period: SourceWords.optional(),
    hoursPerWeek: z.number().positive().max(HOURS_IN_A_WEEK).optional(),
    partTime: z.boolean().optional(),
  })
  .refine((pay) => pay.min !== undefined || pay.max !== undefined, {
    error: "a pay needs a figure",
  });
export type SourcePay = z.infer<typeof SourcePay>;

// The source's licence and required attribution, stored with every advert (FR-2).
// `credit: null` states explicitly that the source requires none.
export const Attribution = z.strictObject({
  licence: z.string().min(1),
  credit: z.string().min(1).nullable(),
});
export type Attribution = z.infer<typeof Attribution>;

// Strict on purpose: an unknown key is rejected, so no contact person, e-mail or phone field
// can slip into the store.
export const Advert = z.strictObject({
  id: z.string().min(1),
  source: SourceId,
  sourceId: z.string().min(1),
  title: z.string().trim().min(1),
  // "" when the advert names no employer, town or place.
  company: z.string(),
  location: z.string(),
  // ISO 3166-1 alpha-2, lower case ("at").
  country: z.string().regex(/^[a-z]{2}$/, "a lower-case ISO 3166-1 code"),
  city: z.string(),
  remote: z.boolean(),
  workMode: z.enum(["onsite", "hybrid", "remote"]).optional(),
  // The contract, hours and employment types the source states in fields of their own, in its
  // words ("Contrato indefinido", "Jornada completa", ["FULL_TIME", "TEMPORARY"]); the processor
  // reads contract and working time only from these (advert-facts FR-1, FR-2).
  contract: SourceWords.optional(),
  hours: SourceWords.optional(),
  employmentType: z.array(SourceWords).min(1).max(10).optional(),
  // The years of experience the source states in a field of its own (VDAB), believed as given.
  years: z.number().nonnegative().max(60).optional(),
  // The pay the source states in fields of its own, as it gives it: the figures as numbers or the
  // field's words ("£35,000 - £40,000"), currency and period in its words ("€", "Mensual",
  // "P1M"), and the weekly hours and part time when it states them. The processor reads and
  // checks it (pay FR-1, FR-4).
  pay: SourcePay.optional(),
  url: z.url({ protocol: /^https$/, error: "an https:// address" }),
  description: z.string().max(DESCRIPTION_LIMIT),
  posted: Day.optional(),
  // When absent, the advert expires 2 years after `posted` (or after it was first seen).
  expires: Day.optional(),
  // The occupation codes the source itself gives: ISCO-08 unit groups, Sweden's SSYK.
  occupationCodes: z.strictObject({
    isco: z
      .string()
      .regex(/^\d{4}$/, "an ISCO-08 unit group")
      .optional(),
    ssyk: z.string().min(1).optional(),
  }),
  // ISO 639-1 code of the advert's language ("de").
  language: z.string().regex(/^[a-z]{2}$/, "a lower-case ISO 639-1 code"),
  attribution: Attribution,
});
export type Advert = z.infer<typeof Advert>;

// An advert as the store keeps it: with the day the store first saw it.
export const StoredAdvert = Advert.extend({ firstSeen: Day });
export type StoredAdvert = z.infer<typeof StoredAdvert>;

const YEARS_WITHOUT_EXPIRY = 2;

// The last day an advert is kept: its own expiry date, else 2 years after it was posted
// (after it was first seen when the source gives no posted date).
export function expiryDay(advert: StoredAdvert): string {
  if (advert.expires) return advert.expires;
  const from = new Date(`${advert.posted ?? advert.firstSeen}T00:00:00Z`);
  from.setUTCFullYear(from.getUTCFullYear() + YEARS_WITHOUT_EXPIRY);
  return from.toISOString().slice(0, 10);
}

// `today` as YYYY-MM-DD. An advert is still open on its expiry day.
export function isExpired(advert: StoredAdvert, today: string): boolean {
  return expiryDay(advert) < today;
}

// Stable across runs and locales: derived only from the source and the source's own id.
export function advertId(source: string, sourceId: string): string {
  const hash = createHash("sha256")
    .update(`${source}\n${sourceId}`)
    .digest("hex");
  return `${source}-${hash.slice(0, 16)}`;
}
