import { z } from "@hono/zod-openapi";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { classifier } from "./classifier.js";
import { saysClosed } from "./closed.js";
import type { CompiledGate } from "./compile.js";
import { hygieneReason } from "./hygiene.js";
import { markedFor } from "./markets.js";
import {
  NOT_STATED,
  saysEuropeOnly,
} from "../../shared/catalogues/country-names.js";

// What the gate reads of a stored advert (FR-10); the description only for a closed notice near its top (closed
// adverts FR-1).
export type GateInput = Pick<
  StoredAdvert,
  "title" | "language" | "occupationCodes" | "country" | "url" | "description"
> &
  Partial<Pick<StoredAdvert, "location">> & {
    // The advert is a company board's (career sites FR-10).
    readonly board?: boolean;
  };

// An advert kept, with its families (the catalogue's ids, ISCO-08 unit groups) and its ESCO
// occupations, or left out with its reason.
export const GateDecision = z
  .discriminatedUnion("kept", [
    z.strictObject({
      kept: z.literal(true),
      families: z.array(z.string()).min(1),
      occupations: z.array(z.string()),
      // Kept by the skilled trades, read only for what the main families leave out.
      trade: z.boolean(),
    }),
    z.strictObject({
      kept: z.literal(false),
      reason: z.string().min(1),
    }),
  ])
  .openapi("GateDecision");
export type GateDecision = z.infer<typeof GateDecision>;

export const OUTSIDE_VERTICAL = "outside the vertical";
export const OUTSIDE_EUROPE = "outside Europe";
export const HYGIENE = "hygiene";
export const CLOSED = "closed";
export const PLACE_UNKNOWN = "place unknown";

// One advert's decision, in the legacy's order (builder/work-out.ts): the families, then hygiene,
// then a closed notice (closed adverts FR-3), then Europe.
export function decider(
  gate: CompiledGate,
  europe: ReadonlySet<string>,
): (advert: GateInput) => GateDecision {
  const classify = classifier(gate);
  return (advert) => {
    const { families, occupations, trade } = classify({
      title: advert.title,
      lang: advert.language,
      isco: advert.occupationCodes.isco,
      ssyk: advert.occupationCodes.ssyk,
    });
    if (families.length === 0) return { kept: false, reason: OUTSIDE_VERTICAL };
    const why = hygieneReason(advert);
    if (why) return { kept: false, reason: `${HYGIENE}: ${why}` };
    if (saysClosed(advert)) return { kept: false, reason: CLOSED };
    // A remote job (xx) or a country not stated (zz) is not outside Europe (the legacy's builder/work-out.ts).
    if (
      advert.country !== "xx" &&
      advert.country !== "zz" &&
      !europe.has(advert.country)
    )
      return { kept: false, reason: OUTSIDE_EUROPE };
    // ➤ Company boards are read the world over: an advert of theirs whose place names nothing
    // ➤ known is more often outside Europe than in it, and is left out, unless its title is written
    // ➤ for the German- or French-speaking market ("(m/w/d)", "(H/F)"): that one stays, its country
    // ➤ not stated (about 4,000 of the 61,552 left out on 11 October).
    // (The legacy's builder/work-out.ts `outsideEurope`, career sites FR-10. Its country not read is our "zz" for a place
    // that is not Europe as a whole, which says the office's country is not stated.)
    if (
      advert.board &&
      advert.country === NOT_STATED &&
      !saysEuropeOnly(advert.location ?? "") &&
      !markedFor(advert.title)
    )
      return { kept: false, reason: PLACE_UNKNOWN };
    return { kept: true, families, occupations, trade };
  };
}
