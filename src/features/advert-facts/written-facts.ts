import { sentences } from "../../shared/kit/sentences.js";
import {
  type Contract,
  contractCode,
  contractKind,
  contractOfCode,
  foldedLines,
  KIND_OR_TIME,
  oneSaid,
  workingTime,
  type WorkingTime,
  workingTimeCode,
  workingTimeOfCode,
} from "./contract.js";

// The contract and hours as the text writes them (what the contract reader reads), the years as a
// number; each only when every such field agrees.
interface LabelledFacts {
  contract?: string;
  hours?: string;
  years?: number;
}

// What writtenFacts reads of an advert.
export interface WrittenAdvert {
  readonly title: string;
  readonly description: string;
  readonly source: string;
}

// The contract and working time an advert writes outside its source's fields: in a labelled line
// of its text, a line that is only the value, a sentence, a part of its title, or its hours a
// week (legacy builder/lib/labels.mjs writtenFacts, without the page's HTML fields), and agency
// work its text states as such (builder/normalise.mjs). Word for word but for types.

const CONTRACT =
  "art der stelle|stellenart|contrat|type de contrat|nature du contrat|type d'offre|type d’offre|contract|contract type|type of contract|type of employment|employment type|employment types|job type|job types|emp type|worker type|worker sub-type|employee type|position type|worker sub type|worker subtype|vertragsart|anstellung|anstellungsart|beschäftigungsart|beschaftigungsart|art der anstellung|befristung|tipo de contrato|tipo contrato|contrato|tipo di contratto|contratto|contractvorm|contracttype|type contract|dienstverband|statuut|job statuut|typ umowy|rodzaj umowy|anställningsform|ansättelsesform|vrsta zaposlenja|druh pracovního poměru|tipo de vínculo";
const HOURS =
  "art der stelle|stellenart|temps de travail|durée du travail|durée hebdomadaire de travail|temps plein|working hours|work hours|hours|working time|arbeitszeit|beschäftigungsart|beschaftigungsart|pensum|beschäftigungsgrad|jornada|tipo de jornada|horario|orario|orario di lavoro|aantal uren|aantal uren per week|werktijden|werkregime|arbeidsovereenkomst|uren|wymiar etatu|wymiar pracy|arbetstid|omfattning|radno vrijeme|úvazek|time type|employment type|employment types|job type|job types|type of employment|contract type|contracttype|type";
const EXPERIENCE =
  "expérience|experience|experience required|years of experience|berufserfahrung|erfahrung|ervaring|werkervaring|experiencia|esperienza|doświadczenie|erfarenhet|radno iskustvo|praxe";
// A value ends where the next field of the same line begins (Workday's «Job Type: Regular Pay Type: Hourly»: 68 adverts).
const NEXT_FIELD =
  "\\s+(?:pay type|time type|shift|schedule|location|salary|department|category|job family|req(?:uisition)? id|job id|posting date|start date|country|contact|closing date|duration|contract type|reference)\\s*:";
const label = (list: string) =>
  new RegExp(
    `(?:^|\\|)\\s*(${list})\\s*(?::\\s*\\|?|\\|)\\s*([^|]{1,80}?)\\s*(?=\\||$|${NEXT_FIELD})`,
    "gi",
  );
const LABELS = {
  contract: label(CONTRACT),
  hours: label(HOURS),
  years: label(EXPERIENCE),
};
// The years a value names: "3-5 jaar", «2 à 5 ans», "5+ years", «mindestens 3 Jahre»; not an age, nor months alone.
const YEARS =
  /(?<![\d.,])(\d{1,2})\s*(?:\+|-|–|à|a|to|bis|tot|do)?\s*(?:\d{1,2})?\s*(?:jahre?n?|ans?|years?|yrs?|jaar|jaren|años?|anni|anos|lat|år|godin\w*|let|roky)\b/i;

// The same fields where an advert's text writes them as lines of their own, as many boards' texts do ("Job Type:
// Full-time, Permanent", «Type de contrat : CDI», «Arbeitszeit: Vollzeit»), or as the parts a feed joins with " · ".
// Only a part with a colon can be such a field.
export const labelledInText = (text: string): LabelledFacts =>
  factsOf(
    `| ${String(text || "")
      .split(/\n+| · | \| /)
      .map((l) => l.trim())
      .filter((l) => l.length < 160 && l.includes(":"))
      .join(" | ")} |`,
  );

