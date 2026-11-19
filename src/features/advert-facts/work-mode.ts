// Legacy builder/work-mode.mjs, ported rule for rule.
// Where the work is done: on site, hybrid or remote, or not said. Read from the advert's
// source when it states it, else from a LinkedIn tag in the advert's text (#LI-Remote,
// #LI-Hybrid, #LI-Onsite) and a location that names remote work instead of a place, when
// they do not contradict each other, and a mode the advert writes as a field of its own («Work Model: Hybrid»); last, a
// sentence that states it (modeInSentences): a bare word list misread it about one time in six, so only whole statements
// count. docs/research/work-mode.md has the sources.
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import { fold } from "../../shared/kit/fold.js";
import {
  anyOf,
  numbers,
  words,
  type Concept,
} from "../../shared/words/index.js";

export type WorkMode = "onsite" | "hybrid" | "remote";

// The words for days, weeks, months and years, in a folded text.
const unit = (concept: Concept) =>
  anyOf(words(concept, { folded: true }), "\\w*");
const DAY_WORD = unit("day"),
  WEEK_WORD = unit("week"),
  MONTH_WORD = unit("month"),
  YEAR_WORD = unit("year");

// The sources' words for the three, reduced to their letters: "On Site", "on-site",
// "OnSite", "ORA_ON_SITE" and "#LI-Onsite" all read "onsite". JobTech's "Arbete på plats" is
// left out on purpose: it is its form's default, set on remote and hybrid adverts too.
const MODES: Readonly<Record<string, WorkMode>> = {
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
export const modeWord = (value: string | undefined): WorkMode | "" =>
  MODES[
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
  ] || "";

// An employer that offers several modes counts as the most flexible one: the filter asks
// "can I work this way?".
const FLEXIBILITY: readonly string[] = ["onsite", "hybrid", "remote"];
export const mostFlexible = (modes: readonly string[]): WorkMode | "" =>
  (modes
    .filter((m) => FLEXIBILITY.includes(m))
    .toSorted((a, b) => FLEXIBILITY.indexOf(b) - FLEXIBILITY.indexOf(a))[0] as
    WorkMode | undefined) ?? "";

// LinkedIn's tags for jobs it copies from employers' sites; Indeed and Monster read them too.
const LINKEDIN_TAG = /#LI-(Remote|Hybrid|On-?site)\b/gi;
export const tagMode = (text: string | undefined): WorkMode | "" =>
  mostFlexible(
    [...String(text || "").matchAll(LINKEDIN_TAG)].map((m) => modeWord(m[1])),
  );

// A location that names remote work: Indeed's location words for telework (OECD, 2021,
// Annex Table A.2) and their neighbours, compared without accents or case.
const REMOTE_PLACE =
  /(?:^|[^a-z0-9])(?:remote|remoto|remot|home ?office|home-office|home based|teletravail|teletrabajo|teletreball|telelavoro|werk van thuis|thuiswerk(?:en)?|zdalnie|praca zdalna|jobba hemifran|distans(?:arbete)?|lavoro da casa|desde casa)(?![a-z0-9])/;
const HYBRID_PLACE =
  /(?:^|[^a-z0-9])(?:hybrid|hybride|hibrido|ibrido|hybrydow[a-z]*)(?![a-z0-9])/;
const PARTLY_PLACE =
  /(?:^|[^a-z])(?:moglich|possible|possibile|mogelijk|posible|partiel\w*|parcial\w*|partial\w*|partly|teilweise|anteilig|tageweise|parziale|gedeeltelijk|deels)(?![a-z])/;
export function placeMode(location: string | undefined): WorkMode | "" {
  const f = fold(String(location || ""));
  // Remote work said as a part or a possibility beside the place («Hamburg / Homeoffice möglich», «Köln (teilweise
  // remote)», «Paris (télétravail partiel)») is hybrid, not remote (DAA-07).
  if (REMOTE_PLACE.test(f) && (HYBRID_PLACE.test(f) || PARTLY_PLACE.test(f)))
    return "hybrid";
  return REMOTE_PLACE.test(f) ? "remote" : HYBRID_PLACE.test(f) ? "hybrid" : "";
}

// The mode of a RawOffer: its source's own field (`mode`) when it has one. Else the LinkedIn
// tag (`modeTag`, read by the adapter in the whole text, or found in the text kept) and the
// location: one of them alone decides, and when they disagree ("#LI-Onsite" on an advert
// whose location is "Remote", a template's tag) the advert says nothing for sure. The
// letter the records carry (lib/work-modes.ts): o, h or r; '' when nothing says.
// A mode the employer writes as a field of its advert, not in its wording («Work Model: Hybrid – onsite and remote»,
// «Télétravail : 2 jours par semaine», «Modalidad de trabajo: Modelo híbrido», «Arbeitsmodell: vor Ort»): a label and a
// value of a few words. Some days or a share of the week at home is hybrid, and so is a value that names both an office
// and remote work; one that says no («Télétravail : non») or names no mode («in overleg») is left unsaid. 1,825 such lines
// on a tenth of the store (1 November 2026); «Arbeitsweise» (a manner of working) and «Workplace» are not such labels.
// The bullets before a label stay on its line: across blank lines, a long run of them took seconds (DAA-27).
// The emoji's variation selector (U+FE0F) is listed alone on purpose: a bullet emoji may carry it.
const MODE_LABEL =
  // oxlint-disable-next-line no-misleading-character-class
  /^[\t\v\f\p{Zs}\ufeff•·*–\-\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]*(work ?model|working model|work ?mode|working mode|workplace type|work setup|work arrangement|remote work|remote|hybrid work|hybrid|t[ée]l[ée]travail|mode de travail|organisation du travail|modalidad(?: de trabajo)?|modalitat(?: de treball)?|modalit[àa](?: di lavoro)?|arbeitsmodell|homeoffice|home office|home-office|thuiswerken|distansarbete|job location type|job location|work location type|position role type|work setting|working arrangement|working style|mode|job type|employment type|arbeitsplatz|location\(s\)|locations|location type|workplace|work location|working location|remote working|remote work policy|work type|working conditions?|work environment|arbeitsform|location|standort|einsatzort|arbeitsort|lieu de travail|lugar de trabajo|ubicaci[óo]n|werklocatie|locatie|sede(?: di lavoro)?|luogo di lavoro)[^\S\r\n]*:[^\S\r\n]*(\S.{0,79})$/gimu;
const SAYS_NO =
  /(?:^|[^a-z])(?:non|no|nein|pas de|keine?|not possible|nicht moglich|niet|ninguno)(?![a-z])/;
const HYBRID_VALUE = new RegExp(
  String.raw`hybrid|hybride|hibrid|ibrid|partiel|partial|teilweise|anteil|flexib|\d+ ?${DAY_WORD}(?![a-z])|(?:^|[^\d])(?:[1-9]\d?) ?%(?! ?(?:[a-z]+ ){0,2}(?:travel|reise\w*|reisen|deplacement\w*|viaje\w*|reizen))`,
);
const REMOTE_VALUE =
  /remote|remoto|remot\b|teletrabajo|teletreball|off[ -]?site|work from home|wfh|full remote|telelavoro|distans/;
const ONSITE_VALUE =
  /on[ -]?site|vor ort|presencial|presentiel|in office|office based|sur site|in sede|op locatie|pa plats|in person/;
const FULL_REMOTE =
  /100 ?% ?(?:remote|remoto|remot|teletravail|teletrabajo|teletreball|homeoffice)|fully remote|full remote/;
const YES = /^(?:yes|oui|ja|si|possible|moglich|mogelijk|possibile)(?![a-z])/;
const WEEK_DAYS = new RegExp(String.raw`(\d) ?${DAY_WORD}(?![a-z])`);
// A label that names no mode of its own («Employment type», «Job type», «Arbeitsmodell», «Organisation du travail»,
// «Modalidad») counts only with a mode's word in its value: «Part-time, 3 days per week» or «80%» there is the working
// time, not hybrid work (DAA-06).
const GENERIC_LABEL =
  /^(?:mode|job type|employment type|work type|working conditions?|work environment|arbeitsform|arbeitsmodell|organisation du travail|modalidad|modalitat|modalit[aà]|position role type|working style|location\(s\)|locations?|location type|standort|einsatzort|arbeitsort|lieu de travail|lugar de trabajo|ubicaci[oó]n|werklocatie|locatie|sede(?: di lavoro)?|luogo di lavoro|arbeitsplatz|workplace|work location|working location)$/;
const A_MODE_WORD =
  /remote|remot\b|hybrid|hybride|hibrid|ibrid|on[ -]?site|vor ort|presencial|presentiel|in person|in office|office|home|teletra|teletreball|telelavoro|thuis|distans|wfh|kantoor|buro|oficina|bureau/;
function modeOfField(label: string, value: string): WorkMode | "" {
  // A hybrid that is the trade's, not the work's («Location: Hybrid Cloud Team, Munich»), names no mode.
  const l = fold(label),
    v = fold(String(value).replace(HYBRID_THING, " "))
      .replace(/[–—]/g, "-")
      .trim();
  const athome = /remote|teletravail|home|thuiswerken|distans/.test(l);
  if (SAYS_NO.test(v) || (GENERIC_LABEL.test(l.trim()) && !A_MODE_WORD.test(v)))
    return "";
  if (l.startsWith("hybrid") && !FULL_REMOTE.test(v)) return "hybrid";
  if (FULL_REMOTE.test(v) || (athome && /^100 ?%$/.test(v))) return "remote";
  // «Remote: yes» is remote; «Télétravail : oui», a home office possible, is part of the week.
  if (YES.test(v))
    return l.startsWith("remote")
      ? "remote"
      : /hybrid/.test(l) || athome
        ? "hybrid"
        : "";
  if (/hybrid|hybride|hibrid|ibrid/.test(v)) return "hybrid";
  const remote = REMOTE_VALUE.test(v),
    onsite = ONSITE_VALUE.test(v);
  // Five days in the office is on site, five at home remote.
  const days = Number(v.match(WEEK_DAYS)?.[1] || 0);
  if (days >= 5) return onsite ? "onsite" : remote || athome ? "remote" : "";
  if ((remote && onsite) || HYBRID_VALUE.test(v)) return "hybrid";
  return remote ? "remote" : onsite ? "onsite" : "";
}
export const labelledMode = (text: string | undefined): WorkMode | "" =>
  mostFlexible(
    [
      ...String(text || "")
        .replace(/<[^>]*>/g, " ")
        .matchAll(MODE_LABEL),
    ]
      .map((m) => modeOfField(m[1] ?? "", m[2] ?? ""))
      .filter(Boolean),
  );
// A work mode a sentence of the title or the text states, when no field, tag, place or label did (the readers of every
// kind of offer, 6 November 2026: 55 of 317 kinds of offer and 40 of 193 employers' sites said it only in words):
// "Hybrid" set off in the title or beside a word of work; days or a share of the week at home, or a few days a week in
// the office; a home office possible; remote work said as the whole of the job; on site said as the whole of it. Hybrid
// clouds, cars and systems, remote support and work at a customer's site name no mode, and a denial («kein Homeoffice»)
// says none. docs/research/work-mode.md.
const NOT_WORK =
  /(?<![a-z])(?:(?:hybrid\w*|hybride|hibrid\w*|ibrid\w*) (?:cloud\w*|wolk|car|cars|vehicle\w*|engine\w*|drive\w*|antrieb\w*|fahrzeug\w*|system\w*|infra\w*|it|app\w*|integration\w*|architect\w*|solution\w*|losung\w*|event\w*|meeting\w*|bus\w*|power|energy|energie|technolog\w*|motor\w*|propulsion|electric\w*|omgeving\w*|environment\w*|umgebung\w*|landscape\w*|landschaft\w*|entorno\w*|environnement\w*|wagen\w*|auto\w*|voertuig\w*|identit\w*|local|on prem\w*|search\w*|betrieb\w*|platform\w*|techniek\w*|technik\w*|technique\w*|tecnic\w*|team\w*|plattform\w*|deploy\w*|setup\w* of|bonding|kraftwerk\w*|heizung\w*|technician\w*|techniker\w*|mechanic\w*|mechaniker\w*|monteur\w*|mecanic\w*)|(?:ev|elektro|electric) hybrid|cloud hybrid\w*|on prem\w* (?:and|und|en|et|y) hybrid\w*|(?:piattaform\w*|plataform\w*|plateform\w*|nube|nuvola|sistem\w*|soluzion\w*|solucion\w*|architettur\w*|arquitectur\w*|infrastruttur\w*|infraestructur\w*|veicol\w*|vehicul\w*|motor\w*|entorn\w*|ambient\w*) (?:hybrid\w*|hybride\w*|hibrid\w*|ibrid\w*))(?![a-z])/;
// A trial day on site, or a mode some of the company's roles have ("in vielen Bereichen", «según el puesto»), is no mode
// of this job (the work-mode sample of 7 November 2026).
const A_FEW_DAYS = new RegExp(
  String.raw`(?<![a-z\d])[1-4] ?${DAY_WORD} (?:a|per|pro|par|por|in der|in de|w|i|om) ${WEEK_WORD}(?![a-z])`,
);
// «Hybrid» is a mode beside a word of work («hybrid working», «hybride werken», «modalidad híbrida», "Location: Hybrid"),
// or in a title as a word of its own ("London (Hybrid)"); alone in a text it was a technique, a model of car or a mixed
// role one time in eight (the third sample).
const WORKS =
  "(?:work\\w*|schedule\\w*|arbeit\\w*|arbete\\w*|arbeta|arbejd\\w*|arbeid\\w*|kontor\\w*|werk|werken|trabaj\\w*|travail\\w*|lavor\\w*|modalidad|modalitat|modalite|modalita|treball|oficines|dies|teletrab\\w*|teletravail\\w*|thuis\\w*|home\\w*|remote|office\\w*|buro|kantoor|oficina|bureau|ufficio|biuro|setup|arrangement\\w*|policy|beleid|" +
  DAY_WORD +
  "|location|standort|ubicacion|lieu|culture|kultur|cultuur|organisation|organizacion|organisatie|regime|tryb\\w*|zdaln\\w*)";
const HYBRIDS = "(?:hybrid\\w*|hybride\\w*|hibrid\\w*|ibrid\\w*|hybrydow\\w*)";
const WORK_BESIDE = new RegExp(
  `(?<![a-z])${HYBRIDS}(?: \\w+)? ${WORKS}(?![a-z])|(?<![a-z])${HYBRIDS} (?:and|und|y|et|en|e) (?:flexible\\w*|flexibel\\w*) ${WORKS}(?![a-z])|(?<![a-z])${WORKS} (?:\\w+ )?${HYBRIDS}(?![a-z])|(?<![a-z])${HYBRIDS} (?:role|position|job|rol|functie|stelle|puesto|poste|post) (?:based|located|in|at|from|op|en|bei|im|a)(?![a-z])|(?<![a-z])(?:role|position|job) (?:is|will be) (?:\\w+ )?${HYBRIDS}(?![a-z])|(?<![a-z])${HYBRIDS} (?:role|position|job)(?![a-z])|(?:^|(?<![a-z])(?:a|our|the|this) (?:[a-z]+ ){0,2}?)${HYBRIDS} (?:work(?:ing)? )?model(?![a-z])(?! (?:of|for) )`,
);
const HYBRID_ALONE =
  /(?<![a-z])(?:hybrid|hybride|hibrid[oa]|ibrid[oa]|hybrydow[aoy])(?![a-z])/;
// A line that names the three modes lists choices, not this job's («Remote, Hybrid & vor Ort», "fully office-based, fully
// remote, or hybrid": the fifth sample).
const ALL_THREE = [
  /(?<![a-z])(?:remote\w*|remoto|teletrab\w*|teletravail\w*|homeoffice|home office|thuiswerk\w*|zdaln\w*)(?![a-z])/,
  /(?<![a-z])(?:hybrid\w*|hybride\w*|hibrid\w*|ibrid\w*|hybrydow\w*)(?![a-z])/,
  /(?<![a-z])(?:on ?site|vor ort|presencial\w*|office based|op kantoor|en presentiel|sur site|in office|in sede)(?![a-z])/,
];
// A hybrid set out as remote and on-site work combined («a hybrid work schedule to perfectly combine the benefits of remote
// work and … onsite work»): one mode, though the line names all three.
const COMBINED =
  /(?<![a-z])hybrid (?:work(?:ing)? )?(?:schedule|model|approach|setup|set up|arrangement|policy|environment)s? (?:\w+ ){0,3}?(?:combin|blend|mix|balanc)\w*(?![a-z])/;
// Not when the hybrid is for those who live near an office only («… (for those located in the Denver/Boulder area)»).
const FOR_LOCALS =
  /(?<![a-z])for (?:those|people|candidates|employees|anyone) (?:\w+ )?(?:located|based|living|near|who live)(?![a-z])/;
// A count of days or a share says how the modes split: no list of choices then («2 days on-site / 3 days remote»).
const SOME_DAYS = new RegExp(
  `\\d|(?<![a-z])${anyOf(Object.keys(numbers({ folded: true, most: 4 })))}(?![a-z])`,
);
const TRIAL =
  /(?<![a-z])(?:trial|probearbeit\w*|probetag\w*|schnupper\w*|proefdag\w*|meeloopdag\w*|journee d essai|dia de prueba|entretien\w*|interview\w*|vorstellungsgesprach\w*|sollicitatiegesprek\w*|entrevista\w*|colloqui\w*)(?![a-z])/;
const HEDGE =
  /(?<![a-z])(?:in vielen bereichen|in (?:many|most|some) (?:areas|roles|teams|departments)|je nach (?:position|stelle|bereich|abteilung|rolle|funktion|tatigkeit)|depending on the (?:role|position|team)|where the role allows|segun (?:el )?(?:puesto|posicion|rol|perfil)|selon (?:le )?(?:poste|metier|profil)|afhankelijk van (?:de )?(?:functie|rol)|abhangig von (?:deiner|ihrer|der) (?:rolle|position|stelle|funktion|aufgab\w*|tatigkeit)|(?:for|in) (?:some|certain) roles|fur (?:einige|bestimmte) (?:stellen|rollen|positionen)|para (?:algunos|ciertos) puestos|pour certains postes|voor (?:sommige|bepaalde) functies)(?![a-z])/;
// Days of remote work a year or a month are a perk, not a remote job ("15 days per year of fully remote work").
const PER_YEAR = new RegExp(
  String.raw`(?<![a-z])(?:${DAY_WORD}|${WEEK_WORD}) (?:per|a|al|par|pro|por|im|in het) (?:${YEAR_WORD}|${MONTH_WORD})(?![a-z])`,
);
// Remote work offered under a condition is no mode of the job ("a 100% remote work option during pregnancy", "unless
// the role is fully remote").
const ONLY_IF = /(?<![a-z])(?:option|during|unless|if|when)(?![a-z])/;
const AT_HOME =
  "(?:remote|remotely|remot|teletreball|from home|at home|home ?office|homeoffice|mobile[ns]? arbeit\\w*|mobil arbeiten|mobile work\\w*|thuis(?:werk\\w*)?|teletravail|teletrabajo|telelavoro|smart working|zdalnie|zdaln\\w*|distans\\w*)";
const WEEK = `(?: (?:a|per|pro|par|por|in der|im|in de|the|al|alla|w|i|om) ${WEEK_WORD})?`;
const DAYS_HOME = new RegExp(
  `(?<![a-z\\d])\\d ?${DAY_WORD}${WEEK}(?: \\w+){0,2} ${AT_HOME}|${AT_HOME}(?: \\w+){0,4} \\d ?${DAY_WORD}(?![a-z])|(?<![a-z\\d])\\d ?(?:homeoffice|home office|remote|thuiswerk|mobile|wfh|teletravail|teletrabajo)(?: work(?:ing)?)? ?${DAY_WORD}(?![a-z])|(?<![a-z\\d])\\d ?thuiswerkdag\\w*`,
);
// Remote work as a part of the week: «auch remote arbeiten», "partly remote", «teilweise im Homeoffice», «anteilig remote».
// A word or two between only after a word for a share: «auch in Remote-Situationen» is a skill, not the job's mode.
const HOME_PARTLY = new RegExp(
  `(?<![a-z])(?:(?:auch|occasional\\w*|gelegentlich) |(?:teilweise|zum teil|anteilig|partly|partially|partial|partiell\\w*|parcialmente|en partie|gedeeltelijk) (?:\\w+ ){0,2}?)${AT_HOME}|(?<![a-z])(?:teletravail|telework\\w*|teletrabajo|telelavoro|homeoffice|home office|thuiswerk\\w*|remote work\\w*|working remotely|work from home|mobile[ns]? arbeit\\w*) (?:\\w+ ){0,2}?(?:partiel\\w*|partiell\\w*|partially|partly|teilweise|gedeeltelijk)(?![a-z])`,
);
const DAYS_OFFICE = new RegExp(
  `(?<![a-z\\d])([1-4]) ?${DAY_WORD}(?: (?:in office|in the office|on ?site|onsite))(?: (?:a|per|pro|the) ${WEEK_WORD})|(?<![a-z\\d])([1-4]) ?${DAY_WORD}${WEEK} (?:(?:in|at) (?:our|the) (?:[a-z]+ ){0,2}?office|in the office|at the office|im buro|vor ort|op kantoor|op locatie|au bureau|sur site|en la oficina|in ufficio|w biurze|on ?site|pa (?:\\w+ )?kontor\\w*)`,
);
// On site a few times or days a week, written the other way round ("Ability to be onsite in San Jose, CA at least 2
// times per week", «vor Ort an 3 Tagen pro Woche»): hybrid. Only with its week named. The free-label bench, 9 November 2026.
const OFFICE_DAYS_AFTER = new RegExp(
  `(?<![a-z])on ?site [1-4] ?days? (?:a|per) week(?![a-z])|(?<![a-z])(?:(?:our|the) in office days are|office days are|work(?:ing)? from home on (?:mondays?|tuesdays?|wednesdays?|thursdays?|fridays?))(?![a-z])|(?:^|hybrid )(?:on ?site|onsite|in office)(?: [a-z0-9]+){0,3}? [1-4] ?(?:${DAY_WORD}|times|x)(?![a-z])|(?<![a-z])(?:(?:be|work\\w*|present|presence) (?:on ?site|onsite|vor ort)|in (?:the |our )?office|im buro|op kantoor|au bureau|en la oficina|in ufficio)(?: [a-z0-9]+){0,6}? (?:at least |minimum |min |an |op )?[1-4] ?(?:${DAY_WORD}|times|x)(?: (?:a|per|pro|par|por|in der|im|in de|the|al|alla|w|i|om) ${WEEK_WORD})(?![a-z])`,
);
const SHARE_HOME = new RegExp(
  `(?<![\\d])\\d{1,3} ?% ?(?:\\w+ ){0,2}?${AT_HOME}|${AT_HOME} (?:\\w+ ){0,2}?\\d{1,3} ?%`,
);
// A home office as a possibility or an option, in German's nouns too («Homeoffice-Möglichkeit», «Homeoffice-Option», «die
// Option auf Homeoffice»): part of the week at home, as «Homeoffice möglich» is (9 November 2026).
const HOME_POSSIBLE = new RegExp(
  `(?<![a-z])(?:remote work|work from home|home office|homeoffice|teletravail|teletrabajo) possibilit\\w*(?![a-z])|(?<![a-z])(?:homeoffice|home office|mobile[ns]? arbeit\\w*|mobile arbeit|remote arbeit\\w*|telearbeit) (?:moglichkeit\\w*|option\\w*|angebot\\w*|regelung\\w*|vereinbarung\\w*)(?![a-z])|(?<![a-z])option (?:auf|zum|zu|fur) (?:\\w+ )?(?:homeoffice|home office|mobile[ns]? arbeit\\w*|mobile arbeit|remote arbeit\\w*|telearbeit)(?![a-z])|${AT_HOME}(?: \\w+){0,4} (?:moglich|mogelijk|possible|posible|possibile|mozliwe|mozliwa|mozliwy)(?![a-z])|(?:moglichkeit|mogelijkheid|possibilit\\w*|posibilidad|mozliwosc) (?:\\w+ ){0,4}?${AT_HOME}`,
);
const WHOLE_REMOTE = new RegExp(
  `(?<![a-z])(?:fully|full|100 ?%|completely|entirely|komplett|vollstandig|totalmente|completamente) ${AT_HOME}|(?<![a-z])${AT_HOME}[ -]first|(?<![a-z])remote (?!(?:support|service|access|sensing|control|monitoring|diagnos\\w*|maintenance|operat\\w*|desktop|assistance)\\b)(?:\\w+ ){0,2}?(?:position|role|job|only|basis|opportunity)|work from anywhere|work from home or (?:from )?anywhere|work remotely (?:from )?anywhere|work from home from anywhere|teletrabajo (?:100|total|completo)|teletravail (?:complet|total|a 100)|praca (?:w pelni )?zdalna|thuiswerk(?:baan|functie)`,
);
const WHOLE_ONSITE = new RegExp(
  String.raw`(?<![a-z])(?:(?:fully|100 ?%|komplett|totalmente) (?:on ?site|onsite|vor ort|presencial|en presentiel|in office|in the office)|in office (?:5|five) days|on ?site (?:5|five) days|in office (?:role|position|job)|(?:role|position|job) (?:will be |is )?based on ?site|full ?time presence on ?site|(?:willingness|able|ability|required|expected) to (?:be|work) on ?site in|(?:presencial|on ?site|onsite|vor ort|en presentiel|in office) 100 ?%|on ?site (?:position|role|job|only|basis)|(?:position|role|job) (?:is|requires) (?:\w+ ){0,3}?on ?site|jeden tag vor ort|taglich vor ort|(?<!nicht |nie )taglich im buro|every day in the office|(?:5|five|funf) ${DAY_WORD} (?:a week |per week |pro woche |in der woche |par semaine |a la semana |por semana |alla settimana |a settimana )?(?:in the office|im buro|vor ort|on ?site|op locatie|op kantoor|au bureau|sur site|en la oficina|en oficina|in ufficio|in sede)|office first (?:approach|policy|model|culture|principle)|presencial al 100|en presentiel)(?![a-z])`,
);
// A denial beside the home word («kein Homeoffice», «Homeoffice ist leider nicht möglich», "no remote"), not anywhere in
// the sentence ("Fully remote - no relocation").
const NO_MODE = new RegExp(
  `(?<![a-z])(?:kein\\w*|not|no|nicht|pas de|sin|niet|geen|nie|non) (?:\\w+ ){0,2}?${AT_HOME}|${AT_HOME} (?:\\w+ ){0,3}?(?:nicht|not|niet|nie|non|pas) (?:\\w+ )?(?:moglich|possible|mogelijk|possibile|posible|mozliwe|available|offered)|${AT_HOME} (?:\\w+ )?(?:brak|none|nein|nee)(?![a-z])`,
);
// A number of days written in words, as a figure («one day of remote work per week», «zwei Tage Homeoffice», «vijf dagen
// per week op locatie»): only before a word of days.
const DAY_WORDS = numbers({ folded: true, most: 5 });
const DAYS_IN_WORDS = new RegExp(
  `(?<![a-z])(${anyOf(Object.keys(DAY_WORDS))}) (?=(?:(?:homeoffice|home office|remote|mobile|thuiswerk|teletravail|teletrabajo) ?)?${DAY_WORD}(?![a-z])|thuiswerkdag)`,
  "g",
);
const TITLE_REMOTE =
  /^(?:(?:fully|full|100 ?%) )?(?:remote|remoto|remota|en remoto|da remoto|teletrabajo|telework|telelavoro|teletravail|teletravail total|homeoffice|home office|zdalnie|praca zdalna|thuiswerk(?:en)?|distans)(?: (?:from|in|within|desde|da|en|aus|uit|across) [a-z ]{2,30}| first| only| ok| possible| eu| emea| europe| spain| germany)?$/;
const TITLE_HYBRID =
  /^(?:hybrid|hybride|hibrido|hibrida|ibrido|ibrida|teletravail partiel|teletrabajo parcial|smart working|remote ?\/ ?hybrid|hybrid ?\/ ?remote)$/;
export function titleMode(title: string | undefined): WorkMode | "" {
  const parts = fold(String(title || ""))
    .split(/\s[-–—|/]\s|[()[\]|]|,\s|\s\/\s/)
    .map((p) =>
      p
        .replace(/[^a-z0-9% /]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  if (parts.length < 2) return "";
  const modes = new Set(
    parts
      .map((p) =>
        TITLE_REMOTE.test(p) ? "remote" : TITLE_HYBRID.test(p) ? "hybrid" : "",
      )
      .filter(Boolean),
  );
  return modes.size === 1 ? ([...modes][0] as WorkMode) : "";
}
// An allowance, a place or a charter for work at home: some days at home («Internet- en thuiswerkvergoeding», «We richten je
// thuiswerkplek in», «Notre « Charte du Télétravail »», «Homeoffice-Pauschale»). The free-label bench, 9 November 2026.
const HOME_ALLOWANCE =
  /(?<![a-z])(?:thuiswerkvergoeding\w*|thuiswerkplek\w*|thuiswerkdagen?|charte (?:du |de )?teletravail|accord (?:du |de )?teletravail|indemnite (?:de )?teletravail|homeoffice (?:pauschale|zuschuss|ausstattung)|home office (?:pauschale|zuschuss))(?![a-z])/;
// Days of presence a week («2 Präsenztage pro Woche», «3 Tage pro Woche ins Büro», «1–2 Tage im Office»): hybrid; 13 of
// 14 adverts the readers missed had a hybrid field. The free-label bench, 9 November 2026.
const PRESENCE_DAYS =
  /(?<![a-z\d])[1-4](?: (?:bis )?[2-4])? (?:prasenztage?n?|burotage?n?)(?![a-z])|(?<![a-z\d])[1-4](?: (?:bis )?[2-4])? tage?n? (?:pro woche |die woche |in der woche |wochentlich )?(?:prasenz\w*|ins buro|im office|am standort|in der firma|in unserem (?:\w+ )?buro)(?![a-z])/;
// No remote role, no home office («Das ist keine Remote-Rolle», «Wir sind keine Remote-Company», «kein Homeoffice»): on
// site, 32 of 33; not when single days at home are allowed («einzelne Remote-Tage sind kein Problem»).
const NOT_REMOTE =
  /(?<![a-z])(?:keine? remote (?:rolle|position|stelle|company|firma|moglichkeit|job|arbeit\w*)|kein (?:homeoffice|home office|remote)|nicht remote|keine (?:homeoffice|home office) (?:stelle|position|moglichkeit))(?![a-z])/;
const SOME_HOME_DAYS =
  /(?<![a-z])(?:einzelne (?:remote|homeoffice|home office|mobile)|remote tage sind|homeoffice tage sind)(?![a-z])/;
// Days at home a month («Télétravail : jusqu'à 10 jours par mois», «8 jours de télétravail par mois»): hybrid, 59 of 66.
const MONTH_HOME = new RegExp(
  `${AT_HOME} (?:\\w+ ){0,4}?\\d{1,2} ?${DAY_WORD} (?:par|per|pro|al|a|im|in de) ${MONTH_WORD}(?![a-z])|(?<![a-z\\d])\\d{1,2} ?${DAY_WORD} (?:de |of |an )?${AT_HOME} (?:par|per|pro|al|a|im|in de) ${MONTH_WORD}(?![a-z])`,
);
// Work on site said in French («poste en présentiel», «présentiel obligatoire»), when the line names no work at home: 12 of
// 12 on site.
const PRESENTIEL =
  /(?<![a-z])(?:(?:poste|travail|mission|activite|emploi)s? (?:\w+ ){0,2}?en presentiel|presentiel (?:obligatoire|requis|exige|impose)|(?:poste|mission)s? (?:base|situe)e?s? sur site)(?![a-z])/;
// A French post or way of work that is hybrid («Poste hybride à Lyon», «mode de travail hybride», «politique hybride»): 80 of
// 85; not a mixed profile or role («profil hybride alliant…»), nor a choice («100 % remote ou hybride»).
const HYBRID_FR =
  /(?<![a-z])(?:(?:poste|emploi|fonction|mode|modele|format|rythme|politique|fonctionnement|organisation|cadre de travail|travail|teletravail)s? (?:de travail )?(?:est |sera )?(?:en )?hybride|hybride (?:entre|avec|[1-4] ?j))(?![a-z])/;
const NOT_HYBRID_FR =
  /(?<![a-z])(?:profil|role|positionnement|un hybride|melant|alliant|ou hybride|hybride ou|apres)(?![a-z])/;
const AT_HOME_WORD = new RegExp(`(?<![a-z])${AT_HOME}(?![a-z])`);
// «Télétravail» in a list of perks beside others («horaires flexibles, RTT, télétravail, ticket restaurant»): some days at
// home, hybrid; 267 of 304 adverts the readers missed had a hybrid field, and 99 % of those another sentence read. Not
// «en télétravail» (the place of the job), a culture or a policy of it, nor one said whole.
const TELETRAVAIL = /(?<![a-z])tele ?travail(?![a-z])/;
const PERKS_FR =
  /(?<![a-z])(?:rtt|mutuelle|tickets? restaurant|titres? restaurant|carte (?:restaurant|swile)|swile|prime|interessement|participation|cse|conges|avantages|horaires flexibles|forfait mobilite|velo|locaux|conditions de travail|cadre de travail)(?![a-z])/;
const NOT_PERK_FR =
  /(?<![a-z])(?:100 ?%|total|complet|integral|depuis|culture|full|entierement|a distance|fully|en tele ?travail|politiques? (?:de |du )?tele ?travail)(?![a-z])/;
const ON_SITE_WORD =
  /(?<![a-z])(?:on ?site|onsite|vor ort|presencial|en presentiel|in office)(?![a-z])/;
const LONE_MODE =
  /^(?:(hybrid(?: work(?:ing)?| model| schedule)?(?: on ?site [1-4]\+? days?(?: a| per)? week)?)|(remote(?: work(?:ing)?| first| only)?|fully remote|100 ?% remote|work(?:ing)? from home|wfh)|(on ?site(?: only)?|onsite(?: only)?|in office|office based))$/;
export function modeInSentences(
  title: string | undefined,
  text: string | undefined,
): WorkMode | "" {
  const modes = new Set<string>([titleMode(title)].filter(Boolean));
  const lines = [
    String(title || ""),
    ...String(text || "").split(/(?<=[.!?])\s+|\n+/),
  ];
  lines.forEach((line, i) => {
    if (line.length > 300) return;
    const f = fold(line)
      .replace(/[^a-z0-9% ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(DAYS_IN_WORDS, (w) => `${DAY_WORDS[w.trim()] ?? w} `);
    if (
      f &&
      NO_MODE.test(f) &&
      (WHOLE_ONSITE.test(f) || ON_SITE_WORD.test(f)) &&
      !TRIAL.test(f)
    ) {
      modes.add("onsite");
      return;
    }
    if (f && NOT_REMOTE.test(f) && !SOME_HOME_DAYS.test(f) && !TRIAL.test(f)) {
      modes.add("onsite");
      return;
    }
    // A line that is a mode alone («🌐 Remote work», «#hybrid», «Hybrid, onsite 3+ days a week»): that mode, as a
    // board's field would write it. The free-label bench, 9 November 2026.
    const lone = f.match(LONE_MODE);
    if (i > 0 && lone) {
      modes.add(lone[1] ? "hybrid" : lone[2] ? "remote" : "onsite");
      return;
    }
    if (
      !f ||
      NO_MODE.test(f) ||
      TRIAL.test(f) ||
      HEDGE.test(f) ||
      (ALL_THREE.every((re) => re.test(f)) &&
        !SOME_DAYS.test(f) &&
        !(COMBINED.test(f) && !FOR_LOCALS.test(f)))
    )
      return;
    // Each statement of the line counts: «HO bis zu 3 Tage/Woche nach der Einarbeitung (komplett vor Ort)» is hybrid.
    if (WHOLE_REMOTE.test(f) && !ONLY_IF.test(f) && !PER_YEAR.test(f))
      modes.add("remote");
    // On site a few days a week is hybrid («on-site in our office … for 3 days per week»).
    if (WHOLE_ONSITE.test(f))
      modes.add(A_FEW_DAYS.test(f) ? "hybrid" : "onsite");
    if (
      (i === 0 ? HYBRID_ALONE.test(f) : WORK_BESIDE.test(f)) &&
      !NOT_WORK.test(f)
    )
      modes.add("hybrid");
    if (
      DAYS_HOME.test(f) ||
      DAYS_OFFICE.test(f) ||
      OFFICE_DAYS_AFTER.test(f) ||
      HOME_ALLOWANCE.test(f) ||
      (SHARE_HOME.test(f) && !ONLY_IF.test(f)) ||
      HOME_POSSIBLE.test(f) ||
      HOME_PARTLY.test(f)
    )
      modes.add("hybrid");
    if (
      PRESENCE_DAYS.test(f) ||
      MONTH_HOME.test(f) ||
      (HYBRID_FR.test(f) && !NOT_HYBRID_FR.test(f) && !NOT_WORK.test(f))
    )
      modes.add("hybrid");
    if (PRESENTIEL.test(f) && !AT_HOME_WORD.test(f)) modes.add("onsite");
    if (TELETRAVAIL.test(f) && PERKS_FR.test(f) && !NOT_PERK_FR.test(f))
      modes.add("hybrid");
  });
  return mostFlexible([...modes]);
}
// And the trade's hybrid machines («Hybrid- und Elektrofahrzeuge», «Hybrid Powertrain», «Hybrid Inverters», DAA-08).
const HYBRID_THING =
  /\bhybrid\p{L}*[\s-]+(?:\p{L}+[\s-]+)?(?:powertrain\p{L}*|inverter\p{L}*|engine\p{L}*|batter\p{L}*|\p{L}*fahrzeug\p{L}*|\p{L}*antrieb\p{L}*|cloud|infrastru\p{L}*|it\b|umgebung\p{L}*|environment\p{L}*|szenari\p{L}*|arbeitswelt\p{L}*|working worlds?|l(?:ö|oe)sung\p{L}*|solutions?|systeme?|systems?|antrieb\p{L}*|fahrzeug\p{L}*|vehicles?|motor\p{L}*)/giu;
// Remote work that is the trade's («remote diagnosis», «Remote Support Engineer») is no mode either (DAA-08).
const REMOTE_THING =
  /\bremote[\s-]+(?:support|service|access|sensing|control|monitoring|diagnos\p{L}*|maintenance|operat\p{L}*|desktop|assistance)\p{L}*/giu;
// On site or remote, as the candidate wishes («vor Ort und auch remote möglich»): a choice, and a source's remote stays
// remote (DAA-08).
const EITHER =
  /(?<![\p{L}])(?:vor ort|on[ -]?site|im büro|in the office) (?:und|oder|or|and) (?:auch |also )?(?:remote|im homeoffice|from home)(?![\p{L}])|(?<![\p{L}])remote (?:oder|or) (?:vor ort|on[ -]?site)(?![\p{L}])/iu;
const withoutThings = (s: string | undefined) =>
  String(s || "")
    .replace(HYBRID_THING, " ")
    .replace(REMOTE_THING, " ");
// The work mode of an advert (advert-facts FR-3): its source's own field when it has one; else a
// LinkedIn tag in its text, its location and a labelled field, when they agree; else a sentence
// that states it. null when nothing says.
export function workModeOf(
  advert: Pick<StoredAdvert, "workMode" | "title" | "location" | "description">,
): WorkMode | null {
  // A soft hyphen inside a word («Möglich\u00adkeit zu Homeoffice-Vereinbarungen») splits it for
  // every reader below.
  const title = advert.title.replace(/\u00ad/g, "");
  const description = advert.description.replace(/\u00ad/g, "");
  const field = modeWord(advert.workMode);
  // A source's remote where its own text says hybrid is hybrid: sites mark TELECOMMUTE on posts with
  // some days at home («Bis zu 60% Homeoffice», «Anteilig remote»). Not a hybrid that is the trade's
  // («hybride Microsoft-Infrastruktur») or the employer's product («bessere hybride Arbeitswelten»):
  // the sample of 7 November 2026.
  if (field === "remote" && !EITHER.test(description)) {
    const text = withoutThings(description);
    if (
      [
        tagMode(text),
        labelledMode(text),
        modeInSentences(withoutThings(title), text),
      ].includes("hybrid")
    )
      return "hybrid";
  }
  if (field) return field;
  const said = [
    ...new Set(
      [
        tagMode(description),
        placeMode(advert.location),
        labelledMode(description),
      ].filter(Boolean),
    ),
  ];
  if (said.length === 1) return said[0] as WorkMode;
  if (said.length) return null;
  return (
    modeInSentences(withoutThings(title), withoutThings(description)) || null
  );
}
