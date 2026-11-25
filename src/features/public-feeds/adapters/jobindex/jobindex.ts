import * as cheerio from "cheerio";
import type { AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Denmark: Jobindex, read as search engines read it. Its robots.txt lets in the first page of
// each listing but not the next ones ("page=" is closed), so the first page of each of its ten
// main categories (the twenty newest each) is read every hour, and an advert seen stays until
// its own last day (keepUnlisted).
export const CATEGORIES = 10;
export const categoryPage = (supid: number) =>
  `https://www.jobindex.dk/jobsoegning?supid=${supid}`;

interface Result {
  readonly tid?: string | number;
  readonly headline?: string;
  readonly is_archived?: boolean;
  readonly addresses?: readonly { readonly city?: string }[];
  readonly area?: string;
  readonly companytext?: string;
  readonly company?: { readonly name?: string };
  readonly share_url?: string;
  readonly html?: string;
  readonly firstdate?: string;
  readonly lastdate?: string;
}

// The array after `"results":` in the page's own data, read whole by its brackets (its strings
// may hold any character).
export function resultsOf(page: string): unknown[] {
  const at = page.indexOf('"results":[');
  if (at < 0) return [];
  const start = at + '"results":'.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < page.length; index++) {
    const character = page[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "[" || character === "{") depth++;
    else if (character === "]" || character === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(page.slice(start, index + 1));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

// The advert's own words in a result's card: its paragraphs and list items, not its menus.
function cardText(html: string): string {
  const $ = cheerio.load(html);
  return $("p, li")
    .toArray()
    .map((element) => pageText($(element).html() ?? ""))
    .filter(Boolean)
    .join("\n");
}

export function parseJobindex(page: string): AdvertDraft[] {
  return (resultsOf(page) as (Result | null)[]).flatMap((result) => {
    if (!result?.tid || !result.headline || result.is_archived) return [];
    // The town of its first address, else the first place the area names
    // ("Viborg og mulighed for hjemmearbejde").
    const town = (
      result.addresses?.[0]?.city ??
      (result.area ?? "").split(/,| og /)[0] ??
      ""
    ).trim();
    const draft: AdvertDraft = {
      source: "jobindex",
      sourceId: String(result.tid),
      title: plainText(result.headline),
      company: plainText(result.companytext ?? result.company?.name ?? ""),
      location: [town, "Danmark"].filter(Boolean).join(", "),
      country: "dk",
      city: town,
      remote: false,
      url: result.share_url ?? `https://www.jobindex.dk/vis-job/${result.tid}`,
      description: cardText(result.html ?? ""),
      occupationCodes: {},
      language: "da",
    };
    const posted = parseDay(result.firstdate);
    const expires = parseDay(result.lastdate);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

export const jobindex = publicFeed({
  definition: {
    id: "jobindex",
    kind: "feed",
    licence: {
      name: "Jobindex",
      short: "Jobindex",
      url: "https://www.jobindex.dk/",
      licence:
        "Read as search engines read it: robots.txt obeyed, each advert linking to Jobindex",
      credit: "via Jobindex",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  pages: Array.from({ length: CATEGORIES }, (_, index) =>
    categoryPage(index + 1),
  ),
  parse: parseJobindex,
  skipFailedPages: true,
  keepUnlisted: true,
});