// A permanent or temporary contract, or a working time, that a sentence of the text states when no labelled or lone line
// did («AUDI recrute un Mécanicien Automobile H/F, en CDI», «Wir suchen ab sofort, unbefristet und in Vollzeit…»; the
// owner's choice, 1 November 2026). A sentence counts when it names one kind (or one working time) and no trap: a chance
// or a later step («Kans op vast contract», «possibilité d'obtenir un CDI après»), a denial («keine
// Arbeitnehmerüberlassung») or a choice («CDI ou CDD», «Voll- und Teilzeit»); and the text's clear sentences must agree.
// Internships, agency work and freelancing are not read so: «abgeschlossene Ausbildung» is a degree asked, «B2B SaaS» a
// market (the offers' diary, 1 November 2026). Nor an agency's or a company's own line («contract hire and permanent
// placements», «permanent establishment», «des milliers en CDI»: the whole store's sample, 6 November 2026), nor a
// benefit or a permit said per full-time employee ("vision coverage for full time employees", «25 vakantiedagen bij een
// fulltime dienstverband», "authorized to work … on a full time basis": the second sample), nor the office kept full time
// ("most of our teams work from the office full time"), a part-time option («du kannst … Teilzeit arbeiten»), a contract
// that comes later («vanaf je een vast contract hebt») or a student wanted besides (the sixth sample).
// docs/research/contract-type.md.
// Also a hedge («in der Regel einen unbefristeten Arbeitsvertrag», "usually"), Dutch «of» between two kinds («een flexibele
// of meer vast dienstverband») and positions in general ("the security offered by permanent positions"): the free-label
// bench, 9 November 2026.
const TRAP =
  /(?<![a-z])(?:in der regel|in de regel|as a rule|usually|generally|in general|normalerweise|en general|en regle generale|(?:vast\w*|tijdelijk\w*|flexibel\w*|interim) (?:\w+ ){0,2}of (?:\w+ ){0,2}(?:vast\w*|tijdelijk\w*|flexibel\w*)|permanent (?:positions|roles|jobs)|vaste banen|unbefristete stellen|postes en cdi|possib\w*|posibilidad\w*|mogl\w*|moegl\w*|mogelijk\w*|kans op|uitzicht|vooruitzicht|optie|option\w*|perspectiv\w*|prospect\w*|apres|nach der probezeit|nach der ausbildung\w*|nach erfolgreich\w*|after (?:your |the )?(?:training|apprenticeship)|na de opleiding|na (?:een )?(?:geslaagde|succesvolle|positieve|goede)|interimperiode|zicht op|stap naar|geeignet|suitable|teil ?\/ ?vollzeit|voll ?\/ ?teilzeit|spater\w*|later|ubernahme|conversion|convertible|eventuel\w*|evolution|keine?n?|nicht|not|sans|pas de|geen|ningun\w*|oder|ou|or|bzw|either|eller|lub|albo|nebo|oppure|voll (?:und|oder|bzw) teilzeit|establishment|placements|vacancies|milliers|thousands|tausende|duizenden|employees|time offers|authori[sz]ed to work|pay period|vakantiedagen|adv dagen|both|arbeitszeitmodell\w*|teilzeitmodell\w*|aussicht\w*|opportunity to|mojlighet\w*|mulighed\w*|mulighet\w*|mahdollisuu\w*|prorat\w*|pro rata|eligible|for all|roles are|positions are|team members|(?:to|for) (?:all |our )?(?:full|part) ?time (?:associates|staff|colleagues|workers|team)|contract hebt|once you|(?:from|in|at) (?:the |our )?offices? full ?time|full ?time (?:from|in|at) (?:the |our )?offices?|(?:kannst|konnen|kann|can|kun je|kunt|puedes|peux|pouvez)(?: [a-z0-9]+){0,14} (?:teilzeit|part ?time|deeltijd|media jornada|temps partiel)|employment agency|recruitment agency|employment business|empresa de trabajo temporal|agence d interim|zeitarbeitsfirma|uitzendbureau|(?:temporary|permanent) (?:[a-z]+ )?(?:and|or) (?:permanent|temporary|contract)|vollzeit (?:und|oder|bzw) teilzeit\w*|teilzeit (?:und|oder|bzw) vollzeit\w*|(?:full|part) ?time (?:and|or) (?:part|full) ?time)(?![a-z])/;
// «permanent», «temporary», «tijdelijk», «temporal», «unlimited» name a contract only beside a word of one ("a permanent,
// full-time position", «contrato temporal», «tijdelijke functie»): «le progrès permanent», «tijdelijke nutsvoorzieningen»
// (temporary works), "unlimited PTO" name none.
const LOOSE =
  "(?:permanent|permanente|temporary|temporaire|temporal|temporale|temporaneo|tijdelijke?|unlimited|remplacement|vervanging)";
