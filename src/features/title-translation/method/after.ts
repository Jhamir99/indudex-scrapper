// ➤ After Firefox: what it adds removed and its known slips corrected (builder/mt/method.ts).
// The legacy's builder/mt/after.ts (JustJans/indudex@ec79858), copied (legacy resync T009): only its imports and data reads
// changed. Its own comments keep their marks.
import { correct } from "./corrections.js";
import { withoutGenders } from "./genders.js";
import { jobDashEn, lowerOpening } from "./english-tidy.js";
import { isTown } from "./places.js";
import { companyBack, hideCompany, showCompany } from "./companies.js";
import {
  apostrophes,
  besideTowns,
  catalanSpelling,
} from "./catalan-spelling.js";
import {
  ALONE,
  BACK,
  BACK_RE,
  HYPHEN_JOB,
  JOB_EN_TO,
  LANGUAGES,
  MARK,
  OWN,
  STACK_AFTER_WORD,
  STACK_DE,
  STACK_JOB_EN,
  STACK_OUT,
  SWISS,
  decode,
  dutchOr,
  noMarks,
} from "./method-tables.js";
import { COUNTRY } from "./countries.js";
import {
  ADDED,
  HEAD_END,
  ICS,
  ICS_LEFT,
  LEVEL_SAY,
  STRONG,
  sayLevels,
  ukrainianOrder,
} from "./levels.js";
import {
  JOB_AFTER,
  NAME_WORD,
  STACK_BEFORE_JOB,
  known,
  type Again,
} from "./checks.js";
import type { Info } from "./info.js";

