import type {
  AdapterContext,
  AdvertDraft,
  SourceAdapter,
} from "../crawl-core/ports.js";
import type { Licence } from "../../shared/schemas/source.js";
import { parseDay } from "../../shared/kit/dates.js";
import { jobPostings } from "../../shared/kit/job-posting.js";
import { plainText } from "../../shared/kit/text.js";
import { publicFeed, withDetailPages } from "./family.js";
import { stated } from "./stated.js";

// Finland's public-sector job platform, run for the municipalities and wellbeing services
// counties (Kuntarekry) and for the State (Valtiolle.fi). Its list answers in JSON when asked
// (format=json, 48 a page) with each vacancy's title, employer, towns and days; its text comes
// from the JobPosting block of its own page, read once and kept. robots.txt lets crawlers in, the
// sites have no terms of use. A vacancy gone from the whole list is closed.
const PAGE = 48;
// About 9,600 vacancies, past either site's size.
const LIST_PAGES = 200;
// Vacancy pages read in one pass; the others are read in the next ones and show meanwhile with
// what the list says.
export const PAGES_A_PASS = 800;

export interface PlatformSite {
  readonly id: string;
  readonly base: string;
  readonly licence: Licence;
}

interface ListItem {
  readonly id?: string | number;
  readonly title?: string;
  readonly url?: string;
  readonly profit_center?: string;
  readonly publication_date?: string;
  readonly publication_end?: string;
  readonly region?: string;
  readonly location_tags?: readonly string[];
  readonly employment_type?: string;
}

// An open application is a standing invitation, not a vacancy.
const OPEN_APPLICATION = /^\s*(avoin hakemus|öppen ansökan|open application)/i;

export const listUrl = (base: string, page: number) =>
  `${base}/fi/tyopaikat/sivu${page}/?format=json&limit=${PAGE}`;

export function parseList(
  json: string,
  site: Pick<PlatformSite, "id" | "base">,
): { readonly items: number; readonly drafts: AdvertDraft[] } {
  const parsed: unknown = JSON.parse(json);
  const items = Array.isArray(parsed) ? (parsed as (ListItem | null)[]) : [];
  const drafts = items.flatMap((item) => {
    if (
      !item?.id ||
      !item.title ||
      !item.url ||
      OPEN_APPLICATION.test(item.title)
    )
      return [];
    const towns = (item.location_tags ?? [])
      .map((t) => t.trim())
      .filter(Boolean);
    const draft: AdvertDraft = {
      source: site.id,
      sourceId: String(item.id),
      title: plainText(item.title),
      company: plainText(item.profit_center ?? ""),
      location: [towns.join(", ") || (item.region ?? "").trim(), "Suomi"]
        .filter(Boolean)
        .join(", "),
      country: "fi",
      city: towns[0] ?? "",
      remote: false,
      url: new URL(item.url, site.base).href,
      description: "",
      occupationCodes: {},
      language: "fi",
      // «Kokoaikatyö», «Osa-aikatyö», «Heltidsarbete»: 88 % of the list.
      ...stated({ hours: item.employment_type }),
    };
    const posted = parseDay(item.publication_date);
    const expires = parseDay(item.publication_end);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
  return { items: items.length, drafts };
}

// The later of two closing days: a deadline the employer moved on stays moved.
const later = (a: string | undefined, b: string | undefined) =>
  [a, b]
    .filter((day): day is string => Boolean(day))
    .toSorted()
    .at(-1);

// What a vacancy's own page adds: its text, its closing day and its block's employment types
// («Kokoaikatyö, Työpaikka, Vakinainen, Työsuhde»: the hours and the contract).
export function withPage(draft: AdvertDraft, html: string): AdvertDraft {
  const [posting] = jobPostings(html, draft.url);
  if (!posting) return draft;
  const expires = later(draft.expires, posting.validThrough);
  return {
    ...draft,
    description: posting.description,
    ...(expires ? { expires } : {}),
    ...stated({
      employmentType: posting.employmentType.flatMap((type) =>
        type.split(/\s*,\s*/),
      ),
    }),
  };
}

function withKnown(draft: AdvertDraft, known: AdvertDraft): AdvertDraft {
  const expires = later(draft.expires, known.expires);
  return {
    ...draft,
    description: known.description,
    ...(expires ? { expires } : {}),
    ...(known.employmentType ? { employmentType: known.employmentType } : {}),
  };
}

export function platformSite(site: PlatformSite): SourceAdapter {
  async function* read(context: AdapterContext): AsyncIterable<AdvertDraft> {
    const listed = new Map<string, AdvertDraft>();
    // At most LIST_PAGES pages, and none past one that brings nothing new: a page served again
    // would be asked for without end.
    for (let page = 1; page <= LIST_PAGES; page++) {
      const { items, drafts } = parseList(
        (await context.http.request(listUrl(site.base, page))).body,
        site,
      );
      const before = listed.size;
      for (const draft of drafts) listed.set(draft.sourceId, draft);
      if (items < PAGE || listed.size === before) break;
    }
    yield* withDetailPages(listed.values(), context, {
      most: PAGES_A_PASS,
      read: withPage,
      keep: withKnown,
    });
  }
  return publicFeed({
    definition: {
      id: site.id,
      kind: "feed",
      licence: site.licence,
      needsCredentials: false,
      credentialVariables: [],
    },
    read,
  });
}
