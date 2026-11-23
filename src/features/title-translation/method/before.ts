// Legacy builder/mt/before.mjs (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// Before Firefox: a title tidied, and the trades of the table written already translated (builder/mt/method.mjs).
import { calmTitle, shouting } from "../../../shared/kit/calm-titles.js";
import { withoutGenders } from "./genders.js";
import { blockersFor } from "./trades.js";
import { jobDash } from "./jobdash.js";
import { placesIn, otherNames } from "./places.js";
import { companySpan, hideCompany, showCompany } from "./companies.js";
import { englishTitle } from "../language-of.js";
import {
  ACCENTS,
  AGENTIC,
  ARTICLE,
  COUNTRY_CODE,
  EMOJI,
  EMOJI_LEAD,
  EMOJI_TRAIL,
  ENGLISH_PLACE,
  FIRM_COUNTRY,
  FR_JOB_EN,
  FR_STACK_JOB,
  HYPHEN_JOB,
  INFRA,
  INSTALL_LETTERS,
  INVISIBLE,
  JOB_EN,
  JOB_OTHER,
  LANGUAGE,
  NAMES,
  NOT_A_BUILDING_SITE,
  OPENING,
  OPENING_RE,
  PERSON,
  SPEAKING,
  STACK_FIRST,
  TECH_FIRST,
  TERMS,
  TITLE_DE,
  adjectiveAfter,
  apartGlued,
  capital,
  decode,
  installsOf,
  spellings,
  withDe,
  wordsAfter,
} from "./method-tables.js";
import {
  accentedOf,
  chooseDash,
  englishUses,
  writtenInEnglish,
} from "./checks.js";
import {
  COUNTRY,
  LEVEL_SAY,
  TRADE_FR,
  completeCut,
  takeLevels,
} from "./levels.js";
import type { Span } from "./info.js";
import { escape, nameWord, termWord, word } from "./patterns.js";

