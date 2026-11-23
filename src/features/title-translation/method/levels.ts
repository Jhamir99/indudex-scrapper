// Legacy builder/mt/levels.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// The levels a title names (junior, senior, lead…), taken out before Firefox and said again in the target language
// after it (builder/mt/method.mjs).
import { vocab } from "../data.js";
import { VOCABS } from "./method-tables.js";
import { escape } from "./patterns.js";

// After Firefox: the names put back (a second pass that did not keep them leaves the title as written),
// what the translation adds removed, "X / X" said once, the known slips corrected, the capital and
// emojis of the title given back.
export const ADDED =
  /\s*\((?:englisch|english|anglès|anglais|inglés|engels|deutsche ausgabe|deutsch|in english|angol nyelven)\)/gi;
export const STRONG = /\s[-–—|]\s|[,;:()[\]|]/g;
// Levels Firefox ties to the wrong noun or reads wrong, taken out of the title and said in front of the
// English: "Ingénieur Structure confirmé" → "Engineer – Experienced structure" → "Experienced Engineer –
// Structure"; "Aide Plombier" → "Help Plumber" → "Assistant Plumber". The order is the English order.
const W = "(?<![\\p{L}])",
  E = "(?![\\p{L}])";
// A grade's number: with its sign, glued to the next word or not («1ª», «1.ª», «1ªMECÁNICO»), with a word's ending
// («1a», «1ra», «2da»), or in words («primera»).
const ordinal = (n: string, endings: string, words: string) =>
  `(?:${n}\\s*\\.?\\s*[ªº°]|${n}\\s*(?:${endings})?${E}|(?:${words})${E})`;
