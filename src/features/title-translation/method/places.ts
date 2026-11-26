// Towns a title names besides the offer's own, to keep as written in every language (his rule: towns are
// untranslated proper names). A town of 15,000 people or more (GeoNames, the site's list of places, under any of
// its names: "Köln", "München", "Gent") counts when the title says where with it: after "in", "à", "bei",
// "regio" and the like, or closing the title or a part of it ("Lagerhelfer Essen", "Monteur Singen - befristet").
// Not with more words behind ("Fahrer – Essen auf Rädern"), nor as the end of a longer name ("Huis ter Heide").
// The legacy's builder/mt/places.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { readFileSync } from "fs";

const PLACES_FILE = new URL(
  "../../../../catalogues/codes/places.json",
  import.meta.url,
);
// ➤ Names of towns that titles also use as words ("Vannes" are valves, "Leer" is to learn, "Neubau" a new build).
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
  // ➤ Job words that are also a district or the head of a Spanish town's name («Jefe de Ventas», «Ingeniero de
  // ➤ Campo» from Campo de Criptana, «Operario de Línea», «Comercial Zona Norte», «Chef de Quart»).
  "ventas",
  "campo",
  "linea",
  "corte",
  "norte",
  "sur",
  "este",
  "torre",
  "puerto",
  "valle",
  "villa",
  "medina",
  "puente",
  "playa",
  "distrito",
  "estacion",
  "ciudad",
  "casas",
  "universidad",
  "gran",
  "mestre",
  "quart",
  "auch",
  "district",
  "fleet",
  "care",
  "brake",
  "heide",
]); // ➤ «Full Time», «starting in March» (TB2-09)
const CUE =
  /(?:^|[\s(])(?:in|im|bei|nahe|near|à|en|a|bij|nabij|regio|région|region|raum|großraum|grossraum|gebiet|omgeving|secteur|zone|zona|comarca|area|área|standort|locatie|location|près\s+de)\s+$/iu;
const JOINED = /\s(?:ter|ten|aan|op|den|der|am|an)\s+$/iu;
// ➤ A hyphen right after the name joins a word ("Forst- und Gartentechnik"), one with spaces separates.
const AFTER_ALONE = /^(?:\s*(?:$|[)|,/–(])|\s+-\s)/u;
// ➤ A town opening the title, then a colon or a dash: where the job is ("München: FachplanerIn …", "Köln – Elektriker").
const OPENING = /^\s*(?::|[–|]|-\s)/u;
// ➤ After the name, at the end: a district's number («Paris 15e», «Lyon 7e»), a quarter of it («Madrid Norte») or its
// ➤ surroundings («Rubí y alrededores»).
const LAST =
  /^[\s).,!]*(?:\d[\d\s]*(?:e|er|ème|eme)?|\s(?:norte|sur|centro|nord|sud|centre)|\s(?:y|i|et)\s+(?:alrededores|rodalies|voltants|environs))?[\s).,!]*$/iu;

