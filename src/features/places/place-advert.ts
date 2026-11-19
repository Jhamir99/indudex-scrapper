import { z } from "@hono/zod-openapi";
import { areaOf } from "./areas.js";
import type { Gazetteer } from "./gazetteer.js";
import { shownName } from "./shown-name.js";
import { townOf } from "./town-of.js";

// What places reads of an advert (FR-9): the stored advert's fields, and whether it comes from a
// recruitment agency (companies' finding, false until that step exists).
export interface PlaceInput {
  readonly country: string;
  readonly location: string;
  readonly city: string;
  readonly title: string;
  readonly description: string;
  readonly agency: boolean;
}

export const Placement = z.strictObject({
  town: z
    .strictObject({
      geonameId: z.int().positive(),
      // As the advert wrote it (FR-7).
      name: z.string().min(1),
      // Two decimals: about a kilometre.
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .nullable(),
  // The town's NUTS 3 code, or the region or province the place names (FR-5).
  nuts: z
    .string()
    .regex(/^[A-Z]{2}[A-Z0-9]{0,3}$/)
    .nullable(),
  // What placed it: the location, the text (FR-6), an area alone, or nothing.
  from: z.enum(["location", "text", "area"]).nullable(),
});
export type Placement = z.infer<typeof Placement>;

// How long a field is read: a broken or hostile page's run of thousands of letters held the
// legacy's patterns for seconds (NOB-11), and a place may list a campaign's towns. Cut at a word.
export const FIELD_LIMITS = { location: 2000, city: 300, title: 500 } as const;

export function atMost(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return cut.replace(/\s+\S*$/u, "") || cut;
}

const round = (degrees: number) => Math.round(degrees * 100) / 100;

export function placeAdvert(
  gazetteer: Gazetteer,
  input: PlaceInput,
): Placement {
  const place = {
    country: input.country,
    location: atMost(input.location, FIELD_LIMITS.location),
    city: atMost(input.city, FIELD_LIMITS.city),
  };
  const found = townOf(gazetteer, place);
  if (!found) {
    // A place that names a region or a province but no town we know is in that area all the same.
    const area = areaOf(gazetteer, place, "", true);
    return area
      ? { town: null, nuts: area, from: "area" }
      : { town: null, nuts: null, from: null };
  }
  const { town, said } = found;
  return {
    town: {
      geonameId: town.geonameId,
      name: shownName(said, town),
      latitude: round(town.latitude),
      longitude: round(town.longitude),
    },
    nuts: town.nuts || null,
    from: "location",
  };
}