const LEVELS: (readonly [readonly string[], RegExp, string])[] = [
  [
    ["fr"],
    new RegExp(
      "\\s*(?:[–-]\\s*)?\\(?" +
        W +
        "(?:confirm|expériment|experiment)[ée]e?s?" +
        E +
        "\\)?",
      "giu",
    ),
    "Experienced",
  ],
  [
    ["fr"],
    new RegExp("\\s*\\(?" + W + "débutante?s?" + E + "\\)?", "giu"),
    "Junior",
  ],
  [
    ["fr", "es", "ca"],
    new RegExp(
      "(?<=\\S\\s+)(?:[–-]\\s*)?\\(?" + W + "junior" + E + "\\)?",
      "giu",
    ),
    "Junior",
  ],
  [
    ["fr", "es", "ca"],
    new RegExp(
      "(?<=\\S\\s+)(?:[–-]\\s*)?\\(?" + W + "senior" + E + "\\)?",
      "giu",
    ),
    "Senior",
  ],
  [
    ["fr"],
    new RegExp("\\s*\\(?" + W + "polyvalente?s?" + E + "\\)?", "giu"),
    "Multi-skilled",
  ],
  [
    ["fr"],
    new RegExp("\\s*\\(?" + W + "itin[ée]rante?s?" + E + "\\)?", "giu"),
    "Itinerant",
  ],
  [
    ["es"],
    new RegExp("\\s*\\(?" + W + "itinerantes?" + E + "\\)?", "giu"),
    "Itinerant",
  ],
  // Flemish "op verplaatsing": travelling to the customers' sites ("Monteur op verplaatsing" → "on displacement").
  [
    ["nl"],
    new RegExp(
      "\\s*(?:[–|-]\\s*)?\\(?" + W + "op\\s+verplaatsing" + E + "\\)?",
      "giu",
    ),
    "Itinerant",
  ],
  [
    ["ca"],
    new RegExp("\\s*\\(?" + W + "itinerants?" + E + "\\)?", "giu"),
    "Itinerant",
  ],
  [["fr"], /^\s*aide\s+(?=\p{L})/iu, "Assistant"],
  // An Austrian or Swiss apprenticeship opening the title («Lehre Gleisbautechniker», «Lehrstelle Automobil-
  // Mechatroniker»): Firefox made it a thing of the trade («Técnico de construcción de vías de aprendizaje»).
  [
    ["de"],
    /^\s*(?:lehre|lehrstellen?|lehrlinge?)(?:\s+(?:als|zum|zur|zu)\s+|\s*[:–-]\s*|\s+)(?=\p{L})/iu,
    "Apprentice",
  ],
  [
    ["nl"],
    new RegExp("\\s*" + W + "all[ -]?round" + E, "giu"),
    "Multi-skilled",
  ],
  [["nl"], new RegExp("\\s*" + W + "polyvalente?" + E, "giu"), "Multi-skilled"],
  [
    ["es", "ca"],
    new RegExp("\\s*" + W + "polivalent(?:e|s|es)?" + E, "giu"),
    "Multi-skilled",
  ],
  // Dutch "Eerste" or "1e" opening a title: the lead of the trade ("Eerste Autotechnicus" came back "First Car
  // mechanic"); not "1e lijns" (first-line), nor "1e of 2e"; not after a dash, where the second leg read the English
  // word as a verb ("Vakgarage Alblas - Lidero mecánico de automóviles").
  [
    ["nl"],
    /^\s*(?:vacature\s+)?(?:eerste|1e|1ste)\s+(?=\p{L})(?!(?:lijns?|hulp|kamer|of|en)(?![\p{L}]))/iu,
    "Lead",
  ],
  // Two levels for one post said as one ("Frontend Developer (Medior / Senior)" came back "(/ Senior)").
  [
    ["nl"],
    new RegExp(
      "\\s*\\(?" + W + "medior(?:\\s*\\/\\s*|\\s+)senior" + E + "\\)?",
      "giu",
    ),
    "Mid-level/Senior",
  ],
  [
    ["nl"],
    new RegExp("\\s*\\(?" + W + "junior\\s*\\/\\s*medior" + E + "\\)?", "giu"),
    "Junior/Mid-level",
  ],
  [["nl"], new RegExp("\\s*" + W + "medior" + E, "giu"), "Mid-level"],
  // A trade's grade in Spain, «oficial de 1ª» to «3ª» («oficial de primera»): Firefox read an officer («OFFICIAL 1st
  // grade», «Offizier», «officier 1re»: some 340 titles a language, 7 November 2026). «1ª-2ª» is qualified alone.
  // The grade glued to the trade («OFICIAL 1ªMECÁNICO/A»: 14 titles, most of them Catalan, came back «Skilled tradesperson
  // 1mechanical»), with a point («1.ª» came back «First-class .a») or a word's ending («1ra», «1er»); «1ª Ó DE 2ª» too.
  [
    ["es", "ca"],
    new RegExp(
      "\\s*\\(?" +
        W +
        "oficial(?:e?s|a|as)?\\s+(?:de\\s+)?(?:1|primera)\\s*\\.?\\s*[ªaº°]?\\s*(?:[-/]|\\s+[oóy]\\s+)\\s*(?:de\\s+)?(?:2|segunda|segona)\\s*\\.?\\s*[ªaº°]?" +
        E +
        "\\)?",
      "giu",
    ),
    "Qualified",
  ],
  [
    ["es", "ca"],
    new RegExp(
      "\\s*\\(?" +
        W +
        "oficial(?:e?s|a|as)?\\s+(?:de\\s+)?" +
        ordinal("1", "a|ra|er", "primera") +
        "\\)?",
      "giu",
    ),
    "First-class",
  ],
  [
    ["es", "ca"],
    new RegExp(
      "\\s*\\(?" +
        W +
        "oficial(?:e?s|a|as)?\\s+(?:de\\s+)?" +
        ordinal("2", "a|da", "segunda|segona") +
        "\\)?",
      "giu",
    ),
    "Second-class",
  ],
  [
    ["es", "ca"],
    new RegExp(
      "\\s*\\(?" +
        W +
        "oficial(?:e?s|a|as)?\\s+(?:de\\s+)?" +
        ordinal("3", "a|ra|er", "tercera") +
        "\\)?",
      "giu",
    ),
    "Third-class",
  ],
  [
    ["es", "ca"],
    new RegExp(
      "(?<=\\S\\s+)(?<!(?:taller|servicio|servei|concesionario|colegio|col·legi|escuela|escola)\\s+)" +
        W +
        "oficial" +
        E +
        "(?!\\s+(?:de\\s+)?(?:1|2|3|primera|segunda|tercera|segona))",
      "giu",
    ),
    "Qualified",
  ],
];
// A country given as the offer's town ("España") is translated like any word, not kept as a name.
export const COUNTRY =
  /^(?:españa|spain|espanya|france|frankreich|deutschland|germany|alemania|nederland|netherlands|holland|belgique|belgië|belgium|schweiz|suisse|switzerland|österreich|austria|italia|italy|portugal|luxembourg|andorra|europe|europa)$/i;