const OF_A_JOB =
  "(?:contracts?|contrat|contrato|contratto|kontrakt|vertrag|positions?|role|job|post|employment|basis|hire|poste|emploi|empleo|puesto|trabajo|baan|functie|dienstverband|aanstelling|opdracht|stelle|anstellung|arbeitsplatz|beschaftigung|assignment|mission)";
const LOOSE_WORD = new RegExp(`(?<![a-z])${LOOSE}(?![a-z])`, "g");
const LOOSE_BESIDE = new RegExp(
  `(?<![a-z])(?:${LOOSE}\\W+(?:[a-z]+\\W+){0,2}?${OF_A_JOB}|${OF_A_JOB}\\W+(?:[a-z]+\\W+){0,2}?${LOOSE})(?![a-z])`,
  "g",
);
const firmOnly = (f: string): string => {
  const beside = new Set<number>();
  for (const m of f.matchAll(LOOSE_BESIDE))
    for (let i = m.index; i < m.index + m[0].length; i++) beside.add(i);
  return f.replace(LOOSE_WORD, (w: string, at: number) =>
    beside.has(at) ? w : " ".repeat(w.length),
  );
};
const SENTENCE_MOST = 300;
// The contract phrases read inside a run of words: a permanent or a fixed-term contract, employment or post, and the label
// «Type (de) contrat : CDI / CDD».
const RUN_ON_CONTRACT =
  /(?<![a-z])(?:unbefristete[nrs]? (?:arbeitsvertrag|arbeitsverhaltnis|anstellung|festanstellung|arbeitsplatz|stelle|beschaftigung)|befristete[nrs]? (?:arbeitsvertrag|arbeitsverhaltnis|anstellung|stelle)|type (?:de )?contrat ?: ?(?:cdi|cdd)|(?:permanent|fixed term) (?:contract|employment|position)|contrato (?:indefinido|temporal)|vast (?:contract|dienstverband)|tijdelijk (?:contract|dienstverband))(?![a-z])/g;
// A working time in a sentence of more than eight words counts only when the sentence speaks of the job ("This is a
// full-time position"), not of a benefit, a bonus or a pay said per full-time role (the fourth sample).
const OF_THE_JOB =
  /(?<![a-z])(?:position|role|job|post|vacancy|stelle|arbeitsplatz|anstellung|vertrag\w*|poste|emploi|contrat|puesto|empleo|trabajo|contrato|lavoro|contratto|posizione|praca|stanowisko|umowa|baan|functie|vacature|dienstverband|contract|tjanst\w*|anstallning|stilling|job\w*|werk\w*|work\w*|arbeit\w*|travail\w*|trabaj\w*|lavor\w*|such\w*|recrut\w*|busca\w*|cerc\w*|zoek\w*|hiring|seeking|looking for|cdi|cdd|offr\w*|propos\w*|bieten|ofrec\w*|offri\w*|bied\w*|oferuj\w*|offer\w*|verstark\w*|in (?:voll|teil) ?zeit)(?![a-z])/;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const HOURS_WORD =
  /(?<![a-z])(?:h|hrs?|hours?|heures?|stunden|std|wochenstunden|uur|uren|horas?|ore|timmar|godzin\w*)(?![a-z])/;
const PROSPECT =
  /(?<![a-z])(?:uitzicht|vooruitzicht|kans|optie|option|perspectief|zicht op|bij goed (?:functioneren|presteren))(?![a-z])/g;
// The traps that make a working time a choice, a denial or a prospect («Vollzeit oder Teilzeit», "not full-time", «Teilzeit
// möglich»): they count only within four words of the working time; further off they speak of something else ("this
// full-time, and exempt position is $100,000 not including variable compensation"). The free-label bench, 9 November 2026.
const NEAR_TRAP =
  /(?<![a-z])(?:or|oder|ou|bzw|either|eller|lub|albo|nebo|oppure|not|nicht|keine?n?|sans|pas de|geen|ningun\w*|possib\w*|posibilidad\w*|mogl\w*|moegl\w*|mogelijk\w*|optie|option\w*|perspectiv\w*|prospect\w*|later|spater\w*|eventuel\w*)(?![a-z])/g;
