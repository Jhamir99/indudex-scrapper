// Fixed corrections of mistakes Firefox makes the same way every time, applied to its output when the
// title shows they are mistakes: "Lead" read as the metal, "Graduate" as a postgraduate. Each rule: the language
// translated into, what the title must hold, what to replace.
// The legacy's builder/mt/corrections.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { LEAD_ROLE } from "./method-tables.js";

// ➤ A title with "Remote" whose translation is no longer English ("fully remote within Germany Remote" left as it was).
// ➤ Not a product named Remote, which stays as it is («Remote Desktop», «Remote Sensing»).
const REMOTE_LEFT = (title: string, out: string): boolean =>
  /\bremote\b/i.test(title) &&
  !/(?<![\p{L}])Remote\s+(?:Desktop|Sensing|Monitoring|Access|Operations|Support|Control|Services)(?![\p{L}])/u.test(
    out,
  ) &&
  !/(?<![\p{L}])(?:the|within|from|for|with|and|of|fully|only|based|across)(?![\p{L}])/iu.test(
    out,
  );
// ➤ A rule: the language, when it applies (a test of the title, or of the title and the output), what to replace, and with what.
type Rule = [
  string,
  RegExp | ((title: string, out: string) => boolean),
  RegExp,
  string | ((m: string, ...groups: string[]) => string),
];
// ➤ What to replace and with what, for a list of rules that share their language and test.
type Fix = [RegExp, string];
export const RULES: Rule[] = [
  // ➤ "Operator" (of a machine) as the one who runs a business, French "exploitant" (German and Dutch keep the English
  // ➤ word as a name, before).
  // ➤ (Each replacement is written as it is: "$1" means nothing here.)
  ["fr", /\boperators?\b/i, /\bExploitants\b/g, "Opérateurs"],
  ["fr", /\boperators?\b/i, /\bexploitants\b/g, "opérateurs"],
  ["fr", /\boperators?\b/i, /\bExploitant\b/g, "Opérateur"],
  ["fr", /\boperators?\b/i, /\bexploitant\b/g, "opérateur"],
  // ➤ "Lead" (a role) as the metal.
  ["es", LEAD_ROLE, /\s*\b(?:del?\s+)?plomo\b/gi, " principal"],
  ["ca", LEAD_ROLE, /\s*\b(?:del?\s+)?plom\b/gi, " principal"],
  // ➤ «Dipl.» read as English: Firefox's Catalan added «(en anglès).» after it (42 published Catalan titles, most of them
  // ➤ Swiss «Dipl. Bauingenieur:in», 8 November 2026).
  [
    "ca",
    /^(?!.*(?<![\p{L}])(?:english|anglès|angles)(?![\p{L}]))/iu,
    /\s*\(en anglès\)\.?/giu,
    "",
  ],
  // ➤ A tradesperson as a «handelaar» (a trader) in Dutch.
  ["nl", /\btradesperson\b/i, /\bhandelaar\b/gi, "vakman"],
  // ➤ "(Senior)" as the elder of a family, and in Catalan as the higher grade ("Enginyer Superior").
  ["fr", /\bsenior\b/i, /(?<![\p{L}])Aînée?(?![\p{L}])/gu, "Senior"], // ➤ «Aîné» too, not only «Aînée» (TB2-01)
  ["fr", /\bsenior\b/i, /(?<![\p{L}])aînée?(?![\p{L}])/gu, "senior"],
  [
    "ca",
    /^(?!.*\b(?:superior|higher|upper)\b)(?=.*\bsenior\b)/i,
    /\bSuperior\b/g,
    "Sènior",
  ],
  // ➤ "Graduate" (a newly qualified starter) as a postgraduate.
  [
    "es",
    /(?<!post-)\bgraduates?\b/i,
    /\bprograma\s+de\s+posgrado\b/gi,
    "programa para recién titulados",
  ],
  [
    "es",
    /(?<!post-)\bgraduates?\b/i,
    /\s*\b(?:de\s+)?pos(?:t)?grado\b/gi,
    " recién titulado",
  ],
  [
    "ca",
    /(?<!post-)\bgraduates?\b/i,
    /\bprograma\s+de\s+postgrau\b/gi,
    "programa per a recent titulats",
  ],
  [
    "ca",
    /(?<!post-)\bgraduates?\b/i,
    /\s*\b(?:de\s+)?postgrau\b/gi,
    " recent titulat",
  ],
  [
    "fr",
    /(?<!post-)\bgraduates?\b/i,
    /\bprogramme\s+d'études\s+supérieures\b/gi,
    "programme jeunes diplômés",
  ],
  ["de", /(?<!post-)\bgraduates?\b/i, /\bDiplom-\s*/g, "Graduate "],
  // ➤ "Multi-skilled" in a later part of the title, which the levels do not reach, as a calque ("Soldador
  // ➤ multicalificado", "Technicien multi-qualifié"): the word each language uses.
  ["es", /./, /\s*\bmulti-?calificad[oa]s(?![\p{L}])/giu, " polivalentes"],
  ["es", /./, /\s*\bmulti-?calificad[oa](?![\p{L}])/giu, " polivalente"],
  [
    "es",
    /./,
    /\s*\b(?:de\s+)?multi-?calificación(?![\p{L}])/giu,
    " polivalente",
  ],
  // ➤ Spain says "cualificado" for skilled ("Trabajador calificado" → "Trabajador cualificado"); "calificado" is graded.
  ["es", /./, /\bcalificad(?=[oa]s?(?![\p{L}]))/gu, "cualificad"],
  ["es", /./, /\bCalificad(?=[oa]s?(?![\p{L}]))/gu, "Cualificad"],
  ["es", /./, /\bCALIFICAD(?=[OA]S?(?![\p{L}]))/gu, "CUALIFICAD"],
  [
    "ca",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifica(?:ts|des)(?![\p{L}])/giu,
    " polivalents",
  ],
  [
    "ca",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifica(?:t|da)(?![\p{L}])/giu,
    " polivalent",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiés(?![\p{L}])/giu,
    " polyvalents",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiées(?![\p{L}])/giu,
    " polyvalentes",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifiée(?![\p{L}])/giu,
    " polyvalente",
  ],
  [
    "fr",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?qualifié(?![\p{L}])/giu,
    " polyvalent",
  ],
  [
    "nl",
    /\bmulti-skilled\b/i,
    /\s*\bmulti-?geschoolde?(?![\p{L}])/giu,
    " allround",
  ],
  [
    "de",
    /\bmulti-skilled\b/i,
    /\s*\bMulti-?[Ss]killed\s+(?=\p{Lu}\p{Ll})/gu,
    " Allround-",
  ],
  ["de", /\bmulti-skilled\b/i, /\bMulti-?Skilled\b/giu, "Allround"],
  // ➤ The contract alone in a part, as France says it («Électricien - Permanent», «Soudeur - Agence»).
  [
    "fr",
    /\bpermanent\b/i,
    /(?<=[–|-]\s*)Permanente?(?=\s*(?:$|[–|-]))/gu,
    "CDI",
  ],
  [
    "fr",
    /\btemporary\b/i,
    /(?<=[–|-]\s*)Temporaire(?=\s*(?:$|[–|-]))/gu,
    "CDD",
  ],
  ["fr", /\bagency\b/i, /(?<=[–|-]\s*)Agence(?=\s*(?:$|[–|-]))/gu, "Intérim"],
  // ➤ «Permanent» alone in a part is the contract too («Electricista – Permanente»).
  [
    "es",
    /\bpermanent\b/i,
    /(?<=[–|-]\s*)Permanente(?=\s*(?:$|[–|-]))/gu,
    "Indefinido",
  ],
  // ➤ "Remote" Firefox leaves in English ("Arquitecte d'identitat | Remote", "(100% Remote)"): with a capital where
  // ➤ it opens a part. Not a hashtag («#remote»), a compound ("Remote-First") or a title Firefox left in English.
  [
    "ca",
    REMOTE_LEFT,
    /(?<=(?:^|[|–:]\s*|\s-\s))(?<![#\p{L}-])Remote(?![\p{L}-])/gu,
    "En remot",
  ],
  ["ca", REMOTE_LEFT, /(?<![#\p{L}-])[Rr]emote(?![\p{L}-])/gu, "en remot"],
  [
    "es",
    REMOTE_LEFT,
    /(?<=(?:^|[|–:]\s*|\s-\s))(?<![#\p{L}-])Remote(?![\p{L}-])/gu,
    "En remoto",
  ],
  ["es", REMOTE_LEFT, /(?<![#\p{L}-])[Rr]emote(?![\p{L}-])/gu, "en remoto"],
  // ➤ "Itinerant" as Catalan "d'itineraris" (of itineraries) where nothing said the level before.
  ["ca", /\bitinerant\b/i, /\s*\bd['’]itineraris?\b/gi, " itinerant"],
  // ➤ French «dépanneur» written «(réparations)» read as «(reparations)», amends.
  ["en", /d[ée]panneu|r[ée]paration/iu, /\(reparations\)/g, "(repairs)"],
  ["en", /d[ée]panneu|r[ée]paration/iu, /\(Reparations\)/g, "(Repairs)"],
  // ➤ French «sanitaire» beside a fitter or the heating is plumbing («Technicien chauffage sanitaire» came back «sanitary»);
  // ➤ alone it is also health («sécurité sanitaire»), so the glossary does not read it (German and Dutch it does).
  ...(
    [
      [
        /\bsanitary\b(?! (?:ceramics?|ware|products|articles|objects))/g,
        "plumbing",
      ],
      [
        /\bSanitary\b(?! (?:ceramics?|ware|products|articles|objects))/g,
        "Plumbing",
      ],
      [/\bSANITARY\b/g, "PLUMBING"],
    ] as Fix[]
  ).map(([wrong, right]): Rule => [
    "en",
    /(?=.*(?:install|plomb|chauffag|cvc|monteu|technicien))(?=.*sanitaire)/iu,
    wrong,
    right,
  ]),
  // ➤ And the plumbing Spain says: «fontanería», «fontanero», not America's «plomería» the second leg wrote at times.
  ...(
    [
      [/\bplomería\b/g, "fontanería"],
      [/\bPlomería\b/g, "Fontanería"],
      [/\bPLOMERÍA\b/g, "FONTANERÍA"],
      [/\bplomeros\b/g, "fontaneros"],
      [/\bplomero\b/g, "fontanero"],
      [/\bPlomeros\b/g, "Fontaneros"],
      [/\bPlomero\b/g, "Fontanero"],
    ] as Fix[]
  ).map(([wrong, right]): Rule => ["es", /./u, wrong, right]),
  // ➤ French «CND» (contrôle non destructif) is NDT; the field's words are written in by the glossary.
  ["en", /non[- ]destructi/iu, /\bNDC\b/g, "NDT"],
  // ➤ Italian «turni» are shifts («Manutentore elettromeccanico - 2 turni» came back «2 rounds»). 8 November 2026.
  ...(
    [
      [/\brounds\b/g, "shifts"],
      [/\bRounds\b/g, "Shifts"],
      [/\bROUNDS\b/g, "SHIFTS"],
      [/(?<=\d\s)round\b/g, "shift"],
    ] as Fix[]
  ).map(([wrong, right]): Rule => [
    "en",
    /(?<![\p{L}])turni(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  // ➤ Swedish «luftledning» is an overhead power line («Luftledningsprojektör» came back «Airline Projector»).
  ["en", /luftledning/iu, /\bAirline\b/g, "Overhead line"],
  // ➤ Slips found judging 60 Spanish and 60 Catalan titles of offers in Spain (9 November 2026): "Engineer" (a person) as
  // ➤ the discipline where the role opens the title («Senior Frontend Engineer - React Native» came back «Ingeniería
  // ➤ frontend sénior»; a discipline further on, «Ingeniero de Proyectos … Ingeniería Mecánica», or one named at once, «Ingeniería
  // ➤ Eléctrica», is right as it is); "Technologist" left in English; the Spanish «e» before a word
  // ➤ that does not start with an i sound («visión e tecnologías»), which is «y».
  ...(
    [
      [
        /^Ingeniería(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
        "Ingeniero",
      ],
      [
        /^INGENIERÍA(?![\p{L}])(?! (?:\p{L}+A|CIVIL|INDUSTRIAL|NAVAL|AMBIENTAL)(?![\p{L}]))/u,
        "INGENIERO",
      ],
    ] as Fix[]
  ).map(([wrong, right]): Rule => [
    "es",
    /^(?!.*engineering).*(?<![\p{L}])engineers?(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  ...(
    [
      [
        /^Enginyeria(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
        "Enginyer",
      ],
      [
        /^ENGINYERIA(?![\p{L}])(?! (?:\p{L}+A|CIVIL|INDUSTRIAL|NAVAL|AMBIENTAL)(?![\p{L}]))/u,
        "ENGINYER",
      ],
    ] as Fix[]
  ).map(([wrong, right]): Rule => [
    "ca",
    /^(?!.*engineering).*(?<![\p{L}])engineers?(?![\p{L}])/iu,
    wrong,
    right,
  ]),
  // ➤ A Spanish «Ingeniero» opening the title that Aina gave as the discipline («INGENIERO DE PROCESOS QUÍMICOS» → «Enginyeria de
  // ➤ processos químics»: 1 of 40 judged, 9 November 2026).
  [
    "ca",
    /^(?!.*ingenier[ií]a).*(?<![\p{L}])ingenier[oa]s?(?:\/[oa]s?)?(?![\p{L}])/iu,
    /^Enginyeria(?![\p{L}])(?! (?:\p{L}+a|[Cc]ivil|[Ii]ndustrial|[Nn]aval|[Aa]mbiental)(?![\p{L}]))/u,
    "Enginyer",
  ],
  [
    "es",
    /technologist/iu,
    /(?<![\p{L}])Technologists(?![\p{L}])/gu,
    "Tecnólogos",
  ],
  [
    "es",
    /technologist/iu,
    /(?<![\p{L}])Technologist(?![\p{L}])/gu,
    "Tecnólogo",
  ],
  [
    "ca",
    /technologist/iu,
    /(?<![\p{L}])Technologists(?![\p{L}])/gu,
    "Tecnòlegs",
  ],
  ["ca", /technologist/iu, /(?<![\p{L}])Technologist(?![\p{L}])/gu, "Tecnòleg"],
  [
    "es",
    /./u,
    /(?<=\p{L}) e (?![iíIÍ]|[hH][iíIÍ](?![aeoAEO]))(?=\p{L})/gu,
    " y ",
  ],
  // ➤ A proposal engineer's «propuestas» beyond the glossary's own name («Ingeniero de diseño y propuestas», «ingeniería de
  // ➤ propuestas»); "Insights" as «Perspectivas» (26 Spanish titles, 9 November 2026). The product names these rules
  // ➤ used to write back are kept as names (NAMES).
  [
    "es",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])propuestas(?![\p{L}])/gu,
    "ofertas",
  ],
  [
    "es",
    /(?<![\p{L}])proposals? engineer/iu,
    /(?<![\p{L}])Propuestas(?![\p{L}])/gu,
    "Ofertas",
  ],
  [
    "es",
    /(?<![\p{L}])insights?(?![\p{L}])/iu,
    /(?<![\p{L}])Perspectivas(?![\p{L}])/gu,
    "Insights",
  ],
];

const TWICE_IN_A_ROW =
  /(?<![\p{L}\p{N}])(\p{L}{3,})(?:\s+\1)+(?![\p{L}\p{N}])/giu;
// ➤ The output corrected, given the title it translates and the language it is in.
// ➤ fired, when given, gathers the place in RULES of each rule that changed the text (test/mt-corrections-rules.test.mjs).
export function correct(
  title: string,
  out: string,
  target: string,
  fired: Set<number> | null = null,
): string {
  let o = out;
  for (const [i, [t, when, wrong, right]] of RULES.entries()) {
    if (
      t !== target ||
      !(typeof when === "function" ? when(title, out) : when.test(title))
    )
      continue;
    const before = o;
    // ➤ The space the pattern took is given back, unless the word follows a slash or a bracket or opens the title
    // ➤ ("Reparatur-Betreiber" took none: "Reparatur-Operator").
    o = o.replace(wrong, (m, ...a: string[]) => {
      const at = Number(a[a.length - 2]);
      const r = typeof right === "function" ? right(m, ...a) : right;
      return (
        (at === 0 || /[/([]/.test(o[at - 1]) || !/^\s/.test(m) ? "" : " ") +
        r.trim() +
        (r.endsWith(" ") ? " " : "")
      );
    });
    if (fired && o !== before) fired.add(i);
  }
  // ➤ A word written twice in a row («Técnico técnico de mantenimiento», «CNC CNC», «Dissenyador Dissenyador»: 224 Spanish and
  // ➤ 100 Catalan published titles, 9 November 2026) is written once, unless the title itself repeats it («Walla Walla»).
  if (target === "es" || target === "ca")
    o = o.replace(TWICE_IN_A_ROW, (m, w: string) =>
      new RegExp(`(?<![\\p{L}])${w}\\s+${w}(?![\\p{L}])`, "iu").test(title)
        ? m
        : w,
    );
  // ➤ A replacement at the start leaves a space, and a capital may be due.
  o = o.replace(/\s+/g, " ").trim();
  if (o !== out.trim() && /^\p{Ll}/u.test(o) && /^\p{Lu}/u.test(out.trim()))
    o = o[0].toUpperCase() + o.slice(1);
  return o;
}
