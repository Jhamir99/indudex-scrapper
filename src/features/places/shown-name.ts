import type { Town } from "./gazetteer.js";
import { loose } from "./names.js";

const accentsOf = (name: string) =>
  (name.normalize("NFD").match(/\p{M}/gu) ?? []).length +
  (name.match(/[ßøæœłđı]/giu) ?? []).length;

const inCapitals = (name: string) =>
  name === name.toUpperCase() && /\p{Lu}{2}/u.test(name) ? 1 : 0;

// GeoNames' own name when the advert wrote it, unless the advert gave it more accents («Valencia»
// stays, «Rīga» too); else, of GeoNames' other names and the advert's, the one with its accents and
// not in capitals: GeoNames lists bare-letter forms too, and the first that matched was «Munchen»
// for «München» on 4,234 published offers (10,048 towns lost their accents, 7 November 2026).
function spelling(said: string, town: Town): string {
  const key = loose(said);
  if (loose(town.name) === key)
    return accentsOf(said) > accentsOf(town.name) && !inCapitals(said)
      ? said
      : town.name;
  return (
    [...town.otherNames, said]
      .filter((name) => loose(name) === key)
      .toSorted(
        (a, b) => accentsOf(b) - accentsOf(a) || inCapitals(a) - inCapitals(b),
      )[0] ?? said
  );
}

// How the town is shown (FR-7): as the advert wrote it, in GeoNames' letters when it wrote the same
// name in capitals or without its accents, with a capital at the start, as a label begins (the map
// writes a Catalan or Balearic town's article small, «la Garriga», «sa Pobla»: 102 towns, NOB-17).
export function shownName(said: string, town: Town): string {
  return spelling(said, town).replace(/^\p{Ll}/u, (letter) =>
    letter.toUpperCase(),
  );
}
