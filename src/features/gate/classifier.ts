import type { CompiledFamilies, CompiledGate } from "./compile.js";
import {
  esTechnician,
  familiesOf,
  type GateRaw,
  languagesFor,
  languagesOf,
  occupationsOf,
} from "./families-of.js";
import { catalanToo } from "../../shared/words/catalan.js";
import { markedToo } from "./markets.js";
import { matchableTitle } from "./matchable-title.js";
import {
  compoundFitter,
  compoundTechnician,
  ES_OUT,
  ES_SUPERVISOR_OUT,
  ES_TECHNICIAN_OUT,
  FITTER_ELSEWHERE,
  FR_OUT,
  MASTER_OUT,
  NL_OUT,
  PLANNER_OUT,
  TECHNICIAN_ELSEWHERE,
} from "./routes.js";
import { titleFamilies } from "./title-families.js";
import { OUTSIDE_WORDS } from "./words.js";

// The gate for a whole run (legacy classifier): the main occupations, then the trades, the German
// passes, the readings once more, and the confirmed titles, each title worked out once.

export interface Classified {
  readonly families: string[];
  readonly occupations: string[];
  // Kept by the optional group (the skilled trades).
  readonly trade: boolean;
}

// The last way in: a title every reading left out that Claude confirmed in one of the vertical's
// unit groups (codes/confirmed-titles.json, the legacy's tools/gate-misses.mjs). Never against a
// decision the gate already makes: the source's own code, words that mean another job, an official
// index's "not ours", or the trades and tasks each reading keeps out (the ceiling fitter, the
// railway coupler).
const KEPT_OUT = [
  OUTSIDE_WORDS,
  TECHNICIAN_ELSEWHERE,
  PLANNER_OUT,
  MASTER_OUT,
  FITTER_ELSEWHERE,
  FR_OUT,
  NL_OUT,
  ES_OUT,
  ES_TECHNICIAN_OUT,
  ES_SUPERVISOR_OUT,
];

function confirmedFamilies(raw: GateRaw, gate: CompiledGate): string[] {
  const { main, optional, confirmed } = gate;
  if (confirmed.size === 0 || raw.isco || raw.ssyk) return [];
  const title = matchableTitle(raw.title);
  const isco = confirmed.get(title);
  if (!isco) return [];
  const languages = languagesOf(raw);
  const forms = [title, compoundFitter(title), compoundTechnician(title)];
  if (KEPT_OUT.some((pattern) => forms.some((form) => pattern.test(form))))
    return [];
  if (
    [main, optional].some(
      (compiled) =>
        compiled && titleFamilies(title, languages, compiled).blocked,
    )
  )
    return [];
  const family = main.byIsco.get(isco) ?? optional?.byIsco.get(isco);
  return family ? [family] : [];
}

// The Swiss «Automobil-Mechatroniker», the refrigeration one («Mechatroniker für Kältetechnik»,
// 7127: 152 published offers filed as 3113) and the British «Gas Engineer», the heating fitter the
// ONS files under 7126.
const VEHICLE_TRADE =
  /(?:^|[^a-z])(?:(?:kfz|kraftfahrzeug|automobil|pkw|lkw|nutzfahrzeug|nfz)[ -]?(?:mechatroniker|mechatronikerin|mechaniker|mechanikerin)|(?:mechatroniker|mechatronikerin) (?:fur |in der |im bereich )?kalte(?:technik|anlagentechnik|anlagenbau)?|(?<!oil and )(?<!oil & )(?<!oil )(?<!natural )(?<!liquid )gas (?:engineer|engineers))(?![a-z])/;

interface Reading {
  readonly families: string[];
  readonly occupations: string[];
  readonly used: CompiledFamilies;
}

