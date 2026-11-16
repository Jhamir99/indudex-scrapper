import type {
  AdapterContext,
  AdvertDraft,
  SourceAdapter,
} from "../../src/features/crawl-core/ports.js";
import type { SourceDefinition } from "../../src/shared/schemas/source.js";

export function fakeDefinition(
  id: string,
  overrides: Partial<SourceDefinition> = {},
): SourceDefinition {
  return {
    id,
    kind: "feed",
    licence: {
      name: `Fake source ${id}`,
      short: id.toUpperCase(),
      url: `https://${id}.example/`,
      licence: "CC BY 4.0",
      credit: `${id}, CC BY 4.0`,
    },
    needsCredentials: false,
    credentialVariables: [],
    ...overrides,
  };
}

export function fakeDraft(
  source: string,
  sourceId: string,
  overrides: Partial<AdvertDraft> = {},
): AdvertDraft {
  return {
    source,
    sourceId,
    title: `Electrical engineer ${sourceId}`,
    company: "Example GmbH",
    location: "Wien, Österreich",
    country: "at",
    city: "Wien",
    remote: false,
    url: `https://${source}.example/jobs/${sourceId}`,
    description: "Designs low-voltage installations.",
    posted: "2026-11-01",
    occupationCodes: {},
    language: "de",
    ...overrides,
  };
}

// Yields the given drafts, or fails with the given error after yielding them.
// Optionally fetches addresses first, so tests can check what reached the HTTP client.
export class FakeSourceAdapter implements SourceAdapter {
  readonly definition: SourceDefinition;
  runs = 0;

  constructor(
    definition: SourceDefinition,
    private readonly drafts: readonly AdvertDraft[] = [],
    private readonly options: {
      readonly failure?: Error;
      readonly fetches?: readonly string[];
    } = {},
  ) {
    this.definition = definition;
  }

  async *fetchAdverts(context: AdapterContext): AsyncIterable<AdvertDraft> {
    this.runs += 1;
    for (const url of this.options.fetches ?? []) {
      await context.http.request(url);
    }
    yield* this.drafts;
    if (this.options.failure) throw this.options.failure;
  }
}

// An adapter's context for tests that call an adapter directly, without the runner.
export function fakeContext(
  overrides: Partial<AdapterContext> & Pick<AdapterContext, "http">,
): AdapterContext {
  return {
    credentials: {},
    log: () => {},
    previous: [],
    today: "2026-11-16",
    ...overrides,
  };
}

export async function readDrafts(
  adapter: SourceAdapter,
  context: AdapterContext,
): Promise<AdvertDraft[]> {
  const drafts: AdvertDraft[] = [];
  for await (const draft of adapter.fetchAdverts(context)) drafts.push(draft);
  return drafts;
}
