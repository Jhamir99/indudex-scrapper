// ➤ Where the work is done: on site, hybrid or remote, or not said. Read from the advert's source when it states it, else
// ➤ from a LinkedIn tag in the advert's text (#LI-Remote, #LI-Hybrid, #LI-Onsite) and a location that names remote work
// ➤ instead of a place, when they do not contradict each other, and a mode the advert writes as a field of its own («Work
// ➤ Model: Hybrid»); last, a sentence that states it (modeInSentences): a bare word list misread it about one time in six,
// ➤ so only whole statements count. docs/research/work-mode.md has the sources.
// ➤ The words of each mode are in the language tables (builder/words), one concept each; the patterns below are built
// ➤ from them, and the few that hold a single language's phrasing are grouped under that language.
// The legacy's builder/work-mode.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
import { foldLetters } from "../../shared/kit/fold.js";
import { MODE_LETTER } from "./work-modes.js";
import { anyOf, numbers, words } from "../../shared/words/index.js";

type Mode = keyof typeof MODE_LETTER;

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A line as the sentence reader compares it: no accents or capitals; letters, figures and «%» only.
const plain = (s: unknown) =>
  foldLetters(String(s || ""))
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const inPlainLine = (w: string) =>
  w
    .replace(/[^a-z0-9%* ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// ➤ A concept's words written as a plain line writes them, as one alternation; a stem may run on.
const wordsFor = (concept: string) =>
  anyOf(new Set(words(concept, { folded: true }).map(inPlainLine)), "\\w*");
// ➤ A whole word or phrase of a plain line.
const word = (body: string) => new RegExp(`(?<![a-z])(?:${body})(?![a-z])`);

const DAY = wordsFor("day");
const WEEK = wordsFor("week");
const MONTH = wordsFor("month");
const YEAR = wordsFor("year");
const PER = wordsFor("per");
// ➤ A week, after a «per» or in a word of its own («viikossa», «tjedno»).
const A_WEEK = `(?: (?:${PER} )?${WEEK})`;
const AT_HOME = wordsFor("atHome");
const HYBRID = wordsFor("hybrid");
const ON_SITE = wordsFor("onSite");
const WHOLLY = `(?:${wordsFor("wholly")}|100 ?%)`;
const PARTLY = wordsFor("partly");
const POSSIBLE = wordsFor("possible");
const POSSIBILITY = wordsFor("possibility");
const NO = wordsFor("no");
const REMOTE = wordsFor("remote");
// ➤ The word itself, not a compound («Hybridantrieb»).
const HYBRID_WORD = wordsFor("hybridAlone");
const HYBRID_ALONE = word(HYBRID_WORD);

// ── The sources' own values ──────────────────────────────────────────────────────────────────────────────────────────
// ➤ The sources' words for the three, reduced to their letters: "On Site", "on-site", "OnSite", "ORA_ON_SITE" and
// ➤ "#LI-Onsite" all read "onsite". JobTech's "Arbete på plats" is left out on purpose: it is its form's default, set on
// ➤ remote and hybrid adverts too.
const MODES: Record<string, Mode> = {
  onsite: "onsite",
  oraonsite: "onsite",
  lionsite: "onsite",
  hybrid: "hybrid",
  orahybrid: "hybrid",
  lihybrid: "hybrid",
  hybridarbete: "hybrid",
  remote: "remote",
  oraremote: "remote",
  liremote: "remote",
  fullyremote: "remote",
  distansarbete: "remote",
};
export const modeWord = (value: unknown): Mode | "" =>
  MODES[
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
  ] || "";

// ➤ An employer that offers several modes counts as the most flexible one: the filter asks "can I work this way?".
const FLEXIBILITY: string[] = ["onsite", "hybrid", "remote"];
// ➤ The boards give their flags as they are: a word, or nothing where the flag is off.
export const mostFlexible = (modes: readonly unknown[]): Mode | "" =>
  (modes.filter((m) => FLEXIBILITY.includes(m as Mode)) as Mode[]).sort(
    (a, b) => FLEXIBILITY.indexOf(b) - FLEXIBILITY.indexOf(a),
  )[0] || "";

// ➤ LinkedIn's tags for jobs it copies from employers' sites; Indeed and Monster read them too.
const LINKEDIN_TAG = /#LI-(Remote|Hybrid|On-?site)\b/gi;
export const tagMode = (text: unknown) =>
  mostFlexible(
    [...String(text || "").matchAll(LINKEDIN_TAG)].map((m) => modeWord(m[1])),
  );

// ── A location ───────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A location that names remote work: Indeed's location words for telework (OECD, 2021, Annex Table A.2) and their
// ➤ neighbours. Remote work said as a part or a possibility beside the place («Hamburg / Homeoffice möglich», «Köln
// ➤ (teilweise remote)», «Paris (télétravail partiel)») is hybrid, not remote (DAA-07).
const REMOTE_PLACE = word(REMOTE);
const PARTLY_PLACE = word(`${POSSIBLE}|${POSSIBILITY}|${PARTLY}`);
export function placeMode(location: unknown) {
  const f = plain(withoutThings(location));
  const remote = REMOTE_PLACE.test(f),
    hybrid = HYBRID_ALONE.test(f);
  if (remote && (hybrid || PARTLY_PLACE.test(f))) return "hybrid";
  return remote ? "remote" : hybrid ? "hybrid" : "";
}

// ── A labelled field ─────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A mode the employer writes as a field of its advert, not in its wording («Work Model: Hybrid – onsite and remote»,
// ➤ «Télétravail : 2 jours par semaine», «Modalidad de trabajo: Modelo híbrido», «Arbeitsmodell: vor Ort»): a label and a
// ➤ value of a few words. Some days or a share of the week at home is hybrid, and so is a value that names both an office
// ➤ and remote work; one that says no («Télétravail : non») or names no mode («in overleg») is left unsaid. 1,825 such lines
// ➤ on a tenth of the store (1 November 2026); «Arbeitsweise» (a manner of working) and «Workplace» are not such labels.
// ➤ The bullets before a label stay on its line: across blank lines, a long run of them took seconds (DAA-27).
const LABELS = anyOf(
  new Set([
    ...words("modeLabel", { bare: true }),
    ...words("jobLabel", { bare: true }),
  ]),
);
const MODE_LABEL = new RegExp(
  `^[\\t\\v\\f\\p{Zs}\\ufeff•·*–\\-\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]*(${LABELS})[^\\S\\r\\n]*:[^\\S\\r\\n]*(\\S.{0,79})$`,
  "gimu",
);
// ➤ A label about the job in general («Employment type», «Job type», «Arbeitsmodell», «Organisation du travail»,
// ➤ «Modalidad») counts only with a mode's word in its value: «Part-time, 3 days per week» or «80%» there is the working
// ➤ time, not hybrid work (DAA-06).
const JOB_LABELS = new Set(words("jobLabel", { folded: true }));
// ➤ A value that opens with a no («Télétravail : non», «Homeoffice: nicht möglich»); a «no» further on may be another
// ➤ language's word («3 no escritório», in the office).
const SAYS_NO = new RegExp(`^[^a-z]*(?:${NO}|${wordsFor("none")})(?![a-z])`);
const HYBRID_IN_VALUE = new RegExp(HYBRID);
const HYBRID_VALUE = new RegExp(
  String.raw`${HYBRID}|flexib|\d+ ?${DAY}(?![a-z])|(?:^|[^\d])(?:[1-9]\d?) ?%(?! ?(?:[a-z]+ ){0,2}(?:travel|reise\w*|reisen|deplacement\w*|viaje\w*|reizen))`,
);
// ➤ A value's words of remote work and of work on site, the tables' («Arbejdsform: fjernarbejde», «Način rada: u uredu»).
const REMOTE_VALUE = word(`${REMOTE}|${AT_HOME}`);
const ONSITE_VALUE = word(ON_SITE);
const A_MODE_WORD = new RegExp(
  `${REMOTE_VALUE.source}|${ONSITE_VALUE.source}|hybrid|hibrid|ibrid|hybryd|office|home|teletra|thuis|buro|oficina|bureau`,
);
const FULL_REMOTE = word(`${WHOLLY} (?:${REMOTE}|${AT_HOME})`);
// ➤ Part of the week at home: a mode's label said partly («Homeoffice: teilweise»), or remote work said partly
// ➤ («partly remote», «delvis på distans», «télétravail partiel»), not a part-time job beside it («Remoto, jornada parcial»).
const PARTLY_REMOTE = word(
  `${PARTLY}(?: [a-z]+){0,2}? (?:${REMOTE}|${AT_HOME})|(?:${REMOTE}|${AT_HOME}) ${PARTLY}`,
);
const PARTLY_ALONE = word(PARTLY);
const YES = new RegExp(`^${wordsFor("yes")}(?![a-z])`);
const WEEK_DAYS = new RegExp(String.raw`(\d) ?${DAY}(?![a-z])`);
function modeOfField(label: string, value: string) {
  // ➤ A hybrid that is the trade's, not the work's («Location: Hybrid Cloud Team, Munich»), names no mode.
  const l = foldLetters(label),
    v = foldLetters(String(value).replace(HYBRID_MACHINE, " "))
      .replace(/[–—]/g, "-")
      .trim();
  const athome = REMOTE_VALUE.test(plain(l));
  if (
    SAYS_NO.test(v) ||
    (JOB_LABELS.has(l.trim()) && !A_MODE_WORD.test(plain(v)))
  )
    return "";
  if (/^hybrid/.test(l) && !FULL_REMOTE.test(plain(v))) return "hybrid";
  if (FULL_REMOTE.test(plain(v)) || (athome && /^100 ?%$/.test(v)))
    return "remote";
  // ➤ «Remote: yes» is remote; «Télétravail : oui», a home office possible, is part of the week.
  if (YES.test(v))
    return /^remote/.test(l)
      ? "remote"
      : /hybrid/.test(l) || athome
        ? "hybrid"
        : "";
  if (HYBRID_IN_VALUE.test(v)) return "hybrid";
  const remote = REMOTE_VALUE.test(plain(v)),
    onsite = ONSITE_VALUE.test(plain(v));
  // ➤ Five days in the office is on site, five at home remote.
  const days = Number(v.match(WEEK_DAYS)?.[1] || 0);
  if (days >= 5) return onsite ? "onsite" : remote || athome ? "remote" : "";
  const partly =
    PARTLY_REMOTE.test(plain(v)) ||
    (!JOB_LABELS.has(l.trim()) && PARTLY_ALONE.test(plain(v)));
  if ((remote && onsite) || partly || HYBRID_VALUE.test(v)) return "hybrid";
  return remote ? "remote" : onsite ? "onsite" : "";
}
export const labelledMode = (text: unknown) =>
  mostFlexible(
    [
      ...String(text || "")
        .replace(/<[^>]*>/g, " ")
        .matchAll(MODE_LABEL),
    ]
      .map((m) => modeOfField(m[1], m[2]))
      .filter(Boolean),
  );

// ── A title ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A part of the title set off by a dash, a bar or brackets that is a mode alone ("Data Engineer (Remote)", «Técnico –
// ➤ Híbrido», «Servicetechniker (vor Ort)»).
const TITLE_REMOTE = new RegExp(
  `^(?:${WHOLLY} )?(?:${REMOTE})(?: (?:from|in|within|desde|da|en|aus|uit|across) [a-z ]{2,30}| first| only| ok| possible| eu| emea| europe| spain| germany)?$`,
);
const TITLE_ONSITE = new RegExp(`^(?:${WHOLLY} )?(?:${ON_SITE})$`);
const TITLE_HYBRID = new RegExp(
  `^(?:${HYBRID_WORD}|teletravail partiel|teletrabajo parcial|smart working|remote ?\\/ ?hybrid|hybrid ?\\/ ?remote)$`,
);
// ➤ A title of one piece that ends with working from home ("Software Engineer Remote", «Ingeniero de software en remoto»,
// ➤ «Programista zdalnie»), not with a Romance adjective of a trade («Técnico de soporte remoto»).
const ADJECTIVE = new Set(
  words("remoteAdjective", { folded: true }).map(inPlainLine),
);
const HOME_WORDS = anyOf(
  new Set(
    [...words("remote", { folded: true }), ...words("atHome", { folded: true })]
      .map(inPlainLine)
      .filter((w) => !ADJECTIVE.has(w)),
  ),
  "\\w*",
);
const TITLE_ENDS_REMOTE = new RegExp(`(?<![a-z])(?:${HOME_WORDS})$`);
const TITLE_MODES = [
  ["remote", TITLE_REMOTE],
  ["hybrid", TITLE_HYBRID],
  ["onsite", TITLE_ONSITE],
] as const;
export function titleMode(title: unknown) {
  const parts = foldLetters(String(title || ""))
    .split(/\s[-–—|/]\s|[()[\]|]|,\s|\s\/\s/)
    .map((p) =>
      p
        .replace(/[^a-z0-9% /]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  if (parts.length < 2)
    return TITLE_ENDS_REMOTE.test(parts[0] ?? "") ? "remote" : "";
  const modes = new Set(
    parts
      .map((p) => TITLE_MODES.find(([, re]) => re.test(p))?.[0])
      .filter(Boolean),
  );
  return modes.size === 1 ? [...modes][0] : "";
}

// ── Sentences ────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A work mode a sentence of the title or the text states, when no field, tag, place or label did (the readers of every
// ➤ kind of offer, 6 November 2026: 55 of 317 kinds of offer and 40 of 193 employers' sites said it only in words).
// ➤ Each line is judged in turn: a denial of home work beside the office is on site; a line that is a mode alone is that
// ➤ mode; a line that hedges, denies, speaks of a trial day or lists every mode as a choice says nothing; any other line
// ➤ gives the modes of the statements it makes (STATEMENTS). docs/research/work-mode.md.

// ➤ Numbers of days written in words, as figures («zwei Tage Homeoffice», «vijf dagen per week op locatie»).
// ➤ Also the numbers that alone are other words, here before a day («to dage»).
const DAY_WORDS = {
  ...numbers({ folded: true, most: 5 }),
  ...numbers({ concept: "numbersBeforeYear", folded: true, most: 5 }),
};
const HOME_BEFORE_DAY = wordsFor("homeBeforeDay");
const HOME_DAYS = wordsFor("homeDays");
const DAYS_IN_WORDS = new RegExp(
  `(?<![a-z])(${anyOf(Object.keys(DAY_WORDS))}) (?=(?:${HOME_BEFORE_DAY} ?)?${DAY}(?![a-z])|${HOME_DAYS})`,
  "g",
);
const lineOf = (s: string) =>
  plain(s).replace(DAYS_IN_WORDS, (w) => `${DAY_WORDS[w.trim()]} `);

// ➤ What makes a line say nothing of this job's mode.
// ➤ A trial day on site, a job interview.
const TRIAL = word(wordsFor("trial"));
// ➤ A mode some of the company's roles have ("in many roles", «je nach Position», «según el puesto»).
const HEDGE = word(
  `${wordsFor("dependingOn")} (?:\\w+ )?${wordsFor("role")}|where the role allows`,
);
// ➤ A denial beside the home word («kein Homeoffice», «Homeoffice ist leider nicht möglich», "no remote"), not anywhere in
// ➤ the sentence ("Fully remote - no relocation").
const NO_MODE = new RegExp(
  `(?<![a-z])${NO} (?:\\w+ ){0,2}?${AT_HOME}` +
    `|${AT_HOME} (?:\\w+ ){0,3}?${NO} (?:\\w+ )?(?:${POSSIBLE}|available|offered)` +
    `|${AT_HOME} (?:\\w+ )?${wordsFor("none")}(?![a-z])`,
);
// ➤ A line that names the three modes lists choices, not this job's («Remote, Hybrid & vor Ort», "fully office-based, fully
// ➤ remote, or hybrid": the fifth sample), unless a count of days says how they split («2 days on-site / 3 days remote»),
// ➤ or the hybrid is set out as the two combined ("a hybrid work schedule to … combine the benefits of remote work and …
// ➤ onsite work"), but not when that hybrid is for those near an office only.
const ALL_THREE = [word(AT_HOME), word(HYBRID), word(ON_SITE)];
const FEW = anyOf(Object.keys(numbers({ folded: true, most: 4 })));
const SOME_DAYS = new RegExp(`\\d|(?<![a-z])${FEW}(?![a-z])`);
const COMBINED =
  /(?<![a-z])hybrid (?:work(?:ing)? )?(?:schedule|model|approach|setup|set up|arrangement|policy|environment)s? (?:\w+ ){0,3}?(?:combin|blend|mix|balanc)\w*(?![a-z])/;
const FOR_LOCALS =
  /(?<![a-z])for (?:those|people|candidates|employees|anyone) (?:\w+ )?(?:located|based|living|near|who live)(?![a-z])/;
// ➤ The office and the home together, as a hybrid spells itself out («presencial y teletrabajo», "office and home").
const AND = wordsFor("and");
const BOTH = `(?:${ON_SITE} ${AND} (?:\\w+ )?${AT_HOME}|${AT_HOME} ${AND} (?:\\w+ )?${ON_SITE})`;
const BOTH_PLACES = word(BOTH);
const listsAllThree = (f: string) =>
  ALL_THREE.every((re) => re.test(f)) &&
  !SOME_DAYS.test(f) &&
  !((COMBINED.test(f) || BOTH_PLACES.test(f)) && !FOR_LOCALS.test(f));
const saysNothing = (f: string) =>
  NO_MODE.test(f) || TRIAL.test(f) || HEDGE.test(f) || listsAllThree(f);

// ➤ Not a choice of remote and another mode («remoto o presencial»), nor remote some days a week or in part («trabajo
// ➤ remoto parcial», «Praca zdalna 2 dni w tygodniu»), which is hybrid.
const NOT_WHOLE = String.raw`(?! (?:o|u|i|y|or|ou) )(?! ${PARTLY}(?![a-z]))(?!(?: \w+){0,2} [1-4] ?${DAY})`;
// ➤ Nor after some days of the week or a word of «partly» («2 zile de lucru de acasă», «Częściowo praca zdalna»).
const NOT_IN_PART = String.raw`(?<!(?:[1-4] ?${DAY}(?: \w+){0,3}|${PARTLY}) )`;
// ➤ Remote work as the whole job («fully remote», "remote-first", "remotely 100%", "a remote position"), not a
// ➤ remote trade ("remote support"), nor days of it a year or a month, a perk ("15 days per year of fully remote work").
const WHOLE_REMOTE = new RegExp(
  `(?<![a-z])${WHOLLY} (?:\\w+ )?${AT_HOME}` +
    `|(?<![a-z])${AT_HOME} first(?![a-z])` +
    `|(?<![a-z])${AT_HOME}(?:ly)? \\(?100 ?%` +
    `|(?<![a-z])remote (?!${wordsFor("remoteThing")}\\b)(?:\\w+ ){0,2}?(?:position|role|job|only|basis|opportunity)` +
    `|(?<![a-z])${NOT_IN_PART}${wordsFor("remoteJob")}(?![a-z])${NOT_WHOLE}`,
);
const PER_YEAR = word(`(?:${DAY}|${WEEK}) ${PER} (?:${YEAR}|${MONTH})`);
// ➤ Remote work offered under a condition ("a 100% remote work option during pregnancy", "unless the role is fully remote").
const ONLY_IF = word("option|during|unless|if|when");
// ➤ The job itself named remote or on site, in the languages whose tables name it («Trabajo en remoto», «Feina en remot
// ➤ al 100%», «Trabajo presencial en nuestras instalaciones», «Lavoro in sede»), or the one hired told so («Trabajarás
// ➤ en remoto», "You will work remotely"), and said whole, not as a possibility («Posibilidad de trabajo en remoto»); the
// ➤ office may come first («Irodai munkavégzés»).
const JOB = anyOf(words("job", { folded: true }));
// ➤ A word may stand between the job and its place, but not «partly» («Praca częściowo zdalna» is hybrid).
const NOT_PARTLY = `(?:(?!${PARTLY} )\\w+ )?`;
const JOB_REMOTE = new RegExp(
  `(?<![a-z])${NOT_IN_PART}${JOB} ${NOT_PARTLY}${AT_HOME}(?![a-z])${NOT_WHOLE}|(?<![a-z])${AT_HOME} (?:al|a) 100 ?%` +
    `|(?<![a-z])${NOT_IN_PART}${wordsFor("youWork")} (?:(?:en|de forma) )?${AT_HOME}(?![a-z])${NOT_WHOLE}`,
);
const JOB_ONSITE = new RegExp(
  `(?<![a-z])${JOB} ${NOT_PARTLY}${ON_SITE}(?![a-z])${NOT_WHOLE}|(?<![a-z])${ON_SITE} ${JOB}(?![a-z])${NOT_WHOLE}`,
);
// ➤ On site as the whole job («fully on-site», "an on-site role", «presencial 100%», «100% présentiel», «jeden Tag vor
// ➤ Ort», "five days a week in the office").
const FIVE = anyOf(Object.keys(numbers({ folded: true, least: 5, most: 5 })));
const WHOLE_ONSITE = word(
  [
    `${WHOLLY} ${ON_SITE}`,
    `${ON_SITE} (?:5|five) days`,
    `${ON_SITE} (?:role|position|job|only|basis)`,
    `(?:role|position|job) (?:(?:will be |is )?based|is|requires)(?: \\w+){0,3}? ${ON_SITE}`,
    `full ?time presence ${ON_SITE}`,
    `(?:willingness|able|ability|required|expected) to (?:be|work) ${ON_SITE} in`,
    `${ON_SITE} 100 ?%`,
    `(?<!nicht |nie )(?:jeden tag|taglich|every day) ${ON_SITE}`,
    `(?:5|${FIVE}) ${DAY}${A_WEEK}? ${ON_SITE}`,
    "office first (?:approach|policy|model|culture|principle)",
    "presencial al 100|(?:en|100 ?%) presentiel",
  ].join("|"),
);
// ➤ On site a few days a week is hybrid («on-site in our office … for 3 days per week»).
const A_FEW_DAYS = new RegExp(
  `(?<![a-z\\d])[1-4] ?${DAY} ${PER} ${WEEK}(?![a-z])`,
);

// ➤ «Hybrid» beside a word of work («hybrid working», «hybride werken», «modalidad híbrida», "Location: Hybrid", «op
// ➤ hybride basis»), or in a title as a word of its own ("London (Hybrid)"); alone in a text it was a technique, a
// ➤ model of car or a mixed role one time in eight (the third sample). Not a hybrid thing: clouds, cars, systems, teams
// ➤ («hybrid cloud», «sistema híbrido»).
const WORKS = `(?:${wordsFor("workWord")}|${DAY})`;
const WORK_BESIDE = new RegExp(
  [
    `(?<![a-z])${HYBRID}(?: \\w+)? ${WORKS}(?![a-z])`,
    `(?<![a-z])${HYBRID} (?:and|und|y|et|en|e) (?:flexible\\w*|flexibel\\w*) ${WORKS}(?![a-z])`,
    `(?<![a-z])${WORKS} (?:\\w+ )?${HYBRID}(?![a-z])`,
    `(?<![a-z])(?:(?:on a|op|auf) ${HYBRID} basis|sur une base ${HYBRID})(?![a-z])`,
    `(?<![a-z])${HYBRID} (?:role|position|job|rol|functie|stelle|puesto|poste|post) (?:based|located|in|at|from|op|en|bei|im|a)(?![a-z])`,
    `(?<![a-z])(?:role|position|job) (?:is|will be) (?:\\w+ )?${HYBRID}(?![a-z])`,
    `(?<![a-z])${HYBRID} (?:roles?|positions?|jobs?|opportunit(?:y|ies))(?![a-z])`,
    `(?:^|(?<![a-z])(?:a|our|the|this) (?:[a-z]+ ){0,2}?)${HYBRID} (?:work(?:ing)? )?model(?![a-z])(?! (?:of|for) )`,
  ].join("|"),
);
// ➤ The two places as the way of working («Modalidad híbrida (presencial y teletrabajo)», «combinamos presencial y
// ➤ teletrabajo»), not a task done in both («gestión de equipos en remoto y presenciales»).
const WORK_IN_BOTH_PLACES = word(
  `(?:${WORKS}|combin\\w*)(?: \\w+){0,2}? ${BOTH}`,
);
// ➤ Hybrid work in one word, as Finnish writes it («Hybridityö on mahdollista», «työskentelemme hybridimallilla»).
const HYBRID_WORK = word(wordsFor("hybridWork"));
const A_HYBRID_THING = word(
  `${HYBRID} ${wordsFor("hybridThing")}|${wordsFor("thingHybrid")} ${HYBRID}|on prem\\w* (?:and|und|en|et|y) ${HYBRID}`,
);

// ➤ Days of the week at home or in the office, written either way round («2 Tage Homeoffice», "3 days a week in the
// ➤ office", "Ability to be onsite in San Jose, CA at least 2 times per week", «vor Ort an 3 Tagen pro Woche»), their count
// ➤ in figures or words («treballar des de casa dos dies per setmana»).
const DAYS_HOME = new RegExp(
  [
    `(?<![a-z\\d])\\d ?${DAY}${A_WEEK}?(?: \\w+){0,3} ${AT_HOME}`,
    `${AT_HOME}(?: \\w+){0,4} (?:\\d ?|${FEW} )${DAY}(?![a-z])`,
    `(?<![a-z\\d])\\d ?${HOME_BEFORE_DAY}(?: work(?:ing)?)? ?${DAY}(?![a-z])`,
    `(?<![a-z\\d])\\d ?${HOME_DAYS}`,
  ].join("|"),
);
// ➤ Spanish says how before where («1 día por semana de manera presencial»).
const IN_A_MANNER = "(?:de (?:manera|forma) )?";
const DAYS_OFFICE = new RegExp(
  `(?<![a-z\\d])[1-4] ?${DAY} ${ON_SITE}${A_WEEK}` +
    `|(?<![a-z\\d])[1-4] ?${DAY}${A_WEEK}? (?:(?:in|at) (?:our|the) (?:[a-z]+ ){0,2}?office|${IN_A_MANNER}${ON_SITE})`,
);
const TIMES = `[1-4] ?(?:${DAY}|times|x)`;
// ➤ After the office, only with a verb of being there or a word of an office («Visit customers on site 2 times per week» is
// ➤ a task).
const IN_AN_OFFICE =
  "in (?:the |our )?office|im buro|op kantoor|au bureau|en la oficina|in ufficio";
const OFFICE_DAYS_AFTER = new RegExp(
  [
    `(?<![a-z])on ?site [1-4] ?days? (?:a|per) week(?![a-z])`,
    `(?<![a-z])(?:(?:our|the) in office days are|office days are|work(?:ing)? from home on (?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?))(?![a-z])`,
    `(?:^|hybrid )${ON_SITE}(?: [a-z0-9]+){0,3}? ${TIMES}(?![a-z])`,
    `(?<![a-z])(?:(?:be|work\\w*|present|presence) ${ON_SITE}|${IN_AN_OFFICE})(?: [a-z0-9]+){0,6}? (?:at least |minimum |min |an |op )?${TIMES}${A_WEEK}(?![a-z])`,
  ].join("|"),
);
// ➤ Days at home a month («Télétravail : jusqu'à 10 jours par mois», «8 jours de télétravail par mois»): hybrid, 59 of 66.
const MONTH_HOME = new RegExp(
  `${AT_HOME} (?:\\w+ ){0,4}?\\d{1,2} ?${DAY} ${PER} ${MONTH}(?![a-z])` +
    `|(?<![a-z\\d])\\d{1,2} ?${DAY} (?:de |of |an )?${AT_HOME} ${PER} ${MONTH}(?![a-z])`,
);
// ➤ A share of the week at home («60 % Homeoffice»), remote work as a part or most of the week («auch remote arbeiten»,
// ➤ "partly remote", «teilweise im Homeoffice», «télétravail occasionnel», «majoritairement en télétravail»; a word or
// ➤ two between only after a word for a share: «auch in Remote-Situationen» is a skill), a home office as a possibility
// ➤ or an option («Homeoffice möglich», «Homeoffice-Option», «die Option auf Homeoffice», «des options de télétravail»,
// ➤ «Du kannst im Homeoffice arbeiten»), flexible or welcome («flexibel im Home Office», «Télétravail flexible»,
// ➤ «remote-freundlich»), and an allowance, a place or a charter for it («thuiswerkvergoeding», «Charte du
// ➤ Télétravail», «Homeoffice-Pauschale»). The free-label bench, 9 November 2026. Not the whole of it: «100% en remoto»
// ➤ is remote; nor none of it: «Remote 0 %» is on site.
const SHARE = String.raw`(?<!\d)(?!(?:100|0) ?%)\d{1,3} ?%`;
const SHARE_HOME = new RegExp(
  `${SHARE} ?(?:\\w+ ){0,2}?${AT_HOME}|${AT_HOME} (?:\\w+ ){0,2}?${SHARE}`,
);
const HOME_PARTLY = new RegExp(
  `(?<![a-z])(?:${wordsFor("occasionally")} |(?:${PARTLY}|${wordsFor("mostly")}) (?:\\w+ ){0,2}?)${AT_HOME}` +
    `|(?<![a-z])${AT_HOME} (?:\\w+ ){0,2}?${PARTLY}(?![a-z])` +
    `|(?<![a-z])${AT_HOME} ${wordsFor("occasionally")}(?![a-z])`,
);
const HOME_OFFICE = wordsFor("homeOffice");
const HOME_POSSIBLE = new RegExp(
  [
    `(?<![a-z])${AT_HOME} (?:work )?${POSSIBILITY}(?![a-z])`,
    `(?<![a-z])${HOME_OFFICE} ${wordsFor("arrangement")}(?![a-z])`,
    `(?<![a-z])options? (?:auf|zum|zu|fur|de|du) (?:\\w+ )?(?:${HOME_OFFICE}|${AT_HOME})(?![a-z])`,
    `(?<![a-z])${wordsFor("youMay")} (?:\\w+ ){0,4}?${AT_HOME}`,
    `${AT_HOME}(?: \\w+){0,4} ${POSSIBLE}(?![a-z])`,
    `${POSSIBILITY} (?:\\w+ ){0,4}?${AT_HOME}`,
    `(?<![a-z])flexib\\w* (?:im |in |from |para |de |per )?(?:${AT_HOME}|${HOME_OFFICE})|${AT_HOME} flexib\\w*`,
    `(?<![a-z])${AT_HOME} ${wordsFor("friendly")}`,
  ].join("|"),
);
const HOME_ALLOWANCE = word(wordsFor("homeAllowance"));
// ➤ Days of the week at home («Teletrabajo los miércoles», «dienstags und donnerstags im Homeoffice»), not the working week
// ➤ a remote job keeps («en remoto de lunes a viernes», "remote, Monday to Friday").
const WEEKDAY = wordsFor("weekday");
const UNTIL = "(?:a|al|bis|to|until|au|tot|-)";
const HOME_ON_WEEKDAYS = new RegExp(
  `(?<![a-z])${AT_HOME} (?:(?!${UNTIL} )\\w+ ){0,2}?${WEEKDAY}(?! ${UNTIL} )` +
    `|(?<!${UNTIL} )(?<![a-z])${WEEKDAY}(?: ${AND} ${WEEKDAY})? (?:\\w+ )?${AT_HOME}`,
);

// ➤ German: days of presence a week («2 Präsenztage pro Woche», «3 Tage pro Woche ins Büro», «1–2 Tage im Office»):
// ➤ hybrid, 13 of 14 adverts the readers missed had a hybrid field. No remote role, no home office («Das ist keine
// ➤ Remote-Rolle», «kein Homeoffice»): on site, 32 of 33; not when single days at home are allowed («einzelne Remote-Tage
// ➤ sind kein Problem»). The free-label bench, 9 November 2026.
const PRESENCE_DAYS =
  /(?<![a-z\d])[1-4](?: (?:bis )?[2-4])? (?:prasenztage?n?|burotage?n?)(?![a-z])|(?<![a-z\d])[1-4](?: (?:bis )?[2-4])? tage?n? (?:pro woche |die woche |in der woche |wochentlich )?(?:prasenz\w*|ins buro|im office|am standort|in der firma|in unserem (?:\w+ )?buro)(?![a-z])/;
const NOT_REMOTE =
  /(?<![a-z])(?:keine? remote (?:rolle|position|stelle|company|firma|moglichkeit|job|arbeit\w*)|kein (?:homeoffice|home office|remote)|nicht remote|keine (?:homeoffice|home office) (?:stelle|position|moglichkeit))(?![a-z])/;
const SOME_HOME_DAYS =
  /(?<![a-z])(?:einzelne (?:remote|homeoffice|home office|mobile)|remote tage sind|homeoffice tage sind)(?![a-z])/;

// ➤ French: work on site («poste en présentiel», «présentiel obligatoire») when the line names no work at home, 12 of
// ➤ 12; a post, contract or way of work that is hybrid («Poste hybride à Lyon», «CDI en hybride», «mode de travail
// ➤ hybride», a line that opens «En hybride»), 80 of 85, not a mixed profile («profil hybride alliant…») nor a choice
// ➤ («100 % remote ou hybride»); «télétravail» in a list of perks («horaires flexibles, RTT, télétravail, ticket
// ➤ restaurant»), some days at home, 267 of 304, not «en télétravail», a culture or a policy of it, nor one said whole.
const PRESENTIEL =
  /(?<![a-z])(?:(?:poste|travail|mission|activite|emploi)s? (?:\w+ ){0,2}?en presentiel|presentiel (?:obligatoire|requis|exige|impose)|(?:poste|mission)s? (?:base|situe)e?s? sur site)(?![a-z])/;
const HYBRID_FR =
  /(?<![a-z])(?:(?:poste|emploi|fonction|mode|modele|format|rythme|politique|fonctionnement|organisation|cadre de travail|travail|teletravail|cdi|cdd|freelance|mission|contrat)s? (?:de travail )?(?:est |sera )?(?:en )?hybride|hybride (?:entre|avec|[1-4] ?j)|^ *en hybride)(?![a-z])/;
const NOT_HYBRID_FR =
  /(?<![a-z])(?:profil|role|positionnement|un hybride|melant|alliant|ou hybride|hybride ou|apres)(?![a-z])/;
const TELETRAVAIL = /(?<![a-z])tele ?travail(?![a-z])/;
const PERKS_FR =
  /(?<![a-z])(?:rtt|mutuelle|tickets? restaurant|titres? restaurant|carte (?:restaurant|swile)|swile|prime|interessement|participation|cse|conges|avantages|horaires flexibles|forfait mobilite|velo|locaux|conditions de travail|cadre de travail)(?![a-z])/;
const NOT_PERK_FR =
  /(?<![a-z])(?:100 ?%|total|complet|integral|depuis|culture|full|entierement|a distance|fully|en tele ?travail|politiques? (?:de |du )?tele ?travail)(?![a-z])/;
// ➤ Spanish: the work done on site («Esta oportunidad es presencial», «Modalidad presencial», «trabajar de manera presencial
// ➤ en Tres Cantos»), not a task done face to face («atención presencial», «acciones formativas presenciales»).
const PRESENCIAL =
  /(?<![a-z])(?:(?:oportunidad|modalidad|jornada|puesto|posicion|trabajo|empleo) (?:es |sera )?presencial|(?:trabaj|trabalh|desempen)\w* (?:\w+ ){0,2}?(?:de manera|de forma|en modalidad|en modo) presencial)(?![a-z])(?! (?:o|u|y|e) )/;

const AT_HOME_WORD = word(AT_HOME);
const ON_SITE_WORD = word(ON_SITE);
const holds = (f: string, ...patterns: RegExp[]) =>
  patterns.some((re) => re.test(f));
// ➤ The statements a line may make, each with the mode it gives. A line may make several and counts as the most flexible
// ➤ («HO bis zu 3 Tage/Woche nach der Einarbeitung (komplett vor Ort)» is hybrid).
const STATEMENTS: {
  mode: Mode;
  says: (f: string, isTitle: boolean) => boolean;
}[] = [
  {
    mode: "remote",
    says: (f) =>
      (WHOLE_REMOTE.test(f) ||
        (JOB_REMOTE.test(f) && !HOME_POSSIBLE.test(f))) &&
      !holds(f, ONLY_IF, PER_YEAR, SHARE_HOME),
  },
  {
    mode: "onsite",
    says: (f) => holds(f, WHOLE_ONSITE, JOB_ONSITE) && !A_FEW_DAYS.test(f),
  },
  {
    mode: "hybrid",
    says: (f) => holds(f, WHOLE_ONSITE, JOB_ONSITE) && A_FEW_DAYS.test(f),
  },
  {
    mode: "hybrid",
    says: (f, isTitle) =>
      (isTitle ? HYBRID_ALONE : WORK_BESIDE).test(f) && !A_HYBRID_THING.test(f),
  },
  { mode: "hybrid", says: (f) => HYBRID_WORK.test(f) },
  {
    mode: "hybrid",
    says: (f) =>
      holds(
        f,
        DAYS_HOME,
        DAYS_OFFICE,
        OFFICE_DAYS_AFTER,
        MONTH_HOME,
        PRESENCE_DAYS,
      ) ||
      holds(
        f,
        HOME_PARTLY,
        HOME_POSSIBLE,
        HOME_ALLOWANCE,
        WORK_IN_BOTH_PLACES,
        HOME_ON_WEEKDAYS,
      ),
  },
  { mode: "hybrid", says: (f) => SHARE_HOME.test(f) && !ONLY_IF.test(f) },
  {
    mode: "hybrid",
    says: (f) => HYBRID_FR.test(f) && !holds(f, NOT_HYBRID_FR, A_HYBRID_THING),
  },
  {
    mode: "hybrid",
    says: (f) =>
      TELETRAVAIL.test(f) && PERKS_FR.test(f) && !NOT_PERK_FR.test(f),
  },
  {
    mode: "onsite",
    says: (f) => holds(f, PRESENTIEL, PRESENCIAL) && !AT_HOME_WORD.test(f),
  },
];
// ➤ A line that is a mode alone («🌐 Remote work», «#hybrid», «Hybride», «Hybrid, onsite 3+ days a week»), as a board's
// ➤ field would write it, maybe with its place ("Remote (UK)", "Remote within Ireland", "Office-based in Leeds"). The
// ➤ free-label bench, 9 November 2026.
const ITS_PLACE = String.raw`(?: (?:in|within|across|from) (?:the )?[a-z]+(?: [a-z]+)?| (?:uk|eu|emea|europe|dach|benelux|nordics)(?: only)?)?`;
const LONE_MODE = new RegExp(
  String.raw`^(?:((?:hybrid|hybride|hibrid[oa]|ibrid[oa])(?: work(?:ing)?| model| schedule)?(?: on ?site [1-4]\+? days?(?: a| per)? week)?)` +
    String.raw`|((?:remote(?: work(?:ing)?| first| only)?|fully remote|100 ?% remote|work(?:ing)? from home|wfh|home based)${ITS_PLACE})` +
    String.raw`|((?:on ?site(?: only)?|onsite(?: only)?|in office|office based)${ITS_PLACE}))$`,
);
function loneMode(f: string): Mode | "" {
  const m = f.match(LONE_MODE);
  return !m ? "" : m[1] ? "hybrid" : m[2] ? "remote" : "onsite";
}
// ➤ No home office, and the office named: on site.
const deniesHome = (f: string) =>
  !TRIAL.test(f) &&
  ((NO_MODE.test(f) && holds(f, WHOLE_ONSITE, ON_SITE_WORD)) ||
    (NOT_REMOTE.test(f) && !SOME_HOME_DAYS.test(f)));
function modesOfLine(f: string, isTitle: boolean): Mode[] {
  if (deniesHome(f)) return ["onsite"];
  const lone = isTitle ? "" : loneMode(f);
  if (lone) return [lone];
  if (!f || saysNothing(f)) return [];
  return STATEMENTS.filter((s) => s.says(f, isTitle)).map((s) => s.mode);
}
const LONGEST_LINE = 300;
export function modeInSentences(title: unknown, text: unknown) {
  const lines = [
    String(title || ""),
    ...String(text || "").split(/(?<=[.!?])\s+|\n+/),
  ];
  const modes = lines.flatMap((line, i) =>
    line.length > LONGEST_LINE ? [] : modesOfLine(lineOf(line), i === 0),
  );
  return mostFlexible([titleMode(title), ...modes]);
}

// ── The advert ───────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ The trade's hybrid machines («Hybrid- und Elektrofahrzeuge», «Hybrid Powertrain», «Hybrid Inverters») and remote
// ➤ work that is the trade's («remote diagnosis», «Remote Support Engineer») name no mode (DAA-08).
const HYBRID_MACHINE = new RegExp(
  `\\bhybrid\\p{L}*[\\s-]+(?:\\p{L}+[\\s-]+)?${anyOf(words("hybridMachine", { bare: true }))}(?![\\p{L}])`,
  "giu",
);
// ➤ A hybrid joined by a hyphen to what it is («Hybrid-Cloud», «hybridi-integraatioalusta») is that thing, unless that is
// ➤ work or its place («Hybrid-Arbeit», «hybrid-remote»).
const WORK_OR_PLACE = anyOf(
  ["workWord", "atHome", "onSite", "remote"].flatMap((c) =>
    words(c, { bare: true }),
  ),
);
const HYBRID_COMPOUND = new RegExp(
  `(?<![\\p{L}])${anyOf(words("hybrid", { bare: true }))}-(?!${WORK_OR_PLACE}(?![\\p{L}]))\\p{L}+`,
  "giu",
);
const REMOTE_SERVICE = new RegExp(
  `\\bremote[\\s-]+${anyOf(words("remoteThing"))}\\p{L}*`,
  "giu",
);
const withoutThings = (s: unknown) =>
  String(s || "")
    .replace(HYBRID_MACHINE, " ")
    .replace(HYBRID_COMPOUND, " ")
    .replace(REMOTE_SERVICE, " ");
// ➤ On site or remote, as the candidate wishes («vor Ort und auch remote möglich»): a choice, and a source's remote stays
// ➤ remote (DAA-08).
const EITHER =
  /(?<![\p{L}])(?:vor ort|on[ -]?site|im büro|in the office) (?:und|oder|or|and) (?:auch |also )?(?:remote|im homeoffice|from home)(?![\p{L}])|(?<![\p{L}])remote (?:oder|or) (?:vor ort|on[ -]?site)(?![\p{L}])/iu;
// ➤ The fields of a raw advert the work mode is read from.
export type ModeRaw = {
  title?: unknown;
  description?: unknown;
  location?: unknown;
  mode?: unknown;
  modeTag?: unknown;
};
// ➤ The mode of a RawOffer: its source's own field (`mode`) when it has one. Else the LinkedIn tag (`modeTag`, read by the
// ➤ adapter in the whole text, or found in the text kept), the location and a labelled field: one of them alone decides,
// ➤ and when they disagree ("#LI-Onsite" on an advert whose location is "Remote", a template's tag) the advert says
// ➤ nothing for sure. Last, its sentences. The letter the records carry (lib/work-modes.ts): o, h or r; '' when nothing
// ➤ says.
// ➤ Work at home written short in capitals («2 Tage HO pro Woche», «TT 2 jours par semaine»), spelled out: only in
// ➤ capitals, as «ho» is also Catalan «it». A soft hyphen inside a word («Möglich­keit zu Homeoffice-Vereinbarungen»)
// ➤ splits it for every reader below.
const AT_HOME_IN_CAPITALS = new RegExp(
  `(?<![\\p{L}])(?:${words("atHomeInCapitals", { bare: true })
    .map((w) => w.toUpperCase())
    .join("|")})(?![\\p{L}])`,
  "gu",
);
const readable = (s: unknown) =>
  String(s || "")
    .replace(/­/g, "")
    .replace(AT_HOME_IN_CAPITALS, "home office");
export function workModeOf(raw: ModeRaw): string {
  raw = {
    ...raw,
    title: readable(raw.title),
    description: readable(raw.description),
  };
  const field = modeWord(raw.mode);
  // ➤ A source's remote where its own text says hybrid is hybrid: sites mark TELECOMMUTE on posts with some days at home
  // ➤ («Bis zu 60% Homeoffice», Raiffeisen Software's advert in the owner's photo; «Anteilig remote»; the readers).
  // ➤ Not a hybrid that is the trade's («hybride Microsoft-Infrastruktur», «Hybrid-Cloud-Szenarien») or the employer's
  // ➤ product («bessere hybride Arbeitswelten»): the sample of 7 November 2026.
  if (field === "remote" && !EITHER.test(String(raw.description || ""))) {
    const text = withoutThings(raw.description);
    if (
      [
        modeWord(raw.modeTag) || tagMode(text),
        labelledMode(text),
        modeInSentences(withoutThings(raw.title), text),
      ].includes("hybrid")
    )
      return MODE_LETTER.hybrid;
  }
  if (field) return MODE_LETTER[field];
  const tag = modeWord(raw.modeTag) || tagMode(raw.description);
  const place = placeMode(raw.location);
  const labelled = labelledMode(raw.description);
  const said = [...new Set([tag, place, labelled].filter(Boolean))];
  if (said.length === 1) return MODE_LETTER[said[0] as Mode];
  if (said.length) return "";
  const written = modeInSentences(
    withoutThings(raw.title),
    withoutThings(raw.description),
  );
  return written ? MODE_LETTER[written] : "";
}
