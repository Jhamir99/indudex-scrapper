// ➤ The facts a vacancy's page writes as labelled fields beside its text ("Contrat : CDI", «Beschäftigungsart: Vollzeit»,
// ➤ «Werkervaring: 3-5 jaar», "Job Type | Full Time"): a label of its list followed by its value, read only when the value
// ➤ is one the readers understand, and only when every such field of a fact agrees (docs/research/whole-advert.md). The
// ➤ big boards show the same facts as the employer's form gave them; a page that writes them is its own field.
// The legacy's builder/lib/labels.ts, copied (legacy resync T003): only its imports changed, and its `withLabels` left out (composed in src/bin/page-facts.ts). Its own comments keep their marks.
import {
  contractKind,
  foldedLines,
  KIND_OR_TIME,
  namesShare,
  ANY_KIND_WORD,
  KIND,
  WORKING_TIME,
  oneSaid,
  TEMPORARY_THEN_PERMANENT,
  AGENCY_THEN_PERMANENT,
  workingTime,
  withFiguresJoined,
  WEEKS_A_MONTH,
} from "./contract.js";
import { decodeEntities } from "../../shared/kit/entities.js";
import { foldLetters } from "../../shared/kit/fold.js";
import { sentences } from "../../shared/kit/sentences.js";
import { withoutOptions, withoutUnsaid } from "../../shared/words/stance.js";
import { anyOf, numbers, words } from "../../shared/words/index.js";

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ The readers' words are in the language tables (builder/words), one concept each. A concept's words as a page writes
// ➤ them, accented or not, for a label read in the page's text; or folded as `foldedLines` folds a sentence.
const asWritten = (...concepts: string[]) =>
  anyOf(new Set(concepts.flatMap((c) => words(c, { bare: true }))), "\\w*");
const foldedWords = (concept: string) =>
  words(concept, { folded: true }).map((w) => foldedLines(w).trim());
const asFolded = (concept: string) =>
  anyOf(new Set(foldedWords(concept)), "\\w*");
const wholeWord = (body: string, flags = "") =>
  new RegExp(`(?<![a-z])(?:${body})(?![a-z])`, flags);

