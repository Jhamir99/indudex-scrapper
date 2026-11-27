import type { ShownOffers } from "../../shared/storage/shown-offers.js";
import { dueQueue, type QueueRules } from "./queue.js";
import type { z } from "@hono/zod-openapi";
import {
  Advert,
  advertId,
  DESCRIPTION_LIMIT,
  type StoredAdvert,
} from "../../shared/schemas/advert.js";
import { HttpFailure } from "../../shared/http/http-failure.js";
import type { SourceState } from "../../shared/schemas/source.js";
import type { TakedownList } from "../../shared/config/takedowns.js";
import { checkCredentials, type Environment } from "./credentials.js";
import { type PageBudget, UNLIMITED } from "./page-budget.js";
import { NO_PAGE_FACTS, type PageFacts } from "./page-facts.js";
import {
  afterDisallowed,
  afterFailure,
  afterPostponed,
  afterSuccess,
  holdsDrop,
  disabled,
  type ScheduleRules,
} from "./domain/schedule.js";
import type { SourceMemory } from "../../shared/schemas/source.js";
import type {
  AdapterContext,
  AdvertDraft,
  AdvertStore,
  Clock,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  SourceAdapter,
  StopSwitch,
} from "./ports.js";

type Takedowns = Pick<TakedownList, "reasonFor" | "sourceReason">;

export interface RejectedAdvert {
  readonly sourceId: string;
  readonly reason: string;
}

// stored: a valid read replaced the source's set. empty: nothing was read and nothing was
// stored before. failed: the read threw, gave no valid advert, or gave none after having some.
// disallowed: robots.txt closed an address the source needed. In those two the stored set is
// left as it was (FR-4). disabled: the source may not run, and made no request (FR-8, FR-9).
// stopped: the stop switch cut the read; nothing was stored and the state is untouched (FR-7).
// postponed: its server was held, or the run had no page left for it: not a pass, it keeps its adverts and its
// failures and is due again after the hold or in the next run (the legacy's postponed).
export type SourceOutcome =
  | "stored"
  | "empty"
  | "failed"
  | "disallowed"
  | "disabled"
  | "stopped"
  | "postponed";

export interface SourceRunResult {
  readonly source: string;
  readonly outcome: SourceOutcome;
  // Valid adverts handed to the store.
  readonly stored: number;
  // Adverts that failed validation, each with its reason (FR-1).
  readonly rejected: readonly RejectedAdvert[];
  // Valid adverts left out because a takedown covers them (FR-8).
  readonly takenDown: number;
  // Whether the set of advert ids differs from the one stored before.
  readonly changed: boolean;
  readonly reason?: string;
  // The read was a suspect drop, held as a failure (FR-4).
  readonly heldDrop?: true;
  // Pages of ours the pass left to read (job portals FR-5).
  readonly backlog?: number;
  // The vacancy pages that answered so far (a careers site).
  readonly answered?: number;
  // The pass said its pages give no advert.
  readonly barren?: boolean;
  // When postponed: how long until it is due again.
  readonly retryAfterMs?: number;
}

export interface SourceRunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly credentials?: Readonly<Record<string, string>>;
  readonly takedowns?: Takedowns;
  readonly stopSwitch?: StopSwitch;
  // Reads held as suspect drops in a row before this one (the source state's `heldDrops`).
  readonly heldDropsBefore?: number;
  // The run's day, YYYY-MM-DD; today by the system clock when not given.
  readonly today?: string;
  readonly log: (message: string) => void;
  // The gate's reading of a title, and the run's page budget (job portals FR-4, FR-5).
  readonly isOurs?: (
    title: string,
    country: string,
    language?: string,
  ) => boolean;
  // The offers the published version in place shows (career sites FR-8).
  readonly shown?: ShownOffers | null;
  readonly pageBudget?: PageBudget;
  readonly pageBudgetFor?: (group: string) => PageBudget | undefined;
  readonly pageFacts?: (html: string) => PageFacts;
  readonly countryOf?: AdapterContext["countryOf"];
  // The pass's time, and the long queues' pages and gap when it runs in their lane (career sites FR-6).
  readonly deadlineMs?: number;
  readonly longQueue?: { readonly pagesASite: number; readonly gapMs: number };
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

class RunStopped extends Error {
  override name = "RunStopped";
  constructor() {
    super("the stop switch is active");
  }
}

