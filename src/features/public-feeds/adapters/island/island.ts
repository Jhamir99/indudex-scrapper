import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";

// Iceland: the State's vacancies (Starfatorg, from the data its page carries) and the
// Directorate of Labour's (Vinnumálastofnun, from the list its page asks island.is's API for).
// island.is publishes no robots.txt rules and no terms against reading it. The Directorate's
// jobs abroad ("Störf erlendis") are left to their own countries.
export const STARFATORG = "https://island.is/starfatorg";
export const API = "https://island.is/api/graphql";
// The Directorate's list a hundred at a time; more pages than this means something changed.
const DIRECTORATE_PAGES = 20;
const ABROAD = /störf erlendis/i;
const REGION = /land|svæði|nes|firðir/i;

interface Vacancy {
  readonly id?: string | number;
  readonly title?: string;
  readonly institutionName?: string;
  readonly locations?: readonly { readonly title?: string }[];
  readonly intro?: string;
  readonly applicationDeadlineFrom?: string;
  readonly applicationDeadlineTo?: string;
}

export function parseStarfatorg(html: string): AdvertDraft[] {
  const data = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(
    html,
  )?.[1];
  let vacancies: (Vacancy | null)[];
  try {
    vacancies =
      JSON.parse(data ?? "").props.pageProps.pageProps.pageProps.componentProps
        .vacancies ?? [];
  } catch {
    return [];
  }
  return vacancies.flatMap((vacancy) => {
    if (!vacancy?.id || !vacancy.title) return [];
    const place =
      (vacancy.locations ?? [])
        .map((location) => (location.title ?? "").trim())
        .find(Boolean) ?? "";
    const draft: AdvertDraft = {
      source: "island",
      sourceId: `starfatorg-${vacancy.id}`,
      title: plainText(vacancy.title),
      company: plainText(vacancy.institutionName ?? ""),
      location: [place, "Ísland"].filter(Boolean).join(", "),
      country: "is",
      city: "",
      remote: false,
      url: `${STARFATORG}/${vacancy.id}`,
      description: plainText(vacancy.intro ?? ""),
      occupationCodes: {},
      language: "is",
    };
    const posted = parseDay(vacancy.applicationDeadlineFrom);
    const expires = parseDay(vacancy.applicationDeadlineTo);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
}

export const directorateQuery = (page: number) =>
  JSON.stringify({
    operationName: "GetGenericListItems",
    variables: {
      input: {
        genericListId: "2JaZ1n1FDssBF7MskxfPDq",
        size: 100,
        lang: "is",
        page,
        queryString: "",
        tags: [],
        tagGroups: {},
        orderBy: "PUBLISH_DATE",
      },
    },
    query:
      "query GetGenericListItems($input: GetGenericListItemsInput!) { getGenericListItems(input: $input) { items { id date title filterTags { title slug } slug } total } }",
  });

interface ListItem {
  readonly id?: string;
  readonly title?: string;
  readonly slug?: string;
  readonly date?: string;
  readonly filterTags?: readonly { readonly title?: string }[];
}

export interface DirectoratePage {
  readonly ids: readonly string[];
  readonly total: number | undefined;
  readonly drafts: AdvertDraft[];
}

export function parseDirectorate(json: string): DirectoratePage {
  const list = (
    JSON.parse(json) as {
      data?: {
        getGenericListItems?: { items?: (ListItem | null)[]; total?: number };
      };
    } | null
  )?.data?.getGenericListItems;
  const items = list?.items ?? [];
  const drafts = items.flatMap((item) => {
    const tags = (item?.filterTags ?? []).map((tag) => tag.title ?? "");
    if (!item?.id || !item.title || tags.some((tag) => ABROAD.test(tag)))
      return [];
    // "Uppvaskari/Dishwasher - EJ Hotels ehf.": the post, then the employer.
    const title = item.title.trim();
    const cut = title.lastIndexOf(" - ");
    const region = tags.find((tag) => REGION.test(tag)) ?? "";
    const draft: AdvertDraft = {
      source: "island",
      sourceId: `vmst-${item.id}`,
      title: plainText(cut > 0 ? title.slice(0, cut) : title),
      company: cut > 0 ? plainText(title.slice(cut + 3)) : "",
      location: [region, "Ísland"].filter(Boolean).join(", "),
      country: "is",
      city: "",
      remote: false,
      url: `https://island.is/s/vinnumalastofnun/laus-storf/${item.slug}`,
      description: tags.filter(Boolean).join(" · "),
      occupationCodes: {},
      language: "is",
    };
    const expires = parseDay(item.date);
    if (expires) draft.expires = expires;
    return [draft];
  });
  return {
    ids: items.flatMap((item) => (item?.id ? [item.id] : [])),
    total: list?.total,
    drafts,
  };
}

async function* readIsland(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const state = parseStarfatorg((await context.http.request(STARFATORG)).body);
  const listed = new Set<string>();
  const directorate: AdvertDraft[] = [];
  let total: number | undefined;
  for (let page = 1; ; page++) {
    if (page > DIRECTORATE_PAGES)
      throw new Error(
        `the Directorate's list runs past ${DIRECTORATE_PAGES} pages`,
      );
    const answer = await context.http.request(API, {
      method: "POST",
      body: directorateQuery(page),
      headers: { "content-type": "application/json" },
    });
    const result = parseDirectorate(answer.body);
    total = result.total;
    const before = listed.size;
    for (const id of result.ids) listed.add(id);
    directorate.push(...result.drafts);
    if (listed.size === before || listed.size >= Number(total)) break;
  }
  // Part of a list is not the list: the store keeps the last whole one.
  if (total !== 0 && listed.size < Number(total))
    throw new Error(
      `the Directorate's list gave ${listed.size} of its ${String(total)} vacancies`,
    );
  context.log(
    `${state.length} state vacancies, ${directorate.length} of the Directorate of Labour`,
  );
  yield* state;
  yield* directorate;
}

export const island = publicFeed({
  definition: {
    id: "island",
    kind: "feed",
    licence: {
      name: "Ísland.is: Starfatorg and Vinnumálastofnun",
      short: "Ísland.is",
      url: "https://island.is/starfatorg",
      licence:
        "Iceland's public vacancies, read as island.is shows them; each links to its page there",
      credit: "via Ísland.is",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readIsland,
});
