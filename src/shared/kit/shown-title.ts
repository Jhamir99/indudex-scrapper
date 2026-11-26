import { withoutClutter } from "./clutter.js";

// An advert's title as it is published and compared (legacy builder/normalise.mjs toRecord's `t`,
// with Argus v1.11.0's cleanTitle, server-bot/notify.mjs; word for word but for types).

// Gender marks and a dangling dash after the title (Argus's cleanTitle).
const cleanTitle = (title: string): string =>
  String(title || "")
    .replace(/\s*\(\s*[a-zäöü]\s*(?:\/\s*[a-zäöü.]+\s*){1,3}\)/gi, "") // (m/w/d), (H/F), (w/m/div.)
    .replace(/\s*\(\s*all genders\s*\)/gi, "")
    .replace(/\s+[HFhf]\/[HFhf](?=\s|$)/g, "") // bare F/H, H/F
    .replace(/\s*[-–—|]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// What a board writes after every title, not the job: "Maintenance Engineer. Job in Bristol LilyLifestyle Jobs"
// (623 published titles on 27 October 2026), and the place said again in brackets, cut at its end ("Engineering
// Manager (Kentish Town (NW5 1TN), Kentish Town (NW5 1TN), United Kingdom, Kentish To)", 102).
const UK_POSTCODE = "[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}";
// Characters that show nothing (a zero-width space after each slash of "(d/m/f)": 524 published titles on 27 October
// 2026; a soft hyphen inside a word) leave the title. Named by their codes, not written in.
// Each listed on purpose, each taken out on its own.
// oxlint-disable-next-line no-misleading-character-class
const INVISIBLE = /[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g;
// A label saying the title is a job offer, in the languages of the offers, which says nothing of the job: opening the
// title before a colon, bar or dash («Job | Engineer Risk Systems | Bruxelles», «Praca: Inżynier procesu», «Gesucht:
// Industrial Test Engineer»: about 1,750 published titles on 8 November 2026), or a part of it of its own between
// dashes or bars («BFÚ – pracovní nabídka – Koordinátor/ka Open Science», the Czech Academy's institutes). The legacy's
// feee7668.
const JOB_OFFER_LABELS = [
  "job",
  "job offer",
  "job opening",
  "job vacancy",
  "job advert",
  "vacancy",
  "open position",
  "we're hiring",
  "oferta de empleo",
  "oferta de trabajo",
  "oferta laboral",
  "vacante",
  "oferta de feina",
  "oferta de treball",
  "offre d'emploi",
  "offre de poste",
  "poste à pourvoir",
  "nous recrutons",
  "stellenangebot",
  "stellenanzeige",
  "stellenausschreibung",
  "gesucht",
  "wir suchen",
  "vacature",
  "wij zoeken",
  "offerta di lavoro",
  "annuncio di lavoro",
  "posizione aperta",
  "oferta de emprego",
  "vaga de emprego",
  "vaga",
  "praca",
  "oferta pracy",
  "pracovní nabídka",
  "nabídka práce",
  "nabídka zaměstnání",
  "volné místo",
  "hledáme",
  "pracovná ponuka",
  "ponuka práce",
  "voľné miesto",
  "hľadáme",
  "állásajánlat",
  "álláshirdetés",
  "ofertă de muncă",
  "ofertă de angajare",
  "loc de muncă",
  "post vacant",
  "oglas za posao",
  "radno mjesto",
  "natječaj",
  "prosto delovno mesto",
  "обява за работа",
  "θέση εργασίας",
  "вакансія",
  "iş ilanı",
  "njoftim pune",
  "ledigt jobb",
  "ledig tjänst",
  "platsannons",
  "ledig stilling",
  "stillingsopslag",
  "stillingsannonse",
  "avoin työpaikka",
  "tööpakkumine",
  "vaba töökoht",
  "darba piedāvājums",
  "darbo skelbimas",
  "laust starf",
];
// Letters, spaces and apostrophes only: a space matches any, an apostrophe either form.
const JOB_OFFER_LABEL = `(?:${JOB_OFFER_LABELS.map((label) => label.replace(/'/g, "['’]").replace(/ /g, "\\s+")).join("|")})`;
const LABEL_FIRST = new RegExp(
  `^${JOB_OFFER_LABEL}\\s*[:|–—-]\\s+(?=\\S)`,
  "iu",
);
const LABEL_PART = new RegExp(
  `\\s+[|–—-]\\s+${JOB_OFFER_LABEL}(?=\\s+[|–—-]\\s|\\s*$)`,
  "giu",
);
export const withoutBoardTail = (t: string): string =>
  String(t || "")
    .replace(/\.?\s+Jobs? in .+? LilyLifestyle Jobs$/u, "")
    .replace(/\s+[-–|]\s+Architektur Stellen$/u, "")
    // A Polish board's button read with the title («Obserwuj ofertę Inżynier budowy», follow the offer) and a recruiter's
    // list of what it does after it («Mechanik Maszyn - Oświęcim - Talent Partners, Skuteczna Rekrutacja, …»).
    .replace(/^Obserwuj ofertę\s+/iu, "")
    .replace(LABEL_FIRST, "")
    .replace(LABEL_PART, "")
    .replace(/\s+[-–|]\s+Talent Partners(?:,\s*[^,]+){0,6}$/u, "")
    .replace(
      new RegExp(
        `\\s*\\((?:[^()]+\\(${UK_POSTCODE}\\),\\s*)+United Kingdom,.*$`,
        "u",
      ),
      "",
    )
    .trim();

// An advert's own number in its title, which says nothing of the job (462 published titles on 29 October 2026): a
// list's number before it ("70. Electricista Industrial"; two to four figures, so a German "1. Offizier" keeps its
// rank), a code with "#" ("##6497", "#2026-59") and a reference at its end ("- ID:15080", "Ref: 2609",
// "Elèctrics: 29110", "DevOps_31001"; a year stays).
export const withoutCodes = (t: string): string =>
  String(t || "")
    .replace(/\s*[-–|]?\s*(?<!&)#+\d[\d-]*#*/gu, " ")
    .trim()
    .replace(/^\d{2,4}\.\s+/u, "")
    .replace(
      /\s*[-–|,]?\s*(?:(?<!\p{L})(?:id|ref|réf|référence|reference|referencia|referenznummer|nr|no|n°|code)\.?\s*)?[:_]\s*(?!(?:19|20)\d{2}\s*$)\d{4,6}\s*$/iu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

// A title longer than that is cut at its last word, never inside one (849 published titles were
// cut at 140, 1 November 2026); one with no space is cut at the length and a letter.
const TITLE_MOST = 250;
const wholeWords = (s: string, most: number): string =>
  s.length <= most ? s : s.slice(0, most + 1).replace(/\s+\S*$/u, "");

// The title published: in composed letters, so a title written with decomposed accents is the same
// title as its copies (NOA-22), without what shows nothing, a board's text, the advert's own codes
// and clutter (a phone only with its prefix or label: bare figures in a title are a pay).
export const shownTitle = (title: string): string =>
  wholeWords(
    withoutClutter(
      withoutCodes(
        withoutBoardTail(
          cleanTitle(
            String(title || "")
              .normalize("NFC")
              .replace(INVISIBLE, "")
              .replace(/\s+/g, " ")
              .trim(),
          ),
        ),
      ),
      { phones: "labelled" },
    ),
    TITLE_MOST,
  );
