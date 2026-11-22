// Legacy builder/mt/places.ts (JustJans/indudex@b0cd182), word for word but for lint and paths.
// Towns a title names besides the offer's own, to keep as written in every language (his rule: towns are
// untranslated proper names). A town of 15,000 people or more (GeoNames, the site's list of places, under any of
// its names: "Köln", "München", "Gent") counts when the title says where with it: after "in", "à", "bei",
// "regio" and the like, or closing the title or a part of it ("Lagerhelfer Essen", "Monteur Singen - befristet").
// Not with more words behind ("Fahrer – Essen auf Rädern"), nor as the end of a longer name ("Huis ter Heide").
import { readFileSync } from "node:fs";

// GeoNames' places, the processor's catalogue (catalogues/codes/places.json, the legacy's rows).
const PLACES_FILE = new URL(
  "../../../../catalogues/codes/places.json",
  import.meta.url,
);
// Names of towns that titles also use as words ("Vannes" are valves, "Leer" is to learn, "Neubau" a new build).
const NOT_A_PLACE = new Set([
  "vannes",
  "avion",
  "sens",
  "croix",
  "mobile",
  "reading",
  "leer",
  "bron",
  "neubau",
  "boden",
  "norden",
  "mitte",
  "alta",
  "baja",
  "onda",
  "lage",
  "centro",
  "centre",
  "zentrum",
  "centrum",
  "ware",
  "gare",
  "koper",
  "noord",
  "zuid",
  "oost",
  "west",
  "tarde",
  "justicia",
  "time",
  "march",
  "zona",
  "medias",
]); // «Full Time», «starting in March» (TB2-09)
const CUE =
  /(?:^|[\s(])(?:in|im|bei|nahe|near|à|en|a|bij|nabij|regio|région|region|raum|großraum|grossraum|gebiet|omgeving|secteur|zone|zona|comarca|area|área|standort|locatie|location|près\s+de)\s+$/iu;
const JOINED = /\s(?:ter|ten|aan|op|den|der|am|an)\s+$/iu;
// A hyphen right after the name joins a word ("Forst- und Gartentechnik"), one with spaces separates.
const AFTER_ALONE = /^(?:\s*(?:$|[)|,/–(])|\s+-\s)/u;
// A town opening the title, then a colon or a dash: where the job is ("München: FachplanerIn …", "Köln – Elektriker").
const OPENING = /^\s*(?::|[–|]|-\s)/u;
const LAST = /^[\s).,!]*(?:\d[\d\s]*)?[\s).,!]*$/u;

// A row of the list: id, name, country, …, population, …, its names in the visitors' languages.
type PlaceRow = [
  unknown,
  string,
  string,
  unknown,
  unknown,
  unknown,
  number,
  unknown,
  string[] | undefined,
];
const readPlaces = (): PlaceRow[] =>
  JSON.parse(readFileSync(PLACES_FILE, "utf8")).places;
