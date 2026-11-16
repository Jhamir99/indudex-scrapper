import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { plainText } from "../../../../shared/kit/text.js";
import { checkWholePass, publicFeed } from "../../family.js";

// North Rhine-Westphalia: the vacancies of the state and of its towns and public bodies on
// Karriere.NRW, the state's employer portal, through its open API (Open.NRW, Datenlizenz
// Deutschland Namensnennung 2.0: reuse citing the source). Title, employer, place, the day it was
// posted and the closing day, ten a page; the title decides, downstream.
export const pageUrl = (page: number) =>
  `https://api.karriere.nrw/v1.0/opennrw/suche?page=${page}`;
const PAGES_AT_MOST = 400;

interface Item {
  readonly uuid?: string;
  readonly title?: string;
  readonly jobtype?: string;
  readonly authority?: string;
  readonly contracting_authority?: string;
  readonly location?: string;
  readonly published?: string;
  readonly deadline?: string;
}

export function parsePage(json: string): {
  readonly pages: number;
  readonly drafts: AdvertDraft[];
} {
  const page = JSON.parse(json) as {
    items?: (Item | null)[];
    pages?: number;
  } | null;
  const drafts = (page?.items ?? []).flatMap((item): AdvertDraft[] => {
    // Apprenticeships and other kinds are not job offers.
    if (
      !item?.uuid ||
      !item.title ||
      (item.jobtype && item.jobtype !== "joboffer")
    )
      return [];
    const city = plainText(item.location ?? "");
    const draft: AdvertDraft = {
      source: "karrierenrw",
      sourceId: item.uuid,
      title: plainText(item.title),
      company: plainText(item.authority || item.contracting_authority || ""),
      location: [city, "Nordrhein-Westfalen", "Deutschland"]
        .filter(Boolean)
        .join(", "),
      country: "de",
      city,
      remote: false,
      url: `https://karriere.nrw/stellenausschreibung/${item.uuid}`,
      description: "",
      occupationCodes: {},
      language: "de",
    };
    const posted = parseDay(item.published);
    const expires = parseDay(item.deadline);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
  return { pages: Number(page?.pages) || 0, drafts };
}

async function* readNrw(context: AdapterContext): AsyncIterable<AdvertDraft> {
  const first = parsePage((await context.http.request(pageUrl(1))).body);
  // Its count of pages: one it no longer gives, or more than this reader was written for, fails.
  if (!(first.pages > 0))
    throw new Error("the API no longer says how many pages it holds");
  if (first.pages > PAGES_AT_MOST)
    throw new Error(`${first.pages} pages, past ${PAGES_AT_MOST}`);
  yield* first.drafts;
  let answered = 1;
  for (let page = 2; page <= first.pages; page++) {
    let drafts: AdvertDraft[];
    try {
      drafts = parsePage(
        (await context.http.request(pageUrl(page))).body,
      ).drafts;
    } catch (error) {
      context.log(
        `page ${page}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    answered += 1;
    yield* drafts;
  }
  // A tenth of the pages unanswered is no whole pass.
  checkWholePass(answered, first.pages, "pages");
}

export const karrierenrw = publicFeed({
  definition: {
    id: "karrierenrw",
    kind: "feed",
    licence: {
      name: "Karriere.NRW, Stellenausschreibungen (Open.NRW)",
      short: "Karriere.NRW",
      url: "https://karriere.nrw/",
      licence: "Datenlizenz Deutschland Namensnennung 2.0",
      credit: "Quelle: Land Nordrhein-Westfalen, Karriere.NRW",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readNrw,
});
