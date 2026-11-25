import { gunzipSync } from "node:zlib";
import { parseDay } from "./dates.js";
import { pageText } from "./text.js";

// Reading a site the way a search engine does: its sitemaps name the addresses of its vacancy pages (job portals FR-3;
// the careers sites of 016 too). The legacy's builder/lib/crawl.ts (`elements`, `parseSitemap`, `looksLikeJob`) and
// builder/lib/sitemap-text.ts, pure functions of the sitemap's text; the fetching is the reader's.

export interface SitemapItem {
  readonly url: string;
  // The day the sitemap gives (YYYY-MM-DD), or "".
  readonly lastmod: string;
}
export interface Sitemap {
  readonly index: boolean;
  readonly items: readonly SitemapItem[];
}

// What lies between each opening tag and its closing one, the next opening tag ending the search: a lazy «[\s\S]*?»
// ran to the end of the text for every opening tag left unclosed, quadratic on a hostile page (the legacy's RAS-11).
export function elements(text: string, open: RegExp, close: RegExp): string[] {
  const starts = [...text.matchAll(open)].map((match) => [
    match.index,
    match.index + match[0].length,
  ]);
  return starts.flatMap(([, from], k) => {
    const part = text.slice(
      from,
      k + 1 < starts.length ? starts[k + 1]![0] : text.length,
    );
    const end = part.search(close);
    return end < 0 ? [] : [part.slice(0, end)];
  });
}

// A sitemap or a sitemap index: the addresses it lists, with their lastmod when given. An RSS feed of vacancies is read
// the same way: its items' links and days. Some sitemaps give their tags attributes (`<loc xmlns="">`) and the day as
// milliseconds.
export function parseSitemap(xml: string): Sitemap {
  if (!/<(?:urlset|sitemapindex)/i.test(xml) && /<rss|<item>/i.test(xml)) {
    return {
      index: false,
      items: elements(xml, /<item>/gi, /<\/item>/i).flatMap((item) => {
        const link = /<link>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)/i.exec(item)?.[1];
        return link
          ? [
              {
                url: pageText(link).trim(),
                lastmod:
                  parseDay(
                    /<pubDate>([^<]+)<\/pubDate>/i.exec(item)?.[1] ?? "",
                  ) ?? "",
              },
            ]
          : [];
      }),
    };
  }
  const index = /<sitemapindex/i.test(xml);
  const items = elements(
    xml,
    /<(?:url|sitemap)(?:\s[^<>]*)?>/gi,
    /<\/(?:url|sitemap)>/i,
  ).flatMap((entry) => {
    const loc = /<loc(?:\s[^<>]*)?>\s*([^<\s]+)\s*<\/loc>/i.exec(entry)?.[1];
    const lastmod =
      /<lastmod(?:\s[^<>]*)?>\s*([^<\s]+)\s*<\/lastmod>/i.exec(entry)?.[1] ??
      "";
    return loc
      ? [
          {
            url: pageText(loc).trim(),
            lastmod: /^\d{12,13}$/.test(lastmod)
              ? new Date(Number(lastmod)).toISOString().slice(0, 10)
              : lastmod.slice(0, 10),
          },
        ]
      : [];
  });
  return { index, items };
}

// The most sitemaps.org lets one sitemap weigh: a small gzipped file can unpack to gigabytes.
export const SITEMAP_MAX = 50 * 1024 * 1024;

// A sitemap's text, also when it comes as a gzipped file rather than gzipped in transit (sitemap.xml.gz).
export function sitemapText(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return buffer[0] === 0x1f && buffer[1] === 0x8b
    ? gunzipSync(buffer, { maxOutputLength: SITEMAP_MAX }).toString("utf8")
    : buffer.toString("utf8");
}

// A sitemap that leaves the scheme out of its addresses ("emploi.cnrs.fr/Offres/…") means https.
export const withScheme = (url: string): string =>
  /^[a-z]+:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;

// Addresses that look like vacancy pages, in the languages of the sites read.
const JOBBY =
  /\/(?:[a-z]{2}\/)?(?:jobs?|jobb|joburi|job[-_]?(?:detail|offer|posting|opening|listing|ad)s?|vacanc(?:y|ies)|vacante|vacantes|vacature|vacatures|werken-bij|vakance|vakances|career|careers|carriere|carrieres|carreira|carreiras|cariere|karriere|karrier|kariera|karijera|stellen(?:angebot|anzeige|markt)?[en]?|offene-stellen|stelle|offres?(?:-d-?emploi)?|offer|emplois?|postes?|empleo|ofertas?(?:-de-(?:empleo|trabajo))?|trabajo|trabalho|vaga|vagas|lavoro|posizion[ei]|lediga-jobb|ledige-stillinger|stilling|stillinger|tyopaikat|avoimet|rekry|praca|oferty|volna-mista|nabidka|kariera|allas|allasok|posao|zaposlitev|darbo|toopakkumised|position|positions|opening|openings|recruit|recrutement|rekrutacja)(?:[/?#.-]|$)/i;
// Some sites put the whole title in the address and mark the vacancy with the number it carries on their system, with no
// job word anywhere: rexx does it ("IT-Operations-Manager-de-j1186.html"); Softy numbers them under an English word
// ("/offers/224990").
const NUMBERED = /-[a-z]{2,3}-j\d+\.html$|^\/offers\/\d+\/?(?:[?#]|$)/;
export const looksLikeJob = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
  return JOBBY.test(path) || NUMBERED.test(path);
};
