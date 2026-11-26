import { publicFeed } from "../../../crawl-core/feed-family.js";
import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import {
  countryNames,
  countryOfPlace,
  type CountryNames,
} from "../../../../shared/catalogues/country-names.js";
import { decodeEntities } from "../../../../shared/kit/entities.js";
import { pageText } from "../../../../shared/kit/text.js";

// Three job boards with a public API and written leave to share their adverts (job portals FR-6), the legacy's
// builder/adapters/remote.ts: Jobicy (remote jobs, asked for Europe; "credit Jobicy with a direct link"), Remotive (remote
// jobs, worldwide; "link back to the URL on Remotive and mention Remotive as a source") and Arbeitnow (jobs from
// applicant-tracking systems, mostly Germany; "a link back to Arbeitnow.com"). None carries occupation codes: the title
// decides.
//
// The store needs a country where the legacy left it to its processor: a board's place is read as a country's name, or
// (Arbeitnow) as a big town the countries catalogue lists, Germany otherwise; an advert whose place is a region ("Europe",
// "EMEA", "Worldwide") is left out and counted, where the legacy filed it under "Remote" (a departure until the processor
// has such a place; features/015-job-portals/tasks.md, T008).

const DAY_MS = 86_400_000;
const dayOf = (value: string | number | undefined): string | undefined => {
  if (value === undefined || value === "") return undefined;
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().slice(0, 10);
};
const daysBefore = (today: string, days: number) =>
  new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);

interface Jobicy {
  readonly id?: number;
  readonly jobTitle?: string;
  readonly companyName?: string;
  readonly jobGeo?: string;
  readonly url?: string;
  readonly jobDescription?: string;
  readonly jobExcerpt?: string;
  readonly pubDate?: string;
}
interface Remotive {
  readonly id?: number;
  readonly title?: string;
  readonly company_name?: string;
  readonly candidate_required_location?: string;
  readonly url?: string;
  readonly description?: string;
  readonly publication_date?: string;
}
interface Arbeitnow {
  readonly slug?: string;
  readonly title?: string;
  readonly company_name?: string;
  readonly location?: string;
  readonly remote?: boolean;
  readonly url?: string;
  readonly description?: string;
  readonly created_at?: number;
}

const remoteDraft = (
  source: string,
  fields: Omit<
    AdvertDraft,
    "source" | "city" | "occupationCodes" | "language" | "remote"
  > & { remote: boolean; language: string },
): AdvertDraft => ({
  source,
  ...fields,
  city: "",
  occupationCodes: {},
  ...(fields.remote ? { workMode: "remote" as const } : {}),
});

export function parseJobicy(
  answer: unknown,
  names: CountryNames,
): { drafts: AdvertDraft[]; unplaced: number } {
  const drafts: AdvertDraft[] = [];
  let unplaced = 0;
  for (const job of (answer as { jobs?: Jobicy[] } | null)?.jobs ?? []) {
    const location = job.jobGeo ?? "";
    const country = countryOfPlace(location, names);
    if (!country) {
      unplaced++;
      continue;
    }
    const posted = dayOf(job.pubDate);
    drafts.push(
      remoteDraft("jobicy", {
        sourceId: String(job.id ?? ""),
        title: (job.jobTitle ?? "").trim(),
        company: (job.companyName ?? "").trim(),
        location,
        country,
        remote: true,
        url: job.url ?? "",
        description: pageText(job.jobDescription || job.jobExcerpt || ""),
        ...(posted ? { posted } : {}),
        language: "en",
      }),
    );
  }
  return { drafts, unplaced };
}

export function parseRemotive(
  answer: unknown,
  names: CountryNames,
): { drafts: AdvertDraft[]; unplaced: number } {
  const drafts: AdvertDraft[] = [];
  let unplaced = 0;
  for (const job of (answer as { jobs?: Remotive[] } | null)?.jobs ?? []) {
    const location = job.candidate_required_location ?? "";
    const country = countryOfPlace(location, names);
    if (!country) {
      unplaced++;
      continue;
    }
    const posted = dayOf(job.publication_date);
    drafts.push(
      remoteDraft("remotive", {
        sourceId: String(job.id ?? ""),
        title: (job.title ?? "").trim(),
        company: (job.company_name ?? "").trim(),
        location,
        country,
        remote: true,
        url: job.url ?? "",
        description: pageText(job.description ?? ""),
        ...(posted ? { posted } : {}),
        language: "en",
      }),
    );
  }
  return { drafts, unplaced };
}