// ➤ Catalonia's comarques and the areas titles name like a town («Electricista Vallès Occidental», which came back
// ➤ «Western Vallès»), also as Spanish writes them. Not «Selva», a word too.
const COMARQUES = [
  "Alt Camp",
  "Alt Empordà",
  "Alt Penedès",
  "Alt Urgell",
  "Alta Ribagorça",
  "Anoia",
  "Bages",
  "Baix Camp",
  "Baix Ebre",
  "Baix Empordà",
  "Baix Llobregat",
  "Baix Penedès",
  "Barcelonès",
  "Berguedà",
  "Cerdanya",
  "Conca de Barberà",
  "Garraf",
  "Garrigues",
  "Garrotxa",
  "Gironès",
  "Lluçanès",
  "Maresme",
  "Moianès",
  "Montsià",
  "Noguera",
  "Osona",
  "Pallars Jussà",
  "Pallars Sobirà",
  "Pla d'Urgell",
  "Pla de l'Estany",
  "Priorat",
  "Ribera d'Ebre",
  "Ripollès",
  "Segarra",
  "Segrià",
  "Solsonès",
  "Tarragonès",
  "Terra Alta",
  "Urgell",
  "Val d'Aran",
  "Vallès Occidental",
  "Vallès Oriental",
  "Vallès",
  "Penedès",
  "Empordà",
  "Vallés Occidental",
  "Vallés Oriental",
  "Vallés",
  "Bajo Llobregat",
  "Alto Penedés",
  "Bajo Penedés",
  "Ampurdán",
];
// ➤ A row of the list: id, name, country, …, population, …, its names in the visitors' languages.
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
// ➤ The «'s-» of Dutch towns («'s-Hertogenbosch»): before the capital, so the name is found under the word after it.
const GENITIVE = /^['’]s-/u;
const withoutGenitive = (n: string) => n.replace(GENITIVE, "");
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
  for (const name of COMARQUES) {
    const k = name.split(/[\s-]/)[0];
    byFirst.set(k, (byFirst.get(k) || new Set()).add(name));
    towns.add(plain(name));
  }
  for (const [, name, cc, , , , pop, , local] of places) {
    if (pop < 15000) continue;
    // ➤ In Spain, a three-letter town (Vic) and the short name a town goes by («Sant Boi», «Cornellà», «Santa Coloma»): 24
    // ➤ Catalan towns of 15,000 people or more were not seen (TB2-11).
    const short =
      cc === "es"
        ? [name, ...(local || [])]
            .map((n) => n.split(/\s+(?:de|del|d['’]|de la|de les)\s+/)[0])
            .filter((n) => n.length >= 5)
        : [];
    for (const n of new Set([name, ...(local || []), ...short])) {
      if (
        n.length < (cc === "es" ? 3 : 4) ||
        !/^(?:['’]s-)?\p{Lu}[\p{Script=Latin}\s'’.()-]+$/u.test(n) ||
        NOT_A_PLACE.has(plain(n))
      )
        continue;
      const k = withoutGenitive(n).split(/[\s-]/)[0];
      let named = byFirst.get(k);
      if (!named) byFirst.set(k, (named = new Set()));
      named.add(n);
      towns.add(plain(n));
    }
  }
  return { byFirst, towns };
}
const loaded = () => (index ??= load());

// ➤ Whether a word, accents and capitals aside, is the name of a town of 15,000 people or more («berlin», «łodz»).
export function isTown(word: unknown): boolean {
  return loaded().towns.has(plain(String(word || "")));
}

// ➤ The other names of a town, to write it back where Firefox renamed it: GeoNames' name and its names in the
// ➤ languages visitors write in, of every place that goes by it ("Wien" → "Vienna", "Viena", "Vienne", "Wenen"),
// ➤ and German letters written out ("Meißen" → "Meissen").
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
  // ➤ Catalan names with a middle dot, which the list lacks.
  for (const o of [town, ...out]) {
    if (CATALAN_DOT[o]) out.add(CATALAN_DOT[o]);
    if (CATALAN[o]) out.add(CATALAN[o]);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

// ➤ The town written back where the output has one of its other names instead ("Electrician in Munich" →
// ➤ "Electrician in München"); accents do not count ("Malaga" is Málaga's).
const fold = (t: string) =>
  t
    .split("")
    .map((c) => {
      const d = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      return d.length === 1 ? d : c;
    })
    .join("");
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// ➤ The Catalan middle dot inside a word ("Brussel·les" came back "Brussels·les").
const asWord = (t: string, flags: string) =>
  new RegExp("(^|[^\\p{L}\\p{N}·])(" + esc(t) + ")(?![\\p{L}\\p{N}·])", flags);
const CATALAN_DOT: Record<string, string> = {
  Brussel: "Brussel·les",
  Brussels: "Brussel·les",
  Bruxelles: "Brussel·les",
};
// ➤ Catalan names of towns the list lacks, which Firefox writes into Catalan («Lió», «Niça», «Nàpols», «Munic»: the
// ➤ published titles of 8 November 2026).
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
// ➤ A town's article already said in the word before it («al Vendrell», «del Prat de Llobregat», «dels Pallaresos»):
// ➤ writing the whole name over the rest gave «al El Vendrell», then «a l'El Vendrell».
const JOINED_ARTICLE: Record<string, RegExp> = {
  el: /(?:^|[^\p{L}])(?:al|del|pel)\s+$/iu,
  els: /(?:^|[^\p{L}])(?:als|dels|pels)\s+$/iu,
};
function articleJoined(town: string, written: string, before: string): boolean {
  const [, article, rest] = town.match(/^(Els?)\s+(.+)$/u) || [];
  return (
    !!article &&
    fold(written) === fold(rest) &&
    JOINED_ARTICLE[article.toLowerCase()].test(before)
  );
}
// ➤ A town of several words spelled out ("Lindenberg in the Allgäu", "Garching near Munich"): first and last word
// ➤ with up to three words between, the last also under its other names. Where it stands: [start, end], or null.
function spelledOut(out: string, town: string): [number, number] | null {
  const words = town.split(/\s+/);
  if (words.length < 3) return null;
  const last = words[words.length - 1],
    firstWord = esc(fold(words[0]));
  for (const l of [last, ...otherNames(last)]) {
    const m = fold(out).match(
      new RegExp(
        "(^|[^\\p{L}\\p{N}])(" +
          firstWord +
          "(?:\\s+[\\p{L}'’.-]+){0,3}?\\s+" +
          esc(fold(l)) +
          ")(?![\\p{L}\\p{N}])",
        "u",
      ),
    );
    if (m)
      return [
        (m.index ?? 0) + m[1].length,
        (m.index ?? 0) + m[1].length + m[2].length,
      ];
  }
  return null;
}
// ➤ An article the output writes before a town whose name opens with its own («a la Corunya» for «La Coruña»): the
// ➤ name brings it, so writing it over the rest alone gave «a la La Coruña».
const OWN_ARTICLE = /^(?:El|La|Els|Les|Los|Las|Le|The|A|O|Den|De|Het)\s/u;
const ARTICLE_BEFORE = /(?:^|\s)(?:el|la|els|les|los|las|le|the|l['’])\s*$/iu;
// ➤ Each town written once, at a place no other town of the title holds: a title naming two forms of one town
// ➤ («Lleida/Lérida», which came back «Lleida/Lleida») gets each back in its own slot.
export function townsBack(
  out: string,
  alts: Record<string, string[]> | null | undefined,
): string {
  const held: [number, number][] = [];
  const free = (at: number, end: number) =>
    !held.some(([a, b]) => at < b && end > a);
  const put = (at: number, end: number, text: string) => {
    out = out.slice(0, at) + text + out.slice(end);
    const shift = text.length - (end - at);
    for (const h of held)
      if (h[0] >= end) {
        h[0] += shift;
        h[1] += shift;
      }
    held.push([at, at + text.length]);
  };
  const find = (name: string, flags: string, text = out) =>
    [...text.matchAll(asWord(name, flags + "g"))]
      .map((m) => [(m.index ?? 0) + m[1].length, m[2]] as const)
      .find(([at, w]) => free(at, at + w.length));
  for (const [town, others] of Object.entries(alts || {})) {
    const as = find(town, "iu");
    if (as) {
      held.push([as[0], as[0] + as[1].length]);
      continue;
    }
    const span = spelledOut(out, town);
    if (span) {
      put(span[0], span[1], town);
      continue;
    }
    for (const o of [town, ...others]) {
      const m = find(fold(o), "u", fold(out));
      if (!m) continue;
      let [at] = m;
      const before = out.slice(0, at);
      if (articleJoined(town, o, before)) break;
      if (OWN_ARTICLE.test(town))
        at -= before.match(ARTICLE_BEFORE)?.[0].trimStart().length ?? 0;
      // ➤ A bracket of the name («Frankfurt (Oder)») replaces the one Firefox translated after it («Frankfurt (Or)»).
      const bracket = town.endsWith(")")
        ? (out.slice(m[0] + m[1].length).match(/^\s*\([^)]*\)/u)?.[0].length ??
          0)
        : 0;
      put(at, m[0] + m[1].length + bracket, town);
      break;
    }
  }
  return out;
}

export function placesIn(text: string): string[] {
  const { byFirst } = loaded();
  const found: string[] = [];
  // ➤ Where the last town found ends: a word inside its name («Saale» of «Halle (Saale)») is not another.
  let end = 0;
  for (const m of text.matchAll(/(?<![\p{L}\d])\p{Lu}[\p{L}'’.-]*/gu)) {
    if (m.index < end) continue;
    const options = [...(byFirst.get(m[0].split("-")[0]) || [])].sort(
      (a, b) => b.length - a.length,
    );
    for (const n of options) {
      const start = m.index - (n.length - withoutGenitive(n).length);
      const after = text.slice(start + n.length);
      if (start < 0 || !text.startsWith(n, start) || /^[\p{L}\d]/u.test(after))
        continue;
      const before = text.slice(0, start);
      if (
        CUE.test(before) ||
        (before.trim() &&
          !JOINED.test(before) &&
          (AFTER_ALONE.test(after) || LAST.test(after))) ||
        (!before.trim() && OPENING.test(after))
      ) {
        found.push(n);
        end = start + n.length;
      }
      break;
    }
  }
  return [...new Set(found)];
}