// The levels of a title, by part: a level of the first part to say in front of the English; one of a later
// part written in English at the start of that part ("Airbus Protect - Experienced Ingénieur RAMS", which
// Firefox keeps); one alone in its part goes with the part before ("Data Engineer – Confirmé - 92").
const ORDER = LEVELS.map((l) => l[2]);
export function takeLevels(t: string, s: string) {
  const marked = LEVELS.reduce(
    (x, [langs, re, en]) =>
      langs.includes(s) ? x.replace(re, ` \u0001${en}\u0001 `) : x,
    t,
  );
  if (marked === t) return { t, level: [] };
  const bits = marked.split(/(\s+[–|-]\s+|\s*\|\s*|\s+\/\s+|:\s+)/u),
    parts: { sep: string; text: string; said: string[] }[] = [];
  for (let k = 0; k < bits.length; k += 2) {
    const said = [...bits[k].matchAll(/\u0001([^\u0001]+)\u0001/gu)].map(
      (m) => m[1],
    );
    const text = bits[k]
      .replace(/\u0001[^\u0001]+\u0001/gu, " ")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text && parts.length) parts[parts.length - 1].said.push(...said);
    else parts.push({ sep: k ? bits[k - 1] : "", text, said });
  }
  const sorted = (said: string[]) =>
    [...new Set(said)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const out = parts
    .map(
      (p, i) =>
        (i ? p.sep : "") +
        (i && p.said.length ? sorted(p.said).join(" ") + " " : "") +
        p.text,
    )
    .join("");
  return {
    t: out
      .replace(/^[\s–|:/-]+/u, "")
      .replace(/\s+/g, " ")
      .trim(),
    level: parts.length ? sorted(parts[0].said) : [],
  };
}
// How each language says a level the first leg took out: after the job and its words ("Mecánico de coches
// con experiencia – CDI"), or before it ("Erfahrener Kfz-Mechaniker").
// French trades a "dépanneur" can stand beside (before).
export const TRADE_FR =
  /(?<![\p{L}])(?:technicien|plombier|chauffagiste|m[ée]canicien|monteur|[ée]lectricien|frigoriste|climaticien|serrurier|vitrier|ascensoriste)/iu;
