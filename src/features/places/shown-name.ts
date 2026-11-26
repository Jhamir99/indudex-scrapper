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

// A town the map does not know, written in capitals throughout («L'ALDEA», «SCOTLAND»), in a name's letters: each word
// with its capital, its particles small («Seu d'Urgell», «Bad Soden am Taunus»), a code of two letters as written (the
// legacy's 21dd1a49).
const SMALL_WORD =
  /^(?:de|del|dels|della|di|da|do|dos|das|du|des|la|las|los|les|el|els|lo|le|y|i|e|et|en|sur|sous|am|an|der|den|im|bei|ob|upon|on|of|the|and|van|von|op|aan|ter|ten|het|nad|pod)$/u;
const capital = (word: string) =>
  word.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
const nameWord = (word: string, first: boolean): string => {
  const low = word.toLowerCase();
  if (word.length <= 2 && !SMALL_WORD.test(low)) return word;
  if (!first && SMALL_WORD.test(low)) return low;
  const [, elided = "", rest = ""] = /^(\p{L}{1,2}['’])?(.*)$/u.exec(low) ?? [];
  return (first ? capital(elided) : elided) + capital(rest);
};
export const inNameLetters = (town: string): string =>
  inCapitals(town)
    ? town.replace(/[^\s-]+/gu, (word, at: number) => nameWord(word, at === 0))
    : town;

// How the town is shown (FR-7): as the advert wrote it, in GeoNames' letters when it wrote the same
// name in capitals or without its accents, with a capital at the start, as a label begins (the map
// writes a Catalan or Balearic town's article small, «la Garriga», «sa Pobla»: 102 towns, NOB-17).
export function shownName(said: string, town: Town): string {
  return spelling(said, town).replace(/^\p{Ll}/u, (letter) =>
    letter.toUpperCase(),
  );
}