function oneJob(src: string, out: string): string {
  const title = withoutGenders(decode(src), "de").replace(
    /^(?:Jobs?|Stellenangebot:?)\s+(?:[–-]\s+)?/u,
    "",
  );
  let g = title.match(
    /^(?:(?:Senior|Junior|Leitende[rn]?|\p{Lu}\p{Ll}+(?:isch|lich|al|il|iv|ell|är|end|ig|bar)er)\s+)?([\p{Lu}][\p{L}-]{3,})(?=$|[\s,/(])/u,
  );
  // ➤ Or closing the title after a product's name ("SAP HCM Berater" came back "SAP HCM consultants").
  if (!g || !/\p{Ll}er$/u.test(g[1]))
    g = title.match(
      /^(?:(?:Inhouse|Remote|Senior|Junior)\s+)?(?:[\p{Lu}\d][\p{L}\d/&.+-]*\s+){1,4}(\p{Lu}\p{Ll}+er)(?=$|\s*[–|(,-])/u,
    );
  if (!g || !/\p{Ll}er$/u.test(g[1])) return out;
  const cut = out.search(HEAD_END),
    head = cut < 0 ? out : out.slice(0, cut);
  // ➤ Not a list of jobs ("Elektroniker, Mechatroniker und …", "Projektleiter & Projektingenieure"), and
  // ➤ each job of a few words at most.
  if (
    /[,&+]|\s(?:and|or|und|oder)\s/iu.test(head) ||
    head.split("/").some((part: string) => part.trim().split(/\s+/).length > 4)
  )
    return out;
  const one = head.replace(
    /([\p{L}-]+?)(men|s)(?=\s*(?:\/|$))/gu,
    (w, stem: string, end: string) =>
      end === "men"
        ? stem + "man"
        : /(?:er|or|ian|ist|ee|(?<!pl)ant|(?<!m)ent|mechanic|smith|wright)$/i.test(
              stem,
            )
          ? stem
          : w,
  );
  return one + out.slice(head.length);
}
// ➤ A French, Dutch, Spanish or Catalan title naming one mechanic, which Firefox makes "Industrial Mechanics", the
// ➤ second leg reads as the field ("Mecánica Industrial"): its head says "mechanic".
const ONE_MECHANIC =
  /(?<![\p{L}])(?:m[ée]canicien|mechanieker|mekanieker|mec[áa]nico|mec[àa]nic)(?![\p{L}])/iu;
function oneMechanic(pair: string, src: string, out: string): string {
  if (!/^(?:fr|nl|es|ca)-en$/.test(pair) || !ONE_MECHANIC.test(decode(src)))
    return out;
  const cut = out.search(HEAD_END),
    head = cut < 0 ? out : out.slice(0, cut);
  return (
    head.replace(/(?<![\p{L}])([Mm]echanic)s(?![\p{L}])/u, "$1") +
    out.slice(head.length)
  );
}
// ➤ The dash of the English shown (jobDashEn), but not before "full-time", "specializing in…" or an acronym
// ➤ ("SAP Inhouse Consultant specializing in PDM/PLM", "Consultant SAP S/4Hana"), nor after "Assistant",
// ➤ "Apprentice", "Trainee" or "Helper", which name the next job ("Assistant Finisher").
function dashShown(out: string): string {
  const d = jobDashEn(out);
  if (d === out) return out;
  let i = 0;
  while (i < out.length && out[i] === d[i]) i++;
  const before = out.slice(0, i).trim(),
    rest = out.slice(i);
  if (
    /^(?:(?:full|part)-time\b|specializ|specialis|including|working)/i.test(
      rest,
    ) ||
    /^\p{Lu}{2,6}(?![\p{L}])/u.test(rest)
  )
    return out;
  if (/(?:^|\s)(?:assistant|apprentice|trainee|helper)s?$/i.test(before))
    return out;
  return d;
}
export function polish(pair: string, out: string): string {
  // ➤ The dash between the job and its field that the second leg reads, in the English shown too ("Project
  // ➤ Manager Software" → "Project Manager – Software").
  out = dashShown(out);
  // ➤ A star after a word (after) out of the English shown.
  out = out.replace(/(\p{L})\*(?![\p{L}*])/gu, "$1");
  out = out.replace(
    /\b([Ii])ndefinite contract\b/g,
    (m, i: string) => (i === "I" ? "P" : "p") + "ermanent contract",
  );
  return out;
}
const MANAGER = /(?<![\p{L}])[Mm]anagers?(?![\p{L}])/u;
const MANAGED_SO =
  /(?:general|managing|case|property|asset|fleet|stock|account|portfolio|fund|claims?|payroll|inventory|store|restaurant|hotel|branch|area|key\s+account)\s+managers?(?![\p{L}])/iu;
// ➤ A job whose capital is only the title's opening: before small words («Experienced project manager»), or alone in
// ➤ English («First-class plumber», «Senior technician»: "First-class Plumber" kept it).
const CAPITAL_THEN_SMALL = /^\p{Lu}\p{Ll}+\s+\p{Ll}/u,
  ONE_WORD_JOB = /^\p{Lu}\p{Ll}+(?:\s*$|\s*[–(|,-])/u;
export function after(
  pair: string,
  title: string,
  raw: string,
  info: Info,
): string {
  const target = pair.split("-")[1],
    src = decode(title);
  let out = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!out) return src.trim();
  // ➤ "Robotic" written for "Agentic" (before) turned back: "agéntico", "agèntiques", "agentique", or "Agentic" where
  // ➤ it stayed English ("Agentic Search"); also where it came back "robotized" ("Ingénieur logiciel robotisé").
  // ➤ A language's name standing on its own in an English title came back as the target language's own name
  // ➤ ("Cloud Consultant - English" → "… - Français", "- Español", "| Català"): the one asked for put back, where its
  // ➤ name is missing and the title asks for no target language.
  const own = OWN[target],
    alone =
      pair.startsWith("en-") && own
        ? [...new Set([...src.matchAll(ALONE)].map((m) => m[2]))]
        : [];
  const missing = alone.filter(
    (l) => !out.toLowerCase().includes(LANGUAGES[l][target].toLowerCase()),
  );
  if (missing.length === 1 && !alone.includes(own))
    out = out.replace(
      new RegExp(
        "(?<![\\p{L}])" + LANGUAGES[own][target] + "(?![\\p{L}])",
        "iu",
      ),
      (m) => {
        const w = LANGUAGES[missing[0]][target];
        return m[0] === m[0].toUpperCase()
          ? w[0].toUpperCase() + w.slice(1)
          : w;
      },
    );
  if (info.agentic)
    out = out.replace(BACK_RE, (m) => {
      const w = BACK[m.toLowerCase()];
      return m === m.toUpperCase()
        ? w.toUpperCase()
        : m[0] === m[0].toLowerCase()
          ? w
          : w[0].toUpperCase() + w.slice(1);
    });
  // ➤ A title already in English as written, its German gender endings, a hyphen after a code ("IT-Administrator")
  // ➤ or before an English job word ("Linux-Administrator") and the German "KI" (AI) apart.
  if (info.english)
    out = (pair.startsWith("nl-") ? dutchOr : (x: string) => x)(
      withoutGenders(src, pair.split("-")[0]),
    )
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/(?<![\p{L}])(\p{Lu}{2,})-(?=\p{Lu}\p{Ll})/gu, "$1 ")
      .replace(HYPHEN_JOB, "$1 ")
      .replace(/(?<![\p{L}])KI(?![\p{L}])/gu, "AI")
      // ➤ A level after the job goes in front, as the English says it («Process Engineer Senior»).
      .replace(
        /^([^–|(]+?)(\s*\([^)]*\))?\s+(Senior|Junior)(?=\s*$|\s+[–|-]\s|\s*\(|\s+\p{Lu}\/\p{Lu})/u,
        "$3 $1$2",
      )
      .replace(/\s+/g, " ")
      .trim();
  // ➤ The company out of reach of the steps below ("Took Took" is no word said twice), given back at the end.
  out = hideCompany(out, info.firm);
  if (!/\bGmbH\b/.test(src)) out = out.replace(/\s*\bGmbH\b/g, "");
  // ➤ German "Glasfaser" inside a word came back as fibreglass ("Glasfaserausbau" → "Fiberglass expansion", "fibra de
  // ➤ vidrio"): in job titles it is the fibre optic network, unless the title names a plastic.
  // ➤ Small but at the start: with a capital the second leg read it apart ("Fibre optic expansion" → "Expansión
  // ➤ óptica de fibra").
  if (
    target === "en" &&
    /glasfaser/i.test(src) &&
    !/verstärkt|gfk|kunststoff|composite|laminier|boot|rotorbl|faserverbund|harz|formenbau/i.test(
      src,
    )
  )
    out = out
      .replace(
        /(?<![\p{L}])(f)ib(?:er|re)[\s-]?glass(?![\p{L}])/giu,
        (m, f, at) => (at ? "f" : f.toUpperCase()) + "ibre optic",
      )
      .replace(
        /(?<![\p{L}])(g)lass[\s-]fib(?:er|re)(s?)(?![\p{L}])/giu,
        (m, g, s, at) => (at ? "f" : "F") + "ibre optic" + s,
      );
  // ➤ Catalan "de" before a vowel takes its apostrophe ("Control de qualitat de obra civil": the table's names come in
  // ➤ after Firefox's "de"), but not before a semivowel ("de iode") nor an "h" (English words keep it: "de hardware").
  // ➤ Catalan "d'" never stands apart: joined to a vowel, "de" before anything else ("Gestor d' eurodiputats",
  // ➤ "Inspector d' construcció").
  if (target === "ca")
    out = out.replace(/(?<![\p{L}])([Dd])['’]\s+(\p{L})/gu, (m, d, c) =>
      /[aeiouàèéíòóúh]/i.test(c) ? d + "'" + c : d + "e " + c,
    );
  // ➤ Spanish "pasantía" is American; in Spain an internship is "prácticas" ("Estudiante de pasantía").
  if (target === "es")
    out = out.replace(
      /(?<![\p{L}])([Pp])asant[íi]as?(?:(\s+\p{Ll}+(?:ad|id|ic|iv|an)a)s?)?(?![\p{L}])/gu,
      (m, c, adjective = "") =>
        (c === "P" ? "P" : "p") + "rácticas" + (adjective && adjective + "s"),
    );
  // ➤ An English "-ics" field left in small letters ("Técnico de ensayos electronics"); with a capital it may be a name.
  if (target === "es" || target === "ca")
    out = out.replace(ICS_LEFT, (m, w) => ICS[target][w]);
  // ➤ Its apostrophes and contractions first («per a el nostre» → «per al nostre», «del examen» → «de l'examen»), the towns
  // ➤ the title names kept as written.
  if (target === "ca")
    out = besideTowns(out, Object.keys(info.alts || {}), (x) =>
      apostrophes(catalanSpelling(x)),
    );
  // ➤ A product or code left in front of the job ("Kentico Desarrollador", "Odoo Consultor", "SAP Arquitecto": 28 of 2,440
  // ➤ Spanish outputs of the used samples) goes after it, as the tech names of s103 do; not a word of the language
  // ➤ ("Experimentado Desarrollador", "Instalaciones Arquitecto" want more than a move).
  const job = JOB_AFTER[target];
  // ➤ After the job's own words ("SAP Arquitecto de Sistemas" → "Arquitecto de Sistemas SAP", not "Arquitecto SAP de
  // ➤ Sistemas"), not after a place or a code that follows ("Consultor SAP en Madrid", "Desarrollador Full Stack PZA").
  // ➤ Only after a separator with a space before it: a slash or hyphen joined to words ties products or codes
  // ➤ together ("SAP FI/CO Consultor", "SAP IS-U Consultor").
  if (job)
    out = out.replace(
      new RegExp(
        "(^|\\s[|/–-]\\s*)(" +
          NAME_WORD +
          "(?:\\s" +
          NAME_WORD +
          "){0,2})\\s(" +
          job +
          ")((?:\\s+(?:de|del|de la)\\s+\\p{L}[\\p{L}-]*|\\s+d['’]\\p{L}[\\p{L}-]*|\\s+(?!(?:en|con|para|a|amb|per|avec|pour|dans|à|in|at|sur|y|i|et|o|ou)\\s)\\p{Ll}[\\p{L}-]*)*)(?=$|[\\s,|/–(-])",
        "gu",
      ),
      (m, b, name, w, own) =>
        name
          .split(/\s+/)
          .some((x: string) =>
            target === "pl" || target === "it"
              ? !/^[\p{Lu}\d][\p{Lu}\d.#+/-]*$/u.test(x)
              : known(target, x),
          )
          ? m
          : b + w + own + " " + name,
    );
  // ➤ "Backend", "Frontend" and "Full Stack" after the job, where Firefox left them in front with the tech names after
  // ➤ them ("Fullstack .NET Développeur"), with no "de" before them, and in small letters after a word, as these
  // ➤ languages write them ("Ingeniero de Backend de Java" → "Ingeniero backend de Java"; STACK_FIRST). Not in capitals.
  if (/^(?:es|ca|fr|pl|it)$/.test(target) && STACK_OUT.test(src)) {
    out = out.replace(
      STACK_BEFORE_JOB[target],
      (m, b, stack, job) =>
        b + (b ? job : job[0].toUpperCase() + job.slice(1)) + " " + stack,
    );
    // ➤ An English job word Firefox left before them, mostly into Catalan ("Java Developer backend", "Go Engineer
    // ➤ backend"): the language's own, the names that stood before it after it. Not the table's "Staff Engineer".
    out = out.replace(STACK_JOB_EN, (m, names, job, plural, stack, at, all) => {
      if (/^staff\s*$/i.test(names)) return m;
      const word = JOB_EN_TO[target][job.toLowerCase() + plural],
        opens = !at || /[–|(/:-]\s*$/u.test(all.slice(0, at));
      return (
        (opens ? word[0].toUpperCase() + word.slice(1) : word) +
        (names.trim() ? " " + names.trim() : "") +
        " " +
        stack
      );
    });
    out = out
      .replace(STACK_DE, "")
      .replace(STACK_AFTER_WORD, (m) =>
        /\p{Ll}/u.test(m) ? m.toLowerCase() : m,
      );
  }
  // ➤ A welding process Firefox left in front of the welder ("TIG de soldador", "MAG Soldador").
  if (/^(?:es|ca|fr|pl|it)$/.test(target))
    out = out.replace(
      /^((?:TIG|MIG|MAG|WIG|MMA)(?:(?:[\s/-]+|\s+(?:y|i|et|e)\s+)(?:TIG|MIG|MAG|WIG|MMA))*)\s+(?:de\s+|di\s+)?((?:[Ss]oldador|[Ss]oudeu|[Ss]pawacz|[Ss]aldator)[\p{L}-]*)/u,
      (m, code, w) => w[0].toUpperCase() + w.slice(1) + " " + code,
    );
  // ➤ And "CNC" in front of the job, into Polish and Italian, which write it after ("CNC Fresatore", "CNC Operator frezarki").
  if (target === "pl" || target === "it")
    out = out.replace(
      /^CNC\s+(\p{Lu}\p{Ll}[\p{L}-]*(?:\s+\p{Ll}[\p{L}-]*)*)(?=$|\s[–|-]\s|\s?\()/u,
      "$1 CNC",
    );
  if (target === "uk") out = ukrainianOrder(out);
  // ➤ Polish "Deweloper" is a property developer: before a tech name or the part of the software, the programmer ("Deweloper
  // ➤ .NET", "Deweloper frontend").
  if (
    target === "pl" &&
    !/(?:property|real\s+estate|land|housing|residential|business)\s+developer/i.test(
      src,
    )
  )
    out = out.replace(
      /(?<![\p{L}])([Dd])eweloper(zy)?(?=\s+(?:[.\p{Lu}]|(?:back|front)-?end|full[- ]?stack))/gu,
      (m, d, plural) =>
        (d === "D" ? "P" : "p") + (plural ? "rogramiści" : "rogramista"),
    );
  // ➤ Firefox's "Macining" ("Technicien usinage" came back "Macining Technician" in a batch).
  if (target === "en")
    out = out.replace(/(?<![\p{L}])([Mm])acining(?![\p{L}])/gu, "$1achining");
  // ➤ And in English one Firefox left after it ("Soldadores por tig" came back "Welder TIG"), in capitals, the trade small.
  if (target === "en")
    out = out.replace(
      /^Welder(s?)(?:\s+[–-])?\s+((?:tig|mig|mag|wig|mma)(?:\s*[-/\s]\s*(?:tig|mig|mag|wig|mma))*)(?![\p{L}])/iu,
      (m, plural: string, codes: string) =>
        codes.toUpperCase().replace(/\s*[-/\s]\s*/g, "/") + " welder" + plural,
    );
  // ➤ A phrase said again in brackets right after itself goes once ("Roads and utilities (Roads and utilities)": the
  // ➤ French "Voirie, Réseaux Divers (VRD)" with its letters spelled out too).
  out = out.replace(
    /(?<![\p{L}])(\p{L}[\p{L}\s,'’&-]{2,}?)\s*\((\1)\)/giu,
    "$1",
  );
  // ➤ A word said twice across "and" or a slash goes once: two words of the source with one name ("Koude- en
  // ➤ Koeltechniek" came back "Froid et froid").
  // ➤ Not the end of a compound («Pre-Sales / Sales Engineer»).
  // ➤ Nor the head of a longer phrase («Quality and Supplier Quality Engineer»: «calidad y calidad de proveedores»).
  out = out.replace(
    /(?<![\p{L}-])(\p{L}{3,})(?:\s+(?:and|y|i|et|und|en)\s+|\s*\/\s*)\1(?=\s*(?:$|[,–|()/]))/giu,
    "$1",
  );
  // ➤ And a job of several words, or one across a bar, two names of the source for one trade («Bilplåtslagare /
  // ➤ Skadetekniker» came back «Body repairer / Body repairer», Czech «MONTÉR | MONTÉRKA» «Fitter | Fitter»).
  out = out
    .replace(
      /(?<![\p{L}-])(\p{L}{3,}(?:[ -]\p{L}+){1,3})\s*\/\s*\1(?![\p{L}])/giu,
      "$1",
    )
    .replace(
      /(?<![\p{L}-])(\p{L}{3,}(?:[ -]\p{L}+){0,3})\s*\|\s*\1(?![\p{L}])/giu,
      "$1",
    );
  // ➤ The English "X Manager": "Responsable", not the Latin American "Gerente" or the French clerk's "Gestionnaire"
  // ➤ ("Gerente de Mantenimiento", "Gestionnaire d'ingénierie"); not those so called in Spain and France ("Property
  // ➤ Manager", "Fleet Manager", "General Manager"). The Catalan "Gestor" too ("Gestor de serveis informàtics").
  if (
    /^en-(?:es|ca|fr)$/.test(pair) &&
    MANAGER.test(src) &&
    !MANAGED_SO.test(src)
  ) {
    if (target === "fr")
      out = out.replace(/^Gestionnaire(?=\s|$)/u, "Responsable");
    else
      out = out.replace(
        target === "es" ? /^Gerente(?=\s|$)/u : /^(?:Gerent|Gestor)(?=\s|$)/u,
        "Responsable",
      );
  }
  // ➤ Catalan gives back the spaced dash of its input ("Tècnic electrònic-Energia", "MAG-Soldador"): where the output
  // ➤ has fewer, a hyphen before a capital is spaced again, the first ones first.
  if (target === "ca") {
    const dash = /\s–\s/.test(src) ? " – " : " - ",
      want = (String(src).match(/\s[-–]\s/g) || []).length;
    let have = (out.match(/\s[-–]\s/g) || []).length;
    // ➤ Only hyphens beyond the source's own joined words («Welder-Fitter - Permanent» is no «Soldador - muntador»).
    const joined = (t: string) => (t.match(/\p{L}-\p{L}/gu) || []).length;
    let spare = joined(out) - joined(String(src));
    const spaced = (m: string, a: string, b: string) =>
      have < want && spare > 0 ? (have++, spare--, a + dash + b) : m;
    out = out.replace(/(\p{L})-(\p{Lu})/gu, spaced);
    // ➤ Then before a small letter, if still fewer ("Tècnic d'avaries-torn fix de nit").
    out = out.replace(/(\p{L})-(\p{Ll})/gu, spaced);
  }
  // ➤ Words of Spain: "preventa" ("Ingeniero de Pre-Ventas"), "ordenadores" ("usuarios de computadoras"), geotecnia.
  if (target === "es")
    out = out
      .replace(
        /(?<![\p{L}])([Pp])re-?[Vv]entas?(?![\p{L}])/gu,
        (m, c) => (c === "P" ? "P" : "p") + "reventa",
      )
      .replace(
        /(?<![\p{L}])([Cc])omputadora(s?)(?:(\s+\p{Ll}+(?:ad|id|ic|iv|an))as?)?(?![\p{L}])/gu,
        (m, c, pl, adjective = "") =>
          (c === "C" ? "O" : "o") +
          "rdenador" +
          (pl ? "es" : "") +
          (adjective && adjective + (pl ? "os" : "o")),
      )
      .replace(/(?<![\p{L}])([Gg])eotecnolog[ií]a(?![\p{L}])/gu, "$1eotecnia");
  if (target === "ca")
    out = out
      .replace(/(?<![\p{L}])([Gg])eotecnologia(?![\p{L}])/gu, "$1eotècnia")
      .replace(
        /(?<![\p{L}])([Pp])re-?[Vv]endas?(?![\p{L}])/gu,
        (m, c) => (c === "P" ? "P" : "p") + "reventa",
      );
  // ➤ The bike lanes of Spain ("planificación de carreteras y ciclovías").
  if (target === "es")
    out = out.replace(
      /(?<![\p{L}])([Cc])iclov[ií]a(s?)(?![\p{L}])/gu,
      (m, c, pl) => c + "arril" + (pl ? "es" : "") + " bici",
    );
  // ➤ The power grid, not a squared one ("UK Grid Network" came back "Xarxa de quadrícula del Regne Unit").
  if (target === "ca")
    out = out.replace(
      /(?<![\p{L}])([Xx])arxa de quadrícula(?![\p{L}])/gu,
      "$1arxa elèctrica",
    );
  if (target === "es")
    out = out.replace(
      /(?<![\p{L}])([Rr])ed de cuadrícula(?![\p{L}])/gu,
      "$1ed eléctrica",
    );
  // ➤ A self-employed worker is "autónomo", "autònom" ("Ingeniero de medición de gas autoempleado").
  if (target === "es")
    out = out.replace(
      /(?<![\p{L}])([Aa])utoempleado(s?)(?![\p{L}])/gu,
      "$1utónomo$2",
    );
  if (target === "ca")
    out = out.replace(
      /(?<![\p{L}])([Aa])utoocupat(s?)(?![\p{L}])/gu,
      "$1utònom$2",
    );
  // ➤ Firefox adds "im Preisvergleich" (in a price comparison) to some short German titles.
  if (target === "de" && !/preisvergleich/i.test(src))
    out = out.replace(/\s+im\s+Preisvergleich\b/g, "");
  // ➤ German and Dutch: Firefox adds the marks itself («Elektriker Multi-Skilled (m/w/d)»), out whether or not the
  // ➤ source has them.
  if (
    src.search(MARK) >= 0 ||
    src.search(SWISS) >= 0 ||
    target === "de" ||
    target === "nl"
  )
    out = noMarks(out);
  // ➤ A star after a word in the title (the gender star, "Engineer*", or a footnote's) is none of the output's
  // ➤ ("Ingeniero DevOps* sénior"). Kept in the English the second leg reads, which reads it better so
  // ➤ ("Requirements Engineer – Defence" came back "Requisitos Ingeniero"); polish() takes it out of the English shown.
  if (target !== "en" && /\p{L}\*(?![\p{L}*])/u.test(src))
    out = out.replace(/(\p{L})\*(?![\p{L}*])/gu, "$1");
  out = out.replace(ADDED, (m) =>
    src.toLowerCase().includes(m.trim().toLowerCase()) ? m : "",
  );
  out = sayOnce(out).replace(
    /(?<![\p{L}])(\p{L}{4,})\s+\1(?![\p{L}])/giu,
    (m, w: string) =>
      isTown(`${w}-${w}`) ||
      isTown(m) ||
      src.toLowerCase().includes(m.toLowerCase())
        ? m
        : w, // «Bora Bora»
  );
  // ➤ The same job on both sides of "or" said once ("IT systems management assistant or IT systems management assistant").
  out = out.replace(/^(.{6,}?)\s+(?:or|o|ou|of|oder|bzw\.?)\s+\1$/iu, "$1");
  out = out.replace(/^(.{4,}?)\s+[-–]\s+\1$/iu, "$1");
  // ➤ "de" said twice before the language written in ("Especialista en Soporte Técnico de de habla alemana"), and
  // ➤ its capital inside the title ("(De habla neerlandesa)").
  out = out
    .replace(/(?<![\p{L}])de\s+(de\s+(?:habla|parla)\s)/giu, "$1")
    .replace(/(?<=.)\bDe (habla|parla) (?=\p{Ll})/gu, "de $1 ");
  out = correct(src, out, target);
  if (pair === "de-en") out = oneJob(src, out);
  out = oneMechanic(pair, src, out);
  // ➤ Dutch "machinist" is a machine operator, never the CNC machinist English means ("machinist
  // ➤ inspectievoertuigen" came back "mecanizador" in the second leg); on the railway, a train driver.
  if (
    pair === "nl-en" &&
    /(?<![\p{L}])machinist(?:en)?(?![\p{L}])/iu.test(src)
  ) {
    const railway =
      /trein|spoor|goederen|reizigers|prorail|(?<![\p{L}])NS(?![\p{L}])/iu.test(
        src,
      );
    const job = railway ? "train driver" : "machine operator";
    out = out.replace(
      /(?<![\p{L}-])([Mm])achinist(s?)(?![\p{L}])/gu,
      (m, c, pl) =>
        (c === "M" ? job[0].toUpperCase() + job.slice(1) : job) + pl,
    );
  }
  // ➤ The field where the English names one mechanic ("Industrial mechanic" came back "Mecánica industrial", "Automotive
  // ➤ mechanic" "Mecànica d'automoció"): the person, the adjective after it agreeing.
  if (
    /^(?:es|ca|fr)$/.test(target) &&
    /(?<![\p{L}])mechanic(?![\p{L}])/iu.test(src) &&
    !/(?<![\p{L}])mechanics(?![\p{L}])/iu.test(src)
  ) {
    const PERSON_OF = (
      {
        es: ["Mecánica", "Mecánico"],
        ca: ["Mecànica", "Mecànic"],
        fr: ["Mécanique", "Mécanicien"],
      } as Record<string, [string, string]>
    )[target];
    const MASC = (
      {
        es: [
          [/(\p{L}{3,})ica$/u, "$1ico"],
          [/(\p{L}{3,})ada$/u, "$1ado"],
        ],
        ca: [
          [/(\p{L}{3,})ica$/u, "$1ic"],
          [/(\p{L}{3,})ada$/u, "$1at"],
        ],
        fr: [
          [/(\p{L}{3,})elle$/u, "$1el"],
          [/(\p{L}{3,})ale$/u, "$1al"],
        ],
      } as Record<string, [RegExp, string][]>
    )[target];
    out = out.replace(
      new RegExp(`(^|[/|–]\\s*)${PERSON_OF[0]}(\\s+)(\\p{L}+)`, "gu"),
      (m, b: string, sp: string, next: string) => {
        const agreed =
          /^(?:de|del|d['’]|des|du)$/iu.test(next) || /^d['’]/iu.test(next)
            ? next
            : MASC.reduce((w, [re, to]) => w.replace(re, to), next);
        return b + PERSON_OF[1] + sp + agreed;
      },
    );
  }
  // ➤ A trade written in that Firefox gave back in the plural where the English was singular, as written
  // ➤ ("HVAC fitter" → "Montadores – Climatización").
  if (/^(?:es|ca|fr)$/.test(target))
    for (const [term, , tr] of info.spans || []) {
      if (!tr || /s$/i.test(term) || tr.includes(" ")) continue;
      // ➤ Only opening a part and before its end, a separator or a preposition ("Montadores hidráulicos" keeps its
      // ➤ agreement; in "Mecánico de soldadores" it is not the job).
      out = out.replace(
        new RegExp(
          `(^|[–|/(,:]\\s*)(${tr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?:es|s)(?=\\s*$|\\s*[–|/(),:;-]|\\s+(?:de|del|d['’]|en|para|per|a|à|du|des|pour)(?![\\p{L}]))`,
          "giu",
        ),
        (m, b, w) => b + w,
      );
    }
  // ➤ The levels the first leg took out, said the target's way ("Delineante proyectista con experiencia").
  if (info.said && LEVEL_SAY[target])
    out = sayLevels(out, info.said.split(" "), LEVEL_SAY[target], src);
  // ➤ The levels taken out, in front ("Experienced project manager", "Experienced Java Developer").
  if (info.level)
    out =
      info.level.replace(/ \p{Lu}(?=\p{Ll})/gu, (c) => c.toLowerCase()) +
      " " +
      (CAPITAL_THEN_SMALL.test(out) ||
      (target === "en" && ONE_WORD_JOB.test(out))
        ? lowerOpening(out, src, target === "en")
        : out);
  // ➤ A name written in with a capital only because its English word opened the title keeps it when Firefox
  // ➤ moves it ("programari Encastat"): lowered after a lowercase word.
  if (target !== "de" && target !== "en")
    for (const [, cap, tr] of info.spans || []) {
      if (!tr || cap === tr || tr[0] !== tr[0].toLowerCase()) continue;
      out = out.replace(
        new RegExp(
          `(\\p{Ll}[\\p{L}'’-]*\\s+)${cap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`,
          "gu",
        ),
        (m, b) => b + tr,
      );
    }
  if (target === "es" || target === "ca")
    out = sentenceCase(out, src, info.names);
  const first = src.match(/\p{L}/u),
    at = out.search(/[\p{L}\uE000]/u);
  if (
    first &&
    first[0] !== first[0].toLowerCase() &&
    at >= 0 &&
    out[at] !== out[at].toUpperCase() &&
    !/^\p{Ll}+\p{Lu}/u.test(out.slice(at))
  )
    out = out.slice(0, at) + out[at].toUpperCase() + out.slice(at + 1);
  // ➤ The company back, as the title writes it.
  out = companyBack(showCompany(out, info.firm), info.firm);
  const dropped = info.mid.filter(
    (e) => !out.includes(e.replace(/\uFE0F/g, "")),
  );
  if (dropped.length) out = `${out} ${dropped.join("")}`;
  if (target !== "en") out = poundsAsWritten(out, target);
  // ➤ Not the no-break spaces inside a number or before «%» («35 000 £», «80 %»).
  return [info.lead, out.replace(/[^\S\u00a0\u202f]+/g, " ").trim(), info.trail]
    .filter(Boolean)
    .join(" ");
}
// ➤ Spanish and Catalan write a title in sentence case; Firefox copied an English title's capitals («Jefe de
// ➤ Mantenimiento»). Lowered: a word with a capital the source does not write itself, that opens no part and is no
// ➤ name, town or country.
// ➤ British pay written the target's way: «£45,000» reads forty-five pounds in Spanish, and «£35k» stayed English.
// ➤ A range shares its «k» («£35-40k»); a separator before three digits groups thousands, before one or two it
// ➤ marks pence, whichever way Firefox wrote it («£55.000», «£18,50»). An amount glued to other letters stays.
const POUNDS =
  /£\s?(\d[\d.,]*\d|\d)(?:(\s?[-–]\s?)£?(\d[\d.,]*\d|\d))?([km])?(?![\p{L}\d]|[.,]\d)/giu;
const poundsOf = (n: string): number =>
  Number(n.replace(/[.,](?=\d{3}(?:[.,]|$))/g, "").replace(",", "."));
const poundsAsWritten = (out: string, target: string): string =>
  out.replace(
    POUNDS,
    (
      m,
      from: string,
      dash: string = "",
      to: string = "",
      unit: string = "",
    ) => {
      const times = unit ? (unit.toLowerCase() === "k" ? 1e3 : 1e6) : 1;
      const pence = !unit && [from, to].some((n) => /[.,]\d{1,2}$/.test(n));
      const write = new Intl.NumberFormat(target, {
        minimumFractionDigits: pence ? 2 : 0,
        maximumFractionDigits: 2,
      });
      const amount = (n: string) => write.format(poundsOf(n) * times);
      return (to ? amount(from) + dash + amount(to) : amount(from)) + " £";
    },
  );
// ➤ Spain's regions and their institutions, names in any language («Catalunya» for «Catalonia», «Generalitat»).
const REGION =
  /^(?:catalunya|cataluña|catalonia|andalucía|andalusia|vasco|basc|euskadi|galicia|galícia|aragón|aragó|valenciana|canarias|canàries|baleares|balears|illes|islas|asturias|navarra|cantabria|murcia|extremadura|castilla|castella|rioja|mancha|generalitat|país)$/i;
// ➤ A text without its accents, so «Clínic» is the source's «Clinic».
const bare = (t: string): string => t.normalize("NFD").replace(/\p{M}/gu, "");
const TITLE_CASE_WORD = /^\p{Lu}\p{Ll}{3,}/u;
function sentenceCase(out: string, src: string, names: string[]): string {
  const words = (src.match(/\p{L}{4,}/gu) || []).filter(
    (w) => w !== w.toUpperCase(),
  ); // not «HVAC»
  if (
    words.length < 2 ||
    words.filter((w) => TITLE_CASE_WORD.test(w)).length < words.length * 0.8
  )
    return out;
  // ➤ After an elided article or preposition too («Responsable d'Enginyeria»).
  return out.replace(
    /(?<![\p{L}-])(?<!\p{L}{2}['’])(?<!^\p{L}?['’])\p{Lu}\p{Ll}+(?![\p{L}'’-])/gu,
    (word: string, at: number) =>
      /^\s*$|(?:[–|/(:]|\s-)\s*$/u.test(out.slice(0, at)) ||
      !TITLE_CASE_WORD.test(word) ||
      new RegExp(`(?<![\\p{L}])${bare(word)}(?![\\p{L}])`, "u").test(
        bare(src),
      ) ||
      names.some((n) => n.includes(word)) ||
      isTown(word) ||
      COUNTRY.test(word) ||
      REGION.test(word)
        ? word
        : word.toLowerCase(),
  );
}
export function putBack(raw: string | undefined, again: Again): string | null {
  let out = String(raw || "");
  // ➤ A stand-in Firefox wrote in small letters is found all the same ("Fast mechanical zalando").
  for (const [stand, name, kind] of again.put) {
    if (!new RegExp(stand, "iu").test(out)) return null;
    out = out.replace(new RegExp(stand, "giu"), (m) =>
      kind === "trade" && m[0] !== m[0].toUpperCase()
        ? name[0].toLowerCase() + name.slice(1)
        : name,
    );
  }
  return out;
}
// ➤ An English title Firefox gave back as it is, every word with a capital ("SAP Application Manager", now and then
// ➤ with "(anglès)" after it), asked again with the job's word in small letters, which it then translates.
const JOB_WORD =
  /(?<![\p{L}])(?:Manager|Engineer|Developer|Architect|Consultant|Analyst|Specialist|Expert|Associate|Principal|Administrator|Technician|Officer|Director|Coordinator|Designer|Scientist|Programmer|Tester|Advisor|Owner|Assistant|Operator|Planner|Supervisor|Controller|Auditor|Trainer|Lead)(?![\p{L}])/gu;
export const letters = (x: string | undefined): string =>
  String(x || "")
    .replace(ADDED, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
// ➤ Not a title the table already wrote in the target's words, whole or in part: given back as it is, it was right
// ➤ ("Supervisor de torn" asked again came back "Supervisor de trencament"). Only into Spanish, Catalan and French:
// ➤ German and Dutch offers often write the English title as it is.
export function copyAgain(
  pair: string,
  text: string,
  raw: string | undefined,
  info: Partial<Info> = {},
): Again | null {
  if (
    !/^en-(?:es|ca|fr)$/.test(pair) ||
    letters(raw) !== letters(text) ||
    info.whole ||
    (info.spans || []).length
  )
    return null;
  const lowered = String(text).replace(JOB_WORD, (w) => w.toLowerCase());
  return lowered === text
    ? null
    : { text: lowered, put: [], names: false, copy: true };
}
// ➤ "Process Engineer / Process Engineer" (a title with both genders) said once: only when the whole
// ➤ part before the slash, from the last comma, dash or bracket, equals the whole part after it.
function sayOnce(out: string): string {
  const parts = out.split(/\s*\/\s*/),
    slashes = out.match(/\s*\/\s*/g) || [];
  let said = parts[0],
    last = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const tail = (last.split(STRONG).pop() ?? "").trim(),
      head = parts[i].split(STRONG)[0].trim();
    if (tail && tail.toLowerCase() === head.toLowerCase()) {
      const rest = parts[i].slice(parts[i].indexOf(head) + head.length);
      said += rest;
      last += rest;
    } else {
      said += slashes[i - 1] + parts[i];
      last = parts[i];
    }
  }
  return said.replace(/\s+/g, " ").trim();
}
// ➤ The method's steps on lists of titles, one entry per title and in order, as builder/mt/legs.ts runs them
// ➤ around Firefox's passes. Each answers new lists and leaves those it was given as they were; what one step
// ➤ hands the next goes through JSON, as it went through a file when the steps were separate commands.
export const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
