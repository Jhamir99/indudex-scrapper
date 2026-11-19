import type { CompiledFamilies } from "./compile.js";
import { matchableTitle } from "./matchable-title.js";
import {
  compoundFitter,
  compoundTechnician,
  ENGINEER_ROUTES,
  ES_MECHANIC,
  ES_MECHANIC_FAMILY,
  ES_OUT,
  ES_SUPERVISOR,
  ES_SUPERVISOR_OUT,
  ES_SUPERVISOR_ROUTES,
  ES_TECHNICIAN,
  ES_TECHNICIAN_OUT,
  ES_TECHNICIAN_ROUTES,
  ES_TRADE_ROUTES,
  FITTER_ELSEWHERE,
  FITTER_FAMILY,
  FITTER_ROUTES,
  FITTER_WORDS,
  FR_OUT,
  FR_SKILLED,
  FR_SKILLED_FAMILY,
  FR_TECHNICIAN,
  FR_TECHNICIAN_ROUTES,
  FR_TRADE_ROUTES,
  FR_TRADE_TECHNICIAN,
  ICT_ROUTES,
  MASTER_OUT,
  MASTER_ROUTES,
  MASTER_WORDS,
  NL_MACHINE_DRIVER,
  NL_OUT,
  NL_SKILLED,
  NL_SKILLED_FAMILY,
  NL_TRADE_ROUTES,
  PLANNER_OUT,
  PLANNER_ROUTES,
  PLANNER_WORDS,
  route,
  TECHNICIAN_ELSEWHERE,
  TECHNICIAN_FAMILY,
  TECHNICIAN_ROUTES,
  TECHNICIAN_WORDS,
} from "./routes.js";
import {
  HARDWARE_DEVELOPER,
  splitRoles,
  titleFamilies,
} from "./title-families.js";
import { TITLES as T } from "./title-rules.js";
import {
  COMPOUND_ENGINEER,
  ICT_WORDS,
  IT_SECURITY,
  OUTSIDE_WORDS,
} from "./words.js";

// An advert as the gate reads it: its title, its language ("" when only hinted), the languages its
// country or a gender mark hints, and the codes its source gives.
export interface GateRaw {
  readonly title: string;
  readonly lang: string;
  readonly hintLangs?: readonly string[];
  readonly isco?: string | undefined;
  readonly ssyk?: string | undefined;
}

// The languages a title is read in: the source's, plus English (many adverts everywhere are in
// English); a Catalan source is also read in Spanish, which ESCO has and Catalan lacks.
export const languagesFor = (lang: string): string[] =>
  lang === "ca"
    ? ["ca", "es", "en"]
    : lang && lang !== "en"
      ? [lang, "en"]
      : ["en"];

export const languagesOf = (raw: GateRaw): string[] =>
  raw.lang
    ? languagesFor(raw.lang)
    : [...new Set([...(raw.hintLangs ?? []), "en"])];

const familyOf = (gate: CompiledFamilies, code: string) =>
  gate.byIsco.get(code);

// The Spanish technician or designer of a discipline (ES_TECHNICIAN), for the classifier's last
// pass: a designer names a drawing office (3118), a technician the discipline's family.
export function esTechnician(raw: GateRaw, gate: CompiledFamilies): string[] {
  if (raw.isco || raw.ssyk) return [];
  const title = matchableTitle(raw.title);
  const languages = languagesOf(raw);
  if (
    !languages.includes("es") ||
    !ES_TECHNICIAN.test(title) ||
    ES_TECHNICIAN_OUT.test(title) ||
    OUTSIDE_WORDS.test(title)
  )
    return [];
  const to = route(ES_TECHNICIAN_ROUTES, title, gate.ids);
  return to
    ? [title.startsWith("disenador") && gate.byIsco.has("3118") ? "3118" : to]
    : [];
}

// The Italian article «ai» is no AI («Cameriera ai piani», «Addetto ai macchinari» were software
// developers: 8 November 2026): an Italian title's «ai» is AI only written so in capitals among
// small letters («Sviluppatore AI»), or beside a word of the field («AI SPECIALIST», «Ai
// engineering», «Generative AI»).
const AI_NEAR =
  /(?:^|[^a-z0-9])(?:ai\s+(?:engineers?|engineering|specialists?|developers?|scientists?|research|researchers?|architects?|consultants?|products?|solutions?|platforms?|lead|leads|managers?|experts?|trainers?|ops|agents?|governance|strategy|automation|models?)|(?:gen|generative|conversational|applied|data|ml)\s+ai)(?![a-z0-9])/;