function trapsFar(f: string): boolean {
  if (TRAP.test(f.replace(NEAR_TRAP, (m) => " ".repeat(m.length))))
    return false;
  const wordAt = (i: number) => f.slice(0, i).split(/\s+/).length;
  const times = [...f.matchAll(TIME_WORD)].map((m) => [
    wordAt(m.index),
    wordAt(m.index + m[0].length),
  ]);
  if (!times.length) return false;
  return [...f.matchAll(NEAR_TRAP)].every((m) => {
    const w = wordAt(m.index);
    return times.every(([a, b]) => w < a - 4 || w > b + 4);
  });
}
// A start as soon as possible names no possibility of the contract or the hours («Un poste en CDI à pourvoir dès que
// possible», "to start as soon as possible", «so bald wie möglich»): its words are no trap (the free-label bench, 9 November
// 2026).
const START_SOON =
  /(?<![a-z])(?:des que possible|le plus tot possible|as soon as possible|so ?bald (?:wie|als) (?:moglich|moeglich)|schnellstmoglich|schnellstmoeglich|lo (?:antes|mas pronto) posible|a la mayor brevedad posible|zo snel (?:als )?mogelijk|(?:il )?prima possibile)(?![a-z])/g;
export function inSentences(text: string): LabelledFacts {
  const kinds = new Map<string, string>(),
    times = new Map<string, string>();
  for (const s of sentences(String(text || ""))) {
    // Not a bare figure («57», a French department, came back as 57 hours) nor a question ("Looking for a new permanent
    // job?"): the third sample.
    if (s.length > SENTENCE_MOST || !/\p{L}{3}/u.test(s) || /\?\s*$/.test(s))
      continue;
    const f = foldedLines(s)
      .toLowerCase()
      .replace(START_SOON, (m) => " ".repeat(m.length));
    // A temporary start with a prospect of a permanent contract («Je krijgt direct uitzicht op een vast contract», «Kans op
    // een vast contract bij goed functioneren»): read as such, though the prospect's words are traps for a permanent one.
    // Dutch boards state these as temporary in their fields (the free-label bench, 9 November 2026).
    const prospect = contractKind(f);
    if (
      (prospect === "to" || prospect === "eo") &&
      !TRAP.test(f.replace(PROSPECT, " ")) &&
      !/\?\s*$/.test(s)
    ) {
      if (!kinds.has(prospect)) kinds.set(prospect, s.trim());
      continue;
    }
    if (!KIND_OR_TIME.test(f)) continue;
    // A sentence whose only traps are choice, denial or prospect words far from its working time states that time
    // (not its contract): «in Vollzeit in Grevenkrug oder Stocksee», "a full-time role … with the option to work remote".
    const trapped = TRAP.test(f),
      hoursOnly = trapped && trapsFar(f);
    if (trapped && !hoursOnly) continue;
    // «Étudiant» is a student's contract only as one («job étudiant», «contrat étudiant»), not a student wanted.
    const parts = firmOnly(f)
      .replace(
        /(?<!(?:job|contrat|statut) )(?<![a-z])etudiants?(?![a-z])/g,
        (m) => " ".repeat(m.length),
      )
      .split(/[;:|·•–—()]|,(?!\d)/);
    const k = new Set(parts.map((p) => contractKind(p)).filter(Boolean));
    const kind = k.size === 1 && !hoursOnly ? [...k][0] : "";
    if (/^(?:i|t\d*)$/.test(kind) && !kinds.has(kind))
      kinds.set(
        kind,
        parts.find((p) => contractKind(p) === kind)?.trim() ?? "",
      );
    // A bare figure after a label is hours only where the sentence speaks of hours: «Département : 22» is a place.
    // A part of five words or fewer that is a working time is one in a long sentence too ("Full Time – £Competitive + Door to
    // Door + Overtime", "Hampstead, NC - Regular Full-Time").
    const t = new Set(
      parts
        .filter(
          (p) =>
            (words(f) <= 8 || OF_THE_JOB.test(f) || words(p) <= 5) &&
            (!/^\s*\d+(?:[.,]\d+)?\.?\s*$/.test(p) || HOURS_WORD.test(f)),
        )
        .map((p) => workingTime(p))
        .filter(Boolean),
    );
    const time = t.size === 1 ? [...t][0] : "";
    if (time && !times.has(time[0]))
      times.set(
        time[0],
        parts.find((p) => workingTime(p) === time)?.trim() ?? "",
      );
  }
  // A page with no full stops writes its contract inside a run of words over 300 characters («Das bieten wir Dir: …
  // Unbefristeter Arbeitsvertrag Umfassendes Benefit-Programm …», «Type contrat : CDI Temps de travail : Temps plein»):
  // its own phrase is read there, judged by the words around it, when no shorter sentence said a contract (the free-label
  // bench, 9 November 2026: German contracts found on 88 % of the adverts that surely state them).
  if (!kinds.size) {
    const runOn = new Set<string>();
    for (const s of sentences(String(text || ""))) {
      if (s.length <= SENTENCE_MOST) continue;
      const f = foldedLines(s)
        .toLowerCase()
        .replace(START_SOON, (m) => " ".repeat(m.length));
      for (const m of f.matchAll(RUN_ON_CONTRACT)) {
        const near = f.slice(
          Math.max(0, m.index - 60),
          m.index + m[0].length + 60,
        );
        if (TRAP.test(near)) continue;
        runOn.add(contractKind(m[0]));
      }
    }
    runOn.delete("");
    if (runOn.size === 1)
      kinds.set(
        [...runOn][0],
        [...runOn][0] === "i" ? "unbefristet" : "befristet",
      );
  }
  return {
    ...(oneSaid(kinds) ? { contract: oneSaid(kinds) } : {}),
    ...(times.size === 1 ? { hours: [...times.values()][0] } : {}),
  };
}

