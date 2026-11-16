import type { AdapterContext, AdvertDraft } from "../../../crawl-core/ports.js";
import { parseDay } from "../../../../shared/kit/dates.js";
import { pageText, plainText } from "../../../../shared/kit/text.js";
import { publicFeed } from "../../family.js";
import { loadSsykGroups } from "./ssyk-groups.js";

// Sweden: Arbetsförmedlingen's JobSearch API (JobTech Dev), CC0, no key. Adverts are asked per
// occupation group (config/ssyk-groups.yml, FR-7), so the source's own classification does the
// first sorting. The API pages 100 at a time up to an offset of 2000: a group with more adverts
// is cut at its newest 2100 and the cut is logged.
export const API = "https://jobsearch.api.jobtechdev.se/search";
const PAGE = 100;
const MAX_OFFSET = 2000;

export const searchUrl = (concept: string, offset: number) =>
  `${API}?occupation-group=${encodeURIComponent(concept)}&limit=${PAGE}&offset=${offset}&sort=pubdate-desc`;

interface Hit {
  readonly id?: string | number;
  readonly headline?: string;
  readonly employer?: { readonly name?: string };
  readonly workplace_address?: {
    readonly municipality?: string;
    readonly region?: string;
  };
  readonly webpage_url?: string;
  readonly description?: { readonly text?: string };
  readonly publication_date?: string;
  readonly application_deadline?: string;
  readonly occupation_group?: { readonly concept_id?: string };
  readonly workplace_model?: { readonly label?: string | null };
  readonly must_have?: {
    readonly skills?: readonly ({ readonly label?: string } | null)[];
  };
}

// Its "workplace model": remote and hybrid are read; "Arbete på plats" is not, being the
// form's default, set on remote adverts too.
const WORK_MODES: Record<string, AdvertDraft["workMode"]> = {
  distansarbete: "remote",
  hybridarbete: "hybrid",
};

export function toDraft(hit: Hit): AdvertDraft | undefined {
  if (hit.id === undefined || hit.id === "" || !hit.headline) return undefined;
  const address = hit.workplace_address ?? {};
  const city = plainText(address.municipality ?? address.region ?? "");
  const workMode = WORK_MODES[(hit.workplace_model?.label ?? "").toLowerCase()];
  // What it marks as a must (`must_have.skills`) goes with the text, for the processor to read.
  const skills = (hit.must_have?.skills ?? [])
    .map((skill) => skill?.label)
    .filter(Boolean)
    .join(", ");
  const draft: AdvertDraft = {
    source: "jobtech",
    sourceId: String(hit.id),
    title: plainText(hit.headline),
    company: plainText(hit.employer?.name ?? ""),
    location: [city, "Sverige"].filter(Boolean).join(", "),
    country: "se",
    city,
    remote: workMode === "remote",
    url:
      hit.webpage_url ??
      `https://arbetsformedlingen.se/platsbanken/annonser/${hit.id}`,
    description: [pageText(hit.description?.text ?? ""), skills]
      .filter(Boolean)
      .join("\n"),
    occupationCodes: hit.occupation_group?.concept_id
      ? { ssyk: hit.occupation_group.concept_id }
      : {},
    language: "sv",
  };
  if (workMode) draft.workMode = workMode;
  const posted = parseDay(hit.publication_date);
  const expires = parseDay(hit.application_deadline);
  if (posted) draft.posted = posted;
  if (expires) draft.expires = expires;
  return draft;
}

export function parseSearch(json: string): {
  readonly total: number;
  readonly hits: number;
  readonly drafts: AdvertDraft[];
} {
  const answer = JSON.parse(json) as {
    total?: { value?: number };
    hits?: Hit[];
  };
  const hits = answer.hits ?? [];
  return {
    total: answer.total?.value ?? 0,
    hits: hits.length,
    drafts: hits.flatMap((hit) => toDraft(hit) ?? []),
  };
}

async function* readJobtech(
  context: AdapterContext,
): AsyncIterable<AdvertDraft> {
  const { groups } = await loadSsykGroups();
  for (const { concept, label } of groups) {
    let read = 0;
    let total = 0;
    for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE) {
      const page = parseSearch(
        (await context.http.request(searchUrl(concept, offset))).body,
      );
      if (offset === 0) total = page.total;
      read += page.hits;
      yield* page.drafts;
      if (page.hits < PAGE || read >= total) break;
    }
    if (total > read)
      context.log(`${label}: ${read} of ${total}, cut at the paging ceiling`);
  }
}

export const jobtech = publicFeed({
  definition: {
    id: "jobtech",
    kind: "feed",
    licence: {
      name: "Arbetsförmedlingen JobSearch (JobTech Dev)",
      short: "JobTech",
      url: "https://data.jobtechdev.se/dataset/job-ads/",
      licence: "CC0 1.0",
      credit: "Source: Arbetsförmedlingen, JobTech Dev",
    },
    needsCredentials: false,
    credentialVariables: [],
  },
  read: readJobtech,
});