const ictText = (raw: GateRaw, title: string, languages: readonly string[]) =>
  languages.includes("it") &&
  !(
    /\p{Ll}/u.test(raw.title) && /(?<![\p{L}])AI(?![\p{L}])/u.test(raw.title)
  ) &&
  !AI_NEAR.test(title)
    ? title.replace(/(^|[^a-z0-9])ai(?![a-z0-9])/g, "$1")
    : title;

// The families of one advert against one compiled gate (legacy familiesOf). [] means outside.
export function familiesOf(
  raw: GateRaw,
  gate: CompiledFamilies,
  german = false,
  split = false,
): string[] {
  let candidates: readonly string[] = [];
  if (raw.isco) {
    const family = familyOf(gate, raw.isco.slice(0, 4));
    if (family) candidates = [family];
  }
  if (candidates.length === 0 && raw.ssyk && gate.bySsyk.has(raw.ssyk))
    candidates = gate.bySsyk.get(raw.ssyk) ?? [];
  if (candidates.length === 1) return [...candidates];
  const title = split
    ? splitRoles(matchableTitle(raw.title))
    : matchableTitle(raw.title);
  const languages = languagesOf(raw);
  const byTitle = titleFamilies(title, languages, gate, german);
  if (candidates.length > 1) {
    const narrowed = candidates.filter((id) => byTitle.families.includes(id));
    return narrowed.length > 0 ? narrowed : [...candidates];
  }
  // A code the vertical does not hold is the source's word: the advert is out.
  if (raw.isco || raw.ssyk) return [];
  if (OUTSIDE_WORDS.test(title)) return [];
  if (
    (raw.lang === "nl" || (!raw.lang && raw.hintLangs?.includes("nl"))) &&
    NL_MACHINE_DRIVER.test(title)
  )
    return [];
  // A hardware or electronics developer ("Hardwareentwickler") is an electronics engineer.
  if (split && HARDWARE_DEVELOPER.test(title) && gate.byIsco.has("2152"))
    return [familyOf(gate, "2152") ?? "2152"];
  // ESCO's own generic engineer ("design engineer") gives way to a discipline the title names.
  if (
    byTitle.families.length === 1 &&
    byTitle.families[0] === gate.genericFamily
  )
    return [route(ENGINEER_ROUTES, title, gate.ids) ?? gate.genericFamily];
  const ict = ictText(raw, title, languages);
  if (
    byTitle.families.length === 1 &&
    byTitle.families[0] === "2161" &&
    ICT_WORDS.test(ict)
  )
    return [route(ICT_ROUTES, ict, gate.ids) ?? "2511"];
  // An IT security adviser is not a safety adviser: ESCO's "Sicherheitsberater" files the second
  // among the technicians, and the title names the computing it is about.
  if (
    byTitle.families.length === 1 &&
    (byTitle.families[0] ?? "").startsWith("3") &&
    IT_SECURITY.test(title) &&
    gate.byIsco.has("2529")
  )
    return [familyOf(gate, "2529") ?? "2529"];
  if (byTitle.families.length > 0) return byTitle.families;
  if (byTitle.blocked) return [];
  if (ICT_WORDS.test(ict)) {
    const to = route(ICT_ROUTES, ict, gate.ids) ?? gate.ictFamily;
    return to ? [to] : [];
  }
  // The German bare fitter, where the trades are read, in the classifier's last pass: a title the
  // German reading files ("(Bauleitender) Monteur") keeps that answer.
  if (german && languages.includes("de") && gate.byIsco.has(FITTER_FAMILY)) {
    const fitter = compoundFitter(title);
    if (FITTER_WORDS.test(fitter))
      return FITTER_ELSEWHERE.test(fitter)
        ? []
        : [
            route(FITTER_ROUTES, fitter, gate.ids) ??
              familyOf(gate, FITTER_FAMILY) ??
              FITTER_FAMILY,
          ];
  }
  // The French technician, mechanic and fitter, where the trades are read.
  if (
    languages.includes("fr") &&
    gate.byIsco.has(FR_SKILLED_FAMILY) &&
    !FR_OUT.test(title)
  ) {
    // Without a French trade named, a title that may be German waits for the German reading.
    if (FR_SKILLED.test(title)) {
      const to =
        route(FR_TRADE_ROUTES, title, gate.ids) ??
        (languages.includes("de") ? null : familyOf(gate, FR_SKILLED_FAMILY));
      if (to) return [to];
    }
    if (FR_TECHNICIAN.test(title)) {
      const to = route(FR_TRADE_ROUTES, title, gate.ids);
      if (to) return [to];
    }
  }
  // The Flemish technician and mechanic, after the French: a French title Belgium tags as Dutch
  // keeps the French reading ("Mécanicien poids lourds").
  if (
    languages.includes("nl") &&
    gate.byIsco.has(NL_SKILLED_FAMILY) &&
    NL_SKILLED.test(title) &&
    !NL_OUT.test(title)
  )
    return [
      route(NL_TRADE_ROUTES, title, gate.ids) ??
        familyOf(gate, NL_SKILLED_FAMILY) ??
        NL_SKILLED_FAMILY,
    ];
  if (
    languages.includes("es") &&
    gate.byIsco.has(ES_MECHANIC_FAMILY) &&
    ES_MECHANIC.test(title) &&
    !ES_OUT.test(title)
  )
    return [
      route(ES_TRADE_ROUTES, title, gate.ids) ??
        familyOf(gate, ES_MECHANIC_FAMILY) ??
        ES_MECHANIC_FAMILY,
    ];
  if (
    languages.includes("es") &&
    ES_SUPERVISOR.test(title) &&
    !ES_SUPERVISOR_OUT.test(title)
  ) {
    const to = route(ES_SUPERVISOR_ROUTES, title, gate.ids);
    if (to) return [to];
  }
  if (!gate.genericFamily) return [];
  if (
    T.matches(gate.generic, title).length > 0 ||
    COMPOUND_ENGINEER.test(title)
  )
    return [route(ENGINEER_ROUTES, title, gate.ids) ?? gate.genericFamily];
  // The German bare technician, after the engineer: "Techniker/Ingenieur" stays an engineer.
  if (languages.includes("de") && gate.byIsco.has(TECHNICIAN_FAMILY)) {
    const technician = german ? compoundTechnician(title) : title;
    if (
      TECHNICIAN_WORDS.test(technician) &&
      !(technician !== title && TECHNICIAN_ELSEWHERE.test(technician))
    )
      return [
        route(TECHNICIAN_ROUTES, technician, gate.ids) ??
          familyOf(gate, TECHNICIAN_FAMILY) ??
          TECHNICIAN_FAMILY,
      ];
  }
  // The German bare planner and master, by the discipline or the trade the title names.
  if (
    languages.includes("de") &&
    PLANNER_WORDS.test(title) &&
    !PLANNER_OUT.test(title)
  ) {
    const to = route(PLANNER_ROUTES, title, gate.ids);
    if (to) return [to];
  }
  if (
    languages.includes("de") &&
    MASTER_WORDS.test(title) &&
    !MASTER_OUT.test(title)
  ) {
    const to = route(MASTER_ROUTES, title, gate.ids);
    if (to) return [to];
  }
  // The French technician of a technical discipline; one of another discipline goes on to the
  // trades.
  if (
    languages.includes("fr") &&
    FR_TECHNICIAN.test(title) &&
    !FR_OUT.test(title) &&
    !FR_TRADE_TECHNICIAN.test(title)
  ) {
    const to = route(FR_TECHNICIAN_ROUTES, title, gate.ids);
    if (to) return [to];
  }
  return [];
}

// The ESCO occupations an advert's title names inside the families it was given: the specialties
// a visitor can narrow a family to ("naval architect" inside mechanical engineers). Among the
// titles found in those families the longest stands, as in the gate; a title filed by the
// discipline it names ("Mechanical Design Engineer") is that discipline's own occupation. [] when
// the title names none.
export function occupationsOf(
  raw: GateRaw,
  families: readonly string[],
  gate: CompiledFamilies,
  german = false,
  split = false,
): string[] {
  if (families.length === 0) return [];
  const ours = new Set(families);
  const title = split
    ? splitRoles(matchableTitle(raw.title))
    : matchableTitle(raw.title);
  const hits = titleFamilies(title, languagesOf(raw), gate, german).hits.filter(
    (hit) => ours.has(hit.id),
  );
  const found = [
    ...new Set(
      T.winners(hits).flatMap(
        (hit) =>
          gate.occupations.get(hit.id)?.get(hit.lang)?.get(hit.text) ?? [],
      ),
    ),
  ];
  if (found.length > 0) return found.toSorted();
  for (const [pattern, id, head] of [...ENGINEER_ROUTES, ...ICT_ROUTES])
    if (head && ours.has(id) && pattern.test(title)) return [head];
  return [];
}