// A contract a title names in a part of its own, set off by a dash or brackets ("Ingeniero DevOps Senior - CDI -
// Mónaco", "Architecte Solutions [CDI]", «Stage - Ingénieur méthodes»); a title in one piece says nothing ("Stage
// Manager"), nor one whose parts name two kinds.
// "Contract" only as a part of its own ("Writer (Contract)"): beside other words it is a role ("Contract Manager").
// "B2B" in a title is mostly a market ("Marketing Manager | B2B"), "Interim" an English temporary post, not an agency's.
const ONLY_ALONE = /(?<![a-z0-9])contracts?(?![a-z0-9])/gi;
const NOT_IN_TITLES = /(?<![a-z0-9])(?:b2b|interim)(?![a-z0-9])/gi;
export function contractInTitle(title: string): string {
  const parts = String(title || "")
    .split(/\s[-–—|/]\s|[()[\]]/)
    .map((s) => s.replace(NOT_IN_TITLES, " ").trim())
    .filter(Boolean);
  if (parts.length < 2) return "";
  const said = parts
    .map((p) =>
      p.split(/\s+/).length > 1 ? p.replace(ONLY_ALONE, " ").trim() : p,
    )
    .filter((p) => p && p.split(/\s+/).length <= 4 && contractKind(p));
  return new Set(said.map((p) => contractKind(p))).size === 1 ? said[0] : "";
}

// A line that offers both times, in their own words («Vollzeit, Teilzeit», "Full-time · 40 hrs/week or Part time"),
// says neither: the card showed one of them (the readers, 2 November 2026). The words themselves, not their stems,
// which «Vorteile» or «volle» would match.
const FULL_TIME =
  /(?<![\p{L}])(?:voll ?zeit\p{L}*|full[ -]?time|temps (?:plein|complet)|tiempo completo|jornada completa|voltijd|tempo pieno|heltid|fuldtid)/iu;
const PART_TIME =
  /(?<![\p{L}])(?:teil ?zeit\p{L}*|part[ -]?time|temps partiel|tiempo parcial|media jornada|jornada parcial|deeltijd|tempo parziale|deltid)/iu;
const TIME_WORD = new RegExp(
  `${FULL_TIME.source}|${PART_TIME.source}|(?<![\\d.,])\\d{1,2}(?:[.,]\\d{1,2})? ?(?:h|hrs?|hours?|heures?|stunden|std|uur|uren|horas?|ore|timmar)(?![a-z])`,
  "giu",
);
// A form's label that lists both as its options says nothing; its value does («Full Time / Part Time: Full-time»,
// «Fulltime/ parttime: De functie is fulltime»).
const OPTIONS =
  /^\s*(?:full[ -]?time|part[ -]?time|voltijd|deeltijd|voll ?zeit|teil ?zeit)\s*\/\s*(?:full[ -]?time|part[ -]?time|voltijd|deeltijd|voll ?zeit|teil ?zeit)\s*:/iu;
