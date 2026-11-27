// ➤ Reading a careers site the way a search engine does, without an API: its robots.txt
// ➤ (what may be read, how fast, where the sitemaps are), its sitemaps (the addresses of
// ➤ the vacancy pages) and the schema.org JobPosting block each vacancy page publishes for
// ➤ search engines: the same fields an ATS would hand over. Pure functions here; the
// ➤ fetching is in the adapter and the scout.
// The legacy's builder/lib/crawl.ts (JustJans/indudex@ec79858), copied (career sites T002): only its imports changed. Its own
// comments keep their marks.
import { fold } from "../../../shared/kit/fold.js";
import { decodeEntities } from "../../../shared/kit/entities.js";
import { text, TEXT_KEPT } from "./page-text.js";
import { tagMode } from "../../../shared/kit/mode-words.js";
import { registrable } from "./registrable.js";

export { registrable };

// ➤ A vacancy as a page's block or list gives it, before the source's reader adds its own fields.
export type Posting = {
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
  pay?: Salary | null;
  employmentType?: string[];
  hours?: string;
  years?: number;
  quality?: string;
};
export type Salary = {
  min: unknown;
  max: unknown;
  currency: string;
  period: string;
  partTime: boolean;
};
// ➤ A JSON-LD node is whatever a site wrote: its fields are read one by one, each checked as it is read.
type Node = Record<string, unknown>;
const field = (n: unknown, k: string): unknown =>
  n && typeof n === "object" ? (n as Node)[k] : undefined;
const many = (v: unknown): unknown[] => (v ? ([] as unknown[]).concat(v) : []);
type SitemapItem = { url: string; lastmod: string };
export type Sitemap = { index: boolean; items: SitemapItem[] };

// ➤ The calendar day of an instant where the source is: midnight in Berlin is the day before in UTC (FUE-14).
export const dayIn = (ms: number, zone: string): string =>
  Number.isFinite(ms)
    ? new Date(ms).toLocaleDateString("sv-SE", { timeZone: zone })
    : "";

// ➤ robots.txt lives in builder/robots.ts; these stay importable from here.
export { parseRobots, allowed, robotsPath } from "./robots.js";

// ➤ What lies between each opening tag and its closing one, the next opening tag ending the search: a lazy «[\s\S]*?»
// ➤ ran to the end of the text for every opening tag left unclosed, quadratic on a hostile page (RAS-11).
export function elements(s: string, open: RegExp, close: RegExp): string[] {
  const starts = [...s.matchAll(open)].map((m) => [
    m.index,
    m.index + m[0].length,
  ]);
  return starts.flatMap(([, from], k) => {
    const part = s.slice(
        from,
        k + 1 < starts.length ? starts[k + 1][0] : s.length,
      ),
      end = part.search(close);
    return end < 0 ? [] : [part.slice(0, end)];
  });
}

// ➤ A sitemap or a sitemap index: the addresses it lists, with their lastmod when given. An RSS
// ➤ feed of vacancies is read the same way: its items' links and days.
const isItem = (i: SitemapItem | null): i is SitemapItem => i !== null;
export function parseSitemap(xml: unknown): Sitemap {
  const s = String(xml || "");
  if (!/<(?:urlset|sitemapindex)/i.test(s) && /<rss|<item>/i.test(s)) {
    return {
      index: false,
      items: elements(s, /<item>/gi, /<\/item>/i)
        .map((m): SitemapItem | null => {
          const link = (m.match(/<link>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)/i) ||
            [])[1];
          return link
            ? {
                url: text(link).trim(),
                lastmod: day(
                  (m.match(/<pubDate>([^<]+)<\/pubDate>/i) || [])[1] || "",
                ),
              }
            : null;
        })
        .filter(isItem),
    };
  }
  const index = /<sitemapindex/i.test(s);
  // ➤ Some sitemaps give their tags attributes ("<loc xmlns="">") and the day as milliseconds.
  const items = elements(
    s,
    /<(?:url|sitemap)(?:\s[^<>]*)?>/gi,
    /<\/(?:url|sitemap)>/i,
  )
    .map((m): SitemapItem | null => {
      const loc = (m.match(/<loc(?:\s[^<>]*)?>\s*([^<\s]+)\s*<\/loc>/i) ||
        [])[1];
      const lastmod =
        (m.match(/<lastmod(?:\s[^<>]*)?>\s*([^<\s]+)\s*<\/lastmod>/i) ||
          [])[1] || "";
      return loc
        ? {
            url: text(loc).trim(),
            lastmod: /^\d{12,13}$/.test(lastmod)
              ? new Date(Number(lastmod)).toISOString().slice(0, 10)
              : lastmod.slice(0, 10),
          }
        : null;
    })
    .filter(isItem);
  return { index, items };
}