// ➤ The page as "label | value |" runs: menus, headers, footers, forms, lists of choices and scripts out, every block's
// ➤ end a bar, a label's colon kept.
export function fieldText(html: unknown): string {
  return decodeEntities(
    String(html || "")
      .replace(
        /<(script|style|noscript|nav|header|footer|form|select|template|svg)[\s\S]*?<\/\1>/gi,
        " ",
      )
      .replace(
        /<\/(?:p|div|li|dt|dd|td|th|tr|h\d|span|label|strong|b)>|<br\s*\/?>/gi,
        " | ",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/(?:\s*\|\s*)+/g, " | ")
    .slice(0, 400000);
}

const CONTRACT = asWritten("contractLabel", "durationLabel");
const HOURS = asWritten("hoursLabel");
const EXPERIENCE = asWritten("experienceLabel");
// ➤ A value ends where the next field begins, a word or two capitalised followed by a colon (Workday's «Job Type: Regular
// ➤ Pay Type: Hourly», "CONTRACT: Full-time permanent position SALARY: €50,000"); in a line that runs on, by 80 characters.
const NEXT_FIELD = /\s+(?:\p{Lu}\p{L}*\s+)?\p{L}[\p{L}\p{N}()-]*\s*:(?!\d)/u;
const VALUE_MOST = 80;
// ➤ A field's label: at the start of a part ("Contrat | CDI", «Arbeitszeit: Vollzeit») or inside a line, with its colon
// ➤ («Ort: Ljungby Omfattning: Visstidsanställning»); what follows it looked at, not taken, as other labels may follow.
const label = (list: string): RegExp =>
  new RegExp(
    `(?:(?:^|\\|)\\s*(${list})\\s*(?::\\s*\\|?|\\|)|(?<=\\s)(${list})\\s*:)\\s*(?=([^|]{0,${2 * VALUE_MOST}}))`,
    "gi",
  );
function valueOf(rest: string): string {
  const end = rest.search(NEXT_FIELD);
  const value = (end < 0 ? rest : rest.slice(0, end)).trim();
  return value.length <= VALUE_MOST
    ? value
    : value.slice(0, VALUE_MOST).replace(/\s+\S*$/, "");
}
const fieldsOf = (text: string, re: RegExp): [string, string][] =>
  [...text.matchAll(re)].map((m): [string, string] => [
    m[1] ?? m[2],
    valueOf(m[3]),
  ]);
const DURATION = new RegExp(`^(?:${asWritten("durationLabel")})$`, "i");
const LABELS = {
  contract: label(CONTRACT),
  hours: label(HOURS),
  years: label(EXPERIENCE),
};
// ➤ The years a value names: "3-5 jaar", «2 à 5 ans», "5+ years", «3-5 év»; not an age («25 years old»), nor months alone.
const YEARS = new RegExp(
  `(?<![\\d.,])(\\d{1,2})\\s*(?:\\+|-|–|${asWritten("rangeJoin")})?\\s*(?:\\d{1,2})?\\s*(?:${asWritten("year")})(?![\\p{L}])`,
  "iu",
);
const AN_AGE = new RegExp(
  `(?<![\\p{L}])(?:${asWritten("ageAfterYears")})(?![\\p{L}])`,
  "iu",
);

// ➤ { contract, hours, years }: the contract and hours as the page writes them (what the contract reader reads), the years
// ➤ as a number; each only when every field of it on the page agrees.
type Facts = { contract?: string; hours?: string; years?: number };
type Lone = { contract?: string; hours?: string };
export const labelledFacts = (html: unknown): Facts => factsOf(fieldText(html));

// ➤ The same fields where an advert's text writes them as lines of their own, as many boards' texts do ("Job Type:
// ➤ Full-time, Permanent", «Type de contrat : CDI», «Arbeitszeit: Vollzeit»), as the parts a feed joins with " · ", or
// ➤ one after another in a line that runs on («Arbetstider: Måndag-fredag 7-16 Omfattning: Tillsvidaretjänst»). Only a
// ➤ part with a colon can be such a field.
export const labelledInText = (text: unknown): Facts =>
  factsOf(
    `| ${String(text || "")
      .split(/\n+| · | \| /)
      .map((l) => l.trim())
      .filter((l) => l.includes(":"))
      .join(" | ")} |`,
  );

// ➤ A permanent or temporary contract, or a working time, that a sentence of the text states when no labelled or lone line
// ➤ did («AUDI recrute un Mécanicien Automobile H/F, en CDI», «Wir suchen ab sofort, unbefristet und in Vollzeit…»; the
// ➤ owner's choice, 1 November 2026). A sentence counts when it names one kind (or one working time) as the job's own, not
// ➤ as an option, denied or one of a choice («Kans op vast contract», «keine Arbeitnehmerüberlassung», «CDI ou CDD»:
// ➤ builder/stance.ts), and no trap; and the text's clear sentences must agree.
// ➤ Internships, agency work and freelancing are not read so: «abgeschlossene Ausbildung» is a degree asked, «B2B SaaS» a
// ➤ market (the offers' diary, 1 November 2026). Nor an agency's or a company's own line («contract hire and permanent
// ➤ placements», «permanent establishment», «des milliers en CDI»: the whole store's sample, 6 November 2026), nor a
// ➤ benefit or a permit said per full-time employee ("vision coverage for full time employees", «25 vakantiedagen bij een
// ➤ fulltime dienstverband», "authorized to work … on a full time basis": the second sample), nor the office kept full time
// ➤ ("most of our teams work from the office full time"), a part-time option («du kannst … Teilzeit arbeiten»), a contract
// ➤ that comes later («vanaf je een vast contract hebt») or a student wanted besides (the sixth sample).
// ➤ docs/research/contract-type.md.
// ➤ Also a hedge («in der Regel einen unbefristeten Arbeitsvertrag», "usually"), Dutch «of» between two kinds («een flexibele
// ➤ of meer vast dienstverband») and positions in general ("the security offered by permanent positions"): the free-label
// ➤ bench, 9 November 2026. «Bij goed functioneren» only beside a temporary start: «Vast dienstverband bij goed
// ➤ functioneren» is permanent (the server's comparison, 15 November 2026).
// ➤ Each trap's words: a hedge, a later step, what is not this job (the company's other posts, a benefit, an agency), and
// ➤ the phrasings below.
const CHANCE = asFolded("chance");
const TRAPS = {
  hedge: asFolded("hedge"),
  notThisJob: asFolded("notThisJob"),
  // ➤ A pay or leave reckoned on a full week says nothing of this job's («salaris … op basis van een fulltime werkweek»).
  fullTimeBasis: asFolded("fullTimeBasis"),
  dutchChoice:
    "(?:vast\\w*|tijdelijk\\w*|flexibel\\w*|interim) (?:\\w+ ){0,2}of (?:\\w+ ){0,2}(?:vast\\w*|tijdelijk\\w*|flexibel\\w*)",
  goodWorkAfterATemporaryStart:
    "(?<=(?:tijdelijk|jaarcontract|interim|uitzend)\\w*\\b.*)bij (?:goed|voldoende) (?:functioneren|presteren)" +
    "|bij (?:goed|voldoende) (?:functioneren|presteren)(?=.*\\b(?:tijdelijk|jaarcontract|interim|uitzend))",
  perEmployee:
    "(?:to|for) (?:all |our )?(?:full|part) ?time (?:associates|staff|colleagues|workers|team)",
  officeFullTime:
    "(?:from|in|at) (?:the |our )?offices? full ?time|full ?time (?:from|in|at) (?:the |our )?offices?",
};
const TRAP = wholeWord(Object.values(TRAPS).join("|"));
// ➤ «permanent», «temporary», «tijdelijk», «temporal», «unlimited» name a contract only beside a word of one ("a permanent,
// ➤ full-time position", «contrato temporal», «tijdelijke functie»): «le progrès permanent», «tijdelijke nutsvoorzieningen»
// ➤ (temporary works), "unlimited PTO" name none.
const LOOSE = asFolded("looseKind");
const OF_A_JOB = asFolded("ofAJob");
const LOOSE_WORD = new RegExp(`(?<![a-z])${LOOSE}(?![a-z])`, "g");
// ➤ A kind's longer phrase that holds a loose word is firm all the same («remplacement de congé maternité»).
const FIRM_PHRASES = anyOf(
  foldedWords("temporary")
    .concat(foldedWords("permanent"))
    .filter(
      (w) =>
        new RegExp(LOOSE_WORD.source).test(w) &&
        /[a-z]/.test(w.replace(LOOSE_WORD, "")),
    ),
  "\\w*",
);
const LOOSE_BESIDE = new RegExp(
  `(?<![a-z])(?:${LOOSE}\\W+(?:[a-z]+\\W+){0,2}?${OF_A_JOB}|${OF_A_JOB}\\W+(?:[a-z]+\\W+){0,2}?${LOOSE}|${FIRM_PHRASES})(?![a-z])`,
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
// ➤ The contract phrases read inside a run of words: a permanent or a fixed-term contract, employment or post, the label
// ➤ «Type (de) contrat : CDI / CDD», and a Spanish card's row «Indefinido Jornada completa».
// ➤ The characters around such a phrase that speak for it: four or five words, the phrase's own item of the run. Further
// ➤ off is the next item («Vast dienstverband Veel invloed op productontwikkeling 30 vakantiedagen»).
const RUN_ON_NEAR = 30;
const RUN_ON_CONTRACT =
  /(?<![a-z])(?:unbefristete[nrs]? (?:arbeitsvertrag|arbeitsverhaltnis|anstellung|festanstellung|arbeitsplatz|stelle|beschaftigung)|befristete[nrs]? (?:arbeitsvertrag|arbeitsverhaltnis|anstellung|stelle)|type (?:de )?contrat ?: ?(?:cdi|cdd)|(?:permanent|fixed term) (?:contract|employment|position)|contrato (?:indefinido|temporal)|(?:indefinido|temporal) jornada (?:completa|parcial)|vast (?:contract|dienstverband)|tijdelijk (?:contract|dienstverband))(?![a-z])/g;
// ➤ A working time in a sentence of more than eight words counts only when the sentence speaks of the job ("This is a
// ➤ full-time position"), not of a benefit, a bonus or a pay said per full-time role (the fourth sample).
const OF_THE_JOB = wholeWord(asFolded("ofTheJob"));
const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const HOURS_WORD = wholeWord(asFolded("hour"));
// ➤ So are the steps on the way to it («Bij goed functioneren daarna een jaarcontract, met uitzicht op een vast contract»,
// ➤ «Jaarcontract, hierna vast dienstverband»: the server's comparison, 15 November 2026).
const PROSPECT = wholeWord(
  ["chance", "mayBecome", "laterStep", "later", "prospectOf"]
    .map(asFolded)
    .join("|"),
  "g",
);
// ➤ A career's prospects name no prospect of a contract ("a permanent role and will offer excellent prospects for career
// ➤ development": the free-label bench, 9 November 2026); a prospect toward a contract («possibilité d'évolution vers un
// ➤ CDI») stays one. Nor is the chance of an extension a prospect («Fixed term contract with the possibility of extension»,
// ➤ «befristet mit Option auf Verlängerung», «hosszabbítási lehetőséggel»): still the same contract, unless it is
// ➤ toward another («s možností prodloužení na dobu neurčitou»).
const TOWARD_A_CONTRACT = `(?=(?:\\W+\\w+){0,4}?\\W+(?:${ANY_KIND_WORD.source}))`;
const EXTENSION_CHANCE = `(?:${CHANCE}|${asFolded("mayBecome")})`;
const EXTENSION = `(?:${asFolded("extension")})`;
const AN_EXTENSION = `(?:${EXTENSION_CHANCE} (?:[a-z]+ ){0,2}?${EXTENSION}|${EXTENSION}\\w* ${EXTENSION_CHANCE})(?![a-z])(?!${TOWARD_A_CONTRACT})`;
const NO_TRAP = wholeWord(
  `${AN_EXTENSION}|(?:${asFolded("careerProspects")})(?![a-z])(?!${TOWARD_A_CONTRACT})`,
  "g",
);
// ➤ The working time inside a prospect is kept («Befristete Stelle in Vollzeit, mit Option auf Übernahme»).
const keepingTimes = (m: string): string =>
  m.replace(TIME_WORD_OR_OTHER, (_, time) => time ?? " ");
const withoutProspect = (f: string): string =>
  f
    .replace(TEMPORARY_THEN_PERMANENT, keepingTimes)
    .replace(AGENCY_THEN_PERMANENT, keepingTimes)
    .replace(PROSPECT, " ");
// ➤ «Étudiant» is a student's contract only as one («job étudiant», «contrat étudiant»), not a student wanted.
const withoutStudents = (f: string): string =>
  f.replace(/(?<!(?:job|contrat|statut) )(?<![a-z])etudiants?(?![a-z])/g, (m) =>
    " ".repeat(m.length),
  );
// ➤ A question's last eight words are its own ("Looking for a new permanent job?": the third sample); the words before them
// ➤ are a page's run of facts («Mannheim Vollzeit Arbeitnehmerüberlassung Sie sind auf der Suche nach einem neuen Job?»).
const QUESTION_WORDS = 8;
const withoutQuestion = (s: string): string =>
  /\?\s*$/.test(s)
    ? s.trim().split(/\s+/).slice(0, -QUESTION_WORDS).join(" ")
    : s;
// ➤ The contracts and working times a sentence holds as a choice, an option or denied are left out of it (stance.ts).
const saidOnly = (f: string): string => withoutUnsaid(f, KIND, WORKING_TIME);
// ➤ A sentence's parts; a dash between two figures joins a range («Teilzeit (20 – 25 Stunden pro Woche)»). A spaced
// ➤ slash between words parts a run of facts too («Long terme / Temps plein / Du lundi au vendredi»).
const SENTENCE_PARTS =
  /[;:|·•()]|(?<!\d ?)[–—]|[–—](?! ?\d)|(?<!\d[a-z]{0,2}) \/ (?!\d)|,(?!\d)/;
// ➤ The one working time a sentence's parts say, with its hours where one part gives them («Media jornada (20 horas
// ➤ semanales)»); none when they differ.
const oneTime = (times: string[]): string => {
  const hours = new Set(times.filter((t) => t.length > 1));
  return new Set(times.map((t) => t[0])).size === 1 && hours.size <= 1
    ? ([...hours][0] ?? times[0])
    : "";
};
// ➤ A part's working time speaks for the job in a sentence of eight words or fewer, or one that names the job. A part of
// ➤ five words or fewer is one in a long sentence too ("Full Time – £Competitive + Door to Door + Overtime", "Hampstead,
// ➤ NC - Regular Full-Time"), and so is a sentence that opens with it and a time right after its label.
const timeOfTheJob = (f: string, p: string): boolean =>
  wordCount(f) <= 8 ||
  OF_THE_JOB.test(f) ||
  wordCount(p) <= 5 ||
  TIME_FIRST.test(f) ||
  TIME_AFTER_LABEL.test(p);
export function inSentences(text: unknown): Lone {
  const kinds = new Map<string, string>(),
    times = new Map<string, string>();
  for (const s of sentences(String(text || "")).map(withoutQuestion)) {
    // ➤ Not a bare figure («57», a French department, came back as 57 hours).
    if (s.length > SENTENCE_MOST || !/\p{L}{3}/u.test(s)) continue;
    let f = foldedLines(s)
      .toLowerCase()
      .replace(NO_TRAP, (m) => " ".repeat(m.length));
    // ➤ A temporary start with a prospect of a permanent contract («Je krijgt direct uitzicht op een vast contract», «Kans op
    // ➤ een vast contract bij goed functioneren»): read as such, though the prospect's words are traps for a permanent one.
    // ➤ Dutch boards state these as temporary in their fields (the free-label bench, 9 November 2026). Its working time is
    // ➤ read without the prospect's words («Een fulltime baan met uitzicht op een vast contract»).
    const prospect = contractKind(f);
    if (
      (prospect === "to" || prospect === "eo") &&
      !TRAP.test(withoutProspect(f))
    ) {
      if (!kinds.has(prospect)) kinds.set(prospect, s.trim());
      f = withoutProspect(f);
    }
    f = saidOnly(f);
    if (!KIND_OR_TIME.test(f) || TRAP.test(f)) continue;
    const parts = withoutStudents(firmOnly(f)).split(SENTENCE_PARTS);
    const k = new Set(parts.map((p) => contractKind(p)).filter(Boolean));
    const kind = k.size === 1 ? [...k][0] : "";
    if (/^(?:i|t\d*)$/.test(kind) && !kinds.has(kind))
      kinds.set(
        kind,
        (parts.find((p) => contractKind(p) === kind) ?? "").trim(),
      );
    // ➤ A bare figure after a label is hours only where the sentence speaks of hours: «Département : 22» is a place.
    const t = new Set(
      parts
        .filter(
          (p) =>
            timeOfTheJob(f, p) &&
            (!/^\s*\d+(?:[.,]\d+)?\.?\s*$/.test(p) || HOURS_WORD.test(f)),
        )
        .map((p) => workingTime(p))
        .filter(Boolean),
    );
    const time = oneTime([...t]);
    if (time && !times.has(time[0]))
      times.set(
        time[0],
        (parts.find((p) => workingTime(p) === time) ?? "").trim(),
      );
  }
  // ➤ A page with no full stops writes its contract inside a run of words over 300 characters («Das bieten wir Dir: …
  // ➤ Unbefristeter Arbeitsvertrag Umfassendes Benefit-Programm …», «Type contrat : CDI Temps de travail : Temps plein»):
  // ➤ its own phrase is read there, judged by the words around it, when no shorter sentence said a contract (the free-label
  // ➤ bench, 9 November 2026: German contracts found on 88 % of the adverts that surely state them).
  if (!kinds.size) {
    const runOn = new Set<string>();
    for (const s of sentences(String(text || ""))) {
      if (s.length <= SENTENCE_MOST) continue;
      const f = saidOnly(
        foldedLines(s)
          .toLowerCase()
          .replace(NO_TRAP, (m) => " ".repeat(m.length)),
      );
      for (const m of f.matchAll(RUN_ON_CONTRACT)) {
        const near = f.slice(
          Math.max(0, m.index - RUN_ON_NEAR),
          m.index + m[0].length + RUN_ON_NEAR,
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
  // ➤ A permanent or temporary contract beside a prospect of the permanent one is that prospect («aanstelling in tijdelijke
  // ➤ dienst voor een proeftijd van een jaar», «Een jaarcontract met uitzicht op een vaste baan»: the server's comparison, 15
  // ➤ November 2026).
  if (kinds.has("to") || kinds.has("eo"))
    for (const kind of [...kinds.keys()])
      if (/^(?:i|t\d*|e)$/.test(kind)) kinds.delete(kind);
  return {
    ...(oneSaid(kinds) ? { contract: oneSaid(kinds) } : {}),
    ...(times.size === 1 ? { hours: [...times.values()][0] } : {}),
  };
}

// ➤ A contract a title names in a part of its own, set off by a dash or brackets ("Ingeniero DevOps Senior - CDI -
// ➤ Mónaco", "Architecte Solutions [CDI]", «Stage - Ingénieur méthodes»); a title in one piece says nothing ("Stage
// ➤ Manager"), nor one whose parts name two kinds.
// ➤ "Contract" only as a part of its own ("Writer (Contract)"): beside other words it is a role ("Contract Manager").
// ➤ "B2B" in a title is mostly a market ("Marketing Manager | B2B"), "Interim" an English temporary post, not an agency's.
const ONLY_ALONE = /(?<![a-z0-9])contracts?(?![a-z0-9])/gi;
const NOT_IN_TITLES = /(?<![a-z0-9])(?:b2b|interim)(?![a-z0-9])/gi;
// ➤ A title that names whom it hires as a trainee or a freelancer says so in one piece too («Stagiaire ingénieur
// ➤ méthodes», «Becario/a de ingeniería», "Engineering Intern", «Freelance Elektrotechniker»).
// ➤ Not the Nordic «intern» (internal) of an internal posting («Intern utlysning»).
const KIND_IN_TITLE = wholeWord(asFolded("titleKind"));
const NOT_KIND_IN_TITLE = wholeWord(asFolded("notTitleKind"), "g");
export function contractInTitle(title: unknown): string {
  const parts = String(title || "")
    .split(/\s[-–—|/]\s|[()[\]]/)
    .map((s) => s.replace(NOT_IN_TITLES, " ").trim())
    .filter(Boolean);
  if (parts.length < 2)
    return (
      foldLetters(String(title || ""))
        .replace(NOT_KIND_IN_TITLE, " ")
        .match(KIND_IN_TITLE)?.[0] ?? ""
    );
  const said = parts
    .map((p) =>
      p.split(/\s+/).length > 1 ? p.replace(ONLY_ALONE, " ").trim() : p,
    )
    .filter((p) => p && p.split(/\s+/).length <= 4 && contractKind(p));
  return new Set(said.map((p) => contractKind(p))).size === 1 ? said[0] : "";
}

// ➤ The contract (ct) and working time (wt) an advert writes outside a field of its source: in a labelled line of its
// ➤ text, or for the contract in a part of its title. For what its source's own fields leave unsaid (builder/normalise.ts).
// ➤ The last day to apply as a line of the text writes it, labelled («Sista ansökningsdag: 2026-11-19», «Søknadsfrist:
// ➤ 08.11.2026», «Die Bewerbungsfrist endet am 15.11.2026», "Closing date: 15 November 2026"), for a source with no
// ➤ field of it (the text corpus, 1 November 2026: 56 of 3,122 pages wrote one no card showed). Only after such a label.
const DEADLINE = new RegExp(
  `(?:${asWritten("deadlineLabel")})\\s*[:.]?\\s*(?:am|le|el|on|op|il|den|tot)?\\s*([^\\n]{6,40})`,
  "i",
);
const MONTHS = numbers({ concept: "monthNumbers", folded: true });
const iso = (y: string, m: number, d: number): string =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31
    ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    : "";
const dayInWords = (said: string | undefined): string => {
  if (!said) return "";
  let m = said.match(/(20\d{2})[./-] ?(\d{1,2})[./-] ?(\d{1,2})(?!\d)/);
  if (m) return iso(m[1], +m[2], +m[3]);
  m = said.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})(?!\d)/);
  if (m) return iso(m[3].length === 2 ? `20${m[3]}` : m[3], +m[2], +m[1]);
  const folded = foldedLines(said).toLowerCase();
  m = folded.match(
    /(?<!\d)(\d{1,2})\.?\s+(?:de\s+|d\s+)?([a-z]+)\.?\s+(?:de\s+)?(20\d{2})/,
  );
  if (m && MONTHS[m[2]]) return iso(m[3], MONTHS[m[2]], +m[1]);
  // ➤ Hungarian writes the year first («2026. december 15.»).
  m = folded.match(/(20\d{2})\.?\s+([a-z]+)\s+(\d{1,2})(?!\d)/);
  return m && MONTHS[m[2]] ? iso(m[1], MONTHS[m[2]], +m[3]) : "";
};
export const deadlineInText = (text: unknown): string =>
  dayInWords(String(text || "").match(DEADLINE)?.[1]);
// ➤ The day the advert says it was posted, after a label of its own («Aktualität: 15.10.2026», «Stellenbeschreibung Datum:
// ➤ 21. Oktober 2025», "Date posted: …") or a phrase («Ausgeschrieben seit 31.10.2026», «Online seit», "Posted on",
// ➤ «Publicado el»): for a source with no posting day, before the day the crawler first saw it, which made a year-old
// ➤ advert look new (the readers' faults, 1 November 2026). «Eingestellt» counts only before a colon or «am»: alone it is
// ➤ also «hired».
const POSTED = new RegExp(
  `(?:(?:${asWritten("postedLabel")})\\s*:|${asWritten("postedPhrase")})\\s*([^\\n]{6,40})`,
  "i",
);
export const postedInText = (text: unknown): string =>
  dayInWords(String(text || "").match(POSTED)?.[1]);

// ➤ A line that offers both times, in their own words («Vollzeit, Teilzeit», "Full-time · 40 hrs/week or Part time"),
// ➤ says neither: the card showed one of them (the readers, 2 November 2026). The words themselves, not their stems,
// ➤ which «Vorteile» or «volle» would match.
// ➤ A space or a hyphen may join a time's words («full time», «full-time», «fuld tid»), and a compound may follow
// ➤ («Vollzeitstelle», «heltidstjänst»).
const timeWords = (concept: string) =>
  new RegExp(
    `(?<![\\p{L}])${anyOf(new Set(words(concept, { bare: true })), "\\p{L}*").replace(/\\?[ -]/g, "[ -]?")}\\p{L}*`,
    "iu",
  );
const FULL_TIME = timeWords("fullTime");
const PART_TIME = timeWords("partTime");
// ➤ A sentence that opens with its working time («Temps plein GAUTHIER CONNECTIQUE conçoit…», «À temps plein soit à 35h00
// ➤ par semaine du lundi au vendredi»), unless it speaks of the staff who work it ("Full-time employees receive…").
const TIME_FIRST = new RegExp(
  `^\\s*(?:a |en |in |im |op )?(?:${FULL_TIME.source}|${PART_TIME.source})(?! (?:employees?|staff|workers|associates|team members|roles|positions|equivalent))`,
  "iu",
);
// ➤ A working time right after its label speaks for the job in a run of facts too («Oplysninger Arbejdstid Deltid
// ➤ Virksomhedens navn …»).
const TIME_AFTER_LABEL = new RegExp(
  `(?<![\\p{L}])(?:${asFolded("hoursLabel")})\\s*:?\\s*(?:${FULL_TIME.source}|${PART_TIME.source})`,
  "iu",
);
const TIME_WORD = new RegExp(
  `${FULL_TIME.source}|${PART_TIME.source}|(?<![\\d.,])\\d{1,2}(?:[.,]\\d{1,2})? ?(?:h|hrs?|hours?|heures?|stunden|std|uur|uren|horas?|ore|timmar)(?![a-z])`,
  "giu",
);
const TIME_WORD_OR_OTHER = new RegExp(`(${TIME_WORD.source})|[^]`, "giu");
// ➤ A form's label that lists both as its options says nothing; its value does («Full Time / Part Time: Full-time»,
// ➤ «Fulltime/ parttime: De functie is fulltime»).
const EITHER_TIME = `(?:${FULL_TIME.source}|${PART_TIME.source})`;
const OPTIONS = new RegExp(
  `^\\s*${EITHER_TIME}\\s*\\/\\s*${EITHER_TIME}\\s*:`,
  "iu",
);
// ➤ One offered or denied beside the other is no choice of both («Media jornada con opción a jornada completa»).
const ANY_TIME = new RegExp(WORKING_TIME.member.source, "g");
const bothTimes = (s: string): boolean => {
  const said = withoutOptions(
    foldedLines(s.replace(OPTIONS, "")).toLowerCase(),
    WORKING_TIME,
  );
  return (
    new Set([...said.matchAll(ANY_TIME)].map((m) => WORKING_TIME.valueOf(m[0])))
      .size > 1
  );
};
// ➤ A working time the title names («Elektriker (m/w/d) Vollzeit», «Sales Advisor (Part-time)», «Mitarbeiter Lager & Technik
// ➤ in Vollzeit»), when no labelled line of the text said it: a title names the job, so a time in it is the job's. Not a
// ➤ choice of both («Voll- u. Teilzeit», «temps plein ou partiel», «jornada completa o parcial»). The free-label bench of
// ➤ 9 November 2026 (docs/research/indudex-lector.md): on 26,944 English and 13,520 German adverts whose source states
// ➤ the hours in a field, the title agreed with it on 95 and 97 %, and eleven of twelve disagreements judged were the
// ➤ field's (FULL_TIME on a part-time title, a system's default).
const lower = foldLetters;
// ➤ A Swiss title ends with the share of a full week («Maler 100%», «HR Administrator 50%», «Elektriker 50-80%»): that
// ➤ share is its time; not a range up to a whole week («80-100%») nor the share of a way of work («Teletrabajo 100%»,
// ➤ «presencial al 100 %», "100% remote").
const SHARE_AT_END = /(?:^|[\s(])(\d{2,3}(?: ?[-–] ?\d{2,3})? ?%)\)?\s*$/;
const MODE_AT_END =
  /(?:remot(?:e|ely|o|a)?|teletrabajo|teletreball|tele ?travail|presencial|presentiel|home ?office|hybrid[a-z]*|vor ort|on ?site|smart working)(?: al| a)?\W*$/;
function shareInTitle(title: string): string {
  const m = title.match(SHARE_AT_END);
  return m &&
    workingTime(m[1]) &&
    !MODE_AT_END.test(lower(title.slice(0, m.index)))
    ? m[1]
    : "";
}
export function hoursInTitle(title: unknown): string {
  return workingTime(title) ? String(title) : shareInTitle(String(title || ""));
}
// ➤ Hours a week written anywhere in the title or the text, also in a page with no full stops («… Selbstverständlichkeit
// ➤ Arbeitszeit: 40,00 Stunden pro Woche …», «Een afwisselende functie voor 16 tot 24 uur per week»): 35 to 60 full
// ➤ time, 4 to 30 part time, only when every such figure of the advert says the same; 31 to 34 says neither (a short full
// ➤ week or a long part one). A label before the figure says it too («Weekly Hours: 39 hrs», «Wochenarbeitszeit:
// ➤ 40»). On the bench, 92 to 93 % agreeing with the source's field in English and German, 99 % in French (9 November
// ➤ 2026). A week may come first («heti 20 óra»). So does a word for the working week before 15 hours or more, which no day has («Jornada de 40 horas»,
// ➤ «Contrat de 35 heures», «Arbeitszeit 40 Stunden»), not the time of a day («Jornada de 15h a 19h»).
const NUMBER = "(\\d{1,2}(?:[.,]\\d{1,2})?)";
const A_WEEKS_HOURS = "((?:1[5-9]|[2-5]\\d)(?:[.,]\\d{1,2})?)";
const plainWords = (concept: string) =>
  anyOf(new Set(words(concept).map(lower)), "\\w*");
const HOUR = plainWords("hour");
// ➤ A week's words, and each language's own phrase for «a week» («tygodniowo», «om ugen»).
const PER_WEEK = `(?:(?:\\/|${plainWords("per")})?\\s*(?:${plainWords("week")}|${plainWords("weekly")})|${plainWords("perWeek")})(?![a-z])`;
const RANGE = `(?:-|–|${plainWords("rangeJoin")})`;
const PER_MONTH = `(?:${plainWords("per")}\\s*)?${plainWords("perMonth")}(?![a-z])`;
// ➤ «Weekly» before the hours («heti 20 óra», «wöchentlich 20 Stunden»).
const WEEKLY_HOURS = `${plainWords("weekly")}\\s+${NUMBER}\\s*${HOUR}\\.?(?![a-z])`;
const HOURS_A_WEEK = new RegExp(
  [
    `(?<![\\d.,])${NUMBER}\\s*(?:${RANGE}\\s*${NUMBER}\\s*)?${HOUR}\\.?\\s*${PER_WEEK}`,
    `(?<![a-z])${WEEKLY_HOURS}`,
    `(?<![\\d.,])${NUMBER}\\s*(?:${RANGE}\\s*${NUMBER}\\s*)?${plainWords("hoursAWeek")}`,
    `${plainWords("hoursAWeekLabel")}\\s*[:\\-–]?\\s*${NUMBER}(?![\\d.,]*\\s*%)`,
    `${plainWords("workingWeek")}(?:\\s+[a-zà-ÿ]+){0,2}?\\s*[:\\-–]?\\s*${A_WEEKS_HOURS}\\s*${HOUR}(?![\\w:])(?!\\s*(?:-|–|${plainWords("rangeJoin")})\\s*\\d)(?!\\s*${PER_MONTH})`,
  ].join("|"),
  "g",
);
// ➤ A month's hours count as a week's («151,67 heures mensuelles», «80 horas al mes», «havi 80 óra»); a working week's
// ➤ figure is not a month's («Contrato de 15 horas al mes»).
const A_MONTHS_HOURS = "(\\d{2,3}(?:[.,]\\d{1,2})?)";
const HOURS_A_MONTH = new RegExp(
  [
    `(?<![\\d.,])${A_MONTHS_HOURS}\\s*(?:${RANGE}\\s*${A_MONTHS_HOURS}\\s*)?${HOUR}\\.?\\s*${PER_MONTH}`,
    // ➤ Not a pay's month before the week's hours («€ 4.500 per maand 36 uur per week»).
    `(?<![a-z])(?<![\\d€$£][\\s€$£]*)${PER_MONTH}\\s+${A_MONTHS_HOURS}\\s*${HOUR}(?![a-z])`,
  ].join("|"),
  "g",
);
const figures = (m: RegExpMatchArray, weeks = 1) => {
  const nums = m
    .slice(1)
    .filter(Boolean)
    .map((x) => Number(x.replace(",", ".")) / weeks);
  return { low: Math.min(...nums), high: Math.max(...nums) };
};
const weekFigures = (
  title: unknown,
  text: unknown,
): { low: number; high: number }[] => {
  const s = withFiguresJoined(lower(`${title}\n${text}`));
  return [
    ...[...s.matchAll(HOURS_A_WEEK)].map((m) => figures(m)),
    ...[...s.matchAll(HOURS_A_MONTH)].map((m) => figures(m, WEEKS_A_MONTH)),
  ];
};
export function hoursAWeek(title: unknown, text: unknown): string {
  const said = new Set<string>();
  let top = 0;
  for (const { low, high } of weekFigures(title, text)) {
    if (high >= 35 && high <= 60 && low >= 30) said.add("c");
    else if (high <= 30 && low >= 4) said.add("p");
    else said.add("neither");
    top = high;
  }
  return said.size === 1 && !said.has("neither")
    ? `${Math.round(top)} hours per week`
    : "";
}
// ➤ A bare «part time» takes the weekly hours the advert gives elsewhere when they say the same, one figure each
// ➤ («Trabalho a tempo parcial, 20 horas semanais»); a range («20 – 25 Stunden pro Woche») leaves it bare.
function withWeekHours(time: string, title: unknown, text: unknown): string {
  const kind = workingTime(time);
  if ((kind !== "p" && kind !== "c") || /\d/.test(time)) return time;
  const week = hoursAWeek(title, text);
  const single = weekFigures(title, text).every((f) => f.low === f.high);
  return week && single && workingTime(week).startsWith(kind) ? week : time;
}
type Written = { title?: unknown; description?: unknown; source?: string };
export function writtenFacts(
  raw: Written,
  text: unknown = raw.description,
): { ct?: string; wt?: string } {
  const f = labelledInText(raw.description);
  const lone: Lone = !f.contract || !f.hours ? loneInText(raw.description) : {};
  const said: Lone =
    (!f.contract && !lone.contract) || (!f.hours && !lone.hours)
      ? inSentences(text)
      : {};
  const contract =
    f.contract || contractInTitle(raw.title) || lone.contract || said.contract;
  const both = String(raw.description || "")
    .split("\n")
    .some((l) => l.length < 160 && bothTimes(l));
  const time = f.hours || lone.hours || hoursInTitle(raw.title) || said.hours;
  const hours = both
    ? ""
    : time
      ? withWeekHours(time, raw.title, text)
      : hoursAWeek(raw.title, text);
  const out: { ct?: string; wt?: string } = {};
  if (contract) out.ct = contractKind(contract, { source: raw.source });
  if (hours) out.wt = workingTime(hours);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

// ➤ Every run of blanks one space first: a label's value could otherwise split a long run many ways (DAB-01: 140 blank
// ➤ lines took minutes).
// ➤ An hours value that opens with its figure is those hours («Durée du travail : 35H Horaires normaux», France Travail's),
// ➤ not a time of day («Horario: 15h a 19h»).
const LEADING_HOURS =
  /^\d{1,2}(?:[.,]\d{1,2})?\s*h(?:eures?|rs?)?(?![a-z])(?!\s*(?:-|–|a|à|al|to|bis)\s*\d)/i;
function factsOf(raw: string): Facts {
  const text = raw.replace(/\s+/g, " ");
  const found = {
    contract: new Map<string, string>(),
    hours: new Map<string, string>(),
    years: new Set<number>(),
  };
  const addContract = (value: string) => {
    const code = contractKind(value);
    if (code && !found.contract.has(code)) found.contract.set(code, value);
  };
  const addHours = (...values: string[]) => {
    const said = values.find((v) => v && workingTime(v)) ?? "";
    if (said && !found.hours.has(workingTime(said)))
      found.hours.set(workingTime(said), said);
  };
  // ➤ A contract's value may name the hours too («CDI - Temps plein»), and the hours' the contract («Omfattning:
  // ➤ Visstidsanställning»).
  for (const [name, said] of fieldsOf(text, LABELS.contract)) {
    // ➤ A duration's label gives months alone («Duración del contrato: 12 meses»): a contract of that many months.
    addContract(DURATION.test(name) ? `contrato de ${said}` : said);
    addHours(said);
  }
  for (const [name, said] of fieldsOf(text, LABELS.hours)) {
    addHours(`${name} ${said}`, said, said.match(LEADING_HOURS)?.[0] ?? "");
    addContract(said);
  }
  for (const [, said] of fieldsOf(text, LABELS.years)) {
    const y = said.match(YEARS);
    if (y && !AN_AGE.test(said)) found.years.add(Number(y[1]));
  }
  const out: Facts = {};
  if (oneSaid(found.contract)) out.contract = oneSaid(found.contract);
  if (found.hours.size === 1) out.hours = [...found.hours.values()][0];
  if (found.years.size === 1) out.years = [...found.years][0];
  return out;
}
// ➤ The contract or working time a page shows as a field of its own with no label, as the employer's form gave it: a
// ➤ chip «Vollzeit», «Permanent», «CDI», "Full-time · Amersfoort" (docs/research/whole-advert.md). Read outside links
// ➤ only, as menus and filters are links, from parts of three words at most and no figure («12 Hours» is a shift, «20»
// ➤ anything), and only when the whole page names one such value; a part naming two contracts («CDI - Freelance») or
// ➤ both times says nothing. Permanent or temporary, full or part time: «Ausbildung» or «Interim» alone is mostly a menu
// ➤ or an agency's name.
const folded = (s: unknown): string =>
  foldLetters(s)
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
// ➤ The values standing alone in a page's fields or a text's lines, each cut at its separators (`cut`).
// ➤ A workload written after the value («Festanstellung 80-100%», «Vollzeit 100 %») is set aside; a line of hours a week
// ➤ («32 - 40 uur per week») is the one value with figures read so (the text corpus, 1 November 2026).
const WORKLOAD = /\s*\d{1,3}\s*(?:[-–]|bis)?\s*(?:\d{1,3})?\s*%\s*$/;
// ➤ Hours a week alone: «32 - 40 uur per week», "40 hrs/week", «20 Std./Woche» (its slash folded away), «heti 20 óra».
const HOURS_PER_WEEK = `${HOUR}\\.?\\s*${PER_WEEK}`;
const WEEK_HOURS = new RegExp(
  `^(?:${NUMBER}(?: (?:${plainWords("rangeJoin")} )?${NUMBER})? ?${HOURS_PER_WEEK}|${WEEKLY_HOURS})$`,
);
const NAMES_WEEK_HOURS = new RegExp(`\\d ?${HOURS_PER_WEEK}|${WEEKLY_HOURS}`);
// ➤ A fixed term's length alone: «(12 months)», «(6 meses)».
const TERM_ALONE = new RegExp(`^\\d{1,2} ?${plainWords("month")}$`);
// ➤ A time and its hours, in two parts of a field («Teilzeit (20 Std./Woche)») or in two fields, are read together.
const withHours = (time: string, hours = "") =>
  !/\d/.test(time) && /\d/.test(hours) ? `${time} ${hours}` : time;
function loneOf(fields: string[], cut: RegExp): Lone {
  const contracts = new Map<string, string>(),
    times = new Map<string, string>();
  for (const field of fields
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 70)) {
    // ➤ Not the parts of a line that names a prospect whole («Een jaarcontract, bij gebleken geschiktheid een vast contract»:
    // ➤ the server's comparison, 15 November 2026).
    if (/^(?:to|eo)$/.test(contractKind(field))) continue;
    // ➤ A part is read only as its field holds it: not one of a choice, an option or denied («CDI, CDD ou intérim»).
    const said = saidOnly(foldedLines(field).toLowerCase());
    const parts = field
      .split(cut)
      .map((s) => s.trim())
      .map((s) => (namesShare(s) ? s : s.replace(WORKLOAD, "")))
      .filter((p) => {
        const f = folded(p);
        return (
          f &&
          ((f.split(" ").length <= 3 && !/\d/.test(f)) ||
            WEEK_HOURS.test(f) ||
            TERM_ALONE.test(f) ||
            namesShare(p)) &&
          said.includes(foldedLines(p).toLowerCase().trim())
        );
      });
    const term = parts.find((p) => TERM_ALONE.test(folded(p))),
      weekHours = parts.find((p) => WEEK_HOURS.test(folded(p)));
    if (new Set(parts.map((p) => contractKind(p)).filter(Boolean)).size > 1)
      continue;
    for (const p of parts) {
      const kind = contractKind(p),
        time = workingTime(p);
      // ➤ «Unlimited PTO», «Unlimited» alone: a benefit, not a contract; «Vast» alone a chip of any advert a page lists
      // ➤ (belgievacature.be; the server's comparison, 15 November 2026), read only after its label.
      // ➤ A fixed term and its length in two parts («Contrato temporal (6 meses)») are read together.
      if (
        (kind === "i" || kind === "t") &&
        !contracts.has(kind) &&
        !/^(?:unlimited\b|vast$)/.test(folded(p))
      )
        contracts.set(kind, kind === "t" && term ? `${p} ${term}` : p);
      const full = time[0],
        before = times.get(full);
      if (full === "c" || full === "p")
        times.set(
          full,
          before ? withHours(before, p) : withHours(p, weekHours),
        );
    }
  }
  return {
    ...(contracts.size === 1 ? { contract: [...contracts.values()][0] } : {}),
    ...(times.size === 1 ? { hours: [...times.values()][0] } : {}),
  };
}
export const loneFacts = (html: unknown): Lone =>
  loneOf(
    fieldText(String(html || "").replace(/<a\b[\s\S]*?<\/a>/gi, " ")).split(
      "|",
    ),
    /\s[·•|/–—-]\s|\s·\s|,\s/,
  );
// ➤ The same in an advert's text: a line that is only the contract or the hours («Unbefristet · Vollzeit», «Vollzeit
// ➤ (Unbefristet)», «CDI», "Permanent"), never a sentence that names one. Against what the same page says in its block or
// ➤ a labelled field, 45 of 46 on the diary's kept pages; a contract or hours for 3 % of their cards (1 November 2026).
// ➤ Only a text's short lines are folded, once, as the contract reader folds a field, and only those that name a contract or
// ➤ the hours are read part by part.
// ➤ A dash set off by spaces parts a line's facts, save between two figures («Inzet: 28 - 32 uur per week»).
const LINE_DASH = /(?<!\d)[ \t][-–—][ \t]|[ \t][-–—][ \t](?!\d)/g;
export function loneInText(text: unknown): Lone {
  const short = String(text || "")
    .split(/\n| · /)
    .filter((l) => l.length > 1 && l.length < 70);
  // ➤ A line of facts set off by dashes («Vollzeit - ab sofort - unbefristet - Home Office 60 %») keeps its parts apart.
  const named = short.length
    ? foldedLines(short.join("\n").replace(LINE_DASH, " · "))
        .split("\n")
        .filter(
          (l) =>
            KIND_OR_TIME.test(l) || NAMES_WEEK_HOURS.test(l) || namesShare(l),
        )
    : [];
  return named.length ? loneOf(named, /\s[·•|/]\s|\s·\s|,\s|\s*[()]\s*/) : {};
}
