// ➤ The levels a title names (junior, senior, lead…), taken out before Firefox and said again in the target language
// ➤ after it (builder/mt/method.ts).
// The legacy's builder/mt/levels.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { escape } from "./patterns.js";
import { lowerOpening } from "./english-tidy.js";
import { LEVEL_SAY, type Say } from "./level-words.js";

// ➤ After Firefox: the names put back (a second pass that did not keep them leaves the title as written),
// ➤ what the translation adds removed, "X / X" said once, the known slips corrected, the capital and
// ➤ emojis of the title given back.
export const ADDED =
  /\s*\((?:englisch|english|anglès|anglais|inglés|engels|deutsche ausgabe|deutsch|in english|angol nyelven)\)/gi;
export const STRONG = /\s[-–—|]\s|[,;:()[\]|]/g;
// ➤ Levels Firefox ties to the wrong noun or reads wrong, taken out of the title and said in front of the
// ➤ English: "Ingénieur Structure confirmé" → "Engineer – Experienced structure" → "Experienced Engineer –
// ➤ Structure"; "Aide Plombier" → "Help Plumber" → "Assistant Plumber". The order is the English order.
const W = "(?<![\\p{L}])",
  E = "(?![\\p{L}])";
// ➤ A grade's number: with its sign, glued to the next word or not («1ª», «1.ª», «1ªMECÁNICO»), with a word's ending
// ➤ («1a», «1ra», «2da»), or in words («primera»).
const ordinal = (n: string, endings: string, words: string): string =>
  `(?:${n}\\s*\\.?\\s*[ªº°]|${n}\\s*(?:${endings})?${E}|(?:${words})${E})`;
const OFICIAL = "of(?:icial(?:e?s|a|as)?|ic\\.|\\.)"; // «Oficial», «Ofic.», «Of.»
// ➤ A grade before a field that is no trade leaves «Oficial» in its place («Oficial 1ª de producción» came out «De
// ➤ producción»).
const graded = (n: string, endings: string, words: string): RegExp => {
  const grade =
    "\\s+(?:de\\s+)?" +
    ordinal(n, endings, words) +
    "(?:\\s+categor[ií]a" +
    E +
    ")?";
  return new RegExp(
    "\\s*\\(?" +
      W +
      OFICIAL +
      grade +
      "\\)?(?!\\s+de\\s)|(?<=" +
      W +
      OFICIAL +
      ")" +
      grade +
      "(?=\\s+de\\s)",
    "giu",
  );
};
// ➤ The Portuguese grade («Serralheiro 2ª classe», «de primeira»); a bare number is none («2 turnos»).
const ptOrdinal = (n: string, word: string): string =>
  `(?:${n}\\s*\\.?\\s*[ªº°]|${word}${E})`;
// ➤ Not a shift, a line, a first job or a weekday span («2º turno», «de primeira linha», «segunda a sexta»).
const ptGrade = (grade: string): RegExp =>
  new RegExp(
    "\\s+(?:de\\s+)?" +
      grade +
      "(?!\\s+(?:a\\s+sexta|turno|linha|emprego|feira)" +
      E +
      ")(?:\\s+classe" +
      E +
      ")?",
    "giu",
  );
// ➤ «Senior» or «Junior» inside a name («Senior Living», «Junior Empresa»); a hall's «polivalente» («Pabellón Polivalente»).
const NOT_A_NAME = "(?!\\s+(?:living|empresa|achievement|enterprise)" + E + ")";
const NOT_A_HALL =
  "(?<!(?:pabell[oó]n|pavell[oó]|sala|salle|centro|centre|aula)\\s+)";
// ➤ A level word after the job, alone, after a dash or in brackets.
const levelWord = (x: string): RegExp =>
  new RegExp("\\s*(?:[–-]\\s*)?\\(?" + W + x + E + "\\)?", "giu");
