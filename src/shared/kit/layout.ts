// ➤ A vacancy page with no structured data, read the way a person reads it. The title is the page's
// ➤ heading (else og:title, else <title> without the site's name); the place follows a
// ➤ "Location:"-style label, a place meta tag, or sits in brackets after the title; the day is the
// ➤ page's <time> or its published meta; the company follows an "Employer:"-style label, else sits
// ➤ between the title and the site's name in <title>, else is the site's name. A page needs two
// ➤ signs of being a vacancy (a vacancy folder in its address, apply wording, a "(m/w/d)"-style
// ➤ mark, a vacancy word; the address counts once); a list page, a counted summary ("24 IT
// ➤ Techniker Jobs"), a news article, an anti-bot or error page answers null.
import { DESCRIPTION_LIMIT } from "../schemas/advert.js";
import { writtenDay as day } from "./dates.js";
import { decodeEntities } from "./entities.js";

// The legacy's builder/lib/layout.ts, copied (job portals T004): only its imports changed, and its `Posting` declared
// here. Its own comments keep their marks.
const TEXT_KEPT = DESCRIPTION_LIMIT;
const DAY_MS = 86_400_000;

// A vacancy as a page's layout gives it (the legacy's `Posting` of builder/lib/crawl.ts).
export interface Posting {
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  description: string;
  posted: string;
  expires: string;
  remote: boolean;
  mode?: string;
  modeTag?: string;
  // A pay as a page writes it (the legacy's `Salary` of builder/lib/crawl.ts).
  pay?: {
    min: unknown;
    max: unknown;
    currency: string;
    period: string;
    partTime: boolean;
  } | null;
  employmentType?: string[];
  hours?: string;
  years?: number;
  quality?: string;
  contract?: string;
}