// ➤ Addresses that look like vacancy pages, in the languages of the sites read.
const JOBBY =
  /\/(?:[a-z]{2}\/)?(?:jobs?|jobb|joburi|job[-_]?(?:detail|offer|posting|opening|listing|ad)s?|vacanc(?:y|ies)|vacante|vacantes|vacature|vacatures|werken-bij|vakance|vakances|career|careers|carriere|carrieres|carreira|carreiras|cariere|karriere|karrier|kariera|karijera|stellen(?:angebot|anzeige|markt)?[en]?|offene-stellen|stelle|offres?(?:-d-?emploi)?|offer|emplois?|postes?|empleo|ofertas?(?:-de-(?:empleo|trabajo))?|trabajo|trabalho|vaga|vagas|lavoro|posizion[ei]|lediga-jobb|ledige-stillinger|stilling|stillinger|tyopaikat|avoimet|rekry|praca|oferty|volna-mista|nabidka|kariera|allas|allasok|posao|zaposlitev|darbo|toopakkumised|position|positions|opening|openings|recruit|recrutement|rekrutacja)(?:[/?#.-]|$)/i;
// ➤ Some portals put the whole title in the address and mark the vacancy with the number it
// ➤ carries on their system, with no job word anywhere: rexx does it on 234 of the employers'
// ➤ sites read here ("IT-Operations-Manager-de-j1186.html"). Softy (French employers) numbers them
// ➤ under an English word ("/offers/224990").
const NUMBERED = /-[a-z]{2,3}-j\d+\.html$|^\/offers\/\d+\/?(?:[?#]|$)/;
export const looksLikeJob = (url: unknown): boolean => {
  const path = String(url || "")
    .replace(/^https?:\/\/[^/]+/, "")
    .toLowerCase();
  return JOBBY.test(path) || NUMBERED.test(path);
};

// ➤ An address that names a file no vacancy is written in: a picture, a style sheet, a video, a font, an office document
// ➤ or an archive. Firecrawl's crawler never asks for these (apps/api/native/src/crawler.rs, is_file); here 5,668 kept
// ➤ pages were such files and none of these kinds gave an advert (builder/tools/crawl-waste.ts, 20 November 2026).
// ➤ PDF, XML, JSON and scripts stay: a few of them did.
const FILE =
  /\.(?:png|jpe?g|gif|webp|svg|ico|bmp|tiff?|css|mp[34]|wav|avi|mov|flv|webm|woff2?|ttf|eot|otf|docx?|pptx?|xlsx?|odt|ods|zip|gz|rar|7z|txt|csv)$/i;
export const isFileAddress = (url: string): boolean => {
  try {
    return FILE.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

// ➤ The shape of an address with its names taken out: "/o/ict-medewerker-2-112" and
// ➤ "/o/dotnet-angular" are both "/o/W". A site whose vacancies were seen at addresses of one
// ➤ shape names the rest of them the same way, in whatever language, so a handful of known
// ➤ vacancy addresses opens a site no word list would have opened. A shape that is names and
// ➤ nothing else ("/W"), or names under a language ("/de/W"), describes every page there is,
// ➤ and is not used.
const LANG =
  /^(de|en|nl|fr|es|it|pt|sv|no|nb|nn|da|fi|pl|cs|sk|hu|ro|bg|el|hr|sl|et|lv|lt|tr|ru|uk|ca|eu|gl|ga|is|mt|sr|bs|mk|sq|be|zh|ja|ko|ar|he|hi)$/;
// ➤ A site that carries a hiring block on every page it has teaches the shape of its articles:
// ➤ where a site keeps its reading is not where it keeps its vacancies.
const CONTENT =
  /^(article|articles|news|newsroom|blog|blogs|post|posts|page|pages|story|stories|press|event|events|product|products|service|services|about|team|insight|insights)$/;
export function pathShape(url: string): string {
  let path;
  try {
    path = new URL(url).pathname;
  } catch {
    return "";
  }
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((p) => (p.length > 8 || /\d/.test(p) ? "W" : p.toLowerCase()));
  if (parts.some((p) => CONTENT.test(p))) return "";
  return parts.some((p) => p !== "W" && !LANG.test(p))
    ? "/" + parts.join("/")
    : "";
}

// ➤ Links on a page that look like vacancy pages of the same site: what a listing page
// ➤ offers when the sitemap names only the listing. shapes: the site's own vacancy shapes.
// ➤ With `match`, a platform's mark of its vacancy addresses ("/prj/shw/"): those addresses count
// ➤ wherever the page names them, in a script too (concludis opens its vacancies from one).
export function jobLinks(
  html: unknown,
  pageUrl: string,
  shapes?: Set<string> | null,
  match = "",
): string[] {
  const page = new URL(pageUrl);
  const out = new Set<string>();
  const s = String(html || "");
  // ➤ Relative links are read against the page's <base href> when it names one (karriere-in-mv.de).
  let base = page;
  try {
    const named = (s.match(/<base\s[^>]*href\s*=\s*["']([^"']+)["']/i) ||
      [])[1];
    if (named) base = new URL(text(named), page);
  } catch {
    /* the page's own */
  }
  const named = [...s.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#]+)["']/gi)].map(
    (m) => m[1],
  );
  if (match)
    named.push(
      ...[...s.matchAll(/["'(]((?:https?:\/\/|\/)[^"'()\s<>]+)["')]/g)]
        .map((m) => m[1])
        .filter((u) => u.includes(match)),
    );
  for (const href of named) {
    let u;
    try {
      u = new URL(text(href), base);
    } catch {
      continue;
    }
    if (u.host !== page.host || u.href === page.href) continue;
    // ➤ A list names its pictures like its vacancies («/uploads/Vacature-monteur.jpg»): 2,028 of the 2,504 files kept.
    if (isFileAddress(u.href)) continue;
    if (
      !looksLikeJob(u.href) &&
      !(shapes && shapes.has(pathShape(u.href))) &&
      !(match && u.href.includes(match))
    )
      continue;
    if (u.pathname.replace(/\/$/, "") === page.pathname.replace(/\/$/, ""))
      continue;
    out.add(u.href.split("#")[0]);
  }
  return [...out];
}

// ➤ The day a site names. The schema asks for 2026-09-07 or a whole timestamp; sites also write
// ➤ the month unpadded ("2026-9-4", "2026/9/04"), the way Java prints a date ("Wed Sep 09
// ➤ 02:00:00 UTC 2026", every SAP SuccessFactors careers site), with the month in words
// ➤ ("September 9, 2026", "27 augustus 2026", "Wed, 09 Sep 2026") or with dots ("18.09.2026").
// ➤ Day and month in figures with slashes only when they cannot be swapped ("25/08/2026"); a
// ➤ date without its year ("Mon Aug 24") names no day.
// ➤ The months as the sites' languages write them, whole or shortened the usual way.
const MONTHS = new Map<string, number>(
  [
    "january jan januar januari janvier enero gennaio janeiro",
    "february feb februar februari fevrier febrero febbraio fevereiro",
    "march mar marz maerz maart mars marzo marco marts",
    "april apr avril abril aprile",
    "may mai mei maj mayo maggio maio",
    "june jun juni juin junio giugno junho",
    "july jul juli juillet julio luglio julho",
    "august aug augustus augusti aout agosto",
    "september sep sept septembre septiembre settembre setembro",
    "october oct oktober octobre octubre ottobre outubro",
    "november nov novembre noviembre novembro",
    "december dec dezember decembre diciembre dicembre dezembro",
  ].flatMap((names, i) =>
    names.split(" ").map((n): [string, number] => [n, i + 1]),
  ),
);
const monthOf = (w: string): number =>
  MONTHS.get(String(w).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()) ||
  0;
function calendarDay(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d ||
    y < 2000 ||
    y > new Date().getUTCFullYear() + 1
  )
    return "";
  return date.toISOString().slice(0, 10);
}
export function day(v: unknown): string {
  const s = String(v || "").trim();
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?![\d])/)))
    return calendarDay(+m[1], +m[2], +m[3]);
  if (
    (m = s.match(
      /^\p{L}{3,9},? (\p{L}{3,9})\.? (\d{1,2}) (?:\d{1,2}:\d{2}(?::\d{2})? )?(?:[a-z]{2,5} )?(\d{4})$/iu,
    )) &&
    monthOf(m[1])
  )
    return calendarDay(+m[3], monthOf(m[1]), +m[2]);
  if (
    (m = s.match(
      /^(?:\p{L}{3,9},? )?(\d{1,2})\.? (\p{L}{3,9})\.?,? (\d{4})(?![\d])/iu,
    )) &&
    monthOf(m[2])
  )
    return calendarDay(+m[3], monthOf(m[2]), +m[1]);
  if (
    (m = s.match(
      /^(\p{L}{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?![\d])/iu,
    )) &&
    monthOf(m[1])
  )
    return calendarDay(+m[3], monthOf(m[1]), +m[2]);
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d])/)))
    return calendarDay(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d])/))) {
    const [a, b] = [+m[1], +m[2]];
    if (a > 12 && b <= 12) return calendarDay(+m[3], b, a);
    if (b > 12 && a <= 12) return calendarDay(+m[3], a, b);
  }
  return "";
}

