import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { jobPostings } from "../../../../shared/kit/job-posting.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed, withDetailPages } from "../../family.js";
import { stated } from "../../stated.js";

// Poland: Infopraca, read through its own search. Its terms name no bots and ask no leave, its
// robots.txt opens its searches and their pages (pg=), and a search asked for JSON answers the
// list its page is drawn from: eighteen offers a page. Our occupations' words in Polish are
// searched, every page of each; an offer gone from a whole pass is closed. The list has no
// text: each new offer's own page (its JobPosting block) is read once and kept.
const PAGE = 18;
const MAX_PAGES = 150;
// Own pages read a pass. The legacy read only offers its gate took (up to 1,500); without the
// gate here, every new offer is read, fewer at a time (public-feeds plan section 5).
export const DETAILS_A_PASS = 300;

// The words our occupations' adverts are written with in Polish; the gate decides what is ours.
export const QUERIES = [
  "inżynier",
  "technik",
  "elektryk",
  "elektronik",
  "elektromonter",
  "automatyk",
  "mechanik",
  "mechatronik",
  "programista",
  "informatyk",
  "tester",
  "administrator systemów",
  "devops",
  "analityk systemów",
  "konstruktor",
  "projektant",
  "technolog",
  "kierownik budowy",
  "majster",
  "inspektor nadzoru",
  "geodeta",
  "architekt",
  "energetyk",
  "spawacz",
  "ślusarz",
  "tokarz",
  "frezer",
  "operator cnc",
  "monter",
  "serwisant",
  "utrzymanie ruchu",
  "hydraulik",
  "instalator",
  "lakiernik",
  "stolarz",
  "cieśla",
  "murarz",
  "dekarz",
  "blacharz",
  "brygadzista",
] as const;

// Page 1 is the search without `pg` (asked with pg=1, it redirects there).
export const searchUrl = (query: string, page: number) =>
  `https://www.infopraca.pl/praca?q=${encodeURIComponent(query)}${page > 1 ? `&pg=${page}` : ""}`;

// "Trzebnica, 55-100", "38-543 Nowy Łupków": the town without its postcode.
export const townOf = (text: string) =>
  text
    .replace(/\b\d{2}-\d{3}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();

interface Item {
  readonly id?: string | number;
  readonly title?: string;
  readonly url?: string;
  readonly city?: string;
  readonly company_name?: string;
}

export function parseSearch(json: string): {
  readonly items: number;
  readonly drafts: AdvertDraft[];
} {
  const parsed: unknown = JSON.parse(json);
  const items = Array.isArray(parsed) ? (parsed as (Item | null)[]) : [];
  const drafts = items.flatMap((item): AdvertDraft[] => {
    if (
      !item?.id ||
      !item.title ||
      !item.url?.startsWith("https://www.infopraca.pl/")
    )
      return [];
    const city = townOf(plainText(item.city ?? ""));
    return [
      {
        source: "infopraca",
        sourceId: String(item.id),
        title: plainText(item.title),
        company: plainText(item.company_name ?? ""),
        location: [city, "Polska"].filter(Boolean).join(", "),
        country: "pl",
        city,
        remote: false,
        url: item.url,
        description: "",
        occupationCodes: {},
        language: "pl",
      },
    ];
  });
  return { items: items.length, drafts };
}

// What an offer's own page adds: its text, its days and its employment types.
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const [posting] = jobPostings(html, draft.url);
  if (!posting) return draft;
  return {
    ...draft,
    description: posting.description,
    ...(posting.posted ? { posted: posting.posted } : {}),
    ...(posting.validThrough ? { expires: posting.validThrough } : {}),
    ...stated({ employmentType: posting.employmentType }),
  };
}

function withKnown(draft: AdvertDraft, known: AdvertDraft): AdvertDraft {
  return {
    ...draft,
    description: known.description,
    ...(known.posted ? { posted: known.posted } : {}),
    ...(known.expires ? { expires: known.expires } : {}),
    ...(known.employmentType ? { employmentType: known.employmentType } : {}),
  };
}

async function* readInfopraca(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const listed = new Map<string, AdvertDraft>();
  for (const query of QUERIES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { items, drafts } = parseSearch(
        (
          await context.http.request(searchUrl(query, page), {
            headers: { accept: "application/json" },
          })
        ).body,
      );
      for (const draft of drafts) listed.set(draft.sourceId, draft);
      if (items < PAGE) break;
    }
  }
  yield* withDetailPages(listed.values(), context, {
    most: DETAILS_A_PASS,
    read: withPage,
    keep: withKnown,
  });
}

export const infopraca = publicFeed({
  definition: {
    id: "infopraca",
    kind: "feed",
    licence: {
      name: "Infopraca.pl",
      short: "Infopraca",
      url: "https://www.infopraca.pl/",
      licence:
        "Read as its own search shows them; each offer links to Infopraca",
      credit: "via Infopraca.pl",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readInfopraca,
});