const clean = (s: unknown): string =>
  decodeEntities(String(s || "").replace(/<[^>]+>/g, " "))
    .replace(/[\u200b­]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const LABELS = [
  "location",
  "job location",
  "place of work",
  "work location",
  "workplace",
  "based in",
  "standort",
  "arbeitsort",
  "einsatzort",
  "dienstort",
  "ubicación",
  "ubicacion",
  "localidad",
  "lugar de trabajo",
  "provincia",
  "lieu de travail",
  "lieu",
  "localisation",
  "plaats",
  "locatie",
  "standplaats",
  "werklocatie",
  "vestiging",
  "sede di lavoro",
  "sede",
  "luogo di lavoro",
  "località",
  "miejsce pracy",
  "lokalizacja",
  "místo výkonu práce",
  "místo pracoviště",
  "lokalita",
  "pracovisko",
  "miesto výkonu práce",
  "helyszín",
  "munkavégzés helye",
  "arbetsort",
  "placering",
  "arbejdssted",
  "lokation",
  "sijainti",
  "työpaikan sijainti",
  "paikkakunta",
  "asukoht",
  "töökoht",
  "darbo vieta",
  "darba vieta",
  "atrašanās vieta",
  "locul de muncă",
  "locație",
  "mjesto rada",
  "kraj dela",
  "lokacija",
  "city",
  "region",
  "kanton",
  "bundesland",
  "ort",
];
const LABEL = new RegExp(
  `(?:^|[\\s>|•·])(${LABELS.join("|")})\\s*[:：]\\s*`,
  "gi",
);
// ➤ A labelled value that names a company is no place: riga.lv labels the employing company «Darba vieta» ("place of
// ➤ work", «Rīgas pašvaldības sabiedrība ar ierobežotu atbildību "Rīgas satiksme"») and the place «Atrašanās vieta».
const COMPANY_FORM =
  /sabiedrība ar ierobežotu atbildību|akciju sabiedrība|uždaroji akcinė bendrovė|osaühing|aktsiaselts|(?<![\p{L}\p{N}])(?:SIA|UAB|OÜ|GmbH|S\.L\.U?|S\.A\.|Ltd|LLC|B\.V\.|N\.V\.|sp\. z o\.o\.|s\.r\.o\.|ApS)(?![\p{L}\p{N}])/u;
// ➤ A <time> after words of a deadline is the closing day, not the posting one: riga.lv's «Pretendentiem jāpiesakās
// ➤ līdz <time datetime="2026-11-30…">» (applicants must apply by).
const DEADLINE =
  /(?:līdz|iki|kuni|until|by|bis|bis zum|bis spätestens|hasta|hasta el|jusqu'au|jusqu’au|fino al|tot|uiterlijk|do|deadline|frist|termiņš|plazo|fecha límite|date limite|closing date|closes)\s*:?\s*$/i;
const EMPLOYERS = [
  "employer",
  "company",
  "hiring company",
  "arbeitgeber",
  "unternehmen",
  "firma",
  "empresa",
  "entreprise",
  "société",
  "werkgever",
  "bedrijf",
  "organisatie",
  "azienda",
  "tööandja",
  "darba devējs",
  "darbdavys",
  "pracodawca",
  "zaměstnavatel",
  "zamestnávateľ",
  "munkáltató",
  "arbetsgivare",
  "arbejdsgiver",
  "arbeidsgiver",
  "työnantaja",
  "angajator",
  "poslodavac",
  "delodajalec",
];
const EMPLOYER = new RegExp(
  `(?:^|[\\s>|•·])(${EMPLOYERS.join("|")})\\s*[:：]\\s*`,
  "i",
);
// ➤ Where a label's value runs on into the next field or the text: what ends it.
const RUN_ON =
  /\s{2,}|[|•·]|\s[–—-]\s|\p{Extended_Pictographic}|\s(?:Über|About|Our|Unser|Nuestro|Notre|Onze|Vår|Meie|Nasz|Il nostro|The|You|We|Your|I|Ich|Wir|Je|Nous|Ik|Wij|Are|Looking|Join|Buscamos|Cerchiamo|Compensation|Salary|Salaire|Gehalt|Salario|Stipendio|Job type|Contract|Employment|Sector|Category|Branche|Reference|Posted|Start)\b|[.;:](?:\s|$)|\s[A-ZÄÖÜÉ][a-zäöüé]+(?:art|zeit|type|time|dauer|contrat|contract|vertrag)\b/u;
const valueAfter = (body: string, m: RegExpMatchArray, n: number): string =>
  body
    .slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + n)
    .split(RUN_ON)[0]
    .replace(/[.,;:\s]+$/, "")
    .trim();
// ➤ A form's drop-down list stands in the fields as this mark: a label before one is the form's ("Wählen Sie Ihr
// ➤ Land/Ihre Region:" over every country at edmundoptics.de), not the advert's.
const PICKER = "\u0003";
// ➤ The first labelled value that names a place and not a company, in a page's fields joined by " | ".
function labelledPlace(fields: string): string {
  for (const m of fields.matchAll(LABEL)) {
    const value = fields
      .slice(m.index + m[0].length)
      .replace(/^[\s|]+/, "")
      .slice(0, 60)
      .split(RUN_ON)[0]
      .replace(/[.,;:\s]+$/, "")
      .trim();
    if (value && !value.startsWith(PICKER) && !COMPANY_FORM.test(value))
      return value;
  }
  return "";
}
// ➤ Every country's name in the languages vacancies are written in, for a line beside the heading to count as a place.
const COUNTRY_NAMES = (() => {
  const names = new Set<string>();
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const lang of [
    "en",
    "de",
    "fr",
    "es",
    "it",
    "nl",
    "pl",
    "pt",
    "sv",
    "da",
    "nb",
    "fi",
    "cs",
  ]) {
    const say = new Intl.DisplayNames([lang], {
      type: "region",
      fallback: "none",
    });
    for (const a of letters)
      for (const b of letters) {
        const name = say.of(a + b);
        if (name) names.add(name.toLowerCase());
      }
  }
  return names;
})();
// ➤ The line just above or below the vacancy's heading, where some pages write the place alone ("Italy, Bolzano" above it
// ➤ at kanadevia-inova.com, "India" below it at edmundoptics.de): taken when one of its parts is a country's name.
function besideHeading(main: string, heading: string): string {
  const at = [...main.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].find(
    (m) => clean(m[1]) === heading,
  );
  if (!at) return "";
  const before =
    (main
      .slice(Math.max(0, at.index - 400), at.index)
      .match(/>([^<>]{2,80})<\/[a-z0-9]+>\s*(?:<[^>]+>\s*)*$/i) || [])[1] || "";
  const after =
    (main
      .slice(at.index + at[0].length, at.index + at[0].length + 400)
      .match(/^\s*(?:<[^>]+>\s*)*([^<>]{2,80})</) || [])[1] || "";
  return (
    [before, after]
      .map(clean)
      .find(
        (v) =>
          v &&
          v.length <= 60 &&
          v.split(/\s*,\s*/).some((p) => COUNTRY_NAMES.has(p.toLowerCase())),
      ) || ""
  );
}
// ➤ "in London", "à Lyon": the place without its preposition.
const AT =
  /^(?:in|at|à|a|en|bei|im|in der|à la|au|aux|nel|nella|w|v|i)\s+(?=\p{Lu})/u;
