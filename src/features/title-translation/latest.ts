// Legacy builder/latest.mjs (JustJans/indudex@b0cd182), word for word but for types.
// The first page's own offers: ten real result cards under all the rest, below the line that says what the site
// gathers, written into each language's first page by the web's build (web/app/features/search/today.server.ts). The page then has content of its own before
// any search, for a visitor and for the crawlers of Google and AdSense, which do not search
// (docs/research/what-google-sees.md); a search hides them (styles/site.css). The owner's calls of 5 November 2026:
// the line "One search. Every job board. Every company.", at most ten offers, those with the most tags, and each
// title well said in the page's language, to show the curious what the site is.
import type { Offer } from "../../shared/schemas/published/offer.js";
import { readsAs } from "./language-of.js";
import { TITLE_FIELD } from "./translate.js";

const SHOWN = 10;
// Each page's cards are offers written in its language, from the countries that speak it, so no title is a
// machine's guess (one read on 5 November: "Jefe/a de Equipo de Fabricación" became "Chief of Manufacturing
// Equipment") and none is another language's taken for this one; the Catalan page's are Spain's with the Catalan
// translation, Catalonia's first (the owner's order of priority: Catalonia, Spain, the rest).
const HOME: Readonly<Record<keyof typeof TITLE_FIELD, readonly string[]>> = {
  en: ["gb", "ie", "mt"],
  es: ["es"],
  ca: ["es"],
  fr: ["fr", "be", "ch", "lu", "mc"],
  nl: ["nl", "be"],
  de: ["de", "at", "ch", "li", "lu"],
};
const CATALONIA = /^ES51/;
// The NUTS code a located town carries starts with its country's, but for Greece's and the United Kingdom's.
const NUTS_OF: Readonly<Record<string, string>> = { gr: "EL", gb: "UK" };
// The tags a card shows beside its source: the pay, the work mode, the contract, the working time and the years
// asked.
const TAGS = ["p", "w", "ct", "wt", "y"] as const;
const tagsOf = (r: Offer) => TAGS.filter((k) => r[k]).length;

// A card fit to show: a title long enough to say the job and short enough for two lines on a phone, starting with a
// capital, with no stop at its end, no pay and no bar in it, and not naming its own town ("Boekhouder - Zorg en IT -
// €4000-€6000 - Utrecht"); one town, located in the offer's country (not "United Kingdom / Spain / Germany", nor
// Wien filed under Andorra); an employer by its name, not its board's address run together ("Solrecogmbh",
// "Empleo.Firsthunting.Es.Careers.Ats", "Usefulsimplet E9b56f") nor its town ("job in Madrid"). Off the English page,
// the title as written is not English: the translator gave it an English version that differs (te), and it reads as
// the page's language, its employer's name and gender clause aside (readsAs). The country alone filed "Confidential
// Computing & Virtualization Senior Engineer" as Spanish and "Digital Content Creator (AI & Social Media) - all
// genders welcome" as German ("genders" fills German titles' clauses), and "IT Workplace & Endpoint Management
// Specialist – Österreich Werbung" read as German by its employer's name. The Catalan page's translations come from
// titles that read as Spanish: from English, "Emulation-Prototyping Senior Engineer" came out "Enginyer de protecció
// d'emulació sènior".
const TITLE = 70;
const GENDER =
  /\(?\b(?:all|any|every)\s+genders?(?:\s+welcome)?\b\)?|\((?:[a-z]\s*[/|,]\s*){1,3}[a-z]\)/gi;
const fold = (s: unknown) =>
  String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const judged = (r: Offer) =>
  String(r.t).split(r.c).join(" ").replace(GENDER, " ");
const fitTitle = (title: string | undefined, r: Offer, lang: string): boolean =>
  !!title &&
  title.length <= TITLE &&
  /^[\p{Lu}\d]/u.test(title) &&
  !/\.\s*$|[€$£|]/.test(title) &&
  !fold(title).includes(fold(r.ci)) &&
  (lang === "en" ||
    (!!r.te && readsAs(judged(r), title === r.t ? lang : "es")));
const fitTown = (r: Offer) =>
  !/[/|+,()]/.test(r.ci) &&
  String(r.n || "").startsWith(NUTS_OF[r.cc] || r.cc.toUpperCase());
const fitEmployer = (r: Offer) =>
  !/^\p{Lu}\p{Ll}{8,}$/u.test(r.c) &&
  !/[\d._]/.test(r.c) &&
  !fold(r.c).includes(fold(r.ci));

// Each page's ten, picked when the pile is built (builder/build-pile.mjs writes them into data/today.json): offers
// fit to show from the employers' own boards and sites, written in the page's language (languageOf, from
// builder/translate.mjs) in a country that speaks it, the most tags first, then the newest; one per employer. Each
// card keeps its title in its page's field.
export type LatestPick = Pick<
  Offer,
  | "id"
  | "t"
  | "c"
  | "ci"
  | "cc"
  | "u"
  | "s"
  | "p"
  | "w"
  | "ct"
  | "wt"
  | "y"
  | "te"
  | "ts"
  | "tc"
  | "tf"
  | "tn"
  | "td"
>;

export function latestPicks(
  records: readonly Offer[],
  {
    isVia = () => false,
    languageOf,
  }: {
    isVia?: (source: string) => boolean;
    languageOf: (offer: Offer) => string;
  },
): Record<string, LatestPick[]> {
  const usable = records
    .filter(
      (r) =>
        /^https?:\/\//.test(r.u || "") &&
        r.c &&
        r.ci &&
        r.cc &&
        !isVia(r.s) &&
        !r.nt &&
        fitEmployer(r) &&
        fitTown(r),
    )
    .toSorted(
      (a, b) =>
        tagsOf(b) - tagsOf(a) ||
        String(b.d || "").localeCompare(String(a.d || "")),
    );
  // The title an offer shows on a page: as written in its language, or, on the Catalan page, Spain's in Catalan.
  const titleOn = (r: Offer, lang: string): string | undefined => {
    const written = languageOf(r);
    return written === lang
      ? r.t
      : lang === "ca" && written === "es"
        ? r.tc
        : undefined;
  };
  return Object.fromEntries(
    Object.entries(HOME).map(([lang, countries]) => {
      const home = new Set(countries);
      const fit = usable.filter(
        (r) => home.has(r.cc) && fitTitle(titleOn(r, lang), r, lang),
      );
      const ready =
        lang === "ca"
          ? fit.toSorted(
              (a, b) =>
                Number(CATALONIA.test(b.n ?? "")) -
                Number(CATALONIA.test(a.n ?? "")),
            )
          : fit;
      const employers = new Set<string>(),
        out: LatestPick[] = [];
      for (const r of ready) {
        if (employers.has(r.c)) continue;
        employers.add(r.c);
        out.push({
          id: r.id,
          t: r.t,
          [TITLE_FIELD[lang as keyof typeof TITLE_FIELD]]: titleOn(r, lang),
          c: r.c,
          ci: r.ci,
          cc: r.cc,
          u: r.u,
          s: r.s,
          p: r.p,
          w: r.w,
          ct: r.ct,
          wt: r.wt,
          y: r.y,
        });
        if (out.length === SHOWN) break;
      }
      return [lang, out];
    }),
  );
}