const bothTimes = (s: string) => {
  const v = s.replace(OPTIONS, "");
  return FULL_TIME.test(v) && PART_TIME.test(v);
};
// A working time the title names («Elektriker (m/w/d) Vollzeit», «Sales Advisor (Part-time)», «Mitarbeiter Lager & Technik
// in Vollzeit»), when no labelled line of the text said it: a title names the job, so a time in it is the job's. Not a
// choice of both («Voll- u. Teilzeit», «temps plein ou partiel», «jornada completa o parcial»). The free-label bench of
// 9 November 2026 (docs/research/indudex-lector.md): on 26,944 English and 13,520 German adverts whose source states
// the hours in a field, the title agreed with it on 95 and 97 %, and eleven of twelve disagreements judged were the
// field's (FULL_TIME on a part-time title, a system's default).
const BOTH_IN_ONE =
  /voll\s*-\s*(?:u\.?|und|oder|bzw\.?|\/|&)\s*teilzeit|teil\s*-\s*(?:u\.?|und|oder|bzw\.?|\/|&)\s*vollzeit|(?:plein|complet)\s+(?:ou|et|\/)\s+partiel|partiel\s+(?:ou|et|\/)\s+(?:plein|complet)|completa\s+(?:o|y|\/)\s+parcial|parcial\s+(?:o|y|\/)\s+completa|full\s*-?\s*(?:or|and|\/|&)\s*part|part\s*-?\s*(?:or|and|\/|&)\s*full|voltijd\s*(?:of|en|\/)\s*deeltijd|deeltijd\s*(?:of|en|\/)\s*voltijd/;
const lower = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/ß/g, "ss");
export const hoursInTitle = (title: string): string =>
  BOTH_IN_ONE.test(lower(title)) || !workingTime(title) ? "" : String(title);
// Hours a week written anywhere in the title or the text, also in a page with no full stops («… Selbstverständlichkeit
// Arbeitszeit: 40,00 Stunden pro Woche …», «Een afwisselende functie voor 16 tot 24 uur per week»): 35 to 60 full
// time, 4 to 30 part time, only when every such figure of the advert says the same; 31 to 34 says neither (a short full
// week or a long part one). A label before the figure says it too («Weekly Hours: 39 hrs», «Wochenarbeitszeit:
// 40»). On the bench, 92 to 93 % agreeing with the source's field in English and German, 99 % in French (9 November
// 2026).
const HOURS_A_WEEK =
  /(?<![\d.,])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:(?:-|–|bis|to|a|tot|à)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*)?(?:h|hrs?|hours?|horas|hores|heures|stunden|std|uur|uren|ore|timmar|godz\w*)\.?\s*(?:\/|per|pro|par|a la|por|in der|a|la|w)?\s*(?:week|woche|wochentlich|semana|semanales|setmana|semaine|hebdo\w*|settimana\w*|vecka|uge|tydz\w*)(?![a-z])|(?<![\d.,])(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:(?:-|–|bis|to|a|tot)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*)?(?:wochenstunden|stundenwoche|horas semanales|heures hebdomadaires|weekly hours|godzin tygodniowo)|(?:weekly hours|wochenarbeitszeit|hours per week|horas semanales|heures hebdomadaires|uren per week|uur per week)\s*[:\-–]?\s*(\d{1,2}(?:[.,]\d{1,2})?)(?![\d.,]*\s*%)/g;