// ➤ The gender marks of a title: "(m/w/d)", "m/w/d", "H/F" at its end, "Técnico/a", and the German
// ➤ "(w/m/divers)", "(gn)", "Ingenieur*in", "Techniker:in", "Prüfer/in", "Elektroniker(in)".
const MARK =
  /\((?:[mwfdxhvkžnit]|div|divers|all)(?:\s*[/|,]\s*(?:[mwfdxhvkžnit]|div|divers|all)){1,3}\)|\(gn\*?\)|\b[mwfh]\/[mwfh]\/[dx]\b|\((?:all genders?|alle geschlechter|tous genres)\)|\b(?:h\/f|f\/h|m\/f|f\/m|m\/w|w\/m|m\/v|v\/m)\s*$|\b\w+\/as?\b|\w(?:\/-?|\*|:|_)in(?:nen)?\b|\w\(in\)/i;
export const hasMark = (title: unknown): boolean =>
  MARK.test(String(title || ""));
const ONLY_MARK = /^[mwfdxhvkžn\s/|,.]+$/i;
// ➤ What a bracket after the title holds when it is not a place.
const NOT_PLACE =
  /\b(team|department|division|unit|group|abteilung|bereich|équipe|equipo|squadra|afdeling|teilzeit|vollzeit|part.?time|full.?time|remote|hybrid|senior|junior|lead|intern|trainee|befristet|temporary|interim)\b|\d/i;
const APPLY =
  /\b(apply|application|bewerben|bewerbung|postuler|candidature|candidatar|candidatura|candidate-se|solicitar|inscribirse|inscr[ií]bete|inscripci[oó]n|aplicar|ap[uú]ntate|me interesa|sollicit|solliciteer|ansök|sök tjänsten|hae paikkaa|hae tätä|søk stillingen|ansøg|aplikuj|aplikovat|odpovědět|reagovat|jelentkez|kandid|prijav|trimite cv|send cv|enviar cv|cv sturen)\w*/i;
const VACANCY_WORD =
  /\b(vacancy|vacature|stellenangebot|stelle|job|jobs|position|poste|offre|oferta|empleo|vaga|vacante|annuncio|posizione|praca|oferta pracy|stanowisko|pozice|nabídka|pracovná ponuka|állás|tjänst|stilling|työpaikka|darbo skelbimas|vakance|loc de muncă|radno mjesto|delovno mesto)\b/i;
const LEADING_VACANCY_WORDS = new RegExp(
  `^(?:\\s*${VACANCY_WORD.source})+`,
  "i",
);
// ➤ A listing's word at the end of a heading: "Quality Inspector Jobs" is the vacancy "Quality Inspector".
const LISTING_WORD_AT_END =
  /\s+(?:jobs|vacancies|vacatures|stellenangebote|stellen|empleos|emplois)$/i;
// ➤ A listing's word opening a heading, after a board's name and a colon or not: «Agrar-Stellenmarkt: Stellenangebote
// ➤ Schweiz Agraringenieur(in)» and «Vacatures Procestechnoloog» are lists of vacancies (proplanta.de, 38 published, and
// ➤ nationaleberoepengids.nl, 51, on 23 November 2026), «Vacatures Senior business analist» at an address with the
// ➤ vacancy's number a vacancy whose site writes the word before its title (werken.belastingdienst.nl).
const LISTING_OPENING =
  /^(?:(?<board>[\p{L}-]+):\s*)?(?:vacatures|vacancies|stellenangebote)\s+(?=\p{L})/iu;
// ➤ What a page's heading says it is: a list, or a vacancy titled with the words after its listing's word.
export function readHeading(
  heading: string,
  path: string,
): { list: boolean; title: string } {
  const opening = heading.match(LISTING_OPENING);
  if (!opening) return { list: false, title: heading };
  const numbered = /\d/.test(path.split("/").filter(Boolean).pop() || "");
  return {
    list: !!opening.groups?.board || !numbered,
    title: heading.slice(opening[0].length),
  };
}
const VACANCY_PATH =
  /\/(jobs?|careers?|karriere|vacanc(?:y|ies)|vacatures?|stellenangebote?|stellen|offene-stellen|stellenanzeigen?|stellenausschreibung(?:en)?|stellenboerse|jobboerse|werkenbij|werken-bij|oferty_pracy|offres?-d-emploi|offre|ofertas?(?:-de)?-empleo|oferta|empleo|emploi|annunci|posizioni|oferty-pracy|praca|nabidka|pozice|volne-pozice|pracovne-ponuky|allasajanlat|allas|lediga-jobb|tjanster|ledige-stillinger|stilling|tyopaikat|avoimet-tyopaikat|job-offers?|jobboffers|vagas|vacancy)\/./i;
