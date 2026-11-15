import type { Advert, StoredAdvert } from "../../shared/schemas/advert.js";
import type {
  SourceDefinition,
  SourceState,
} from "../../shared/schemas/source.js";

// What an adapter yields: the runner adds the stable id and the source's attribution,
// so no adapter repeats them (FR-2, FR-12), and validates the result (FR-1).
export type AdvertDraft = Omit<Advert, "id" | "attribution">;

export interface AdapterContext {
  readonly http: HttpClient;
  // The values of the source's `credentialVariables`, read from the environment (FR-9).
  readonly credentials: Readonly<Record<string, string>>;
  readonly log: (message: string) => void;
}

// A source describes only what is specific to it; when and how fast it runs is the runner's job.
export interface SourceAdapter {
  readonly definition: SourceDefinition;
  fetchAdverts(context: AdapterContext): AsyncIterable<AdvertDraft>;
}

export interface HttpRequestOptions {
  readonly method?: "GET" | "POST";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface HttpResponse {
  readonly status: number;
  // The address after redirects.
  readonly url: string;
  // Header names in lower case.
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

// The polite client: robots.txt, pacing, retries and timeouts live behind it.
// It resolves only with a successful answer and rejects with a typed failure otherwise.
export interface HttpClient {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

// The only way the scrapper touches stored adverts and source state.
export interface AdvertStore {
  // The source's adverts that have not expired.
  readAdverts(source: string): Promise<StoredAdvert[]>;
  // Replaces the source's set after a valid read; other sources are untouched. An empty set
  // changes nothing, so a read that found nothing never deletes (FR-4).
  replaceAdverts(source: string, adverts: readonly Advert[]): Promise<void>;
  // Removes adverts by id, for takedowns.
  dropAdverts(source: string, advertIds: readonly string[]): Promise<void>;
  readState(source: string): Promise<SourceState | undefined>;
  writeState(source: string, state: SourceState): Promise<void>;
  readStates(): Promise<Map<string, SourceState>>;
}

export interface Clock {
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface StopSwitch {
  isActive(): Promise<boolean>;
}