export function before(
  pair: string,
  title: string,
  city = "",
  said = "",
  source = "",
  company = "",
  others = 0,
) {
  title = String(title || "").replace(INVISIBLE, "");
  const [s] = pair.split("-");
  let t = decode(title).replace(/\s+/g, " ").trim();
  // The board some Swiss offers come from, named at the end of the title and as their company ("- Architektur
  // Stellen"): off before the company is set aside, or it comes back as the company.
  if (s === "de") t = t.replace(/\s+[-–|]\s+Architektur Stellen$/u, "");
  // A title of the first leg already in English is left as written (writtenInEnglish); in a language whose titles
  // the site counts no words of, one whose every word English titles use twice or more (englishTitle): the Portuguese
  // and Swedish models rewrote English titles ("Maintenance Team Leader - Afternoon Shift" came back "Team
  // Maintenance Leader"; 6,178 published titles on 31 October, all English in 90 drawn).
  const english =
    s !== "en" &&
    (writtenInEnglish(t) ||
      (!/^(?:es|ca|fr|nl|de)$/.test(s) && englishTitle(t, 2)));
  const lead = (t.match(EMOJI_LEAD) || [""])[0].trim();
  const trail = (t.match(EMOJI_TRAIL) || [""])[0].trim();
  if (lead) t = t.slice(t.indexOf(lead) + lead.length);
  if (trail) t = t.slice(0, t.lastIndexOf(trail));
  const mid = t.match(EMOJI) || [];
  // The offer's company, where the title names it, kept as the title writes it ("bei Auto Röhr", not "at Auto
  // Tube"; "REWE Group Österreich", not "España"): set aside from the steps below (companies.ts). In the
  // second leg, as the title it came from writes it.
  let firm = companySpan(
    source ? decode(source).replace(/\s+/g, " ").trim() : t,
    company,
    others,
  );
  if (firm) {
    const hidden = hideCompany(t, firm);
    if (hidden === t) firm = "";
    else t = hidden;
  }
  // A name and a country opening the title before a separator, with no job word in the name, are a company too
  // ("Technord Belgium - Ingénieur Projet Data Center", its company field a board's, came back "Technord Bélgica").
  const named = !firm && t.match(FIRM_COUNTRY);
  if (
    named &&
    !ARTICLE.test(named[2]) &&
    !named[2].split(/\s+/).some((w) => JOB_EN.test(w) || JOB_OTHER.test(w))
  ) {
    const hidden = hideCompany(t, named[1]);
    if (hidden !== t) {
      firm = named[1];
      t = hidden;
    }
  }
  t = withoutGenders(t.replace(/\s+/g, " ").trim(), s);
  // A bracket a site left open when it cut the title ("Técnico Oficial de Primera (Reparación de"), closed:
  // Firefox drops what follows one left open.
  if ((t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length) t += ")";
  if (shouting(t)) t = calmTitle(t, spellings);
  // A run of words in capitals inside a title otherwise not ("WIJ ZOEKEN EEN Automonteur") calmed too.
  else
    t = t.replace(/(?:\p{Lu}{2,}[ ,]+){1,}\p{Lu}{2,}/gu, (run) =>
      calmTitle(run, spellings),
    );
  // "Full Remote" said as English says it into Spanish, Catalan and French ("Full en remoto"; "Business Analyst in Full
  // Remote" came back "a distancia completa"; "fully remote" comes back "totalmente remoto", "totalment remot"). German
  // and Dutch offers write it in English.
  if (/^en-(?:es|ca|fr)$/.test(pair))
    t = t.replace(
      /(?:(?<![\p{L}])(?:en|in)\s+)?(?<![\p{L}])full[- ]?remote(?![\p{L}])/giu,
      (m) =>
        m.replace(/^(?:en|in)\s+/i, "")[0] === "F"
          ? "Fully remote"
          : "fully remote",
    );
  if (s === "es") t = t.replace(/(^|[^\p{L}])Sr\.?(?= )/gu, "$1Senior");
  // The Spanish public service's ", en general" says nothing ("Instaladores electricistas, en general" came back
  // "Instal·ladors d'electricistes").
  if (s === "es") t = t.replace(/,\s*en general(?=\s*(?:$|\())/iu, "");
  // Its "Soldadores por tig" is the TIG welder ("Welders by tig").
  if (s === "es")
    t = t.replace(
      /(soldador(?:es|as|a)?(?:\/as?)?)\s+por\s+(tig|mig[-\s]?mag|mig|mag)(?![\p{L}])/giu,
      (m, w, x) => w + " " + x.toUpperCase().replace(/\s/, "-"),
    );
  // Spanish and Catalan job words written without their accents ("Tecnico Servicios") lose the job in
  // Firefox ("Technical After-sales Services"): the accent put back.
  // A word joined by hyphens gets its accents part by part when the whole is not listed ("Operateur-regleur").
  const accent = (w: string) => {
    const a = ACCENTS[s][w.toLowerCase()];
    return !a
      ? w
      : w === w.toUpperCase() && w.length > 1
        ? a.toUpperCase()
        : w[0] === w[0].toUpperCase()
          ? a[0].toUpperCase() + a.slice(1)
          : a;
  };
  const noAccents = !/[À-ÿ]/u.test(t);
  if (ACCENTS[s])
    t = t.replace(/[\p{L}·-]+/gu, (w) =>
      ACCENTS[s][w.toLowerCase()] || !w.includes("-")
        ? accent(w)
        : w.split("-").map(accent).join("-"),
    );
  // A French or Spanish title written with no accent at all, from capitals calmed ("Ingenieur Systemes Embarques" came
  // back "Embedd Systems", "Industrie/nucleaire" "Industry/Pilly"): each word of four letters or more that the
  // language's titles write with accents, and next to never without, takes them; not a town (179 French and 57 Spanish
  // published titles, 31 October).
  if (noAccents && (s === "fr" || s === "es")) {
    const towns = new Set(
      [...placesIn(t), String(city || "")].flatMap((x) =>
        x.toLowerCase().split(/[^\p{L}]+/u),
      ),
    );
    t = t.replace(/\p{L}{4,}/gu, (w) => {
      const a =
        !towns.has(w.toLowerCase()) && accentedOf(s).get(w.toLowerCase());
      return !a
        ? w
        : w === w.toUpperCase()
          ? a.toUpperCase()
          : w[0] === w[0].toUpperCase()
            ? a[0].toUpperCase() + a.slice(1)
            : a;
    });
  }
  // A job and its field with no "de" between them ("Técnico Mantenimiento") read as an adjective and a
  // noun ("Technical Maintenance"): the "de" put in, as the language writes it.
  if (s === "es" || s === "ca") t = withDe(t, s);
  // A leading "Vacancy" says nothing on a job site and the second leg reads it wrongly ("Vacature
  // Procesoperator" → "Leerstandsprozessbetreiber"): left out of the translation. "Job" only before a
  // separator, since "Job Coach" is a job.
  if (s === "de") t = t.replace(/^[Jj]obs?\s*[-–:|]\s*(?=\p{L})/u, "");
  // A leading «Oferta» or «Offre» with its number says nothing either («OFERTA 2020/2021-012: Se necesita TÉCNICO
  // ELECTROMECÁNICO» came back «Offer 2020/2021-012: …», «Offre d'emploi …»: 122 titles, 8 November 2026), nor a
  // WordPress archive's «archivos» («OFERTA CALDERERO SOLDADOR archivos» came back «… – files»).
  if (s === "es")
    for (let k = 0; k < 2; k++)
      t = t.replace(
        /^ofertas?(?![\p{L}])(?:\s+(?:de\s+)?(?:empleo|trabajo))?(?:\s+[\p{L}\d./-]*\d[\p{L}\d./-]*)?\s*[:|–-]?\s*(?:se\s+(?:necesita|busca)n?\s+|como\s+|para\s+(?!(?:la|el|los|las)\s))?(?=\p{L})(?!(?:de|del|p[uú]blic[ao]|cerrada|abierta|para)(?![\p{L}]))/iu,
        "",
      );
  if (s === "es") t = t.replace(/\s+archivos$/iu, "");
  if (s === "fr")
    t = t.replace(
      /^offres?(?![\p{L}])(?:\s+(?:d['’ ]emploi|de\s+(?:poste|recrutement|cdi|cdd|stage|collaboration|th[eè]se|mission)))?(?:\s+(?:n°\s*)?\d[\d/.-]*)?\s*[:|–-]?\s*(?:de\s+(?=\p{L}))?(?:\d+\s+)?(?=['"«“]?\p{L})(?!de\s|d['’ ]emploi|n°)/iu,
      "",
    );
  // French "Responsable X" comes back "Responsible X" ("Responsable Travaux" → "Responsible – Work"): "Head of"
  // written in its place, which Firefox keeps and reads the rest after ("Head of Works").
  if (s === "fr")
    t = t.replace(
      /(^|[/|–-]\s*)Responsable\s+(?!d['’]|de\s|des\s|du\s|en\s|à\s|(?:techniques?|commerciale?s?|administrati(?:f|ve)s?|financi(?:er|ère)s?|informatique|juridique|industriel(?:le)?s?|régionale?s?|nationale?s?|adjointe?s?|générale?|opérationnel(?:le)?)(?![\p{L}]))(?=\p{L})/giu,
      "$1Head of ",
    );
  // "Région X" before a town as French also writes it, "région de X", which comes back "X region" ("Technicien - Région
  // Luxembourg" came back "Región Luxembourg", "Langemark-Poelkapelle Region"); not before a name that is no town
  // ("Région Bfc", "Région Germanophone").
  if (s === "fr")
    t = t.replace(
      /(?<![\p{L}])Région\s+(?=(\p{Lu}[\p{L}'’-]*))/gu,
      (m, name, at, all) =>
        !placesIn(all).includes(name) &&
        name.toLowerCase() !== String(city || "").toLowerCase()
          ? m
          : /^[AEIOUYÉÈÊÎÔH]/u.test(name)
            ? "région d'"
            : "région de ",
    );
  // German "Leitung X" and Flemish "Verantwoordelijke X" (the one in charge of X) as "Head of X" too
  // ("Leitung Arbeitsvorbereitung" → "Management Work Preparation", "Verantwoordelijke Productie" → "Responsible").
  if (s === "de")
    t = t.replace(/(^|[/|–-]\s*)Leitung\s+(?=\p{Lu})/gu, "$1Head of ");
  // "Leiter X" too, whom Firefox read as a ladder ("Leiter Konstruktion" came back "Ladder construction").
  if (s === "de")
    t = t.replace(/(^|[/|–-]\s*)Leiter(?:in)?\s+(?=\p{Lu})/gu, "$1Head of ");
  // "Geprüfter" is certified ("Geprüfter Polier" came back "Probado por el capataz").
  if (s === "de")
    t = t.replace(
      /(?<![\p{L}])(?:[Ss]taatlich\s+)?([Gg])eprüft(?=e[rnms]?\s)/gu,
      (m, g) => (g === "G" ? "Zertifiziert" : "zertifiziert"),
    );
  // French "BE" between words is the bureau d'études ("Technicien BE Electrotechnique" came back "Oficina de diseño de
  // técnicos Electrotechnique"); not Belgium's code in brackets.
  if (s === "fr")
    t = t.replace(/(\s)BE(\s+)(?=\p{L})/gu, "$1bureau d'études$2");
  // A «pôle» of a firm or a town hall is its department («Responsable Pôle CVC» came back «Head of Pôle HVAC»,
  // «Responsable de Pôle Automatisme» «Head of Pôle Automatisme»: Firefox kept the word and the French after it, in 36
  // of 61 titles on 8 November 2026). Not Pôle emploi, a pôle de compétitivité, the Earth's poles, nor a name's («S.M.POLE»).
  if (s === "fr")
    t = t.replace(
      /(?<![\p{L}.])p[ôo]le(?![\p{L}])(?!\s+(?:emploi|nord|sud|de\s+comp[ée]titivit))/giu,
      (m) =>
        m === m.toUpperCase()
          ? "DÉPARTEMENT"
          : m[0] === "P"
            ? "Département"
            : "département",
    );
  // An Italian «trasfertista» travels to the clients' sites: «itinerante», which Firefox knows and puts before the job
  // («MANUTENTORE TRASFERTISTA» came back «Transferred Electromechanical Maintenance», «Tecnico trasfertista» «Technical
  // Transferrer»). The English «itinerant» written in instead came back after the job («Fitter – itinerant») or lost
  // words; the few «Itinerante» Firefox leaves are corrected after (corrections.mjs).
  if (s === "it")
    t = t.replace(/(?<![\p{L}])trasfertist([ai])(?![\p{L}])/giu, (m, n) =>
      m === m.toUpperCase()
        ? "ITINERANT" + (/a/i.test(n) ? "E" : "I")
        : (m[0] === "T" ? "I" : "i") + "tinerant" + (/a/i.test(n) ? "e" : "i"),
    );
  // Swedish «Ledig tjänst -» (a vacancy) opening the title and «sökes» (wanted) after the job say nothing a visitor needs,
  // and Firefox misread them («Available service - Electrician», «PLÅTSLAGARE SÖKES TILL SWEDALA TAK» came back «Sheet
  // Metal Worker – Soveremed For Sweda Tak», «Byggsmeder sökes till kundföretag» «Byggsmeder is looking for customer
  // companies»).
  if (s === "sv")
    t = t
      .replace(/^lediga?\s+(?:tjänst(?:er)?|jobb)\s*[-–:|]\s*/iu, "")
      .replace(/\s*(?<![\p{L}])sökes(?![\p{L}])(?:\s*!)?/giu, "");
  // Dutch "meewerkend" (working alongside his team) says nothing a visitor needs ("Jefe de obra – Electricidad- cooperando"),
  // but before the jobs the table holds with it ("meewerkend voorman": TRA-15).
  if (s === "nl")
    t = t
      .replace(
        /\s*[-–]?\s*\(?(?<![\p{L}])meewerkende?\)?(?![\p{L}])(?!\s+(?:voorman|werfleider|uitvoerder|ploegbaas|teamleader|teamleider|chef)(?![\p{L}]))/giu,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
  // Dutch "bruggen en sluizen" in small letters are bridges and canal locks, not door locks ("puentes y cerraduras",
  // "ponts i panys"); with capitals Firefox reads them right ("Puentes y Esclusas").
  if (s === "nl")
    t = t.replace(
      /(?<![\p{L}])bruggen\s+en\s+sluizen(?![\p{L}])/gu,
      "bridges and canal locks",
    );
  // The Hungarian "szerkezet-szerelő" installs structures ("Structure mechanic").
  if (s === "hu")
    t = t.replace(
      /(?<![\p{L}])([Ss])zerkezet-?szerelő(k?)(?![\p{L}])/gu,
      (m, c, pl) =>
        (c === "S" ? "S" : "s") + "tructure installer" + (pl ? "s" : ""),
    );
  // "Roh-" before "und" is "Rohbau", the shell ("Roh- und Schlüsselfertigbau" came back "construcción cruda").
  if (s === "de")
    t = t.replace(
      /(?<![\p{L}])Roh-(?=\s*(?:,|und\s|&|oder\s|bzw))/gu,
      "Rohbau",
    );
  // A field's letters before the job go after it, where the table reads them ("SHK Anlagenmechaniker" came back
  // "Plumbing, heating and air conditioning Plant mechanic"); EMSR is the E&I it stands for.
  if (s === "de")
    t = t
      .replace(
        /^(SHK|HKLS|HLSK|HLS|TGA|MSR)\s+(\p{Lu}[\p{L}-]*)(?=\s|$)/u,
        "$2 $1",
      )
      .replace(/(?<![\p{L}])EMSR(?![\p{L}])/gu, "E&I");
  // French "dépanneur" beside another trade is that trade's repair work, said after its part ("Technicien·ne
  // dépanneur·se chauffagiste" came back "Technicien service and repair technician heating engineer"), in a word
  // Firefox knows: "(dépannage)" came back "(treaming)", "(solucionamiento de problemas)".
  if (
    s === "fr" &&
    /(?<![\p{L}])d[ée]panneu(?:r|se)s?(?![\p{L}])/iu.test(t) &&
    TRADE_FR.test(t.replace(/d[ée]panneu(?:r|se)s?/giu, ""))
  ) {
    t = t
      .replace(
        /\s*-\s*d[ée]panneu(?:r|se)s?(?![\p{L}])|(?<![\p{L}])d[ée]panneu(?:r|se)s?(?:\s*-\s*|\s+|$)/iu,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
    t = t.replace(
      /^(.+?)(\s+[-–|]\s|\s*\/|\s*\(|$)/u,
      (m, part, sep) => part.trim() + " (réparations)" + sep,
    );
  }
  // French titles cut at 65 characters by their source: the last word completed from the language's titles, or the
  // piece left dropped ("… de maintena" → "… de maintenance", "… électricité-él" → "… électricité").
  if (s === "fr" && [...String(title)].length === 65) t = completeCut(t, "fr");
  // The Spanish one too, with its "de" ("Responsable Mantenimiento" came back "Responsible for Maintenance").
  if (s === "es")
    t = t.replace(
      /(^|[/|–-]\s*)Responsable\s+(?!(?:(?:de|del)\s+(?:(?:la|las|los|el)\s+)?)?(?:en|proyectos?)\s)(?:(?:de|del)\s+(?:(?:la|las|los|el)\s+)?)?(?!de\s|del\s|(?:técnic[oa]s?|eléctric[oa]s?|mecánic[oa]s?|comercial(?:es)?|administrativ[oa]s?|financier[oa]s?|informátic[oa]s?|jurídic[oa]s?|industrial(?:es)?|regional(?:es)?|nacional(?:es)?|adjunt[oa]s?|general(?:es)?|operativ[oa]s?)(?![\p{L}]))(?=\p{L})/giu,
      "$1Head of ",
    );
  if (s === "nl")
    t = t.replace(/(^|[/|–-]\s*)Verantwoordelijke\s+(?=\p{L})/gu, "$1Head of ");
  // "Cnc" and "cnc" read as a word ("Cnc turner" → Spanish "Convulsor"): the acronym in capitals.
  t = t.replace(/\bcnc\b/gi, "CNC");
  // German "am Standort X" came back "at the X site", a site the second leg reads as a dig ("jaciment").
  if (s === "de") t = t.replace(/\bam\s+Standort\s+(?=\p{Lu})/gu, "in ");
  // "Raum Stuttgart" (the Stuttgart area) came back "Área ELT Karlsruhe", "Bouwoppervlakte Köln/Bonn": "in Stuttgart";
  // after "für den" or "aus dem" the preposition stays ("für den in Kassel" came back "for the in Kassel").
  if (s === "de")
    t = t.replace(
      /(?:\b(für|aus)\s+(?:den|dem)\s+|\bim\s+)?\b(?:Großraum|Grossraum|Raum)\s+(?=\p{Lu})/gu,
      (m, p) => (p ? p + " " : "in "),
    );
  // Spanish shorthands Firefox leaves or misreads ("Tco/a electromecánico" → "Electromechanical Tco", "Mtto.").
  if (s === "es")
    t = t
      .replace(/\bTco\b\.?/g, "Técnico")
      .replace(/\bMtto\b\.?/g, "Mantenimiento");
  // The morning, afternoon or night shift ("Jornada de mañana" came back "Tomorrow's day", "Jornada de matí" "Morning day").
  if (s === "es")
    t = t.replace(
      /(?<![\p{L}])([Jj])ornada\s+de\s+(mañana|tarde|noche)(?![\p{L}])/gu,
      (m, j, w) => (j === "J" ? "Turno" : "turno") + " de " + w,
    );
  if (s === "ca")
    t = t.replace(
      /(?<![\p{L}])([Jj])ornada\s+de\s+(matí|tarda|nit)(?![\p{L}])/gu,
      (m, j, w) => (j === "J" ? "Torn" : "torn") + " de " + w,
    );
  // Half-time as the words Firefox knows say it («media jornada» came back "half day", «mig dia» in Catalan).
  if (s === "es")
    t = t.replace(
      /(?<![\p{L}])(?:[Aa]\s+)?([Mm])edia\s+[Jj]ornada(?![\p{L}])/gu,
      (m, c) => (c === "M" ? "A" : "a") + " tiempo parcial",
    );
  if (s === "ca")
    t = t.replace(
      /(?<![\p{L}])(?:[Aa]\s+)?([Mm])itja\s+[Jj]ornada(?![\p{L}])/gu,
      (m, c) => (c === "M" ? "A" : "a") + " temps parcial",
    );
  // The offers of a professional body's «bolsa de empleo» come from its job board, not from a pool of hires («Ofertas de
  // la bolsa de empleo del Colegio de Ingenieros Agrónomos» came back "Job Board Offers from the College…" and would
  // come back "Job pool offers"): the board's word, which Firefox reads as before.
  if (s === "es")
    t = t.replace(
      /(?<![\p{L}])(ofertas?)\s+(?:de|desde)\s+la\s+bolsa\s+de\s+(?:empleo|trabajo)(?=\s+de(?:l|\s+la|\s+los)?\s)/giu,
      "$1 del tablón de empleo",
    );
  // Two jobs glued by a hyphen, one of them a trade of the table, apart as two («Frigorista-Técnico» came back
  // "Refrigerator-Technician", «Electricista-fontanero-frigorista» "Electrician-phontan-frigero"); not a word that only
  // opens a compound («Electro-mecánico»).
  if (s === "es" || s === "ca") t = apartGlued(t, s);
  // A leading article of both genders ("Un/una Electricista Junior" → "Junior An Electrician").
  if (s === "es" || s === "ca")
    t = t.replace(/^(?:un|una|uno)(?:\s*\/\s*(?:un|una|a))?\s+(?=\p{L})/iu, "");
  // German "o." and "u." between words are "oder" and "und" ("Techniker o. Meister" → "O. Master craftsman").
  if (s === "de")
    t = t
      .replace(/(\s)o\.(?=\s+\p{L})/gu, "$1oder")
      .replace(/(\s)u\.(?=\s+\p{L})/gu, "$1und");
  // "WIG" is TIG welding; Firefox says so only when it is glued to "Schweißer".
  if (s === "de") t = t.replace(/\bWIG\b/g, "TIG");
  // "im Außendienst" with words after it reads as a field ("in the Berlin-Brandenburg field"): put in brackets.
  if (s === "de")
    t = t.replace(
      /\bim\s+Außendienst(?=\s+(?!(?:in|im|für|bei|mit|zur|zum|als|und|oder|der|die|das|von|ab|an)\s)\p{L})/gu,
      "(Außendienst)",
    );
  // "Wir suchen", "Se necesitan", "Nous recherchons" opening a title say nothing on a job site, and Firefox
  // splits them off ("Electrical technicians – are needed").
  t = t.replace(/(:\s+)se\s+necesitan?\s+(?=\S)/giu, "$1");
  t = t.replace(
    /^(?:wir\s+suchen(?:\s+ab\s+sofort)?(?:\s+(?:eine?n?|zur\s+verstärkung|(?:dich|sie|euch)(?:\s+als)?))?|wij\s+zoeken(?:\s+een)?|gezocht|nous\s+recherchons(?:\s+une?)?|on\s+recherche(?:\s+une?)?|se\s+(?:necesitan?|buscan?|precisan?|requieren?)|buscamos|es\s+(?:necessiten?|busquen?|busca))\s*[:!–-]?\s+(?=\S)/iu,
    "",
  );
  // The occupation lists of the Spanish employment service ("Instaladores de tuberías, en general").
  if (s === "es") t = t.replace(/,?\s+en\s+general\b/giu, "");
  // A span of grades ("Oficial 1ª-2ª") is no grade of its own: "Oficial" alone, a level.
  if (s === "es" || s === "ca")
    t = t.replace(
      /\b(oficial)\s+(?:de\s+)?[123]\.?[ªa]?\.?\s*(?:[-/]|y|o|i)\s*[123]\.?[ªa]?\.?(?:\s*(?:[-/]|y|o|i)\s*[123]\.?[ªa]?\.?)?(?![\p{L}\d])/giu,
      "$1",
    );
  // A public post ("Una plaza de Topógrafo") is the job: "plaza" is read as a town square.
  if (s === "es")
    t = t
      .replace(
        /(^|\s)(?:(?:[Uu]na|[Dd]os|[Tt]res|\d+)\s+)?plazas?\s+de\s+(?=\p{Lu})/gu,
        "$1",
      )
      .replace(/^Plazas?\s+de\s+(?=\p{Lu})/u, "");
  // Levels taken out (LEVELS); those of the first part are said in front of the English.
  const taken = english ? { t, level: [] } : takeLevels(t, s),
    level = taken.level;
  t = taken.t;
  // "Technicien Expert" is an expert technician, with the field after a dash, once its levels are out ("Technicien Expert Après-Vente
  // Automobile" came back "Technician – Expert Automotive After-Sales"; "Technicien Expert Automobile" a damage
  // assessor, the table's "expert automobile").
  if (s === "fr")
    t = t.replace(
      /(?<![\p{L}])(Technicien(?:ne)?)\s+[Ee]xpert(e?)(?![\p{L}])(\s+(?!(?:en|de|du|des|d['’]|pour|à|au|aux|et|ou)(?![\p{L}]))(?=\p{L}))?/gu,
      (m, job, e, field) => job + " expert" + e + (field ? " – " : ""),
    );
  if (s === "fr")
    t = t.replace(
      FR_STACK_JOB,
      (m, job, stack) =>
        stack
          .replace(/\s+[-–]\s+/g, "/")
          .replace(/(?<![\p{L}])IA(?![\p{L}])/gu, "AI") +
        " " +
        FR_JOB_EN[job.toLowerCase()],
    );
  // "BE" after a job is the design office ("Technicien BE").
  if (s === "fr")
    t = t.replace(
      /((?:[Tt]echnicien(?:ne)?|[Dd]essinat(?:eur|rice)|[Ii]ngénieure?|[Pp]rojeteu(?:r|se)|[Rr]esponsable|[Cc]hargée?(?:\s+d['’]affaires)?)\s+)BE(?![\p{L}])/gu,
      "$1bureau d'études",
    );
  // German "Fr." is "für" ("Elektroniker Fr. Energie- und Gebäudetechnik", Catalan "Mf.").
  if (s === "de") t = t.replace(/(?<![\p{L}])Fr\.\s+(?=\p{L})/gu, "für ");
  // A code joined to a job word by a hyphen, the way Dutch and Scandinavian titles write it, apart from it
  // ("BI-specialist" came back "BI-especialista", "ERP-consultant" "ERP-consultor"; "BI specialist" "Especialista en BI").
  if (s === "en")
    t = t.replace(
      /(?<![\p{L}\d-])(\p{Lu}{2,5})-(?=(\p{L}+)(?![\p{L}-]))/gu,
      (m, code, w) => (JOB_EN.test(w) ? code + " " : m),
    );
  // English "Sr." and "Jr." written whole ("Sr. Software Engineer" came back "¿Sr. Ingeniero de Software").
  if (s === "en")
    t = t.replace(
      /(^|[\s/|–(-])(Sr|SR|Jr|JR)\.?(?=\s+[\p{Lu}\d])/gu,
      (m, b, w) => b + (/^s/i.test(w) ? "Senior" : "Junior"),
    );
  // Into Spanish, Catalan and French a leading "Junior" or "Senior" of the English goes after the job, as the
  // levels the first leg takes out ("Junior fitter – field service" came back "Junior montador – servicio de campo").
  const target = pair.split("-")[1];
  // "Medior" (Dutch for mid-level), "Middle" (mid-level, not "Middle Office") and "Founding" too: "Medior Java
  // Developer" came back "Medior Desarrollador Java", "Founding Engineer" "Fundación Ingeniero". "(Senior)" in its
  // brackets (a senior post or not) went inside the job in French ("Ingénieur (Senior) Système de réseau").
  // "HVAC" opening the title goes after the job of its part, where the field is written ("HVAC Ervaren Service
  // Technician" came back "Climatización Experimentado técnico de servicio"): two words or more with capitals, up to
  // a separator or a preposition; not one word alone, the table's ("HVAC Engineer in Aston", "HVAC Technician").
  if (s === "en" && /^(?:es|ca|fr)$/.test(target))
    t = t.replace(
      /^HVAC\s+((?:\p{Lu}[\p{L}-]*\s+)+\p{Lu}[\p{L}-]*)(?=\s*$|\s+[–|-]\s|\s*[(,]|\s+(?:in|at|for|with|on|of|to)\s)/u,
      (m, rest) => rest + " HVAC",
    );
  // "Principal", "Intermediate" and a travelling "Mobile" are levels too (s128): "Arquitecto Principal de Software",
  // "Ingeniero de tela móvil" came back with them read as words of the job.
  const opening =
    s === "en" && /^(?:es|ca|fr|pl|it)$/.test(target) && t.match(OPENING_RE);
  // Two levels for one post ("Senior/Principal") are said together after the job ("sénior/principal").
  const levelOf = (w: string) =>
    w
      .split(/\s*\/\s*/)
      .map(
        (x: string) =>
          OPENING[
            x
              .toLowerCase()
              .replace(/^multi[\s-]?skilled$/, "multi-skilled")
              .replace(/^foot[\s-]mobile$/, "mobile")
          ],
      )
      .join("/");
  // Only a level the language has a word for, the others left to Firefox ("Associate Consultant" came back
  // "Consulente" in Italian, "Assistant Site Manager" comes back "Asystent kierownika budowy" in Polish). Not
  // "Experienced" into French: Firefox makes "expérimenté" agree with the job ("Ingénieurs expérimentés"); said
  // after, it would not.
  const canSay = (lv: string) =>
    LEVEL_SAY[target][lv] ||
    (lv.includes("/") &&
      lv
        .split("/")
        .every((p: string) => LEVEL_SAY[target][p]?.[1] === "after"));
  const sayable = (m: RegExpMatchArray | null | false): m is RegExpMatchArray =>
    Boolean(m) &&
    m !== null &&
    m !== false &&
    !(target === "fr" && /^experienced$/i.test(m[1] ?? "")) &&
    Boolean(canSay(levelOf(m[1] ?? "")));
  if (sayable(opening)) {
    t = t.slice(opening[0].length);
    said = [said, levelOf(opening[1] ?? "")].filter(Boolean).join(" ");
    // A second level right after the first ("Senior Chartered Building Surveyor", "Senior Principal Civil Engineer").
    const second = t.match(OPENING_RE);
    if (sayable(second)) {
      t = t.slice(second[0].length);
      said = [said, levelOf(second[1] ?? "")].join(" ");
    }
  }
  // "Backend", "Frontend" and "Full Stack" after the job, where Spanish and Catalan say them, before the tech names
  // move ("Backend .NET Developer" → "Developer .NET Backend"). Not into French, which puts them there itself: moved,
  // Firefox garbled the job or the word ("AI Engineer Full Stack" came back "Ineurate d'IA", "Fullstakk").
  if (s === "en" && /^(?:es|ca|pl|it)$/.test(target))
    t = t.replace(
      STACK_FIRST,
      (m, stack, between, job) => between + job + " " + stack,
    );
  // The tech name after the job, where Firefox does not move it ("Developer C#" → "Desarrollador C#").
  if (s === "en" && /^(?:es|ca|fr|pl|it)$/.test(target))
    t = t.replace(TECH_FIRST, (m, b, name, job) => b + job + " " + name);
  // French "Un(e)" opening the title is the article (Spanish "ONU(E)").
  if (s === "fr") t = t.replace(/^un(?:e|\s*\(e\))?\s+(?=\p{L})/iu, "");
  if (s === "fr")
    t = t.replace(
      /\bcharge(e?) d['’]/giu,
      (m, e) => (m[0] === "C" ? "C" : "c") + "hargé" + e + " d'",
    );
  if (s === "de")
    t = t.replace(
      /\s*[–|-]?\s*jetzt\s+(?:hier\s+|online\s+)?bewerben\s*!?\s*$/iu,
      "",
    );
  if (s === "de")
    t = t.replace(
      /(\d)[- ]?Schicht(?:-?(?:betrieb|system|modell))?\b/giu,
      "$1 shifts",
    );
  // Sharing its brackets, the rest keeps them ("(all genders, full-/part-time)").
  t = t
    .replace(/\(\s*all[ -]genders?\s*[,;|]\s*/giu, "(")
    .replace(/,?\s*\(?\ball[ -]genders?\)?/giu, "");
  // "Ploegenwerk" is shift work, not ploughing ("Plowwork" → "Llauradora").
  if (s === "nl")
    t = t.replace(
      /(?<!\d[- ]?)\bploegen(?:werk|dienst|systeem)\b/giu,
      "shift work",
    );
  if (s === "nl")
    t = t
      .replace(/(\d)[- ]?ploegen(?:dienst|systeem)?\b/giu, "$1 shifts")
      .replace(/\bploegen\b/giu, "shifts")
      .replace(
        /\b(vijf|vier|drie|twee)ploegendienst\b/giu,
        (m: string, n: string) =>
          (({ vijf: 5, vier: 4, drie: 3, twee: 2 }) as Record<string, number>)[
            n.toLowerCase()
          ] + " shifts",
      );
  // "Werkvoorbereider W" came back "Work planner – W".
  if (s === "nl")
    t = t.replace(
      INSTALL_LETTERS,
      (m, job, x) => job + installsOf(x) + " installaties",
    );
  // "Infra" is infrastructure, which Firefox kept as it is ("Werkvoorbereider Ondergrondse Infra" came back
  // "Planificador de trabajo – Underground Infra").
  if (INFRA[s])
    t = t.replace(
      /(?<![\p{L}])([Ii])nfra(?![\p{L}])/gu,
      (m: string, i: string) => i + INFRA[s],
    );
  // Not «Oferta de Empleo Público»: the public body's own call, which the title names (TRA-15).
  t = t.replace(
    /^(?:(?:vacature|vacatures|vacancy|stellenangebot|stellenanzeige|stellenausschreibung|jobausschreibung|stelle|jobs|vacante|ofertas? de (?:empleo|trabajo)(?:\s+(?:para|de|como))?|offres?\s+(?:d['’]\s*)?emplois?(?:\s+(?:de|pour))?|emplois?)\s*[:|–-]?\s+|(?:job|oferta)\s*[:|–-]\s*)(?=\S)(?!p[uú]blic[ao](?![\p{L}]))/iu,
    "",
  );
  // French "Chargé de" written without its accent ("CHARGE(E) DE PROJETS", "Charge de Conformite") is read as a
  // load; "5 axes" is a five-axis machine.
  if (s === "fr")
    t = t
      .replace(
        /(^|[/|–-]\s*)(charg)e(e?)(?=\s+(?:de|d['’]|des|du)\s)/giu,
        (m, a, w, e) => a + w + (w === w.toUpperCase() ? "É" : "é") + e,
      )
      .replace(/\b(\d)\s*axes\b/giu, "$1-axis");
  // Flemish "bedrijfswagen" after "met", "+" or a separator is the company vehicle offered ("Koeltechnieker €25 |
  // Bedrijfswagen" came back "Commercial vehicle"); a "bedrijfswagenmonteur" repairs commercial vehicles.
  // Dutch "cv" alone is central heating ("Monteur cv en sanitair" came back "resume and plumbing").
  if (s === "nl")
    t = t.replace(/(?<![\p{L}])cv(?![\p{L}-])/giu, "centrale verwarming");
  // Belgian "freezer" next to a turner or CNC is "frezer" misspelt, the milling operator ("CNC Draaier/freezer" came
  // back "Tornero CNC/congelador").
  if (s === "nl" && /draaier|cnc/iu.test(t))
    t = t.replace(/(?<![\p{L}])([Ff])reezer(?![\p{L}])/gu, "$1rezer");
  // Dutch "It" opening a title is IT, read as the pronoun ("It support medewerker" came back "Es técnico de soporte").
  if (s === "nl") t = t.replace(/^It(?=[\s-])/u, "IT");
  if (s === "nl")
    t = t.replace(
      /(\bmet\s+|\bincl\.?\s+|[|+,–-]\s*|\sl\s+)(bedrijfswagen)(?![\p{L}])/giu,
      (m, a, w) => a + (w[0] === "B" ? "Company vehicle" : "company vehicle"),
    );
  // French "IDF" is Île-de-France ("FDI"); German "It-" is IT (read as the pronoun), "VZ" and "TZ" are full and
  // part time, "Stv." deputy.
  if (s === "fr") t = t.replace(/\bIDF\b/g, "Île-de-France");
  if (s === "de")
    t = t.replace(/(?<![\p{L}])Stv\.\s*(?=\p{L})/gu, "Stellvertretender ");
  if (s === "de")
    t = t
      .replace(/\bIt-(?=\p{L})/gu, "IT-")
      .replace(/(?:\s+in)?\s+VZ\b/g, " Vollzeit")
      .replace(/(?:\s+in)?\s+TZ\b/g, " Teilzeit");
  // French "CN" beside machining is the CNC.
  if (
    s === "fr" &&
    /usin|tourn|frais|régl|regl|programm|opérat|operat|machine|centre|pli(?:eur|euse|age)/i.test(
      t,
    )
  )
    t = t.replace(/\bCN\b/g, "CNC");
  // German "Zerspannung" is a misspelling of "Zerspanung" (machining): "Destroying Technician".
  if (s === "de") t = t.replace(/([Zz])erspannung/g, "$1erspanung");
  // "deutschlandweit" came back "Germany-wide" ("Alemania-wide"); "in ganz Deutschland" comes back "throughout
  // Germany". The board's name some Swiss offers carry at the end ("- Architektur Stellen") is no part of the job.
  if (s === "de")
    t = t
      .replace(
        /(?<![\p{L}])[Dd]eutschlandweit(?![\p{L}])/gu,
        "in ganz Deutschland",
      )
      .replace(/\s+[-–|]\s+Architektur Stellen$/u, "");
  // "Linux-Administrator", "System-Engineer" came back as written ("Linux-Administrador", "Sistema-Administrador"):
  // the hyphen out. Swiss "Aussendienst" ("Self Service", "foreship") as "Außendienst", which the steps for it read, and the
  // Swiss welding words with their "ß" ("Schweissfachmann" came back "Sweat expert", "Schweisszertifikat" "sweat certificate");
  // not the welder, whom the table reads in both spellings and Firefox then read more evenly.
  // "Gebiet X" straight after a job ("als Servicetechniker Gebiet Oberbayern" → "como zona de técnico de servicio")
  // as "im Gebiet X".
  // "befristet bis 30.06.2029" came back "dead-end until", "befristet auf 2 Jahre" "limited to 2 years": written
  // "befristeter Vertrag" (fixed-term contract: "contrato de duración determinada", "contrat à durée déterminée").
  if (s === "de")
    t = t
      .replace(
        /(?<![\p{L}])befristet\s+(?:auf|für)\s+(?=\d)/giu,
        (m, at) => (at ? "b" : "B") + "efristeter Vertrag für ",
      )
      .replace(
        /(?<![\p{L}])befristet\s+bis\s+/giu,
        (m, at) => (at ? "b" : "B") + "efristeter Vertrag bis ",
      );
  // A German word left in two before "…bau" written whole ("Hoch- und Tiefbau" → "Hochbau und Tiefbau"): "Hoch-"
  // and "Erd-" alone came back "High", "Earth" once the table wrote "civil works" for "Tiefbau".
  // Only for the halves that alone say something else (high, deep, earth): Firefox reads the rest well left in two,
  // the table's name in the second half too ("Stahl- und Metallbau" came back "Steel Construction and Metal
  // construction" written whole, "steel and metal construction" as it was).
  if (s === "de")
    t = t.replace(
      /(?<![\p{L}])(Hoch|Tief|Erd)-(\s*(?:und|oder|&|\/|bzw\.?|sowie)\s*)(\p{Lu}\p{Ll}*bau)(?![\p{L}])/gu,
      (m, a, sep, b) => a + "bau" + sep + b,
    );
  // "Projektleitung", "Bauleitung" naming the post (at the start, after a separator or "als") came back as the work
  // ("Gestión de proyectos Ingeniería eléctrica", "como gestión de proyectos"): written as the one who does it.
  // After a level too ("Senior Projektleitung Architektur" came back "Arquitectura de Gestión de Proyectos sénior").
  if (s === "de")
    t = t.replace(
      /(^|[/|–-]\s*|\bals\s+|\b(?:Senior|Junior|Lead)\s+)(?!Rohr|Wasser|Gas|Kabel|Strom|Fern)(\p{Lu}\p{Ll}+)leitung(?=$|[\s,/|(–-])/gu,
      "$1$2leiter",
    );
  if (s === "de")
    t = t
      .replace(HYPHEN_JOB, "$1 ")
      .replace(/([Aa])ussendienst/g, "$1ußendienst")
      .replace(
        /([Ss])chweiss(?!er(?:in|innen)?(?![\p{L}]))(?=\p{Ll})/gu,
        "$1chweiß",
      )
      .replace(/(?<![\p{L}])mind\.\s/gu, "mindestens ")
      .replace(/(?<![\p{L}])(\p{L}{3,})\s+Gebiet\s+(?=\p{L})/gu, (m, w) =>
        /^(?:das|dem|des|ins|vom|zum|zur|ganze[nms]?|gesamte[nms]?|unser(?:e[nms]?)?|ihr(?:e[nms]?)?)$/i.test(
          w,
        )
          ? m
          : w + " im Gebiet ",
      );
  // A title with every word's capital ("Elektroniker Als Prüftechniker Mit Entwicklungsperspektive") came back with
  // its little words untranslated, or every word in capitals ("As técnico de ensayos Con Desarrollo Prospecto",
  // "Técnico De Servicio Para Sistemas De Grúas"): those words written small, and the codes the capitals hid in
  // capitals ("Anlagenmechaniker Shk", "It-Systemadministrator").
  if (s === "de" && TITLE_DE.test(t))
    t = t
      .replace(new RegExp(TITLE_DE.source, "gu"), (w) => w.toLowerCase())
      .replace(
        /(?<![\p{L}])(?:Shk|It|Ai|Tga|Sps|Hlk|Hkls|Edv|Emsr|Msr|Lph|Sap)(?![\p{L}])/gu,
        (w) => w.toUpperCase(),
      );
  // "NL vereist", "Nederlands verplicht": the language the job asks for, as the second leg writes it ("NL required";
  // "Nederlands vereist" after a dash came back "English required"), after a dash unless a separator is there.
  if (s === "nl")
    t = t.replace(
      /\s*(?:[–-]\s+)?(?<![\p{L}])(?<!kennis\s)(NL|FR|EN|DE|Nederlands|Frans|Engels|Duits)[ -]+(?:vereist|verplicht)(?![\p{L}])/gu,
      (m: string, l: string, at: number, all: string) =>
        (/\($/u.test(all.slice(0, at))
          ? ""
          : /[|–,-]$/u.test(all.slice(0, at).trimEnd())
            ? " "
            : " – ") +
        (
          {
            NL: "Dutch",
            Nederlands: "Dutch",
            FR: "French",
            Frans: "French",
            EN: "English",
            Engels: "English",
            DE: "German",
            Duits: "German",
          } as Record<string, string>
        )[l] +
        "-speaking",
    );
  // "Bauleitender Monteur" is a fitter who leads the site as well ("Construction manager fitter", "Administrador de
  // construcción instalador"): the job, then "und Bauleiter", the site manager of the table, and a dash before the
  // field that follows ("Fitter and site manager electrical engineering").
  if (s === "de")
    t = t.replace(
      /\(?(?<![\p{L}-])[Bb]auleitende[rn]?\)?\s+(\p{Lu}[\p{L}-]*)(\s+(?=\p{Lu}))?/gu,
      (m, job, field) => job + " und Bauleiter" + (field ? " – " : ""),
    );
  // "Lehrabgänger Elektroinstallateur": the job first, the apprenticeship graduate after it, in small letters as
  // brackets take them ("Educational leaver electrician").
  if (s === "de")
    t = t.replace(/^Lehrabg[äa]nger\s+(\p{Lu}.*)$/u, "$1 (lehrabgänger)");
  // A team, tech or product lead and the field after it, apart: "Team Lead – Java Development" ("Jefe de equipo Java
  // Desarrollo", "Infraestructuras de líder técnico" without the dash).
  if (s === "en")
    t = t.replace(
      /(^|[/|–]\s*|\s-\s)((?:(?:senior|sr\.?)\s+)?(?:team|tech|technical|product)\s+lead)\s+(?!(?:of|for|in|at|with|and|or|to|the|a|an)\b)(?=\p{L})/giu,
      (m, b, job) => b + job + " – ",
    );
  if (s === "en")
    t = t.replace(SPEAKING, (m, langs, S) =>
      langs.replace(LANGUAGE, (l: string) => l + "-" + S + "peaking"),
    );
  // "Jobs" or "Vacancies" after the job is the advert's word ("MOT Tester Jobs | Flexible MOT Contracts" came back
  // "Inspector d'ITV Jobs" in Catalan).
  // Only after a word naming a person: "Software Jobs" are what is looked for (held5, s130).
  if (s === "en")
    t = t.replace(
      /(?<![\p{L}])(\p{L}+)\s+(?:Jobs|Vacancies)(?=\s*(?:$|[|–(]|\s-\s))/gu,
      (m, w) => (PERSON.test(w) ? w : m),
    );
  // A slash right after a job word with spaces, so Firefox does not read that job as the field of the next
  // ("Electrician/Mechatronics technician" came back "Técnico de Electricista/Mecatrónica"). Not between a word and
  // itself, two genders the first leg gave back alike ("Turner/turner" came back "Tornero / tourner").
  if (s === "en" && /^(?:es|ca|fr)$/.test(target))
    t = t.replace(/(?<![\p{L}])(\p{L}+)\/(?=(\p{L}+))/gu, (m, a, b) =>
      JOB_EN.test(a) && a.toLowerCase() !== b.toLowerCase() ? a + " / " : m,
    );
  // The typo "Principle" (or "Prinicple") for Principal ("Senior/Principle" came back as it was), "Senior / Principal"
  // written together, "Multi Skilled" with its hyphen ("Fontanero Multi-Habilidad").
  if (s === "en")
    t = t
      .replace(/(?<![\p{L}])Prin(?:ciple|icple)(?![\p{L}])/gu, "Principal")
      .replace(
        /^(Senior|Junior|Intermediate|Principal|Lead|Associate)\s*\/\s*(Senior|Principal|Lead|Associate)(?=\s)/u,
        "$1/$2",
      )
      .replace(
        /(?<![\p{L}])Multi[\s-]?[Ss]killed(?![\p{L}])/gu,
        "Multi-skilled",
      );
  // "Undergraduate X": a student's internship in that job ("Ingeniero Eléctrico De Pregrado").
  if (s === "en")
    t = t.replace(
      /^Undergraduate\s+(\p{L}[^–|(,]*?)(?=\s+[–|-]\s|\s*[|(,]|$)/iu,
      (m, job) => job + " – Internship",
    );
  // A "Regional Patch" is the area worked ("Parche Comercial / Regional"); "Senior to Associate" a range of levels
  // ("Asociar a los urbanistas principal"); "UK Wide" the whole country ("Regne Unit d'ample").
  if (s === "en")
    t = t
      .replace(
        /(?<![\p{L}])(Regional|Local|Commercial|National)\s+Patch(?![\p{L}])/gu,
        "$1 Area",
      )
      .replace(
        /^(Junior|Intermediate|Senior|Principal|Associate|Lead)\s+[Tt]o\s+(Senior|Principal|Associate|Lead|Director)(?=\s)/u,
        "$1/$2",
      )
      .replace(/(?<![\p{L}])UK[\s-]Wide(?![\p{L}])/gu, "nationwide");
  // "Shift" in the singular is "cambio" into Spanish ("Grinder Setter Operator NIGHT Shift" came back "Cambiador de
  // noche del operador"; the plural comes back "turnos"): a night, day, late or early shift ending a part is said in
  // brackets and plural, after a word of its part ("Gear cutter - Day shift" came back "- (turnos de día) -"), not
  // after one saying which ("permanente (turno de noche)"); "in day shift" goes with it ("Mecànic in (torn de dia)"). "4 on 4 off" is four working days and four off ("4 en 4 de descuento"); "Fixed Term" a
  // temporary contract ("Término fijo"). The British "Static" engineer, based at one site, and "Foot Mobile" go
  // ("Estática", "de pies"), as "Undergraduate" before a placement ("Prácticas de pregrado"). "Rail" ending a title after
  // the job or a slash is the railway, as when it stands alone ("Raíl de Ingeniero Civil principal").
  if (s === "en")
    t = t
      .replace(
        /(?<=[\p{L}\d)])\s+(?:(?:on|in|On|In)\s+)?(night|day|late|early|NIGHT|DAY|LATE|EARLY|Night|Day|Late|Early)\s+[Ss](?:hifts?|HIFTS?)(?=\s*(?:$|[–|,)/-]))/gu,
        (m, w, at, all) =>
          /(?<![\p{L}])(?:permanent|fixed|steady|regular|rotating|alternating|continuous|and|or|of|for|with|to|the)$/iu.test(
            all.slice(0, at),
          )
            ? m
            : ` (${w.toLowerCase()} shifts)`,
      )
      .replace(
        /(?<![\p{L}\d])(\d)\s*(?:on|ON)\s*[,/&-]?\s*(\d)\s*(?:off|OFF)(?![\p{L}])/gu,
        "$1 working days, $2 days off",
      )
      .replace(
        /(?<![\p{L}])[Ff]ixed[\s-][Tt]erm(?:\s+[Cc]ontract)?(?![\p{L}])/gu,
        "temporary contract",
      )
      .replace(
        /(?<![\p{L}])Static\s+(?=(?:[\p{L}&]+\s+){0,3}?(?:Engineers?|Technicians?|Electricians?|Fitters?)(?![\p{L}]))/gu,
        "",
      )
      .replace(/(?<![\p{L}])Foot[\s-][Mm]obile(?![\p{L}])/gu, "Mobile")
      .replace(
        /(?<![\p{L}])Undergraduate\s+(?=(?:Placements?|Internships?)(?![\p{L}]))/gu,
        "",
      )
      .replace(/(\p{L})\s+Rail$/u, "$1 – Rail")
      .replace(/\/\s*Rail$/u, "/Railway sector")
      // A security clearance opening the title goes after the job, in brackets ("SC Cleared Network Engineer" came back
      // "Ingeniero de redes de con habilitación de seguridad SC").
      .replace(
        /^((?:SC|DV|NPPV\d?|CTC|BPSS)(?:\s*\/\s*(?:SC|DV))?)\s+[Cc]leared\s+(\p{L}.*)$/u,
        "$2 ($1 cleared)",
      );
  // "Rail" alone as a part is the railway ("Civil Engineering (Rail)" came back "(Raíl)"); "Install" as a part or before
  // the job is the installation ("Técnico de gas – Instalar"); the typo "Consulant"; "All grades" are all levels
  // ("Todos los grados"); "On-site" before a tradesman says nothing his trade does not ("On-Site Plumber" came back
  // "Plomero de presencial").
  if (s === "en")
    t = t.replace(
      /^On[- ]?[Ss]ite\s+(?=(?:Plumbers?|Electricians?|Fitters?|Welders?|Mechanics?|Joiners?|Carpenters?|Painters?|Decorators?|Labourers?|Operatives?|Bricklayers?|Plasterers?|Roofers?|Scaffolders?|Glaziers?)(?![\p{L}]))/u,
      "",
    );
  if (s === "en")
    t = t
      .replace(
        /(\(\s*|[–|-]\s+|^)Rail(?:ways?)?(?=\s*(?:\)|$|[–|,/-]))/gu,
        "$1Railway sector",
      )
      .replace(
        /(?<![\p{L}])Install(?=\s+(?:Engineers?|Technicians?|Fitters?|Electricians?|Operatives?|Supervisors?|Managers?)(?![\p{L}])|\s*(?:$|[)–|,/-]))/gu,
        "Installation",
      )
      .replace(/(?<![\p{L}])Consulant(s?)(?![\p{L}])/gu, "Consultant$1")
      .replace(/(?<![\p{L}])([Aa]ll)\s+[Gg]rades(?![\p{L}])/gu, "$1 levels")
      .replace(
        /(?<![\p{L}])[Tt]echnical\s+(?=[Ee]stimators?(?![\p{L}]))/gu,
        "",
      );
  // A British "Year Out" or "Year in Industry" opening the title is a student's placement year, an internship in
  // the job ("Year Out Surveyor" came back "Topógrafo – Año Fuera").
  if (s === "en")
    t = t.replace(
      /^Year[\s-]+(?:Out|in\s+Industry)\s+(\p{L}[^–|(,]*?)(?=\s+[–|-]\s|\s*[|(,]|$)/iu,
      (m, job) => job + " – Internship",
    );
  // The RIBA part an architectural assistant has passed goes after the job ("Part 2 Architectural Assistant" came
  // back "Parte 2 Asistente de arquitectura").
  if (s === "en")
    t = t.replace(
      /^Part\s+([123])\s+(Architect(?:ural)?(?![\p{L}])[^–|(,]*?)(?=\s+[–|-]\s|\s*[|(,]|$)/iu,
      (m, n, job) => job + " (RIBA Part " + n + ")",
    );
  // "Nightshift" in two words, which Firefox translates ("(Nightshift)" came back as it was in Catalan).
  if (s === "en")
    t = t.replace(
      /(?<![\p{L}])(Night|Day)shift(s?)(?![\p{L}])/giu,
      (m, w, pl) => w + " shift" + pl,
    );
  // The British work "placement" is an internship ("Cyber Security Placement Programme" came back "Programa de
  // colocación de ciberseguridad"); not "direct placement", the recruiting.
  if (s === "en")
    t = t.replace(
      /(?<![\p{L}])(?<!direct\s)placement(?=\s+(?:programmes?|programs?|students?|years?|schemes?)(?![\p{L}])|\s*$|\s*[-–(|,])/giu,
      (m) => (m[0] === "P" ? "Internship" : "internship"),
    );
  // The German "Home Office" of a title left in English, in brackets or after a share of time, is remote work, not
  // the British ministry ("Java (Home Office)" came back "(Oficina del hogar)").
  if (s === "en")
    t = t.replace(
      /(\d+\s?%\s+|\()Home[ -]?[Oo]ffice(?=\)|\s|$)/gu,
      "$1remote work",
    );
  // A field in front of "Traineeship" written after it, as English also says it ("Data Analytics Traineeship Den
  // Haag" came back "Análisis de datos Formación Den Haag", "Data Analytics Traineesh").
  if (s === "en")
    t = t.replace(
      /^((?:\p{Lu}[\p{L}&-]*\s+(?:&\s+)?){1,3})Traineeship(?![\p{L}])/u,
      (m, field) =>
        "Traineeship in " +
        field
          .trim()
          .replace(/(?<![\p{L}])\p{Lu}\p{Ll}+/gu, (w: string) =>
            w.toLowerCase(),
          ),
    );
  // German "Inhouse" as English writes it ("SAP Inhouse Consultant" came back "Consultor de la casa de SAP").
  if (s === "en")
    t = t.replace(
      /(?<![\p{L}-])(?:Inhouse|INHOUSE|inhouse)(?![\p{L}-])/gu,
      (m) => (m[0] === "i" ? "in-house" : "In-house"),
    );
  // A language alone in brackets is the one asked for too ("React (native) Developer (Dutch)").
  if (s === "en")
    t = t.replace(
      new RegExp("\\((" + LANGUAGE.source + ")\\)", "giu"),
      (m, l) => "(" + l + "-speaking)",
    );
  // An English title with every word's capital came back so ("Work In Sofia" → "Trabajo En Sofia"): its little words
  // written small, as German ones are (TITLE_DE).
  if (s === "en")
    t = t.replace(
      /(?<=\p{Ll} )(?:In|For|Of|And|With|At|To|The|On|From|By|Or|As)(?= \p{Lu})/gu,
      (w) => w.toLowerCase(),
    );
  // French and Dutch ones too ("Agent de Maintenance Des Bâtiments", "Service Technieker Met Buitenlandse Opdrachten").
  if (s === "fr")
    t = t.replace(
      /(?<=\p{Ll} )(?:Des|Du|De|Et|Pour|Avec|Aux|Au|Sur|Dans|En|Le|La|Les|Ou|Chez|Par)(?= \p{Lu})/gu,
      (w) => w.toLowerCase(),
    );
  // Not "Van", "De", "Het": a company's or a person's name ("bij Van Mossel" came back "en la camioneta Mossel").
  if (s === "nl")
    t = t.replace(
      /(?<=\p{Ll} )(?:Voor|Met|Bij|Naar|Uit|Een|En|In|Op|Of|Om|Te|Tot)(?= \p{Lu})/gu,
      (w) => w.toLowerCase(),
    );
  // "Agentic" came back made up ("Ingeniero Agnético", "Plataformas Agómicas"), and kept as a name it reads as a
  // noun ("Ingeniero de Agentic"): "Robotic" written in its place, which comes back clean with the same endings,
  // and turned back in after(). Not into German and Dutch, which join it to the next word ("Robotersysteme").
  const agentic =
    s === "en" &&
    /^(?:es|ca|fr)$/.test(target) &&
    !/robot/i.test(t) &&
    AGENTIC.test(t);
  if (agentic)
    t = t.replace(new RegExp(AGENTIC.source, "giu"), (m) =>
      m === m.toUpperCase() ? "ROBOTIC" : m[0] === "A" ? "Robotic" : "robotic",
    );
  // French "sur" before the offer's town means in it ("sur Massy" came back "on Massy").
  const place = String(city || "").trim();
  if (s === "fr" && place.length > 2)
    t = t.replace(
      new RegExp(
        "(^|\\s)sur\\s+(?=" +
          escape(place).replace(/[-\s]+/g, "[-\\s]+") +
          "(?![\\p{L}]))",
        "giu",
      ),
      "$1à ",
    );
  // A first capital, but not inside a name like "iOS" or "eBay" ("IOS developer").
  if (!/^\p{Ll}+\p{Lu}/u.test(t))
    t = t.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  // A prefix glued with an underscore apart from the job ("Geprom_Gestor" → "Geprom_Gester").
  t = t.replace(/(\p{L}|\d)_(?=\p{L})/gu, "$1 ");
  // Two versions when the title names its job and then its field: without and with a dash between
  // them (jobdash.mjs). After Firefox, the dash is kept only where the English left the job in front.
  const expect = new Set<string>(),
    spans: Span[] = [];
  let head = "";
  const withTrades = (x: string, note = false) => {
    const kept: string[] = [];
    for (const re of blockersFor(pair))
      x = x.replace(
        termWord(re),
        (m: string, b, term) => b + "" + (kept.push(term) - 1) + "",
      );
    // "Industrial mechanic" into Spanish, Catalan or French: the adjective after the trade written in, as those
    // languages say it ("Industrial mecánico" stayed so; "mecánico industrial").
    const adjAfter =
      s === "en" &&
      /industrial/i.test(x) &&
      !(TERMS[pair] || []).some(
        ([re]) => /^industrial/i.test(re) && termWord(re).test(x),
      ) &&
      { es: "industrial", ca: "industrial", fr: "industriel" }[
        pair.split("-")[1]
      ];
    if (adjAfter)
      for (const [re] of TERMS[pair] || [])
        x = x.replace(
          new RegExp(
            "(^|[^\\p{L}])industrial\\s+(" + re + ")(?![\\p{L}])",
            "giu",
          ),
          (m: string, b, term) =>
            b +
            (m[b.length] === "I"
              ? term[0].toUpperCase() + term.slice(1)
              : term) +
            " \u0002",
        );
    const writeIn = (y: string) => {
      for (const [re, tr] of TERMS[pair] || []) {
        if (/^site/.test(re) && NOT_A_BUILDING_SITE.test(y)) continue;
        y = y.replace(
          termWord(re),
          (m: string, b: string, term: string, at: number, all) => {
            if (note) {
              expect.add(tr);
              spans.push([term, capital(tr, term), tr]);
              if (
                at === 0 &&
                !b &&
                /^\s*(?:[–|/(-]|$)/u.test(all.slice(m.length))
              )
                head = capital(tr, term);
            }
            // A language's capital in English is its own ("Consultant SAP Payroll De habla alemana"): the name written in
            // takes one at the start of the title only.
            if (/-speaking$/i.test(term) && (at > 0 || b)) return b + tr;
            // A German noun's capital says nothing: the name written in takes one at the start of a part only.
            if (
              s === "de" &&
              !/(?:^|[–|/(:,-])\s*$/u.test(all.slice(0, at) + b)
            )
              return b + tr;
            return b + capital(tr, term);
          },
        );
      }
      return y;
    };
    x = writeIn(x);
    // A German trade behind a code and a hyphen («HLS-Monteur», «RZ-Techniker», «DC-Monteur»), which the glossary does
    // not read glued to another word: read apart where that writes a trade in («HLS Fitter»). Firefox left them German
    // («HLS Monteur», «RZ Techniker»: 77 of 1,470 German titles of 6 and 7 November 2026 kept a German job word in Spanish).
    if (s === "de") {
      const apart = x.replace(
        /(?<![\p{L}\d])([\p{Lu}\d]{2,5})-(?=\p{Lu}\p{Ll})/gu,
        "$1 ",
      );
      if (apart !== x && found(apart) > found(x)) x = writeIn(apart);
    }
    if (adjAfter) x = x.replace(/ \u0002/g, " " + adjAfter);
    return x.replace(/(\d+)/g, (m: string, k: number) => kept[k]);
  };
  const found = (x: string) =>
    (TERMS[pair] || []).filter(([re]) => termWord(re).test(x)).length;
  const split = english ? t : jobDash(t, s);
  // No dash where it would split a trade of the glossary ("Anlagenmechaniker – SHK").
  let plain = withTrades(t, true),
    dashed = found(split) < found(t) ? plain : withTrades(split);
  if (s === "en" && /^(?:es|ca|fr)$/.test(target)) {
    // Only trades naming a person ("Electric assembly" is a field: "montaje – Electric" was wrong).
    const written = [
      ...new Set(
        spans
          .filter(([term]) => PERSON.test(term.split(/\s+/).pop() ?? ""))
          .flatMap(([, cap, tr]) => [cap, tr]),
      ),
    ];
    // The other trades naming a person and the product names stop the words taken; a field written in goes with
    // them ("Control cabinet installer": "Instalador – Armario eléctrico", not "Instalación de armario eléctrico").
    // Not a name opening the title: it goes after the trade like any word ("Salesforce Technical Lead" came back
    // "Salesforce responsable técnico" with it as a wall).
    const walls = [
      ...written,
      ...NAMES.filter((n) => plain.includes(n) && !plain.startsWith(n)),
    ];
    plain = wordsAfter(plain, written, walls);
    dashed = wordsAfter(dashed, written, walls);
    // A single-word adjective of the table written in front of English words goes after them ("Encastat Software
    // Engineer" came back "Encastat Enginyer de programari"; "Software Engineer encastat").
    const adjectives = [
      ...new Set(
        spans
          .filter(
            ([term]) =>
              /^[\p{L}-]+$/u.test(term) &&
              /(?:ed|-speaking)$/i.test(term) &&
              !PERSON.test(term),
          )
          .flatMap(([, cap, tr]) => [cap, tr]),
      ),
    ];
    plain = adjectiveAfter(plain, adjectives);
    dashed = adjectiveAfter(dashed, adjectives);
  }
  // The same title without the trades written in, for Firefox to try on its own first.
  const bare = t,
    bareDash = dashed !== plain ? split : t;
  // Not the front-end loader, a machine ("Front End Loader Driver" comes back "Conductor de cargadora frontal").
  const names = [
    ...new Set(
      NAMES.map((n) => (plain.match(nameWord(n)) || [])[2]).filter(Boolean),
    ),
  ]
    .filter(
      (n, i, a) =>
        !a.some((o, j) => j < i && o.toLowerCase().includes(n.toLowerCase())),
    )
    .filter(
      (n) =>
        !/^front[- ]?end$/i.test(n) || !/front[- ]?end\s+loader/i.test(plain),
    );
  // The offer's town, where the title names it, is kept as written in every language ("Leiden", not "Lead";
  // "Wien", not "Vienna"). A city written "regio Venlo" is the town Venlo, and the title may join its words with
  // a hyphen or a space either way ("Champagne au Mont d'Or" for Champagne-au-Mont-d'Or).
  const towns = [];
  const town = String(city || "")
    .trim()
    .replace(
      /^(?:regio|région|region|raum|großraum|grossraum|provincie|province|provincia|comarca|omgeving|landkreis|kreis)\s+/iu,
      "",
    );
  if (town.length > 2 && !COUNTRY.test(town)) {
    const m = plain.match(
      word(
        town
          .replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
          .replace(/[-\s]+/g, "[-\\s]+"),
      ),
    );
    if (m && !names.some((n) => n.includes(m[2]))) {
      names.push(m[2]);
      towns.push(m[2]);
    }
  }
  // The other towns it names too ("Elektriker in Köln", "Schweißer Weiden": not "Cologne", not "willows"); in the
  // second leg, those of the title it came from, so no English word is taken for a town ("Bath", "Nice").
  for (const pl of placesIn(source || plain))
    if (
      word(escape(pl)).test(plain) &&
      !names.some((n) => n.includes(pl) || pl.includes(n))
    ) {
      names.push(pl);
      towns.push(pl);
    }
  // Into Ukrainian Firefox writes in Cyrillic a town it does not know, which the other languages keep ("region Holten"
  // came back "регіон Холтен", "in Zevenbergen" "в Зевенбергені"): after "in", "region" or "near", a capitalised word
  // the title it came from writes the same, one the site's English titles seldom use, is kept as a name.
  if (target === "uk" && source)
    for (const [, w] of plain.matchAll(
      /(?<![\p{L}])(?:in|at|near|around|region|area)\s+(\p{Lu}[\p{L}'’-]{2,})(?![\p{L}])/gu,
    ))
      if (
        word(escape(w)).test(source) &&
        englishUses(w) < 20 &&
        !COUNTRY.test(w) &&
        !names.some((n) => n.includes(w) || w.includes(n))
      )
        names.push(w);
  const alts = Object.fromEntries(towns.map((x) => [x, otherNames(x)]));
  // Into English, a country or language already written in English is kept as written: the first leg put the
  // English ones in its place ("Speech AI Evaluation Specialist - German (Germany)" → "… (United Kingdom)").
  if (target === "en")
    for (const n of plain.match(ENGLISH_PLACE) || [])
      if (!names.includes(n)) names.push(n);
  // A country's code standing as one ("Zurich, CH", "(DE)") kept as written in every language: "CH" came back
  // "United Kingdom", "USA", "ZD" in 210 of 338 Swiss titles.
  for (const n of plain.match(COUNTRY_CODE) || [])
    if (!names.includes(n)) names.push(n);
  // Codes with digits and capitals are kept as written too ("5G" came back "3G"; "C1E", "T12").
  for (const code of new Set(
    plain.match(
      /(?<![\p{L}\d])(?=[\p{L}\d]*\d)(?=[\p{L}\d]*\p{Lu})[\p{Lu}\d]{2,6}(?![\p{L}\d])/gu,
    ) || [],
  ))
    if (!names.includes(code)) names.push(code);
  if (firm) names.unshift(firm);
  const blank = decode(title).trim() || ".";
  // A title that is one trade and nothing else takes the trade's name as it is, without Firefox
  // ("Site foreman" → "Polier", which Firefox alone made "Polieren" or "Website Vorarbeiter").
  // Or one trade and its welding process ("Soldador TIG": given to Firefox, it came back "El soldador TIG", "TIG de
  // soldador").
  const one = [...expect][0] || "";
  // Or trades and nothing else but codes and figures ("EM Storingstechnieker 2 ploegen": "Técnico de averías EM 2
  // turnos", which Firefox made "Cambios en técnico de averías EM 2"). Not a word of the source between them, not
  // even a little one ("Fitter und site manager", "Draughtsman en Roads and utilities", "2 shifts of permanent
  // night", the Dutch "or"), nor two trades side by side, which the language joins with its own words.
  const rest = spans.reduce(
    (x, [, cap, tr]) => x.split(cap).join("\u0003").split(tr).join("\u0003"),
    plain,
  );
  const onlyTrades =
    expect.size >= 1 &&
    !/\u0003\s*\u0003/u.test(rest) &&
    !/\p{Ll}/u.test(
      names
        .reduce((x, n) => x.split(n).join(" "), rest)
        .replace(/(?<![\p{L}])(?:industrial|industriel)(?![\p{L}])/gu, ""),
    );
  const and =
    { es: "y", ca: "i", fr: "et", en: "and", de: "und", nl: "en" }[target] ||
    "&";
  // Written with the company in it: behind its mark, the names step found it lost and gave the written title to
  // Firefox again ("Técnico de mecatrónica - Kammann" came back "mecatrancia"). With the dash Firefox's titles get
  // before a town ("Operario del metal – Iserlohn").
  const tidy = (x: string) =>
    x
      .trim()
      .replace(/(\S)\/\s+/g, "$1/")
      .replace(/\s&\s/g, ` ${and} `)
      .replace(/^./, (c: string) => c.toUpperCase());
  const whole = showCompany(
    onlyTrades
      ? tidy(dashed !== plain && chooseDash(plain, dashed) ? dashed : plain)
      : expect.size === 1 &&
          (plain.trim().toLowerCase() === one.toLowerCase() ||
            new RegExp(
              "^" +
                escape(one) +
                "\\s+(?:TIG|MIG|MAG|WIG|MMA)(?:(?:\\s*[/&-]\\s*|\\s+)(?:TIG|MIG|MAG|WIG|MMA))*$",
              "iu",
            ).test(plain.trim()))
        ? plain.trim().replace(/^./, (c: string) => c.toUpperCase())
        : "",
    firm,
  );
  const show = (x: string) => showCompany(x, firm);
  return {
    text: show(plain) || blank,
    dash: dashed !== plain ? show(dashed) : "",
    bare: show(bare) || blank,
    bareDash: show(bareDash) || blank,
    info: {
      lead,
      trail,
      mid,
      names,
      alts,
      firm,
      expect: [...expect],
      whole,
      head,
      spans,
      level: level.join(" "),
      said,
      english,
      agentic,
    },
  };
}