const GENERIC =
  /^(jobs?|careers?|karriere|stellenangebote|stellenmarkt|vacatures?|vacancies|empleo|ofertas?( de empleo)?|offres?( d'emploi)?|emplois?|join us|join our team|open positions|current (vacancies|openings)|work with us|trabaja con nosotros|lavora con noi|posizioni aperte|praca|kariera|oferty pracy|volné pozice|lediga jobb|ledige stillinger|avoimet työpaikat|home|startseite|accueil|inicio|search for a job)$/i;
const SUMMARY =
  /^\d+\s|\b\d+\s+(jobs?|stellen|offres|ofertas|vacatures|annunci|oferty)\b|\bjobs?\s+(in|für|for|à|en|bei)\s|\bstellenangebote\s+(in|für|bei)\s|\b(job offers|job openings|open positions|career opportunities|offene stellen(angebote)?|vacatures|offres d'emploi|ofertas de empleo)\s+(at|bei|chez|bij|in|für|for|de|en)\s/i;
const NEWS =
  /\/(news|nieuws|nyheter|uutiset|aktuelles|aktuell|actualites?|actualidad|noticias|notizie|blog|press|presse|magazine|artikel|article|event|events|agenda|wiki|karriere-news|ratgeber|arbeitsleben|bewerbung)\//i;
// ➤ A heading that belongs to a button or a pop-up, not to the vacancy.
const UI =
  /^(send|share|e-?mail|forward|recommend|tell a friend|envoyer|partager|recommander|teilen|weiterempfehlen|empfehlen|compartir|enviar|condividi|deel|dela|jaa|udostępnij|sdílet|apply( now)?|postuler|jetzt bewerben|login|log in|sign in|connexion|anmelden|iniciar sesión|cookies?|job alert|alerte|newsletter|menu|search|suche|recherche|buscar)\b/i;
// ➤ What a wall or an error page says where a vacancy has its title.
const WALL =
  /^(verification required|just a moment|attention required|access denied|request (blocked|unsuccessful)|are you (a )?(robot|human)|security check|captcha|checking your browser|pardon our interruption|forbidden|error|\d{3}\b|page not found|not found|seite nicht gefunden|página no encontrada|page introuvable|pagina niet gevonden)/i;
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// ➤ Words a place leaves lower-case, and the field names an empty field shows in its place.
const PARTICLE =
  /^(?:in|an|am|aan|den|der|de|la|le|sur|bei|im|op|on|upon|the|and|und|en|di|del|da|do)$/i;
const FIELD_WORD =
  /\b(?:date|datum|hours|uren|stunden|benefits?|salary|salaris|gehalt|contract|vertrag|type|land|country|deadline|application|bewerbung|all|alle|any)\b/i;

// ➤ A page with its blocks of these tags taken out, each by `by`, walked once: «<script[\s\S]*?<\/script>» and its kin
// ➤ took ten minutes on a 2 MB page with one left open (LEC-14). A tag's name must end where it seems to: <nav-bar> is
// ➤ no <nav> (LEC-17). One left open stays, as the patterns left it.
export function without(html: string, tags: string[], by = " "): string {
  const lower = html.toLowerCase(),
    open = new RegExp(`<(${tags.join("|")})(?=[\\s>/])`, "g");
  let out = "",
    at = 0;
  for (let m; (m = open.exec(lower));) {
    const close = lower.indexOf(`</${m[1]}`, m.index);
    if (close < 0) break;
    const end = lower.indexOf(">", close);
    out += html.slice(at, m.index) + by;
    at = end < 0 ? html.length : end + 1;
    open.lastIndex = at;
  }
  return out + html.slice(at);
}

// ➤ A page whose own date is more than a year old is a vacancy a sitemap forgot to drop.
const STALE_DAYS = 365;

// ➤ `known`: the address matches the shape of a vacancy's the source names (its `match`), which
// ➤ counts as the address sign whatever its words.
export function guessPosting(
  html: unknown,
  url: string,
  now = Date.now(),
  { known = false } = {},
): Posting | null {
  const s = String(html || "");
  let path;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  if (NEWS.test(path)) return null;
  const meta = (name: string): string =>
    clean(
      (s.match(
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)`,
          "i",
        ),
      ) ||
        s.match(
          new RegExp(
            `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
            "i",
          ),
        ) ||
        [])[1],
    );
  const site = meta("og:site_name");
  const strip = (t: string): string =>
    t
      .replace(
        site ? new RegExp(`\\s*[|–—-]\\s*${escape(site)}\\s*$`, "i") : /$^/,
        "",
      )
      .replace(/\s*[|–—]\s*[^|–—]{2,40}$/, "")
      .trim();
  const lead = (t: string): string =>
    t
      .replace(
        /^(vacature|stellenangebot|job|offre d'emploi|offre|oferta de empleo|oferta|annuncio)\s*[:–-]\s*/i,
        "",
      )
      .trim();
  // ➤ The heading that the <title> repeats, else the first: a pop-up's heading ("Send this job
  // ➤ to a friend") comes first on some pages, and a script may sit inside one.
  const bare = without(s, ["script", "style"]);
  // ➤ An advert's own <header> inside its <article> holds its title and place: kept (LEC-17).
  const chrome = /<article[\s>]/i.test(bare)
    ? ["nav", "footer"]
    : ["nav", "footer", "header"];
  const head = clean((s.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const h1s = [...bare.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((x) => clean(x[1]))
    .filter(Boolean);
  const h1 =
    h1s.find((h) => head.toLowerCase().includes(h.toLowerCase())) ||
    h1s.find((h) => !UI.test(h)) ||
    "";
  if (WALL.test(head) || WALL.test(h1)) return null;
  const heading =
    [h1, strip(meta("og:title")), strip(head)]
      .map(lead)
      .find(
        (t) =>
          t &&
          t.length >= 4 &&
          t.length <= 160 &&
          !GENERIC.test(t) &&
          t.toLowerCase() !== site.toLowerCase(),
      ) || "";
  if (!heading || SUMMARY.test(heading) || UI.test(heading)) return null;
  const read = readHeading(heading, path);
  if (read.list) return null;
  const title = read.title.replace(LISTING_WORD_AT_END, "");
  const body = clean(without(bare, chrome));
  const signals =
    (MARK.test(title) ? 1 : 0) +
    (APPLY.test(body) ? 1 : 0) +
    (VACANCY_WORD.test(heading) ? 1 : 0) +
    (known || VACANCY_PATH.test(path) || VACANCY_WORD.test(path) ? 1 : 0);
  if (signals < 2) return null;
  // ➤ The <title> after the vacancy's own: "Title, Bolt | CV.ee" names the employer, then the site;
  // ➤ "Title Amsterdam, North Holland" or "Title in Edinburgh - …", with no separator, the place first.
  // ➤ A page's word for a vacancy there is no place: "Title Job | Site", "Title Stelle - Site", "Title Job in Leeds".
  const at = head.toLowerCase().indexOf(title.toLowerCase());
  const after = at < 0 ? "" : head.slice(at + title.length);
  const rest = after.replace(LEADING_VACANCY_WORDS, " ");
  const placed =
    /^\s+(?:\p{Lu}|(?:in|at|à|en|bei)\s+\p{Lu})/u.test(rest) &&
    !APPLY.test(rest)
      ? rest.trim().split(/\s+[|–—-]\s+|\s*\|\s*/)[0]
      : "";
  const tail = (placed ? rest.trim().slice(placed.length) : after)
    .split(/\s*[|–—,]\s*|\s+-\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !/^\p{Ll}+$/u.test(x));
  // ➤ A label's value ends with its box ("Arbeitsort: Bamberg</p><p>Unbefristet"), or sits in the
  // ➤ next one ("<dt>Standort:</dt><dd>München</dd>").
  const main = without(without(bare, chrome), ["select"], ` ${PICKER} `);
  const fields = clean(
    main.replace(/<\/(?:p|div|li|dd|dt|td|th|h[1-6])>|<br\s*\/?>/gi, " | "),
  );
  let location = labelledPlace(fields);
  // ➤ A pin icon with no text of its own ("ai-location", "fa-map-marker"): the text after it in its box.
  if (!location) {
    const pin = main.match(
      /<(span|i|em)[^>]*\bclass=["'][^"']*\b(?:location|map-marker|map-pin)\b[^"']*["'][^>]*>\s*<\/\1>/i,
    );
    const after = pin
      ? clean(
          main
            .slice((pin.index ?? 0) + pin[0].length)
            .split(/<\/(?:div|p|li|dd|td)>|<(?:span|i|em)[^>]*class=/i)[0],
        )
      : "";
    if (
      after &&
      after.length <= 60 &&
      !GENERIC.test(after) &&
      !UI.test(after) &&
      !/\d{1,2}:\d{2}|:$/.test(after)
    )
      location = after;
  }
  if (!location) location = meta("geo.placename") || meta("og:locality") || "";
  if (!location && placed.length <= 60) location = placed;
  if (!location) {
    const b = (title.match(/\(([^()]{3,40})\)\s*$/) || [])[1] || "";
    location =
      MARK.test(`(${b})`) || ONLY_MARK.test(b) || NOT_PLACE.test(b)
        ? ""
        : b.trim();
  }
  // ➤ A JobPosting kept as a string inside a script (\"jobLocation\"…): its place, read as such.
  if (!location) {
    const flat = s.replace(/\\"/g, '"').replace(/\\\//g, "/");
    const job = (flat.match(/"jobLocation"[\s\S]{0,500}/) || [""])[0];
    const city =
      (job.match(/"addressLocality"\s*:\s*"([^"]{2,60})"/) || [])[1] || "";
    const land =
      (job.match(
        /"addressCountry"\s*:\s*(?:\{[^}]*?"name"\s*:\s*)?"([^"]{2,40})"/,
      ) || [])[1] || "";
    location = [city, land].filter(Boolean).join(", ");
  }
  // ➤ A page drawn by a script keeps its place in the data it draws from: "location":"Hamburg" with
  // ➤ "country":"Germany", both names (a capital first, letters only), else nothing.
  if (!location) {
    const v = (k: string): string =>
      [...s.matchAll(new RegExp(`"${k}"\\s*:\\s*"([^"]{2,60})"`, "g"))]
        .map((x) => x[1])
        .find(
          (x) =>
            /^\p{Lu}[\p{L} .'-]+$/u.test(x) &&
            !/^(location|city|country)$/i.test(x),
        ) || "";
    const place = v("location") || v("city"),
      country = v("country");
    if (place && country)
      location = place === country ? place : `${place}, ${country}`;
  }
  // ➤ Last, a label alone in its box with the value in the next ("Locatie | Hoogeveen"), or a pin drawn
  // ➤ as an inline <svg> with the text after it (werkenbijtennet.nl, Witteveen+Bos). A place's words
  // ➤ begin with capitals; an empty field leaves the next label there ("Working Hours", "Bundesland, Land").
  if (!location) {
    const boxed =
      (fields.match(
        new RegExp(
          `(?:^|\\|)\\s*(?:${LABELS.join("|")})\\s*\\|\\s*([^|]{2,60}?)\\s*(?:\\||$)`,
          "i",
        ),
      ) || [])[1] || "";
    const svg = main.match(
      /<svg[^>]*\b(?:id|class)=["'][^"']*\b(?:location|map-marker|map-pin)\b[^"']*["'][\s\S]*?<\/svg>/i,
    );
    const pinned = svg
      ? clean(
          main
            .slice((svg.index ?? 0) + svg[0].length)
            .split(/<\/(?:div|p|li|dd|td)>|<(?:span|i|em)[^>]*class=/i)[0],
        )
      : "";
    const named = (v: string): boolean =>
      v.length <= 60 &&
      !FIELD_WORD.test(v) &&
      v
        .split(/[\s,/-]+/)
        .filter(Boolean)
        .every((w) => /^[\p{Lu}\d'(]/u.test(w) || PARTICLE.test(w));
    location =
      [boxed.split(RUN_ON)[0].trim(), pinned].find(
        (v) => v && named(v) && !GENERIC.test(v) && !UI.test(v),
      ) || "";
  }
  if (!location) location = besideHeading(main, h1);
  location = location.replace(AT, "");
  if (ONLY_MARK.test(location)) location = "";
  if (location.length > 60)
    location = location.slice(0, 60).replace(/\s\S*$/, "");
  // ➤ An "Employer:" label's value is a name, not a sentence ("Our client is a large-scale…").
  const e = body.match(EMPLOYER);
  const named = e ? valueAfter(body, e, 80) : "";
  const employer =
    named.length <= 60 &&
    named.split(" ").length <= 6 &&
    !/^(our|the|a|an|we|this|unser|unsere|notre|nuestro|nuestra|nostro|onze)\b/i.test(
      named,
    )
      ? named
      : "";
  const company =
    employer ||
    (site && tail.some((x) => x.toLowerCase() === site.toLowerCase())
      ? site
      : "") ||
    (tail.length > 1 ? tail[0] : "") ||
    site ||
    tail[0] ||
    "";
  // ➤ The dates of the advert's own body, not of the page's footer or menu (LEC-10).
  const times = [...main.matchAll(/<time[^<>]+datetime=["']([^"']+)/gi)].map(
    (x) => ({
      when: x[1],
      deadline: DEADLINE.test(
        clean(main.slice(Math.max(0, x.index - 120), x.index)),
      ),
    }),
  );
  const posted = day(
    times.find((x) => !x.deadline)?.when ||
      meta("article:published_time") ||
      meta("article:modified_time") ||
      "",
  );
  const expires = day(times.find((x) => x.deadline)?.when || "");
  if (posted && Date.parse(posted) < now - STALE_DAYS * DAY_MS) return null;
  const start = Math.max(0, body.indexOf(title));
  return {
    title,
    company,
    location,
    country: "",
    url,
    posted,
    expires,
    description: body.slice(start, start + TEXT_KEPT),
    remote:
      /\b(remote|home ?office|telework|teletrabajo|t[ée]l[ée]travail)\b/i.test(
        `${title} ${location}`,
      ),
    mode: "",
    modeTag: "",
    pay: null,
    quality: "guessed",
  };
}

// ➤ A careers page that lists its vacancies with no page of their own, as small firms do
// ➤ ("Bauingenieure (m/w/d)", "Industriemechaniker/Mechatroniker (m/w/d)" as headings one under
// ➤ the other, each with its text below): each title is an advert, its address the page's with an
// ➤ anchor, or the document it links to (a PDF per vacancy). A title carries a gender mark, is short
// ➤ and not a sentence, and links to no page of its own (the page-by-page reader reads those); the
// ➤ titles that repeat one structure (the same tag and class) are the list, as list-page readers
// ➤ find their records (MDR, DEPTA), and a single one counts only as a heading. Its text runs to
// ➤ the next title; its place is a "Standort:"-style label in that text.
const LIST_TAGS =
  "h[1-6]|li|dt|summary|button|strong|b|td|th|p|span|div|a|label";
const DOCUMENT = /\.(?:pdf|docx?)(?:[?#]|$)/i;
const TRAILING_WORDS =
  /\s*[–—-]?\s*(?:mehr anzeigen|mehr erfahren|mehr infos?|weiterlesen|read more|zur stelle|zum job|details)\s*$/i;
const ONLY_A_MARK =
  /^\(?\s*(?:[mwfdxhvk]|div|divers)(?:\s*[/|,]\s*(?:[mwfdxhvk]|div|divers)){1,3}\s*\)?$/i;
const NOT_TITLE =
  /(?:^|\s)(?:wir suchen|suchen wir|gesucht|bewirb|bewerben sie|bewerbung|hier gelangen|ihre aufgaben|deine aufgaben|ihr profil|dein profil|abgeschlossene|erfolgreich abgeschlossen|wir bieten|we offer|your tasks|you will|vous|nous recherchons|wij zoeken|zur verstärkung|für unser|für unseren|für unsere|erfahrung (?:als|im|in)|kenntnisse|voraussetzung|entlohnung|gehalt|vergütung|bitte auswählen|stellenanzeige|download|pdf|cookie|mehr erfahren|mehr infos?|weiterlesen|read more|en savoir plus|lees meer)(?:\s|$|[,.:!])/i;
const LEADING_WORDS =
  /^(?:(?:festeinstellung|stelle als|stellenangebot|wir suchen (?:dich|sie|eine?n?)(?: als| zur?)?|job|neu|new|top)\s*[:–-]?\s+)+/i;
type Found = {
  text: string;
  tag: string;
  sig: string;
  at: number;
  end: number;
  doc: string;
};
export function listPostings(html: unknown, url: string): Posting[] {
  const s = String(html || "");
  let base = "";
  try {
    base = new URL(url).href.replace(/#.*$/, "");
  } catch {
    return [];
  }
  const head = clean((s.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  if (WALL.test(head)) return [];
  const bare = s.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<select[\s\S]*?<\/select>|<form[\s\S]*?<\/form>/gi,
    " ",
  );
  // ➤ Every link's text and address: a title that leads to a page of its own is left out, one that
  // ➤ leads to a document has it as its address.
  const absolute = (h: string): string => {
    try {
      return new URL(decodeEntities(h), base).href;
    } catch {
      return "";
    }
  };
  const linked = [
    ...bare.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ]
    .filter(
      (m) =>
        m[1] &&
        !/^(?:#|mailto:|tel:|javascript:)/i.test(m[1]) &&
        m[1] !== "/" &&
        absolute(m[1]).replace(/#.*$/, "") !== base,
    )
    .map((m) => ({ text: clean(m[2]).toLowerCase(), href: absolute(m[1]) }))
    .filter((l) => l.text.length >= 6 && l.href);
  const found: Found[] = [];
  const lower = bare.toLowerCase();
  // ➤ Every opening tag on its own, so a title inside a list item is seen as well as the item.
  for (const m of bare.matchAll(
    new RegExp(`<(${LIST_TAGS})\\b([^>]*)>`, "gi"),
  )) {
    const from = m.index + m[0].length;
    const close = lower.indexOf(`</${m[1].toLowerCase()}`, from);
    if (close < 0 || close - from > 600) continue;
    const inner = bare.slice(from, close);
    // ➤ A box that holds other boxes is not a title, its innermost one may be.
    if (/<(?:div|p|li|ul|ol|h[1-6]|table|section|article)\b/i.test(inner))
      continue;
    const text = clean(inner)
      .replace(LEADING_WORDS, "")
      .replace(TRAILING_WORDS, "")
      .replace(/\s*[-–|»]\s*$/, "")
      .replace(/^[»›•–-]\s*/, "")
      .trim();
    if (
      text.length < 6 ||
      text.length > 120 ||
      text.split(" ").length > 14 ||
      !MARK.test(text) ||
      ONLY_A_MARK.test(text)
    )
      continue;
    // ➤ A plural with a gender mark ("Kolleg:innen", "Schüler*innen") names people, not a vacancy.
    if (
      /\w[:*_/]innen\b/i.test(text) &&
      !MARK.test(text.replace(/\w[:*_/]innen\b/gi, " "))
    )
      continue;
    if (
      /[.!?]$/.test(text) ||
      (text.match(/,/g) || []).length >= 3 ||
      /^\p{Ll}/u.test(text) ||
      NOT_TITLE.test(text) ||
      UI.test(text) ||
      SUMMARY.test(text) ||
      /€|\d{4,}|https?:|@/.test(text)
    )
      continue;
    const low = text.toLowerCase();
    const link = linked.find((l) => l.text.includes(low));
    if (link && !DOCUMENT.test(link.href)) continue;
    const tag = m[1].toLowerCase();
    const cls =
      ((m[2].match(/\bclass=["']([^"']*)["']/i) || [])[1] || "")
        .trim()
        .split(/\s+/)[0] || "";
    // ➤ A document's address only when it is a web one: «javascript:open('x.pdf')» is none (LEC-26).
    found.push({
      text,
      tag,
      sig: `${tag}.${cls}`,
      at: m.index,
      end: close,
      doc: link && /^https?:\/\//i.test(link.href) ? link.href : "",
    });
  }
  if (!found.length) return [];
  // ➤ The list is the structure most titles share; a lone title counts when it is a heading.
  const bySig = new Map<string, Found[]>();
  for (const f of found) bySig.set(f.sig, [...(bySig.get(f.sig) || []), f]);
  const group = [...bySig.values()].sort((a, b) => b.length - a.length)[0];
  if (
    group.length < 2 &&
    !/^(?:h[1-5]|summary|dt|strong|b)$/.test(group[0].tag)
  )
    return [];
  const seen = new Set<string>();
  const records = group.filter((f) => {
    const k = f.text.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return records.map((f, i) => {
    const next = records[i + 1]?.at ?? Math.min(bare.length, f.end + 20000);
    const fields = clean(
      bare
        .slice(f.end, next)
        .replace(/<\/(?:p|div|li|dd|dt|td|th|h[1-6])>|<br\s*\/?>/gi, " | "),
    );
    let location = labelledPlace(fields).replace(AT, "");
    if (ONLY_MARK.test(location) || location.length > 60) location = "";
    const slug = f.text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    return {
      title: f.text,
      company: "",
      location,
      country: "",
      url: f.doc || `${base}#${slug}`,
      posted: "",
      expires: "",
      description:
        `${fields.replace(/(?:\s*\|\s*)+/g, " · ")}. ${f.text}`.slice(
          0,
          TEXT_KEPT,
        ),
      remote: /\b(remote|home ?office)\b/i.test(f.text),
      mode: "",
      modeTag: "",
      pay: null,
      quality: "guessed",
    };
  });
}

// ➤ A page with three or more vacancy pages below its own address is their list ("/karriere/" →
// ➤ "/karriere/elektroniker-123"); a vacancy's "similar jobs" sit beside it, not below.
// ➤ The country a page's own domain names (".lu", ".co.uk"), for a page that states none.
export function tldCountry(url: string): string {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return "";
  }
  const cc = (host.match(/\.([a-z]{2})$/) || [])[1] || "";
  // ➤ Domains bought for their letters, not their country: «.nu» is Swedish and Dutch, not Niue's (LEC-27).
  return cc === "uk"
    ? "gb"
    : [
          "eu",
          "io",
          "co",
          "me",
          "tv",
          "ai",
          "cc",
          "ws",
          "nu",
          "ly",
          "to",
          "fm",
          "sh",
          "gg",
          "tk",
        ].includes(cc)
      ? ""
      : cc;
}

export function isList(url: string, links: string[]): boolean {
  let base = "";
  try {
    base = new URL(url).pathname.replace(/\/?$/, "/");
  } catch {
    return false;
  }
  return (
    links.filter((u) => {
      try {
        const p = new URL(u).pathname;
        return p !== base && p.startsWith(base);
      } catch {
        return false;
      }
    }).length >= 3
  );
}
