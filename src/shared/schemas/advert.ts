import { createHash } from "node:crypto";
import { z } from "@hono/zod-openapi";
import { SourceId } from "./source.js";

// The legacy kept up to 100 000 characters of an advert's text (TEXT_KEPT). The text is only read
// by the processor (requirements, pay, closed notices) and is never published.
export const DESCRIPTION_LIMIT = 100_000;

const Day = z.iso.date();

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

// Stable across runs and locales: derived only from the source and the source's own id.
export function advertId(source: string, sourceId: string): string {
  const hash = createHash("sha256")
    .update(`${source}\n${sourceId}`)
    .digest("hex");
  return `${source}-${hash.slice(0, 16)}`;
}