// ➤ The older way of marking a vacancy up: microdata (itemtype JobPosting, itemprop fields).
// ➤ Read leniently: a property is its content attribute, else the text inside its tag.
function microdataPostings(html: unknown, pageUrl: string): Posting[] {
  const s = String(html || "");
  if (!/itemtype\s*=\s*["']https?:\/\/schema\.org\/JobPosting["']/i.test(s))
    return [];
  const prop = (name: string): string => {
    const m = s.match(
      new RegExp(
        `<([a-z0-9]+)[^>]*itemprop\\s*=\\s*["']${name}["'][^>]*?(?:\\scontent\\s*=\\s*["']([^"']*)["'][^>]*)?>`,
        "i",
      ),
    );
    if (!m) return "";
    if (m[2] !== undefined) return text(m[2]).trim();
    const after = s.slice((m.index ?? 0) + m[0].length);
    const close = after.search(new RegExp(`</${m[1]}\\s*>`, "i"));
    return text(
      close >= 0 ? after.slice(0, close) : after.slice(0, 400),
    ).trim();
  };
  const title = prop("title") || prop("name");
  if (!title) return [];
  const country = prop("addressCountry");
  // ➤ SAP SuccessFactors writes the whole place in the street's field ("Bogota, CO").
  const location =
    [prop("addressLocality"), prop("addressRegion"), country]
      .filter(Boolean)
      .join(", ") || prop("streetAddress");
  return [
    {
      title,
      company: prop("hiringOrganization"),
      location,
      country: /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : "",
      url: pageUrl,
      description: prop("description"),
      posted: day(prop("datePosted")),
      expires: day(prop("validThrough")),
      remote: /remote/i.test(location),
    },
  ];
}

// ➤ The pay a JobPosting states (`baseSalary`), as its fields give it; builder/pay.ts reads
// ➤ and checks it. Sites fill the block loosely: the amount in `value` or in `minValue` and
// ➤ `maxValue`, the period on the amount or on the salary, the currency on the salary or on
// ➤ the posting (`salaryCurrency`).
const isPartTime = (type: unknown): boolean => {
  const t = many(type).map((x) =>
    String(x)
      .toUpperCase()
      .replace(/[^A-Z]/g, ""),
  );
  return t.includes("PARTTIME") && !t.includes("FULLTIME");
};
export function salaryOf(node: unknown): Salary | null {
  const base = many(field(node, "baseSalary"))[0];
  if (!base || typeof base !== "object") return null;
  const value = field(base, "value");
  const amount = value && typeof value === "object" ? value : { value };
  const min = field(amount, "minValue") ?? field(amount, "value"),
    max = field(amount, "maxValue") ?? field(amount, "value");
  if (min == null && max == null) return null;
  return {
    min,
    max,
    currency: String(
      field(base, "currency") || field(node, "salaryCurrency") || "",
    ),
    period: String(field(amount, "unitText") || field(base, "unitText") || ""),
    partTime: isPartTime(field(node, "employmentType")),
  };
}

// ➤ Every JobPosting on a page, with the fields the pile keeps: the JSON-LD blocks, else the
// ➤ microdata. Nested organisations and places are read leniently: sites follow the schema
// ➤ loosely.
// ➤ Plenty of sites write the block by hand and leave a real newline or tab inside a string,
// ➤ which strict JSON refuses and search engines forgive. The control characters inside
// ➤ strings are escaped and the block is read after all; everything outside a string is left
// ➤ exactly as it was, so a block that is truly broken still fails.
export function repairJson(json: unknown): string {
  const ESCAPED: Record<string, string> = {
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
  };
  let out = "",
    inString = false,
    escaped = false;
  for (const ch of String(json)) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && ch < " ") {
      out += ESCAPED[ch] || " ";
      continue;
    }
    out += ch;
  }
  return out;
}
// ➤ A title written with HTML ("Konstrukteur <br> Großraum Stuttgart <h2>Ihre Vorteile</h2>"): a heading in it
// ➤ is the advert's subtitle and goes, unless it is all there is; the other tags become spaces.
const tagless = (t: string): string =>
  t
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const plainTitle = (t: unknown): string =>
  tagless(String(t).replace(/<h[1-6][\s\S]*$/i, "")) || tagless(String(t));