export function hoursAWeek(title: string, text: string): string {
  const said = new Set<string>();
  let top = 0;
  for (const m of lower(`${title}\n${text}`).matchAll(HOURS_A_WEEK)) {
    const nums = [m[1], m[2], m[3], m[4], m[5]]
      .filter(Boolean)
      .map((x) => Number(x.replace(",", ".")));
    const high = Math.max(...nums),
      low = Math.min(...nums);
    if (high >= 35 && high <= 60 && low >= 30) said.add("c");
    else if (high <= 30 && low >= 4) said.add("p");
    else said.add("neither");
    top = high;
  }
  return said.size === 1 && !said.has("neither")
    ? `${Math.round(top)} hours per week`
    : "";
}
export function writtenFacts(
  raw: WrittenAdvert,
  text = raw.description,
): { ct?: string; wt?: string } {
  const f = labelledInText(raw.description);
  const lone: LabelledFacts =
    !f.contract || !f.hours ? loneInText(raw.description) : {};
  const said: LabelledFacts =
    (!f.contract && !lone.contract) || (!f.hours && !lone.hours)
      ? inSentences(text)
      : {};
  const contract =
    f.contract || contractInTitle(raw.title) || lone.contract || said.contract;
  const both = String(raw.description || "")
    .split("\n")
    .some((l) => l.length < 160 && bothTimes(l));
  const hours = both
    ? ""
    : f.hours ||
      lone.hours ||
      hoursInTitle(raw.title) ||
      said.hours ||
      hoursAWeek(raw.title, text);
  const out: { ct?: string; wt?: string } = {};
  if (contract) out.ct = contractKind(contract, raw.source);
  if (hours) out.wt = workingTime(hours);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

// Every run of blanks one space first: a label's value could otherwise split a long run many ways (DAB-01: 140 blank
// lines took minutes).
function factsOf(raw: string): LabelledFacts {
  const text = raw.replace(/\s+/g, " ");
  const found = {
    contract: new Map<string, string>(),
    hours: new Map<string, string>(),
    years: new Set<number>(),
  };
  // A contract's value may name the hours too («CDI - Temps plein»).
  for (const m of text.matchAll(LABELS.contract)) {
    const code = contractKind(m[2]),
      wt = workingTime(m[2]);
    if (code && !found.contract.has(code)) found.contract.set(code, m[2]);
    if (wt && !found.hours.has(wt)) found.hours.set(wt, m[2]);
  }
  for (const m of text.matchAll(LABELS.hours)) {
    const said = workingTime(`${m[1]} ${m[2]}`)
      ? `${m[1]} ${m[2]}`
      : workingTime(m[2])
        ? m[2]
        : "";
    const code = said && workingTime(said);
    if (code && !found.hours.has(code)) found.hours.set(code, said);
  }
  for (const m of text.matchAll(LABELS.years)) {
    const y = m[2].match(YEARS);
    if (y && !/\b(alt|old|âge|edad|age)\b/i.test(m[2]))
      found.years.add(Number(y[1]));
  }
  const out: { contract?: string; hours?: string; years?: number } = {};
  if (oneSaid(found.contract)) out.contract = oneSaid(found.contract);
  if (found.hours.size === 1) out.hours = [...found.hours.values()][0];
  if (found.years.size === 1) out.years = [...found.years][0];
  return out;
}
// The contract or working time a page shows as a field of its own with no label, as the employer's form gave it: a
// chip «Vollzeit», «Permanent», «CDI», "Full-time · Amersfoort" (docs/research/whole-advert.md). Read outside links
// only, as menus and filters are links, from parts of three words at most and no figure («12 Hours» is a shift, «20»
// anything), and only when the whole page names one such value; a part naming two contracts («CDI - Freelance») or
// both times says nothing. Permanent or temporary, full or part time: «Ausbildung» or «Interim» alone is mostly a menu
// or an agency's name.
const BOTH_TIMES =
  /(full|voll|plein|complet|completa|pieno|voltijd|plny|heltid|fuldtid|pelny).*(part|teil|partiel|parcial|deeltijd|zkraceny|deltid|niepelny)|(part|teil|partiel|parcial|deeltijd|zkraceny|deltid|niepelny).*(full|voll|plein|complet|completa|pieno|voltijd|plny|heltid|fuldtid|pelny)/;
const folded = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
// The values standing alone in a page's fields or a text's lines, each cut at its separators (`cut`).
// A workload written after the value («Festanstellung 80-100%», «Vollzeit 100 %») is set aside; a line of hours a week
// («32 - 40 uur per week») is the one value with figures read so (the text corpus, 1 November 2026).
const WORKLOAD = /\s*\d{1,3}\s*(?:[-–]|bis)?\s*(?:\d{1,3})?\s*%\s*$/;
const WEEK_HOURS =
  /^\d{1,2}(?:[.,]\d{1,2})?(?: (?:to |tot |bis )?\d{1,2}(?:[.,]\d{1,2})?)? ?(?:h|hrs?|hours?|heures|stunden|std|uur|uren|horas|ore|timmar)\.? ?(?:\/|per|par|pro|a la|a) ?(?:week|semaine|woche|semana|settimana|vecka|uge)$/;
function loneOf(fields: readonly string[], cut: RegExp): LabelledFacts {
  const contracts = new Map<string, string>(),
    times = new Map<string, string>();
  for (const field of fields
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 70)) {
    const parts = field
      .split(cut)
      .map((s) => s.trim().replace(WORKLOAD, ""))
      .filter((p) => {
        const f = folded(p);
        return (
          f &&
          ((f.split(" ").length <= 3 && !/\d/.test(f)) || WEEK_HOURS.test(f)) &&
          !BOTH_TIMES.test(f)
        );
      });
    if (new Set(parts.map((p) => contractKind(p)).filter(Boolean)).size > 1)
      continue;
    for (const p of parts) {
      const kind = contractKind(p),
        time = workingTime(p);
      // «Unlimited PTO», «Unlimited» alone: a benefit, not a contract.
      if (
        (kind === "i" || kind === "t") &&
        !contracts.has(kind) &&
        !/^unlimited\b/.test(folded(p))
      )
        contracts.set(kind, p);
      if ((time === "c" || time === "p") && !times.has(time))
        times.set(time, p);
    }
  }
  return {
    ...(contracts.size === 1 ? { contract: [...contracts.values()][0] } : {}),
    ...(times.size === 1 ? { hours: [...times.values()][0] } : {}),
  };
}

