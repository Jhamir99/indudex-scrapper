import type { PageBudget } from "./page-budget.js";
import type { PageFacts } from "./page-facts.js";
import type {
  HttpRequestOptions,
  HttpResponse,
} from "../../shared/http/fetch-client.js";
import type { Advert, StoredAdvert } from "../../shared/schemas/advert.js";
import type {
  SourceDefinition,
  SourceMemory,
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
  // The source's stored adverts that have not expired, as drafts: for a source that only shows
  // its newest adverts and keeps the earlier ones while they are open (legacy `ctx.previous`).
  readonly previous: readonly AdvertDraft[];
  // The run's day, YYYY-MM-DD.
  readonly today: string;
  // What the source remembered at the end of its last stored or empty pass (undefined at first).
  readonly memory: SourceMemory | undefined;
  // What to remember for the next pass; kept only if this pass is stored or empty.
  remember(memory: SourceMemory): void;
  // Whether a title (or the words of a vacancy's address) names a job of ours, read in a country's languages: the gate's
  // own reading, handed in by the entry point, so a reader asks before reading a page (job portals FR-4). Every title
  // is ours when none is given.
  isOurs(title: string, country: string, language?: string): boolean;
  // The pages the run may still read across its sources (job portals FR-5).
  readonly pageBudget: PageBudget;
  // Pages of ours the pass left to read: the source is due again sooner (job portals FR-5); a careers site also says
  // how many of its vacancy pages answered so far, and only a long queue worth its lane is back sooner (career sites
  // FR-6).
  backlog(pages: number, answered?: number): void;
  // The run had no page left for this source: it read nothing, keeps what it had and is due in the next run.
  postpone(): void;
  // How long the pass may read (the runner's, sized by the source's adverts), when the source says.
  readonly deadlineMs?: number;
  // Set when the source runs in the long queues' lane (career sites FR-6): the pages it may read in the pass and the gap
  // it may ask between two of its pages.
  readonly longQueue?: { readonly pagesASite: number; readonly gapMs: number };
  // The source's pages gave no advert (a careers site whose vacancy pages carry none): it is read at the barren cadence
  // (career sites FR-5).
  barren(): void;
  // The ids of the offers the published version in place shows, or null before the first publication (career sites
  // FR-8): a careers site asks again only a vacancy the site shows.
  readonly shown: ReadonlySet<string> | null;
  // What a vacancy's page says in labelled fields beside its block (job portals FR-3); nothing when none is given.
  pageFacts(html: string): PageFacts;
}

export type { PageFacts };

export type { PageBudget };

export type { SourceMemory };

// A source describes only what is specific to it; when and how fast it runs is the runner's job.
export interface SourceAdapter {
  readonly definition: SourceDefinition;
  // The source's group for the queue and the lanes when not its kind's (JOIN's companies share one host).
  readonly group?: string;
  // How long a pass may read, from the adverts it held at its last read (a board's grows with them); the runner starts
  // no source whose time would outlast the run.
  deadlineMs?(read: { readonly adverts: number }): number;
  fetchAdverts(context: AdapterContext): AsyncIterable<AdvertDraft>;
}

export type { HttpRequestOptions, HttpResponse };

// The polite client: robots.txt, pacing, retries and timeouts live behind it.
// It resolves only with a successful answer and rejects with an `HttpFailure` otherwise.
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
  // A source's own memory between passes.
  readMemory(source: string): Promise<SourceMemory | undefined>;
  writeMemory(source: string, memory: SourceMemory): Promise<void>;
}

export interface Clock {
  now(): Date;
  sleep(milliseconds: number): Promise<void>;
}

export interface StopSwitch {
  isActive(): Promise<boolean>;
}

// Where the crawl keeps the ECB's rates for the processor (pay FR-2).
export interface RatesKeeper {
  // The day (UTC, YYYY-MM-DD) the kept file was written, or undefined when there is none.
  keptOn(): Promise<string | undefined>;
  keep(xml: string): Promise<void>;
}