// A title cut short by its source ends on a piece of a word: the commonest word of the language's titles it begins,
// four letters at least; a shorter piece and the little word or hyphen before it go.
export function completeCut(t: string, lang: string) {
  if (!(lang in VOCABS)) {
    try {
      VOCABS[lang] = vocab(lang);
    } catch {
      VOCABS[lang] = null;
    }
  }
  const V = VOCABS[lang],
    m = t.match(/(\p{L}+)$/u);
  if (!V || !m) return t;
  // The cut pieces are in the titles too ("maintena" 25 times): a word they begin, ten times commoner, wins.
  const piece = m[1].toLowerCase(),
    own = V[piece] || 0;
  if (piece.length >= 4) {
    // Only a word that stands out, three times commoner than any other the piece begins (its feminine or plural
    // aside): "élect" may be électricité or électricien, so it goes ("… en élect" came back "en electricista").
    const variant = (a: string, b: string) =>
      a.startsWith(b) && /^(?:e|s|es|le|les|ne|nes)$/.test(a.slice(b.length));
    const words = Object.entries(V)
      .filter(
        ([w, n]) =>
          n > Math.max(2, own * 10) &&
          w.length > piece.length &&
          w.startsWith(piece),
      )
      .sort((a, b) => b[1] - a[1]);
    const best = words[0],
      other =
        best &&
        words.find(
          ([w]) =>
            w !== best[0] && !variant(w, best[0]) && !variant(best[0], w),
        );
    if (best && (!other || best[1] >= 3 * other[1]))
      return (
        t.slice(0, -m[1].length) +
        (m[1][0] === m[1][0].toUpperCase()
          ? best[0][0].toUpperCase() + best[0].slice(1)
          : best[0])
      );
  }
  // A capitalised word the titles do not know is a town or a name, written whole by a source that cuts nothing (TRA-07).
  if (!own && /^\p{Lu}/u.test(m[1]) && piece.length >= 4) return t;
  if (
    own >= 3 &&
    !(piece.length < 4 && /-$/.test(t.slice(0, -m[1].length))) &&
    !(
      piece.length >= 4 &&
      Object.entries(V).some(
        ([w, n]) =>
          n > own * 10 && w.length > piece.length && w.startsWith(piece),
      )
    )
  )
    return t;
  return t
    .slice(0, -m[1].length)
    .replace(
      /(?:\s+(?:de|du|des|d['’]|en|à|au|et|sur|pour|la|le|les)|[\s'’-])*$/iu,
      "",
    )
    .trim();
}
export const ICS = {
  es: {
    electronics: "electrónica",
    mechanics: "mecánica",
    mechatronics: "mecatrónica",
    robotics: "robótica",
    logistics: "logística",
    hydraulics: "hidráulica",
    pneumatics: "neumática",
    plastics: "plásticos",
    optics: "óptica",
  },
  ca: {
    electronics: "electrònica",
    mechanics: "mecànica",
    mechatronics: "mecatrònica",
    robotics: "robòtica",
    logistics: "logística",
    hydraulics: "hidràulica",
    pneumatics: "pneumàtica",
    plastics: "plàstics",
    optics: "òptica",
  },
};
export const ICS_LEFT =
  /(?<![\p{L}])(electronics|mechanics|mechatronics|robotics|logistics|hydraulics|pneumatics|plastics|optics)(?![\p{L}])/gu;
export const LEVEL_SAY: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  es: {
    Apprentice: ["Aprendiz de ", "lower"],
    "First-class": [" oficial de primera", "after"],
    "Second-class": [" oficial de segunda", "after"],
    "Third-class": [" oficial de tercera", "after"],
    Graduate: [" recién titulado", "after"],
    Principal: [" principal", "after"],
    Skilled: [" cualificado", "after"],
    Commercial: [" comercial", "after"],
    Domestic: [" doméstico", "after"],
    Interim: [" interino", "after"],
    Associate: [" asociado", "after"],
    Regional: [" regional", "after"],
    Deputy: [" adjunto", "after"],
    Chartered: [" colegiado", "after"],
    Leading: [" líder", "after"],
    Lead: [" jefe", "after"],
    "Mid-level/Senior": [" de nivel intermedio o sénior", "after"],
    "Junior/Mid-level": [" junior o de nivel intermedio", "after"],
    "Senior-or-not": [" (sénior)", "after"],
    "Junior-or-not": [" (junior)", "after"],
    Founding: [" fundador", "after"],
    Qualified: [" oficial", "after"],
    "Mid-level": [" de nivel intermedio", "after"],
    Experienced: [" con experiencia", "after"],
    Junior: [" junior", "after"],
    Senior: [" sénior", "after"],
    "Multi-skilled": [" polivalente", "after"],
    Itinerant: [" itinerante", "after"],
    Assistant: ["Ayudante de ", "lower"],
  },
  ca: {
    Apprentice: ["Aprenent de ", "lower"],
    "First-class": [" oficial de primera", "after"],
    "Second-class": [" oficial de segona", "after"],
    "Third-class": [" oficial de tercera", "after"],
    Graduate: [" recent titulat", "after"],
    Principal: [" principal", "after"],
    Skilled: [" qualificat", "after"],
    Commercial: [" comercial", "after"],
    Domestic: [" domèstic", "after"],
    Interim: [" interí", "after"],
    Associate: [" associat", "after"],
    Regional: [" regional", "after"],
    Deputy: [" adjunt", "after"],
    Chartered: [" col·legiat", "after"],
    Leading: [" líder", "after"],
    Lead: [" cap", "after"],
    "Mid-level/Senior": [" de nivell intermedi o sènior", "after"],
    "Junior/Mid-level": [" júnior o de nivell intermedi", "after"],
    "Senior-or-not": [" (sènior)", "after"],
    "Junior-or-not": [" (júnior)", "after"],
    Founding: [" fundador", "after"],
    Qualified: [" oficial", "after"],
    "Mid-level": [" de nivell intermedi", "after"],
    Experienced: [" amb experiència", "after"],
    Junior: [" júnior", "after"],
    Senior: [" sènior", "after"],
    "Multi-skilled": [" polivalent", "after"],
    Itinerant: [" itinerant", "after"],
    Assistant: ["Ajudant de ", "lower"],
  },
  fr: {
    Apprentice: ["Apprenti ", "lower"],
    "First-class": [" de première classe", "after"],
    "Second-class": [" de deuxième classe", "after"],
    "Third-class": [" de troisième classe", "after"],
    Graduate: [" jeune diplômé", "after"],
    Principal: [" principal", "after"],
    Skilled: [" qualifié", "after"],
    Commercial: [" tertiaire", "after"],
    Domestic: [" résidentiel", "after"],
    Interim: [" par intérim", "after"],
    Associate: [" associé", "after"],
    Regional: [" régional", "after"],
    Deputy: [" adjoint", "after"],
    Chartered: [" agréé", "after"],
    Leading: [" principal", "after"],
    Lead: ["Chef ", "lower"],
    "Mid-level/Senior": [" confirmé ou senior", "after"],
    "Junior/Mid-level": [" junior ou confirmé", "after"],
    "Senior-or-not": [" (senior)", "after"],
    "Junior-or-not": [" (junior)", "after"],
    Founding: [" fondateur", "after"],
    Qualified: [" qualifié", "after"],
    "Mid-level": [" confirmé", "after"],
    Experienced: [" expérimenté", "after"],
    Junior: [" junior", "after"],
    Senior: [" senior", "after"],
    "Multi-skilled": [" polyvalent", "after"],
    Itinerant: [" itinérant", "after"],
    Assistant: ["Aide ", "lower"],
  },
  de: {
    "First-class": [" (1. Klasse)", "after"],
    "Second-class": [" (2. Klasse)", "after"],
    "Third-class": [" (3. Klasse)", "after"],
    "Mid-level/Senior": ["Professional/Senior ", "before"],
    "Junior/Mid-level": ["Junior/Professional ", "before"],
    Lead: ["Leitender ", "before"],
    Qualified: ["Qualifizierter ", "before"],
    "Mid-level": ["Professional ", "before"],
    Experienced: ["Erfahrener ", "before"],
    Junior: ["Junior ", "before"],
    Senior: ["Senior ", "before"],
    "Multi-skilled": ["Vielseitiger ", "before"],
    Itinerant: ["Mobiler ", "before"],
    Assistant: ["Helfer ", "before"],
  },
  nl: {
    Apprentice: ["Leerling ", "lower"],
    "First-class": ["Eersteklas ", "lower"],
    "Second-class": ["Tweedeklas ", "lower"],
    "Third-class": ["Derdeklas ", "lower"],
    Qualified: ["Vakbekwame ", "lower"],
    "Mid-level": ["Medior ", "lower"],
    Experienced: ["Ervaren ", "lower"],
    Junior: ["Junior ", "lower"],
    Senior: ["Senior ", "lower"],
    "Multi-skilled": ["Allround ", "lower"],
    Itinerant: ["Mobiele ", "lower"],
    Assistant: ["Assistent ", "lower"],
  },
  // Polish says the level in front, as an adjective of the job or the IT word it uses ("Doświadczony spawacz", "Regular"),
  // or in English before an English name Firefox kept (the third word; "adjective" in sayLevels); in brackets after it
  // where Polish would bend the job ("Hydraulik (pomocnik)", not "Pomocnik hydraulika") or has no adjective for it
  // ("(budynki mieszkalne)").
  pl: {
    Apprentice: [" (uczeń)", "after"],
    Graduate: ["Młodszy ", "adjective", "Graduate "],
    Principal: ["Główny ", "adjective", "Principal "],
    Skilled: ["Wykwalifikowany ", "adjective"],
    Interim: ["Tymczasowy ", "adjective", "Interim "],
    Regional: ["Regionalny ", "adjective", "Regional "],
    Chartered: ["Dyplomowany ", "adjective"],
    Leading: ["Główny ", "adjective", "Lead "],
    Lead: ["Główny ", "adjective", "Lead "],
    "Mid-level/Senior": ["Regular/Senior ", "before"],
    "Junior/Mid-level": ["Junior/Regular ", "before"],
    "Senior-or-not": [" (senior)", "after"],
    "Junior-or-not": [" (junior)", "after"],
    Qualified: ["Wykwalifikowany ", "adjective"],
    "Mid-level": ["Regular ", "before"],
    Experienced: ["Doświadczony ", "adjective"],
    Junior: ["Młodszy ", "adjective", "Junior "],
    Senior: ["Starszy ", "adjective", "Senior "],
    "Multi-skilled": ["Wszechstronny ", "adjective"],
    Itinerant: ["Mobilny ", "adjective"],
    Commercial: [" (obiekty komercyjne)", "after"],
    Domestic: [" (budynki mieszkalne)", "after"],
    Assistant: [" (pomocnik)", "after"],
  },
  // Ukrainian as Polish: the adjective in front ("Старший інженер"), the English one before an English name Firefox kept,
  // IT's own Middle as Ukrainian job boards write it, and in brackets after the job what would bend it ("(помічник)").
  uk: {
    Apprentice: [" (учень)", "after"],
    Graduate: ["Молодший ", "adjective", "Graduate "],
    Principal: ["Головний ", "adjective", "Principal "],
    Skilled: ["Кваліфікований ", "adjective"],
    Interim: ["Тимчасовий ", "adjective", "Interim "],
    Regional: ["Регіональний ", "adjective", "Regional "],
    Chartered: ["Дипломований ", "adjective"],
    Leading: ["Провідний ", "adjective", "Lead "],
    Lead: ["Провідний ", "adjective", "Lead "],
    "Mid-level/Senior": ["Middle/Senior ", "before"],
    "Junior/Mid-level": ["Junior/Middle ", "before"],
    "Senior-or-not": [" (senior)", "after"],
    "Junior-or-not": [" (junior)", "after"],
    Qualified: ["Кваліфікований ", "adjective"],
    "Mid-level": ["Middle ", "before"],
    Experienced: ["Досвідчений ", "adjective"],
    Junior: ["Молодший ", "adjective", "Junior "],
    Senior: ["Старший ", "adjective", "Senior "],
    "Multi-skilled": ["Універсальний ", "adjective"],
    Itinerant: ["Мобільний ", "adjective"],
    Commercial: [" (комерційні об’єкти)", "after"],
    Domestic: [" (житлові будинки)", "after"],
    Assistant: [" (помічник)", "after"],
  },
  it: {
    Apprentice: ["Apprendista ", "lower"],
    Graduate: [" neolaureato", "after"],
    Principal: [" principale", "after"],
    Skilled: [" qualificato", "after"],
    Interim: [" ad interim", "after"],
    Regional: [" regionale", "after"],
    Deputy: ["Vice ", "lower"],
    Chartered: [" abilitato", "after"],
    Leading: ["Capo ", "lower"],
    Lead: ["Capo ", "lower"],
    "Mid-level/Senior": [" mid/senior", "after"],
    "Junior/Mid-level": [" junior/mid", "after"],
    "Senior-or-not": [" (senior)", "after"],
    "Junior-or-not": [" (junior)", "after"],
    Qualified: [" qualificato", "after"],
    "Mid-level": [" mid", "after"],
    Experienced: [" esperto", "after"],
    Junior: [" junior", "after"],
    Senior: [" senior", "after"],
    "Multi-skilled": [" polivalente", "after"],
    Itinerant: [" trasfertista", "after"],
    Assistant: ["Aiuto ", "lower"],
    Founding: [" fondatore", "after"],
    Commercial: [" per il terziario", "after"],
    Domestic: [" residenziale", "after"],
    Associate: [" associato", "after"],
  },
};
// Into Ukrainian, an English or code name Firefox left in front of the job goes after it, as Ukrainian job boards write
// it ("TIG Зварювальник" → "Зварювальник TIG", "Досвідчений C# .NET Розробник" → "Досвідчений розробник C# .NET"), at
// the start of the title or of a part of it; not one a level opens ("Middle Інженер", "Junior Java Розробник"). And a
// title Firefox gave a capital on every word, as its English had ("Головний Менеджер З Продуктів"), keeps only the
// capital of each part's first word and of the words written in capitals ("ОВіК", "ІТ").
const LEVEL_LATIN =
  /^(?:Middle|Junior|Senior|Lead|Principal|Graduate|Interim|Regional|Regular)(?:\/|\s|$)/;