// Asks the stop switch before every request, so none leaves once it is active (FR-7). It
// remembers having stopped even if an adapter swallows the error.
class StopGuardClient implements HttpClient {
  stopped = false;

  constructor(
    private readonly inner: HttpClient,
    private readonly stopSwitch: StopSwitch | undefined,
  ) {}

  async request(
    url: string,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse> {
    if (this.stopped || (await this.stopSwitch?.isActive())) {
      this.stopped = true;
      throw new RunStopped();
    }
    return this.inner.request(url, options);
  }
}

// Reads one source and stores its valid adverts, inside the source's failure boundary: it never
// throws (FR-3). The runner stops here (FR-11): no gate, dedupe, translation or publication.
export async function runSource(
  adapter: SourceAdapter,
  dependencies: SourceRunDependencies,
): Promise<SourceRunResult> {
  const { definition } = adapter;
  const source = definition.id;
  const { store, takedowns, log } = dependencies;
  const credentials = dependencies.credentials ?? {};
  const http = new StopGuardClient(dependencies.http, dependencies.stopSwitch);
  const valid = new Map<string, Advert>();
  const rejected: RejectedAdvert[] = [];
  let takenDown = 0;
  const result = (
    outcome: SourceOutcome,
    fields: { stored?: number; changed?: boolean; reason?: string } = {},
  ): SourceRunResult => ({
    source,
    outcome,
    stored: fields.stored ?? 0,
    rejected,
    takenDown,
    changed: fields.changed ?? false,
    ...(fields.reason === undefined ? {} : { reason: fields.reason }),
  });
  const stopped = () => {
    log(`${source}: stopped by the stop switch, nothing stored`);
    return result("stopped", { reason: "stopped by the stop switch" });
  };
  const postponed = (reason: string, retryAfterMs: number) => {
    log(`${source}: postponed: ${reason}`);
    return { ...result("postponed", { reason }), retryAfterMs };
  };
  const failed = (error: unknown): SourceRunResult => {
    if (http.stopped) return stopped();
    const reason = withoutValues(messageOf(error), credentials);
    // A server left alone (its errors, a 429) is not the source failing: it comes back once the hold is over, spread
    // over ten minutes so the sources it held do not all return at once.
    if (
      error instanceof HttpFailure &&
      (error.kind === "held" ||
        (error.kind === "rate-limited" && error.retryAfterMs !== undefined))
    )
      return postponed(
        reason,
        (error.retryAfterMs ?? HOUR_MS) +
          Math.round(Math.random() * 10 * MINUTE_MS),
      );
    const outcome =
      error instanceof HttpFailure && error.kind === "disallowed"
        ? "disallowed"
        : "failed";
    log(`${source}: ${outcome}: ${reason}`);
    return result(outcome, { reason });
  };

  try {
    const previous = await store.readAdverts(source);
    let remembered: { readonly memory: SourceMemory } | undefined;
    let backlog = 0;
    let answered = 0;
    let barren = false;
    let noPages = false;
    const context: AdapterContext = {
      http,
      credentials,
      log: (message) => log(`${source}: ${message}`),
      previous: previous.map(asDraft),
      today: dependencies.today ?? new Date().toISOString().slice(0, 10),
      memory: await store.readMemory(source),
      remember: (memory) => {
        remembered = { memory };
      },
      isOurs: dependencies.isOurs ?? (() => true),
      pageBudget: dependencies.pageBudget ?? UNLIMITED,
      pageFacts: dependencies.pageFacts ?? NO_PAGE_FACTS,
      ...(dependencies.countryOf ? { countryOf: dependencies.countryOf } : {}),
      shown: dependencies.shown?.ids ?? null,
      backlog: (pages, pagesAnswered = 0) => {
        backlog = Math.max(0, Math.round(pages));
        answered = Math.max(0, Math.round(pagesAnswered));
      },
      barren: () => {
        barren = true;
      },
      postpone: () => {
        noPages = true;
      },
      ...(dependencies.deadlineMs
        ? { deadlineMs: dependencies.deadlineMs }
        : {}),
      ...(dependencies.longQueue ? { longQueue: dependencies.longQueue } : {}),
    };
    // Only a pass that stored or found nothing to store is the source's word for next time.
    const keepMemory = async () => {
      if (remembered) await store.writeMemory(source, remembered.memory);
    };
    for await (const draft of adapter.fetchAdverts(context)) {
      const conversion = toAdvert(adapter, draft);
      if (!conversion.success) {
        rejected.push({ sourceId: draft.sourceId, reason: conversion.reason });
      } else if (takedowns?.reasonFor(conversion.advert)) {
        takenDown += 1;
      } else if (valid.has(conversion.advert.id)) {
        rejected.push({
          sourceId: draft.sourceId,
          reason: "sourceId: repeated in the same read",
        });
      } else {
        valid.set(conversion.advert.id, conversion.advert);
      }
    }
    if (http.stopped) return stopped();
    // The run had no page left for it: a source never read is not one that was read.
    if (noPages) return postponed("the run's pages are spent", MINUTE_MS);
    for (const { sourceId, reason } of rejected) {
      log(`${source}: rejected ${sourceId}: ${reason}`);
    }
    if (takenDown > 0) log(`${source}: ${takenDown} adverts taken down`);

    if (valid.size === 0 && rejected.length > 0) {
      return failed(new Error(`no valid advert: ${rejected.length} rejected`));
    }
    // A sudden drop is more likely an outage than an emptied source: it keeps what it had.
    // Taken-down adverts were read, so they do not count as missing.
    const read = valid.size + takenDown;
    if (holdsDrop(previous.length, read, dependencies.heldDropsBefore ?? 0)) {
      const reason = `read ${read} adverts after ${previous.length}: kept`;
      log(`${source}: failed: ${reason}`);
      return { ...result("failed", { reason }), heldDrop: true };
    }
    if (valid.size === 0) {
      log(`${source}: read no adverts`);
      await keepMemory();
      return {
        ...result("empty"),
        ...(backlog > 0 ? { backlog } : {}),
        ...(answered > 0 ? { answered } : {}),
        ...(barren ? { barren } : {}),
      };
    }

    await store.replaceAdverts(source, [...valid.values()]);
    await keepMemory();
    const before = new Set(previous.map((advert) => advert.id));
    const changed =
      before.size !== valid.size ||
      [...valid.keys()].some((id) => !before.has(id));
    log(
      `${source}: ${valid.size} adverts${rejected.length > 0 ? `, ${rejected.length} rejected` : ""}`,
    );
    return {
      ...result("stored", { stored: valid.size, changed }),
      ...(backlog > 0 ? { backlog } : {}),
      ...(answered > 0 ? { answered } : {}),
      ...(barren ? { barren } : {}),
    };
  } catch (error) {
    return failed(error);
  }
}

export interface RunDependencies {
  readonly http: HttpClient;
  readonly store: AdvertStore;
  readonly clock: Clock;
  readonly rulesFor: (source: string) => ScheduleRules;
  readonly takedowns: Takedowns;
  readonly stopSwitch: StopSwitch;
  // Where credentials are read from: process.env in a real run (FR-9).
  readonly environment: Environment;
  readonly log: (message: string) => void;
  // The gate's reading of a title, and the run's page budget, shared by its sources (job portals FR-4, FR-5).
  readonly isOurs?: (
    title: string,
    country: string,
    language?: string,
  ) => boolean;
  // The offers the published version in place shows (career sites FR-8).
  readonly shown?: ShownOffers | null;
  readonly pageBudget?: PageBudget;
  readonly pageFacts?: (html: string) => PageFacts;
  // The country an advert's place names, the world over (career sites FR-10).
  readonly countryOf?: AdapterContext["countryOf"];
  // Sources read at once (default 1; the legacy's lanes, 32). The polite client behind `http` is shared, so the pace of
  // each host, server and provider and the connection caps hold however many run.
  readonly concurrency?: number;
  // At most so many sources of a group at once (`default` for a group not named): an ATS serves every board from one
  // host, the employers' sites are a new connection each (the legacy's in_flight, career sites FR-6, FR-7).
  readonly inFlight?: Readonly<Record<string, number>>;
  // No source starts after this time (the legacy's: none after minute 50 of the hour's run).
  readonly startUntil?: Date;
  // A group's own page budget (the portals' 30,000, the employers' sites' 40,000), else `pageBudget`.
  readonly pageBudgetFor?: (group: string) => PageBudget | undefined;
  // The queue's order (career sites FR-6): a source's worth, the never-read sources a run, the place for those that
  // show nothing. Without it every source is worth the same and every never-read one is taken.
  readonly queue?: Pick<QueueRules, "worth" | "newARun" | "noneEvery">;
  // Sources a group may start in a run, for a platform that allows only so many calls an hour (HR-Manager: 8).
  readonly sourcesARun?: Readonly<Record<string, number>>;
  // When the run ends: no source starts whose time would outlast it (a board of 2,000 vacancies started late would
  // hold the store past the hour).
  readonly runEndsAt?: Date;
  // The careers sites with long queues, read in a lane of their own (career sites FR-6).
  readonly longQueues?: LongQueueRules;
}

// A careers site with this many vacancy pages left is read as a portal is (the legacy's longQueue): in the `queues`
// lane, a page a second, a pass of up to 25 minutes, back in the next run while pages are left; only while a share of
// the pages it read show an offer, or before it has read enough of them to judge.
export interface LongQueueRules {
  readonly atLeast: number;
  readonly shownAtLeast: number;
  readonly pagesASite: number;
  readonly gapMs: number;
  readonly deadlineMs: number;
}
export const LONG_QUEUES = "queues";
// Pages answered before a site's share of shown offers is judged.
const QUEUE_JUDGED = 50;

const isSite = (adapter: SourceAdapter) =>
  adapter.definition.kind === "careers" &&
  adapter.definition.id.startsWith("careers.");

export function isLongQueue(
  adapter: SourceAdapter,
  read: { readonly backlog?: number; readonly answered?: number },
  rules: LongQueueRules | undefined,
  shown: ShownOffers | null | undefined,
): boolean {
  if (!rules || !isSite(adapter) || (read.backlog ?? 0) < rules.atLeast)
    return false;
  const answered = read.answered ?? 0;
  if (!shown || answered < QUEUE_JUDGED) return true;
  const offers = shown.bySource.get(adapter.definition.id)?.[0] ?? 0;
  return offers / answered >= rules.shownAtLeast;
}

// A source's group, as the legacy's queue and lanes knew them: an employer's careers site, a board's platform, the
// portals, the intermediaries, the feeds; or the one the source names (JOIN's companies).
export function groupOf(adapter: SourceAdapter): string {
  if (adapter.group) return adapter.group;
  const { id, kind } = adapter.definition;
  if (kind === "portal") return "portals";
  if (kind === "via") return "via";
  if (kind === "careers")
    return id.startsWith("careers.") ? "careers" : (id.split(".")[0] ?? id);
  return "feeds";
}

export interface RunResult {
  readonly sources: readonly SourceRunResult[];
  // True when the stop switch kept the run from starting or cut it short.
  readonly stopped: boolean;
}

type Gate =
  | { readonly allowed: true; readonly credentials: Record<string, string> }
  | { readonly allowed: false; readonly reason: string };

// Whether a source may run at all: not taken down, and with its credentials (FR-8, FR-9).
function gate(adapter: SourceAdapter, dependencies: RunDependencies): Gate {
  const { definition } = adapter;
  const takedown = dependencies.takedowns.sourceReason(definition.id);
  if (takedown) return { allowed: false, reason: `taken down: ${takedown}` };
  if (definition.disabledReason)
    return { allowed: false, reason: `flagged: ${definition.disabledReason}` };
  const check = checkCredentials(definition, dependencies.environment);
  if (!check.ready) return { allowed: false, reason: check.reason };
  return { allowed: true, credentials: check.credentials };
}

// One scheduled run: only the sources due now, the others untouched and without a request
// (FR-6). A failed or parked source is due again only when its wait has passed (FR-3).
// Sources that may not run are recorded as disabled whether due or not. It always finishes:
// store errors are recorded against their source (FR-3).
export async function runDue(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<RunResult> {
  const { store, clock, stopSwitch, log } = dependencies;
  if (await stopSwitch.isActive()) {
    log("the stop switch is active: nothing runs");
    return { sources: [], stopped: true };
  }
  await sweepTakedowns(adapters, dependencies);

  const states = new Map<string, SourceState>();
  // Not run here: `runSources` reports why its state cannot be read.
  const unreadable: SourceAdapter[] = [];
  const allowed: SourceAdapter[] = [];
  const notAllowed: SourceAdapter[] = [];
  for (const adapter of adapters) {
    try {
      const state = await store.readState(adapter.definition.id);
      if (state) states.set(adapter.definition.id, state);
    } catch {
      unreadable.push(adapter);
      continue;
    }
    if (gate(adapter, dependencies).allowed) allowed.push(adapter);
    else notAllowed.push(adapter);
  }
  // The three-day rule is the backoff's, the same for every source.
  const withAdvertsHours = dependencies.rulesFor(
    allowed[0]?.definition.id ?? "",
  ).withAdvertsHours;
  const due = dueQueue(
    allowed.map((adapter) => ({
      id: adapter.definition.id,
      group: groupOf(adapter),
      cadenceHours: dependencies.rulesFor(adapter.definition.id).cadenceHours,
      adapter,
    })),
    states,
    {
      now: clock.now(),
      worth: dependencies.queue?.worth ?? (() => 1),
      newARun: dependencies.queue?.newARun ?? Infinity,
      noneEvery: dependencies.queue?.noneEvery ?? 5,
      ...(withAdvertsHours ? { withAdvertsHours } : {}),
    },
  ).map((entry) => entry.adapter);
  log(`${due.length} of ${adapters.length} sources due`);
  return runSources(
    [...unreadable, ...notAllowed, ...due],
    dependencies,
    states,
  );
}

// Runs one source now, due or not, for debugging (FR-6). The stop switch, takedowns and
// credentials still apply.
export async function runOnly(
  adapter: SourceAdapter,
  dependencies: RunDependencies,
): Promise<RunResult> {
  if (await dependencies.stopSwitch.isActive()) {
    dependencies.log("the stop switch is active: nothing runs");
    return { sources: [], stopped: true };
  }
  await sweepTakedowns([adapter], dependencies);
  const states = new Map<string, SourceState>();
  try {
    const state = await dependencies.store.readState(adapter.definition.id);
    if (state) states.set(adapter.definition.id, state);
  } catch {
    // `runSources` reports why its state cannot be read.
  }
  return runSources([adapter], dependencies, states);
}

// Runs the given sources, due or not, `concurrency` at a time (one after another by default),
// each taken in the order given. Each runs inside its own failure boundary, so a failing source
// is recorded with its reason and the others still run (FR-3, FR-4). The stop switch is read
// before each source starts (FR-7): once it is set, or a source was cut by it, no further source
// starts and those already reading finish on their own (their requests stop at the switch).
// Results come back in the order the sources were given. A source waits while its lane is full, and is left for the next
// run when its lane has spent its pages or its sources a run, or its time would outlast the run (career sites FR-6,
// FR-7); `states` are the sources' states at the start, which choose a careers site's lane and size a pass's time.
export async function runSources(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
  states: ReadonlyMap<string, SourceState> = new Map(),
): Promise<RunResult> {
  const { stopSwitch, log, clock } = dependencies;
  const workers = Math.max(1, dependencies.concurrency ?? 1);
  const results: (SourceRunResult | undefined)[] = adapters.map(
    () => undefined,
  );
  const passes = adapters.map((adapter) => {
    const state = states.get(adapter.definition.id);
    const longQueue = isLongQueue(
      adapter,
      state ?? {},
      dependencies.longQueues,
      dependencies.shown,
    );
    const deadlineMs =
      longQueue && dependencies.longQueues
        ? dependencies.longQueues.deadlineMs
        : adapter.deadlineMs?.({ adverts: state?.advertCount ?? 0 });
    return {
      lane: longQueue ? LONG_QUEUES : groupOf(adapter),
      longQueue,
      ...(deadlineMs ? { deadlineMs } : {}),
    };
  });
  const groups = passes.map((pass) => pass.lane);
  const limitOf = (group: string) =>
    dependencies.inFlight?.[group] ??
    dependencies.inFlight?.["default"] ??
    Infinity;
  const running = new Map<string, number>();
  const begun = new Map<string, number>();
  const spent = (lane: string) =>
    (begun.get(lane) ?? 0) >= (dependencies.sourcesARun?.[lane] ?? Infinity) ||
    (dependencies.pageBudgetFor?.(lane)?.left ?? 1) <= 0;
  const fits = (index: number) => {
    const { deadlineMs } = passes[index]!;
    return (
      !dependencies.runEndsAt ||
      !deadlineMs ||
      clock.now().getTime() + deadlineMs <= dependencies.runEndsAt.getTime()
    );
  };
  const anyRunning = () => [...running.values()].some((n) => n > 0);
  // The sources not started yet, in the order given: each worker takes the first whose group has room.
  const waiting = adapters.map((_, index) => index);
  let stopped = false;
  let overtime = false;
  // A worker that finds every waiting source's group full waits for one to finish.
  let finish = Promise.withResolvers<void>();
  const oneFinished = () => {
    finish.resolve();
    finish = Promise.withResolvers<void>();
  };

  async function work(): Promise<void> {
    while (!stopped && waiting.length > 0) {
      if (await stopSwitch.isActive()) {
        if (!stopped) log("the stop switch is active: no further source runs");
        stopped = true;
        return;
      }
      if (
        dependencies.startUntil &&
        clock.now().getTime() >= dependencies.startUntil.getTime()
      ) {
        if (!overtime)
          log(
            `the run's minutes are over: ${waiting.length} sources left for the next run`,
          );
        overtime = true;
        return;
      }
      // The switch is read asynchronously: another worker may have taken the turn meanwhile.
      if (stopped || waiting.length === 0) return;
      const at = waiting.findIndex(
        (index) =>
          (running.get(groups[index]!) ?? 0) < limitOf(groups[index]!) &&
          !spent(groups[index]!) &&
          fits(index),
      );
      if (at < 0) {
        // What is left waits for the next run once nothing is reading.
        if (!anyRunning()) return;
        await finish.promise;
        continue;
      }
      const index = waiting.splice(at, 1)[0]!;
      const adapter = adapters[index]!;
      const group = groups[index]!;
      const source = adapter.definition.id;
      running.set(group, (running.get(group) ?? 0) + 1);
      begun.set(group, (begun.get(group) ?? 0) + 1);
      let result: SourceRunResult;
      try {
        result = await runAndRecord(adapter, dependencies, passes[index]!);
      } catch (error) {
        // The store could not read or write this source's state. The state is never reset, so
        // the source keeps what it had and is reported until the store is repaired.
        const reason = `store: ${messageOf(error)}`;
        log(`${source}: failed: ${reason}`);
        result = {
          source,
          outcome: "failed",
          stored: 0,
          rejected: [],
          takenDown: 0,
          changed: false,
          reason,
        };
      } finally {
        running.set(group, (running.get(group) ?? 1) - 1);
        oneFinished();
      }
      results[index] = result;
      if (result.outcome === "stopped") stopped = true;
    }
  }

  await Promise.all(Array.from({ length: workers }, work));
  return {
    sources: results.filter((result) => result !== undefined),
    stopped,
  };
}

async function runAndRecord(
  adapter: SourceAdapter,
  dependencies: RunDependencies,
  pass: {
    readonly lane: string;
    readonly longQueue: boolean;
    readonly deadlineMs?: number;
  },
): Promise<SourceRunResult> {
  const { store, clock, rulesFor, log } = dependencies;
  const source = adapter.definition.id;
  const previous = await store.readState(source);
  const access = gate(adapter, dependencies);
  if (!access.allowed) {
    if (previous?.status !== "disabled" || previous.reason !== access.reason) {
      await store.writeState(source, disabled(previous, access.reason));
    }
    log(`${source}: disabled: ${access.reason}`);
    return {
      source,
      outcome: "disabled",
      stored: 0,
      rejected: [],
      takenDown: 0,
      changed: false,
      reason: access.reason,
    };
  }

  const at = clock.now();
  const queues = pass.longQueue ? dependencies.longQueues : undefined;
  const result = await runSource(adapter, {
    ...dependencies,
    pageBudget:
      dependencies.pageBudgetFor?.(pass.lane) ??
      dependencies.pageBudget ??
      UNLIMITED,
    ...(pass.deadlineMs ? { deadlineMs: pass.deadlineMs } : {}),
    ...(queues
      ? { longQueue: { pagesASite: queues.pagesASite, gapMs: queues.gapMs } }
      : {}),
    credentials: access.credentials,
    heldDropsBefore: previous?.heldDrops ?? 0,
    today: at.toISOString().slice(0, 10),
  });
  if (result.outcome === "disallowed") {
    // A site that closes itself to us leaves the output (FR-5), as in the legacy.
    const stored = await store.readAdverts(source);
    if (stored.length > 0) {
      await store.dropAdverts(
        source,
        stored.map((advert) => advert.id),
      );
      log(
        `${source}: robots.txt closes it: its ${stored.length} adverts leave the store`,
      );
    }
  }
  if (result.outcome === "postponed") {
    await store.writeState(
      source,
      afterPostponed(
        previous,
        new Date(clock.now().getTime() + (result.retryAfterMs ?? MINUTE_MS)),
      ),
    );
  } else if (result.outcome !== "stopped") {
    // A careers site is back sooner for its pages left only with a long queue worth its lane, judged on this pass.
    const readOn =
      !isSite(adapter) ||
      isLongQueue(adapter, result, dependencies.longQueues, dependencies.shown);
    await store.writeState(
      source,
      nextState(previous, result, at, rulesFor(source), readOn),
    );
  }
  return result;
}

function nextState(
  previous: SourceState | undefined,
  result: SourceRunResult,
  at: Date,
  rules: ScheduleRules,
  readOn: boolean,
): SourceState {
  const reason = result.reason ?? result.outcome;
  if (result.outcome === "disallowed") {
    return afterDisallowed(previous, { at, reason }, rules);
  }
  if (result.outcome === "failed") {
    return afterFailure(
      previous,
      { at, reason, heldDrop: result.heldDrop === true },
      rules,
    );
  }
  return afterSuccess(
    previous,
    {
      at,
      advertCount: result.stored,
      changed: result.changed,
      ...(result.backlog ? { backlog: result.backlog } : {}),
      ...(result.answered ? { answered: result.answered } : {}),
      ...(result.barren ? { barren: true } : {}),
      readOn,
    },
    rules,
  );
}

// Takedowns also remove what is already stored (FR-8): every source the store knows is swept at
// the start of a run, due or not.
async function sweepTakedowns(
  adapters: readonly SourceAdapter[],
  dependencies: RunDependencies,
): Promise<void> {
  const { store, takedowns, log } = dependencies;
  const sources = new Set(adapters.map((adapter) => adapter.definition.id));
  try {
    for (const source of (await store.readStates()).keys()) sources.add(source);
  } catch (error) {
    log(
      `takedowns: not every stored source could be listed: ${messageOf(error)}`,
    );
  }
  for (const source of sources) {
    try {
      const covered = (await store.readAdverts(source))
        .filter((advert) => takedowns.reasonFor(advert))
        .map((advert) => advert.id);
      if (covered.length === 0) continue;
      await store.dropAdverts(source, covered);
      log(`${source}: ${covered.length} stored adverts taken down`);
    } catch (error) {
      log(`${source}: takedowns not applied: ${messageOf(error)}`);
    }
  }
}

// A stored advert as the adapter yielded it: without what the runner and the store added.
function asDraft(advert: StoredAdvert): AdvertDraft {
  const {
    id: _id,
    attribution: _attribution,
    firstSeen: _firstSeen,
    ...draft
  } = advert;
  return draft;
}

// An adapter's error may quote a request that carried a key: no credential value leaves the run.
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withoutValues(
  text: string,
  credentials: Readonly<Record<string, string>>,
): string {
  let safe = text;
  for (const value of Object.values(credentials)) {
    if (value) safe = safe.split(value).join("[credential]");
  }
  return safe;
}

type Conversion =
  | { readonly success: true; readonly advert: Advert }
  | { readonly success: false; readonly reason: string };

// Adds what every source shares (the stable id and the source's attribution, FR-2), caps the
// description and validates the result against the common format (FR-1).
function toAdvert(adapter: SourceAdapter, draft: AdvertDraft): Conversion {
  const { id: source, licence } = adapter.definition;
  if (draft.source !== source) {
    return {
      success: false,
      reason: `source: "${String(draft.source)}" is not "${source}"`,
    };
  }
  const candidate = {
    ...draft,
    id: advertId(source, String(draft.sourceId)),
    description:
      typeof draft.description === "string"
        ? draft.description.slice(0, DESCRIPTION_LIMIT)
        : draft.description,
    attribution: { licence: licence.licence, credit: licence.credit },
  };
  const parsed = Advert.safeParse(candidate);
  if (parsed.success) return { success: true, advert: parsed.data };
  return { success: false, reason: describeIssues(parsed.error) };
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.map(String).join(".")}: ${issue.message}`
        : issue.message,
    )
    .join("; ");
}
