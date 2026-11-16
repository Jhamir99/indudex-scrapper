import type {
  AdapterContext,
  AdvertDraft,
  HttpRequestOptions,
  SourceAdapter,
} from "../crawl-core/ports.js";
import type { SourceDefinition } from "../../shared/schemas/source.js";

// How long an advert seen earlier stays when the feed no longer lists it and it names no last
// day (legacy UNDATED_OPEN_DAYS).
export const UNDATED_OPEN_DAYS = 30;

// What a public feed describes: who it is, where its feed lives and how an answer maps to
// adverts. robots.txt, pacing, retries and timeouts come with the context's HTTP client, and
// validation and storage with the runner (crawl-core).
export interface PublicFeed {
  readonly definition: SourceDefinition;
  // The feed's addresses, read in turn.
  readonly pages: readonly string[];
  readonly request?: HttpRequestOptions;
  // Pure: one answer to the source's drafts, so tests feed it saved answers.
  readonly parse: (body: string, url: string) => AdvertDraft[];
  // A page that fails is logged and skipped; the read fails only when no page answers. For
  // feeds whose pages are independent lists (categories), not parts of one list.
  readonly skipFailedPages?: boolean;
  // The feed shows only its newest adverts: those seen earlier stay while still open, by their
  // own last day or for UNDATED_OPEN_DAYS from posting (legacy `stillOpenOf`).
  readonly keepUnlisted?: boolean;
}

// The public-feed family (FR-2): the pages, the field mapping, one advert per source id, and a
// failure when the feed holds no advert, since a public feed that answers empty is broken
// rather than emptied.
export function publicFeed(feed: PublicFeed): SourceAdapter {
  return {
    definition: feed.definition,
    async *fetchAdverts(context: AdapterContext) {
      const listed = new Map<string, AdvertDraft>();
      let answered = 0;
      for (const url of feed.pages) {
        let body: string;
        try {
          body = (await context.http.request(url, feed.request)).body;
        } catch (error) {
          if (!feed.skipFailedPages) throw error;
          context.log(
            `skipped a page: ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }
        answered += 1;
        for (const draft of feed.parse(body, url)) {
          if (!listed.has(draft.sourceId)) listed.set(draft.sourceId, draft);
        }
      }
      if (answered === 0) throw new Error("no page of the feed answered");
      if (listed.size === 0) throw new Error("the feed holds no advert");
      const kept = feed.keepUnlisted
        ? stillOpen(context.previous, listed, context.today)
        : [];
      context.log(
        `${listed.size} adverts in the feed${kept.length > 0 ? `, ${kept.length} kept from earlier reads` : ""}`,
      );
      yield* listed.values();
      yield* kept;
    },
  };
}

// The earlier adverts no longer listed that are still open.
export function stillOpen(
  previous: readonly AdvertDraft[],
  listed: ReadonlyMap<string, AdvertDraft>,
  today: string,
): AdvertDraft[] {
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - UNDATED_OPEN_DAYS);
  const oldestDay = oldest.toISOString().slice(0, 10);
  return previous.filter(
    (draft) =>
      !listed.has(draft.sourceId) &&
      (draft.expires
        ? draft.expires >= today
        : (draft.posted ?? "") >= oldestDay),
  );
}