// ➤ The years a block's `experienceRequirements` names: its months ({"monthsOfExperience": 60}, five years; fewer than
// ➤ twelve, none) or the first number of a text in years ("5-7 Years"); null when it names none ("Enige ervaring").
export function experienceYears(req: unknown): number | null {
  const months = Number(field(req, "monthsOfExperience") ?? NaN);
  if (Number.isFinite(months) && months >= 0) return Math.floor(months / 12);
  const n = String(
    typeof req === "string" ? req : field(req, "description") || "",
  ).match(
    /(\d{1,2})\s*(?:\+|-|–|to)?\s*(?:\d{1,2}\s*)?(?:years?|jahre|ans|años|jaar|anni|anos)\b/i,
  );
  return n ? Number(n[1]) : null;
}
// ➤ What a block keeps outside its description ("qualifications", "educationRequirements", "skills": a whole profile,
// ➤ «Votre profil», on taleez.com; "Python, SageMaker, Kafka"), added when the description does not hold it already.
function withRequirements(description: string, node: unknown): string {
  const extra = [
    "qualifications",
    "educationRequirements",
    "skills",
    "responsibilities",
  ]
    .flatMap((k) => many(field(node, k)))
    .map((v) =>
      text(
        typeof v === "string"
          ? v
          : String(
              field(v, "description") ||
                field(v, "name") ||
                field(v, "credentialCategory") ||
                "",
            ),
      ),
    )
    .filter((v) => v && v.length > 2 && !description.includes(v.slice(0, 60)));
  return extra.length ? `${description}\n${extra.join("\n")}` : description;
}
// ➤ A block whose description is only part of the advert its page shows (Inforca: 599 characters in its block, «Bac+4»
// ➤ and «15 ans d'expérience» in the page's next blocks; welcomekit's «Type de contrat : CDI» and «Salaire : entre 49000€
// ➤ et 60000€» after its text): the page's text is taken instead, from the line where the description starts (or, when
// ➤ the page writes it otherwise, the line after the advert's title) up to the first of the page's own endings (apply,
// ➤ share, similar jobs, a contact block, a cookie notice, more articles), which follow the advert on its page. Only when
// ➤ it is much longer than the description and holds most of the description's words, so it is that advert and not a list.
// ➤ Read so, the employers' pages of the text corpus (the owner's corpus, 1 November 2026) keep more of what their page says:
// ➤ a language asked left out on 132 pages instead of 180, a degree on 116 instead of 153, years on 72 instead of 100, a
// ➤ pay on 90 instead of 108 (docs/research/whole-advert.md).
const ENDING =
  /^(?:postuler|postulez|apply|apply now|apply for this job|jetzt bewerben|jetzt online bewerben|online bewerben|bewerben|solliciteer|solliciteren|candidatar|candidatar-se|inscribirse|aplicar|enviar candidatura|share|partager|teilen|delen|compartir|similar jobs|related jobs|more jobs|offres similaires|ofertas similares|buscar ofertas|ahnliche jobs|ahnliche stellen|weitere stellen|vergelijkbare vacatures|kontakt|kontakte|ansprechpartner\w*|contact|contactpersoon|retour|back to|zuruck|terug|gerer le consentement|cookie\w*|facebook|twitter|linkedin|xing|whatsapp|datenschutz\w*|impressum|privacy|lees meer|read more|weiterlesen)(?![a-z])/;
// ➤ A line of a picture or a script written into the page ("data:image/png;base64,…"): the advert's text has ended.
const BLOB = /[A-Za-z0-9+/=]{120,}/;
const LONGER_BY = 150;
const words = (s: string): Set<string> =>
  new Set(
    fold(s)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );
