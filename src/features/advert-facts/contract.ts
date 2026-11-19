import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { fold } from "../../shared/kit/fold.js";
import { anyOf, words } from "./words/index.js";

// An advert's contract and working time, only from a field its source fills for that
// (docs/research/contract-type.md in the legacy): never from the advert's words, nor an agency's
// name, nor from FULL_TIME, which states the hours alone (advert-facts FR-2). Legacy
// builder/contract.mjs. Inside, as the legacy: contract codes 'i' permanent, 't' temporary ('t6'
// with its months), 'e' agency work, 'eo' agency work with the option to stay, 'to' temporary with
// the option to stay, 'p' internship or training, 'a' freelance; hours 'c' full time, 'p' part time
// ('p20' with its hours a week).

const clean = (value: string | undefined): string =>
  fold(value ?? "")
    .replace(/["'“”«»]/g, " ")
    .replace(/[\s_-]+/g, " ")
    .trim();

// The kinds in the order they are tried: the narrower first ("Interim met optie vast werk" before
// "interim", "CDI Intérimaire", a permanent contract with the agency, before agency work). The words
// added on 1 November 2026 were read on the sources' own fields: Dutch «kans op vast», «vast
// dienstverband», Czech «na dobu neurčitou / určitou», Italian «Partita IVA», French «indéterminé»,
// «emploi fixe», «travail temporaire» (agency work in France), Swiss «Lernende», Finnish
// «vakinainen», «määräaikainen», and the Nordic and Polish forms.
const BASE_KINDS: readonly (readonly [string, RegExp])[] = [
  ["eo", /\binterim\b.*\boptie\b.*\bvast|\binterimaire avec option\b/],
  [
    "to",
    /\btijdelijke?( job)? \(?met (optie|uitzicht op) vast|\btijdelijke? (contract|dienstverband|baan|aanstelling) met (optie|uitzicht) op (een )?vast|\bdoelstelling vaste dienst\b|\bkans op (een )?vast|\b(?:met )?(?:uitzicht|vooruitzicht|perspectief) op (?:een )?vast/,
  ],
  ["i", /\bcdi interimaire\b|\bvaste job bij het (uitzend|selectie)kantoor\b/],
  ["t", /\bfixed term \(?(interim|convertible)/],
  [
    "p",
    /\b(intern|internship|trainee|traineeship|working student|werkstudent|stage|alternance|professionnalisation|apprentissage|apprentice|apprenticeship|apprendistato|laerling|en practiques|practiques|practicas|formativo|alternerende opleiding|praktikum|ausbildung|lernende|lehrling|lehrstelle|stagiaire|stagiair|staz|praktyka|praktykant|harjoittelu|oppisopimus|apprendista|tirocinio|becario|formacion dual)\b/,
  ],
  [
    "e",
    /\b(interim|interimaire|somministrazione|interinale|arbeitnehmeruberlassung|zeitarbeit|uitzendarbeid|uitzendwerk|ett|travail temporaire|leiharbeit|personalleasing|vikarbureau)\b/,
  ],
  [
    "a",
    /\b(contractor|freelance|freelancer|profession liberale|franchise|reprise d entreprise|profession commerciale|zelfstandige|collaboration independant|collaborazione autonoma|mercantil|b2b|self employed|selbststandig|freiberuflich|freie mitarbeit|partita iva|independant|zzp|zzp er|autonomo|osvc)\b/,
  ],
  [
    "t",
    /\b(cdd|saisonnier|tijdelijke|tijdelijk|flexijob|flexi[ -]?jobs?|studentenjob|etudiant|duree determinee|remplacement|nettement defini|journalier|vervanging|tidsbegransad|vikariat|sasongsanstallning|behovsanstallning|sommarjobb|termo certo|termo incerto|tempo determinato|stagionale|temporal|temporary|temporaire|interinidad|befristet|fixed term|duracion determinada|obra y servicio|urcit\w*|maaraaikainen|sijaisuus|odredeno|determinata|okreslony|tidsbestemt|midlertidig|visstidsanstallning|projektanstallning|limited contract)\b/,
  ],
  [
    "i",
    /\b(indefinit|indefinido|cdi|vaste job|vast contract|duree indeterminee|salarie statutaire|tillsvidareanstallning|tills vidare|sem termo|tempo indeterminato|fijo discontinuo|fix discontinu|permanent|unbefristet|festanstellung|feste anstellung|unlimited|vast dienstverband|neurcit\w*|indetermine|indeterminee|emploi fixe|vakinainen|neodredeno|nedeterminata|nieokreslony|fast anstallning|fast ansattelse|fast stilling|unbefristete\w*)\b/,
  ],
];
const PERMANENT = BASE_KINDS.at(-1)![1];
const TEMPORARY = BASE_KINDS.at(-2)![1];
const EITHER = /\/|\||\b(?:o|ou|or|oder|of|eller)\b/;
const MAY_BECOME =
  /\b(?:possib\w*|option\w*|optie|kans|perspectiv\w*|evolu\w*|conversion|convertible)\b/;
// Forms the sources write that the lists lacked (DAA-23).
const KINDS: readonly (readonly [string, RegExp])[] = [
  ...BASE_KINDS,
  ["t", /\b(befristete\w*|eventual|relevo|interino|interina)\b/],
  ["i", /\b(indefinida|indefinit[ao]|fijo|fija|contrato fijo)\b/],
];
const MONTHS = new RegExp(
  String.raw`\b(\d{1,2}) ?(${anyOf(words("month", { folded: true }), "\\w*")})\b`,
);
// A fixed term in years («CDD de 3 ans»): its months.
const YEARS = new RegExp(
  String.raw`\b(\d) ?(${anyOf(words("year", { folded: true }), "\\w*")})\b`,
);

// The kind a contract field names; "" when it names none. `source`: Adzuna's only values are
// "permanent" and "contract", so its "contract" is "not permanent"; the applicant-tracking systems
// offer "Contract" beside "Temporary", so theirs is the freelancer's.
export function contractKind(value: string | undefined, source = ""): string {
  const text = clean(value);
  if (!text) return "";
  if (text === "contract") return source === "adzuna" ? "t" : "a";
  // "Regular" as a whole value is a permanent employee, as Workday writes it beside "Temporary";
  // inside a sentence it is a word like any other ("regular travel").
  if (
    /^regular(?: (?:employee|position|staff|full time|part time))?$/.test(text)
  )
    return "i";
  for (const [kind, rule] of KINDS) {
    if (!rule.test(text)) continue;
    // A value that names a permanent and a temporary contract («CDI / CDD», «Indefinido o
    // temporal») says neither (DAA-09); not a temporary one that may become permanent («CDD de 6
    // mois, possibilité de CDI»).
    if (
      ((rule === PERMANENT && TEMPORARY.test(text)) ||
        (rule === TEMPORARY && PERMANENT.test(text))) &&
      EITHER.test(text) &&
      !MAY_BECOME.test(text)
    )
      return "";
    if (kind !== "t") return kind;
    const months =
      Number(MONTHS.exec(text)?.[1]) || Number(YEARS.exec(text)?.[1]) * 12;
    return months >= 1 && months <= 60 ? `t${months}` : "t";
  }
  return "";
}

const FULL =
  /\b(full time|fulltime|full-time|temps plein|plein temps|temps complet|heltid|vollzeit|tempo pieno|tempo completo|tempo integral|tiempo completo|jornada completa|plny uvazek|plny uvazok|voltijds|voltijd|kokoaikatyo|kokoaikainen|fuldtid|fulltid|pełny etat|puno radno vrijeme|norma intreaga|teljes munkaido)\b/;
const PART =
  /\b(part time|parttime|part-time|temps partiel|temps parcial|deltid|teilzeit|tempo parziale|tiempo parcial|media jornada|jornada parcial|zkraceny uvazek|skrateny uvazok|ciastocny uvazok|deeltijds|deeltijd|minijob|beperkte tewerkstelling|osa aikatyo|osa aikainen|niepełny etat|nepuno radno vrijeme|timp partial|marginal employment|reszmunkaido)\b/;

// The words for hours, and for a week («wk», «w» too, in a field's short form).
const HOUR = anyOf(words("hour", { folded: true }), "\\w*");
const WEEK = anyOf([...words("week", { folded: true }), "wk", "w"], "\\w*");
const HOURS = new RegExp(String.raw`\b(\d{1,2}(?:[.,]5)?) ?(${HOUR})\b`);
// A field that gives only the hours a week ("40", «35H/semaine», «38,5 Std./Woche») or the share of
// a full week ("100%", «Pensum 100%»): 30 hours or more is full time, the line the OECD draws;
// fewer is part time with its hours; a range of shares ("80-100%") says neither.
const WEEK_ONLY = new RegExp(
  String.raw`^(\d{1,2}(?:[.,]\d{1,2})?) ?${HOUR}?\.? ?(?:(?:\/|per|par|pro|a la|a) ?${WEEK})?$`,
);
const SHARE = /^(?:pensum |beschaftigungsgrad |taux d activite )?(\d{2,3}) ?%$/;
// Its ends may be joined by a word and opened by one («zwischen 30 und 35 Stunden pro Woche»);
// with no week named, both ends over a day's 24 hours say it («36 tot 40 uur»).
const WEEK_RANGE = new RegExp(
  String.raw`^(?:(?:zwischen|between|from|entre|de|tra|da|mellan|van|tussen) )?(\d{1,2}(?:[.,]\d{1,2})?) (?:(?:to|tot|bis|a|à|und|and|et|y|e|och|og|en) )?(\d{1,2}(?:[.,]\d{1,2})?) ?${HOUR}\.? ?((?:\/|per|par|pro|a la|a|in der|por) ?${WEEK}|semanales|semanal|hebdomadaires|wochentlich|weekly|settimanali|per settimana)?$`,
);

const figure = (text: string) => Number(text.replace(",", "."));

function weekOnly(value: string): string {
  // A line's last stop or semicolon is no part of it («36 tot 40 uur per week;»).
  const text = value.replace(/[;:.,!]+$/, "");
  const week = WEEK_ONLY.exec(text);
  if (week) {
    const hours = figure(week[1] ?? "");
    // A bare "8" is a day's hours more likely than a week's.
    if (
      hours < 10 &&
      !/week|semaine|woche|semana|settimana|vecka|uge|wk/.test(text)
    )
      return "";
    return hours >= 30 && hours <= 60
      ? "c"
      : hours >= 4 && hours < 30
        ? `p${Math.round(hours)}`
        : "";
  }
  // A range of hours a week («32 - 40 uur per week»): full time when both ends are, part time
  // when both are under 30.
  const range = WEEK_RANGE.exec(text);
  if (range) {
    const low = figure(range[1] ?? "");
    const high = figure(range[2] ?? "");
    if (!range[3] && low <= 24) return "";
    return low >= 30 && high <= 60 ? "c" : high < 30 && low >= 4 ? "p" : "";
  }
  const share = SHARE.exec(text);
  if (share) {
    const percent = Number(share[1]);
    return percent === 100 ? "c" : percent >= 10 && percent < 100 ? "p" : "";
  }
  return "";
}

// The working time an hours field names: "" for "full or part time", «Jornada intensiva» and the
// like. Hours a week only between 4 and 39 (Feina Activa's "1 hores" is a slip), a day's hours
// times five.
export function workingTime(value: string | undefined): string {
  const text = clean(value);
  // «Completa o parcial» says neither (DAA-24).
  if (
    !text ||
    /\bfull[ -]?or[ -]?part\b/.test(text) ||
    /\b(completa|complet|plein|vollzeit) (o|ou|oder|or|y|et|und) (parcial|partiel|teilzeit)\b/.test(
      text,
    )
  )
    return "";
  const full = FULL.test(text);
  const part = PART.test(text);
  if (!full && !part) return weekOnly(text);
  if (full === part) return "";
  if (full) return "c";
  let hours = figure(HOURS.exec(text)?.[1] ?? "0");
  if (hours && /\b(diaria|daily|par jour|pro tag)\b/.test(text)) hours *= 5;
  return hours >= 4 && hours <= 39 ? `p${Math.round(hours)}` : "p";
}

// Google's JobPosting values: the hours and the contract are both in one list.
const POSTING: Readonly<Record<string, readonly ["ct" | "wt", string]>> = {
  full_time: ["wt", "c"],
  part_time: ["wt", "p"],
  temporary: ["ct", "t"],
  contractor: ["ct", "a"],
  intern: ["ct", "p"],
  per_diem: ["ct", "t"],
};

// The one value a list says, or "". One kind with and without its months or hours is that kind,
// with them when only one figure is given: «TEMPORARY» beside «contratto a tempo determinato 12
// mesi» is t12, «6 mesi» beside «12 mesi» a temporary contract.
export function oneOf(values: readonly string[]): string {
  const [first] = values;
  if (first === undefined) return "";
  const kind = first.replace(/\d+$/, "");
  if (!values.every((value) => value.replace(/\d+$/, "") === kind)) return "";
  const figures = new Set(values.filter((value) => value !== kind));
  return figures.size === 1 ? [...figures][0]! : kind;
}

export type ContractKind =
  | "permanent"
  | "temporary"
  | "agency"
  | "agency-to-permanent"
  | "temporary-to-permanent"
  | "training"
  | "freelance";

export interface Contract {
  readonly kind: ContractKind;
  readonly months?: number;
}

export interface WorkingTime {
  readonly kind: "full" | "part";
  readonly hours?: number;
}

const CONTRACT_KINDS: Readonly<Record<string, ContractKind>> = {
  i: "permanent",
  t: "temporary",
  e: "agency",
  eo: "agency-to-permanent",
  to: "temporary-to-permanent",
  p: "training",
  a: "freelance",
};

function contractOfCode(code: string): Contract | null {
  const match = /^([a-z]+)(\d*)$/.exec(code);
  const kind = match ? CONTRACT_KINDS[match[1] ?? ""] : undefined;
  if (!kind) return null;
  return match?.[2] ? { kind, months: Number(match[2]) } : { kind };
}

function workingTimeOfCode(code: string): WorkingTime | null {
  const match = /^([cp])(\d*)$/.exec(code);
  if (!match) return null;
  const kind = match[1] === "c" ? "full" : "part";
  return match[2] ? { kind, hours: Number(match[2]) } : { kind };
}

// An advert's contract and working time, each only when its source's fields say it.
export function contractOf(
  advert: Pick<
    StoredAdvert,
    "source" | "contract" | "hours" | "employmentType"
  >,
): {
  readonly contract: Contract | null;
  readonly workingTime: WorkingTime | null;
} {
  let contract = contractKind(advert.contract, advert.source);
  let hours = workingTime(advert.hours);
  // A list that names two different kinds or hours ("FULL_TIME, PART_TIME"; «CDI / CDD /
  // Freelance») says neither for sure (1 November 2026).
  const listed = { ct: new Set<string>(), wt: new Set<string>() };
  for (const value of advert.employmentType ?? []) {
    const posting = POSTING[clean(value).replace(/ /g, "_")];
    if (posting) {
      listed[posting[0]].add(posting[1]);
      continue;
    }
    const kind = contractKind(value, advert.source);
    const time = workingTime(value);
    if (kind) listed.ct.add(kind);
    if (time) listed.wt.add(time);
  }
  if (!contract && listed.ct.size) contract = oneOf([...listed.ct]);
  if (!hours && listed.wt.size) hours = oneOf([...listed.wt]);
  return {
    contract: contract ? contractOfCode(contract) : null,
    workingTime: hours ? workingTimeOfCode(hours) : null,
  };
}
