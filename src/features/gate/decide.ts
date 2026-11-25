import { z } from "@hono/zod-openapi";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { classifier } from "./classifier.js";
import { saysClosed } from "./closed.js";
import type { CompiledGate } from "./compile.js";
import { hygieneReason } from "./hygiene.js";

// What the gate reads of a stored advert (FR-10); the description only for a closed notice near its top (closed
// adverts FR-1).
export type GateInput = Pick<
  StoredAdvert,
  "title" | "language" | "occupationCodes" | "country" | "url" | "description"
>;

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
    if (!europe.has(advert.country))
      return { kept: false, reason: OUTSIDE_EUROPE };
    return { kept: true, families, occupations, trade };
  };
}