// ➤ A <dialog> is a box over the page, never the advert: Firecrawl's main-content cleaning drops it (removeUnwantedElements.ts),
// ➤ and on the text corpus it held only cookie notices and a «compare your choices» box, which became the advert of 19 of
// ➤ 5,172 pages. Its <aside> rule is not taken: there the boxes held pay, tasks and the place as often as other vacancies.
export function wholeAdvert<J extends { description?: string; title?: string }>(
  job: J,
  html: unknown,
): J {
  const summary = String(job?.description || "").trim();
  if (!summary) return job;
  const lines = text(
    String(html || "").replace(
      /<(script|style|noscript|svg|template|nav|header|footer|form|select|dialog)[\s\S]*?<\/\1>/gi,
      " ",
    ),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const norm = (s: string): string =>
    fold(s)
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const head = norm(summary).slice(0, 40);
  let from =
    head.length >= 20
      ? lines.findIndex((l, i) =>
          `${norm(l)} ${norm(lines[i + 1] || "")}`.includes(head),
        )
      : -1;
  if (from < 0) {
    const title = norm(job.title || "");
    const at = title ? lines.findIndex((l) => norm(l) === title) : -1;
    from = at < 0 ? -1 : at + 1;
  }
  if (from < 0) return job;
  const kept: string[] = [];
  for (const line of lines.slice(from)) {
    if (
      (line.length <= 60 &&
        ENDING.test(fold(line).replace(/^[^a-z0-9]+/, ""))) ||
      BLOB.test(line)
    )
      break;
    kept.push(line);
  }
  const page = kept.join("\n");
  if (
    page.length < summary.length + LONGER_BY ||
    page.length < summary.length * 1.3
  )
    return job;
  const own = words(summary),
    there = words(page);
  if (own.size && [...own].filter((w) => there.has(w)).length < own.size * 0.6)
    return job;
  job.description = page.slice(0, TEXT_KEPT);
  return job;
}

// ➤ Sites write the title and the company with HTML entities in them ("B2B &#8211; Pós-Venda"):
// ➤ what the visitor should read is the character, not the escape.
const str = (v: unknown): string =>
  typeof v === "string"
    ? decodeEntities(v).trim()
    : Array.isArray(v)
      ? str(v[0])
      : v && typeof v === "object"
        ? str(field(v, "name") || field(v, "@value") || field(v, "text"))
        : "";
export function jobPostings(html: unknown, pageUrl: string): Posting[] {
  const out: Posting[] = [];
  // ➤ The type as written, or with its "+" escaped as ASP.NET writes attributes ("ld&#x2B;json").
  for (const m of String(html || "").matchAll(
    /<script[^>]*application\/ld(?:\+|&#x2B;|&#43;)json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let parsed: unknown;
    const block = m[1].replace(/^\s*<!--|-->\s*$/g, "");
    try {
      parsed = JSON.parse(block);
    } catch {
      try {
        parsed = JSON.parse(repairJson(block));
      } catch {
        continue;
      }
    }
    const nodes = many(field(parsed, "@graph") || parsed).flatMap((n) => [
      n,
      ...many(field(n, "mainEntity")),
    ]);
    for (const node of nodes) {
      if (!many(field(node, "@type")).includes("JobPosting")) continue;
      const places = many(field(node, "jobLocation"));
      // ➤ A place's address may be a list of them (a job in several towns): the first one stands.
      const addresses = places.flatMap((l) =>
        ([] as unknown[]).concat(field(l, "address") ?? []),
      );
      const address = addresses.find((a) => a && typeof a === "object") || {
        streetAddress: addresses.find((a) => typeof a === "string") || "",
      };
      const country = str(field(address, "addressCountry"));
      // ➤ Without a town, region or country, the place is whatever the address does say: the
      // ➤ address as one line ("Dublin"), the street's field, its name.
      const location =
        [
          str(field(address, "addressLocality")),
          str(field(address, "addressRegion")),
          country,
        ]
          .filter(Boolean)
          .join(", ") ||
        str(field(address, "streetAddress")) ||
        str(field(address, "name")) ||
        str(places[0]) ||
        (field(node, "jobLocationType") === "TELECOMMUTE" ? "Remote" : "");
      const title = plainTitle(
        str(field(node, "title")) || str(field(node, "name")),
      );
      if (!title) continue;
      const telecommute = many(field(node, "jobLocationType")).includes(
        "TELECOMMUTE",
      );
      const description = field(node, "description");
      const years = experienceYears(field(node, "experienceRequirements"));
      out.push({
        title,
        company: str(field(node, "hiringOrganization")),
        location,
        country: /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : "",
        url: str(field(node, "url")) || pageUrl,
        description: withRequirements(text(description || ""), node),
        posted: day(str(field(node, "datePosted"))),
        expires: day(str(field(node, "validThrough"))),
        remote: telecommute || /remote/i.test(location),
        mode: telecommute ? "remote" : "",
        modeTag: tagMode(typeof description === "string" ? description : ""),
        pay: salaryOf(node),
        // ➤ FULL_TIME, TEMPORARY, INTERN… or the site's own words: the hours and the contract (builder/contract.ts).
        employmentType: many(field(node, "employmentType"))
          .map(str)
          .filter(Boolean)
          .slice(0, 4),
        // ➤ The weekly hours ("40", "40 hours per week") and the experience asked ({"monthsOfExperience": 60}, "5-7 Years"),
        // ➤ when the block states them (1 November 2026).
        ...(str(field(node, "workHours"))
          ? { hours: str(field(node, "workHours")) }
          : {}),
        ...(years !== null ? { years } : {}),
      });
    }
  }
  return out.length ? out : microdataPostings(html, pageUrl);
}

// ➤ The hosts a crawler of employers' own pages never follows: job boards and aggregators
// ➤ (their terms), recruitment agencies, social networks. A host is one of them when the name
// ➤ it is registered under is in the list, whatever the country's ending ("es.indeed.com",
// ➤ "www.reed.co.uk"), or when that whole name is ("jobs.ch"), or when it is a board's own
// ➤ host ("eures.europa.eu"); an employer's host that merely starts with such a word
// ➤ ("talent.siemens.com") is not one. Softy's own site is never followed either: every careers site
// ➤ it hosts links to it, and the hunter read it 1,299 times for 12 of them (17 October 2026). German boards
// ➤ closed by their terms or asking leave had come in as employers' sites (F.A.Z., SZ, studyflix, UNICUM, joblocal, Workwise…).
const BOARD_NAMES = new Set(
  "outsidespy contractspy jobsearch facebook twitter x instagram youtube tiktok xing wikipedia freelance-informatique rollingadz php-resource qreer studentjob jobteaser indeed linkedin glassdoor monster stepstone infojobs epreselec infoempleo tecnoempleo jobrapido jooble adzuna talent neuvoo trovit mitula careerjet jobted jobijoba kimeta jobware stellenanzeigen jobvector hays adecco randstad manpower michaelpage robertwalters reed totaljobs cv-library jobsite welcometothejungle hellowork apec francetravail pole-emploi arbeitsagentur arbeitnow jobscout24 willhaben pracuj olx profesia nofluffjobs justjoin ejobs bestjobs cvbankas cvkeskus duunitori oikotie finn jobindex jobnet arbetsformedlingen ledigajobb blocket jobsora jobsinnetwork jobcenter jobbnorge thelocal eurojobs ziprecruiter simplyhired careerbuilder faz sueddeutsche studyflix yourfirm truffls academics unicum joblocal germantechjobs workwise".split(
    " ",
  ),
);
const BOARD_DOMAINS = new Set([
  "jobs.ch",
  "karriere.at",
  "jobs.cz",
  "jobs.bg",
  "cv.lv",
  "nav.no",
  "jobs.de",
  "job.sk",
]);
const BOARD_OWN_HOSTS = ["eures.europa.eu", "recrutement.softy.pro"];
// ➤ Boards, regional portals and agencies the hunters had brought in as German employers' sites,
// ➤ whose own terms close them to robots (docs/CERRADAS.md) or ask leave (docs/PENDIENTE.md), read
// ➤ by hand on 17 October 2026. By their whole registered name: a namesake (analytik.de) is not one.
const BOARDS_BY_THEIR_TERMS = new Set(
  "analytik.news arbeite-regional.de ausbildungsgenie.de bad-heizung.de bglandjobs.de bingk.de bluum.de chiemgaujobs.de cyber-security-jobs.de datacareer.de dein-waf.de derjobmarkt.de digitalbusiness-magazin.de dnxjobs.de erp.jobs fachkraefte-erzgebirge.de faz.net gs-company.de hipersonalservice.de infranken.de ingenieur-jobboard.de jobkurier.de jobs-oberlausitz.de jobs-regional.de jobsearchplace.co.uk jobverde.de karriere-bergisches-land.de karriere-bremen.de karriere-hamburg.de karriere-in-nordhessen.de karriere-metropole-ruhr.de karriere-mittelhessen.de karriere-suedniedersachsen.de karriere-suedwestfalen.de karriereportal-owl.de kein-bock-zu-pendeln.de kes-informationssicherheit.de mediawerkstatt-bodensee.de midrange.de mitarbeitergesucht.de netzundwerke.de neue-jobs.io nordkurier.de office-people.de ohmyjob.de oproma.de personalgarantie.de pr-jobs.net pro-linux.de psm-personalservice.de regionaler-jobverbund.de rems-murr-jobs.de schwaebische.de shz.de space-jobs.de stellenpiraten.de techniker-forum.de unicum.de werkia.de wochenspiegellive.de workwise.io".split(
    " ",
  ),
);
export function isBoardHost(host: unknown): boolean {
  const h = String(host || "").toLowerCase(),
    reg = registrable(h);
  return (
    BOARD_NAMES.has(reg.split(".")[0]) ||
    BOARD_DOMAINS.has(reg) ||
    BOARDS_BY_THEIR_TERMS.has(reg) ||
    BOARD_OWN_HOSTS.some((b) => h === b || h.endsWith(`.${b}`))
  );
}

// ➤ The words a careers link carries, in the languages of the sites read.
const CAREER_WORDS =
  /(?:^|[^a-z])(?:careers?|jobs?|vacanc(?:y|ies)|talento?|[uú]nete|trabajar|emprego|recruit(?:ing|ment)?|work[-\s]with[-\s]us|join[-\s]us|work(?:ing)?[-\s](?:with|for|at)[-\s]us|empleo|trabaja[-\s]con[-\s]nosotros|ofertas[-\s]de[-\s]empleo|carri[eè]res?|emplois?|recrutement|nous[-\s]rejoindre|karriere|stellen(?:angebote|anzeigen)?|vacatures?|werken[-\s]bij|lediga[-\s]jobb|jobb|ledige[-\s]stillinger|stillinger|kariera|praca|oferty[-\s]pracy|lavora[-\s]con[-\s]noi|carriere|posizioni[-\s]aperte|carreiras?|recrutamento|voln[aá][-\s]m[ií]sta|kari[eé]ra|vakances)(?![a-z])/i;

// ➤ The host a company moved its careers to, as its front page links them: another host of its own domain whose name
// ➤ is a careers word (karriere.miele.de from ausbildung.miele.de, careers.nagel-group.com from karriere.nagel-group.com).
export function careersHost(html: unknown, pageUrl: string): string {
  const own = new URL(pageUrl).hostname;
  for (const link of careerLinks(html, pageUrl)) {
    const host = new URL(link).hostname;
    if (
      host !== own &&
      registrable(host) === registrable(own) &&
      CAREER_WORDS.test(host.split(".")[0])
    )
      return host;
  }
  return "";
}

// ➤ The one host a tenant's page names on another platform (`tenants`: the domains whose many hosts are tenants, as
// ➤ helixjobs.com's), when it names exactly one: where the platform moved that tenant. Not one already read (`read`).
export function tenantHost(
  html: unknown,
  pageUrl: string,
  tenants: Set<string>,
  read: Set<string>,
): string {
  const own = registrable(new URL(pageUrl).hostname);
  const hosts = new Set(
    [
      ...String(html || "").matchAll(
        /https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi,
      ),
    ]
      .map((m) => m[1].toLowerCase())
      .filter((h) => registrable(h) !== own && tenants.has(registrable(h))),
  );
  const [host] = hosts;
  return hosts.size === 1 && !read.has(host) ? host : "";
}

// ➤ The links on a page that lead to a careers section, by the words in their address or
// ➤ their text; the address is the stronger sign, a link to another host (an ATS) stronger
// ➤ still. Ordered by that, strongest first.
export function careerLinks(html: unknown, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const scored = new Map<string, number>();
  for (const m of String(html || "").matchAll(
    /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    let u;
    try {
      u = new URL(text(m[1]), base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || isBoardHost(u.hostname)) continue;
    const label = text(m[2]).replace(/\s+/g, " ").trim();
    const inHref = CAREER_WORDS.test(u.hostname + u.pathname),
      inText = CAREER_WORDS.test(label);
    if (!inHref && !inText) continue;
    const href = u.href.split("#")[0];
    scored.set(
      href,
      Math.max(
        scored.get(href) || 0,
        (inHref ? 2 : 0) + (inText ? 1 : 0) + (u.host === base.host ? 0 : 2),
      ),
    );
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u);
}

// ➤ What a sitemap gives a hunt whose home page links no careers page: the addresses that look like a careers page or
// ➤ a vacancy, shortest first (a listing before its vacancies), and of an index the children, two at most, whose name
// ➤ says vacancies ("job_listing-sitemap.xml", "vacatures-sitemap.xml").
const VACANCY_SITEMAP =
  /job|vacan|career|karriere|stellen|emploi|empleo|vacature|recrut|kariera|praca|lavoro|trabaj/i;
const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
};
const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
export function sitemapCareers({ index, items }: Sitemap): {
  pages: string[];
  children: string[];
} {
  const urls = items.map((i) => i.url);
  if (index)
    return {
      pages: [],
      children: urls.filter((u) => VACANCY_SITEMAP.test(pathOf(u))).slice(0, 2),
    };
  return {
    pages: urls.filter(looksLikeJob).sort((a, b) => a.length - b.length),
    children: [],
  };
}

// ➤ Where a /jobs.xml feed is worth asking for: SuccessFactors' career sites publish every advert there, and so do
// ➤ Pinpoint's and many careers hosts of their own. Of 100 sites the hunters read through one, 68 carried
// ➤ SuccessFactors' files and 28 of the other 32 had a careers, jobs or recruitment host (5 November 2026).
const FEED_MARKS = /successfactors|jobs2web|rmkcdn|sapsf/i;
export const feedLikely = (url: string, html: unknown = ""): boolean =>
  /career|job|recruit|vacan|pinpointhq/i.test(hostOf(url)) ||
  FEED_MARKS.test(String(html).slice(0, 300_000));

// ➤ The next page of a listing: a rel="next" link, or a link that says "next" in the
// ➤ languages of the sites read. Empty when the listing ends.
const NEXT_WORDS =
  /^(?:next|next page|siguiente|suivant|suivante|weiter|nächste|volgende|nästa|neste|næste|następna|dalej|další|seguente|successiva|próxima|seguinte|›|»|>|→)$/i;
export function nextLink(html: unknown, pageUrl: string): string {
  const base = new URL(pageUrl);
  const s = String(html || "");
  // ➤ Tag by tag, then its attributes: one pattern over the whole tag backtracked quadratically on a long one (RAS-11).
  const hrefOf = (tag: string): string | undefined =>
    (tag.match(/\bhref\s*=\s*["']([^"'#]+)["']/i) || [])[1];
  const rel = [...s.matchAll(/<(?:a|link)\s[^<>]*>/gi)].find(
    (m) => /\brel\s*=\s*["']next["']/i.test(m[0]) && hrefOf(m[0]),
  );
  // ➤ ...or the address a list's own script turns the page with (Umantis: data-pagination-next-href).
  let found =
    (rel && hrefOf(rel[0])) ||
    (s.match(/data-pagination-next-href\s*=\s*["']([^"'#]+)/i) || [])[1] ||
    "";
  if (!found) {
    const lower = s.toLowerCase();
    let close = -1;
    for (const m of s.matchAll(/<a\s[^<>]*>/gi)) {
      const href = hrefOf(m[0]);
      if (!href) continue;
      const from = m.index + m[0].length;
      if (close < from) close = lower.indexOf("</a>", from);
      if (close < 0) break; // ➤ no closing tag left
      const label = text(s.slice(from, close)).replace(/\s+/g, " ").trim();
      if (
        NEXT_WORDS.test(label) ||
        /aria-label\s*=\s*["'](?:next|siguiente|suivant|weiter|volgende|nästa)/i.test(
          m[0],
        )
      ) {
        found = href;
        break;
      }
    }
  }
  if (!found) return "";
  try {
    const u = new URL(text(found), base);
    return u.host === base.host && u.href !== base.href ? u.href : "";
  } catch {
    return "";
  }
}

// ➤ The platform behind a careers address, from the address itself or from what the page
// ➤ embeds or links to: an ATS with its slug (read through the boards adapter), a vendor
// ➤ whose pages are drawn by JavaScript (named, not read), or nothing known (a site, read
// ➤ through its feed, sitemap or listing).
const ATS_MARKS: [string, RegExp][] = [
  [
    "greenhouse",
    /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/i,
  ],
  ["lever", /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_-]+)/i],
  ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i],
  [
    "smartrecruiters",
    /(?:jobs|careers)\.smartrecruiters\.com\/(?!my-applications|oneclick-ui|sign-in|api)([A-Za-z0-9_-]+)/,
  ],
  ["recruitee", /https?:\/\/([a-z0-9-]+)\.recruitee\.com/i],
  ["personio", /https?:\/\/([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/i],
  ["workable", /apply\.workable\.com\/(?!api\/)([a-z0-9-]+)/i],
  [
    "teamtailor",
    /https?:\/\/(?!tt\.|cdn\.|static\.|app\.|www\.|assets\.|images\.|api\.)([a-z0-9-]+)\.teamtailor\.com/i,
  ],
  [
    "workday",
    /https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Za-z]{2}\/)?(?!wday\/)([A-Za-z0-9_-]+)/,
  ],
  [
    "oracle",
    /https?:\/\/([a-z0-9.-]+\.oraclecloud\.com)\/hcmUI\/CandidateExperience\/[a-z]{2}\/sites\/([A-Za-z0-9_]+)/,
  ],
  [
    "cornerstone",
    /https?:\/\/((?!(?:www|api|eu-fra)\.)[a-z0-9-]+)\.csod\.com\/ux\/ats\/careersite\/(\d+)\//i,
  ],
  // ➤ d.vinci: an account on dvinci-hr.com, or a d.vinci easy or dvinci.de site, read by its whole host.
  [
    "dvinci",
    /https?:\/\/((?!(?:www|static|cdn|assets|api)\.)[a-z0-9-]+\.(?:dvinci-hr\.com|dvinci-easy\.com|dvinci\.de))/i,
  ],
];
// ➤ Each name is looked for only where a host name can start: unanchored, a page carrying a run of
// ➤ millions of letters and digits (an inline file) made each search take hours.
const VENDOR_MARKS: [string, RegExp][] = [
  ["icims", /(?<![a-z0-9-])[a-z0-9-]+\.icims\.com/i],
  ["eightfold", /(?<![a-z0-9-])[a-z0-9-]+\.eightfold\.ai/i],
  ["taleo", /(?<![a-z0-9-])[a-z0-9-]+\.taleo\.net/i],
  ["softgarden", /(?<![a-z0-9-])[a-z0-9-]+\.softgarden\.io/i],
];
export type Platform = { ats?: string; slug?: string; vendor?: string };
export function detectPlatform(url: string, html: unknown = ""): Platform {
  const s = `${url}\n${String(html || "")}`;
  for (const [ats, re] of ATS_MARKS) {
    const m = s.match(re);
    if (!m) continue;
    if (ats === "workday") return { ats, slug: `${m[1]}.${m[2]}/${m[3]}` };
    if (ats === "oracle") return { ats, slug: `${m[1]}/${m[2]}` };
    if (ats === "cornerstone")
      return { ats, slug: `${m[1].toLowerCase()}/${m[2]}` };
    if (ats === "dvinci")
      return { ats, slug: m[1].toLowerCase().replace(/\.dvinci-hr\.com$/, "") };
    return { ats, slug: m[1] };
  }
  // ➤ A Teamtailor site on the company's own domain: the page carries the vendor's assets, and
  // ➤ its /jobs.rss reads like any Teamtailor board.
  if (/teamtailor/i.test(String(html || ""))) {
    try {
      return { ats: "teamtailor", slug: new URL(url).origin };
    } catch {
      /* no origin */
    }
  }
  for (const [vendor, re] of VENDOR_MARKS) if (re.test(s)) return { vendor };
  return {};
}

// ➤ The softgarden board a page names: its own address on softgarden.io, else the organisation of its
// ➤ JSON-LD ("@id": "https://acme.softgarden.io/#organization"), else the board its imprint lives on (a
// ➤ career site's footer, x.career.softgarden.de or on the employer's domain), else the first board it
// ➤ names, else the career site's name. A career site's name is often not its board's
// ➤ ("apprenticeship-and-students-acme"), nor is a sister firm's site it links to, and softgarden's own
// ➤ hosts (its analytics, "matomo") are none.
const SOFTGARDEN_OWN =
  /^(?:www|cdn|static|assets|api|app|widgets?|pcw-cdn|matomo|certificate)$/i;
export function softgardenBoard(url: string, html: unknown = ""): string {
  const s = String(html || "");
  const named = [
    String(url).match(/\/\/([a-z0-9-]+)\.softgarden\.io\b/i),
    s.match(
      /"(?:@id|sameAs)"\s*:\s*"https?:\\?\/\\?\/([a-z0-9-]+)\.softgarden\.io\b/i,
    ),
    s.match(
      /\/\/([a-z0-9-]+)\.softgarden\.io\/(?:imprint|data-security|get-connected)\b/i,
    ),
    ...s.matchAll(/(?<![a-z0-9-])([a-z0-9-]+)\.softgarden\.io/gi),
    s.match(/(?<![a-z0-9-])([a-z0-9-]+)\.career\.softgarden\.de/i),
  ];
  return (
    named
      .map((m) => m?.[1]?.toLowerCase())
      .find((b) => b && !SOFTGARDEN_OWN.test(b)) || ""
  );
}

// ➤ Where a platform keeps a tenant's list, for a hunt that starts on the tenant's host (from Common
// ➤ Crawl): umantis' home names it nowhere a careers link would, Softy's home is that very list, and a
// ➤ softgarden career site names its board on its home page. A tenant moved to the employer's own
// ➤ domain is known by the host it was given.
const PLATFORM_LISTS: [RegExp, string][] = [
  [/\.umantis\.com$/i, "/Jobs/All"],
  [/\.softy\.pro$/i, "/offers"],
  [/\.career\.softgarden\.de$/i, "/"],
];
export const platformLists = (base: string, domain: string): string[] =>
  PLATFORM_LISTS.filter(
    ([re]) => re.test(new URL(base).hostname) || re.test(domain),
  ).map(([, path]) => base + path);

// ➤ The company a feed belongs to, from its channel title: "Jobs at SAP", "Careers at Vestas",
// ➤ "Ofertas de empleo de Navantia" are SAP, Vestas, Navantia.
export function feedName(xml: unknown): string {
  const title = text(
    (String(xml || "").match(/<channel>\s*<title>([\s\S]*?)<\/title>/i) ||
      [])[1] || "",
  ).trim();
  const name = title
    .replace(
      /^(?:jobs?|careers?|vacancies|vacatures|stellen(?:angebote)?|ofertas(?:\s+de\s+(?:empleo|trabajo))?|offres(?:\s+d'emploi)?|emplois?)\s+(?:at|en|de|bei|chez|van|with|@)\s+/i,
      "",
    )
    .replace(/\s*[-|:]\s*(?:jobs?|careers?|karriere|empleo)\s*$/i, "")
    .trim();
  return genericName(name) ? "" : name;
}

// ➤ A name that names no employer: TÜV SÜD's feed is titled "Jobs", Enercon's site came out as
// ➤ "Career", the Swiss federal administration's as "Bewerbung". Such a name is never shown.
const GENERIC_NAME =
  /^(?:jobs?|careers?|career site|hoofdkantoor|head ?office|headquarters|karriere(?:portal)?|stellen(?:angebote|anzeigen|markt|portal)?|offene stellen|job ?portal|jobb(?:ö|oe)rse|vacatures|vacancies|empleos?|trabaja con nosotros|emplois?|offres d'emploi|carri(?:e|è)res?|recrutement|lavora con noi|work with us|join us|home(?: ?page)?|startseite|accueil|inicio|welcome|willkommen|current openings|open positions|job openings|job search|search jobs|rss|feed|all jobs|alle jobs|recruiting|bewerbung(?:sportal)?|candidate portal|career portal|(?:jobs?|karriere) (?:&|und|and) (?:karriere|careers?|jobs?)|untitled|unknown|n\/a|null|undefined)$/i;
// ➤ Nor does one that carries an e-mail address or a phone number: that is a person's contact line
// ➤ (a site's "Geschäftsführer Tel.: +49 …" was once read as its name).
const CONTACT_LINE = /@|(?:\d[\s/().-]*){9}/;
export const genericName = (name: unknown): boolean => {
  const s = String(name || "")
    .replace(/[\s.:|·–—-]+$/, "")
    .trim();
  return !s || GENERIC_NAME.test(s) || CONTACT_LINE.test(s);
};

// ➤ The name a site gives itself on its pages: its og:site_name, else the shortest part of its
// ➤ title, less the words that name no one ("TÜV SÜD Group Careers" is TÜV SÜD Group, "Careers
// ➤ At Amey" is Amey, "VW Jobportal" is VW, "Karriere | Weishaupt" is Weishaupt). A slogan, a
// ➤ login or an error page names no one.
const GENERIC_WORDS =
  /\b(?:jobs?|careers?|karriere(?:-?portal)?|bewerbungsportal|beruf|stellenangebote|stellendetails|stellenanzeige|stellenmarkt|job ?portal|jobb(?:ö|oe)rse|job details|vacancies|vacatures|emplois?|empleos?|offres d'emploi|carri(?:e|è)res?|recrutement|recruitment|recruiting|startseite|home|welcome|willkommen)\b/gi;
const LEADING =
  /^(?:(?:at|bei|chez|with|en|de|bij|i|in|im|und|and|et|y|for|für|zu|to|@)(?:\s+|$))+/i;
const NOT_A_NAME =
  /^\d{3}\b|^#|forbidden|not found|access denied|error|just a moment|attention required|nicht gefunden|^start$|\$|anmelden|log ?in|sign ?in|explore|entdecke|deine?|your|unsere?|our\b/i;
const nameParts = (title: string): string[] =>
  text(title)
    .split(/\s+[|–—·-]\s+|:\s+/)
    .map((p) =>
      p
        .replace(GENERIC_WORDS, " ")
        .replace(/[-\s]+(?=\.)/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(LEADING, "")
        .replace(/[\s,&:-]+$/, "")
        .trim(),
    )
    .filter(
      (p) =>
        p.length >= 2 &&
        p.length <= 40 &&
        !genericName(p) &&
        !NOT_A_NAME.test(p),
    );
export function pageName(html: unknown): string {
  const meta = (String(html || "").match(/<meta[^>]*og:site_name[^>]*>/i) ||
    [])[0];
  const site = nameParts(
    meta ? (meta.match(/content=["']([^"']*)["']/i) || [])[1] || "" : "",
  );
  if (site.length) return site[0];
  const title = nameParts(
    (String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ||
      "",
  );
  return title.sort((a, b) => a.length - b.length)[0] || "";
}

// ➤ A name from a site's address, when its pages give none: the registrable label, past "jobs."
// ➤ or "careers.", so career.enercon.de is Enercon and careers.amey.co.uk is Amey. A platform's
// ➤ address (SAP's, a test site's) or a label that is no name ("admin", "cloud") gives none.
const PLATFORM_HOST =
  /(?:^|\.)(?:jobs2web\.com|cloud\.sap|successfactors\.(?:com|eu)|sapsf\.(?:com|eu)|umantis\.com|softgarden\.(?:io|de)|personio\.(?:de|com)|myworkdayjobs\.com|oraclecloud\.com|taleo\.net|csod\.com|recruitee\.com|teamtailor\.com|workable\.com|lever\.co|greenhouse\.io|smartrecruiters\.com|rexx-systems\.com|rexx-recruitment\.com|dvinci-easy\.com|dvinci-hr\.com|dvinci\.de|onlyfy\.jobs|join\.com|concludis\.de|hr4you\.org|talent-soft\.com|factorialhr\.com|dvvbw\.de)$|(?:^|\.)(?:stage|staging|test|dev)\./i;
const NO_NAME_LABEL =
  /^(?:admin|cloud|portal|app|apps|web|online|site|my|hr|intranet|jobs?|careers?|career|karriere|bewerbung)$/;
export function hostName(host: unknown): string {
  const bare = String(host || "")
    .replace(/^https?:\/\//, "")
    .replace(/[/:].*$/, "")
    .toLowerCase();
  if (PLATFORM_HOST.test(bare)) return "";
  const labels = registrable(bare).split(".");
  const label = labels.length > 1 ? labels[0] : "";
  return NO_NAME_LABEL.test(label)
    ? ""
    : label
        .split("-")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// ➤ A site with no https at all (its port 443 shut, or a certificate that is another's) serves its pages over
// ➤ plain http: asked so only where both https addresses answered nothing, and at once. A dead host waits out
// ➤ its timeout there and would only wait twice more (27 October: of 70 live sites that had "answered nothing"
// ➤ within 5 s, 28 served their pages over http alone; of those that took 30 s or more, three in four still
// ➤ answered nothing at all).
export const PLAIN_HTTP_MS = 8000;
export const plainHttpToo = (statuses: unknown[], ms: number): boolean =>
  statuses.length > 0 &&
  statuses.every((s) => s === "no answer") &&
  ms < PLAIN_HTTP_MS;
