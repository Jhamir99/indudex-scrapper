import { z } from "@hono/zod-openapi";
import { fold } from "../../shared/kit/fold.js";
import { areaCode, areaOf, type PlaceText } from "./areas.js";
import type { Gazetteer } from "./gazetteer.js";
import { pieces } from "./pieces.js";
import { shownName } from "./shown-name.js";
import {
  FOR_A_CLIENT,
  labelledTowns,
  phraseTowns,
  postalTowns,
} from "./text-towns.js";
import { townOf, type TownFound } from "./town-of.js";

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

// The town the place itself names, known or not: the adapter's city, else the location's first
// piece that is not the country's own name (legacy placeOfAdvert's city). "" when it names only
// its country.
function namedTown(gazetteer: Gazetteer, place: PlaceText): string {
  const own = gazetteer.countryNames.get(place.country);
  return (
    [place.city, ...pieces(place.location)].find(
      (piece) => piece && !own?.has(fold(piece)),
    ) ?? ""
  );
}

// The town the text gives (FR-6), for a place that names no town, or names a region or province
// as its town («Bayern», «Limburg», «Île-de-France»: 8,061 published offers, 7 November 2026).
// Inside that region only: outside it, the legacy's hints were mostly a head office's or an
// agency's address (Roanne for missions in the Yvelines; 206 of 1,632 offers).
function townFromText(
  gazetteer: Gazetteer,
  place: PlaceText,
  input: PlaceInput,
): TownFound | null {
  const named = namedTown(gazetteer, place);
  const namesArea =
    named !== "" &&
    areaCode(gazetteer, place.country, named) !== "" &&
    !gazetteer.towns.get(place.country)?.has(fold(named));
  if (named && !namesArea) return null;
  const inside = named ? areaOf(gazetteer, place, "", true) : "";
  // An agency's text, or one that places staff with a client, gives only the job's own labels.
  const forOthers = input.agency || FOR_A_CLIENT.test(input.description);
  const candidates = new Set([
    ...labelledTowns(input.description, forOthers),
    ...(forOthers ? [] : postalTowns(input.description, place.country)),
    ...phraseTowns(
      atMost(input.title, FIELD_LIMITS.title),
      input.description,
      forOthers,
      place.country,
    ),
  ]);
  for (const candidate of candidates) {
    const found = townOf(gazetteer, {
      country: place.country,
      location: candidate,
      city: "",
    });
    if (found && (!inside || found.town.nuts.startsWith(inside))) return found;
  }
  return null;
}

export function placeAdvert(
  gazetteer: Gazetteer,
  input: PlaceInput,
): Placement {
  const place = {
    country: input.country,
    location: atMost(input.location, FIELD_LIMITS.location),
    city: atMost(input.city, FIELD_LIMITS.city),
  };
  const fromLocation = townOf(gazetteer, place);
  const found = fromLocation ?? townFromText(gazetteer, place, input);
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
    from: fromLocation ? "location" : "text",
  };
}