export function ukrainianOrder(out: string) {
  out = out.replace(
    /(^|[–|/]\s*)((?:[А-ЯЄІЇҐ][а-яєіїґ'’]+\s+)?)((?:[A-Za-z0-9#+.&][A-Za-z0-9#+.&/-]*\s+)+)([А-ЯЄІЇҐа-яєіїґ][А-ЯЄІЇҐа-яєіїґ'’-]{3,})/g,
    (m: string, start, adjective, latin, job) => {
      const name = latin.trim();
      if (LEVEL_LATIN.test(name) || !/[A-Za-z]/.test(name)) return m;
      return `${start}${adjective ? adjective + job[0].toLowerCase() : job[0].toUpperCase()}${job.slice(1)} ${name}`;
    },
  );
  const words = out.match(/[А-ЯЄІЇҐа-яєіїґ][А-ЯЄІЇҐа-яєіїґ'’-]*/g) || [];
  if (
    words.length >= 4 &&
    words.filter((w: string) => /^[А-ЯЄІЇҐ]/.test(w)).length >=
      words.length * 0.8
  ) {
    out = out.replace(
      /([–|:(/]\s*|\s[-—]\s+)?([А-ЯЄІЇҐ])(?![А-ЯЄІЇҐA-Z])([а-яєіїґ'’-][А-ЯЄІЇҐа-яєіїґ'’-]*)?/g,
      (m: string, start, first, rest, at: number) =>
        start !== undefined || at === 0
          ? m
          : first.toLowerCase() + (rest || ""),
    );
  }
  return out;
}
export function sayLevels(
  out: string,
  levels: readonly string[],
  table: Readonly<Record<string, readonly string[]>>,
  src = "",
) {
  for (const lv of levels) {
    let [word, where, english] = table[lv] || [];
    // Two levels for one post ("Senior/Principal"): each language's two words with the slash, "sénior/principal".
    const two =
      !word && lv.includes("/")
        ? lv.split("/").map((p: string) => table[p])
        : null;
    if (two && two.every((p) => p && p[1] === "after")) {
      word = " " + two.map((p) => (p?.[0] ?? "").trim()).join("/");
      where = "after";
    }
    if (!word) continue;
    if (where === "after") {
      // The end of the job and its words: the first separator, or a place ("en Madrid", "à Lyon").
      // Or a workload ("Ingeniero de Sistemas 80-100% sénior" put it after one).
      // Or a full stop after a word ("Ingeniero de producción. Trabajo en Havant").
      // Or a slash or a hyphen joined to the word before, between two jobs ("Mecánico de automóviles/ Inspector de
      // vehículos jefe"); not an ampersand, which also joins two names in front of the job ("Intune & M365").
      const m = out.match(
        /\s[–|-]\s|\s?\(|,\s|(?<=\p{Ll}{3})\.\s|\s?\/\s|(?<=\p{L})-\s|\s(?=\d{1,3}(?:\s?[-–]\s?\d{1,3})?\s?%)|\s(?:en|à|dans)\s|\s(?:a|in|bei|op)\s(?=\p{Lu})|\s(?:con|amb|avec|with|mit|met|para|per|pour|for|sin|sense|sans|without)\s/u,
      );
      const at = m ? m.index : out.length;
      out = out.slice(0, at) + word + out.slice(at);
    } else if (where === "adjective") {
      // Polish: the adjective, and the job after it in small letters ("Starszy inżynier danych"); before an English name
      // Firefox kept, one the English title holds, the level as the English title says it ("Senior Data Scientist", not
      // "Starszy data Scientist"), or the adjective with the name as it is.
      const first = out.match(/^[\p{L}\d.#+]+/u)?.[0];
      if (
        first &&
        new RegExp(`(?<![\\p{L}])${escape(first)}(?![\\p{L}])`, "iu").test(src)
      )
        out = (english || word) + out;
      else
        out =
          word +
          (/^\p{Lu}\p{Ll}/u.test(out)
            ? out[0].toLowerCase() + out.slice(1)
            : out);
    } else {
      const rest =
        where === "lower" && /^\p{Lu}\p{Ll}/u.test(out)
          ? out[0].toLowerCase() + out.slice(1)
          : out;
      // Catalan "de" before a vowel: "Ajudant d'electricista".
      out =
        /de $/.test(word) &&
        /^h?[aeiouàèéíòóú]/iu.test(rest) &&
        /^(?:Ajudant|Aprenent)/.test(word)
          ? word.slice(0, -3) + "d'" + rest
          : word + rest;
    }
  }
  return out;
}
// German jobs in -er are the same in the singular and the plural, and Firefox often picks the plural
// ("Industriemechaniker in Nürnberg" → "Industrial mechanics in Nuremberg"): a title names one person.
export const HEAD_END =
  /\s[–|-]\s|\s?\(|\s(?:in|for|at|with|from|on|of|as|to|by|including|wanted|needed|sought|required|full-time|part-time)\b/iu;
