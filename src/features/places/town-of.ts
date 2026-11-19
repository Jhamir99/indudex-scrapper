import { fold } from "../../shared/kit/fold.js";
import { areaOf, type PlaceText } from "./areas.js";
import type { Gazetteer, Town } from "./gazetteer.js";
import { areaName, loose, saysArea } from "./names.js";
import {
  NOT_ALONE,
  behindCodes,
  byPlace,
  pieces,
  saintNames,
  withArticle,
  withTown,
  type ByPlace,
} from "./pieces.js";

export interface TownFound {
  readonly town: Town;
  // The words that named it, for how it is shown (FR-7).
  readonly said: string;
}

const FR_ARTICLES = ["La ", "Le ", "Les ", "L'"];
const FRENCH_SPEAKING = new Set(["fr", "be", "ch", "lu"]);

const unique = (towns: readonly Town[]) => [...new Set(towns)];
const ids = (towns: readonly Town[]) =>
  new Set(towns.map((town) => town.geonameId));
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// When more than one town has the name: the one nearest the town it is «bei» («Bornheim bei
// Landau» is not the Bornheim by Bonn, «Rohr bei Nürnberg» not Stuttgart's Rohr), or the one in
// the area it lies in («Mühlhausen in der Oberpfalz»); else none («Biberach im Kinzigtal» was
// Biberach an der Riß).
function nearestOf(
  found: readonly Town[],
  { word, near }: ByPlace,
  byName: ReadonlyMap<string, readonly Town[]>,
  areas: ReadonlyMap<string, string> | undefined,
): Town[] {
  if (/^b(?:ei|\.)$/u.test(word)) {
    const by = [near, near.split(/\s+/)[0] ?? ""]
      .map((name) => byName.get(fold(name)))
      .find(Boolean);
    const at = by?.toSorted((a, b) => b.population - a.population)[0];
    if (at) {
      const far = (town: Town) =>
        (town.latitude - at.latitude) ** 2 +
        ((town.longitude - at.longitude) *
          Math.cos((at.latitude * Math.PI) / 180)) **
          2;
      const nearest = found.toSorted((a, b) => far(a) - far(b))[0];
      return nearest ? [nearest] : [];
    }
  }
  const code = areas?.get(fold(near));
  const inside = code ? found.filter((town) => town.nuts.startsWith(code)) : [];
  return ids(inside).size === 1 ? inside : [];
}

// A letter a site sent broken («Z�rich», «D�bendorf (ZH)»: job7.ch, 244 published offers on
// 7 November 2026): the one town of that country with a name of those letters and, for each lost
// one, a letter outside plain ASCII, shown by that name («Br�gg» is Brügg, not Brugg).
function brokenLetters(
  piece: string,
  byName: ReadonlyMap<string, readonly Town[]>,
): TownFound | undefined {
  const lost = new RegExp(
    `^${piece.trim().split("�").map(escape).join("[^\\x00-\\x7F]")}$`,
    "iu",
  );
  const alike = unique([...byName.values()].flat()).filter((town) =>
    [town.name, ...town.otherNames].some((name) => lost.test(name)),
  );
  const [first] = alike;
  if (!first || new Set(alike.map((town) => fold(town.name))).size !== 1)
    return undefined;
  const said =
    [first.name, ...first.otherNames].find((name) => lost.test(name)) ??
    first.name;
  return { town: first, said };
}

