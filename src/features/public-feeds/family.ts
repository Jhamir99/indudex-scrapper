import type {
  AdapterContext,
  AdvertDraft,
  HttpRequestOptions,
  SourceAdapter,
} from "../crawl-core/ports.js";
import type { SourceDefinition } from "../../shared/schemas/source.js";

// What a public feed describes: who it is, where its feed lives and how its answer maps to
// adverts. robots.txt, pacing, retries and timeouts come with the context's HTTP client, and
// validation and storage with the runner (crawl-core).
export interface PublicFeed {
  readonly definition: SourceDefinition;
  readonly url: string;
  readonly request?: HttpRequestOptions;
  // Pure: the feed's answer to the source's drafts, so tests feed it saved answers.
  readonly parse: (body: string) => AdvertDraft[];
}

// The public-feed family (FR-2): one request, the field mapping, and a failure when the feed
// holds no advert, since a public feed that answers empty is broken rather than emptied.
export function publicFeed(feed: PublicFeed): SourceAdapter {
  return {
    definition: feed.definition,
    async *fetchAdverts(context: AdapterContext) {
      const response = await context.http.request(feed.url, feed.request);
      const drafts = feed.parse(response.body);
      if (drafts.length === 0) throw new Error("the feed holds no advert");
      context.log(`${drafts.length} adverts in the feed`);
      yield* drafts;
    },
  };
}