// The same in an advert's text: a line that is only the contract or the hours («Unbefristet · Vollzeit», «Vollzeit
// (Unbefristet)», «CDI», "Permanent"), never a sentence that names one. Against what the same page says in its block or
// a labelled field, 45 of 46 on the diary's kept pages; a contract or hours for 3 % of their cards (1 November 2026).
// Only a text's short lines are folded, once, as the contract reader folds a field, and only those that name a contract or
// the hours are read part by part.
export function loneInText(text: string): LabelledFacts {
  const short = String(text || "")
    .split(/\n| · /)
    .filter((l) => l.length > 1 && l.length < 70);
  // A line of facts set off by dashes («Vollzeit - ab sofort - unbefristet - Home Office 60 %») keeps its parts apart.
  const named = short.length
    ? foldedLines(short.join("\n").replace(/[ \t][-–—][ \t]/g, " · "))
        .split("\n")
        .filter(
          (l) =>
            KIND_OR_TIME.test(l) ||
            /\d ?(?:h|hrs?|hours?|heures|stunden|std|uur|uren|horas|ore|timmar)\.? ?(?:\/|per|par|pro|a la|a) ?(?:week|semaine|woche|semana|settimana|vecka|uge)/.test(
              l,
            ),
        )
    : [];
  return named.length
    ? loneOf(named, /\s[·•|/–—-]\s|\s·\s|,\s|\s*[()]\s*/)
    : {};
}

// Agency work as an advert states it: «im Rahmen der Arbeitnehmerüberlassung», or the word as a line or a field of its
// own («Vertragsart: Arbeitnehmerüberlassung»). A text that only mentions agency work, often to say it is none («keine
// Zeitarbeit») or as the agency's trade, does not count (half of 5,200 such texts on 7 November 2026).
const AGENCY_WORK =
  /im rahmen (?:der|einer) arbeitnehmer(?:ü|ue)berlassung|in arbeitnehmer(?:ü|ue)berlassung|^[ \t]*(?:(?:vertragsart|anstellungsart|beschäftigungsart|art der anstellung|anstellung|vertrag)[ \t]*:[ \t]*)?arbeitnehmer(?:ü|ue)berlassung[ \t]*$/imu;
const NOT_AGENCY_WORK = /kein\p{L}* (?:zeitarbeit|arbeitnehmer)/iu;
const STAY_WITH_CLIENT =
  /übernahme(?:option|möglichkeit|chance|garantie|perspektive)\p{L}*|option auf (?:eine )?übernahme|(?:möglichkeit|chance|aussicht)(?:en)? (?:auf|zur) (?:eine )?(?:direkte |feste )?übernahme/iu;

// A contract code made agency work when the text states it as such: «Unbefristet» is then the
// contract with the agency; with the option to stay where the text offers it; never where it says
// it is none («keine Zeitarbeit»). Only over none, a permanent or a temporary contract.
export const agencyWorkCode = (code: string, text: string): string =>
  /^(?:i|t\d*)?$/.test(code) &&
  AGENCY_WORK.test(text) &&
  !NOT_AGENCY_WORK.test(text)
    ? STAY_WITH_CLIENT.test(text)
      ? "eo"
      : "e"
    : code;

// An advert's contract and working time (publication FR-4): its source's fields first (`stated`,
// as the fact reader gives them), else what its text and title write; then agency work its text
// states. The legacy's toRecord: `{ ...writtenFacts(raw, text), ...contractOf(raw) }`.
export function contractAndTime(
  advert: WrittenAdvert,
  stated: {
    readonly contract: Contract | null;
    readonly workingTime: WorkingTime | null;
  },
): {
  readonly contract: Contract | null;
  readonly workingTime: WorkingTime | null;
} {
  const fromFields = {
    ct: contractCode(stated.contract),
    wt: workingTimeCode(stated.workingTime),
  };
  const written = !fromFields.ct || !fromFields.wt ? writtenFacts(advert) : {};
  const ct = agencyWorkCode(
    fromFields.ct || written.ct || "",
    advert.description,
  );
  const wt = fromFields.wt || written.wt || "";
  return {
    contract: ct ? contractOfCode(ct) : null,
    workingTime: wt ? workingTimeOfCode(wt) : null,
  };
}
