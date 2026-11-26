// ➤ An advert's contract and working time, only from a field its source fills for that (docs/research/contract-type.md):
// ➤ never from the advert's words, nor from an agency's name, nor from FULL_TIME, which states the hours alone.
// ➤ ct: 'i' permanent, 't' temporary ('t6' with its months), 'e' agency work, 'eo' agency work with the option to stay,
// ➤ 'to' temporary with the option to stay, 'p' internship or training, 'a' freelance.
// ➤ wt: 'c' full time, 'p' part time ('p20' with its hours a week).
// ➤ The words of each kind and each working time are in the language tables (builder/words), one concept each.
// The legacy's builder/contract.ts, copied (legacy resync T003): only its imports changed. Its own comments keep their marks.
import { foldLetters } from "../../shared/kit/fold.js";
import {
  withoutDenied,
  withoutUnsaid,
  type Fact,
} from "../../shared/words/stance.js";
import { anyOf, numbers, words } from "../../shared/words/index.js";

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ A value as the readers compare it: no accents or capitals, quotes, dashes and underscores as spaces.
// ➤ «ETT», a Spanish temp agency, is one only in capitals: «ett» is also Swedish "a" («hos ett företag»).
const spelledOut = (s: unknown) =>
  String(s || "").replace(/\bETT\b/g, "empresa de trabajo temporal");
// ➤ Romanian joins a figure of 20 or more to its unit with «de» («20 de ore», «24 de luni»): the figure and the unit.
const UNIT = anyOf(
  new Set(
    ["hour", "day", "week", "month", "year"].flatMap((u) =>
      words(u, { folded: true }),
    ),
  ),
  "\\w*",
);
const FIGURE_JOIN = new RegExp(
  `(\\d)\\s+${anyOf(words("figureJoin", { folded: true }))}\\s+(?=${UNIT}(?![a-z]))`,
  "g",
);
export const withFiguresJoined = (folded: string) =>
  folded.replace(FIGURE_JOIN, "$1 ");
// ➤ Months and years written in words, as figures («seis meses», «ein Jahr», «na rok»: the tables' `numbers` and `oneYear`).
const WORD_NUMBER = numbers({ folded: true });
const MONTH_OR_YEAR = anyOf(
  ["month", "year"].flatMap((u) => words(u, { folded: true })),
  "\\w*",
);
const NUMBER_IN_WORDS = new RegExp(
  `\\b(${anyOf(Object.keys(WORD_NUMBER))}) (?=${MONTH_OR_YEAR}\\b)`,
  "g",
);
const ONE_YEAR = new RegExp(
  `\\b${anyOf(words("oneYear", { folded: true }), "\\w*")}\\b`,
  "g",
);
const inFigures = (folded: string) =>
  withFiguresJoined(folded)
    .replace(NUMBER_IN_WORDS, (_, w: string) => `${WORD_NUMBER[w]} `)
    .replace(ONE_YEAR, "1 year");