// The description arrives as HTML with its tags escaped: unescaped first, then read as text.
export function parseArbeitnow(
  answer: unknown,
  names: CountryNames,
): AdvertDraft[] {
  return ((answer as { data?: Arbeitnow[] } | null)?.data ?? []).map((job) => {
    const location = job.location ?? "";
    const posted = dayOf(job.created_at);
    return remoteDraft("arbeitnow", {
      sourceId: job.slug ?? "",
      title: (job.title ?? "").trim(),
      company: (job.company_name ?? "").trim(),
      location,
      country: countryOfPlace(location, names, true) ?? "de",
      remote: Boolean(job.remote),
      url: job.url ?? "",
      description: pageText(decodeEntities(job.description ?? "")),
      ...(posted ? { posted } : {}),
      language: "de",
    });
  });
}

async function json(context: AdapterContext, url: string): Promise<unknown> {
  return JSON.parse((await context.http.request(url)).body) as unknown;
}

export const jobicy = publicFeed({
  definition: {
    id: "jobicy",
    kind: "feed",
    licence: {
      name: "Jobicy",
      short: "Jobicy",
      url: "https://jobicy.com/jobs-rss-feed",
      licence: "Jobicy API: credit with a direct link to the advert on Jobicy",
      credit: "Source: Jobicy",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  async *read(context) {
    const { drafts, unplaced } = parseJobicy(
      await json(
        context,
        "https://jobicy.com/api/v2/remote-jobs?count=100&geo=europe",
      ),
      await countryNames(),
    );
    if (unplaced) context.log(`left out: ${unplaced} placed in no country`);
    yield* drafts;
  },
});

// Remotive's robots.txt closes /api/*, the API its documentation invites to reuse: the legacy read it with robots.txt
// off; here robots.txt has no exception, so it is ported switched off.
export const remotive = publicFeed({
  definition: {
    id: "remotive",
    kind: "feed",
    licence: {
      name: "Remotive",
      short: "Remotive",
      url: "https://remotive.com/api-documentation",
      licence:
        "Remotive API: link back to the advert on Remotive and name Remotive as the source",
      credit: "Source: Remotive (its feed runs a day late)",
    },
    needsCredentials: false,
    credentialVariables: [],
    disabledReason:
      "robots.txt of remotive.com closes /api/* to every bot (2026-11-26), the API its documentation invites to reuse; the legacy read it with robots.txt off",
  },
  async *read(context) {
    const { drafts, unplaced } = parseRemotive(
      await json(context, "https://remotive.com/api/remote-jobs"),
      await countryNames(),
    );
    if (unplaced) context.log(`left out: ${unplaced} placed in no country`);
    // Remotive never says when an advert closes: one older than 45 days is taken as closed (the legacy's FUE-17).
    const oldest = daysBefore(context.today, 45);
    yield* drafts.filter((draft) => (draft.posted ?? "") >= oldest);
  },
});

export const arbeitnow = publicFeed({
  definition: {
    id: "arbeitnow",
    kind: "feed",
    licence: {
      name: "Arbeitnow",
      short: "Arbeitnow",
      url: "https://www.arbeitnow.com/blog/job-board-api",
      licence: "Arbeitnow job board API: a link back to Arbeitnow.com",
      credit: "Source: Arbeitnow",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  // Pages of 250, newest first, until the adverts are older than thirty days.
  async *read(context) {
    const names = await countryNames();
    const oldest = daysBefore(context.today, 30);
    for (let page = 1; page <= 20; page++) {
      const drafts = parseArbeitnow(
        await json(
          context,
          `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        ),
        names,
      );
      if (!drafts.length) break;
      const fresh = drafts.filter((draft) => (draft.posted ?? "") >= oldest);
      yield* fresh;
      if (fresh.length < drafts.length) break;
    }
  },
});
