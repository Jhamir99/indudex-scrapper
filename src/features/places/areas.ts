import { fold } from "../../shared/kit/fold.js";
import type { Gazetteer } from "./gazetteer.js";
import { areaName, loose } from "./names.js";
import { pieces } from "./pieces.js";

// What a place is read from: the adapter's location and city, in its country (FR-1).
export interface PlaceText {
  readonly country: string;
  readonly location: string;
  readonly city: string;
}

// The NUTS code of the region or province a name is, by any of its names, with or without its
// word for a province; "" when it is none.
export function areaCode(
  gazetteer: Gazetteer,
  country: string,
  name: string,
): string {
  const bare = fold(areaName(name));
  return (
    gazetteer.areas.get(country)?.get(fold(name)) ||
    gazetteer.areas.get(country)?.get(bare) ||
    gazetteer.looseAreas.get(country)?.get(bare) ||
    ""
  );
}

// The region or province a place names, as a NUTS code: the most precise of those it names when
// they nest ("Terrassa, Barcelona, Catalonia" is ES511), none when they do not ("Madrid,
// Barcelona": two places, no area); "" when it names none. `skip`: a piece left out, the town's
// own name. `withLoose`: by the loose names too, where NUTS's own names give none, so a town
// named as a county («Manchester, Lancashire») does not undo the area its place states.
export function areaOf(
  gazetteer: Gazetteer,
  place: PlaceText,
  skip = "",
  withLoose = false,
): string {
  const names = gazetteer.areas.get(place.country) ?? new Map<string, string>();
  const more = withLoose ? gazetteer.looseAreas.get(place.country) : undefined;
  if (!names.size && !more) return "";
  const left = skip && fold(areaName(skip));
  const named = [...pieces(place.location), place.city].filter(
    (piece) => piece && fold(areaName(piece)) !== left,
  );
  const nested = (byName: ReadonlyMap<string, string>, isLoose: boolean) => {
    const found = named
      .map(
        (piece) =>
          byName.get(fold(areaName(piece))) ||
          (isLoose ? byName.get(loose(areaName(piece))) : undefined) ||
          "",
      )
      .filter(Boolean);
    const codes = [...new Set(found)].toSorted((a, b) => b.length - a.length);
    const [mostPrecise] = codes;
    if (mostPrecise && codes.every((code) => mostPrecise.startsWith(code)))
      return mostPrecise;
    // Loose names that disagree: the first the place gives («Bedfordshire, South East»:
    // Bedfordshire, which the South East does not hold). NUTS's own names that disagree name none.
    return isLoose ? (found[0] ?? "") : "";
  };
  const strict = nested(names, false);
  if (strict || !more) return strict;
  if (named.some((piece) => names.has(fold(areaName(piece))))) return strict;
  return nested(more, true);
}