type Index = { byFirst: Map<string, Set<string>>; towns: Set<string> };
let index: Index | null = null;
const plain = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function load(): Index {
  const byFirst = new Map<string, Set<string>>(),
    towns = new Set<string>();
  let places: PlaceRow[] = [];
  try {
    places = readPlaces();
  } catch {
    /* without the list, no towns */
  }
  for (const [, name, cc, , , , pop, , local] of places) {
    if (pop < 15000) continue;
    // In Spain, a three-letter town (Vic) and the short name a town goes by («Sant Boi», «Cornellà», «Santa Coloma»): 24
    // Catalan towns of 15,000 people or more were not seen (TB2-11).
    const short =
      cc === "es"
        ? [name, ...(local || [])]
            .map((n) => n.split(/\s+(?:de|del|d['’]|de la|de les)\s+/)[0])
            .filter((n) => n.length >= 5)
        : [];
    for (const n of new Set([name, ...(local || []), ...short])) {
      if (
        n.length < (cc === "es" ? 3 : 4) ||
        !/^\p{Lu}[\p{Script=Latin}\s'’.-]+$/u.test(n) ||
        NOT_A_PLACE.has(plain(n))
      )
        continue;
      const k = n.split(/[\s-]/)[0];
      let named = byFirst.get(k);
      if (!named) byFirst.set(k, (named = new Set()));
      named.add(n);
      towns.add(plain(n));
    }
  }
  return { byFirst, towns };
}
const loaded = () => (index ??= load());

// Whether a word, accents and capitals aside, is the name of a town of 15,000 people or more («berlin», «łodz»).
export function isTown(word: unknown): boolean {
  return loaded().towns.has(plain(String(word || "")));
}

// The other names of a town, to write it back where Firefox renamed it: GeoNames' name and its names in the
// languages visitors write in, of every place that goes by it ("Wien" → "Vienna", "Viena", "Vienne", "Wenen"),
// and German letters written out ("Meißen" → "Meissen").
let byName: Map<string, Set<string>> | null = null;
export function otherNames(town: string): string[] {
  if (!byName) {
    byName = new Map();
    let places: PlaceRow[] = [];
    try {
      places = readPlaces();
    } catch {
      /* without the list, none */
    }
    for (const [, name, , , , , , , local] of places) {
      const all = [...new Set([name, ...(local || [])])];
      for (const n of all) {
        let names = byName.get(n);
        if (!names) byName.set(n, (names = new Set()));
        for (const o of all) names.add(o);
      }
    }
  }
  const out = new Set<string>();
  for (const o of byName.get(town) || [])
    if (
      o !== town &&
      o.length > 3 &&
      /^\p{Lu}[\p{Script=Latin}\s'’.-]+$/u.test(o)
    )
      out.add(o);
  const spelled = town
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue");
  if (spelled !== town) out.add(spelled);
  // Catalan names with a middle dot, which the list lacks.
  for (const o of [town, ...out]) {
    if (CATALAN_DOT[o]) out.add(CATALAN_DOT[o]);
    if (CATALAN[o]) out.add(CATALAN[o]);
  }
  return [...out].toSorted((a, b) => b.length - a.length);
}

// The town written back where the output has one of its other names instead ("Electrician in Munich" →
// "Electrician in München"); accents do not count ("Malaga" is Málaga's).
const fold = (t: string) =>
  t
    .split("")
    .map((c) => {
      const d = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      return d.length === 1 ? d : c;
    })
    .join("");
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// The Catalan middle dot inside a word ("Brussel·les" came back "Brussels·les").
const asWord = (t: string, flags: string) =>
  new RegExp("(^|[^\\p{L}\\p{N}·])(" + esc(t) + ")(?![\\p{L}\\p{N}·])", flags);
const CATALAN_DOT: Record<string, string> = {
  Brussel: "Brussel·les",
  Brussels: "Brussel·les",
  Bruxelles: "Brussel·les",
};
// Catalan names of towns the list lacks, which Firefox writes into Catalan («Lió», «Niça», «Nàpols», «Munic»: the
// published titles of 8 November 2026).
const CATALAN: Record<string, string> = {
  Lyon: "Lió",
  Nice: "Niça",
  Toulon: "Tolló",
  Napoli: "Nàpols",
  München: "Munic",
  Genève: "Ginebra",
  Köln: "Colònia",
  Antwerpen: "Anvers",
  Gent: "Gant",
  Liège: "Lieja",
  "Den Haag": "L'Haia",
  Warszawa: "Varsòvia",
  Kraków: "Cracòvia",
  København: "Copenhaguen",
  Stockholm: "Estocolm",
  Göteborg: "Gotemburg",
  Marseille: "Marsella",
  Bordeaux: "Bordeus",
  Toulouse: "Tolosa",
  Strasbourg: "Estrasburg",
  Aachen: "Aquisgrà",
  Frankfurt: "Francfort",
  Wien: "Viena",
  Edinburgh: "Edimburg",
  Zürich: "Zuric",
  Basel: "Basilea",
  Luzern: "Lucerna",
  Bern: "Berna",
  Milano: "Milà",
  Torino: "Torí",
  Firenze: "Florència",
  Venezia: "Venècia",
  Praha: "Praga",
  London: "Londres",
};
export function townsBack(
  out: string,
  alts: Record<string, string[]> | null | undefined,
): string {
  for (const [town, others] of Object.entries(alts || {})) {
    if (asWord(town, "iu").test(out)) continue;
    // A town of several words spelled out ("Lindenberg in the Allgäu", "Garching near Munich"): first and last
    // word with up to three words between, the last also under its other names.
    const words = town.split(/\s+/);
    if (words.length > 2) {
      const last = words[words.length - 1],
        firstWord = esc(fold(words[0]));
      const span = [last, ...otherNames(last)]
        .map((l) =>
          fold(out).match(
            new RegExp(
              "(^|[^\\p{L}\\p{N}])(" +
                firstWord +
                "(?:\\s+[\\p{L}'’.-]+){0,3}?\\s+" +
                esc(fold(l)) +
                ")(?![\\p{L}\\p{N}])",
              "u",
            ),
          ),
        )
        .find(Boolean);
      if (span) {
        const at = (span.index ?? 0) + span[1].length;
        out = out.slice(0, at) + town + out.slice(at + span[2].length);
        continue;
      }
    }
    for (const o of [town, ...others]) {
      const m = fold(out).match(asWord(fold(o), "u"));
      if (!m) continue;
      const at = (m.index ?? 0) + m[1].length;
      out = out.slice(0, at) + town + out.slice(at + m[2].length);
      break;
    }
  }
  return out;
}

export function placesIn(text: string): string[] {
  const { byFirst } = loaded();
  const found: string[] = [];
  for (const m of text.matchAll(/(?<![\p{L}\d])\p{Lu}[\p{L}'’.-]*/gu)) {
    const options = [...(byFirst.get(m[0].split("-")[0]) || [])].toSorted(
      (a, b) => b.length - a.length,
    );
    for (const n of options) {
      const after = text.slice(m.index + n.length);
      if (!text.startsWith(n, m.index) || /^[\p{L}\d]/u.test(after)) continue;
      const before = text.slice(0, m.index);
      if (
        CUE.test(before) ||
        (before.trim() &&
          !JOINED.test(before) &&
          (AFTER_ALONE.test(after) || LAST.test(after))) ||
        (!before.trim() && OPENING.test(after))
      )
        found.push(n);
      break;
    }
  }
  return [...new Set(found)];
}
