import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../../crawl-core/feed-family.js";

// Poland: Solid.Jobs, through its public API, which it opens to aggregators in so many words
// ("Czy mogę pokazać oferty na własnej stronie lub w aplikacji? Tak — możesz zbudować własny
// agregator", solid.jobs/api-ofert-pracy). No key: a campaign name of our own, 300 calls a
// minute. Its IT and Engineering divisions are read, 500 offers a page; an offer gone from a
// whole pass is closed.
export const DIVISIONS = ["IT", "Engineering"] as const;
const PAGE = 500;
// More pages than this is a source grown past what this reader was written for.
const PAGES_AT_MOST = 100;

export const pageUrl = (division: string, page: number) =>
  `https://solid.jobs/public-api/offers/${division}?campaign=indudex&pageSize=${PAGE}&pageIndex=${page}`;

interface Job {
  readonly jobOfferKey?: string | number;
  readonly title?: string;
  readonly url?: string;
  readonly locations?: unknown;
  readonly isRemote?: boolean;
  readonly isHybrid?: boolean;
  readonly company?: string;
  readonly description?: string;
  readonly validFrom?: string;
  readonly validTo?: string;
}

export function parseSolid(json: string): {
  readonly totalPages: number;
  readonly drafts: AdvertDraft[];
} {
  const body = JSON.parse(json) as {
    jobs?: unknown;
    totalPages?: number;
  } | null;
  const jobs = Array.isArray(body?.jobs) ? (body.jobs as (Job | null)[]) : [];
  const drafts = jobs.flatMap((job) => {
    if (
      !job?.jobOfferKey ||
      !job.title ||
      !job.url?.startsWith("https://solid.jobs/")
    )
      return [];
    const towns = (Array.isArray(job.locations) ? job.locations : [])
      .map((town) => String(town).trim())
      .filter(Boolean);
    const workMode = job.isRemote
      ? "remote"
      : job.isHybrid
        ? "hybrid"
        : undefined;
    const draft: AdvertDraft = {
      source: "solidjobs",
      sourceId: String(job.jobOfferKey),
      title: plainText(job.title),
      company: plainText(job.company ?? ""),
      location: [towns[0], "Polska"].filter(Boolean).join(", "),
      country: "pl",
      city: towns[0] ?? "",
      remote: job.isRemote === true,
      url: job.url,
      description: pageText(job.description ?? ""),
      occupationCodes: {},
      language: "pl",
    };
    if (workMode) draft.workMode = workMode;
    const posted = parseDay(job.validFrom);
    const expires = parseDay(job.validTo);
    if (posted) draft.posted = posted;
    if (expires) draft.expires = expires;
    return [draft];
  });
  return { totalPages: Number(body?.totalPages) || 1, drafts };
}

async function* readSolid(context: AdapterContext): AsyncIterable<AdvertDraft> {
  for (const division of DIVISIONS) {
    let pages = 1;
    for (let page = 0; page < pages; page++) {
      const answer = parseSolid(
        (
          await context.http.request(pageUrl(division, page), {
            headers: { accept: "application/json" },
          })
        ).body,
      );
      pages = answer.totalPages;
      if (pages > PAGES_AT_MOST)
        throw new Error(
          `${division} runs to ${pages} pages, past ${PAGES_AT_MOST}`,
        );
      yield* answer.drafts;
    }
  }
}

export const solidjobs = publicFeed({
  definition: {
    id: "solidjobs",
    kind: "feed",
    licence: {
      name: "Solid.Jobs",
      short: "Solid.Jobs",
      url: "https://solid.jobs/",
      licence:
        "Its public API, open to aggregators (solid.jobs/api-ofert-pracy); each offer links to Solid.Jobs",
      credit: "via Solid.Jobs",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readSolid,
});