function read(raw: GateRaw, gate: CompiledGate): Reading {
  const { main, optional } = gate;
  let used = main;
  let families = familiesOf(raw, main);
  let german = false;
  let split = false;
  // The car's mechatronics technician or mechanic («Kfz-Mechatroniker», ESCO's own name of the motor
  // vehicle mechanic, 7231, among the optional trades) was read by its last word as the industrial
  // «Mechatroniker» (3113) first: 3,882 published offers on 8 November 2026. The trade reads it first.
  if (optional && VEHICLE_TRADE.test(matchableTitle(raw.title))) {
    const trade = familiesOf(raw, optional);
    if (trade.length > 0) {
      used = optional;
      families = trade;
    }
  }
  if (families.length === 0 && optional) {
    used = optional;
    families = familiesOf(raw, optional);
  }
  // The Spanish technician of a discipline, once neither gate read the title.
  if (families.length === 0) {
    const technician = esTechnician(raw, main);
    if (technician.length > 0) {
      used = main;
      families = technician;
    }
  }
  // A German title neither gate read is read the German way, the main occupations first: an advert
  // either gate already reads keeps exactly its answer.
  const languages = raw.lang ? languagesFor(raw.lang) : (raw.hintLangs ?? []);
  if (families.length === 0 && languages.includes("de")) {
    const gates = [main, optional].filter(
      (compiled): compiled is CompiledFamilies => compiled !== null,
    );
    for (const compiled of gates) {
      families = familiesOf(raw, compiled, true);
      if (families.length > 0) {
        used = compiled;
        german = true;
        break;
      }
    }
    // Then with the compound role words set apart (splitRoles): "Tragwerksplaner" is read whole
    // first.
    if (families.length === 0)
      for (const compiled of gates) {
        families = familiesOf(raw, compiled, true, true);
        if (families.length > 0) {
          used = compiled;
          german = true;
          split = true;
          break;
        }
      }
  }
  return {
    families,
    occupations: occupationsOf(raw, families, used, german, split),
    used,
  };
}

export function classifier(gate: CompiledGate): (raw: GateRaw) => Classified {
  const known = new Map<string, Classified>();
  const { main } = gate;
  const answer = ({ families, occupations, used }: Reading): Classified => ({
    families,
    occupations,
    trade: families.length > 0 && used !== main,
  });
  return (raw) => {
    const key = [
      raw.title,
      raw.lang || (raw.hintLangs ?? []).join(","),
      raw.isco ?? "",
      raw.ssyk ?? "",
    ].join("\n");
    let value = known.get(key);
    if (!value) {
      let reading = read(raw, gate);
      // A title written for the German- or French-speaking market that its own languages leave out
      // is read once more with that language among them (markedToo), and only then: what is read
      // stays as it is.
      const again = reading.families.length === 0 ? markedToo(raw) : null;
      if (again) reading = read(again, gate);
      // A Catalan title (ESCO has no Catalan) that no reading kept is read once more in Spanish, word
      // by word ("Mecànic/a de manteniment" is "mecánico/a de mantenimiento"): what is read stays. So
      // is one read only into a catch-all (2149, 2519) whose Spanish reading is more precise:
      // «Enginyer/a de processos» is 2141 (NOB-01).
      const catchAll =
        reading.families.length === 1 &&
        [main.genericFamily, main.ictFamily].includes(
          reading.families[0] ?? null,
        );
      const spanish =
        reading.families.length === 0 || catchAll ? catalanToo(raw) : null;
      if (spanish) {
        const inSpanish = read(spanish, gate);
        if (
          inSpanish.families.length > 0 &&
          !(catchAll && inSpanish.families.includes(reading.families[0] ?? ""))
        )
          reading = inSpanish;
      }
      value = answer(reading);
      // The titles the registers confirm, the Catalan one's Spanish reading too («Mecanitzador/a»).
      if (value.families.length === 0) {
        const families =
          [raw, spanish]
            .filter((one): one is GateRaw => one !== null)
            .map((one) => confirmedFamilies(one, gate))
            .find((found) => found.length > 0) ?? [];
        if (families.length > 0)
          value = {
            families,
            occupations: [],
            trade: !main.ids.has(families[0] ?? ""),
          };
      }
      known.set(key, value);
    }
    return {
      families: [...value.families],
      occupations: [...value.occupations],
      trade: value.trade,
    };
  };
}