const clean = (s: unknown) =>
  inFigures(
    foldLetters(spelledOut(s))
      .replace(/["'“”«»]/g, " ")
      .replace(/[\s_-]+/g, " ")
      .trim(),
  );
// ➤ A concept's words cleaned the same way, as one alternation; a stem may run on.
const wordsFor = (...concepts: string[]) =>
  anyOf(new Set(concepts.flatMap((c) => words(c)).map(clean)), "\\w*");
const wholeWords = (alternation: string) => new RegExp(`\\b${alternation}\\b`);

// ── Temporary, then permanent ────────────────────────────────────────────────────────────────────────────────────────
// ➤ A contract of so many months or years («Contrato de 3 meses», «contracte inicial de 6 mesos», "a contract for 6 months",
// ➤ "a 12-month contract", «Contratto di un anno»).
const CONTRACT = wordsFor("contract"),
  MONTH = wordsFor("month"),
  YEAR = wordsFor("year"),
  PROBATION = wordsFor("probation");
// ➤ So many months or years that are no trial period nor experience («6 meses», «einem Jahr», not «6 meses de prueba»,
// ➤ «3 Jahren Berufserfahrung»).
const NOT_TRIAL = `(?!(?:,? \\w+){0,2} \\w*(?:${PROBATION}|${wordsFor("experience")}))`;
const SOME_UNITS = `\\d{1,2} (?:${MONTH}|${YEAR})\\b${NOT_TRIAL}`;
const MONTHS_CONTRACT = `(?:${CONTRACT} (?:\\w+ ){0,2}${SOME_UNITS}|${SOME_UNITS} ${CONTRACT})`;
const SOME_MONTHS = `(?:\\w+ ){0,2}(?:${MONTH}|${YEAR})\\b${NOT_TRIAL}`;
// ➤ Up to n words between two parts of a phrase, commas and an opening bracket allowed.
const upTo = (n: number) => `(?:,? \\(?\\w+){0,${n}}?,? \\(?`;
// ➤ The permanent contract a prospect leads to; there Dutch «vast» is one, but not «vast (te) stellen», «to set», and
// ➤ German «Übernahme» (being taken on) is one, but not «Übernahme der Teamleitung», «taking over» a task.
const PERMANENT_AT_THE_END = `(?:${wordsFor("permanent")}|${wordsFor("permanentInProspect")})\\b(?! (?:te )?stellen| (?:der|des|von|eines|einer)\\b)`;
// ➤ A word of a chance or of a later step: the stance's (builder/stance.ts) and those a prospect alone holds as such.
const MAY_BECOME = wordsFor("chance", "mayBecome"),
  LATER = wordsFor("laterStep", "later");
// ➤ A fixed term that may become permanent:
// ➤ - a temporary contract, a word of possibility or of a later step, and the permanent one, each a few words from the
// ➤   last («Contrato temporal con posibilidad de pasar a indefinido», «CDD avec possibilité de CDI», «befristet mit
// ➤   Aussicht auf Entfristung», «Jaarcontract, hierna vast dienstverband»);
// ➤ - a prospect of the permanent one («Kans op een vast contract»);
// ➤ - a later step to it («Na deze proeftijd volgt een vaste aanstelling»);
// ➤ - the permanent one after so many months («Tras 6 meses, contrato indefinido», «CDI après 6 mois»);
// ➤ - a phrase that says it whole ("temp to perm", «CDD évolutif en CDI», «Contrato inicial de 6 meses + indefinido»);
// ➤ - or a temporary contract and one word for the chance of a hire («befristet mit Übernahmeoption»).
export const TEMPORARY_THEN_PERMANENT = new RegExp(
  [
    `\\b${MONTHS_CONTRACT}\\b ?\\+ ?(?:\\w+ ){0,2}${PERMANENT_AT_THE_END}`,
    `\\b(?:${wordsFor("temporary")}|${MONTHS_CONTRACT})\\b${upTo(12)}(?:${MAY_BECOME}|${LATER})\\b${upTo(8)}${PERMANENT_AT_THE_END}`,
    `\\b${wordsFor("prospectOf")} (?:\\w+ )?${PERMANENT_AT_THE_END}`,
    `\\b${wordsFor("later")}${upTo(6)}${wordsFor("permanent")}\\b`,
    `\\b${wordsFor("after")} ${SOME_MONTHS}${upTo(5)}${PERMANENT_AT_THE_END}`,
    `\\b${wordsFor("permanent")}\\b (?:\\w+ )?${wordsFor("after")} ${SOME_MONTHS}`,
    `\\b${wordsFor("temporaryThenPermanent")}\\b`,
    `\\b${wordsFor("temporary")}\\b${upTo(12)}${wordsFor("hireInProspect")}`,
  ].join("|"),
);
// ➤ Agency work that may become a permanent post, or leads to one («Interim met optie op vast werk», «intérimaire avec
// ➤ option», «Zeitarbeit mit Übernahmechance», «Zuerst Zeitarbeit, danach Festanstellung»).
export const AGENCY_THEN_PERMANENT = new RegExp(
  `\\b${wordsFor("agencyWork")}\\b${upTo(12)}(?:(?:${MAY_BECOME}|${LATER})\\b${upTo(8)}${PERMANENT_AT_THE_END}|${wordsFor("hireInProspect")})` +
    `|\\b${wordsFor("agencyThenPermanent")}\\b`,
);

// ── The kinds ────────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ Dutch «vast» alone is «firm» or «fixed»; as the other choice to «tijdelijk» it is a permanent contract.
const VAST_OR_TEMPORARY =
  /\bvast(?= (?:of|\/) tijdelijk)|(?<=tijdelijk (?:of|\/) )vast\b/;
const TEMPORARY = wholeWords(wordsFor("temporary"));
// ➤ A fixed pay is no permanent contract: «Retribución fija + variable», «Salario fijo más comisiones».
const NOT_PAY = `(?<!\\b${wordsFor("payWord")} )`,
  NOT_VARIABLE = `(?! ?(?:\\+|y|mas|i|e) ?variable)`;
const PERMANENT = new RegExp(
  `${NOT_PAY}\\b${wordsFor("permanent")}\\b${NOT_VARIABLE}|${VAST_OR_TEMPORARY.source}`,
);
// ➤ A prospect is read before its temporary and permanent words, as it says how it holds them; then the kinds in the order
// ➤ they are tried, the narrower first: a permanent contract with an agency («CDI intérimaire») before agency work, an
// ➤ English fixed-term post before «interim», a contract of so many months last, after any word that names the kind
// ➤ («Contrato indefinido, 6 meses de prueba»).
const PROSPECTS: [string, RegExp][] = [
  ["eo", AGENCY_THEN_PERMANENT],
  ["to", TEMPORARY_THEN_PERMANENT],
];
const PROSPECT: Fact = {
  member: new RegExp(PROSPECTS.map(([, rule]) => rule.source).join("|")),
  valueOf: (s) => PROSPECTS.find(([, rule]) => rule.test(s))?.[0] ?? "",
};
const KINDS: [string, RegExp][] = [
  ["i", wholeWords(wordsFor("permanentWithAgency"))],
  ["t", /\bfixed term \(?(?:interim|convertible)/],
  ["p", wholeWords(wordsFor("training"))],
  ["e", wholeWords(wordsFor("agencyWork"))],
  ["a", wholeWords(wordsFor("freelance"))],
  ["t", TEMPORARY],
  ["i", PERMANENT],
  ["t", wholeWords(MONTHS_CONTRACT)],
];
// ➤ A temporary contract's months, or its years («CDD de 3 ans»), from one to five years; not a trial's («een proeftijd van een
// ➤ jaar»).
const duration = (unit: string) =>
  `(?<!${PROBATION}(?: \\w+){0,2} )\\b(\\d{1,2}) ?${unit}\\b(?!(?: \\w{1,2})? ${PROBATION})`;
const MONTHS = new RegExp(duration(MONTH));
const YEARS = new RegExp(duration(YEAR));
function temporaryFor(s: string) {
  const months =
    Number(s.match(MONTHS)?.[1]) || Number(s.match(YEARS)?.[1]) * 12;
  return months >= 1 && months <= 60 ? `t${months}` : "t";
}

// ➤ Any word of a contract of any kind, a prospect too; a kind's word and the kind it names.
export const ANY_KIND_WORD = new RegExp(
  [...PROSPECTS, ...KINDS].map(([, rule]) => rule.source).join("|"),
  "g",
);
const kindOf = (s: string) => KINDS.find(([, rule]) => rule.test(s))?.[0] ?? "";
export const KIND: Fact = {
  member: new RegExp(KINDS.map(([, rule]) => rule.source).join("|")),
  valueOf: kindOf,
};
// ➤ The kind a contract field names; '' when it names none, nor one of a choice («CDI / CDD»), offered or denied
// ➤ («unbefristete Direktanstellung, keine Zeitarbeit»: builder/stance.ts), nor both a permanent and a temporary one.
// ➤ source: Adzuna's only values are "permanent" and "contract", so its "contract" is "not permanent"; the
// ➤ applicant-tracking systems offer "Contract" beside "Temporary", so theirs is the freelancer's.
export function contractKind(value: unknown, { source = "" } = {}): string {
  const folded = clean(value);
  const prospect = PROSPECTS.find(([, rule]) => rule.test(folded));
  if (prospect && prospect[1].test(withoutDenied(folded, PROSPECT)))
    return prospect[0];
  const s = withoutUnsaid(folded, KIND);
  if (!s.trim()) return "";
  if (s === "contract") return source === "adzuna" ? "t" : "a";
  // ➤ "Regular" as a whole value is a permanent employee, as Workday and PerkinElmer's site write it beside "Temporary" (the
  // ➤ owner's example, 1 November 2026); inside a sentence it is a word like any other ("regular travel").
  if (/^regular(?: (?:employee|position|staff|full time|part time))?$/.test(s))
    return "i";
  // ➤ So is Dutch «Vast» as a whole value («Dienstverband: Vast»).
  if (s === "vast") return "i";
  for (const [kind, rule] of KINDS) {
    if (!rule.test(s)) continue;
    if (
      (rule === PERMANENT && TEMPORARY.test(s)) ||
      (rule === TEMPORARY && PERMANENT.test(s))
    )
      return "";
    return kind === "t" ? temporaryFor(s) : kind;
  }
  return "";
}

// ── Working time ─────────────────────────────────────────────────────────────────────────────────────────────────────
const IN_COMPOUND = `(?:s?${wordsFor("jobInCompound")})?`;
const FULL = wholeWords(`(?:${wordsFor("fullTime")})${IN_COMPOUND}`);
const PART = wholeWords(`(?:${wordsFor("partTime")})${IN_COMPOUND}`);
// ➤ Any word of a permanent or temporary contract or of full or part time, in a text folded as `clean` folds it but its
// ➤ lines kept: a quick look at a whole text before its lines are read one by one (builder/lib/labels.ts).
export const KIND_WORD = new RegExp(
  KINDS.filter(([kind]) => kind === "i" || kind === "t")
    .map(([, rule]) => rule.source)
    .join("|"),
);
export const WORKING_TIME: Fact = {
  member: new RegExp(`${FULL.source}|${PART.source}`),
  valueOf: (s) => (FULL.test(s) ? "c" : "p"),
};
export const KIND_OR_TIME = new RegExp(
  `${KIND_WORD.source}|${WORKING_TIME.member.source}`,
);
export const foldedLines = (s: unknown) =>
  inFigures(
    foldLetters(spelledOut(s))
      .replace(/["'“”«»]/g, " ")
      .replace(/[ \t_-]+/g, " "),
  );
const NUMBER = "(\\d{1,2}(?:[.,]\\d{1,2})?)";
const HOUR = wordsFor("hour");
// ➤ A week, also in a field's short form («wk», «w»), and the words before it: "per week", «35H/semaine», «pro Woche»;
// ➤ or «weekly», or a language's own phrase for «a week» («tygodniowo»).
const WEEK = anyOf([...new Set(words("week").map(clean)), "wk", "w"], "\\w*");
const WEEKLY = wordsFor("weekly", "perWeek");
const PER_WEEK = `(?:(?:\\/|${wordsFor("per")}) ?${WEEK}|${WEEKLY})`;
const NAMES_A_WEEK = new RegExp(`${wordsFor("week")}|wk|${WEEKLY}`);
// ➤ A field that gives only the hours a week ("40", "40 hours per week", «38,5 Std./Woche», «heti 20 óra») or the share of
// ➤ a full week ("100%", «Pensum 100%»).
const WEEK_ONLY = new RegExp(
  `^(?:${WEEKLY} )?${NUMBER} ?${HOUR}?\\.? ?(?:${PER_WEEK})?$`,
);
const HOURS_LABEL = wordsFor("hoursLabel");
// ➤ Cleaning turns a range's hyphen into a space («50 80%»); an en dash stays.
const SHARE_OR_RANGE = "(\\d{2,3})(?: (?:– )?(\\d{2,3}))? ?%";
const SHARE = new RegExp(`^(?:${HOURS_LABEL} )?${SHARE_OR_RANGE}$`);
// ➤ A text's line that is only a share after its label («Pensum 100%», «Pensum 50-80%»); a bare «80%» line could be anything.
const LABELLED_SHARE = new RegExp(`^${HOURS_LABEL} ${SHARE_OR_RANGE}$`);
export const namesShare = (value: unknown) => LABELLED_SHARE.test(clean(value));
// ➤ A range, its ends joined by a word and opened by one («zwischen 30 und 35 Stunden pro Woche», «de 30 a 35 horas
// ➤ semanales», «36 tot 40 uur»).
const WEEK_RANGE = new RegExp(
  `^(?:${wordsFor("between")} )?${NUMBER} (?:${wordsFor("rangeJoin")} )?${NUMBER} ?${HOUR}\\.? ?(${PER_WEEK})?$`,
);
// ➤ 30 hours a week or fewer is part time with its hours, more is full time: adverts offer a 30-hour week as part time
// ➤ («mit 30 Stunden/Woche», «30 uur per week»), though the OECD's line (builder/pay.ts) counts only under 30.
const PART_WEEK_MOST = 30;
const timeOfHours = (h: number) =>
  h > PART_WEEK_MOST && h <= 60
    ? "c"
    : h >= 4 && h <= PART_WEEK_MOST
      ? `p${Math.round(h)}`
      : "";
const toNumber = (s: string) => Number(s.replace(",", "."));
// ➤ A month's hours, as a week's («151,67 heures mensuelles» is a full week, «80 horas al mes», «havi 80 óra» part of one).
const PER_MONTH = wordsFor("perMonth");
const MONTH_ONLY = new RegExp(
  `^(?:(${PER_MONTH}) )?(\\d{2,3}(?:[.,]\\d{1,2})?) ?${HOUR}\\.?(?: (?:${wordsFor("per")} )?(${PER_MONTH}))?$`,
);
export const WEEKS_A_MONTH = 52 / 12;
function weekOnly(text: string) {
  // ➤ A line's last stop or semicolon is no part of it («36 tot 40 uur per week;»).
  const s = text.replace(/[;:.,!]+$/, "");
  const week = s.match(WEEK_ONLY);
  if (week) {
    const h = toNumber(week[1]);
    // ➤ A bare "8" is a day's hours more likely than a week's.
    return h < 10 && !NAMES_A_WEEK.test(s) ? "" : timeOfHours(h);
  }
  const month = s.match(MONTH_ONLY);
  if (month && (month[1] || month[3]))
    return timeOfHours(toNumber(month[2]) / WEEKS_A_MONTH);
  // ➤ Full time from 30 hours up, part time when both ends are 30 or under; with no week named, both over a day's 24.
  const range = s.match(WEEK_RANGE);
  if (range) {
    const [a, b] = [range[1], range[2]].map(toNumber);
    if (!range[3] && a <= 24) return "";
    return a >= PART_WEEK_MOST && b <= 60
      ? "c"
      : b <= PART_WEEK_MOST && a >= 4
        ? "p"
        : "";
  }
  // ➤ A whole week is full time, a share of one part time; a range up to a whole week ("80-100%") says neither.
  const share = s.match(SHARE);
  if (share) {
    const [low, high] = [Number(share[1]), Number(share[2] ?? share[1])];
    return low === 100 ? "c" : low >= 10 && high < 100 ? "p" : "";
  }
  return "";
}

const HOURS = new RegExp(`\\b${NUMBER} ?${HOUR}\\b`);
// ➤ A day's hours: «diaria», or hours per day ("4 hours/day", «4 horas al día», «4 ore/zi»).
const DAILY = wholeWords(
  `${wordsFor("daily")}|${HOUR}\\.? ?(?:\\/|${wordsFor("per")}) ?${wordsFor("day")}`,
);
// ➤ The working time an hours field names: '' for "full or part time" (DAA-24), «Jornada intensiva» and the like. Hours a
// ➤ week only between 4 and 39 (Feina Activa's "1 hores" is a slip), a day's hours times five.
export function workingTime(value: unknown): string {
  const s = withoutUnsaid(clean(value), WORKING_TIME).trim();
  if (!s) return "";
  const full = FULL.test(s),
    part = PART.test(s);
  if (!full && !part) return weekOnly(s);
  if (full === part) return "";
  if (full) return "c";
  const m = s.match(HOURS);
  const hours = m ? toNumber(m[1]) * (DAILY.test(s) ? 5 : 1) : 0;
  return hours >= 4 && hours <= 39 ? `p${Math.round(hours)}` : "p";
}

// ── A raw advert ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ➤ Google's JobPosting values: the hours and the contract are both in one list.
type Field = "ct" | "wt";
type Contract = Partial<Record<Field, string>>;
const POSTING = new Map<string, [Field, string]>([
  ["full_time", ["wt", "c"]],
  ["part_time", ["wt", "p"]],
  ["temporary", ["ct", "t"]],
  ["contractor", ["ct", "a"]],
  ["intern", ["ct", "p"]],
  ["per_diem", ["ct", "t"]],
]);

// ➤ The fields of a raw advert the contract is read from.
export type ContractRaw = {
  source?: string;
  description?: string;
  contract?: unknown;
  hours?: unknown;
  employmentType?: unknown;
};
// ➤ France Travail's values, the last part of its text ("CDI, Temps plein").
const FT_KINDS =
  /^(cdi|cdd|interim|cdi interimaire|saisonnier|cdd insertion|profession liberale|franchise|reprise d entreprise|profession commerciale)$/;
const partsOf = (raw: ContractRaw) =>
  String(raw.description || "").split(" · ");
const lineOf = (raw: ContractRaw, label: string) =>
  String(raw.description || "").match(new RegExp(`^${label}: (.+)$`, "m"))?.[1];
// ➤ «Jornada: completa» is read with its label, which says what «completa» is.
const jornada = (hours: string | undefined) =>
  hours ? workingTime(`jornada ${hours}`) : "";
// ➤ The values some feeds write in their adverts' text, each in a place of its own (the source's adapter in
// ➤ builder/adapters).
const FROM_TEXT: Record<string, (raw: ContractRaw) => Contract> = {
  francetravail: (raw) => {
    const [kind = "", hours = ""] = (partsOf(raw).at(-1) ?? "").split(", ");
    return FT_KINDS.test(clean(kind))
      ? { ct: contractKind(kind), wt: workingTime(hours) }
      : {};
  },
  // ➤ VDAB's first part.
  vdab: (raw) => {
    const first = partsOf(raw)[0];
    return { ct: contractKind(first), wt: workingTime(first) };
  },
  // ➤ Le Forem's parts, the first that names each.
  forem: (raw) => {
    const out: Contract = {};
    for (const p of partsOf(raw).slice(1)) {
      out.ct ||= contractKind(p);
      out.wt ||= workingTime(p);
    }
    return out;
  },
  // ➤ Escola del Treball's «Contracte» line.
  escoladeltreball: (raw) => {
    const line = lineOf(raw, "Contracte");
    return { ct: contractKind(line), wt: workingTime(line) };
  },
  // ➤ The Generalitat's dataset is of temporary posts ("Ofertes de treball de caràcter temporal").
  gencat: () => ({ ct: "t" }),
  // ➤ Andalucía's SAE ends its text with «Contrato: Laboral temporal · Jornada: Completa»: the last such parts.
  sae: (raw) => {
    const fact = (name: string) =>
      partsOf(raw)
        .filter((p) => p.startsWith(`${name}: `))
        .at(-1)
        ?.slice(name.length + 2);
    return { ct: contractKind(fact("Contrato")), wt: jornada(fact("Jornada")) };
  },
  // ➤ Castilla-La Mancha's «Jornada: completa» and «Contrato: indefinido» lines.
  clm: (raw) => ({
    ct: contractKind(lineOf(raw, "Contrato")),
    wt: jornada(lineOf(raw, "Jornada")),
  }),
};

// ➤ The one value a list says, or ''. One kind with and without its months or hours is that kind, with them when only one
// ➤ figure is given: «TEMPORARY» beside «contratto a tempo determinato 12 mesi» is t12 (the server's comparison, 15 November
// ➤ 2026), «6 mesi» beside «12 mesi» a temporary contract.
export function oneOf(values: string[]): string {
  if (!values.length) return "";
  const kind = values[0].replace(/\d+$/, "");
  if (!values.every((v) => v.replace(/\d+$/, "") === kind)) return "";
  const figures = new Set(values.filter((v) => v !== kind));
  return figures.size === 1 ? [...figures][0] : kind;
}
// ➤ The same for codes found each with the words that said it: the words of the one code, or '' when none is one.
export const oneSaid = (found: Map<string, string>): string =>
  found.get(oneOf([...found.keys()])) ?? "";

// ➤ What a list of values says (a JobPosting's `employmentType`): a list that names two different kinds or hours
// ➤ ("FULL_TIME, PART_TIME"; «CDI / CDD / Freelance») says neither for sure (1 November 2026).
function fromList(values: unknown[], source?: string): Contract {
  const listed = { ct: new Set<string>(), wt: new Set<string>() };
  for (const v of values) {
    const posting = POSTING.get(clean(v).replace(/ /g, "_"));
    if (posting) listed[posting[0]].add(posting[1]);
    else {
      listed.ct.add(contractKind(v, { source }));
      listed.wt.add(workingTime(v));
    }
  }
  listed.ct.delete("");
  listed.wt.delete("");
  return { ct: oneOf([...listed.ct]), wt: oneOf([...listed.wt]) };
}

// ➤ { ct, wt } of a raw advert, each only when known, from the first that says it: the adapter's `contract` and `hours`
// ➤ fields, a JobPosting's `employmentType`, or the values a feed already writes in its text.
export function contractOf(raw: ContractRaw): Contract {
  const fields: Contract = {
    ct: contractKind(raw.contract, { source: raw.source }),
    wt: workingTime(raw.hours),
  };
  const list = fromList(
    ([] as unknown[]).concat(raw.employmentType || []),
    raw.source,
  );
  const source = raw.source || "";
  const text =
    (!fields.ct || !fields.wt) && Object.hasOwn(FROM_TEXT, source)
      ? FROM_TEXT[source](raw)
      : {};
  const out: Contract = {
    ct: fields.ct || list.ct || text.ct,
    wt: fields.wt || list.wt || text.wt,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}