const LEVELS: [string[], RegExp, string][] = [
  [
    ["fr"],
    levelWord("(?:confirm|expériment|experiment)[ée]e?s?"),
    "Experienced",
  ],
  [
    ["fr"],
    new RegExp(
      "\\s*\\(?" +
        W +
        "débutante?s?(?:\\(e\\))?(?:\\s+accept[ée]e?s?(?:\\(e\\))?)?" +
        E +
        "\\)?",
      "giu",
    ),
    "Junior",
  ],
  [
    ["fr", "es", "ca", "it", "pt", "de"],
    new RegExp(
      "(?<=\\S\\s+)(?:[–-]\\s*)?\\(?" +
        W +
        "j[uú]nior" +
        E +
        "\\)?" +
        NOT_A_NAME,
      "giu",
    ),
    "Junior",
  ],
  [
    ["fr", "es", "ca", "it", "pt", "de"],
    new RegExp(
      "(?<=\\S\\s+)(?<!(?:residencia|residència|centro|centre|club)\\s+)(?:[–-]\\s*)?\\(?" +
        W +
        "s[eéè]nior" +
        E +
        "\\)?" +
        NOT_A_NAME,
      "giu",
    ),
    "Senior",
  ],
  [
    ["fr"],
    new RegExp(
      "\\s*\\(?" + W + NOT_A_HALL + "polyvalente?s?" + E + "\\)?",
      "giu",
    ),
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
  [["it"], levelWord("(?:espert[oiae]|con\\s+esperienza)"), "Experienced"],
  [
    ["it"],
    new RegExp(
      "\\s*\\(?" + W + "neo(?:diplomat|laureat)[oiae]" + E + "\\)?",
      "giu",
    ),
    "Graduate",
  ],
  [["it"], /^\s*apprendist[ai]\s+(?=\p{L})/giu, "Apprentice"],
  // ➤ Flemish "op verplaatsing": travelling to the customers' sites ("Monteur op verplaatsing" → "on displacement").
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
  // ➤ An Italian «trasfertista» travels to the clients' sites («MANUTENTORE TRASFERTISTA» came back «Transferred
  // ➤ Electromechanical Maintenance»).
  [["it"], levelWord("(?:trasfertist|itinerant)[aie]"), "Itinerant"],
  // ➤ The Swiss «Dipl.» (holding the diploma) opening a part, or after the job in French («dipl. EPF»): Firefox read it as
  // ➤ a thing of the job («Técnico de Dipl.», «Technicien en dipl.»). Not the degrees «Dipl. Ing.», «Dipl. Univ.», nor the
  // ➤ federal «Eidg. dipl.», which keeps its word.
  [
    ["de", "fr"],
    /(?<=^|[–|/(:,]\s*|\s[-–]\s)\s*dipl\.\s+(?!(?:ing|univ)\.?(?![\p{L}]))(?=\p{L})/giu,
    "Dipl.",
  ],
  [["fr"], /(?<=\p{L})\s+dipl\.(?=\s)/gu, "Dipl."],
  // ➤ Polish levels open the title (Firefox kept «Starszy» in «Starszy technik utrzymania ruchu»).
  [["pl"], /^\s*starsz[yae]\s+(?=\p{L})/giu, "Senior"],
  [["pl"], /^\s*młodsz[yae]\s+(?=\p{L})/giu, "Junior"],
  [["pl"], /^\s*główn[yae]\s+(?=\p{L})/giu, "Lead"],
  [["sv", "da", "nb"], /^\s*erfar(?:en|na|ne)\s+(?=\p{L})/giu, "Experienced"],
  [
    ["pt"],
    ptGrade(
      ptOrdinal("1", "primeira") +
        "\\s*(?:\\/|ou|e)\\s*" +
        ptOrdinal("2", "segunda"),
    ),
    "Qualified",
  ], // «de 1ª ou 2ª», as in Spanish
  [["pt"], ptGrade(ptOrdinal("1", "primeira")), "First-class"],
  [["pt"], ptGrade(ptOrdinal("2", "segunda")), "Second-class"],
  [["pt"], ptGrade(ptOrdinal("3", "terceira")), "Third-class"],
  [["fr"], /^\s*aide\s+(?=\p{L})/iu, "Assistant"],
  // ➤ An Austrian or Swiss apprenticeship opening the title («Lehre Gleisbautechniker», «Lehrstelle Automobil-
  // ➤ Mechatroniker»): Firefox made it a thing of the trade («Técnico de construcción de vías de aprendizaje»).
  [
    ["de"],
    /^\s*(?:lehre|lehrstellen?|lehrlinge?)(?:\s+(?:als|zum|zur|zu)\s+|\s*[:–-]\s*|\s+)(?=\p{L})/iu,
    "Apprentice",
  ],
  [
    ["de"],
    new RegExp(
      "(?<=\\S)\\s*(?:[–-]\\s*)?\\(?" + W + "lehr(?:e|stelle|ling)\\)?\\s*$",
      "iu",
    ),
    "Apprentice",
  ], // «Elektriker Lehre»
  // ➤ German too, and glued to the job («Allround-Monteur», «Allroundmonteur»); not the «Allrounder» himself.
  [
    ["nl"],
    new RegExp("\\s*" + W + "all[ -]?round" + E, "giu"),
    "Multi-skilled",
  ],
  [
    ["de"],
    /(?<![\p{L}])all[ -]?round(?!er)(?:-|\s+)?(?=\p{L})/giu,
    "Multi-skilled",
  ],
  // ➤ «Jung-» glued to the job is a junior («Jungbauleiter» came back «Young construction manager»).
  [
    ["de"],
    /(?<![\p{L}])jung(?=(?:bauleiter|ingenieur|meister|techniker|monteur|projektleiter|polier|geselle))/giu,
    "Junior",
  ],
  [["nl"], new RegExp("\\s*" + W + "polyvalente?" + E, "giu"), "Multi-skilled"],
  [
    ["es", "ca"],
    new RegExp("\\s*" + W + NOT_A_HALL + "polivalent(?:e|s|es)?" + E, "giu"),
    "Multi-skilled",
  ],
  // ➤ Dutch "Eerste" or "1e" opening a title: the lead of the trade ("Eerste Autotechnicus" came back "First Car
  // ➤ mechanic"); not "1e lijns" (first-line), nor "1e of 2e"; not after a dash, where the second leg read the English
  // ➤ word as a verb ("Vakgarage Alblas - Lidero mecánico de automóviles").
  // ➤ «Leerling monteur», «Leerling-elektricien» (came back «Student fitter»).
  [["nl"], /^\s*leerling(?:\s+|-)(?=\p{L})/iu, "Apprentice"],
  [
    ["nl"],
    /^\s*(?:vacature\s+)?(?:eerste|1e|1ste)\s+(?=\p{L})(?!(?:lijns?|hulp|kamer|of|en)(?![\p{L}]))/iu,
    "Lead",
  ],
  // ➤ Two levels for one post said as one ("Frontend Developer (Medior / Senior)" came back "(/ Senior)").
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
  // ➤ A trade's grade in Spain, «oficial de 1ª» to «3ª» («oficial de primera»): Firefox read an officer («OFFICIAL 1st
  // ➤ grade», «Offizier», «officier 1re»: some 340 titles a language, 7 November 2026). «1ª-2ª» is qualified alone.
  // ➤ The grade glued to the trade («OFICIAL 1ªMECÁNICO/A»: 14 titles, most of them Catalan, came back «Skilled tradesperson
  // ➤ 1mechanical»), with a point («1.ª» came back «First-class .a») or a word's ending («1ra», «1er»); «1ª Ó DE 2ª» too.
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
  [["es", "ca"], graded("1", "a|ra|er", "primera"), "First-class"],
  [["es", "ca"], graded("2", "a|da", "segunda|segona"), "Second-class"],
  [["es", "ca"], graded("3", "a|ra|er", "tercera"), "Third-class"],
  [
    ["es", "ca"],
    new RegExp(
      // ➤ Not a dealer's, a service's or a brand's («Agencia Oficial Peugeot», «Servicio Técnico Oficial Samsung»).
      "(?<=\\S\\s+)(?<!(?:taller|servicio|servei|concesionario|colegio|col·legi|escuela|escola|agencia|agència|técnico|tècnic|distribuidor|laboratorio|laboratori|formador|instructor|traductor|jurado|agente|agent)\\s+)" +
        W +
        "oficial" +
        E +
        "(?!\\s+(?:de\\s+)?(?:1|2|3|primera|segunda|tercera|segona)|\\s+\\p{Lu}\\p{Ll})",
      "giu",
    ),
    "Qualified",
  ],
  // ➤ «Oficial» opening a title before the trade («Oficial albañil» came out «Skilled tradesperson albañil»), after a dash
  // ➤ too («Oficial – Chapista»).
  [
    ["es", "ca"],
    /^\s*oficial(?:a|\/a|\/la)?\s+(?:[–-]\s+)?(?!de\s|d['’]|administrativ)(?=\p{L})/giu,
    "Qualified",
  ],
];
// ➤ The levels of a title, by part: a level of the first part to say in front of the English; one of a later
// ➤ part written in English at the start of that part ("Airbus Protect - Experienced Ingénieur RAMS", which
// ➤ Firefox keeps); one alone in its part goes with the part before ("Data Engineer – Confirmé - 92").
// ➤ Levels in the order English says them («First-class itinerant electrician»); «Experienced» beside «Senior» says it again.
const ORDER = [
  "Lead",
  "Senior",
  "Experienced",
  "Mid-level",
  "Junior",
  "Graduate",
  "Apprentice",
  "Assistant",
  "Qualified",
  "First-class",
  "Second-class",
  "Third-class",
  "Multi-skilled",
  "Itinerant",
  "Dipl.",
];
export function takeLevels(
  t: string,
  s: string,
): { t: string; level: string[] } {
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
    // ➤ Levels alone in the last part are the title's («Ingeniero de procesos | Automoción | Senior»).
    if (!text && parts.length)
      parts[k === bits.length - 1 ? 0 : parts.length - 1].said.push(...said);
    else parts.push({ sep: k ? bits[k - 1] : "", text, said });
  }
  // ➤ A level that is the whole title («Oficial 1ª») stays there: taken out, nothing was left to translate.
  if (!parts.some((p) => /\p{L}/u.test(p.text))) return { t, level: [] };
  const sorted = (said: string[]): string[] =>
    [...new Set(said)]
      .filter((l) => !(l === "Experienced" && said.includes("Senior")))
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
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
// ➤ How each language says a level the first leg took out: after the job and its words ("Mecánico de coches
// ➤ con experiencia – CDI"), or before it ("Erfahrener Kfz-Mechaniker").
export const ICS: Record<string, Record<string, string>> = {
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
export { LEVEL_SAY, type Say };
// ➤ Into Ukrainian, an English or code name Firefox left in front of the job goes after it, as Ukrainian job boards write
// ➤ it ("TIG Зварювальник" → "Зварювальник TIG", "Досвідчений C# .NET Розробник" → "Досвідчений розробник C# .NET"), at
// ➤ the start of the title or of a part of it; not one a level opens ("Middle Інженер", "Junior Java Розробник"). And a
// ➤ title Firefox gave a capital on every word, as its English had ("Головний Менеджер З Продуктів"), keeps only the
// ➤ capital of each part's first word and of the words written in capitals ("ОВіК", "ІТ").
const LEVEL_LATIN =
  /^(?:Middle|Junior|Senior|Lead|Principal|Graduate|Interim|Regional|Regular)(?:\/|\s|$)/;
export function ukrainianOrder(out: string): string {
  out = out.replace(
    /(^|[–|/]\s*)((?:[А-ЯЄІЇҐ][а-яєіїґ'’]+\s+)?)((?:[A-Za-z0-9#+.&][A-Za-z0-9#+.&/-]*\s+)+)([А-ЯЄІЇҐа-яєіїґ][А-ЯЄІЇҐа-яєіїґ'’-]{3,})/g,
    (m, start: string, adjective: string, latin: string, job: string) => {
      const name = latin.trim();
      if (LEVEL_LATIN.test(name) || !/[A-Za-z]/.test(name)) return m;
      return `${start}${adjective ? adjective + job[0].toLowerCase() : job[0].toUpperCase()}${job.slice(1)} ${name}`;
    },
  );
  const words = out.match(/[А-ЯЄІЇҐа-яєіїґ][А-ЯЄІЇҐа-яєіїґ'’-]*/g) || [];
  if (
    words.length >= 4 &&
    words.filter((w) => /^[А-ЯЄІЇҐ]/.test(w)).length >= words.length * 0.8
  ) {
    out = out.replace(
      /([–|:(/]\s*|\s[-—]\s+)?([А-ЯЄІЇҐ])(?![А-ЯЄІЇҐA-Z])([а-яєіїґ'’-][А-ЯЄІЇҐа-яєіїґ'’-]*)?/g,
      (
        m,
        start: string | undefined,
        first: string,
        rest: string | undefined,
        at: number,
      ) =>
        start !== undefined || at === 0
          ? m
          : first.toLowerCase() + (rest || ""),
    );
  }
  return out;
}
// ➤ A Spanish or Catalan adjective after a job in the plural, in the plural too («Operarios de producción polivalentes»,
// ➤ «Enginyers qualificats»); not the levels said as English («júnior», «sènior»), nor a phrase («con experiencia»).
const PLURAL_JOB =
  /^\p{L}+(?:os|as|ores|eros|es|ors|ers|ics|aris|ats|ants|ents|aps)(?![\p{L}])/iu;
const INVARIABLE = /^ (?:júnior|junior|sénior|sènior|senior)$/;
// ➤ A woman's job as Spanish and Catalan write it («Enfermera», «Técnica», «Arquitecta»); not one for both («Especialista»).
const FEMININE_JOB = {
  es: /^\p{L}*(?:er|or|ad|ic|an|in|ect|ólog)as?(?![\p{L}])/iu,
  ca: /^\p{L}*(?:er|or|ad|ic|an|in|ect|òlog)(?:a|es)(?![\p{L}])/iu,
};
// ➤ French: after a job in the plural («Électriciens», «Opérateurs»), each adjective too («jeunes diplômés»,
// ➤ «principaux»); not an adverb («hautement») nor a phrase («par intérim», «confirmé ou senior»).
function agreeingFr(word: string, job: string): string {
  if (
    !/^\p{L}+[sx](?![\p{L}])/u.test(job) ||
    !/^(?: [\p{L}-]+)+$/u.test(word) ||
    /\s(?:par|de|ou)\s/u.test(word)
  )
    return word;
  return word.replace(/[\p{L}-]+/gu, (w) =>
    /(?:ment|[sx])$/u.test(w)
      ? w
      : /al$/u.test(w)
        ? w.slice(0, -2) + "aux"
        : w + "s",
  );
}
function agreeing(
  word: string,
  job: string,
  table: Record<string, Say>,
): string {
  if (table === LEVEL_SAY.fr) return agreeingFr(word, job);
  const spanish = table === LEVEL_SAY.es;
  if (
    (!spanish && table !== LEVEL_SAY.ca) ||
    // ➤ One word, or words that are all adjectives («recent titulat»), not a phrase («oficial de primera»).
    !/^(?: [\p{L}·]+)+$/u.test(word) ||
    /\s(?:de|del|a|en|per|amb|con)\s/u.test(word) ||
    INVARIABLE.test(word)
  )
    return word;
  // ➤ After a woman's job, the woman's form («Enfermera titulada», «Infermera titulada»), then her plural.
  if (FEMININE_JOB[spanish ? "es" : "ca"].test(job))
    word = spanish
      ? word.replace(/o$/, "a")
      : word.replace(/([aiu])t$/, "$1da");
  if (!PLURAL_JOB.test(job)) return word;
  if (!spanish && /a$/.test(word)) return word.slice(0, -1) + "es";
  if (/[aeiouáéó]$/.test(word)) return word + "s";
  if (/[lrntc]$/.test(word)) return word + (spanish ? "es" : "s");
  if (!spanish && /í$/.test(word)) return word.slice(0, -1) + "ins";
  return word;
}
// ➤ A German job that is a woman or a feminine noun: «-in», «-kraft», «-leitung», «-hilfe», «-person» and the like.
const FEMININE_DE =
  /^\S*?(?:in|innen|kraft|kräfte|leitung|hilfe|person|ung|schaft)(?![\p{L}])/u;
// ➤ German joins a level to the job's word with a hyphen («Allround-Monteur», «Elektriker-Helfer»), not before a
// ➤ declined adjective («Allround Industrieller Mechaniker», «Helfer Technischer Zeichner»): a word apart there.
const DECLINED_DE = /^\p{Lu}\p{Ll}+(?:ischer|licher|eller|aler|iver)\s/u;
const NO_HELFER =
  /^\S*(?:leiter|leiterin|ingenieur|ingenieurin|fachkraft|manager|kaufmann|kauffrau)(?![\p{L}])/iu;
function joined(word: string, out: string): string {
  const prefix = word.endsWith("-");
  if (DECLINED_DE.test(out))
    return prefix ? word.slice(0, -1) + " " + out : word.slice(1) + " " + out;
  return prefix ? word + out : out.replace(/^\S+/u, (head) => head + word);
}
// ➤ Each level said in front goes before the ones said already: the one closest to the job first, glued («Allround-
// ➤ Schweißer») or «allround», so another goes before it («Erfahrener Allround-Schweißer», «Ervaren allround lasser»).
const closestFirst = (
  levels: string[],
  table: Record<string, Say>,
): string[] => {
  const closest = (lv: string) =>
    table[lv]?.[1] === "joined" ||
    (lv === "Multi-skilled" && table[lv]?.[1] !== "after");
  return [...levels.filter(closest), ...levels.filter((lv) => !closest(lv))];
};
export function sayLevels(
  out: string,
  levels: string[],
  table: Record<string, Say>,
  src = "",
): string {
  for (const lv of closestFirst(levels, table)) {
    const say: Partial<Say> = table[lv] || [],
      english = say[2];
    let [word, where] = say;
    // ➤ Two levels for one post ("Senior/Principal"): each language's two words with the slash, "sénior/principal".
    const two =
      !word && lv.includes("/") ? lv.split("/").map((p) => table[p]) : null;
    if (two && two.every((p) => p && p[1] === "after")) {
      word = " " + two.map((p) => p[0].trim()).join("/");
      where = "after";
    }
    if (!word) continue;
    if (where === "after") {
      // ➤ The end of the job and its words: the first separator, or a place ("en Madrid", "à Lyon").
      // ➤ Or a workload ("Ingeniero de Sistemas 80-100% sénior" put it after one).
      // ➤ Or a full stop after a word ("Ingeniero de producción. Trabajo en Havant").
      // ➤ Or a slash or a hyphen joined to the word before, between two jobs ("Mecánico de automóviles/ Inspector de
      // ➤ vehículos jefe"); not an ampersand, which also joins two names in front of the job ("Intune & M365").
      // ➤ Or a colon, a spoken language («de parla neerlandesa») or «prop de» a town.
      const m = out.match(
        /\s[–|-]\s|\s?\(|,\s|(?<=\p{Ll}{3})\.\s|\s?\/\s|(?<=\p{L})-\s|\s(?=\d{1,3}(?:\s?[-–]\s?\d{1,3})?\s?%)|\s(?:en|à|dans)\s(?!marcha|marxa|service|servei)|\s(?=x\d+(?![\p{L}]))|\s(?:a|in|bei|op)\s(?=\p{Lu})|\s(?:con|amb|avec|with|mit|met|para|per|pour|for|sin|sense|sans|without)\s|\s?:\s|\sde\s+(?:parla|habla)\s|\sprop\s+de\s/u,
      );
      const at = m ? m.index : out.length;
      out = out.slice(0, at) + agreeing(word, out, table) + out.slice(at);
    } else if (where === "adjective") {
      // ➤ Polish: the adjective, and the job after it in small letters ("Starszy inżynier danych"); before an English name
      // ➤ Firefox kept, one the English title holds, the level as the English title says it ("Senior Data Scientist", not
      // ➤ "Starszy data Scientist"), or the adjective with the name as it is.
      const first = out.match(/^[\p{L}\d.#+]+/u)?.[0];
      if (
        first &&
        new RegExp(`(?<![\\p{L}])${escape(first)}(?![\\p{L}])`, "iu").test(src)
      )
        out = (english || word) + out;
      else out = word + lowerOpening(out, src);
    } else if (where === "joined") {
      // ➤ A helper of a trade, not of a manager, an engineer or a skilled worker («Bauleiter-Helfer»): «Assistent».
      out =
        word === "-Helfer" && NO_HELFER.test(out)
          ? "Assistent " + out
          : joined(word, out);
    } else {
      const rest = where === "lower" ? lowerOpening(out, src) : out;
      // ➤ Not a word the job already opens with («Chef chef de chantier»).
      if (rest.toLowerCase().startsWith(word.toLowerCase())) continue;
      // ➤ A German adjective agrees with a feminine job ("Erfahrene Fachkraft", "Leitende Ingenieurin").
      if (/\p{Ll}er $/u.test(word) && FEMININE_DE.test(rest))
        word = word.slice(0, -3) + "e ";
      // ➤ Catalan "de" before a vowel: "Ajudant d'electricista".
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
// ➤ German jobs in -er are the same in the singular and the plural, and Firefox often picks the plural
// ➤ ("Industriemechaniker in Nürnberg" → "Industrial mechanics in Nuremberg"): a title names one person.
export const HEAD_END =
  /\s[–|-]\s|\s?\(|\s(?:in|for|at|with|from|on|of|as|to|by|including|wanted|needed|sought|required|full-time|part-time)\b/iu;