// The town a place names, or null. The place's pieces are tried from the most precise, as
// addresses are written ("Terrassa, BARCELONA, ES" is Terrassa, in the province of Barcelona);
// the city the adapter gave comes last. Only towns of the advert's country count (FR-1).
export function townOf(
  gazetteer: Gazetteer,
  place: PlaceText,
): TownFound | null {
  const { country } = place;
  const byName = gazetteer.towns.get(country);
  if (!byName) return null;
  const knows = (key: string) => byName.has(key);
  const location =
    country === "es" ? withArticle(place.location, knows) : place.location;
  const whole = [...pieces(location), place.city]
    .filter(Boolean)
    .filter((piece) => !saysArea(piece));
  const areas = gazetteer.areas.get(country);

  // A region's hyphenated name is not cut into a town: «Baden» of Baden-Württemberg was
  // Baden-Baden, «Schleswig» of Schleswig-Holstein the town (1,218 published offers, 7 November 2026).
  const isArea = (piece: string) =>
    Boolean(
      areas &&
      (areas.has(fold(piece)) ||
        areas.has(loose(piece)) ||
        areas.has(fold(areaName(piece)))),
    );

  // A town with its county after it and no comma («Swindon Wiltshire», «Fareham Hampshire»: 269
  // published offers named one, 8 November 2026): the town before the area too, which must lie in
  // it. A county by its loose name too (Britain's counties are not NUTS's own names, NO1-10).
  const counties = gazetteer.looseAreas.get(country);
  const countyOf = (piece: string) =>
    (isArea(piece) &&
      (areas?.get(fold(piece)) || areas?.get(fold(areaName(piece))))) ||
    counties?.get(fold(areaName(piece))) ||
    "";
  // In Britain the county's part of the country, as counties and unitary authorities overlap
  // («Swindon Wiltshire»: UKK14 under Wiltshire's UKK15).
  const inCounty = new Map<string, string>();
  const lessArea = (piece: string): string[] => {
    const words = piece.split(/\s+/);
    for (let count = Math.min(3, words.length - 1); count > 0; count--) {
      const code = countyOf(words.slice(-count).join(" "));
      if (!code) continue;
      const town = words.slice(0, -count).join(" ");
      inCounty.set(town, country === "gb" ? code.slice(0, 3) : code);
      return [town];
    }
    return [];
  };

  const cuts = new Map<string, ByPlace>();
  const texts = whole
    .flatMap((piece) => {
      if (isArea(piece)) return [piece];
      const by = byPlace(piece);
      // Not a name the place gives whole too («Frankfurt am MainAnstellung», «Frankfurt»).
      if (by && !whole.some((other) => fold(other) === fold(by.town)))
        cuts.set(by.town, by);
      return [...withTown(piece), ...(by ? [by.town] : []), ...lessArea(piece)];
    })
    .concat(whole.flatMap((piece) => behindCodes(piece) ?? []));
  const all = fold(texts.join(" "));

  // A town must lie in the area the place names ("Salamanca, Spain" is the city, not Madrid's
  // district of that name; "San Isidro, Alicante" the one in Alicante).
  const area = areaOf(gazetteer, place);

  for (const piece of texts) {
    if (NOT_ALONE.has(fold(piece))) continue;
    let found: readonly Town[] | undefined =
      byName.get(fold(piece)) ?? byName.get(loose(piece));
    let said = piece;

    // A saint's name cut short («St Denis», «Ste Foy»): the towns of the name in full too, as only
    // some go by the short one in GeoNames. In German the saint is «Sankt» («St. Ulrich bei
    // Steyr»: 115 Austrian and German towns go by no short name).
    const full = saintNames(piece).flatMap((name) => byName.get(name) ?? []);
    if (full.length) found = unique([...(found ?? []), ...full]);

    // France Travail writes a commune without its article as often as with it («17 - Rochelle»):
    // a whole piece that is a town's own name after "La", "Le", "Les" or "L'" is that town. Not
    // the first word of a name («Val» of Val-d'Oise is no Laval), a département («Moselle»), nor
    // another name of a town («La Côte» is a name of La Rochelle). In French-speaking Belgium,
    // Switzerland and Luxembourg too («Bizet» is Le Bizet).
    if (
      !found &&
      FRENCH_SPEAKING.has(country) &&
      whole.includes(piece) &&
      !areas?.has(fold(areaName(piece)))
    ) {
      for (const article of FR_ARTICLES) {
        const name = loose(article + piece);
        const named = (byName.get(name) ?? []).filter(
          (town) => loose(town.name) === name,
        );
        if (named.length) {
          found = named;
          said = article + piece;
          break;
        }
      }
    }

    if (!found && piece.includes("�")) {
      const broken = brokenLetters(piece, byName);
      if (broken) {
        found = [broken.town];
        said = broken.said;
      }
    }
    if (!found) continue;

    // A town and the district around it may share a name (Leipzig: the city DED51, its Landkreis
    // DED52): then the town counts in the area the rest of the place names («Leipzig, Sachsen»),
    // or beside its namesake in the same region when the rest names none.
    if (area) {
      const inArea = found.filter((town) => town.nuts.startsWith(area));
      const beside = areaOf(gazetteer, place, piece) || area.slice(0, 4);
      const near = inArea.length
        ? inArea
        : found.filter((town) => town.nuts.startsWith(beside));
      // A British town under its historic county, which no longer holds it («Manchester,
      // Lancashire»: 43 published offers had no point, 8 November 2026): the town in the same
      // part of England.
      found =
        near.length || country !== "gb"
          ? near
          : found.filter((town) => town.nuts.startsWith(area.slice(0, 3)));
      if (!found.length) continue;
    }
    const county = inCounty.get(piece);
    if (county !== undefined) {
      found = found.filter((town) => town.nuts.startsWith(county));
      if (!found.length) continue;
    }
    const cut = cuts.get(piece);
    if (cut && ids(found).size > 1) {
      found = nearestOf(found, cut, byName, areas);
      if (!found.length) continue;
    }
    const inRegion = (town: Town) =>
      town.region && all.includes(fold(town.region)) ? 1 : 0;
    const town = found.toSorted(
      (a, b) => inRegion(b) - inRegion(a) || b.population - a.population,
    )[0];
    if (town) return { town, said };
  }
  return null;
}
